import { crearOrderController } from './order.controller.js';
import { crearOrderRepository } from './order.repository.js';
import { crearOrderService } from './order.service.js';
import { validateRequest } from '../middlewares/validateRequest.js';
import { createOrderSchema, listOrdersQuerySchema, orderIdParamsSchema } from './order.validators.js';

export function registerOrderRoutes(app, deps) {
  const { requireAuth, requireAdultUser } = deps;

  const repository = crearOrderRepository(deps);
  const service = crearOrderService(deps, repository);
  const controller = crearOrderController(service);
  const adultOrderMiddlewares = [requireAuth, requireAdultUser];

  app.post('/api/orders', ...adultOrderMiddlewares, validateRequest(createOrderSchema), controller.crearPedidoManual);
  app.post('/api/stripe/create-checkout-session', ...adultOrderMiddlewares, validateRequest(createOrderSchema), controller.crearCheckoutSession);
  app.get('/api/orders/my', ...adultOrderMiddlewares, validateRequest({ query: listOrdersQuerySchema }), controller.listarMisPedidos);
  app.get('/api/orders/:id', ...adultOrderMiddlewares, validateRequest({ params: orderIdParamsSchema }), controller.obtenerPedido);
}
