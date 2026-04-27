import { crearAuthController } from './auth.controller.js';
import { crearAuthRepository } from './auth.repository.js';
import { crearAuthService } from './auth.service.js';
import { validateRequest } from '../middlewares/validateRequest.js';
import { loginSchema, logoutSchema, refreshTokenSchema, registerSchema } from './auth.validators.js';

export function registerAuthRoutes(app, deps) {
  const {
    autenticarToken,
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
  app.get('/api/auth/me', autenticarToken, controller.obtenerUsuarioActual);

  app.post('/api/notifications/devices', autenticarToken, controller.registrarDispositivo);
  app.delete('/api/notifications/devices/:token', autenticarToken, controller.desactivarDispositivo);
  app.get('/api/notifications', autenticarToken, controller.listarNotificaciones);
  app.put('/api/notifications/:id/read', autenticarToken, controller.marcarNotificacionLeida);

  app.get('/api/auth/favorites', autenticarToken, controller.obtenerFavoritos);
  app.put('/api/auth/favorites', autenticarToken, controller.actualizarFavoritos);
  app.put('/api/auth/profile', autenticarToken, controller.actualizarPerfil);
}
