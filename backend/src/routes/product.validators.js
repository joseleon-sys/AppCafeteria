import { z } from 'zod';

const productIdParamsSchema = z.object({
  id: z.string().trim().min(1, 'ID de producto requerido'),
}).passthrough();

const jsonObjectLikeSchema = z.union([
  z.record(z.string(), z.unknown()),
  z.string(),
]);

const arrayLikeSchema = z.union([
  z.array(z.unknown()),
  z.string(),
]);

const productBaseSchema = {
  name: z.string().trim().min(1, 'Nombre requerido'),
  description: z.string().optional(),
  price: z.coerce.number().finite('Precio invalido').nonnegative('Precio invalido'),
  category: z.string().trim().min(1, 'Categoria requerida'),
  active: z.union([z.boolean(), z.string()]).optional(),
  image_url: z.string().optional(),
  badges: arrayLikeSchema.optional(),
  allergens: arrayLikeSchema.optional(),
  options: jsonObjectLikeSchema.optional(),
  ingredients: arrayLikeSchema.optional(),
  contains_info: z.string().optional(),
  conservation: z.string().optional(),
  shelf_life_hours: z.coerce.number().finite('Caducidad invalida').nonnegative('Caducidad invalida').optional(),
  calories_kcal: z.coerce.number().finite('Calorias invalidas').nonnegative('Calorias invalidas').optional(),
  nutrition_table: jsonObjectLikeSchema.optional(),
  sanitary_approved: z.union([z.boolean(), z.string()]).optional(),
  sanitary_notes: z.string().optional(),
  approved_at: z.string().nullable().optional(),
};

export const createProductSchema = {
  body: z.object(productBaseSchema).passthrough(),
};

export const updateProductSchema = {
  params: productIdParamsSchema,
  body: z.object({
    ...Object.fromEntries(Object.entries(productBaseSchema).map(([key, value]) => [key, value.optional()])),
  }).passthrough().refine((body) => Object.keys(body).length > 0, {
    message: 'No se enviaron campos para actualizar',
  }),
};

export function validarProductoCompleto(product) {
  if (!product.name || Number.isNaN(product.price) || !product.category) {
    return {
      valid: false,
      statusCode: 400,
      message: 'Faltan campos requeridos: name, price, category',
    };
  }

  return { valid: true };
}

export function validarIdProducto(rawId) {
  const id = String(rawId || '').trim();
  if (!id) {
    return { valid: false, statusCode: 400, message: 'ID de producto requerido' };
  }

  return { valid: true, id };
}

export function validarCambiosProducto(cambios) {
  if (Object.keys(cambios).length === 0) {
    return { valid: false, statusCode: 400, message: 'No se enviaron campos para actualizar' };
  }

  return { valid: true };
}
