import { crearAdminController } from './admin.controller.js';
import { crearAdminRepository } from './admin.repository.js';
import { crearAdminService } from './admin.service.js';
import { validateRequest } from '../../middlewares/validateRequest.js';
import { deleteAdminUserSchema, updateAdminUserSchema, updateUserBlockSchema } from './admin.validators.js';

export function registerAdminRoutes(app, deps) {
  const {
    requireAuth,
    requireRole,
  } = deps;

  const repository = crearAdminRepository(deps);
  const service = crearAdminService(deps, repository);
  const controller = crearAdminController(service);
  const adminMiddlewares = [requireAuth, requireRole('admin')];

  app.get('/api/admin/statistics', ...adminMiddlewares, controller.obtenerMetricas);
  app.get('/api/admin/fraud-log', ...adminMiddlewares, controller.listarFraudLogs);
  app.get('/api/admin/users', ...adminMiddlewares, controller.listarUsuarios);
  app.put('/api/admin/users/:id/block', ...adminMiddlewares, validateRequest(updateUserBlockSchema), controller.actualizarBloqueoUsuario);
  app.put('/api/admin/users/:id', ...adminMiddlewares, validateRequest(updateAdminUserSchema), controller.actualizarUsuario);
  app.delete('/api/admin/users/:id', ...adminMiddlewares, validateRequest(deleteAdminUserSchema), controller.eliminarUsuario);
  app.get('/api/admin/orders/queue', ...adminMiddlewares, controller.listarColaPedidos);
}
