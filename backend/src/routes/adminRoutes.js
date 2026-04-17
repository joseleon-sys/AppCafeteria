export function registerAdminRoutes(app, deps) {
  const {
    supabase,
    pool,
    authenticateToken,
    requireAdmin,
    buildOrderQueueEntry,
    parseJsonArray,
  } = deps;

  app.get('/api/admin/statistics', authenticateToken, requireAdmin, async (req, res) => {
    try {
      if (supabase) {
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
      }

      const [usersResult, ordersResult] = await Promise.all([
        pool.query('SELECT role, is_adult, created_at FROM users'),
        pool.query('SELECT estado, fecha_creacion FROM pedidos'),
      ]);

      let fraudRows = [];
      try {
        const fraudResult = await pool.query('SELECT severity, created_at FROM fraud_prevention_log');
        fraudRows = fraudResult.rows || [];
      } catch {
        fraudRows = [];
      }

      const users = usersResult.rows || [];
      const orders = ordersResult.rows || [];
      const todayDate = new Date().toISOString().slice(0, 10);
      return res.json({
        summary: {
          total_users: users.length,
          total_orders: orders.length,
          total_revenue: 0,
          fraud_alerts: fraudRows.length,
          average_order_value: 0,
        },
        users: {
          adults: users.filter((user) => user.role !== 'child' || user.is_adult).length,
          children: users.filter((user) => user.role === 'child' || user.is_adult === false).length,
          admins: users.filter((user) => user.role === 'admin').length,
        },
        orders: {
          completed: orders.filter((order) => ['PAGADO', 'COMPLETADA', 'APROBADO'].includes(order.estado)).length,
          pending: orders.filter((order) => ['PENDIENTE', 'PROCESANDO'].includes(order.estado)).length,
          rejected: orders.filter((order) => ['RECHAZADO', 'CANCELADO'].includes(order.estado)).length,
        },
        today: {
          new_orders: orders.filter((order) => String(order.fecha_creacion || '').slice(0, 10) === todayDate).length,
          new_users: users.filter((user) => String(user.created_at || '').slice(0, 10) === todayDate).length,
          fraud_incidents: fraudRows.filter((log) => String(log.created_at || '').slice(0, 10) === todayDate).length,
        },
      });
    } catch (error) {
      console.error('Error al obtener estadísticas admin:', error);
      return res.status(500).json({ error: 'Error al obtener estadísticas' });
    }
  });

  app.get('/api/admin/fraud-log', authenticateToken, requireAdmin, async (req, res) => {
    try {
      if (supabase) {
        const { data, error } = await supabase
          .from('fraud_prevention_log')
          .select('id, user_id, action_type, severity, details, ip_address, user_agent, created_at')
          .order('created_at', { ascending: false })
          .limit(100);

        if (error) throw error;
        return res.json({ logs: (data || []).map((log) => ({ ...log, user_name: log.user_id ? `Usuario #${log.user_id}` : 'Sistema' })) });
      }

      try {
        const result = await pool.query(
          `SELECT f.id, f.user_id, f.action_type, f.severity, f.details, f.ip_address, f.user_agent, f.created_at,
                  COALESCE(u.nombre, 'Sistema') AS user_name
           FROM fraud_prevention_log f
           LEFT JOIN users u ON u.id = f.user_id
           ORDER BY f.created_at DESC
           LIMIT 100`,
        );
        return res.json({ logs: result.rows || [] });
      } catch {
        return res.json({ logs: [] });
      }
    } catch (error) {
      console.error('Error al obtener fraude log:', error);
      return res.status(500).json({ error: 'Error al obtener fraude log' });
    }
  });

  app.get('/api/admin/users', authenticateToken, requireAdmin, async (req, res) => {
    try {
      const result = await pool.query(
        `SELECT 
          u.id, u.email, u.nombre AS name, u.role, u.is_adult, u.created_at,
          COALESCE(u.blocked, false) as blocked,
          COUNT(DISTINCT pcl.child_id) as children_count
        FROM users u
        LEFT JOIN parent_child_links pcl ON u.id = pcl.parent_id AND pcl.status = 'active'
        GROUP BY u.id, u.email, u.nombre, u.role, u.is_adult, u.created_at, u.blocked
        ORDER BY u.created_at DESC`,
      );

      return res.json({
        users: result.rows.map((u) => ({
          id: u.id,
          email: u.email,
          name: u.name || 'N/A',
          role: u.role,
          is_adult: u.is_adult,
          created_at: u.created_at,
          blocked: u.blocked || false,
          children_count: parseInt(u.children_count, 10) || 0,
        })),
      });
    } catch (err) {
      console.error('Error al obtener usuarios:', err);

      if (err.message.includes('blocked') || err.column === 'blocked') {
        try {
          const result = await pool.query(
            `SELECT 
              u.id, u.email, u.nombre AS name, u.role, u.is_adult, u.created_at,
              COUNT(DISTINCT pcl.child_id) as children_count
            FROM users u
            LEFT JOIN parent_child_links pcl ON u.id = pcl.parent_id AND pcl.status = 'active'
            GROUP BY u.id, u.email, u.nombre, u.role, u.is_adult, u.created_at
            ORDER BY u.created_at DESC`,
          );

          return res.json({
            users: result.rows.map((u) => ({
              id: u.id,
              email: u.email,
              name: u.name || 'N/A',
              role: u.role,
              is_adult: u.is_adult,
              created_at: u.created_at,
              blocked: false,
              children_count: parseInt(u.children_count, 10) || 0,
            })),
          });
        } catch (retryErr) {
          console.error('Retry también falló:', retryErr);
        }
      }

      return res.status(500).json({ error: 'Error al obtener usuarios', details: err.message });
    }
  });

  app.put('/api/admin/users/:id/block', authenticateToken, requireAdmin, async (req, res) => {
    const { id } = req.params;
    const { blocked } = req.body;

    try {
      if (supabase) {
        const { data, error } = await supabase.from('users').update({ blocked: blocked || false }).eq('id', id).select();
        if (!error && data && data.length > 0) {
          return res.json({
            message: `Usuario ${blocked ? 'bloqueado' : 'desbloqueado'} correctamente`,
            user: data[0],
          });
        }
      }
    } catch (supabaseError) {
      console.warn('Error en Supabase, usando PostgreSQL local:', supabaseError?.message);
    }

    try {
      const result = await pool.query('UPDATE users SET blocked = $1 WHERE id = $2 RETURNING *', [blocked || false, id]);
      if (result.rows.length === 0) return res.status(404).json({ error: 'Usuario no encontrado' });
      return res.json({ message: `Usuario ${blocked ? 'bloqueado' : 'desbloqueado'} correctamente`, user: result.rows[0] });
    } catch (localError) {
      console.error('Error al bloquear usuario:', localError);
      return res.status(500).json({ error: 'Error al bloquear usuario', details: localError.message });
    }
  });

  app.put('/api/admin/users/:id', authenticateToken, requireAdmin, async (req, res) => {
    const { id } = req.params;
    const { name, email, role } = req.body;

    try {
      if (supabase) {
        const updateData = {};
        if (name) updateData.nombre = name;
        if (email) updateData.email = email;
        if (role) updateData.role = role;

        const { data, error } = await supabase.from('users').update(updateData).eq('id', id).select();
        if (!error && data && data.length > 0) {
          return res.json({ message: 'Usuario actualizado correctamente', user: data[0] });
        }
      }
    } catch (supabaseError) {
      console.warn('Error en Supabase, usando PostgreSQL local:', supabaseError?.message);
    }

    try {
      const updates = [];
      const values = [];
      let paramCount = 1;

      if (name) {
        updates.push(`nombre = $${paramCount}`);
        values.push(name);
        paramCount += 1;
      }
      if (email) {
        updates.push(`email = $${paramCount}`);
        values.push(email);
        paramCount += 1;
      }
      if (role) {
        updates.push(`role = $${paramCount}`);
        values.push(role);
        paramCount += 1;
      }

      if (updates.length === 0) return res.status(400).json({ error: 'No hay campos para actualizar' });

      values.push(id);
      const query = `UPDATE users SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`;
      const result = await pool.query(query, values);

      if (result.rows.length === 0) return res.status(404).json({ error: 'Usuario no encontrado' });
      return res.json({ message: 'Usuario actualizado correctamente', user: result.rows[0] });
    } catch (localError) {
      console.error('Error al actualizar usuario:', localError);
      return res.status(500).json({ error: 'Error al actualizar usuario', details: localError.message });
    }
  });

  app.delete('/api/admin/users/:id', authenticateToken, requireAdmin, async (req, res) => {
    const { id } = req.params;

    try {
      if (supabase) {
        const { error } = await supabase.from('users').delete().eq('id', id);
        if (!error) return res.json({ message: 'Usuario eliminado correctamente' });
      }
    } catch (supabaseError) {
      console.warn('Error en Supabase, usando PostgreSQL local:', supabaseError?.message);
    }

    try {
      const result = await pool.query('DELETE FROM users WHERE id = $1 RETURNING id', [id]);
      if (result.rows.length === 0) return res.status(404).json({ error: 'Usuario no encontrado' });
      return res.json({ message: 'Usuario eliminado correctamente' });
    } catch (localError) {
      console.error('Error al eliminar usuario:', localError);
      return res.status(500).json({ error: 'Error al eliminar usuario', details: localError.message });
    }
  });

  app.get('/api/admin/orders/queue', authenticateToken, requireAdmin, async (req, res) => {
    try {
      if (supabase) {
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
      }

      const ordersResult = await pool.query(
        `SELECT p.id, p.id_perfil, p.estado, p.fecha_creacion,
                perf.nombre_completo AS child_name
         FROM pedidos p
         LEFT JOIN perfiles perf ON perf.id = p.id_perfil
         WHERE p.estado IN ('PENDIENTE', 'APROBADO')
         ORDER BY p.fecha_creacion DESC
         LIMIT 100`,
      );

      const queue = await Promise.all((ordersResult.rows || []).map(async (order) => {
        const itemsResult = await pool.query(
          `SELECT lp.id_producto_menu AS product_id,
                  lp.nombre_producto AS product_name,
                  1 AS quantity,
                  lp.precio_compra AS price,
                  lp.precio_compra AS subtotal,
                  lp.notas AS notes,
                  mi.alergenos AS allergens
           FROM lineas_pedido lp
           LEFT JOIN productos_menu mi ON mi.id = lp.id_producto_menu
           WHERE lp.id_pedido = $1
           ORDER BY lp.id ASC`,
          [order.id],
        );

        const enrichedItems = (itemsResult.rows || []).map((item) => ({ ...item, allergens: parseJsonArray(item.allergens) }));
        return buildOrderQueueEntry({
          id: order.id,
          child_id: order.id_perfil,
          child_name: order.child_name || 'Sin nombre',
          child_email: null,
          status: order.estado,
          notes: '',
          created_at: order.fecha_creacion,
        }, enrichedItems);
      }));

      return res.json({ orders: queue });
    } catch (error) {
      console.error('Error al obtener cola KDS:', error);
      return res.status(500).json({ error: 'Error al obtener la cola de cocina' });
    }
  });
}
