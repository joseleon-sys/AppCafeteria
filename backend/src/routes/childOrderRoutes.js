// Flujo de pedidos creado por hijos y aprobado posteriormente por un padre.
export function registerChildOrderRoutes(app, deps) {
  const {
    supabase,
    autenticarToken,
    puedeActuarComoPadre,
    notificarUsuarioSinFallo,
    validarItemsPedido,
    parsearEnteroPositivo,
    construirAliasEstadoPedido,
    normalizarEntradaHistoricaPedido,
    normalizarUsuarioRelacionado,
    resolverIdPerfilParaUsuario,
  } = deps;

  function requireSupabase(res) {
    return res.status(503).json({ error: 'Supabase no esta configurado en el backend' });
  }

  function mapPedidoItems(lineasPedido = []) {
    // Adapta las filas de base de datos a un formato mas amigable para el frontend.
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

  function mapPedidoOrder(order, child = null) {
    // Normaliza una orden infantil para reutilizar la misma vista de historial.
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

  app.post('/api/child/orders', autenticarToken, async (req, res) => {
    // Crea un pedido pendiente que debera aprobar uno de los padres vinculados.
    if (!supabase) return requireSupabase(res);

    const { items, notes, parent_id } = req.body || {};
    if (req.user.role !== 'child') return res.status(403).json({ error: 'Solo los hijos pueden crear pedidos' });
    if (!Array.isArray(items) || items.length === 0) return res.status(400).json({ error: 'El carrito está vacío' });

    try {
      const { data: links, error: linksError } = await supabase
        .from('parent_child_links')
        .select('id, parent_id, spending_limit')
        .eq('child_id', req.user.id)
        .eq('status', 'active');

      if (linksError) throw linksError;
      if (!links || links.length === 0) return res.status(400).json({ error: 'No tienes padres vinculados activos' });

      const link = parent_id ? links.find((entry) => entry.parent_id === parent_id) : links[0];
      if (!link) return res.status(400).json({ error: 'Padre especificado no encontrado' });

      const validatedOrder = await validarItemsPedido(items, { idUsuario: req.user.id });
      const itemsValidados = validatedOrder.items.map((item) => ({
        product_id: item.product_id,
        product_name: item.product_name,
        quantity: item.quantity,
        price: item.price,
        subtotal: item.subtotal,
      }));

      const { subtotal, tax, total } = validatedOrder;
      const limiteGasto = Number(link.spending_limit || 0);

      if (limiteGasto > 0 && total > limiteGasto) {
        return res.status(403).json({
          error: `El total (${total.toFixed(2)} EUR) excede el limite de gasto (${limiteGasto.toFixed(2)} EUR)`,
        });
      }

      if (total < 5) return res.status(400).json({ error: 'El monto minimo del pedido es 5.00 EUR' });

      const { data: order, error: orderError } = await supabase
        .from('child_orders')
        .insert({
          child_id: req.user.id,
          parent_id: link.parent_id,
          link_id: link.id,
          status: 'pending',
          subtotal,
          tax,
          total,
          notes: notes || null,
        })
        .select()
        .single();

      if (orderError) throw orderError;

      const { error: itemsError } = await supabase
        .from('child_order_items')
        .insert(itemsValidados.map((item) => ({ order_id: order.id, ...item })));

      if (itemsError) throw itemsError;

      await notificarUsuarioSinFallo(link.parent_id, {
        type: 'child_order_pending',
        title: 'Nuevo pedido pendiente',
        body: 'Uno de tus hijos ha creado un pedido y necesita tu aprobacion.',
        data: { idPedido: order.id, childId: req.user.id, targetScreen: 'parent-orders' },
      });

      return res.status(201).json({
        order: { id: order.id, status: order.status, total: order.total, items: itemsValidados, created_at: order.created_at },
      });
    } catch (error) {
      console.error('Error creating child order:', error);
      return res.status(error.statusCode || 500).json({ error: error.message || 'Error al crear el pedido' });
    }
  });

  app.get('/api/child/orders', autenticarToken, async (req, res) => {
    // Devuelve el historial de pedidos del hijo autenticado.
    if (!supabase) return requireSupabase(res);
    if (req.user.role !== 'child') return res.status(403).json({ error: 'Solo los hijos pueden ver sus pedidos' });

    const { status } = req.query;
    const normalizedStatuses = construirAliasEstadoPedido(status);

    try {
      const profileId = await resolverIdPerfilParaUsuario(req.user);
      if (!profileId) {
        return res.status(400).json({ error: 'No se pudo resolver el perfil del usuario para consultar pedidos' });
      }

      const { data, error } = await supabase
        .from('pedidos')
        .select(`
          id,
          estado,
          fecha_creacion,
          id_perfil,
          lineas_pedido (
            id,
            id_producto_menu,
            nombre_producto,
            precio_compra,
            notas
          )
        `)
        .eq('id_perfil', profileId)
        .order('fecha_creacion', { ascending: false });

      if (error) throw error;

      const orders = (data || [])
        .map((order) => mapPedidoOrder(order))
        .filter((order) => !status || normalizedStatuses.includes(order.status));

      return res.json({ orders });
    } catch (error) {
      console.error('Error fetching child orders:', error);
      return res.status(500).json({ error: 'Error al obtener pedidos' });
    }
  });

  app.get('/api/child/orders/:id', autenticarToken, async (req, res) => {
    if (!supabase) return requireSupabase(res);
    if (req.user.role !== 'child') return res.status(403).json({ error: 'Solo los hijos pueden ver detalles de pedidos' });

    const id = String(req.params.id || '').trim();

    try {
      const profileId = await resolverIdPerfilParaUsuario(req.user);
      if (!profileId) {
        return res.status(400).json({ error: 'No se pudo resolver el perfil del usuario para consultar el pedido' });
      }

      const { data: order, error } = await supabase
        .from('pedidos')
        .select(`
          id,
          estado,
          fecha_creacion,
          id_perfil,
          lineas_pedido (
            id,
            id_producto_menu,
            nombre_producto,
            precio_compra,
            notas
          )
        `)
        .eq('id', id)
        .eq('id_perfil', profileId)
        .single();

      if (error || !order) return res.status(404).json({ error: 'Pedido no encontrado' });

      return res.json({ order: mapPedidoOrder(order) });
    } catch (error) {
      console.error('Error fetching order detail:', error);
      return res.status(500).json({ error: 'Error al obtener detalle del pedido' });
    }
  });

  app.get('/api/parent/child-orders', autenticarToken, async (req, res) => {
    if (!supabase) return requireSupabase(res);
    if (!puedeActuarComoPadre(req.user)) return res.status(403).json({ error: 'Solo los padres pueden ver pedidos de hijos' });

    const { status, child_id } = req.query;
    const limit = parsearEnteroPositivo(req.query.limit, 20);
    const offset = parsearEnteroPositivo(req.query.offset, 0);

    try {
      const profileId = await resolverIdPerfilParaUsuario(req.user);
      if (!profileId) {
        return res.status(400).json({ error: 'No se pudo resolver el perfil del usuario para consultar el historial' });
      }

      let query = supabase
        .from('child_orders')
        .select('*, child:child_id(id, nombre, email)')
        .eq('parent_id', req.user.id)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (status) query = query.eq('status', status);
      if (child_id) query = query.eq('child_id', child_id);

      const { data: orders, error } = await query;
      if (error) throw error;

      const ordersWithCount = await Promise.all((orders || []).map(async (order) => {
        const { count } = await supabase
          .from('child_order_items')
          .select('*', { count: 'exact', head: true })
          .eq('order_id', order.id);

        return {
          ...order,
          child: normalizarUsuarioRelacionado(order.child),
          items_count: count || 0,
        };
      }));

      return res.json({ orders: ordersWithCount });
    } catch (error) {
      console.error('Error fetching parent child-orders:', error);
      return res.status(500).json({ error: 'Error al obtener pedidos' });
    }
  });

  app.get('/api/parent/orders/:id', autenticarToken, async (req, res) => {
    if (!supabase) return requireSupabase(res);
    if (!puedeActuarComoPadre(req.user)) return res.status(403).json({ error: 'Solo los padres pueden ver detalles de pedidos' });

    const { id } = req.params;

    try {
      const { data: order, error } = await supabase
        .from('child_orders')
        .select('*, child:child_id(id, nombre, email), link:link_id(spending_limit)')
        .eq('id', id)
        .eq('parent_id', req.user.id)
        .single();

      if (error || !order) return res.status(404).json({ error: 'Pedido no encontrado' });

      const { data: items, error: itemsError } = await supabase
        .from('child_order_items')
        .select('*')
        .eq('order_id', order.id);

      if (itemsError) throw itemsError;

      return res.json({
        order: {
          ...order,
          child: normalizarUsuarioRelacionado(order.child),
          items: items || [],
          spending_limit: order.link?.spending_limit || 0,
        },
      });
    } catch (error) {
      console.error('Error fetching order detail:', error);
      return res.status(500).json({ error: 'Error al obtener detalle del pedido' });
    }
  });

  app.put('/api/parent/orders/:id/approve', autenticarToken, async (req, res) => {
    if (!supabase) return requireSupabase(res);
    if (!puedeActuarComoPadre(req.user)) return res.status(403).json({ error: 'Solo los padres pueden aprobar pedidos' });

    const { id } = req.params;
    const { approved_amount } = req.body || {};

    try {
      const { data: order, error: fetchError } = await supabase
        .from('child_orders')
        .select('*')
        .eq('id', id)
        .eq('parent_id', req.user.id)
        .eq('status', 'pending')
        .single();

      if (fetchError || !order) return res.status(404).json({ error: 'Pedido no encontrado o ya procesado' });

      const finalAmount = approved_amount || order.total;
      const { data: updated, error: errorActualizacion } = await supabase
        .from('child_orders')
        .update({ status: 'approved', approved_amount: finalAmount, approved_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (errorActualizacion) throw errorActualizacion;

      await notificarUsuarioSinFallo(order.child_id, {
        type: 'child_order_approved',
        title: 'Pedido aprobado',
        body: 'Tu pedido ha sido aprobado y ya puede prepararse.',
        data: { idPedido: id, targetScreen: 'child-orders' },
      });

      return res.json({ order: updated, message: 'Pedido aprobado exitosamente' });
    } catch (error) {
      console.error('Error approving order:', error);
      return res.status(500).json({ error: 'Error al aprobar pedido' });
    }
  });

  app.put('/api/parent/orders/:id/reject', autenticarToken, async (req, res) => {
    if (!supabase) return requireSupabase(res);
    if (!puedeActuarComoPadre(req.user)) return res.status(403).json({ error: 'Solo los padres pueden rechazar pedidos' });

    const { id } = req.params;
    const { reason } = req.body || {};

    if (!reason || reason.length < 3) {
      return res.status(400).json({ error: 'Debe proporcionar una razón para el rechazo' });
    }

    try {
      const { data: order, error: fetchError } = await supabase
        .from('child_orders')
        .select('*')
        .eq('id', id)
        .eq('parent_id', req.user.id)
        .eq('status', 'pending')
        .single();

      if (fetchError || !order) return res.status(404).json({ error: 'Pedido no encontrado o ya procesado' });

      const { data: updated, error: errorActualizacion } = await supabase
        .from('child_orders')
        .update({ status: 'rejected', rejection_reason: reason, rejected_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (errorActualizacion) throw errorActualizacion;

      await notificarUsuarioSinFallo(order.child_id, {
        type: 'child_order_rejected',
        title: 'Pedido rechazado',
        body: reason || 'Tu pedido ha sido rechazado por tu responsable.',
        data: { idPedido: id, targetScreen: 'child-orders' },
      });

      return res.json({ order: updated, message: 'Pedido rechazado' });
    } catch (error) {
      console.error('Error rejecting order:', error);
      return res.status(500).json({ error: 'Error al rechazar pedido' });
    }
  });

  app.put('/api/parent/orders/:id/pay', autenticarToken, async (req, res) => {
    if (!supabase) return requireSupabase(res);
    if (!puedeActuarComoPadre(req.user)) return res.status(403).json({ error: 'Solo los padres pueden marcar pedidos como pagados' });

    const { id } = req.params;
    const { payment_method = 'cash', amount_paid } = req.body || {};

    try {
      const { data: order, error: fetchError } = await supabase
        .from('child_orders')
        .select('*')
        .eq('id', id)
        .eq('parent_id', req.user.id)
        .eq('status', 'approved')
        .single();

      if (fetchError || !order) return res.status(404).json({ error: 'Pedido no encontrado o no está aprobado' });

      const finalAmount = amount_paid || order.approved_amount || order.total;
      const { data: updated, error: errorActualizacion } = await supabase
        .from('child_orders')
        .update({ status: 'paid', payment_method, amount_paid: finalAmount, paid_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (errorActualizacion) throw errorActualizacion;

      await notificarUsuarioSinFallo(order.child_id, {
        type: 'child_order_paid',
        title: 'Pedido pagado',
        body: 'Tu pedido ya figura como pagado.',
        data: { idPedido: id, targetScreen: 'child-orders' },
      });

      return res.json({ order: updated, message: 'Pedido marcado como pagado' });
    } catch (error) {
      console.error('Error marking order as paid:', error);
      return res.status(500).json({ error: 'Error al marcar como pagado' });
    }
  });

  app.put('/api/parent/orders/:id/modify', autenticarToken, async (req, res) => {
    if (!supabase) return requireSupabase(res);
    if (!puedeActuarComoPadre(req.user)) return res.status(403).json({ error: 'Solo los padres pueden modificar pedidos' });

    const { id } = req.params;
    const { items } = req.body || {};

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Debe proporcionar items para modificar' });
    }

    try {
      const { data: order, error: orderError } = await supabase
        .from('child_orders')
        .select('*')
        .eq('id', id)
        .eq('parent_id', req.user.id)
        .in('status', ['pending', 'approved'])
        .single();

      if (orderError || !order) return res.status(404).json({ error: 'Pedido no encontrado o ya procesado' });

      const validatedOrder = await validarItemsPedido(items, { idUsuario: order.child_id });
      const itemsValidados = validatedOrder.items.map((item) => ({
        product_id: item.product_id,
        product_name: item.product_name,
        quantity: item.quantity,
        price: item.price,
        subtotal: item.subtotal,
      }));

      const { subtotal, tax, total } = validatedOrder;

      const { error: deleteError } = await supabase.from('child_order_items').delete().eq('order_id', id);
      if (deleteError) throw deleteError;

      const { error: insertError } = await supabase
        .from('child_order_items')
        .insert(itemsValidados.map((item) => ({ order_id: id, ...item })));
      if (insertError) throw insertError;

      const { data: updated, error: errorActualizacion } = await supabase
        .from('child_orders')
        .update({ subtotal, tax, total, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (errorActualizacion) throw errorActualizacion;

      return res.json({ order: updated, items: itemsValidados, message: 'Pedido modificado exitosamente' });
    } catch (error) {
      console.error('Error modifying order:', error);
      return res.status(error.statusCode || 500).json({ error: error.message || 'Error al modificar pedido' });
    }
  });

  app.get('/api/parent/child-orders/history', autenticarToken, async (req, res) => {
    if (!supabase) return requireSupabase(res);
    if (!puedeActuarComoPadre(req.user)) return res.status(403).json({ error: 'Solo los padres pueden ver el historial' });

    const { child_id, status = 'paid', from_date, to_date } = req.query;
    const limit = parsearEnteroPositivo(req.query.limit, 50);
    const normalizedStatuses = construirAliasEstadoPedido(status);

    try {
      const profileId = await resolveProfileIdForUser(req.user);
      if (!profileId) {
        return res.status(400).json({ error: 'No se pudo resolver el perfil del usuario para consultar el historial' });
      }

      let query = supabase
        .from('pedidos')
        .select(`
          id,
          estado,
          fecha_creacion,
          id_perfil,
          id_pagador,
          perfiles:id_perfil (
            id,
            nombre_completo
          ),
          lineas_pedido (
            id,
            id_producto_menu,
            nombre_producto,
            precio_compra,
            notas
          )
        `)
        .eq('id_pagador', profileId)
        .order('fecha_creacion', { ascending: false })
        .limit(limit);

      if (child_id) query = query.eq('id_perfil', child_id);

      const { data, error } = await query;
      if (error) throw error;

      const orders = (data || [])
        .map((order) => mapPedidoOrder(order, {
          id: order.id_perfil,
          name: order.perfiles?.nombre_completo || null,
        }))
        .filter((order) => normalizedStatuses.includes(order.status))
        .filter((order) => !from_date || order.date >= from_date)
        .filter((order) => !to_date || order.date <= to_date);

      return res.json({ orders });
    } catch (error) {
      console.error('Error fetching order history:', error);
      return res.status(500).json({ error: 'Error al obtener historial' });
    }
  });
}
