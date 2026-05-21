export function crearAdminRepository({ supabase }) {
  return {
    obtenerDatosMetricas() {
      return Promise.all([
        supabase.from('users').select('role, is_adult, created_at'),
        supabase.from('pedidos').select('estado, fecha_creacion'),
        supabase.from('fraud_prevention_log').select('severity, created_at'),
      ]);
    },

    listarFraudLogs() {
      return supabase
        .from('fraud_prevention_log')
        .select('id, user_id, action_type, severity, details, ip_address, user_agent, created_at')
        .order('created_at', { ascending: false })
        .limit(100);
    },

    listarUsuarios() {
      return supabase
        .from('users')
        .select('id, email, nombre, role, is_adult, created_at, active');
    },

    listarVinculosActivosPadres() {
      return supabase
        .from('parent_child_links')
        .select('parent_id')
        .eq('status', 'active');
    },

    actualizarBloqueoUsuario(id, bloqueado) {
      return supabase.from('users').update({ active: !bloqueado }).eq('id', id).select();
    },

    actualizarUsuario(id, updateData) {
      return supabase.from('users').update(updateData).eq('id', id).select();
    },

    eliminarUsuario(id) {
      return supabase.from('users').delete().eq('id', id);
    },

    listarColaPedidos() {
      return supabase
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
    },

    obtenerAjuste(key) {
      return supabase
        .from('app_settings')
        .select('key, value, updated_at')
        .eq('key', key)
        .maybeSingle();
    },

    guardarAjuste(key, value) {
      return supabase
        .from('app_settings')
        .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' })
        .select('key, value, updated_at')
        .single();
    },
  };
}
