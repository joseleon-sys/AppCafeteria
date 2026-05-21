import { z } from 'zod';

export const adminUserIdParamsSchema = z.object({
  id: z.string().trim().min(1, 'ID de usuario requerido'),
}).passthrough();

export const updateUserBlockSchema = {
  params: adminUserIdParamsSchema,
  body: z.object({
    bloqueado: z.union([z.boolean(), z.string(), z.number()]).optional(),
  }).passthrough(),
};

export const updateAdminUserSchema = {
  params: adminUserIdParamsSchema,
  body: z.object({
    name: z.string().trim().min(1).optional(),
    email: z.string().trim().email('Email invalido').optional(),
    role: z.string().trim().min(1).optional(),
  }).passthrough().refine((body) => Boolean(body.name || body.email || body.role), {
    message: 'No hay campos para actualizar',
  }),
};

export const deleteAdminUserSchema = {
  params: adminUserIdParamsSchema,
};

export const updatePrinterConfigSchema = {
  body: z.object({
    enabled: z.union([z.boolean(), z.string(), z.number()]).optional(),
    host: z.string().trim().max(255).optional(),
    port: z.union([z.number(), z.string()]).optional(),
    timeoutMs: z.union([z.number(), z.string()]).optional(),
  }).passthrough(),
};

export function validarIdUsuario(rawId) {
  const id = String(rawId || '').trim();
  if (!id) {
    return { valid: false, statusCode: 400, message: 'ID de usuario requerido' };
  }

  return { valid: true, id };
}

export function validarBloqueoUsuario(body = {}) {
  const rawValue = body.bloqueado;
  const bloqueado = typeof rawValue === 'string'
    ? ['true', '1', 'si', 'sí'].includes(rawValue.trim().toLowerCase())
    : Boolean(rawValue);

  return { valid: true, bloqueado };
}

export function validarCambiosUsuario(body = {}) {
  const updateData = {};

  if (body.name) updateData.nombre = body.name;
  if (body.email) updateData.email = body.email;
  if (body.role) updateData.role = body.role;

  if (Object.keys(updateData).length === 0) {
    return { valid: false, statusCode: 400, message: 'No hay campos para actualizar' };
  }

  return { valid: true, updateData };
}

function parsearBooleano(rawValue) {
  if (typeof rawValue === 'string') {
    return ['true', '1', 'si', 'sí', 'sÃ­', 'on'].includes(rawValue.trim().toLowerCase());
  }
  return Boolean(rawValue);
}

function parsearEnteroPositivo(rawValue, fallback) {
  const value = Number.parseInt(rawValue, 10);
  return Number.isInteger(value) && value > 0 ? value : fallback;
}

export function validarConfiguracionImpresora(body = {}, currentConfig = {}) {
  const host = String(body.host ?? currentConfig.host ?? '').trim();
  const enabled = body.enabled === undefined ? Boolean(currentConfig.enabled) : parsearBooleano(body.enabled);
  const port = parsearEnteroPositivo(body.port ?? currentConfig.port, 9100);
  const timeoutMs = parsearEnteroPositivo(body.timeoutMs ?? currentConfig.timeoutMs, 4000);

  if (enabled && !host) {
    return { valid: false, statusCode: 400, message: 'La direccion de la impresora es requerida' };
  }

  if (port < 1 || port > 65535) {
    return { valid: false, statusCode: 400, message: 'El puerto debe estar entre 1 y 65535' };
  }

  return {
    valid: true,
    config: {
      enabled,
      host,
      port,
      timeoutMs,
    },
  };
}
