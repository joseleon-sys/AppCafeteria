// Inicializacion de Sentry en el frontend para errores y trazas del navegador.
function parseSampleRate(value, fallback) {
  // Asegura que los porcentajes de muestreo esten dentro del rango valido.
  const parsed = Number.parseFloat(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(Math.max(parsed, 0), 1);
}

function getTracePropagationTargets() {
  // Lista los dominios a los que Sentry puede propagar contexto de trazas.
  return [
    import.meta.env.VITE_API_URL,
    import.meta.env.VITE_API_FALLBACK_URL,
    import.meta.env.VITE_RAILWAY_API_URL,
  ]
    .filter(Boolean)
    .map((url) => {
      try {
        return new URL(url).origin;
      } catch {
        return url;
      }
    });
}

const dsn = (import.meta.env.VITE_SENTRY_DSN || '').trim();
const enabled = Boolean(dsn) && import.meta.env.VITE_SENTRY_ENABLED !== 'false';

if (enabled) {
  import('@sentry/react').then((Sentry) => Sentry.init({
    dsn,
    environment: import.meta.env.VITE_SENTRY_ENVIRONMENT || import.meta.env.MODE || 'development',
    release: import.meta.env.VITE_SENTRY_RELEASE || import.meta.env.VITE_APP_VERSION,
    sendDefaultPii: false,
    tracesSampleRate: parseSampleRate(import.meta.env.VITE_SENTRY_TRACES_SAMPLE_RATE, 0.1),
    replaysSessionSampleRate: parseSampleRate(import.meta.env.VITE_SENTRY_REPLAY_SESSION_SAMPLE_RATE, 0),
    replaysOnErrorSampleRate: parseSampleRate(import.meta.env.VITE_SENTRY_REPLAY_ERROR_SAMPLE_RATE, 1),
    tracePropagationTargets: getTracePropagationTargets(),
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],
  }));
}
