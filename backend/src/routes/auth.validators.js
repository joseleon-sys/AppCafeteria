import { z } from 'zod';

const nonEmptyString = z.string().trim().min(1, 'Campo requerido');

const birthDateSchema = nonEmptyString.refine((value) => {
  const date = new Date(value);
  return !Number.isNaN(date.getTime());
}, 'Fecha de nacimiento invalida');

export const registerSchema = {
  body: z.object({
    email: z.string().trim().email('Email invalido'),
    password: z.string().min(6, 'La contrasena debe tener al menos 6 caracteres'),
    name: nonEmptyString,
    birthDate: birthDateSchema,
  }).passthrough(),
};

export const loginSchema = {
  body: z.object({
    email: nonEmptyString,
    password: nonEmptyString,
  }).passthrough(),
};

export const refreshTokenSchema = {
  body: z.object({
    refreshToken: nonEmptyString,
  }).passthrough(),
};

export const logoutSchema = {
  body: z.object({
    refreshToken: z.string().trim().optional(),
  }).passthrough().optional(),
};

export const resetPasswordSchema = {
  body: z.object({
    email: nonEmptyString,
    birthDate: birthDateSchema,
    newPassword: z.string().min(6, 'La contrasena debe tener al menos 6 caracteres'),
  }).passthrough(),
};

export function validarRegistroUsuario({ email, password, formattedName, birthDate, esNombreCompletoValido }) {
  if (!email || !password || !formattedName || !birthDate) {
    return { valid: false, reason: 'missing_fields', statusCode: 400, message: 'Faltan campos requeridos' };
  }

  if (!esNombreCompletoValido(formattedName)) {
    return {
      valid: false,
      reason: 'invalid_full_name',
      statusCode: 400,
      message: 'Debes introducir nombre y apellidos con formato válido',
    };
  }

  if (password.length < 6) {
    return {
      valid: false,
      reason: 'weak_password',
      statusCode: 400,
      message: 'La contraseña debe tener al menos 6 caracteres',
    };
  }

  return { valid: true };
}

export function validarLoginUsuario({ email, password }) {
  if (!email || !password) {
    return { valid: false, statusCode: 400, message: 'Email y contraseña requeridos' };
  }

  return { valid: true };
}

export function validarTokenDispositivo(token) {
  if (!token || typeof token !== 'string') {
    return { valid: false, statusCode: 400, message: 'Token FCM requerido' };
  }

  return { valid: true, token: token.trim() };
}

export function validarIdNotificacion(rawId) {
  const idNotificacion = parseInt(rawId, 10);
  if (!Number.isFinite(idNotificacion)) {
    return { valid: false, statusCode: 400, message: 'Identificador de notificacion invalido' };
  }

  return { valid: true, idNotificacion };
}

export function validarPerfilUsuario({ alias, specialCode, esAliasValido, esCodigoEspecialValido }) {
  if (!esAliasValido(alias)) {
    return {
      valid: false,
      statusCode: 400,
      message: 'Alias inválido. Usa 3-30 caracteres: letras, números, _ . -',
    };
  }

  if (!esCodigoEspecialValido(specialCode)) {
    return {
      valid: false,
      statusCode: 400,
      message: 'Código especial inválido. El único valor permitido es "ayuda".',
    };
  }

  return { valid: true };
}
