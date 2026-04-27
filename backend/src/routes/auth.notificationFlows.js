import { crearError, requireSupabase } from './auth.errors.js';
import { validarIdNotificacion, validarTokenDispositivo } from './auth.validators.js';

const SUPABASE_NOTIFICACIONES_MESSAGE = 'Supabase no esta configurado para notificaciones';

export function crearAuthNotificationFlows({ deps, repository }) {
  const {
    supabase,
    parsearEnteroPositivo,
  } = deps;

  return {
    async registrarDispositivo(body, authUser) {
      requireSupabase(supabase, SUPABASE_NOTIFICACIONES_MESSAGE);

      const { token, platform = 'unknown', deviceName = null, appVersion = null } = body || {};
      const validation = validarTokenDispositivo(token);
      if (!validation.valid) throw crearError(validation.statusCode, validation.message);

      const device = await repository.registrarDispositivo({
        idUsuario: authUser.id,
        token: validation.token,
        platform,
        deviceName,
        appVersion,
      });

      return { message: 'Dispositivo registrado para notificaciones', device };
    },

    async desactivarDispositivo(rawToken, authUser) {
      requireSupabase(supabase, SUPABASE_NOTIFICACIONES_MESSAGE);

      const deleted = await repository.desactivarDispositivo({
        idUsuario: authUser.id,
        token: decodeURIComponent(rawToken || '').trim(),
      });

      return { message: deleted ? 'Dispositivo desactivado' : 'No se encontro el dispositivo' };
    },

    async listarNotificaciones(query, authUser) {
      requireSupabase(supabase, SUPABASE_NOTIFICACIONES_MESSAGE);

      const limit = parsearEnteroPositivo(query.limit, 50);
      const notifications = await repository.listarNotificaciones(authUser.id, limit);
      return { notifications };
    },

    async marcarNotificacionLeida(params, authUser) {
      requireSupabase(supabase, SUPABASE_NOTIFICACIONES_MESSAGE);

      const validation = validarIdNotificacion(params.id);
      if (!validation.valid) throw crearError(validation.statusCode, validation.message);

      const updated = await repository.marcarNotificacionLeida(authUser.id, validation.idNotificacion);
      if (!updated) throw crearError(404, 'Notificacion no encontrada');

      return { message: 'Notificacion marcada como leida' };
    },
  };
}
