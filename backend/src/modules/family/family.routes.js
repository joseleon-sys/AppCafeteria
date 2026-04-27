import { crearFamilyController } from './family.controller.js';
import { crearFamilyRepository } from './family.repository.js';
import { crearFamilyService } from './family.service.js';

export function registerFamilyRoutes(app, deps) {
  const { requireAuth, requireAdultUser, requireRole, linkingRateLimiter } = deps;

  const repository = crearFamilyRepository(deps);
  const service = crearFamilyService(deps, repository);
  const controller = crearFamilyController(service);

  const childOnly = [requireAuth, requireRole('child')];
  const adultOnly = [requireAuth, requireAdultUser];

  app.get('/api/parent/token', ...adultOnly, controller.obtenerTokenPadre);
  app.post('/api/child/link-parent', ...childOnly, linkingRateLimiter, controller.solicitarVinculacion);
  app.get('/api/parent/link-requests', ...adultOnly, controller.listarSolicitudes);
  app.put('/api/parent/link-requests/:id/approve', ...adultOnly, controller.aprobarSolicitud);
  app.put('/api/parent/link-requests/:id/reject', ...adultOnly, controller.rechazarSolicitud);
  app.get('/api/child/my-parents', ...childOnly, controller.listarMisPadres);
  app.get('/api/parent/my-children', ...adultOnly, controller.listarMisHijos);
}
