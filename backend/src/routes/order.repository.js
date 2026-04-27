const ORDER_SELECT = `
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
`;

export function crearOrderRepository({ supabase }) {
  return {
    crearPedidoPagado(profileId, metodoPago) {
      return supabase
        .from('pedidos')
        .insert({
          id_perfil: profileId,
          id_pagador: profileId,
          estado: 'PAGADO',
          id_pasarela_pago: metodoPago,
        })
        .select()
        .single();
    },

    insertarLineasPedido(items) {
      return supabase.from('lineas_pedido').insert(items);
    },

    listarPedidosDePerfil(profileId, limit) {
      return supabase
        .from('pedidos')
        .select(ORDER_SELECT)
        .or(`id_perfil.eq.${profileId},id_pagador.eq.${profileId}`)
        .order('fecha_creacion', { ascending: false })
        .limit(limit);
    },

    obtenerPedidoPorId(idPedido, profileId, { includeAllProfiles = false } = {}) {
      let query = supabase
        .from('pedidos')
        .select(ORDER_SELECT)
        .eq('id', idPedido);

      if (!includeAllProfiles) {
        query = query.or(`id_perfil.eq.${profileId},id_pagador.eq.${profileId}`);
      }

      return query.single();
    },
  };
}
