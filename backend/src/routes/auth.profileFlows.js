import { construirUsuarioPublico } from '../utils/utilidadesAuth.js';
import { crearError, requireSupabase, tieneErrorColumna } from './auth.errors.js';
import { validarPerfilUsuario } from './auth.validators.js';

export function crearAuthProfileFlows({ deps, repository }) {
  const {
    supabase,
    normalizarCodigoEspecial,
    normalizarIdsFavoritos,
    normalizarAlias,
    esAliasValido,
    esCodigoEspecialValido,
  } = deps;

  function usuarioPublico(user, extraData = {}) {
    return construirUsuarioPublico(user, extraData);
  }

  return {
    async obtenerFavoritos(authUser) {
      requireSupabase(supabase);

      const { data, error } = await repository.obtenerFavoritos(authUser.id);
      if (error) {
        if (tieneErrorColumna(error, 'favoritos')) {
          throw crearError(400, 'Falta la columna favoritos en Supabase. Ejecuta el SQL actualizado.');
        }
        throw error;
      }

      return { favorites: normalizarIdsFavoritos(data?.favoritos) };
    },

    async actualizarFavoritos(body, authUser) {
      requireSupabase(supabase);

      const idsFavoritos = normalizarIdsFavoritos(body?.idsFavoritos);
      const { data, error } = await repository.actualizarFavoritos(authUser.id, idsFavoritos);

      if (error) {
        if (tieneErrorColumna(error, 'favoritos')) {
          throw crearError(400, 'Falta la columna favoritos en Supabase. Ejecuta el SQL actualizado.');
        }
        throw error;
      }

      return {
        message: 'Favoritos actualizados correctamente',
        favorites: normalizarIdsFavoritos(data?.favoritos),
      };
    },

    async actualizarPerfil(body, authUser) {
      requireSupabase(supabase);

      const idUsuario = authUser.id;
      const alias = normalizarAlias(body?.alias);
      const specialCode = normalizarCodigoEspecial(body?.specialCode);
      const validation = validarPerfilUsuario({ alias, specialCode, esAliasValido, esCodigoEspecialValido });
      if (!validation.valid) throw crearError(validation.statusCode, validation.message);

      let usuarioActual = null;
      let missingSpecialCodeColumn = false;
      let { data, error } = await repository.obtenerDatosPerfil(idUsuario);

      if (error && tieneErrorColumna(error, 'special_code')) {
        missingSpecialCodeColumn = true;
        const fallbackResponse = await repository.obtenerDatosPerfilSinCodigoEspecial(idUsuario);
        data = fallbackResponse.data;
        error = fallbackResponse.error;
      }

      if (error) throw error;
      usuarioActual = { ...data, special_code: missingSpecialCodeColumn ? null : data?.special_code };

      if (!usuarioActual) throw crearError(404, 'Usuario no encontrado');
      if (!usuarioActual.is_adult && specialCode !== null) {
        throw crearError(403, 'El código especial solo está disponible para perfiles Adulto');
      }

      const currentSpecialCode = normalizarCodigoEspecial(usuarioActual.special_code);
      const nextSpecialCode = usuarioActual.is_adult && specialCode === 'ayuda' && currentSpecialCode === 'ayuda'
        ? null
        : (usuarioActual.is_adult ? specialCode : null);

      if (missingSpecialCodeColumn && nextSpecialCode !== null) {
        throw crearError(400, 'Falta la columna special_code en Supabase. Ejecuta el script SQL actualizado.');
      }

      const updatePayload = missingSpecialCodeColumn ? { alias } : { alias, special_code: nextSpecialCode };
      const selectFields = missingSpecialCodeColumn
        ? 'id, email, nombre, alias, role, is_adult, parent_token'
        : 'id, email, nombre, alias, role, is_adult, parent_token, special_code';

      const { data: updatedUser, error: errorActualizacion } = await repository.actualizarPerfil(
        idUsuario,
        updatePayload,
        selectFields,
      );

      if (errorActualizacion) {
        if (tieneErrorColumna(errorActualizacion, 'alias')) {
          throw crearError(400, 'Falta la columna alias en Supabase. Ejecuta el script SQL actualizado.');
        }
        if (tieneErrorColumna(errorActualizacion, 'special_code')) {
          throw crearError(400, 'Falta la columna special_code en Supabase. Ejecuta el script SQL actualizado.');
        }
        throw errorActualizacion;
      }

      return {
        message: 'Perfil actualizado correctamente',
        user: usuarioPublico(updatedUser, {
          profileId: authUser.profileId || null,
          specialCode: normalizarCodigoEspecial(updatedUser.special_code),
        }),
      };
    },
  };
}
