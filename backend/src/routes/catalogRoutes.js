// Rutas del catalogo y menu: lectura publica y gestion por administradores.
export function registerCatalogRoutes(app, deps) {
  const {
    supabase,
    autenticarToken,
    requireAdmin,
    normalizarPayloadProductoEntrante,
    normalizarPayloadParcialProductoEntrante,
    transformarProducto,
  } = deps;

  function requireSupabase(res) {
    return res.status(503).json({ error: 'Supabase no esta configurado en el backend' });
  }

  app.get('/api/products', autenticarToken, requireAdmin, async (req, res) => {
    // Version de administracion: muestra todos los productos, incluso los inactivos.
    if (!supabase) return requireSupabase(res);

    try {
      const { data, error } = await supabase.from('productos_menu').select('*').order('nombre');
      if (error) throw error;

      const products = (data || [])
        .map(transformarProducto)
        .sort((a, b) => {
          const categoryCompare = String(a.category || '').localeCompare(String(b.category || ''), 'es');
          if (categoryCompare !== 0) return categoryCompare;
          return String(a.name || '').localeCompare(String(b.name || ''), 'es');
        });

      return res.json({ data: products });
    } catch (error) {
      console.error('Error al obtener productos:', error);
      return res.status(500).json({ error: 'Error al obtener productos' });
    }
  });

  app.get('/api/menu', async (req, res) => {
    // Version publica del menu: solo productos activos.
    if (!supabase) return requireSupabase(res);

    try {
      const { data, error } = await supabase
        .from('productos_menu')
        .select('*')
        .eq('activo', true)
        .order('nombre');

      if (error) throw error;

      const products = (data || [])
        .map(transformarProducto)
        .sort((a, b) => {
          const categoryCompare = String(a.category || '').localeCompare(String(b.category || ''), 'es');
          if (categoryCompare !== 0) return categoryCompare;
          return String(a.name || '').localeCompare(String(b.name || ''), 'es');
        });

      return res.json({ data: products });
    } catch (error) {
      console.error('Error al obtener menú:', error);
      return res.status(500).json({ error: 'Error al obtener menú' });
    }
  });

  app.post('/api/products', autenticarToken, requireAdmin, async (req, res) => {
    // Crea un producto nuevo a partir del payload normalizado del frontend.
    if (!supabase) return requireSupabase(res);

    const product = normalizarPayloadProductoEntrante(req.body);
    if (!product.name || Number.isNaN(product.price) || !product.category) {
      return res.status(400).json({ error: 'Faltan campos requeridos: name, price, category' });
    }

    try {
      const supabaseProduct = {
        nombre: product.name,
        precio: product.price,
        activo: product.active,
        alergenos: product.allergens,
      };

      const { data, error } = await supabase.from('productos_menu').insert([supabaseProduct]).select();
      if (error) throw error;

      return res.status(201).json({
        data: transformarProducto(data[0]),
        message: 'Producto creado correctamente',
      });
    } catch (error) {
      console.error('Error al crear producto:', error);
      return res.status(500).json({
        error: 'No se pudo persistir el producto en Supabase',
        details: error?.message || String(error),
      });
    }
  });

  app.put('/api/products/:id', autenticarToken, requireAdmin, async (req, res) => {
    // Actualiza solo los campos permitidos por el esquema actual de Supabase.
    if (!supabase) return requireSupabase(res);

    const id = String(req.params.id || '').trim();
    const cambios = normalizarPayloadParcialProductoEntrante(req.body);

    if (!id) return res.status(400).json({ error: 'ID de producto requerido' });
    if (Object.keys(cambios).length === 0) return res.status(400).json({ error: 'No se enviaron campos para actualizar' });

    try {
      const supabaseUpdateMap = {
        name: 'nombre',
        price: 'precio',
        active: 'activo',
        allergens: 'alergenos',
      };

      const supabaseUpdate = {};
      Object.entries(cambios).forEach(([key, value]) => {
        const mappedKey = supabaseUpdateMap[key];
        if (!mappedKey) return;
        supabaseUpdate[mappedKey] = value;
      });

      const unsupportedKeys = Object.keys(cambios).filter((key) => !Object.prototype.hasOwnProperty.call(supabaseUpdateMap, key));
      if (unsupportedKeys.length > 0) {
        return res.status(400).json({
          error: `Los campos solicitados no existen en el esquema actual de Supabase: ${unsupportedKeys.join(', ')}`,
        });
      }

      const { data, error } = await supabase.from('productos_menu').update(supabaseUpdate).eq('id', id).select();
      if (error) throw error;
      if (!data || data.length === 0) return res.status(404).json({ error: 'Producto no encontrado' });

      return res.json({
        data: transformarProducto(data[0]),
        message: 'Producto actualizado correctamente',
      });
    } catch (error) {
      console.error('Error al actualizar producto:', error);
      return res.status(500).json({
        error: 'No se pudo persistir la actualización en Supabase',
        details: error?.message || String(error),
      });
    }
  });

  app.delete('/api/products/:id', autenticarToken, requireAdmin, async (req, res) => {
    if (!supabase) return requireSupabase(res);

    const id = String(req.params.id || '').trim();
    const isPermanent = req.query.permanent === 'true';

    if (!id) return res.status(400).json({ error: 'ID de producto requerido' });

    try {
      if (isPermanent) {
        const { data, error } = await supabase.from('productos_menu').delete().eq('id', id).select();
        if (error) throw error;
        if (!data || data.length === 0) return res.status(404).json({ error: 'Producto no encontrado' });
        return res.json({ data: transformarProducto(data[0]), message: 'Producto eliminado permanentemente' });
      }

      const { data, error } = await supabase.from('productos_menu').update({ activo: false }).eq('id', id).select();
      if (error) throw error;
      if (!data || data.length === 0) return res.status(404).json({ error: 'Producto no encontrado' });
      return res.json({ data: transformarProducto(data[0]), message: 'Producto desactivado correctamente' });
    } catch (error) {
      console.error('Error al eliminar/desactivar producto:', error);
      return res.status(500).json({
        error: 'No se pudo persistir la eliminación en Supabase',
        details: error?.message || String(error),
      });
    }
  });
}
