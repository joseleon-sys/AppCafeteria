export function crearProductRepository({ supabase }) {
  return {
    listarProductos() {
      return supabase.from('productos_menu').select('*').order('nombre');
    },

    listarProductosActivos() {
      return supabase
        .from('productos_menu')
        .select('*')
        .eq('activo', true)
        .order('nombre');
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
