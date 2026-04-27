# Variables de entorno del frontend

Copia `frontend/.env.example` a `frontend/.env` y completa los valores reales solo en tu entorno local o proveedor de hosting. No guardes secretos reales en archivos versionados.

Variables usadas por el frontend:

```env
VITE_API_URL=
VITE_API_FALLBACK_URL=
VITE_RAILWAY_API_URL=
BACKEND_URL=
VITE_APP_VERSION=
VITE_SENTRY_DSN=
VITE_SENTRY_ENVIRONMENT=
VITE_SENTRY_RELEASE=
VITE_SENTRY_TRACES_SAMPLE_RATE=
VITE_SENTRY_REPLAY_SESSION_SAMPLE_RATE=
VITE_SENTRY_REPLAY_ERROR_SAMPLE_RATE=
VITE_SENTRY_ENABLED=
```

El frontend se comunica con Supabase a traves del backend; no necesita claves de Supabase en el cliente.
