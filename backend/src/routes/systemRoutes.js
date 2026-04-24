// Rutas tecnicas del backend: salud del servicio y manejadores globales de error.
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
  // Si ninguna ruta anterior coincide, respondemos con 404.
  app.use((req, res) => {
    res.status(404).json({ error: 'Endpoint no encontrado' });
  });
}

export function registerErrorHandler(app) {
  // Middleware final para centralizar errores no controlados de la app.
  app.use((err, req, res, _next) => {
    const statusCode = Number.isInteger(err.statusCode) ? err.statusCode : 500;
    req.log?.error({ err, statusCode }, 'Unhandled request error');

    res.status(statusCode).json({
      error: statusCode >= 500 ? 'Error interno del servidor' : err.message,
      idSolicitud: req.id,
    });
  });
}
