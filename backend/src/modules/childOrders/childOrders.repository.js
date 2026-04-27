const PEDIDO_SELECT = `
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
`;

const HISTORIAL_PEDIDO_SELECT = `
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
`;

export function crearChildOrdersRepository({ supabase }) {
  return {
    listarVinculosActivosDeHijo(childId) {
      return supabase
        .from('parent_child_links')
        .select('id, parent_id, spending_limit')
        .eq('child_id', childId)
        .eq('status', 'active');
    },

    crearPedidoInfantil(order) {
      return supabase.from('child_orders').insert(order).select().single();
    },

    insertarItemsPedidoInfantil(items) {
      return supabase.from('child_order_items').insert(items);
    },

    listarPedidosHistoricosDePerfil(profileId) {
      return supabase
        .from('pedidos')
        .select(PEDIDO_SELECT)
        .eq('id_perfil', profileId)
        .order('fecha_creacion', { ascending: false });
    },

    obtenerPedidoHistoricoDePerfil(orderId, profileId) {
      return supabase
        .from('pedidos')
        .select(PEDIDO_SELECT)
        .eq('id', orderId)
        .eq('id_perfil', profileId)
        .single();
    },

    listarPedidosInfantilesDePadre(parentId, { status, childId, limit, offset }) {
      let query = supabase
        .from('child_orders')
        .select('*, child:child_id(id, nombre, email)')
        .eq('parent_id', parentId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (status) query = query.eq('status', status);
      if (childId) query = query.eq('child_id', childId);

      return query;
    },

    contarItemsPedidoInfantil(orderId) {
      return supabase
        .from('child_order_items')
        .select('*', { count: 'exact', head: true })
        .eq('order_id', orderId);
    },

    obtenerDetallePedidoPadre(orderId, parentId) {
      return supabase
        .from('child_orders')
        .select('*, child:child_id(id, nombre, email), link:link_id(spending_limit)')
        .eq('id', orderId)
        .eq('parent_id', parentId)
        .single();
    },

    listarItemsPedidoInfantil(orderId) {
      return supabase.from('child_order_items').select('*').eq('order_id', orderId);
    },

    obtenerPedidoPendientePadre(orderId, parentId) {
      return supabase
        .from('child_orders')
        .select('*')
        .eq('id', orderId)
        .eq('parent_id', parentId)
        .eq('status', 'pending')
        .single();
    },

    obtenerPedidoAprobadoPadre(orderId, parentId) {
      return supabase
        .from('child_orders')
        .select('*')
        .eq('id', orderId)
        .eq('parent_id', parentId)
        .eq('status', 'approved')
        .single();
    },

    obtenerPedidoModificablePadre(orderId, parentId) {
      return supabase
        .from('child_orders')
        .select('*')
        .eq('id', orderId)
        .eq('parent_id', parentId)
        .in('status', ['pending', 'approved'])
        .single();
    },

    actualizarPedidoInfantil(orderId, values) {
      return supabase.from('child_orders').update(values).eq('id', orderId).select().single();
    },

    borrarItemsPedidoInfantil(orderId) {
      return supabase.from('child_order_items').delete().eq('order_id', orderId);
    },

    listarHistorialPagadoPorPerfil(profileId, { childId, limit }) {
      let query = supabase
        .from('pedidos')
        .select(HISTORIAL_PEDIDO_SELECT)
        .eq('id_pagador', profileId)
        .order('fecha_creacion', { ascending: false })
        .limit(limit);

      if (childId) query = query.eq('id_perfil', childId);

      return query;
    },
  };
}
