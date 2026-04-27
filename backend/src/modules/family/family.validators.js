export function validarUsuarioAutenticado(user) {
  if (!user?.id) {
    return { valid: false, statusCode: 401, message: 'Usuario autenticado requerido' };
  }

  return { valid: true };
}

export function validarAdultoPuedeActuarComoPadre(user, puedeActuarComoPadre, message) {
  const authValidation = validarUsuarioAutenticado(user);
  if (!authValidation.valid) return authValidation;

  if (!puedeActuarComoPadre(user)) {
    return {
      valid: false,
      statusCode: 403,
      message,
    };
  }

  return { valid: true };
}

export function validarHijoPuedeVincular(child) {
  if (!child || child.role !== 'child' || child.is_adult) {
    return {
      valid: false,
      statusCode: 403,
      message: 'Solo los hijos pueden vincular padres',
    };
  }

  return { valid: true };
}

export function validarTokenPadre(tokenPadre) {
  const normalizedParentToken = String(tokenPadre || '').trim().toUpperCase();
  if (!normalizedParentToken) {
    return { valid: false, statusCode: 400, message: 'Token de padre requerido' };
  }

  return { valid: true, tokenPadre: normalizedParentToken };
}

export function validarIdSolicitud(rawId) {
  const id = String(rawId || '').trim();
  if (!id) return { valid: false, statusCode: 400, message: 'Solicitud invalida' };

  return { valid: true, id };
}
