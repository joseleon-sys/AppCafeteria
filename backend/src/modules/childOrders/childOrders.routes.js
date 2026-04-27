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
  const { requireAuth, requireAdultUser, requireRole } = deps;

  const repository = crearChildOrdersRepository(deps);
  const service = crearChildOrdersService(deps, repository);
  const controller = crearChildOrdersController(service);
  const childOnly = [requireAuth, requireRole('child')];
  const adultOnly = [requireAuth, requireAdultUser];

  app.post('/api/child/orders', ...childOnly, validateRequest(createChildOrderSchema), controller.crearPedidoHijo);
  app.get('/api/child/orders', ...childOnly, validateRequest({ query: childOrderListQuerySchema }), controller.listarPedidosHijo);
  app.get('/api/child/orders/:id', ...childOnly, validateRequest({ params: childOrderIdParamsSchema }), controller.obtenerPedidoHijo);
  app.get('/api/parent/child-orders', ...adultOnly, validateRequest({ query: childOrderListQuerySchema }), controller.listarPedidosPadre);
  app.get('/api/parent/orders/:id', ...adultOnly, validateRequest({ params: childOrderIdParamsSchema }), controller.obtenerPedidoPadre);
  app.put('/api/parent/orders/:id/approve', ...adultOnly, validateRequest(approveChildOrderSchema), controller.aprobarPedidoPadre);
  app.put('/api/parent/orders/:id/reject', ...adultOnly, validateRequest(rejectChildOrderSchema), controller.rechazarPedidoPadre);
  app.put('/api/parent/orders/:id/pay', ...adultOnly, validateRequest(payChildOrderSchema), controller.pagarPedidoPadre);
  app.put('/api/parent/orders/:id/modify', ...adultOnly, validateRequest(modifyChildOrderSchema), controller.modificarPedidoPadre);
  app.get('/api/parent/child-orders/history', ...adultOnly, validateRequest({ query: childOrderListQuerySchema }), controller.listarHistorialPadre);
}
