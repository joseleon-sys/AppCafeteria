import { crearOrderController } from './order.controller.js';
import { crearOrderRepository } from './order.repository.js';
import { crearOrderService } from './order.service.js';
import { validateRequest } from '../middlewares/validateRequest.js';
import { createOrderSchema, listOrdersQuerySchema, orderIdParamsSchema } from './order.validators.js';

export function registerOrderRoutes(app, deps) {
  const { autenticarToken } = deps;

  const repository = crearOrderRepository(deps);
  const service = crearOrderService(deps, repository);
  const controller = crearOrderController(service);

  app.post('/api/orders', autenticarToken, validateRequest(createOrderSchema), controller.crearPedidoManual);
  app.post('/api/stripe/create-checkout-session', autenticarToken, validateRequest(createOrderSchema), controller.crearCheckoutSession);
  app.get('/api/orders/my', autenticarToken, validateRequest({ query: listOrdersQuerySchema }), controller.listarMisPedidos);
  app.get('/api/orders/:id', autenticarToken, validateRequest({ params: orderIdParamsSchema }), controller.obtenerPedido);
}
