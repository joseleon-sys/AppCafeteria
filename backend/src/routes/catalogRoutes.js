export function registerCatalogRoutes(app, deps) {
  const {
    supabase,
    pool,
    productStore,
    authenticateToken,
    requireAdmin,
    normalizeIncomingProductPayload,
    normalizePartialIncomingProductPayload,
    normalizeProductFromPg,
    transformProducto,
  } = deps;

  app.get('/api/products', authenticateToken, requireAdmin, async (req, res) => {
    try {
      try {
        const result = await pool.query('SELECT * FROM productos_menu ORDER BY category, nombre');
        const products = result.rows.map(normalizeProductFromPg);
        console.log(`Productos admin desde PostgreSQL local: ${products.length}`);
        return res.json({ data: products });
      } catch {
        console.log('PostgreSQL no disponible, intentando Supabase...');
      }

      if (!supabase) return res.json({ data: productStore.list() });

      const { data, error } = await supabase.from('productos_menu').select('*');
      if (error) throw error;
      return res.json({ data: (data || []).map(transformProducto) });
    } catch (error) {
      console.error('Error al obtener productos:', error);
      return res.json({ data: productStore.list() });
    }
  });

  app.get('/api/menu', async (req, res) => {
    try {
      try {
        const result = await pool.query(
          'SELECT * FROM productos_menu WHERE activo = true AND sanitary_approved = true ORDER BY category, nombre',
        );
        const products = result.rows.map(normalizeProductFromPg);
        console.log(`Menu desde PostgreSQL local: ${products.length}`);
        return res.json({ data: products });
      } catch {
        console.log('PostgreSQL no disponible, intentando Supabase...');
      }

      if (!supabase) return res.json({ data: productStore.list().filter((product) => product.active) });

      const { data, error } = await supabase.from('productos_menu').select('*').eq('activo', true);
      if (error) throw error;
      return res.json({ data: (data || []).map(transformProducto) });
    } catch (error) {
      console.error('Error al obtener menú:', error);
      return res.json({ data: productStore.list().filter((product) => product.active) });
    }
  });

  app.post('/api/products', authenticateToken, requireAdmin, async (req, res) => {
    const product = normalizeIncomingProductPayload(req.body);
    if (!product.name || Number.isNaN(product.price) || !product.category) {
      return res.status(400).json({ error: 'Faltan campos requeridos: name, price, category' });
    }

    try {
      const localResult = await pool.query(
        `INSERT INTO productos_menu (
          nombre, description, precio, category, activo,
          image_url, badges, alergenos, options,
          ingredients, contains_info, conservation, shelf_life_hours,
          calories_kcal, nutrition_table, sanitary_approved, sanitary_notes, approved_at
        ) VALUES (
          $1, $2, $3, $4, $5,
          $6, $7::jsonb, $8::jsonb, $9::jsonb,
          $10::jsonb, $11, $12, $13,
          $14, $15::jsonb, $16, $17, $18
        ) RETURNING *`,
        [
          product.name,
          product.description,
          product.price,
          product.category,
          product.active,
          product.image_url,
          JSON.stringify(product.badges),
          JSON.stringify(product.allergens),
          JSON.stringify(product.options),
          JSON.stringify(product.ingredients),
          product.contains_info,
          product.conservation,
          product.shelf_life_hours,
          product.calories_kcal,
          JSON.stringify(product.nutrition_table),
          product.sanitary_approved,
          product.sanitary_notes,
          product.approved_at,
        ],
      );

      return res.status(201).json({
        data: normalizeProductFromPg(localResult.rows[0]),
        message: 'Producto creado correctamente (PostgreSQL local)',
      });
    } catch (localError) {
      console.warn('No se pudo guardar en PostgreSQL local:', localError?.message || String(localError));
    }

    try {
      if (supabase) {
        const supabaseProduct = {
          nombre: product.name,
          description: product.description,
          precio: product.price,
          category: product.category,
          activo: product.active,
          image_url: product.image_url,
          badges: product.badges,
          alergenos: product.allergens,
          options: product.options,
        };

        const { data, error } = await supabase.from('productos_menu').insert([supabaseProduct]).select();
        if (error) throw error;

        return res.status(201).json({
          data: transformProducto(data[0]),
          message: 'Producto creado correctamente (Supabase)',
        });
      }
    } catch (supabaseError) {
      console.warn('No se pudo guardar en Supabase:', supabaseError?.message || String(supabaseError));
      if (supabase) {
        return res.status(503).json({
          error: 'No se pudo persistir el producto en almacenamiento permanente',
          details: supabaseError?.message || String(supabaseError),
        });
      }
    }

    const productMock = { id: productStore.nextId(), ...product };
    productStore.add(productMock);
    return res.status(201).json({ data: productMock, message: 'Producto creado correctamente (modo offline)' });
  });

  app.put('/api/products/:id', authenticateToken, requireAdmin, async (req, res) => {
    const id = String(req.params.id || '').trim();
    const updates = normalizePartialIncomingProductPayload(req.body);

    if (!id) return res.status(400).json({ error: 'ID de producto requerido' });
    if (Object.keys(updates).length === 0) return res.status(400).json({ error: 'No se enviaron campos para actualizar' });

    try {
      const fieldMap = {
        name: 'nombre',
        description: 'description',
        price: 'precio',
        category: 'category',
        active: 'activo',
        image_url: 'image_url',
        badges: 'badges',
        allergens: 'alergenos',
        options: 'options',
        ingredients: 'ingredients',
        contains_info: 'contains_info',
        conservation: 'conservation',
        shelf_life_hours: 'shelf_life_hours',
        calories_kcal: 'calories_kcal',
        nutrition_table: 'nutrition_table',
        sanitary_approved: 'sanitary_approved',
        sanitary_notes: 'sanitary_notes',
        approved_at: 'approved_at',
      };

      const jsonColumns = new Set(['badges', 'allergens', 'options', 'ingredients', 'nutrition_table']);
      const setParts = [];
      const values = [];

      Object.entries(updates).forEach(([key, value]) => {
        if (!fieldMap[key]) return;
        const column = fieldMap[key];
        const isJson = jsonColumns.has(key);
        setParts.push(`${column} = $${values.length + 1}${isJson ? '::jsonb' : ''}`);
        values.push(isJson ? JSON.stringify(value) : value);
      });

      if (setParts.length > 0) {
        values.push(id);
        const localResult = await pool.query(
          `UPDATE productos_menu SET ${setParts.join(', ')} WHERE id = $${values.length} RETURNING *`,
          values,
        );

        if (localResult.rows.length > 0) {
          return res.json({
            data: normalizeProductFromPg(localResult.rows[0]),
            message: 'Producto actualizado correctamente (PostgreSQL local)',
          });
        }
      }
    } catch (localError) {
      console.warn('No se pudo actualizar en PostgreSQL local:', localError?.message || String(localError));
    }

    try {
      if (supabase) {
        const supabaseUpdateMap = {
          name: 'nombre',
          description: 'description',
          price: 'precio',
          category: 'category',
          active: 'activo',
          image_url: 'image_url',
          badges: 'badges',
          allergens: 'alergenos',
          options: 'options',
        };

        const supabaseUpdate = {};
        Object.entries(updates).forEach(([key, value]) => {
          const mappedKey = supabaseUpdateMap[key];
          if (!mappedKey) return;
          supabaseUpdate[mappedKey] = value;
        });

        const unsupportedKeys = Object.keys(updates).filter((key) => !Object.prototype.hasOwnProperty.call(supabaseUpdateMap, key));

        if (Object.keys(supabaseUpdate).length > 0) {
          const { data, error } = await supabase.from('productos_menu').update(supabaseUpdate).eq('id', id).select();
          if (error) throw error;
          if (data && data.length > 0) {
            return res.json({
              data: transformProducto(data[0]),
              message: unsupportedKeys.length
                ? `Producto actualizado en Supabase. Campos no soportados ignorados: ${unsupportedKeys.join(', ')}`
                : 'Producto actualizado correctamente (Supabase)',
            });
          }
        }

        if (unsupportedKeys.length) {
          return res.status(400).json({
            error: `Los campos solicitados no existen en el esquema actual de Supabase: ${unsupportedKeys.join(', ')}`,
          });
        }
      }
    } catch (supabaseError) {
      console.warn('No se pudo actualizar en Supabase:', supabaseError?.message || String(supabaseError));
      if (supabase) {
        return res.status(503).json({
          error: 'No se pudo persistir la actualización en almacenamiento permanente',
          details: supabaseError?.message || String(supabaseError),
        });
      }
    }

    const productIndex = productStore.findIndexById(id);
    if (productIndex === -1) return res.status(404).json({ error: 'Producto no encontrado' });
    const updatedProduct = productStore.updateAt(productIndex, (existing) => ({ ...existing, ...updates }));
    return res.json({ data: updatedProduct, message: 'Producto actualizado correctamente (modo offline)' });
  });

  app.delete('/api/products/:id', authenticateToken, requireAdmin, async (req, res) => {
    const id = String(req.params.id || '').trim();
    const isPermanent = req.query.permanent === 'true';

    if (!id) return res.status(400).json({ error: 'ID de producto requerido' });

    try {
      if (isPermanent) {
        const localDelete = await pool.query('DELETE FROM productos_menu WHERE id = $1 RETURNING *', [id]);
        if (localDelete.rows.length > 0) {
          return res.json({
            data: normalizeProductFromPg(localDelete.rows[0]),
            message: 'Producto eliminado permanentemente (PostgreSQL local)',
          });
        }
      } else {
        const localDeactivate = await pool.query('UPDATE productos_menu SET activo = false WHERE id = $1 RETURNING *', [id]);
        if (localDeactivate.rows.length > 0) {
          return res.json({
            data: normalizeProductFromPg(localDeactivate.rows[0]),
            message: 'Producto desactivado correctamente (PostgreSQL local)',
          });
        }
      }
    } catch (localError) {
      console.warn('No se pudo eliminar/desactivar en PostgreSQL local:', localError?.message || String(localError));
    }

    try {
      if (supabase) {
        if (isPermanent) {
          const { data, error } = await supabase.from('productos_menu').delete().eq('id', id).select();
          if (error) throw error;
          if (data && data.length > 0) {
            return res.json({ data: transformProducto(data[0]), message: 'Producto eliminado permanentemente (Supabase)' });
          }
        } else {
          const { data, error } = await supabase.from('productos_menu').update({ activo: false }).eq('id', id).select();
          if (error) throw error;
          if (data && data.length > 0) {
            return res.json({ data: transformProducto(data[0]), message: 'Producto desactivado correctamente (Supabase)' });
          }
        }
      }
    } catch (supabaseError) {
      console.warn('No se pudo eliminar/desactivar en Supabase:', supabaseError?.message || String(supabaseError));
      if (supabase) {
        return res.status(503).json({
          error: 'No se pudo persistir la eliminación en almacenamiento permanente',
          details: supabaseError?.message || String(supabaseError),
        });
      }
    }

    const productIndex = productStore.findIndexById(id);
    if (productIndex === -1) return res.status(404).json({ error: 'Producto no encontrado' });

    if (isPermanent) {
      const [deletedProduct] = productStore.removeAt(productIndex);
      return res.json({ data: deletedProduct, message: 'Producto eliminado permanentemente (modo offline)' });
    }

    const updatedProduct = productStore.updateAt(productIndex, (existing) => ({ ...existing, active: false }));
    return res.json({ data: updatedProduct, message: 'Producto desactivado correctamente (modo offline)' });
  });
}
