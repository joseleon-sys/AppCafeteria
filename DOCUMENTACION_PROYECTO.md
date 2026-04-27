# DOCUMENTACION_PROYECTO.md

## 1. Que Hace La Aplicacion

AppCafeteria es una aplicacion de cafeteria para web y movil. Permite consultar el catalogo de productos, gestionar un carrito, crear pedidos, pagar con Stripe y consultar el historial. Tambien incluye autenticacion, perfiles de adulto y menor, vinculacion padre-hijo, aprobacion de pedidos infantiles, notificaciones y panel de administracion.

El caso principal del sistema es una cafeteria escolar:

- Los usuarios adultos pueden comprar directamente.
- Los menores pueden crear pedidos que quedan pendientes de aprobacion.
- Los padres o tutores aprueban, modifican, rechazan o pagan los pedidos de sus hijos.
- Los administradores gestionan productos, usuarios, pedidos y eventos de seguridad.

## 2. Arquitectura General

El proyecto esta separado en dos aplicaciones principales:

- `frontend/`: aplicacion React/Vite con soporte Capacitor para Android/iOS.
- `backend/`: API REST Node.js/Express conectada a Supabase y Stripe.

La arquitectura sigue una separacion por responsabilidades:

- El frontend renderiza pantallas, gestiona estado de UI y consume la API mediante modulos centralizados.
- El backend valida entradas, aplica reglas de negocio, verifica roles, accede a Supabase y orquesta pagos.
- Supabase actua como base de datos principal.
- Stripe se usa para crear sesiones de pago y confirmar pagos.
- Firebase/Sentry/observabilidad son integraciones auxiliares para notificaciones y seguimiento.

Flujo simplificado:

```txt
Usuario
  -> Frontend React/Vite/Capacitor
  -> Cliente API frontend
  -> Backend Express
  -> Validadores / Middleware
  -> Controllers
  -> Services
  -> Repositories
  -> Supabase / Stripe / Firebase
```

## 3. Separacion Frontend/Backend

### Frontend

El frontend vive en `frontend/` y se encarga de:

- Pantallas de login, catalogo, carrito, checkout, perfil e historial.
- Paneles de padre/hijo para vinculaciones y pedidos infantiles.
- Panel de administracion.
- Persistencia local de sesion, preferencias y carrito cuando aplica.
- Consumo de endpoints mediante `frontend/src/api`.

Los modulos de API mas relevantes son:

- `frontend/src/api/client.js`: cliente HTTP base.
- `frontend/src/api/auth.api.js`: autenticacion, perfil y sesion.
- `frontend/src/api/products.api.js`: productos y menu.
- `frontend/src/api/orders.api.js`: pedidos y checkout.
- `frontend/src/api/family.api.js`: vinculacion padre-hijo.
- `frontend/src/api/admin.api.js`: operaciones administrativas.

### Backend

El backend vive en `backend/` y expone una API REST. Sus responsabilidades principales son:

- Registro, login, refresh y logout.
- Validacion de JWT y control de roles.
- Catalogo de productos.
- Pedidos normales de adultos.
- Pedidos de hijos con aprobacion parental.
- Gestion familiar padre-hijo.
- Administracion de usuarios, pedidos y logs de fraude.
- Creacion de sesiones de pago con Stripe.
- Integracion con Supabase.

La API se monta desde `backend/src/app/createServerApp.js`, donde se registran los grupos de rutas y los manejadores globales.

## 4. Estructura De Carpetas

Estructura principal del repositorio:

```txt
AppCafeteria/
  backend/
    db/
      init.sql
      setup.js
      migrations/
    src/
      app/
      config/
      middlewares/
      modules/
        admin/
        childOrders/
        family/
      observability/
      routes/
      services/
      shared/
      utils/
      appContext.js
      index.js
      server.js
  frontend/
    src/
      api/
      components/
      features/
      hooks/
      lib/
      pages/
      styles/
      App.jsx
      AppMovil.jsx
      main.jsx
    android/
    ios/
    mockup/
    reference/
  observability/
  docker-compose.yml
  docker-compose.elk.yml
  AGENTS.md
  API_CONTRACT.md
  QUICK_START.md
  README_MAESTRO.md
  SISTEMA_AUTENTICACION.md
  SISTEMA_PADRE_HIJO.md
```

