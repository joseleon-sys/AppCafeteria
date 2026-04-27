import { asyncHandler } from '../../utils/asyncHandler.js';

export function crearChildOrdersController(childOrdersService) {
  function responderResultado(res, result) {
    const { statusCode, ...payload } = result;
    return res.status(statusCode || 200).json(payload);
  }

  return {
    crearPedidoHijo: asyncHandler(
      async (req, res) => {
        return responderResultado(res, await childOrdersService.crearPedidoHijo(req.user, req.body));
      },
      { publicMessage: 'Error al crear el pedido' },
    ),

    listarPedidosHijo: asyncHandler(
      async (req, res) => {
        return responderResultado(res, await childOrdersService.listarPedidosHijo(req.user, req.query));
      },
      { publicMessage: 'Error al obtener pedidos' },
    ),

    obtenerPedidoHijo: asyncHandler(
      async (req, res) => {
        return responderResultado(res, await childOrdersService.obtenerPedidoHijo(req.user, req.params));
      },
      { publicMessage: 'Error al obtener detalle del pedido' },
    ),

    listarPedidosPadre: asyncHandler(
      async (req, res) => {
        return responderResultado(res, await childOrdersService.listarPedidosPadre(req.user, req.query));
      },
      { publicMessage: 'Error al obtener pedidos' },
    ),

    obtenerPedidoPadre: asyncHandler(
      async (req, res) => {
        return responderResultado(res, await childOrdersService.obtenerPedidoPadre(req.user, req.params));
      },
      { publicMessage: 'Error al obtener detalle del pedido' },
    ),

    aprobarPedidoPadre: asyncHandler(
      async (req, res) => {
        return responderResultado(res, await childOrdersService.aprobarPedidoPadre(req.user, req.params, req.body));
      },
      { publicMessage: 'Error al aprobar pedido' },
    ),

    rechazarPedidoPadre: asyncHandler(
      async (req, res) => {
        return responderResultado(res, await childOrdersService.rechazarPedidoPadre(req.user, req.params, req.body));
      },
      { publicMessage: 'Error al rechazar pedido' },
    ),

    pagarPedidoPadre: asyncHandler(
      async (req, res) => {
        return responderResultado(res, await childOrdersService.pagarPedidoPadre(req.user, req.params, req.body));
      },
      { publicMessage: 'Error al marcar como pagado' },
    ),

    modificarPedidoPadre: asyncHandler(
      async (req, res) => {
        return responderResultado(res, await childOrdersService.modificarPedidoPadre(req.user, req.params, req.body));
      },
      { publicMessage: 'Error al modificar pedido' },
    ),

    listarHistorialPadre: asyncHandler(
      async (req, res) => {
        return responderResultado(res, await childOrdersService.listarHistorialPadre(req.user, req.query));
      },
      { publicMessage: 'Error al obtener historial' },
    ),
  };
}
