export function registerChildOrderRoutes(app, deps) {
  const {
    supabase,
    pool,
    authenticateToken,
    isParentCapableUser,
    notifyUserSafely,
    validateOrderItems,
    parsePositiveInteger,
    buildOrderStatusAliases,
    normalizeHistoricOrderEntry,
    normalizeRelatedUser,
    isUuidLike,
  } = deps;

  app.post('/api/child/orders', authenticateToken, async (req, res) => {
    const { items, notes, parent_id } = req.body;
    if (req.user.role !== 'child') return res.status(403).json({ error: 'Solo los hijos pueden crear pedidos' });
    if (!items || !Array.isArray(items) || items.length === 0) return res.status(400).json({ error: 'El carrito está vacío' });

    try {
      let link;
      let selectedParentId = parent_id;

      if (supabase) {
        const { data: links, error } = await supabase
          .from('parent_child_links')
          .select('*, parent:parent_id(*)')
          .eq('child_id', req.user.id)
          .eq('status', 'active');

        if (error || !links || links.length === 0) return res.status(400).json({ error: 'No tienes padres vinculados activos' });
        link = parent_id ? links.find((l) => l.parent_id === parent_id) : links[0];
        if (!link) return res.status(400).json({ error: 'Padre especificado no encontrado' });
        selectedParentId = link.parent_id;
      } else {
        const links = await new Promise((resolve, reject) => {
          pool.query(
            'SELECT * FROM parent_child_links WHERE child_id = $1 AND status = $2',
            [req.user.id, 'active'],
            (err, result) => (err ? reject(err) : resolve(result.rows)),
          );
        });

        if (!links || links.length === 0) return res.status(400).json({ error: 'No tienes padres vinculados activos' });
        link = parent_id ? links.find((l) => l.parent_id === parent_id) : links[0];
        if (!link) return res.status(400).json({ error: 'Padre especificado no encontrado' });
        selectedParentId = link.parent_id;
      }

      const validatedOrder = await validateOrderItems(items);
      const validatedItems = validatedOrder.items.map((item) => ({
        product_id: item.product_id,
        product_name: item.product_name,
        quantity: item.quantity,
        price: item.price,
        subtotal: item.subtotal,
      }));
      const { subtotal, tax, total } = validatedOrder;

      if (total > link.spending_limit) {
        return res.status(403).json({
          error: `El total (${total.toFixed(2)} EUR) excede el limite de gasto (${Number(link.spending_limit).toFixed(2)} EUR)`,
        });
      }

      if (total < 5) return res.status(400).json({ error: 'El monto minimo del pedido es 5.00 EUR' });

      if (supabase) {
        const { data: order, error: orderError } = await supabase
          .from('child_orders')
          .insert({
            child_id: req.user.id,
            parent_id: selectedParentId,
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
        const itemsToInsert = validatedItems.map((item) => ({ order_id: order.id, ...item }));
        const { error: itemsError } = await supabase.from('child_order_items').insert(itemsToInsert);
        if (itemsError) throw itemsError;

        await notifyUserSafely(selectedParentId, {
          type: 'child_order_pending',
          title: 'Nuevo pedido pendiente',
          body: 'Uno de tus hijos ha creado un pedido y necesita tu aprobacion.',
          data: { orderId: order.id, childId: req.user.id, targetScreen: 'parent-orders' },
        });

        return res.status(201).json({
          order: { id: order.id, status: order.status, total: order.total, items: validatedItems, created_at: order.created_at },
        });
      }

      const orderResult = await new Promise((resolve, reject) => {
        pool.query(
          `INSERT INTO child_orders (child_id, parent_id, link_id, status, subtotal, tax, total, notes)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
          [req.user.id, selectedParentId, link.id, 'pending', subtotal, tax, total, notes || null],
          (err, result) => (err ? reject(err) : resolve(result.rows[0])),
        );
      });

      for (const item of validatedItems) {
        await new Promise((resolve, reject) => {
          pool.query(
            `INSERT INTO child_order_items (order_id, product_id, product_name, quantity, price, subtotal)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [orderResult.id, item.product_id, item.product_name, item.quantity, item.price, item.subtotal],
            (err) => (err ? reject(err) : resolve()),
          );
        });
      }

      await notifyUserSafely(selectedParentId, {
        type: 'child_order_pending',
        title: 'Nuevo pedido pendiente',
        body: 'Uno de tus hijos ha creado un pedido y necesita tu aprobacion.',
        data: { orderId: orderResult.id, childId: req.user.id, targetScreen: 'parent-orders' },
      });

      return res.status(201).json({
        order: {
          id: orderResult.id,
          status: orderResult.status,
          total: orderResult.total,
          items: validatedItems,
          created_at: orderResult.created_at,
        },
      });
    } catch (error) {
      console.error('Error creating child order:', error);
      return res.status(error.statusCode || 500).json({ error: error.message || 'Error al crear el pedido' });
    }
  });

  app.get('/api/child/orders', authenticateToken, async (req, res) => {
    if (req.user.role !== 'child') return res.status(403).json({ error: 'Solo los hijos pueden ver sus pedidos' });

    const { status } = req.query;
    const normalizedStatuses = buildOrderStatusAliases(status);

    try {
      if (supabase && isUuidLike(req.user.id)) {
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
          .eq('id_perfil', req.user.id)
          .order('fecha_creacion', { ascending: false });

        if (error) throw error;

        const orders = (data || [])
          .map((order) => {
            const items = Array.isArray(order.lineas_pedido)
              ? order.lineas_pedido.map((item) => {
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

            return normalizeHistoricOrderEntry({
              id: order.id,
              status: order.estado,
              created_at: order.fecha_creacion,
              items,
              items_count: items.length,
              total: items.reduce((sum, item) => sum + item.subtotal, 0),
            });
          })
          .filter((order) => !status || normalizedStatuses.includes(order.status));

        return res.json({ orders });
      }

      const pedidosTableExists = await pool.query(
        `SELECT EXISTS (
           SELECT 1
           FROM information_schema.tables
           WHERE table_schema = 'public' AND table_name = 'pedidos'
         ) AS exists`,
      );

      if (pedidosTableExists.rows[0]?.exists) {
        const params = [String(req.user.id)];
        let paramIndex = 2;
        let query = `
          SELECT
            p.id,
            p.estado,
            p.fecha_creacion,
            COALESCE(SUM(COALESCE(lp.precio_compra, 0)), 0) AS total,
            COUNT(lp.id) AS items_count,
            COALESCE(
              json_agg(
                json_build_object(
                  'id', lp.id,
                  'product_id', lp.id_producto_menu,
                  'product_name', lp.nombre_producto,
                  'quantity', 1,
                  'price', COALESCE(lp.precio_compra, 0),
                  'subtotal', COALESCE(lp.precio_compra, 0),
                  'notes', COALESCE(lp.notas, '')
                )
              ) FILTER (WHERE lp.id IS NOT NULL),
              '[]'::json
            ) AS items
          FROM pedidos p
          LEFT JOIN lineas_pedido lp ON lp.id_pedido = p.id
          WHERE p.id_perfil::text = $1
        `;

        if (status) {
          query += ` AND LOWER(COALESCE(p.estado, '')) = ANY($${paramIndex})`;
          params.push(normalizedStatuses);
          paramIndex += 1;
        }

        query += `
          GROUP BY p.id, p.estado, p.fecha_creacion
          ORDER BY p.fecha_creacion DESC
        `;

        const result = await pool.query(query, params);
        return res.json({
          orders: (result.rows || []).map((row) => normalizeHistoricOrderEntry({
            id: row.id,
            status: row.estado,
            created_at: row.fecha_creacion,
            total: row.total,
            items_count: row.items_count,
            items: Array.isArray(row.items) ? row.items : [],
          })),
        });
      }

      const orders = await new Promise((resolve, reject) => {
        let query = 'SELECT co.*, u.nombre as parent_name, u.email as parent_email FROM child_orders co LEFT JOIN users u ON co.parent_id = u.id WHERE co.child_id = $1';
        const params = [req.user.id];

        if (status) {
          query += ' AND co.status = $2';
          params.push(status);
        }

        query += ' ORDER BY co.created_at DESC';
        pool.query(query, params, (err, result) => (err ? reject(err) : resolve(result.rows)));
      });

      const ordersWithItems = await Promise.all(orders.map(async (order) => {
        const items = await new Promise((resolve, reject) => {
          pool.query('SELECT COUNT(*) as count FROM child_order_items WHERE order_id = $1', [order.id], (err, result) => {
            if (err) return reject(err);
            return resolve(result.rows[0]);
          });
        });

        return normalizeHistoricOrderEntry({
          ...order,
          parent: { name: order.parent_name, email: order.parent_email },
          items_count: parseInt(items.count, 10),
        });
      }));

      return res.json({ orders: ordersWithItems });
    } catch (error) {
      console.error('Error fetching child orders:', error);
      return res.status(500).json({ error: 'Error al obtener pedidos' });
    }
  });

  app.get('/api/child/orders/:id', authenticateToken, async (req, res) => {
    if (req.user.role !== 'child') return res.status(403).json({ error: 'Solo los hijos pueden ver detalles de pedidos' });
    const id = String(req.params.id || '').trim();

    try {
      if (supabase && isUuidLike(req.user.id)) {
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
          .eq('id_perfil', req.user.id)
          .single();

        if (error || !order) return res.status(404).json({ error: 'Pedido no encontrado' });

        const items = Array.isArray(order.lineas_pedido)
          ? order.lineas_pedido.map((item) => {
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

        return res.json({
          order: normalizeHistoricOrderEntry({
            id: order.id,
            status: order.estado,
            created_at: order.fecha_creacion,
            items,
            items_count: items.length,
            total: items.reduce((sum, item) => sum + item.subtotal, 0),
          }),
        });
      }

      const pedidosTableExists = await pool.query(
        `SELECT EXISTS (
           SELECT 1
           FROM information_schema.tables
           WHERE table_schema = 'public' AND table_name = 'pedidos'
         ) AS exists`,
      );

      if (pedidosTableExists.rows[0]?.exists) {
        const result = await pool.query(
          `
            SELECT
              p.id,
              p.estado,
              p.fecha_creacion,
              COALESCE(SUM(COALESCE(lp.precio_compra, 0)), 0) AS total,
              COUNT(lp.id) AS items_count,
              COALESCE(
                json_agg(
                  json_build_object(
                    'id', lp.id,
                    'product_id', lp.id_producto_menu,
                    'product_name', lp.nombre_producto,
                    'quantity', 1,
                    'price', COALESCE(lp.precio_compra, 0),
                    'subtotal', COALESCE(lp.precio_compra, 0),
                    'notes', COALESCE(lp.notas, '')
                  )
                ) FILTER (WHERE lp.id IS NOT NULL),
                '[]'::json
              ) AS items
            FROM pedidos p
            LEFT JOIN lineas_pedido lp ON lp.id_pedido = p.id
            WHERE p.id::text = $1
              AND p.id_perfil::text = $2
            GROUP BY p.id, p.estado, p.fecha_creacion
            LIMIT 1
          `,
          [id, String(req.user.id)],
        );

        const order = result.rows[0];
        if (!order) return res.status(404).json({ error: 'Pedido no encontrado' });

        return res.json({
          order: normalizeHistoricOrderEntry({
            id: order.id,
            status: order.estado,
            created_at: order.fecha_creacion,
            total: order.total,
            items_count: order.items_count,
            items: Array.isArray(order.items) ? order.items : [],
          }),
        });
      }

      const order = await new Promise((resolve, reject) => {
        pool.query(
          `SELECT co.*, u.id as parent_id, u.nombre as parent_name, u.email as parent_email 
           FROM child_orders co 
           LEFT JOIN users u ON co.parent_id = u.id 
           WHERE co.id = $1 AND co.child_id = $2`,
          [id, req.user.id],
          (err, result) => (err ? reject(err) : resolve(result.rows[0])),
        );
      });

      if (!order) return res.status(404).json({ error: 'Pedido no encontrado' });

      const items = await new Promise((resolve, reject) => {
        pool.query('SELECT * FROM child_order_items WHERE order_id = $1', [order.id], (err, result) => (err ? reject(err) : resolve(result.rows)));
      });

      return res.json({
        order: normalizeHistoricOrderEntry({
          ...order,
          parent: { id: order.parent_id, name: order.parent_name, email: order.parent_email },
          items: items || [],
        }),
      });
    } catch (error) {
      console.error('Error fetching order detail:', error);
      return res.status(500).json({ error: 'Error al obtener detalle del pedido' });
    }
  });

  app.get('/api/parent/child-orders', authenticateToken, async (req, res) => {
    if (!isParentCapableUser(req.user)) return res.status(403).json({ error: 'Solo los padres pueden ver pedidos de hijos' });

    const { status, child_id } = req.query;
    const limit = parsePositiveInteger(req.query.limit, 20);
    const offset = parsePositiveInteger(req.query.offset, 0);

    try {
      if (supabase) {
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
          const { count } = await supabase.from('child_order_items').select('*', { count: 'exact', head: true }).eq('order_id', order.id);
          return { ...order, child: normalizeRelatedUser(order.child), items_count: count || 0 };
        }));

        return res.json({ orders: ordersWithCount });
      }

      let query = `SELECT co.*, u.id as child_id, u.nombre as child_name, u.email as child_email 
                   FROM child_orders co 
                   LEFT JOIN users u ON co.child_id = u.id 
                   WHERE co.parent_id = $1`;
      const params = [req.user.id];
      let paramIndex = 2;

      if (status) {
        query += ` AND co.status = $${paramIndex}`;
        params.push(status);
        paramIndex += 1;
      }
      if (child_id) {
        query += ` AND co.child_id = $${paramIndex}`;
        params.push(child_id);
        paramIndex += 1;
      }

      query += ` ORDER BY co.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      params.push(limit, offset);

      const orders = await new Promise((resolve, reject) => {
        pool.query(query, params, (err, result) => (err ? reject(err) : resolve(result.rows)));
      });

      const ordersWithCount = await Promise.all(orders.map(async (order) => {
        const count = await new Promise((resolve, reject) => {
          pool.query('SELECT COUNT(*) as count FROM child_order_items WHERE order_id = $1', [order.id], (err, result) => {
            if (err) return reject(err);
            return resolve(result.rows[0]);
          });
        });

        return {
          ...order,
          child: { id: order.child_id, name: order.child_name, email: order.child_email },
          items_count: parseInt(count.count, 10),
        };
      }));

      return res.json({ orders: ordersWithCount });
    } catch (error) {
      console.error('Error fetching parent child-orders:', error);
      return res.status(500).json({ error: 'Error al obtener pedidos' });
    }
  });

  app.get('/api/parent/orders/:id', authenticateToken, async (req, res) => {
    if (!isParentCapableUser(req.user)) return res.status(403).json({ error: 'Solo los padres pueden ver detalles de pedidos' });
    const { id } = req.params;

    try {
      if (supabase) {
        const { data: order, error } = await supabase
          .from('child_orders')
          .select('*, child:child_id(id, nombre, email), link:link_id(spending_limit)')
          .eq('id', id)
          .eq('parent_id', req.user.id)
          .single();

        if (error || !order) return res.status(404).json({ error: 'Pedido no encontrado' });
        const { data: items } = await supabase.from('child_order_items').select('*').eq('order_id', order.id);
        return res.json({
          order: {
            ...order,
            child: normalizeRelatedUser(order.child),
            items: items || [],
            spending_limit: order.link?.spending_limit || 0,
          },
        });
      }

      const order = await new Promise((resolve, reject) => {
        pool.query(
          `SELECT co.*, u.id as child_id, u.nombre as child_name, u.email as child_email,
                  pcl.spending_limit
           FROM child_orders co 
           LEFT JOIN users u ON co.child_id = u.id 
           LEFT JOIN parent_child_links pcl ON co.link_id = pcl.id
           WHERE co.id = $1 AND co.parent_id = $2`,
          [id, req.user.id],
          (err, result) => (err ? reject(err) : resolve(result.rows[0])),
        );
      });

      if (!order) return res.status(404).json({ error: 'Pedido no encontrado' });

      const items = await new Promise((resolve, reject) => {
        pool.query('SELECT * FROM child_order_items WHERE order_id = $1', [order.id], (err, result) => (err ? reject(err) : resolve(result.rows)));
      });

      return res.json({
        order: { ...order, child: { id: order.child_id, name: order.child_name, email: order.child_email }, items: items || [] },
      });
    } catch (error) {
      console.error('Error fetching order detail:', error);
      return res.status(500).json({ error: 'Error al obtener detalle del pedido' });
    }
  });

  app.put('/api/parent/orders/:id/approve', authenticateToken, async (req, res) => {
    if (!isParentCapableUser(req.user)) return res.status(403).json({ error: 'Solo los padres pueden aprobar pedidos' });
    const { id } = req.params;
    const { approved_amount } = req.body;

    try {
      if (supabase) {
        const { data: order, error: fetchError } = await supabase
          .from('child_orders')
          .select('*')
          .eq('id', id)
          .eq('parent_id', req.user.id)
          .eq('status', 'pending')
          .single();

        if (fetchError || !order) return res.status(404).json({ error: 'Pedido no encontrado o ya procesado' });

        const finalAmount = approved_amount || order.total;
        const { data: updated, error: updateError } = await supabase
          .from('child_orders')
          .update({ status: 'approved', approved_amount: finalAmount, approved_at: new Date().toISOString() })
          .eq('id', id)
          .select()
          .single();

        if (updateError) throw updateError;

        await notifyUserSafely(order.child_id, {
          type: 'child_order_approved',
          title: 'Pedido aprobado',
          body: 'Tu pedido ha sido aprobado y ya puede prepararse.',
          data: { orderId: id, targetScreen: 'child-orders' },
        });

        return res.json({ order: updated, message: 'Pedido aprobado exitosamente' });
      }

      const order = await new Promise((resolve, reject) => {
        pool.query(
          'SELECT * FROM child_orders WHERE id = $1 AND parent_id = $2 AND status = $3',
          [id, req.user.id, 'pending'],
          (err, result) => (err ? reject(err) : resolve(result.rows[0])),
        );
      });

      if (!order) return res.status(404).json({ error: 'Pedido no encontrado o ya procesado' });

      const finalAmount = approved_amount || order.total;
      const updated = await new Promise((resolve, reject) => {
        pool.query(
          `UPDATE child_orders 
           SET status = $1, approved_amount = $2, approved_at = NOW(), updated_at = NOW()
           WHERE id = $3 
           RETURNING *`,
          ['approved', finalAmount, id],
          (err, result) => (err ? reject(err) : resolve(result.rows[0])),
        );
      });

      await notifyUserSafely(order.child_id, {
        type: 'child_order_approved',
        title: 'Pedido aprobado',
        body: 'Tu pedido ha sido aprobado y ya puede prepararse.',
        data: { orderId: id, targetScreen: 'child-orders' },
      });

      return res.json({ order: updated, message: 'Pedido aprobado exitosamente' });
    } catch (error) {
      console.error('Error approving order:', error);
      return res.status(500).json({ error: 'Error al aprobar pedido' });
    }
  });

  app.put('/api/parent/orders/:id/reject', authenticateToken, async (req, res) => {
    if (!isParentCapableUser(req.user)) return res.status(403).json({ error: 'Solo los padres pueden rechazar pedidos' });
    const { id } = req.params;
    const { reason } = req.body;

    if (!reason || reason.length < 3) return res.status(400).json({ error: 'Debe proporcionar una razón para el rechazo' });

    try {
      if (supabase) {
        const { data: order, error: fetchError } = await supabase
          .from('child_orders')
          .select('*')
          .eq('id', id)
          .eq('parent_id', req.user.id)
          .eq('status', 'pending')
          .single();

        if (fetchError || !order) return res.status(404).json({ error: 'Pedido no encontrado o ya procesado' });
        const { data: updated, error: updateError } = await supabase
          .from('child_orders')
          .update({ status: 'rejected', rejection_reason: reason, rejected_at: new Date().toISOString() })
          .eq('id', id)
          .select()
          .single();
        if (updateError) throw updateError;

        await notifyUserSafely(order.child_id, {
          type: 'child_order_rejected',
          title: 'Pedido rechazado',
          body: reason || 'Tu pedido ha sido rechazado por tu responsable.',
          data: { orderId: id, targetScreen: 'child-orders' },
        });

        return res.json({ order: updated, message: 'Pedido rechazado' });
      }

      const order = await new Promise((resolve, reject) => {
        pool.query(
          'SELECT * FROM child_orders WHERE id = $1 AND parent_id = $2 AND status = $3',
          [id, req.user.id, 'pending'],
          (err, result) => (err ? reject(err) : resolve(result.rows[0])),
        );
      });

      if (!order) return res.status(404).json({ error: 'Pedido no encontrado o ya procesado' });
      const updated = await new Promise((resolve, reject) => {
        pool.query(
          `UPDATE child_orders 
           SET status = $1, rejection_reason = $2, rejected_at = NOW(), updated_at = NOW()
           WHERE id = $3 
           RETURNING *`,
          ['rejected', reason, id],
          (err, result) => (err ? reject(err) : resolve(result.rows[0])),
        );
      });

      await notifyUserSafely(order.child_id, {
        type: 'child_order_rejected',
        title: 'Pedido rechazado',
        body: reason || 'Tu pedido ha sido rechazado por tu responsable.',
        data: { orderId: id, targetScreen: 'child-orders' },
      });

      return res.json({ order: updated, message: 'Pedido rechazado' });
    } catch (error) {
      console.error('Error rejecting order:', error);
      return res.status(500).json({ error: 'Error al rechazar pedido' });
    }
  });

  app.put('/api/parent/orders/:id/pay', authenticateToken, async (req, res) => {
    if (!isParentCapableUser(req.user)) return res.status(403).json({ error: 'Solo los padres pueden marcar pedidos como pagados' });
    const { id } = req.params;
    const { payment_method = 'cash', amount_paid } = req.body;

    try {
      if (supabase) {
        const { data: order, error: fetchError } = await supabase
          .from('child_orders')
          .select('*')
          .eq('id', id)
          .eq('parent_id', req.user.id)
          .eq('status', 'approved')
          .single();

        if (fetchError || !order) return res.status(404).json({ error: 'Pedido no encontrado o no está aprobado' });

        const finalAmount = amount_paid || order.approved_amount || order.total;
        const { data: updated, error: updateError } = await supabase
          .from('child_orders')
          .update({ status: 'paid', payment_method, amount_paid: finalAmount, paid_at: new Date().toISOString() })
          .eq('id', id)
          .select()
          .single();
        if (updateError) throw updateError;

        await notifyUserSafely(order.child_id, {
          type: 'child_order_paid',
          title: 'Pedido pagado',
          body: 'Tu pedido ya figura como pagado.',
          data: { orderId: id, targetScreen: 'child-orders' },
        });

        return res.json({ order: updated, message: 'Pedido marcado como pagado' });
      }

      const order = await new Promise((resolve, reject) => {
        pool.query(
          'SELECT * FROM child_orders WHERE id = $1 AND parent_id = $2 AND status = $3',
          [id, req.user.id, 'approved'],
          (err, result) => (err ? reject(err) : resolve(result.rows[0])),
        );
      });

      if (!order) return res.status(404).json({ error: 'Pedido no encontrado o no está aprobado' });

      const finalAmount = amount_paid || order.approved_amount || order.total;
      const updated = await new Promise((resolve, reject) => {
        pool.query(
          `UPDATE child_orders 
           SET status = $1, payment_method = $2, amount_paid = $3, paid_at = NOW(), updated_at = NOW()
           WHERE id = $4 
           RETURNING *`,
          ['paid', payment_method, finalAmount, id],
          (err, result) => (err ? reject(err) : resolve(result.rows[0])),
        );
      });

      await notifyUserSafely(order.child_id, {
        type: 'child_order_paid',
        title: 'Pedido pagado',
        body: 'Tu pedido ya figura como pagado.',
        data: { orderId: id, targetScreen: 'child-orders' },
      });

      return res.json({ order: updated, message: 'Pedido marcado como pagado' });
    } catch (error) {
      console.error('Error marking order as paid:', error);
      return res.status(500).json({ error: 'Error al marcar como pagado' });
    }
  });

  app.put('/api/parent/orders/:id/modify', authenticateToken, async (req, res) => {
    if (!isParentCapableUser(req.user)) return res.status(403).json({ error: 'Solo los padres pueden modificar pedidos' });
    const { id } = req.params;
    const { items } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Debe proporcionar items para modificar' });
    }

    try {
      let order;
      if (supabase) {
        const { data, error } = await supabase
          .from('child_orders')
          .select('*')
          .eq('id', id)
          .eq('parent_id', req.user.id)
          .in('status', ['pending', 'approved'])
          .single();
        if (error || !data) return res.status(404).json({ error: 'Pedido no encontrado o ya procesado' });
        order = data;
      } else {
        order = await new Promise((resolve, reject) => {
          pool.query(
            `SELECT * FROM child_orders 
             WHERE id = $1 AND parent_id = $2 AND status IN ('pending', 'approved')`,
            [id, req.user.id],
            (err, result) => (err ? reject(err) : resolve(result.rows[0])),
          );
        });
        if (!order) return res.status(404).json({ error: 'Pedido no encontrado o ya procesado' });
      }

      const validatedOrder = await validateOrderItems(items);
      const validatedItems = validatedOrder.items.map((item) => ({
        product_id: item.product_id,
        product_name: item.product_name,
        quantity: item.quantity,
        price: item.price,
        subtotal: item.subtotal,
      }));
      const { subtotal, tax, total } = validatedOrder;

      if (supabase) {
        await supabase.from('child_order_items').delete().eq('order_id', id);
        const itemsToInsert = validatedItems.map((item) => ({ order_id: id, ...item }));
        await supabase.from('child_order_items').insert(itemsToInsert);

        const { data: updated, error: updateError } = await supabase
          .from('child_orders')
          .update({ subtotal, tax, total, updated_at: new Date().toISOString() })
          .eq('id', id)
          .select()
          .single();

        if (updateError) throw updateError;
        return res.json({ order: updated, items: validatedItems, message: 'Pedido modificado exitosamente' });
      }

      await new Promise((resolve, reject) => {
        pool.query('DELETE FROM child_order_items WHERE order_id = $1', [id], (err) => (err ? reject(err) : resolve()));
      });

      for (const item of validatedItems) {
        await new Promise((resolve, reject) => {
          pool.query(
            `INSERT INTO child_order_items (order_id, product_id, product_name, quantity, price, subtotal)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [id, item.product_id, item.product_name, item.quantity, item.price, item.subtotal],
            (err) => (err ? reject(err) : resolve()),
          );
        });
      }

      const updated = await new Promise((resolve, reject) => {
        pool.query(
          `UPDATE child_orders 
           SET subtotal = $1, tax = $2, total = $3, updated_at = NOW()
           WHERE id = $4 
           RETURNING *`,
          [subtotal, tax, total, id],
          (err, result) => (err ? reject(err) : resolve(result.rows[0])),
        );
      });

      return res.json({ order: updated, items: validatedItems, message: 'Pedido modificado exitosamente' });
    } catch (error) {
      console.error('Error modifying order:', error);
      return res.status(error.statusCode || 500).json({ error: error.message || 'Error al modificar pedido' });
    }
  });

  app.get('/api/parent/child-orders/history', authenticateToken, async (req, res) => {
    if (!isParentCapableUser(req.user)) return res.status(403).json({ error: 'Solo los padres pueden ver el historial' });

    const { child_id, status = 'paid', from_date, to_date } = req.query;
    const limit = parsePositiveInteger(req.query.limit, 50);
    const normalizedStatuses = buildOrderStatusAliases(status);

    try {
      if (supabase && isUuidLike(req.user.id)) {
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
          .eq('id_pagador', req.user.id)
          .order('fecha_creacion', { ascending: false })
          .limit(limit);

        if (child_id) query = query.eq('id_perfil', child_id);
        const { data, error } = await query;
        if (error) throw error;

        const orders = (data || [])
          .map((order) => {
            const items = Array.isArray(order.lineas_pedido)
              ? order.lineas_pedido.map((item) => {
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

            return normalizeHistoricOrderEntry({
              id: order.id,
              status: order.estado,
              created_at: order.fecha_creacion,
              child: { id: order.id_perfil, name: order.perfiles?.nombre_completo || null },
              items,
              items_count: items.length,
              total: items.reduce((sum, item) => sum + item.subtotal, 0),
            });
          })
          .filter((order) => normalizedStatuses.includes(order.status))
          .filter((order) => !from_date || order.created_at >= from_date)
          .filter((order) => !to_date || order.created_at <= to_date);

        return res.json({ orders });
      }

      const pedidosTableExists = await pool.query(
        `SELECT EXISTS (
           SELECT 1
           FROM information_schema.tables
           WHERE table_schema = 'public' AND table_name = 'pedidos'
         ) AS exists`,
      );

      if (pedidosTableExists.rows[0]?.exists) {
        const params = [String(req.user.id)];
        let paramIndex = 2;
        let query = `
          SELECT
            p.id,
            p.estado,
            p.fecha_creacion,
            p.id_perfil,
            p.id_pagador,
            perf.nombre_completo AS child_name,
            COALESCE(SUM(COALESCE(lp.precio_compra, 0)), 0) AS total,
            COUNT(lp.id) AS items_count,
            COALESCE(
              json_agg(
                json_build_object(
                  'id', lp.id,
                  'product_id', lp.id_producto_menu,
                  'product_name', lp.nombre_producto,
                  'quantity', 1,
                  'price', COALESCE(lp.precio_compra, 0),
                  'subtotal', COALESCE(lp.precio_compra, 0),
                  'notes', COALESCE(lp.notas, '')
                )
              ) FILTER (WHERE lp.id IS NOT NULL),
              '[]'::json
            ) AS items
          FROM pedidos p
          LEFT JOIN lineas_pedido lp ON lp.id_pedido = p.id
          LEFT JOIN perfiles perf ON perf.id = p.id_perfil
          WHERE p.id_pagador::text = $1
        `;

        if (child_id) {
          query += ` AND p.id_perfil::text = $${paramIndex}`;
          params.push(String(child_id));
          paramIndex += 1;
        }
        if (status) {
          query += ` AND LOWER(COALESCE(p.estado, '')) = ANY($${paramIndex})`;
          params.push(normalizedStatuses);
          paramIndex += 1;
        }
        if (from_date) {
          query += ` AND p.fecha_creacion >= $${paramIndex}`;
          params.push(from_date);
          paramIndex += 1;
        }
        if (to_date) {
          query += ` AND p.fecha_creacion <= $${paramIndex}`;
          params.push(to_date);
          paramIndex += 1;
        }

        query += `
          GROUP BY p.id, p.estado, p.fecha_creacion, p.id_perfil, p.id_pagador, perf.nombre_completo
          ORDER BY p.fecha_creacion DESC
          LIMIT $${paramIndex}
        `;
        params.push(limit);

        const result = await pool.query(query, params);
        const orders = (result.rows || []).map((row) => normalizeHistoricOrderEntry({
          id: row.id,
          status: row.estado,
          created_at: row.fecha_creacion,
          child: { id: row.id_perfil, name: row.child_name || null },
          total: row.total,
          items_count: row.items_count,
          items: Array.isArray(row.items) ? row.items : [],
        }));

        return res.json({ orders });
      }

      let query = `SELECT co.*, u.id as child_id, u.nombre as child_name, u.email as child_email 
                   FROM child_orders co 
                   LEFT JOIN users u ON co.child_id = u.id 
                   WHERE co.parent_id = $1`;
      const params = [req.user.id];
      let paramIndex = 2;

      if (child_id) {
        query += ` AND co.child_id = $${paramIndex}`;
        params.push(child_id);
        paramIndex += 1;
      }
      if (status) {
        query += ` AND LOWER(COALESCE(co.status, '')) = ANY($${paramIndex})`;
        params.push(normalizedStatuses);
        paramIndex += 1;
      }
      if (from_date) {
        query += ` AND co.created_at >= $${paramIndex}`;
        params.push(from_date);
        paramIndex += 1;
      }
      if (to_date) {
        query += ` AND co.created_at <= $${paramIndex}`;
        params.push(to_date);
        paramIndex += 1;
      }

      query += ` ORDER BY co.created_at DESC LIMIT $${paramIndex}`;
      params.push(limit);

      const orders = await new Promise((resolve, reject) => {
        pool.query(query, params, (err, result) => (err ? reject(err) : resolve(result.rows)));
      });

      const ordersWithItems = await Promise.all(orders.map(async (order) => {
        const items = await new Promise((resolve, reject) => {
          pool.query('SELECT * FROM child_order_items WHERE order_id = $1', [order.id], (err, result) => (err ? reject(err) : resolve(result.rows)));
        });

        return normalizeHistoricOrderEntry({
          ...order,
          child: { id: order.child_id, name: order.child_name, email: order.child_email },
          items: items || [],
        });
      }));

      return res.json({ orders: ordersWithItems });
    } catch (error) {
      console.error('Error fetching order history:', error);
      return res.status(500).json({ error: 'Error al obtener historial' });
    }
  });
}