### Convenciones Del Backend

- `routes`: definen endpoints, middlewares y delegan en controllers.
- `controllers`: traducen `req`/`res` hacia servicios.
- `services`: contienen reglas de negocio y orquestacion.
- `repositories`: encapsulan acceso a Supabase.
- `validators`: validan y normalizan payloads.
- `middlewares`: autenticacion, roles, rate limiting, sanitizacion y errores.
- `config`: variables, CORS, Supabase y Stripe.
- `observability`: logs HTTP y Sentry.
- `shared/errors`: errores tipados como `AppError`.

### Convenciones Del Frontend

- `api`: cliente HTTP y funciones por dominio.
- `components`: componentes reutilizables.
- `features`: funcionalidades agrupadas por dominio.
- `hooks`: logica reutilizable de UI/sesion.
- `lib`: utilidades compartidas y compatibilidad con codigo previo.
- `pages`: vistas principales.
- `styles`: estilos globales y variables.

## 5. Flujo De Autenticacion JWT

El sistema usa JWT para sesiones autenticadas.

1. El usuario envia credenciales a `POST /api/auth/login` o datos de registro a `POST /api/auth/register`.
2. El backend valida el payload con esquemas de validacion.
3. El servicio de autenticacion verifica o crea el usuario en Supabase.
4. Las contrasenas se gestionan con hash mediante `bcryptjs`.
5. El backend emite un access token JWT con datos minimos del usuario:

```txt
id
email
role
isAdult
profileId
```

6. Tambien puede emitir refresh token, almacenado de forma hasheada en la tabla `auth_refresh_tokens` cuando la migracion esta disponible.
7. El frontend envia el access token en:

```http
Authorization: Bearer <token>
```

8. `requireAuth` valida firma y expiracion del token.
9. Los middlewares de rol (`requireRole`, `requireAdultUser`, `requireAdmin`) autorizan la accion.
10. `POST /api/auth/refresh` renueva la sesion usando refresh token.
11. `POST /api/auth/logout` cierra la sesion e invalida el refresh token cuando aplica.

