export function crearFamilyRepository({ supabase }) {
  return {
    obtenerUsuarioParaToken(userId) {
      return supabase
        .from('users')
        .select('id, parent_token, role, is_adult')
        .eq('id', userId)
        .single();
    },

    actualizarTokenPadre(userId, parentToken) {
      return supabase.from('users').update({ parent_token: parentToken }).eq('id', userId);
    },

    obtenerHijoParaVinculacion(childId) {
      return supabase
        .from('users')
        .select('id, nombre, alias, role, is_adult, email')
        .eq('id', childId)
        .single();
    },

    obtenerPadrePorToken(parentToken) {
      return supabase
        .from('users')
        .select('id, nombre, email, role, is_adult')
        .eq('parent_token', parentToken)
        .single();
    },

    crearSolicitudVinculacion(parentId, childId) {
      return supabase
        .from('parent_child_links')
        .insert([{ parent_id: parentId, child_id: childId, status: 'pending' }])
        .select()
        .single();
    },

    obtenerUsuarioRol(userId) {
      return supabase.from('users').select('id, role, is_adult').eq('id', userId).single();
    },

    listarSolicitudesPendientes(parentId) {
      return supabase
        .from('parent_child_links')
        .select(`
          id,
          status,
          requested_at,
          child:child_id (
            id,
            nombre,
            email
          )
        `)
        .eq('parent_id', parentId)
        .eq('status', 'pending')
        .order('requested_at', { ascending: false });
    },

    obtenerSolicitudPendiente(linkId, parentId, select = '*') {
      return supabase
        .from('parent_child_links')
        .select(select)
        .eq('id', linkId)
        .eq('parent_id', parentId)
        .eq('status', 'pending')
        .single();
    },

    aprobarSolicitud(linkId, spendingLimit) {
      return supabase
        .from('parent_child_links')
        .update({ status: 'active', approved_at: new Date().toISOString(), spending_limit: spendingLimit })
        .eq('id', linkId)
        .select()
        .single();
    },

    marcarUsuarioComoPadre(parentId) {
      return supabase.from('users').update({ role: 'parent' }).eq('id', parentId).eq('is_adult', true).eq('role', 'customer');
    },

    rechazarSolicitud(linkId, reason) {
      return supabase
        .from('parent_child_links')
        .update({ status: 'rejected', notes: reason || 'Rechazado por el padre' })
        .eq('id', linkId);
    },

    listarPadresDeHijo(childId) {
      return supabase
        .from('parent_child_links')
        .select(`
          id,
          status,
          spending_limit,
          approved_at,
          parent:parent_id (
            id,
            nombre,
            email
          )
        `)
        .eq('child_id', childId)
        .in('status', ['active', 'pending']);
    },

    listarHijosDePadre(parentId) {
      return supabase
        .from('parent_child_links')
        .select(`
          id,
          status,
          spending_limit,
          approved_at,
          child:child_id (
            id,
            nombre,
            email
          )
        `)
        .eq('parent_id', parentId)
        .eq('status', 'active');
    },
  };
}
