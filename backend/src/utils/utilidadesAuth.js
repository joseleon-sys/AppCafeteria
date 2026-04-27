// Utilidades pequeñas reutilizadas por las rutas de autenticacion.
import { crearAuthTokenService } from '../services/authTokenService.js';

export function construirUsuarioPublico(user = {}, extraData = {}) {
  // Prepara una version segura del usuario para devolver al frontend.
  return {
    id: user.id,
    email: user.email,
    name: user.nombre || user.name,
    alias: user.alias || null,
    role: user.role,
    isAdult: user.is_adult,
    tokenPadre: user.parent_token,
    specialCode: extraData.specialCode ?? null,
    created_at: user.created_at || null,
    ...extraData,
  };
}

export function firmarTokenAuth(user, JWT_SECRET, profileId) {
  // Compatibilidad con llamadas antiguas: ahora firma un access token corto.
  return crearAuthTokenService({ jwtSecret: JWT_SECRET }).firmarAccessToken(user, profileId);
}

export async function registrarFalloValidacionAuth({
  supabase,
  logSecurityEvent,
  actionType,
  reason,
  email,
  req,
  severity = 'low',
}) {
  // Registra un intento sospechoso o invalido para trazabilidad y seguridad.
  await logSecurityEvent(supabase, {
    actionType,
    severity,
    details: { reason, email },
    req,
  });
}