Endpoints principales:

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`
- `POST /api/auth/reset-password`
- `GET /api/auth/me`
- `PUT /api/auth/profile`
- `GET /api/auth/favorites`
- `PUT /api/auth/favorites`

## 6. Roles De Usuario

El backend reconoce estos roles:

- `admin`: administra usuarios, productos, pedidos, metricas y logs de seguridad.
- `parent`: usuario adulto con capacidad de vincular hijos y aprobar pedidos infantiles.
- `child`: usuario menor; puede vincularse a padres y crear pedidos pendientes de aprobacion.
- `customer`: usuario general/adulto para compras normales.

Reglas importantes:

- No se confia en roles enviados por el frontend.
- Los roles salen del usuario autenticado y del JWT emitido por backend.
- Las acciones de adulto usan `requireAdultUser`, que bloquea menores incluso si intentan llamar endpoints de adulto.
- Las acciones administrativas requieren `admin`.
- Las acciones de hijo requieren `child`.

## 7. Flujo De Pedidos

### Pedido Normal De Adulto

1. El usuario adulto navega el menu publico (`GET /api/menu`).
2. Agrega productos al carrito desde el frontend.
3. El frontend envia el pedido a:

```http
POST /api/orders
```

o crea checkout con:

```http
POST /api/stripe/create-checkout-session
```

4. El backend valida items, cantidades y usuario adulto.
5. El servicio calcula/importa el total, crea el pedido y, si corresponde, solicita sesion de pago a Stripe.
6. El usuario puede consultar sus pedidos:

```http
GET /api/orders/my
GET /api/orders/:id
```

### Pedido De Hijo

1. El padre obtiene su token familiar:

```http
GET /api/parent/token
```

2. El hijo solicita vinculacion:

```http
POST /api/child/link-parent
```

3. El padre revisa solicitudes:

```http
GET /api/parent/link-requests
```

4. El padre aprueba o rechaza:

```http
PUT /api/parent/link-requests/:id/approve
PUT /api/parent/link-requests/:id/reject
```

5. El hijo crea un pedido:

```http
POST /api/child/orders
```

6. El pedido queda en estado `pending_approval`.
7. El padre consulta los pedidos:

```http
GET /api/parent/child-orders
GET /api/parent/orders/:id
```

8. El padre decide:

```http
PUT /api/parent/orders/:id/approve
PUT /api/parent/orders/:id/modify
PUT /api/parent/orders/:id/reject
PUT /api/parent/orders/:id/pay
```

Estados habituales:

- `pending_approval`: creado por el hijo, pendiente de revision.
- `approved`: aprobado por el padre.
- `modified`: ajustado por el padre.
- `paid`: pagado y confirmado.
- `rejected`: rechazado.
- `cancelled`: cancelado.

## 8. Integracion Con Supabase

Supabase es la fuente principal de datos. La configuracion se centraliza en:

```txt
backend/src/config/supabase.js
```

Los repositorios reciben el cliente de Supabase desde el contexto de aplicacion y encapsulan las consultas. Esto evita que controladores y componentes frontend conozcan detalles de persistencia.

Datos principales gestionados en Supabase:

- Usuarios y perfiles.
- Tokens familiares de padres.
- Vinculos padre-hijo.
- Productos y menu.
- Pedidos normales.
- Pedidos infantiles.
- Refresh tokens.
- Notificaciones.
- Logs de fraude/seguridad.

Variables necesarias:

```env
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_ANON_KEY=
```

El backend usa una clave de servicio para operaciones protegidas del servidor. Esa clave nunca debe exponerse al frontend.

## 9. Integracion Con Stripe

Stripe se usa desde el backend para pagos. La configuracion se centraliza en:

```txt
backend/src/config/stripe.js
```

Flujo general:

1. El frontend envia los items del carrito al backend.
2. El backend valida el pedido y el usuario.
3. El backend crea una sesion de checkout con Stripe usando `STRIPE_SECRET_KEY`.
4. El frontend redirige al usuario al flujo de pago.
5. Tras el pago, el pedido puede marcarse como pagado segun el flujo implementado.

Endpoint principal:

```http
POST /api/stripe/create-checkout-session
```

Variable necesaria:

```env
STRIPE_SECRET_KEY=
```

Existe `DEV_BYPASS_STRIPE_PAYMENT` para desarrollo local. No debe activarse en produccion ni en hosting.

## 10. Medidas De Seguridad

El backend incluye varias medidas transversales:

- `helmet` para cabeceras HTTP seguras.
- CORS configurable por entorno.
- `express.json` y `express.urlencoded` con limites de tamano.
- Sanitizacion de entradas con `sanitizeRequestInputs`.
- Rate limiting general y limites especificos para login, registro y vinculacion.
- Validacion de payloads con `zod`.
- JWT firmado con `JWT_SECRET`.
- Access tokens con TTL configurable.
- Refresh tokens aleatorios, largos y almacenados como hash.
- Hash de contrasenas con `bcryptjs`.
- Autorizacion por rol en backend.
- Manejador comun de errores con `AppError`.
- Ocultacion de detalles internos en produccion.
- Logs HTTP con redaccion de datos sensibles cuando aplica.
- Integracion Sentry opcional.
- Prevencion de fraude para flujos familiares y pedidos infantiles.

Reglas operativas:

- No guardar secretos reales en el repositorio.
- No usar claves de Supabase/Stripe/Firebase en frontend.
- No confiar en `role`, `isAdult` o identificadores enviados por cliente.
- En produccion, `JWT_SECRET` es obligatorio.
- Configurar `FRONTEND_URL` con origenes permitidos.

## 11. Mejoras Aplicadas De Clean Code

El proyecto ha ido separando responsabilidades para reducir mezcla de logica:

- Extraccion de rutas por dominio: auth, orders, products, family, childOrders y admin.
- Separacion backend en controllers, services, repositories y validators.
- Centralizacion de errores con `AppError` y middleware global.
- Centralizacion del contexto de app en `appContext.js`.
- Middleware reutilizable para autenticacion, roles, sanitizacion y rate limiting.
- Cliente HTTP frontend separado en `frontend/src/api`.
- Funciones de API frontend por dominio para evitar duplicar contratos.
- Validadores con esquemas en backend antes de ejecutar negocio.
- Servicios dedicados para tokens, password reset y notificaciones.
- Observabilidad aislada en `backend/src/observability`.
- Componentes y hooks frontend extraidos progresivamente para reducir componentes gigantes.

Estas mejoras buscan que cada cambio sea pequeno, verificable y compatible con la funcionalidad actual.

## 12. Como Ejecutar El Proyecto

### Backend

Instalar dependencias:

```bash
cd backend
npm install
```

Ejecutar en desarrollo:

```bash
cd backend
npm run dev
```

Ejecutar en modo normal:

```bash
cd backend
npm start
```

Por defecto, el backend usa `PORT=3000` si no se define otro puerto.

### Frontend

Instalar dependencias:

```bash
cd frontend
npm install
```

Ejecutar en desarrollo:

```bash
cd frontend
npm run dev
```

Compilar:

```bash
cd frontend
npm run build
```

Vista previa de build:

```bash
cd frontend
npm run preview
```

### Docker Local

El repositorio incluye `docker-compose.yml` para servicios locales auxiliares y `docker-compose.elk.yml` para observabilidad ELK.

```bash
docker-compose up -d
```

## 13. Variables De Entorno Necesarias

### Backend (`backend/.env`)

Basado en `backend/.env.example`:

```env
NODE_ENV=development
PORT=3000
FRONTEND_URL=http://localhost:5173

SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=replace-me
SUPABASE_SECRET_KEY=
SUPABASE_SERVICE_KEY=
SUPABASE_ANON_KEY=replace-me

JWT_SECRET=replace-me
JWT_ACCESS_TOKEN_TTL=15m
JWT_REFRESH_TOKEN_TTL_DAYS=30

STRIPE_SECRET_KEY=sk_test_replace_me
DEV_BYPASS_STRIPE_PAYMENT=false

FIREBASE_SERVICE_ACCOUNT_JSON=

SENTRY_DSN=
SENTRY_ENVIRONMENT=development
SENTRY_RELEASE=
SENTRY_TRACES_SAMPLE_RATE=
SENTRY_ENABLED=false

LOG_LEVEL=info
LOGSTASH_TCP_URL=
```

Notas:

- `JWT_SECRET` debe ser largo y aleatorio.
- `SUPABASE_SERVICE_ROLE_KEY` y `STRIPE_SECRET_KEY` son secretos de servidor.
- `DEV_BYPASS_STRIPE_PAYMENT` solo es aceptable en desarrollo local.
- `FIREBASE_SERVICE_ACCOUNT_JSON` solo es necesario si se usan push notifications.
- Sentry y Logstash son opcionales.

### Frontend (`frontend/.env`)

Basado en `frontend/.env.example`:

```env
VITE_API_URL=http://localhost:3000
VITE_API_FALLBACK_URL=
VITE_RAILWAY_API_URL=
BACKEND_URL=

VITE_APP_VERSION=local

VITE_SENTRY_DSN=
VITE_SENTRY_ENVIRONMENT=development
VITE_SENTRY_RELEASE=
VITE_SENTRY_TRACES_SAMPLE_RATE=
VITE_SENTRY_REPLAY_SESSION_SAMPLE_RATE=
VITE_SENTRY_REPLAY_ERROR_SAMPLE_RATE=
VITE_SENTRY_ENABLED=false
```

Notas:

- Las variables expuestas con prefijo `VITE_` pueden llegar al navegador.
- No colocar claves privadas de Supabase, Stripe, Firebase ni JWT en el frontend.
- `VITE_API_URL` debe apuntar al backend activo.

## 14. Checklist De Finalizacion

Antes de cerrar un cambio relevante:

- El frontend compila con `npm run build`.
- El backend arranca con sus variables requeridas.
- Los endpoints criticos mantienen sus contratos.
- No hay secretos reales en `.env.example` ni en archivos versionados.
- Login, catalogo, pedidos, familia y administracion conservan su comportamiento esperado.
- Cualquier prueba no ejecutada o riesgo conocido queda documentado.
