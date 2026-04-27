export function crearAuthRepository({
  supabase,
  registrarTokenDispositivo,
  desactivarTokenDispositivo,
  listarNotificacionesUsuario,
  marcarNotificacionComoLeida,
}) {
  return {
    crearUsuario(payload) {
      return supabase
        .from('users')
        .insert([payload])
        .select()
        .single();
    },

    buscarUsuarioActivoPorEmail(email) {
      return supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .eq('active', true)
        .single();
    },

    buscarUsuarioPorId(idUsuario) {
      return supabase.from('users').select('*').eq('id', idUsuario).single();
    },

    actualizarUltimoLogin(idUsuario) {
      return supabase.from('users').update({ last_login: new Date().toISOString() }).eq('id', idUsuario);
    },

    obtenerFavoritos(idUsuario) {
      return supabase.from('users').select('favoritos').eq('id', idUsuario).single();
    },

    actualizarFavoritos(idUsuario, idsFavoritos) {
      return supabase
        .from('users')
        .update({ favoritos: idsFavoritos })
        .eq('id', idUsuario)
        .select('id, favoritos')
        .single();
    },

    obtenerDatosPerfil(idUsuario) {
      return supabase
        .from('users')
        .select('id, is_adult, special_code')
        .eq('id', idUsuario)
        .single();
    },

    obtenerDatosPerfilSinCodigoEspecial(idUsuario) {
      return supabase.from('users').select('id, is_adult').eq('id', idUsuario).single();
    },

    actualizarPerfil(idUsuario, payload, selectFields) {
      return supabase
        .from('users')
        .update(payload)
        .eq('id', idUsuario)
        .select(selectFields)
        .single();
    },

    guardarRefreshToken({
      idUsuario,
      tokenHash,
      expiresAt,
      userAgent = null,
      ipAddress = null,
      reemplazaTokenHash = null,
    }) {
      return supabase
        .from('auth_refresh_tokens')
        .insert([{
          user_id: idUsuario,
          token_hash: tokenHash,
          expires_at: expiresAt,
          user_agent: userAgent,
          ip_address: ipAddress,
          replaced_token_hash: reemplazaTokenHash,
        }])
        .select('id, user_id, expires_at')
        .single();
    },

    obtenerRefreshTokenActivo(tokenHash) {
      return supabase
        .from('auth_refresh_tokens')
        .select('id, user_id, token_hash, expires_at, revoked_at')
        .eq('token_hash', tokenHash)
        .is('revoked_at', null)
        .maybeSingle();
    },

    revocarRefreshToken(tokenHash) {
      return supabase
        .from('auth_refresh_tokens')
        .update({ revoked_at: new Date().toISOString() })
        .eq('token_hash', tokenHash)
        .is('revoked_at', null);
    },

    registrarDispositivo({ idUsuario, token, platform, deviceName, appVersion }) {
      return registrarTokenDispositivo(supabase, { idUsuario, token, platform, deviceName, appVersion });
    },

    desactivarDispositivo({ idUsuario, token }) {
      return desactivarTokenDispositivo(supabase, { idUsuario, token });
    },

    listarNotificaciones(idUsuario, limit) {
      return listarNotificacionesUsuario(supabase, idUsuario, limit);
    },

    marcarNotificacionLeida(idUsuario, idNotificacion) {
      return marcarNotificacionComoLeida(supabase, idUsuario, idNotificacion);
    },
  };
}
