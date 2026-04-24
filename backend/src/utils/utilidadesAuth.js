// Utilidades pequeñas reutilizadas por las rutas de autenticacion.
import jwt from 'jsonwebtoken';

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
  // Genera el JWT que identifica al usuario en peticiones futuras.
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      isAdult: Boolean(user.is_adult),
      profileId,
    },
    JWT_SECRET,
    { expiresIn: '7d' },
  );
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
