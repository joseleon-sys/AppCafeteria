import { registrarFalloValidacionAuth } from '../utils/utilidadesAuth.js';

export function crearAuthSecurityLogger({ supabase, logSecurityEvent }) {
  async function registrarErrorSistema({ error, req, actionType, severity = 'high', details = {} }) {
    if (!supabase || error.statusCode) return;
    await logSecurityEvent(supabase, {
      actionType,
      severity,
      details: { error: error.message, ...details },
      req,
    });
  }

  return {
    registrarErrorRegistro(error, req) {
      return registrarErrorSistema({
        error,
        req,
        actionType: 'registration_error',
      });
    },

    registrarErrorLogin(error, req) {
      return registrarErrorSistema({
        error,
        req,
        actionType: 'login_error',
      });
    },

    async registrarErrorRestablecerContrasena(error, req) {
      if (!supabase) return;
      await logSecurityEvent(supabase, {
        actionType: 'password_reset_failed',
        severity: error.statusCode && error.statusCode < 500 ? 'low' : 'high',
        details: { error: error.message, email: req.body?.email || null },
        req,
      });
    },

    registrarErrorValidacion({ actionType, reason, email, req, severity }) {
      return registrarFalloValidacionAuth({ supabase, logSecurityEvent, actionType, reason, email, req, severity });
    },
  };
}
