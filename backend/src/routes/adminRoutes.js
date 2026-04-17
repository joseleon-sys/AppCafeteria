export function registerAdminRoutes(app, deps) {
  const {
    supabase,
    authenticateToken,
    requireAdmin,
    buildOrderQueueEntry,
    parseJsonArray,
  } = deps;

  function requireSupabase(res) {
    return res.status(503).json({ error: 'Supabase no esta configurado en el backend' });
  }

  app.get('/api/admin/statistics', authenticateToken, requireAdmin, async (req, res) => {
    if (!supabase) return requireSupabase(res);

    try {
      const [{ data: users, error: usersError }, { data: orders, error: ordersError }, { data: fraudLogs, error: fraudError }] = await Promise.all([
        supabase.from('users').select('role, is_adult, created_at'),
        supabase.from('pedidos').select('estado, fecha_creacion'),
        supabase.from('fraud_prevention_log').select('severity, created_at'),
      ]);

      if (usersError) throw usersError;
      if (ordersError) throw ordersError;
      if (fraudError) throw fraudError;

      const todayDate = new Date().toISOString().slice(0, 10);
      const safeUsers = users || [];
      const safeOrders = orders || [];
      const safeFraudLogs = fraudLogs || [];

      return res.json({
        summary: {
          total_users: safeUsers.length,
          total_orders: safeOrders.length,
          total_revenue: 0,
          fraud_alerts: safeFraudLogs.length,
          average_order_value: 0,
        },
        users: {
          adults: safeUsers.filter((user) => user.role !== 'child' || user.is_adult).length,
          children: safeUsers.filter((user) => user.role === 'child' || user.is_adult === false).length,
          admins: safeUsers.filter((user) => user.role === 'admin').length,
        },
        orders: {
          completed: safeOrders.filter((order) => ['PAGADO', 'COMPLETADA', 'APROBADO'].includes(order.estado)).length,
          pending: safeOrders.filter((order) => ['PENDIENTE', 'PROCESANDO'].includes(order.estado)).length,
          rejected: safeOrders.filter((order) => ['RECHAZADO', 'CANCELADO'].includes(order.estado)).length,
        },
        today: {
          new_orders: safeOrders.filter((order) => String(order.fecha_creacion || '').slice(0, 10) === todayDate).length,
          new_users: safeUsers.filter((user) => String(user.created_at || '').slice(0, 10) === todayDate).length,
          fraud_incidents: safeFraudLogs.filter((log) => String(log.created_at || '').slice(0, 10) === todayDate).length,
        },
      });
    } catch (error) {
      console.error('Error al obtener estadísticas admin:', error);
      return res.status(500).json({ error: 'Error al obtener estadísticas' });
    }
  });

  app.get('/api/admin/fraud-log', authenticateToken, requireAdmin, async (req, res) => {
    if (!supabase) return requireSupabase(res);

    try {
      const { data, error } = await supabase
        .from('fraud_prevention_log')
        .select('id, user_id, action_type, severity, details, ip_address, user_agent, created_at')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      return res.json({ logs: (data || []).map((log) => ({ ...log, user_name: log.user_id ? `Usuario #${log.user_id}` : 'Sistema' })) });
    } catch (error) {
      console.error('Error al obtener fraude log:', error);
      return res.status(500).json({ error: 'Error al obtener fraude log' });
    }
  });

  app.get('/api/admin/users', authenticateToken, requireAdmin, async (req, res) => {
    if (!supabase) return requireSupabase(res);

    try {
      const { data: users, error } = await supabase
        .from('users')
        .select('id, email, nombre, role, is_adult, created_at, blocked');

      if (error) throw error;

      const { data: links, error: linksError } = await supabase
        .from('parent_child_links')
        .select('parent_id')
        .eq('status', 'active');

      if (linksError) throw linksError;

      const childrenByParent = (links || []).reduce((acc, link) => {
        const key = String(link.parent_id);
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      }, {});

      return res.json({
        users: (users || []).map((user) => ({
          id: user.id,
          email: user.email,
          name: user.nombre || 'N/A',
          role: user.role,
          is_adult: user.is_adult,
          created_at: user.created_at,
          blocked: user.blocked || false,
          children_count: childrenByParent[String(user.id)] || 0,
        })),
      });
    } catch (error) {
      console.error('Error al obtener usuarios:', error);
      return res.status(500).json({ error: 'Error al obtener usuarios', details: error.message });
    }
  });

  app.put('/api/admin/users/:id/block', authenticateToken, requireAdmin, async (req, res) => {
    if (!supabase) return requireSupabase(res);

    const { id } = req.params;
    const { blocked } = req.body || {};

    try {
      const { data, error } = await supabase.from('users').update({ blocked: blocked || false }).eq('id', id).select();
      if (error) throw error;
      if (!data || data.length === 0) return res.status(404).json({ error: 'Usuario no encontrado' });

      return res.json({
        message: `Usuario ${blocked ? 'bloqueado' : 'desbloqueado'} correctamente`,
        user: data[0],
      });
    } catch (error) {
      console.error('Error al bloquear usuario:', error);
      return res.status(500).json({ error: 'Error al bloquear usuario', details: error.message });
    }
  });

  app.put('/api/admin/users/:id', authenticateToken, requireAdmin, async (req, res) => {
    if (!supabase) return requireSupabase(res);

    const { id } = req.params;
    const { name, email, role } = req.body || {};

    try {
      const updateData = {};
      if (name) updateData.nombre = name;
      if (email) updateData.email = email;
      if (role) updateData.role = role;
      if (Object.keys(updateData).length === 0) return res.status(400).json({ error: 'No hay campos para actualizar' });

      const { data, error } = await supabase.from('users').update(updateData).eq('id', id).select();
      if (error) throw error;
      if (!data || data.length === 0) return res.status(404).json({ error: 'Usuario no encontrado' });

      return res.json({ message: 'Usuario actualizado correctamente', user: data[0] });
    } catch (error) {
      console.error('Error al actualizar usuario:', error);
      return res.status(500).json({ error: 'Error al actualizar usuario', details: error.message });
    }
  });

  app.delete('/api/admin/users/:id', authenticateToken, requireAdmin, async (req, res) => {
    if (!supabase) return requireSupabase(res);

    const { id } = req.params;

    try {
      const { error } = await supabase.from('users').delete().eq('id', id);
      if (error) throw error;
      return res.json({ message: 'Usuario eliminado correctamente' });
    } catch (error) {
      console.error('Error al eliminar usuario:', error);
      return res.status(500).json({ error: 'Error al eliminar usuario', details: error.message });
    }
  });

  app.get('/api/admin/orders/queue', authenticateToken, requireAdmin, async (req, res) => {
    if (!supabase) return requireSupabase(res);

    try {
      const { data: orders, error } = await supabase
        .from('pedidos')
        .select(`
          id,
          estado,
          fecha_creacion,
          id_perfil,
          perfiles:id_perfil (
            id,
            nombre_completo
          ),
          lineas_pedido (
            id_producto_menu,
            nombre_producto,
            precio_compra,
            notas,
            productos_menu:id_producto_menu (
              alergenos
            )
          )
        `)
        .in('estado', ['PENDIENTE', 'APROBADO'])
        .order('fecha_creacion', { ascending: false })
        .limit(100);

      if (error) throw error;

      const queue = (orders || []).map((order) => buildOrderQueueEntry({
        id: order.id,
        child_id: order.id_perfil,
        child_name: order.perfiles?.nombre_completo || 'Sin nombre',
        child_email: null,
        status: order.estado,
        notes: '',
        created_at: order.fecha_creacion,
      }, (order.lineas_pedido || []).map((item) => ({
        product_id: item.id_producto_menu,
        product_name: item.nombre_producto,
        quantity: 1,
        price: item.precio_compra,
        subtotal: item.precio_compra,
        notes: item.notas || '',
        allergens: parseJsonArray(item.productos_menu?.alergenos),
      }))));

      return res.json({ orders: queue });
    } catch (error) {
      console.error('Error al obtener cola KDS:', error);
      return res.status(500).json({ error: 'Error al obtener la cola de cocina' });
    }
  });
}
