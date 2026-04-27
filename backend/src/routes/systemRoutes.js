import { errorMiddleware, notFoundHandler } from '../middlewares/error.middleware.js';

// Rutas tecnicas del backend: salud del servicio.
export function registerSystemRoutes(app) {
  app.get('/api/health', (req, res) => {
    // Endpoint simple para comprobar si el backend esta vivo y con que entorno trabaja.
    res.json({
      status: 'ok',
      service: 'cafeteria-backend',
      environment: process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV || 'development',
      observability: {
        sentry: Boolean((process.env.SENTRY_DSN || '').trim()) && process.env.SENTRY_ENABLED !== 'false',
        logs: 'json',
      },
      timestamp: new Date().toISOString(),
    });
  });
}

export function registerNotFoundHandler(app) {
  app.use(notFoundHandler);
}

export function registerErrorHandler(app) {
  app.use(errorMiddleware);
}
