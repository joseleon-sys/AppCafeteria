import { asyncHandler } from '../utils/asyncHandler.js';

export function crearOrderController(orderService) {
  function responderResultado(res, result) {
    const { statusCode, ...payload } = result;
    return res.status(statusCode || 200).json(payload);
  }

  return {
    crearPedidoManual: asyncHandler(
      async (req, res) => {
        const result = await orderService.crearPedidoManual(req.user, req.body);
        return responderResultado(res, result);
      },
      { publicMessage: 'Error al crear el pedido' },
    ),

    crearCheckoutSession: asyncHandler(
      async (req, res) => {
        const result = await orderService.crearCheckoutSession(req.user, req.body);
        return responderResultado(res, result);
      },
      { publicMessage: 'Error al iniciar el pago con Stripe' },
    ),

    listarMisPedidos: asyncHandler(
      async (req, res) => {
        const result = await orderService.listarMisPedidos(req.user, req.query);
        return res.json(result);
      },
      { publicMessage: 'Error al obtener pedidos' },
    ),

    obtenerPedido: asyncHandler(
      async (req, res) => {
        const result = await orderService.obtenerPedido(req.user, req.params);
        return res.json(result);
      },
      { publicMessage: 'Error al obtener detalle del pedido' },
    ),
  };
}
