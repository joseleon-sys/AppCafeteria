import { crearFamilyController } from './family.controller.js';
import { crearFamilyRepository } from './family.repository.js';
import { crearFamilyService } from './family.service.js';

export function registerFamilyRoutes(app, deps) {
  const { autenticarToken, linkingRateLimiter } = deps;

  const repository = crearFamilyRepository(deps);
  const service = crearFamilyService(deps, repository);
  const controller = crearFamilyController(service);

  app.get('/api/parent/token', autenticarToken, controller.obtenerTokenPadre);
  app.post('/api/child/link-parent', autenticarToken, linkingRateLimiter, controller.solicitarVinculacion);
  app.get('/api/parent/link-requests', autenticarToken, controller.listarSolicitudes);
  app.put('/api/parent/link-requests/:id/approve', autenticarToken, controller.aprobarSolicitud);
  app.put('/api/parent/link-requests/:id/reject', autenticarToken, controller.rechazarSolicitud);
  app.get('/api/child/my-parents', autenticarToken, controller.listarMisPadres);
  app.get('/api/parent/my-children', autenticarToken, controller.listarMisHijos);
}
