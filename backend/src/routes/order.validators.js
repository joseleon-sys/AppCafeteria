import { z } from 'zod';

export const orderItemSchema = z.object({
  product_id: z.string().trim().min(1, 'Producto requerido'),
  quantity: z.coerce.number().int('Cantidad invalida').min(1, 'Cantidad invalida').max(50, 'Cantidad invalida'),
  notes: z.string().optional(),
  chosen_options: z.record(z.string(), z.unknown()).optional(),
}).passthrough();

export const createOrderSchema = {
  body: z.object({
    items: z.array(orderItemSchema).min(1, 'El carrito esta vacio'),
  }).passthrough(),
};

export const orderIdParamsSchema = z.object({
  id: z.string().trim().min(1, 'ID de pedido invalido'),
}).passthrough();

export const listOrdersQuerySchema = z.object({
  limit: z.coerce.number().int().nonnegative().optional(),
  status: z.string().optional(),
}).passthrough();

export function validarUsuarioAutenticado(user) {
  if (!user?.id) {
    return { valid: false, statusCode: 401, message: 'Usuario autenticado requerido' };
  }

  return { valid: true };
}

export function validarUsuarioPuedeCrearPedidoAdulto(user) {
  const authValidation = validarUsuarioAutenticado(user);
  if (!authValidation.valid) return authValidation;

  if (user.role === 'child') {
    return {
      valid: false,
      statusCode: 403,
      message: 'Los perfiles de menor deben usar el flujo de pedidos con aprobacion parental',
    };
  }

  return { valid: true };
}

export function validarCarritoPedido(items, emptyMessage = 'El carrito esta vacio') {
  if (!Array.isArray(items) || items.length === 0) {
    return { valid: false, statusCode: 400, message: emptyMessage };
  }

  return { valid: true };
}

export function validarIdPedido(rawId) {
  const id = String(rawId || '').trim();
  if (!id) return { valid: false, statusCode: 400, message: 'ID de pedido invalido' };

  return { valid: true, id };
}

export async function validarProductosPedido(items, { validarItemsPedido, userId }) {
  const carritoValidation = validarCarritoPedido(items);
  if (!carritoValidation.valid) return carritoValidation;

  try {
    const order = await validarItemsPedido(items, { idUsuario: userId });
    return { valid: true, order };
  } catch (error) {
    return {
      valid: false,
      statusCode: error.statusCode || 400,
      message: error.message || 'Productos del pedido invalidos',
    };
  }
}
