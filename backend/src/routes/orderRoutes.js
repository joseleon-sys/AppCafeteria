// Flujo de pedidos de usuarios adultos: validacion, pago y consulta de historico.
export function registerOrderRoutes(app, deps) {
  const {
    supabase,
    stripe,
    developmentPaymentBypassEnabled,
    autenticarToken,
    validarItemsPedido,
    parsearEnteroPositivo,
    construirAliasEstadoPedido,
    normalizarEntradaHistoricaPedido,
    resolverIdPerfilParaUsuario,
  } = deps;

  function requireSupabase(res) {
    return res.status(503).json({ error: 'Supabase no esta configurado en el backend' });
  }

  function mapPedidoItems(lineasPedido = []) {
    // Convierte el formato de lineas guardado en base de datos a un formato mas simple para la API.
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

  function mapPedidoToHistoricOrder(order) {
    // Prepara un pedido ya guardado para mostrarlo como entrada de historial.
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

  async function createPaidOrderForUser(idUsuario, validatedOrder, metodoPago = 'dev-bypass') {
    // Crea el pedido ya pagado y sus lineas asociadas dentro de la base de datos.
    if (!supabase) {
      const error = new Error('Supabase no esta configurado en el backend');
      error.statusCode = 503;
      throw error;
    }

    const profileId = await resolverIdPerfilParaUsuario(idUsuario);
    if (!profileId) {
      const error = new Error('No se pudo resolver el perfil del usuario para guardar el pedido');
      error.statusCode = 400;
      throw error;
    }

    const { data: order, error: orderError } = await supabase
      .from('pedidos')
      .insert({
        id_perfil: profileId,
        id_pagador: profileId,
        estado: 'PAGADO',
        id_pasarela_pago: metodoPago,
      })
      .select()
      .single();

    if (orderError) throw orderError;

    const itemsToInsert = validatedOrder.items.flatMap((item) => {
      const quantity = Number.parseInt(item.quantity, 10) || 1;
      return Array.from({ length: quantity }, () => ({
        id_pedido: order.id,
        id_producto_menu: item.product_id,
        nombre_producto: item.product_name,
        precio_compra: item.price,
        notas: item.notes || null,
        opciones_elegidas: {},
      }));
    });

    const { error: itemsError } = await supabase.from('lineas_pedido').insert(itemsToInsert);
    if (itemsError) throw itemsError;

    return {
      ...order,
      status: 'paid',
    };
  }

  app.post('/api/orders', autenticarToken, async (req, res) => {
    // Ruta directa para pedidos ya aprobados, solo para usuarios que no son hijos.
    const { items } = req.body || {};

    if (!supabase) return requireSupabase(res);
    if (req.user.role === 'child') {
      return res.status(403).json({ error: 'Los perfiles de menor deben usar el flujo de pedidos con aprobacion parental' });
    }
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'El carrito esta vacio' });
    }

    try {
      const validatedOrder = await validarItemsPedido(items, { idUsuario: req.user.id });
      const order = await createPaidOrderForUser(req.user, validatedOrder, 'manual');

      return res.status(201).json({
        order_id: order.id,
        status: order.status,
        total: validatedOrder.total,
        message: 'Pedido confirmado correctamente',
      });
    } catch (error) {
      console.error('Error al crear pedido estandar:', error);
      return res.status(error.statusCode || 500).json({ error: error.message || 'Error al crear el pedido' });
    }
  });

  app.post('/api/stripe/create-checkout-session', autenticarToken, async (req, res) => {
    // Crea la sesion de Stripe o, en desarrollo, puede saltarse la pasarela si esta permitido.
    if (!supabase) return requireSupabase(res);

    try {
      const { items } = req.body || {};

      if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: 'El carrito está vacío' });
      }

      const validatedOrder = await validarItemsPedido(items, { idUsuario: req.user.id });

      if (developmentPaymentBypassEnabled) {
        const order = await createPaidOrderForUser(req.user, validatedOrder);
        return res.status(201).json({
          bypassed: true,
          order_id: order.id,
          status: order.status,
          total: validatedOrder.total,
          message: 'Pago omitido en modo desarrollo/pruebas. Pedido marcado como pagado.',
          redirect_url: `/pago-exitoso?dev_bypass=1&order_id=${encodeURIComponent(String(order.id))}`,
        });
      }

      if (!stripe) {
        return res.status(503).json({
          error: 'Stripe no está configurado en el backend. Define STRIPE_SECRET_KEY o activa DEV_BYPASS_STRIPE_PAYMENT en desarrollo.',
        });
      }

      const line_items = validatedOrder.items.map((item) => ({
        price_data: {
          currency: 'eur',
          product_data: { name: item.product_name },
          unit_amount: Math.round(Number(item.price) * 100),
        },
        quantity: item.quantity,
      }));

      const session = await stripe.checkout.sessions.create({
        mode: 'payment',
        line_items,
        success_url: `${process.env.FRONTEND_URL}/pago-exitoso?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.FRONTEND_URL}/carrito`,
        metadata: { user_id: String(req.user.id) },
      });

      return res.json({ url: session.url });
    } catch (error) {
      console.error('Error creando checkout session:', error);
      const detailedMessage = error?.raw?.message || error?.message || 'Error al iniciar el pago con Stripe';
      return res.status(error.statusCode || 500).json({
        error: process.env.NODE_ENV === 'production' ? 'Error al iniciar el pago con Stripe' : detailedMessage,
      });
    }
  });

  app.get('/api/orders/my', autenticarToken, async (req, res) => {
    if (!supabase) return requireSupabase(res);

    const { status } = req.query;
    const limit = parsearEnteroPositivo(req.query.limit, 50);
    const normalizedStatuses = construirAliasEstadoPedido(status);

    if (req.user.role === 'child') {
      return res.status(403).json({ error: 'Los perfiles de menor deben consultar sus pedidos infantiles' });
    }

    try {
      const profileId = await resolverIdPerfilParaUsuario(req.user);
      if (!profileId) {
        return res.status(400).json({ error: 'No se pudo resolver el perfil del usuario para consultar pedidos' });
      }

      let query = supabase
        .from('pedidos')
        .select(`
          id,
          estado,
          fecha_creacion,
          id_perfil,
          id_pagador,
          lineas_pedido (
            id,
            id_producto_menu,
            nombre_producto,
            precio_compra,
            notas
          )
        `)
        .or(`id_perfil.eq.${profileId},id_pagador.eq.${profileId}`)
        .order('fecha_creacion', { ascending: false })
        .limit(limit);

      const { data, error } = await query;
      if (error) throw error;

      const orders = (data || [])
        .map(mapPedidoToHistoricOrder)
        .filter((order) => !status || normalizedStatuses.includes(order.status));

      return res.json({ orders });
    } catch (error) {
      console.error('Error al listar pedidos estandar:', error);
      return res.status(500).json({ error: 'Error al obtener pedidos' });
    }
  });

  app.get('/api/orders/:id', autenticarToken, async (req, res) => {
    if (!supabase) return requireSupabase(res);

    const idPedido = String(req.params.id || '').trim();

    if (!idPedido) return res.status(400).json({ error: 'ID de pedido invalido' });
    if (req.user.role === 'child') {
      return res.status(403).json({ error: 'Los perfiles de menor deben consultar sus pedidos infantiles' });
    }

    try {
      const profileId = await resolverIdPerfilParaUsuario(req.user);
      if (!profileId) {
        return res.status(400).json({ error: 'No se pudo resolver el perfil del usuario para consultar el pedido' });
      }

      let query = supabase
        .from('pedidos')
        .select(`
          id,
          estado,
          fecha_creacion,
          id_perfil,
          id_pagador,
          lineas_pedido (
            id,
            id_producto_menu,
            nombre_producto,
            precio_compra,
            notas
          )
        `)
        .eq('id', idPedido);

      if (req.user.role !== 'admin') {
        query = query.or(`id_perfil.eq.${profileId},id_pagador.eq.${profileId}`);
      }

      const { data: order, error } = await query.single();
      if (error || !order) return res.status(404).json({ error: 'Pedido no encontrado' });

      return res.json({ order: mapPedidoToHistoricOrder(order) });
    } catch (error) {
      console.error('Error al obtener detalle de pedido estandar:', error);
      return res.status(500).json({ error: 'Error al obtener detalle del pedido' });
    }
  });
}
