import { crearAuthController } from './auth.controller.js';
import { crearAuthRepository } from './auth.repository.js';
import { crearAuthService } from './auth.service.js';
import { validateRequest } from '../middlewares/validateRequest.js';
import { loginSchema, logoutSchema, refreshTokenSchema, registerSchema } from './auth.validators.js';

export function registerAuthRoutes(app, deps) {
  const {
    requireAuth,
    registrationRateLimiter,
    loginRateLimiter,
  } = deps;

  const repository = crearAuthRepository(deps);
  const service = crearAuthService(deps, repository);
  const controller = crearAuthController(service);

  app.post('/api/auth/register', registrationRateLimiter, validateRequest(registerSchema), controller.registrarUsuario);
  app.post('/api/auth/login', loginRateLimiter, validateRequest(loginSchema), controller.loginUsuario);
  app.post('/api/auth/refresh', validateRequest(refreshTokenSchema), controller.refrescarSesion);
  app.post('/api/auth/logout', validateRequest(logoutSchema), controller.cerrarSesion);
  app.post('/api/auth/reset-password', controller.restablecerContrasena);
  app.get('/api/auth/me', requireAuth, controller.obtenerUsuarioActual);

  app.post('/api/notifications/devices', requireAuth, controller.registrarDispositivo);
  app.delete('/api/notifications/devices/:token', requireAuth, controller.desactivarDispositivo);
  app.get('/api/notifications', requireAuth, controller.listarNotificaciones);
  app.put('/api/notifications/:id/read', requireAuth, controller.marcarNotificacionLeida);

  app.get('/api/auth/favorites', requireAuth, controller.obtenerFavoritos);
  app.put('/api/auth/favorites', requireAuth, controller.actualizarFavoritos);
  app.put('/api/auth/profile', requireAuth, controller.actualizarPerfil);
}
