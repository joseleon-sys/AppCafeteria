import { construirUsuarioPublico } from '../utils/utilidadesAuth.js';
import { crearError, requireSupabase } from './auth.errors.js';

export function crearAuthSessionFlows({ deps, repository, tokenService }) {
  const {
    supabase,
    normalizarCodigoEspecial,
    normalizarIdsFavoritos,
    resolverIdPerfilParaUsuario,
  } = deps;

  function usuarioPublico(user, extraData = {}) {
    return construirUsuarioPublico(user, extraData);
  }

  return {
    async refrescarSesion(body, req) {
      requireSupabase(supabase);

      const refreshToken = String(body?.refreshToken || '').trim();
      if (!refreshToken) throw crearError(400, 'Refresh token requerido');

      const tokenHash = tokenService.hashearRefreshToken(refreshToken);
      const { data: storedToken, error: tokenError } = await repository.obtenerRefreshTokenActivo(tokenHash);

      if (tokenError) throw tokenError;
      if (!storedToken) throw crearError(401, 'Refresh token inválido');

      const expiresAt = new Date(storedToken.expires_at);
      if (Number.isNaN(expiresAt.getTime()) || expiresAt <= new Date()) {
        await repository.revocarRefreshToken(tokenHash);
        throw crearError(401, 'Refresh token expirado');
      }

      const { data: user, error: userError } = await repository.buscarUsuarioPorId(storedToken.user_id);
      if (userError || !user || user.active === false) throw crearError(401, 'Usuario no disponible');

      const profileId = await resolverIdPerfilParaUsuario({
        id: user.id,
        email: user.email,
      });

      await repository.revocarRefreshToken(tokenHash);
      const tokens = await tokenService.emitirTokens({
        user,
        profileId,
        repository,
        req,
        reemplazaTokenHash: tokenHash,
      });

      return {
        ...tokens,
        user: usuarioPublico(user, {
          profileId,
          specialCode: normalizarCodigoEspecial(user.special_code),
          favorites: normalizarIdsFavoritos(user.favoritos),
        }),
      };
    },

    async cerrarSesion(body) {
      requireSupabase(supabase);

      const refreshToken = String(body?.refreshToken || '').trim();
      if (!refreshToken) return { message: 'Sesión cerrada' };

      await repository.revocarRefreshToken(tokenService.hashearRefreshToken(refreshToken));
      return { message: 'Sesión cerrada' };
    },
  };
}
