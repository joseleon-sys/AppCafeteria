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

export function validarIdUsuario(rawId) {
  const id = String(rawId || '').trim();
  if (!id) {
    return { valid: false, statusCode: 400, message: 'ID de usuario requerido' };
  }

  return { valid: true, id };
}

export function validarBloqueoUsuario(body = {}) {
  return { valid: true, bloqueado: Boolean(body.bloqueado) };
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
