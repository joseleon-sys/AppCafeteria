import { asyncHandler } from '../utils/asyncHandler.js';

export function crearProductController(productService) {
  return {
    listarProductosAdmin: asyncHandler(
      async (req, res) => {
        const result = await productService.listarProductosAdmin();
        return res.json(result);
      },
      { publicMessage: 'Error al obtener productos' },
    ),

    listarMenuPublico: asyncHandler(
      async (req, res) => {
        const result = await productService.listarMenuPublico();
        return res.json(result);
      },
      { publicMessage: 'Error al obtener menú' },
    ),

    crearProducto: asyncHandler(
      async (req, res) => {
        const result = await productService.crearProducto(req.body);
        return res.status(result.statusCode || 200).json({
          data: result.data,
          message: result.message,
        });
      },
      { publicMessage: 'No se pudo persistir el producto' },
    ),

    actualizarProducto: asyncHandler(
      async (req, res) => {
        const result = await productService.actualizarProducto(req.params, req.body);
        return res.json(result);
      },
      { publicMessage: 'No se pudo persistir la actualización' },
    ),

    eliminarProducto: asyncHandler(
      async (req, res) => {
        const result = await productService.eliminarProducto(req.params, req.query);
        return res.json(result);
      },
      { publicMessage: 'No se pudo persistir la eliminación' },
    ),
  };
}
