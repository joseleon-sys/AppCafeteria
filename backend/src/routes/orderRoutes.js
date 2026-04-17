export function registerOrderRoutes(app, deps) {
  const {
    supabase,
    pool,
    stripe,
    developmentPaymentBypassEnabled,
    isLocalDatabaseUnavailable,
    authenticateToken,
    validateOrderItems,
    parsePositiveInteger,
    buildOrderStatusAliases,
    normalizeHistoricOrderEntry,
    isUuidLike,
  } = deps;
  const devBypassOrders = [];

  function createInMemoryPaidOrder(userId, validatedOrder, paymentMethod = 'dev-bypass') {
    const createdAt = new Date().toISOString();
    const orderId = `dev-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const items = validatedOrder.items.map((item, index) => ({
      id: `${orderId}-item-${index + 1}`,
      product_id: item.product_id,
      product_name: item.product_name,
      quantity: item.quantity,
      price: item.price,
      subtotal: item.subtotal,
      notes: item.notes || '',
    }));

    const order = {
      id: orderId,
      user_id: String(userId),
      status: 'paid',
      total: validatedOrder.total,
      payment_method: paymentMethod,
      amount_paid: validatedOrder.total,
      paid_at: createdAt,
      created_at: createdAt,
      items,
      items_count: items.length,
      is_dev_bypass: true,
    };

    devBypassOrders.unshift(order);
    return order;
  }

  function getDevBypassOrdersForUser(userId, status = null, limit = 50) {
    return devBypassOrders
      .filter((order) => String(order.user_id) === String(userId))
      .filter((order) => !status || buildOrderStatusAliases(status).includes(order.status))
      .slice(0, limit)
      .map((order) => normalizeHistoricOrderEntry(order));
  }

  async function createPaidOrderForUser(userId, validatedOrder, paymentMethod = 'dev-bypass') {
    try {
      if (!isUuidLike(userId)) {
        throw new Error('El esquema actual requiere identificadores UUID para guardar pedidos en la tabla pedidos');
      }

      const client = supabase || {
        from(tableName) {
          return {
            insert: async (payload) => {
              if (tableName === 'pedidos') {
                const result = await pool.query(
                  `INSERT INTO pedidos (id_perfil, id_pagador, estado, id_pasarela_pago)
                   VALUES ($1, $2, $3, $4)
                   RETURNING *`,
                  [payload.id_perfil, payload.id_pagador, payload.estado, payload.id_pasarela_pago],
                );
                return {
                  select() {
                    return {
                      single: async () => ({ data: result.rows[0], error: null }),
                    };
                  },
                };
              }

              if (tableName === 'lineas_pedido') {
                for (const item of payload) {
                  await pool.query(
                    `INSERT INTO lineas_pedido (
                      id_pedido, id_producto_menu, nombre_producto, precio_compra, notas, opciones_elegidas
                    ) VALUES ($1, $2, $3, $4, $5, $6::jsonb)`,
                    [
                      item.id_pedido,
                      item.id_producto_menu,
                      item.nombre_producto,
                      item.precio_compra,
                      item.notas,
                      JSON.stringify(item.opciones_elegidas || {}),
                    ],
                  );
                }
                return { error: null };
              }

              throw new Error(`Tabla no soportada en adaptador local: ${tableName}`);
            },
          };
        },
      };

      const { data: order, error: orderError } = await client
        .from('pedidos')
        .insert({
          id_perfil: userId,
          id_pagador: userId,
          estado: 'PAGADO',
          id_pasarela_pago: paymentMethod,
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

      const { error: itemsError } = await client.from('lineas_pedido').insert(itemsToInsert);
      if (itemsError) throw itemsError;

      return {
        ...order,
        status: 'paid',
      };
    } catch (error) {
      if (developmentPaymentBypassEnabled && isLocalDatabaseUnavailable?.(error)) {
        return createInMemoryPaidOrder(userId, validatedOrder, paymentMethod);
      }
      if (developmentPaymentBypassEnabled && /uuid/i.test(String(error?.message || ''))) {
        return createInMemoryPaidOrder(userId, validatedOrder, paymentMethod);
      }
      throw error;
    }
  }

  app.post('/api/orders', authenticateToken, async (req, res) => {
    const { items } = req.body || {};

    if (req.user.role === 'child') {
      return res.status(403).json({ error: 'Los perfiles de menor deben usar el flujo de pedidos con aprobacion parental' });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'El carrito esta vacio' });
    }

    try {
      const validatedOrder = await validateOrderItems(items, { userId: req.user.id });
      const order = await createPaidOrderForUser(req.user.id, validatedOrder, 'manual');

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

  app.post('/api/stripe/create-checkout-session', authenticateToken, async (req, res) => {
    try {
      const { items } = req.body || {};

      if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: 'El carrito está vacío' });
      }

      const validatedOrder = await validateOrderItems(items, { userId: req.user.id });

      if (developmentPaymentBypassEnabled) {
        const order = await createPaidOrderForUser(req.user.id, validatedOrder);
        return res.status(201).json({
          bypassed: true,
          order_id: order.id,
          status: order.status,
          total: validatedOrder.total,
          message: 'Pago omitido en modo desarrollo/pruebas. Pedido marcado como pagado.',
          redirect_url: `/pago-exitoso?dev_bypass=1&order_id=${encodeURIComponent(String(order.id))}`,
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

  app.get('/api/orders/my', authenticateToken, async (req, res) => {
    const { status } = req.query;
    const limit = parsePositiveInteger(req.query.limit, 50);
    const normalizedStatuses = buildOrderStatusAliases(status);

    if (req.user.role === 'child') {
      return res.status(403).json({ error: 'Los perfiles de menor deben consultar sus pedidos infantiles' });
    }

    try {
      if (developmentPaymentBypassEnabled && !isUuidLike(req.user.id)) {
        const devOrders = getDevBypassOrdersForUser(req.user.id, status, limit);
        if (devOrders.length > 0) {
          return res.json({ orders: devOrders });
        }
      }

      if (supabase && isUuidLike(req.user.id)) {
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
          .or(`id_perfil.eq.${req.user.id},id_pagador.eq.${req.user.id}`)
          .order('fecha_creacion', { ascending: false })
          .limit(limit);

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
              items,
              items_count: items.length,
              total: items.reduce((sum, item) => sum + item.subtotal, 0),
            });
          })
          .filter((order) => !status || normalizedStatuses.includes(order.status));

        return res.json({ orders });
      }

      try {
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
          WHERE (p.id_perfil::text = $1 OR p.id_pagador::text = $1)
        `;

        if (status) {
          query += ` AND LOWER(COALESCE(p.estado, '')) = ANY($${paramIndex})`;
          params.push(normalizedStatuses);
          paramIndex += 1;
        }

        query += `
          GROUP BY p.id, p.estado, p.fecha_creacion
          ORDER BY p.fecha_creacion DESC
          LIMIT $${paramIndex}
        `;
        params.push(limit);

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
      } catch (error) {
        if (developmentPaymentBypassEnabled && isLocalDatabaseUnavailable?.(error)) {
          return res.json({ orders: getDevBypassOrdersForUser(req.user.id, null, limit) });
        }
        throw error;
      }
    } catch (error) {
      console.error('Error al listar pedidos estandar:', error);
      return res.status(500).json({ error: 'Error al obtener pedidos' });
    }
  });

  app.get('/api/orders/:id', authenticateToken, async (req, res) => {
    const orderId = String(req.params.id || '').trim();

    if (!orderId) return res.status(400).json({ error: 'ID de pedido invalido' });
    if (req.user.role === 'child') {
      return res.status(403).json({ error: 'Los perfiles de menor deben consultar sus pedidos infantiles' });
    }

    try {
      if (developmentPaymentBypassEnabled && !isUuidLike(req.user.id) && String(orderId).startsWith('dev-')) {
        const devOrder = devBypassOrders.find((order) => String(order.id) === orderId && String(order.user_id) === String(req.user.id));
        if (devOrder) return res.json({ order: normalizeHistoricOrderEntry(devOrder) });
      }

      if (supabase && isUuidLike(req.user.id)) {
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
          .eq('id', orderId);

        if (req.user.role !== 'admin') {
          query = query.or(`id_perfil.eq.${req.user.id},id_pagador.eq.${req.user.id}`);
        }

        const { data: order, error } = await query.single();
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

      try {
        const params = [orderId];
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
          WHERE p.id::text = $1
        `;

        if (req.user.role !== 'admin') {
          params.push(String(req.user.id));
          query += ` AND (p.id_perfil::text = $2 OR p.id_pagador::text = $2)`;
        }

        query += `
          GROUP BY p.id, p.estado, p.fecha_creacion
          LIMIT 1
        `;

        const orderResult = await pool.query(query, params);
        const order = orderResult.rows[0];
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
      } catch (error) {
        if (developmentPaymentBypassEnabled && isLocalDatabaseUnavailable?.(error)) {
          const devOrder = devBypassOrders.find((order) => String(order.id) === orderId && String(order.user_id) === String(req.user.id));
          if (devOrder) return res.json({ order: normalizeHistoricOrderEntry(devOrder) });
        }
        throw error;
      }
    } catch (error) {
      console.error('Error al obtener detalle de pedido estandar:', error);
      return res.status(500).json({ error: 'Error al obtener detalle del pedido' });
    }
  });
}
