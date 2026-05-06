import {
  validarCarritoPedido,
  validarIdPedido,
  validarProductosPedido,
  validarUsuarioAutenticado,
  validarUsuarioPuedeCrearPedidoAdulto,
} from './order.validators.js';

class OrderServiceError extends Error {
  constructor(statusCode, message, options = {}) {
    super(message);
    this.statusCode = statusCode;
    this.exposeDetails = Boolean(options.exposeDetails);
    this.details = options.details;
  }
}

function crearError(statusCode, message, options) {
  return new OrderServiceError(statusCode, message, options);
}

function lanzarSiInvalido(validation) {
  if (!validation.valid) throw crearError(validation.statusCode, validation.message);
}

function mapPedidoItems(lineasPedido = []) {
  return Array.isArray(lineasPedido)
    ? lineasPedido.map((item) => {
        const price = Number.parseFloat(item.precio_compra ?? 0) || 0;
        return {
          id: item.id,
          product_id: item.id_producto_menu,
          product_name: item.nombre_producto || 'Producto',
          quantity: 1,
          price,
          subtotal: price,
          notes: item.notas || '',
        };
      })
    : [];
}

function mapLineasPedidoParaInsert(orderId, validatedItems) {
  return validatedItems.flatMap((item) => {
    const quantity = Number.parseInt(item.quantity, 10) || 1;
    return Array.from({ length: quantity }, () => ({
      id_pedido: orderId,
      id_producto_menu: item.product_id,
      nombre_producto: item.product_name,
      precio_compra: item.price,
      notas: item.notes || null,
      opciones_elegidas: {},
    }));
  });
}

function crearLineItemsStripe(items) {
  return items.map((item) => ({
    price_data: {
      currency: 'eur',
      product_data: { name: item.product_name },
      unit_amount: Math.round(Number(item.price) * 100),
    },
    quantity: item.quantity,
  }));
}

