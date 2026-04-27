import {
  validarIdPedido,
  validarItemsPedido,
  validarRazonRechazo,
  validarRolHijo,
  validarRolPadre,
  validarUsuarioAutenticado,
} from './childOrders.validators.js';

class ChildOrdersServiceError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
  }
}

function crearError(statusCode, message) {
  return new ChildOrdersServiceError(statusCode, message);
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

function mapItemsValidados(validatedOrder) {
  return validatedOrder.items.map((item) => ({
    product_id: item.product_id,
    product_name: item.product_name,
    quantity: item.quantity,
    price: item.price,
    subtotal: item.subtotal,
  }));
}

export function crearChildOrdersService(deps, repository) {
  const {
    supabase,
    puedeActuarComoPadre,
    notificarUsuarioSinFallo,
    validarItemsPedido: validarProductosPedido,
    parsearEnteroPositivo,
    construirAliasEstadoPedido,
    normalizarEntradaHistoricaPedido,
    normalizarUsuarioRelacionado,
    resolverIdPerfilParaUsuario,
  } = deps;

  function requireSupabase() {
    if (!supabase) throw crearError(503, 'Supabase no esta configurado en el backend');
  }

  function mapPedidoOrder(order, child = null) {
    const items = mapPedidoItems(order?.lineas_pedido);
    return normalizarEntradaHistoricaPedido({
      id: order.id,
      status: order.estado,
      created_at: order.fecha_creacion,
      child,
      items,
      items_count: items.length,
      total: items.reduce((sum, item) => sum + item.subtotal, 0),
    });
  }

  async function validarPedidoEntrante(items, userId) {
    lanzarSiInvalido(validarItemsPedido(items));

    try {
      return await validarProductosPedido(items, { idUsuario: userId });
    } catch (error) {
      throw crearError(error.statusCode || 400, error.message || 'Productos del pedido invalidos');
    }
  }

  async function resolverPerfil(user, message) {
    const profileId = await resolverIdPerfilParaUsuario(user);
    if (!profileId) throw crearError(400, message);

    return profileId;
  }

  function validarLimiteGasto(total, spendingLimit) {
    const limiteGasto = Number(spendingLimit || 0);
    if (limiteGasto > 0 && total > limiteGasto) {
      throw crearError(
        403,
        `El total (${total.toFixed(2)} EUR) excede el limite de gasto (${limiteGasto.toFixed(2)} EUR)`,
      );
    }
  }

  async function obtenerPedidoProcesable(orderId, parentId, fetcher, notFoundMessage) {
    const { data: order, error } = await fetcher(orderId, parentId);
    if (error || !order) throw crearError(404, notFoundMessage);

    return order;
  }

  return {
    async crearPedidoHijo(user, body) {
      requireSupabase();
      lanzarSiInvalido(validarRolHijo(user, 'Solo los hijos pueden crear pedidos'));
      lanzarSiInvalido(validarItemsPedido(body?.items, 'El carrito está vacío'));

      const { data: links, error: linksError } = await repository.listarVinculosActivosDeHijo(user.id);
      if (linksError) throw linksError;
      if (!links || links.length === 0) throw crearError(400, 'No tienes padres vinculados activos');

      const link = body?.parent_id ? links.find((entry) => entry.parent_id === body.parent_id) : links[0];
      if (!link) throw crearError(400, 'Padre especificado no encontrado');

      const validatedOrder = await validarPedidoEntrante(body.items, user.id);
      const itemsValidados = mapItemsValidados(validatedOrder);
      const { subtotal, tax, total } = validatedOrder;

      validarLimiteGasto(total, link.spending_limit);
      if (total < 5) throw crearError(400, 'El monto minimo del pedido es 5.00 EUR');

      const { data: order, error: orderError } = await repository.crearPedidoInfantil({
        child_id: user.id,
        parent_id: link.parent_id,
        link_id: link.id,
        status: 'pending',
        subtotal,
        tax,
        total,
        notes: body?.notes || null,
      });

      if (orderError) throw orderError;

      const { error: itemsError } = await repository.insertarItemsPedidoInfantil(
        itemsValidados.map((item) => ({ order_id: order.id, ...item })),
      );

      if (itemsError) throw itemsError;

      await notificarUsuarioSinFallo(link.parent_id, {
        type: 'child_order_pending',
        title: 'Nuevo pedido pendiente',
        body: 'Uno de tus hijos ha creado un pedido y necesita tu aprobacion.',
        data: { idPedido: order.id, childId: user.id, targetScreen: 'parent-orders' },
      });

      return {
        statusCode: 201,
        order: { id: order.id, status: order.status, total: order.total, items: itemsValidados, created_at: order.created_at },
      };
    },

    async listarPedidosHijo(user, query) {
      requireSupabase();
      lanzarSiInvalido(validarRolHijo(user, 'Solo los hijos pueden ver sus pedidos'));

      const normalizedStatuses = construirAliasEstadoPedido(query.status);
      const profileId = await resolverPerfil(user, 'No se pudo resolver el perfil del usuario para consultar pedidos');
      const { data, error } = await repository.listarPedidosHistoricosDePerfil(profileId);
      if (error) throw error;

      const orders = (data || [])
        .map((order) => mapPedidoOrder(order))
        .filter((order) => !query.status || normalizedStatuses.includes(order.status));

      return { orders };
    },

    async obtenerPedidoHijo(user, params) {
      requireSupabase();
      lanzarSiInvalido(validarRolHijo(user, 'Solo los hijos pueden ver detalles de pedidos'));

      const idValidation = validarIdPedido(params.id);
      lanzarSiInvalido(idValidation);

      const profileId = await resolverPerfil(user, 'No se pudo resolver el perfil del usuario para consultar el pedido');
      const { data: order, error } = await repository.obtenerPedidoHistoricoDePerfil(idValidation.id, profileId);
      if (error || !order) throw crearError(404, 'Pedido no encontrado');

      return { order: mapPedidoOrder(order) };
    },

    async listarPedidosPadre(user, query) {
      requireSupabase();
      lanzarSiInvalido(validarRolPadre(user, puedeActuarComoPadre, 'Solo los padres pueden ver pedidos de hijos'));

      const limit = parsearEnteroPositivo(query.limit, 20);
      const offset = parsearEnteroPositivo(query.offset, 0);
      const { data: orders, error } = await repository.listarPedidosInfantilesDePadre(user.id, {
        status: query.status,
        childId: query.child_id,
        limit,
        offset,
      });

      if (error) throw error;

      const ordersWithCount = await Promise.all((orders || []).map(async (order) => {
        const { count } = await repository.contarItemsPedidoInfantil(order.id);

        return {
          ...order,
          child: normalizarUsuarioRelacionado(order.child),
          items_count: count || 0,
        };
      }));

      return { orders: ordersWithCount };
    },

    async obtenerPedidoPadre(user, params) {
      requireSupabase();
      lanzarSiInvalido(validarRolPadre(user, puedeActuarComoPadre, 'Solo los padres pueden ver detalles de pedidos'));

      const idValidation = validarIdPedido(params.id);
      lanzarSiInvalido(idValidation);

      const { data: order, error } = await repository.obtenerDetallePedidoPadre(idValidation.id, user.id);
      if (error || !order) throw crearError(404, 'Pedido no encontrado');

      const { data: items, error: itemsError } = await repository.listarItemsPedidoInfantil(order.id);
      if (itemsError) throw itemsError;

      return {
        order: {
          ...order,
          child: normalizarUsuarioRelacionado(order.child),
          items: items || [],
          spending_limit: order.link?.spending_limit || 0,
        },
      };
    },

    async aprobarPedidoPadre(user, params, body) {
      requireSupabase();
      lanzarSiInvalido(validarRolPadre(user, puedeActuarComoPadre, 'Solo los padres pueden aprobar pedidos'));

      const idValidation = validarIdPedido(params.id);
      lanzarSiInvalido(idValidation);
      const order = await obtenerPedidoProcesable(
        idValidation.id,
        user.id,
        repository.obtenerPedidoPendientePadre,
        'Pedido no encontrado o ya procesado',
      );

      const finalAmount = body?.approved_amount || order.total;
      const { data: updated, error } = await repository.actualizarPedidoInfantil(idValidation.id, {
        status: 'approved',
        approved_amount: finalAmount,
        approved_at: new Date().toISOString(),
      });

      if (error) throw error;

      await notificarUsuarioSinFallo(order.child_id, {
        type: 'child_order_approved',
        title: 'Pedido aprobado',
        body: 'Tu pedido ha sido aprobado y ya puede prepararse.',
        data: { idPedido: idValidation.id, targetScreen: 'child-orders' },
      });

      return { order: updated, message: 'Pedido aprobado exitosamente' };
    },

    async rechazarPedidoPadre(user, params, body) {
      requireSupabase();
      lanzarSiInvalido(validarRolPadre(user, puedeActuarComoPadre, 'Solo los padres pueden rechazar pedidos'));
      lanzarSiInvalido(validarRazonRechazo(body?.reason));

      const idValidation = validarIdPedido(params.id);
      lanzarSiInvalido(idValidation);
      const order = await obtenerPedidoProcesable(
        idValidation.id,
        user.id,
        repository.obtenerPedidoPendientePadre,
        'Pedido no encontrado o ya procesado',
      );

      const { data: updated, error } = await repository.actualizarPedidoInfantil(idValidation.id, {
        status: 'rejected',
        rejection_reason: body.reason,
        rejected_at: new Date().toISOString(),
      });

      if (error) throw error;

      await notificarUsuarioSinFallo(order.child_id, {
        type: 'child_order_rejected',
        title: 'Pedido rechazado',
        body: body.reason || 'Tu pedido ha sido rechazado por tu responsable.',
        data: { idPedido: idValidation.id, targetScreen: 'child-orders' },
      });

      return { order: updated, message: 'Pedido rechazado' };
    },

    async pagarPedidoPadre(user, params, body) {
      requireSupabase();
      lanzarSiInvalido(validarRolPadre(user, puedeActuarComoPadre, 'Solo los padres pueden marcar pedidos como pagados'));

      const idValidation = validarIdPedido(params.id);
      lanzarSiInvalido(idValidation);
      const order = await obtenerPedidoProcesable(
        idValidation.id,
        user.id,
        repository.obtenerPedidoAprobadoPadre,
        'Pedido no encontrado o no está aprobado',
      );

      const finalAmount = body?.amount_paid || order.approved_amount || order.total;
      const { data: updated, error } = await repository.actualizarPedidoInfantil(idValidation.id, {
        status: 'paid',
        payment_method: body?.payment_method || 'cash',
        amount_paid: finalAmount,
        paid_at: new Date().toISOString(),
      });

      if (error) throw error;

      await notificarUsuarioSinFallo(order.child_id, {
        type: 'child_order_paid',
        title: 'Pedido pagado',
        body: 'Tu pedido ya figura como pagado.',
        data: { idPedido: idValidation.id, targetScreen: 'child-orders' },
      });

      return { order: updated, message: 'Pedido marcado como pagado' };
    },

    async modificarPedidoPadre(user, params, body) {
      requireSupabase();
      lanzarSiInvalido(validarRolPadre(user, puedeActuarComoPadre, 'Solo los padres pueden modificar pedidos'));
      lanzarSiInvalido(validarItemsPedido(body?.items, 'Debe proporcionar items para modificar'));

      const idValidation = validarIdPedido(params.id);
      lanzarSiInvalido(idValidation);
      const order = await obtenerPedidoProcesable(
        idValidation.id,
        user.id,
        repository.obtenerPedidoModificablePadre,
        'Pedido no encontrado o ya procesado',
      );

      const validatedOrder = await validarPedidoEntrante(body.items, order.child_id);
      const itemsValidados = mapItemsValidados(validatedOrder);
      const { subtotal, tax, total } = validatedOrder;

      const { error: deleteError } = await repository.borrarItemsPedidoInfantil(idValidation.id);
      if (deleteError) throw deleteError;

      const { error: insertError } = await repository.insertarItemsPedidoInfantil(
        itemsValidados.map((item) => ({ order_id: idValidation.id, ...item })),
      );
      if (insertError) throw insertError;

      const { data: updated, error } = await repository.actualizarPedidoInfantil(idValidation.id, {
        subtotal,
        tax,
        total,
        updated_at: new Date().toISOString(),
      });

      if (error) throw error;

      return { order: updated, items: itemsValidados, message: 'Pedido modificado exitosamente' };
    },

    async listarHistorialPadre(user, query) {
      requireSupabase();
      lanzarSiInvalido(validarRolPadre(user, puedeActuarComoPadre, 'Solo los padres pueden ver el historial'));
      lanzarSiInvalido(validarUsuarioAutenticado(user));

      const limit = parsearEnteroPositivo(query.limit, 50);
      const normalizedStatuses = construirAliasEstadoPedido(query.status || 'paid');
      const profileId = await resolverPerfil(user, 'No se pudo resolver el perfil del usuario para consultar el historial');
      const { data, error } = await repository.listarHistorialPagadoPorPerfil(profileId, {
        childId: query.child_id,
        limit,
      });

      if (error) throw error;

      const orders = (data || [])
        .map((order) => mapPedidoOrder(order, {
          id: order.id_perfil,
          name: order.perfiles?.nombre_completo || null,
        }))
        .filter((order) => normalizedStatuses.includes(order.status))
        .filter((order) => !query.from_date || order.date >= query.from_date)
        .filter((order) => !query.to_date || order.date <= query.to_date);

      return { orders };
    },
  };
}
