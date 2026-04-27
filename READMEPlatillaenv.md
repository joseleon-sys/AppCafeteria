# Variables de entorno del backend

Copia `backend/.env.example` a `backend/.env` y completa los valores reales solo en tu entorno local o proveedor de hosting. No guardes secretos reales en archivos versionados.

Variables principales:

```env
NODE_ENV=
PORT=
FRONTEND_URL=
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
JWT_SECRET=
STRIPE_SECRET_KEY=
DEV_BYPASS_STRIPE_PAYMENT=
FIREBASE_SERVICE_ACCOUNT_JSON=
SENTRY_DSN=
SENTRY_ENVIRONMENT=
SENTRY_RELEASE=
SENTRY_TRACES_SAMPLE_RATE=
SENTRY_ENABLED=
LOG_LEVEL=
LOGSTASH_TCP_URL=
```

El backend tambien acepta `SUPABASE_SECRET_KEY`, `SUPABASE_SERVICE_KEY` o `SUPABASE_ANON_KEY` por compatibilidad, aunque se prefiere `SUPABASE_SERVICE_ROLE_KEY` para operaciones del servidor.
