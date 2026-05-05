# Documentación Técnica Integral - AppCafeteria

Este documento es un análisis completo de todo el código fuente actual, generado tras revisar la estructura, flujos de datos y lógica de la aplicación tanto en Frontend como en Backend.

---

## 1. Visión General y Arquitectura

El proyecto es una aplicación full-stack con una arquitectura Cliente-Servidor (SPA/API REST).

- **Frontend:** React + Vite + Ionic (para PWA y compilación móvil nativa mediante Capacitor).
- **Backend:** Node.js + Express.js.
- **Base de Datos y Backend as a Service:** Supabase (PostgreSQL gestionado).
- **Servicios Externos:** Supabase es el unico servicio externo vigente documentado para persistencia, autenticacion de datos de aplicacion y consultas del backend.

El flujo de información es estrictamente unidireccional para las peticiones HTTP: 
`Componentes UI (React) -> api/lib del Frontend -> Rutas Backend (Express) -> Controladores/Servicios -> Repositorios Supabase`.

---

## 2. Modelos de Datos Centrales

El backend se apoya en un esquema relacional. Las entidades principales son:

### `users`
- **id**: UUID
- **email / password**: Autenticación (bcrypt).
- **role**: `admin`, `user`, `child`.
- **is_adult**: Booleano clave para separar flujos.
- **parent_token**: Código único si el usuario es adulto, usado para que los hijos se vinculen.
- **favoritos**: JSON o array de IDs de productos.

### `productos_menu` (Catálogo)
- **id**: UUID
- **nombre / descripcion / precio**: Datos básicos.
- **imagen_url**: Asset visual.
- **ingredientes / alergenos / informacion_nutricional**: Arrays/JSON parseados en frontend para la ficha técnica.
- **activo / aprobado_sanidad**: Flags de seguridad.

### `orders` y `order_items` (Compras Adultos)
- **id**, **user_id**, **total**, **status** (`pending`, `paid`, `cancelled`).
- **payment_method / payment_status**: Datos del metodo y estado de pago registrados en Supabase.
- `order_items` guarda una foto inmutable de qué se compró y sus opciones.

### `child_orders` y `parent_child_links` (Compras Menores)
- **parent_child_links**: Une a un adulto (`parent_id`) con un menor (`child_id`), definiendo un límite de gasto (`spending_limit`) y un estado (`pending`, `approved`).
- **child_orders**: Compras de menores que esperan aprobación (`status: pending_parent_approval`).

---

## 3. Frontend: Estructura y Flujo

El frontend (en `frontend/src`) no usa un enrutador clásico multiruta, sino que controla la interfaz basándose en estados desde `AppMovil.jsx`.

### 3.1. Orquestación (`AppMovil.jsx` y `main.jsx`)
- **`main.jsx`**: Arranca React e inicializa `CartProvider`.
- **`AppMovil.jsx`**: Hookea la sesión (`useCargaSesion`).
  - Si el rol es `admin`: Monta `<AdminDashboard />`.
  - Si no hay usuario: Monta `<FancyLogin />`.
  - Si hay usuario estándar/niño: Monta `<MainScreen />`.

### 3.2. Capa de Servicios y Estado (`/lib`)
- **`api.js`**: Único archivo responsable de los `fetch()`. Configura el encabezado `Authorization: Bearer <token>` de forma automática.
- **`useCart.js` y `CartContext.jsx`**: Un hook masivo. Maneja el estado de `cartItems`, aplica lógica de cupones (`applyCoupon`), guarda en `localStorage` ante cada cambio y calcula el subtotal.
- **`orderService.js`**: Decide qué endpoint usar al pagar. Si `isAdult` es falso, redirige al flujo de `POST /api/child/orders` en vez de `POST /api/orders`.

