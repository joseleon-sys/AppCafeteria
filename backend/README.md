# Backend - CafeteriaSSG

API REST de la aplicación de cafetería.

La persistencia del backend usa Supabase siempre.

## Requisitos

- Node.js 18+
- npm
- Un proyecto Supabase configurado

## Dependencias

- Producción: `@supabase/supabase-js`, `bcryptjs`, `cors`, `dotenv`, `express`, `express-rate-limit`, `helmet`, `jsonwebtoken`, `pino-http`, `zod`
- Desarrollo: `nodemon`

## Variables de entorno mínimas

```env
SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_SERVICE_ROLE_KEY=tu-service-role-key
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

Opcionales documentadas:

```env
LOG_LEVEL=info
```

Supabase es el unico servicio externo vigente para el backend. Si aparecen variables o archivos historicos de otras integraciones, se consideran legacy hasta que se reactiven de forma explicita.

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
- Los pedidos se guardan en Supabase; el estado y metodo de pago quedan registrados en las tablas del dominio.

## Notas

- Si `SUPABASE_URL` o `SUPABASE_SERVICE_ROLE_KEY`/`SUPABASE_SECRET_KEY` faltan, el backend no arranca.
- Usuarios, catálogo y pedidos dependen de Supabase.
