import { z } from 'zod';
import { orderItemSchema } from '../../routes/order.validators.js';

export const childOrderIdParamsSchema = z.object({
  id: z.string().trim().min(1, 'ID de pedido invalido'),
}).passthrough();

export const childOrderListQuerySchema = z.object({
  status: z.string().optional(),
  child_id: z.string().trim().min(1).optional(),
  limit: z.coerce.number().int().nonnegative().optional(),
  offset: z.coerce.number().int().nonnegative().optional(),
  from_date: z.string().optional(),
  to_date: z.string().optional(),
}).passthrough();

export const createChildOrderSchema = {
  body: z.object({
    items: z.array(orderItemSchema).min(1, 'El carrito esta vacio'),
    parent_id: z.string().trim().min(1).optional(),
    notes: z.string().optional(),
  }).passthrough(),
};

export const approveChildOrderSchema = {
  params: childOrderIdParamsSchema,
  body: z.object({
    approved_amount: z.coerce.number().finite().nonnegative().optional(),
  }).passthrough(),
};

export const rejectChildOrderSchema = {
  params: childOrderIdParamsSchema,
  body: z.object({
    reason: z.string().trim().min(3, 'Debe proporcionar una razon para el rechazo'),
  }).passthrough(),
};

export const payChildOrderSchema = {
  params: childOrderIdParamsSchema,
  body: z.object({
    payment_method: z.string().trim().min(1).optional(),
    amount_paid: z.coerce.number().finite().nonnegative().optional(),
  }).passthrough(),
};

export const modifyChildOrderSchema = {
  params: childOrderIdParamsSchema,
  body: z.object({
    items: z.array(orderItemSchema).min(1, 'Debe proporcionar items para modificar'),
  }).passthrough(),
};

export function validarUsuarioAutenticado(user) {
  if (!user?.id) {
    return { valid: false, statusCode: 401, message: 'Usuario autenticado requerido' };
  }

  return { valid: true };
}

export function validarRolHijo(user, message) {
  const authValidation = validarUsuarioAutenticado(user);
  if (!authValidation.valid) return authValidation;

  if (user.role !== 'child') {
    return { valid: false, statusCode: 403, message };
  }

  return { valid: true };
}

export function validarRolPadre(user, puedeActuarComoPadre, message) {
  const authValidation = validarUsuarioAutenticado(user);
  if (!authValidation.valid) return authValidation;

  if (!puedeActuarComoPadre(user)) {
    return { valid: false, statusCode: 403, message };
  }

  return { valid: true };
}

export function validarItemsPedido(items, message = 'El carrito está vacío') {
  if (!Array.isArray(items) || items.length === 0) {
    return { valid: false, statusCode: 400, message };
  }

  return { valid: true };
}

export function validarIdPedido(rawId) {
  const id = String(rawId || '').trim();
  if (!id) return { valid: false, statusCode: 400, message: 'ID de pedido invalido' };

  return { valid: true, id };
}

export function validarRazonRechazo(reason) {
  if (!reason || reason.length < 3) {
    return { valid: false, statusCode: 400, message: 'Debe proporcionar una razón para el rechazo' };
  }

  return { valid: true };
}