### 3.3. Componentes Visuales (`/components`)
- **Catálogo**: `<ProductsGrid />` consulta la API. Aplica filtros. Renderiza `<ProductCard />`. También maneja el "Modo Especial" (si el usuario tiene el código secreto `ayuda`, filtra y pone precios a 0).
- **Modales Globales**: En lugar de páginas, la app "flota" vistas:
  - `<CartModal />`: Muestra el carrito.
  - `<ProfileModal />`: Permite cambiar el alias o ver la familia.
  - `<CheckoutModal />`: Muestra el resumen antes de confirmar el pedido.
- **Familia**: `<LinkParentModal />` (El menor introduce el código del padre) y `<LinkRequestsList />` (El padre aprueba la solicitud).

---

## 4. Backend: API y Lógica de Negocio

El código de `backend/src` sigue un patrón Middleware -> Route -> Controller -> Service -> Repository -> Supabase.

### 4.1. Core y Seguridad (`appContext.js` y Middlewares)
- **`appContext.js`**: Inicializa las variables de entorno, el cliente Supabase y utilidades compartidas. Expone `authenticateToken` (valida JWT) y `requireAdmin`.
- **`rateLimiter.js`**: Protege contra ataques DDOS o Brute Force en `/api/auth/login`.
- **`fraudPrevention.js`**: Mide un `trust_score` en tiempo real. Si detecta acciones raras (muchos logins fallidos), puede bloquear al usuario de hacer compras grandes.

### 4.2. Dominios y Rutas

#### A. Autenticación (`authRoutes.js`)
- `POST /register`: Crea el usuario. Identifica si es adulto basado en `birthDate`.
- `POST /login`: Retorna JWT.
- `GET /me`: El frontend lo usa para rehidratar la sesión y comprobar si el token sigue vivo.

#### B. Catálogo (`catalogRoutes.js`)
- `GET /menu`: Consulta el catalogo vigente desde Supabase.
- Resto de verbos (POST, PUT, DELETE) protegidos por `requireAdmin`.

#### C. Pedidos Adultos (`orderRoutes.js`)
- `POST /orders`: Valida el carrito y registra el pedido en Supabase.
- `GET /orders/my` y `GET /orders/:id`: Consultan historial y detalle de pedidos desde Supabase.

#### D. Sistema Padre-Hijo (`familyRoutes.js` y `childOrderRoutes.js`)
- **Padre:** `GET /parent/token` le da al adulto un código (ej: `X7A-9P2`).
- **Hijo:** `POST /child/link-parent` el niño envía el código.
- **Aprobaciones:** Cuando el hijo crea un pedido, cae en `/child/orders`. El padre lo revisa desde su vista y lanza `POST /child/orders/:id/approve`; el estado queda persistido en Supabase.

#### E. Administración (`adminRoutes.js`)
- Endpoints analíticos (`/stats`, `/users`, `/fraud`) usados por `<AdminDashboard />` en el frontend para gestionar la cafetería.

---

## 5. Variables de Entorno (.env)

El sistema requiere configuraciones críticas para enlazar Supabase y proteger la API:
- **`JWT_SECRET`**: Seguridad para encriptar los tokens.
- **`SUPABASE_URL`**: URL del proyecto Supabase.
- **`SUPABASE_SERVICE_ROLE_KEY`** o **`SUPABASE_SECRET_KEY`**: Clave de servidor para que el backend consulte y escriba datos.
- *(En el frontend)* **`VITE_API_URL`**: Hacia dónde apuntan las llamadas de `api.js`.

---

## 6. Monitoreo y Observabilidad

El proyecto registra actividad del backend con logs estructurados:
- **Pino HTTP**: El backend usa este logger (`httpLogger.js`) para emitir logs JSON y ocultar informacion sensible como passwords y tokens.
- Cualquier integracion externa historica debe considerarse legacy hasta que se reactive de forma explicita y se actualicen codigo, variables y documentacion.

---
*Esta documentación ha sido generada tras un escaneo profundo de la versión actual del repositorio.*