export function crearOrderService(deps, repository) {
  const {
    supabase,
    stripe,
    developmentPaymentBypassEnabled,
    ticketPrinterService,
    validarItemsPedido,
    parsearEnteroPositivo,
    construirAliasEstadoPedido,
    normalizarEntradaHistoricaPedido,
    resolverIdPerfilParaUsuario,
  } = deps;

  function requireSupabase() {
    if (!supabase) throw crearError(503, 'Supabase no esta configurado en el backend');
  }

  function mapPedidoToHistoricOrder(order) {
    const items = mapPedidoItems(order?.lineas_pedido);

    return normalizarEntradaHistoricaPedido({
      id: order.id,
      status: order.estado,
      created_at: order.fecha_creacion,
      items,
      items_count: items.length,
      total: items.reduce((sum, item) => sum + item.subtotal, 0),
    });
  }

  async function validarPedidoEntrante(items, user, emptyMessage) {
    lanzarSiInvalido(validarCarritoPedido(items, emptyMessage));

    const productValidation = await validarProductosPedido(items, {
      validarItemsPedido,
      userId: user.id,
    });

    lanzarSiInvalido(productValidation);
    return productValidation.order;
  }

  async function resolverPerfilPedido(user, actionMessage) {
    const profileId = await resolverIdPerfilParaUsuario(user);
    if (!profileId) throw crearError(400, actionMessage);

    return profileId;
  }

  async function createPaidOrderForUser(user, validatedOrder, metodoPago = 'dev-bypass') {
    const profileId = await resolverPerfilPedido(user, 'No se pudo resolver el perfil del usuario para guardar el pedido');
    const { data: order, error: orderError } = await repository.crearPedidoPagado(profileId, metodoPago);
    if (orderError) throw orderError;

    const itemsToInsert = mapLineasPedidoParaInsert(order.id, validatedOrder.items);
    const { error: itemsError } = await repository.insertarLineasPedido(itemsToInsert);
    if (itemsError) throw itemsError;

    await ticketPrinterService?.imprimirTicketPedidoSinFallo({
      orderId: order.id,
      title: 'Pedido pagado',
      items: validatedOrder.items,
      total: validatedOrder.total,
    });

    return {
      ...order,
      status: 'paid',
    };
  }

  return {
    async crearPedidoManual(user, body) {
      requireSupabase();
      lanzarSiInvalido(validarUsuarioPuedeCrearPedidoAdulto(user));

      const validatedOrder = await validarPedidoEntrante(body?.items, user, 'El carrito esta vacio');
      const order = await createPaidOrderForUser(user, validatedOrder, 'manual');

      return {
        statusCode: 201,
        order_id: order.id,
        status: order.status,
        total: validatedOrder.total,
        message: 'Pedido confirmado correctamente',
      };
    },

    async crearCheckoutSession(user, body) {
      requireSupabase();
      lanzarSiInvalido(validarUsuarioAutenticado(user));

      const validatedOrder = await validarPedidoEntrante(body?.items, user, 'El carrito está vacío');

      if (developmentPaymentBypassEnabled) {
        const order = await createPaidOrderForUser(user, validatedOrder);
        return {
          statusCode: 201,
          bypassed: true,
          order_id: order.id,
          status: order.status,
          total: validatedOrder.total,
          message: 'Pago omitido en modo desarrollo/pruebas. Pedido marcado como pagado.',
          redirect_url: `/pago-exitoso?dev_bypass=1&order_id=${encodeURIComponent(String(order.id))}`,
        };
      }

      if (!stripe) {
        const stripeSecretKey = String(process.env.STRIPE_SECRET_KEY || '').trim();
        const hasPublishableStripeKey = /^pk_(test|live)_/.test(stripeSecretKey);
        throw crearError(
          503,
          hasPublishableStripeKey
            ? 'STRIPE_SECRET_KEY debe ser una clave de servidor de Stripe (sk_test_..., sk_live_..., rk_test_... o rk_live_...), no una clave publicable pk_...'
            : 'Stripe no está configurado en el backend. Define STRIPE_SECRET_KEY o activa DEV_BYPASS_STRIPE_PAYMENT en desarrollo.',
        );
      }

      const session = await stripe.checkout.sessions.create({
        mode: 'payment',
        line_items: crearLineItemsStripe(validatedOrder.items),
        success_url: `${process.env.FRONTEND_URL}/pago-exitoso?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.FRONTEND_URL}/carrito`,
        metadata: { user_id: String(user.id) },
      });

      return { url: session.url };
    },

    async listarMisPedidos(user, query) {
      requireSupabase();
      lanzarSiInvalido(validarUsuarioAutenticado(user));
      if (user.role === 'child') {
        throw crearError(403, 'Los perfiles de menor deben consultar sus pedidos infantiles');
      }

      const limit = parsearEnteroPositivo(query.limit, 50);
      const normalizedStatuses = construirAliasEstadoPedido(query.status);
      const profileId = await resolverPerfilPedido(user, 'No se pudo resolver el perfil del usuario para consultar pedidos');
      const { data, error } = await repository.listarPedidosDePerfil(profileId, limit);
      if (error) throw error;

      const orders = (data || [])
        .map(mapPedidoToHistoricOrder)
        .filter((order) => !query.status || normalizedStatuses.includes(order.status));

      return { orders };
    },

    async obtenerPedido(user, params) {
      requireSupabase();
      lanzarSiInvalido(validarUsuarioAutenticado(user));
      if (user.role === 'child') {
        throw crearError(403, 'Los perfiles de menor deben consultar sus pedidos infantiles');
      }

      const idValidation = validarIdPedido(params.id);
      lanzarSiInvalido(idValidation);

      const profileId = await resolverPerfilPedido(user, 'No se pudo resolver el perfil del usuario para consultar el pedido');
      const { data: order, error } = await repository.obtenerPedidoPorId(
        idValidation.id,
        profileId,
        { includeAllProfiles: user.role === 'admin' },
      );

      if (error || !order) throw crearError(404, 'Pedido no encontrado');

      return { order: mapPedidoToHistoricOrder(order) };
    },
  };
}
