import { crearChildOrdersController } from './childOrders.controller.js';
import { crearChildOrdersRepository } from './childOrders.repository.js';
import { crearChildOrdersService } from './childOrders.service.js';
import { validateRequest } from '../../middlewares/validateRequest.js';
import {
  approveChildOrderSchema,
  childOrderIdParamsSchema,
  childOrderListQuerySchema,
  createChildOrderSchema,
  modifyChildOrderSchema,
  payChildOrderSchema,
  rejectChildOrderSchema,
} from './childOrders.validators.js';

export function registerChildOrderRoutes(app, deps) {
  const { autenticarToken } = deps;

  const repository = crearChildOrdersRepository(deps);
  const service = crearChildOrdersService(deps, repository);
  const controller = crearChildOrdersController(service);

  app.post('/api/child/orders', autenticarToken, validateRequest(createChildOrderSchema), controller.crearPedidoHijo);
  app.get('/api/child/orders', autenticarToken, validateRequest({ query: childOrderListQuerySchema }), controller.listarPedidosHijo);
  app.get('/api/child/orders/:id', autenticarToken, validateRequest({ params: childOrderIdParamsSchema }), controller.obtenerPedidoHijo);
  app.get('/api/parent/child-orders', autenticarToken, validateRequest({ query: childOrderListQuerySchema }), controller.listarPedidosPadre);
  app.get('/api/parent/orders/:id', autenticarToken, validateRequest({ params: childOrderIdParamsSchema }), controller.obtenerPedidoPadre);
  app.put('/api/parent/orders/:id/approve', autenticarToken, validateRequest(approveChildOrderSchema), controller.aprobarPedidoPadre);
  app.put('/api/parent/orders/:id/reject', autenticarToken, validateRequest(rejectChildOrderSchema), controller.rechazarPedidoPadre);
  app.put('/api/parent/orders/:id/pay', autenticarToken, validateRequest(payChildOrderSchema), controller.pagarPedidoPadre);
  app.put('/api/parent/orders/:id/modify', autenticarToken, validateRequest(modifyChildOrderSchema), controller.modificarPedidoPadre);
  app.get('/api/parent/child-orders/history', autenticarToken, validateRequest({ query: childOrderListQuerySchema }), controller.listarHistorialPadre);
}
