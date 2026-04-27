# Backend - CafeteriaSSG

API REST de la aplicación de cafetería.

La persistencia del backend usa Supabase siempre.

## Requisitos

- Node.js 18+
- npm
- Un proyecto Supabase configurado

## Dependencias

- Producción: `@supabase/supabase-js`, `bcryptjs`, `cors`, `dotenv`, `express`, `express-rate-limit`, `firebase-admin`, `helmet`, `jsonwebtoken`, `stripe`, `@sentry/node`, `pino-http`
- Desarrollo: `nodemon`

## Variables de entorno mínimas

```env
SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_SECRET_KEY=tu-service-role-o-secret-key
JWT_SECRET=tu-clave-jwt
PORT=3000
FRONTEND_URL=http://localhost:5173
```

### CORS

`FRONTEND_URL` controla los origenes permitidos por CORS. Puede ser un unico origen
o una lista separada por comas, por ejemplo:

```env
FRONTEND_URL=http://localhost:5173,https://app.example.com
```

Si `FRONTEND_URL` esta vacio en desarrollo, el backend permite los origenes locales
habituales de Vite/Capacitor para no romper el trabajo local. En produccion debe
estar configurado con el dominio real del frontend.

Opcionales:

```env
STRIPE_SECRET_KEY=sk_test_...
DEV_BYPASS_STRIPE_PAYMENT=true

SENTRY_DSN=https://...
SENTRY_ENVIRONMENT=development
SENTRY_RELEASE=cafeteria-backend@1.0.0
SENTRY_TRACES_SAMPLE_RATE=0.1
SENTRY_ENABLED=true

LOG_LEVEL=info
LOGSTASH_TCP_URL=localhost:5000
```

## Instalación

```bash
cd backend
npm install
```

## Desarrollo

```bash
cd backend
npm run dev
```

El backend arranca en `http://localhost:3000` por defecto.

## Endpoints principales

- `GET /api/health`
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/menu`
- `POST /api/orders`
- `GET /api/orders/my`
- `GET /api/orders/:id`

## Pedidos

- Los pedidos estándar se persisten en Supabase en `pedidos` y `lineas_pedido`.
- El historial y el detalle consultan siempre Supabase.
- Si `DEV_BYPASS_STRIPE_PAYMENT=true`, en desarrollo se omite Stripe, pero el pedido igualmente se guarda en Supabase.

## Notas

- Si `SUPABASE_URL` o `SUPABASE_SECRET_KEY` faltan, el backend no arranca.
- Usuarios, catálogo y pedidos dependen de Supabase.
