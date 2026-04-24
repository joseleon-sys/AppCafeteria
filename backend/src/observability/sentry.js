// Integracion con Sentry para capturar errores del backend.
import * as Sentry from '@sentry/node';

let initialized = false;

function parseSampleRate(value, fallback) {
  // Asegura que el porcentaje de muestreo quede entre 0 y 1.
  const parsed = Number.parseFloat(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(Math.max(parsed, 0), 1);
}

export function initSentry() {
  // Inicializa Sentry una sola vez para toda la aplicacion.
  if (initialized) return Sentry;

  const dsn = (process.env.SENTRY_DSN || '').trim();
  const enabled = Boolean(dsn) && process.env.SENTRY_ENABLED !== 'false';

  if (enabled) {
    Sentry.init({
      dsn,
      environment: process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV || 'development',
      release: process.env.SENTRY_RELEASE || process.env.RAILWAY_GIT_COMMIT_SHA || process.env.npm_package_version,
      sendDefaultPii: false,
      tracesSampleRate: parseSampleRate(process.env.SENTRY_TRACES_SAMPLE_RATE, 0.1),
      integrations: [
        Sentry.httpIntegration(),
        Sentry.expressIntegration(),
      ],
    });

    Sentry.setTag('service', 'cafeteria-backend');
  }

  initialized = true;
  return Sentry;
}

export function isSentryEnabled() {
  // Indica si Sentry esta realmente activo con configuracion valida.
  return initialized && Boolean((process.env.SENTRY_DSN || '').trim()) && process.env.SENTRY_ENABLED !== 'false';
}

export function captureServerResponse(req, res) {
  // Solo enviamos a Sentry respuestas de error grave del servidor.
  if (!isSentryEnabled() || res.statusCode < 500) return;

  Sentry.withScope((scope) => {
    scope.setLevel('error');
    scope.setTag('http.status_code', String(res.statusCode));
    scope.setTag('http.method', req.method);
    scope.setContext('request', {
      method: req.method,
      path: req.originalUrl || req.url,
      statusCode: res.statusCode,
      idSolicitud: req.id,
    });

    if (req.user?.id) {
      scope.setUser({ id: String(req.user.id), role: req.user.role });
    }

    Sentry.captureMessage(`HTTP ${res.statusCode} ${req.method} ${req.originalUrl || req.url}`);
  });
}

export function registerSentryErrorHandler(app) {
  // Registra el middleware oficial de Sentry al final del pipeline de Express.
  if (isSentryEnabled()) {
    Sentry.setupExpressErrorHandler(app);
  }
}

export { Sentry };
