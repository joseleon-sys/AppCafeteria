export function crearProductRepository({ supabase }) {
  function faltaTablaProductosMenu(error) {
    const message = String(error?.message || '').toLowerCase();
    return error?.code === '42P01' || message.includes('productos_menu');
  }

  async function consultarProductosMenu(buildCanonicalQuery, buildLegacyQuery) {
    const response = await buildCanonicalQuery(supabase.from('productos_menu'));
    if (!response.error || !faltaTablaProductosMenu(response.error)) return response;

    return buildLegacyQuery(supabase.from('products'));
  }

  return {
    listarProductos() {
      return consultarProductosMenu(
        (query) => query.select('*').order('nombre'),
        (query) => query.select('*').order('name'),
      );
    },

    listarProductosActivos() {
      return consultarProductosMenu(
        (query) => query.select('*').eq('activo', true).order('nombre'),
        (query) => query.select('*').eq('active', true).order('name'),
      );
    },

    crearProducto(payload) {
      return supabase.from('productos_menu').insert([payload]).select();
    },

    actualizarProducto(id, payload) {
      return supabase.from('productos_menu').update(payload).eq('id', id).select();
    },

    eliminarProducto(id) {
      return supabase.from('productos_menu').delete().eq('id', id).select();
    },
  };
}
