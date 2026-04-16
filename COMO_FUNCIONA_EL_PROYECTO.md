# Como Funciona El Proyecto

Guia funcional del repositorio para entender que hace cada parte del sistema y donde vive esa logica en el codigo.

## 1. Vision general

AppCafeteria es una aplicacion con frontend React/Vite y backend Node.js/Express. El flujo principal es:

1. El usuario se registra o inicia sesion.
2. El frontend guarda el JWT en `localStorage`.
3. El backend expone endpoints para catalogo, perfil, favoritos, pedidos, vinculacion familiar y administracion.
4. Los datos se persisten preferentemente en PostgreSQL local y, cuando aplica, tambien puede operar con Supabase.
5. Si no hay almacenamiento disponible en algunos casos concretos, el backend usa datos mock para no romper la app.

## 2. Estructura real del proyecto

### Frontend

- `frontend/src/AppMobile.jsx`: orquesta toda la aplicacion cliente.
- `frontend/src/components/`: UI principal, login, catalogo, carrito, historial, perfil y modales.
- `frontend/src/lib/api.js`: cliente HTTP centralizado.
- `frontend/src/lib/useCart.js`: estado y persistencia local del carrito.
- `frontend/src/lib/pushNotifications.js`: registro de push notifications.

### Backend

- `backend/src/index.js`: punto de entrada.
- `backend/src/server.js`: arranca el servidor.
- `backend/src/app/createServerApp.js`: registra todas las rutas.
- `backend/src/appContext.js`: crea dependencias compartidas, helpers, auth, validaciones, conexion a datos y utilidades.
- `backend/src/routes/`: separacion por dominios funcionales.
- `backend/db/init.sql`: esquema base y columnas principales.

## 3. Como arranca el backend

El backend se inicia desde `backend/src/index.js`, que importa `server.js`. Ese archivo crea la app con `createServerApp()` y llama a `startServer()`.

Dentro de `backend/src/app/createServerApp.js` se monta la API en este orden:

1. Rutas del sistema.
2. Autenticacion.
3. Pedidos normales.
4. Relaciones familiares.
5. Catalogo y productos.
6. Administracion.
7. Pedidos de hijos.
8. Handler 404.

La mayor parte de la configuracion compartida nace en `backend/src/appContext.js`, que:

- carga variables de entorno;
- crea `express`, `cors` y middlewares;
- inicializa PostgreSQL, Supabase y Stripe;
- expone helpers de validacion y normalizacion;
- expone middlewares como `authenticateToken` y `requireAdmin`.

## 4. Como arranca el frontend

El frontend exporta `AppMobile` como aplicacion principal desde `frontend/src/App.jsx`.

`frontend/src/AppMobile.jsx` hace estas tareas:

1. Rehidrata sesion desde `localStorage`.
2. Si hay token, valida el usuario real llamando a `GET /api/auth/me`.
3. Decide que pantalla mostrar:
   - login si no hay usuario;
   - dashboard admin si el rol es `admin`;
   - aplicacion principal para el resto.
4. Inicializa push notifications cuando ya existe un usuario autenticado.
5. Controla modales globales como carrito, historial, perfil y vinculacion familiar.

## 5. Autenticacion y sesion

La autenticacion vive principalmente en `backend/src/routes/authRoutes.js` y `frontend/src/components/FancyLogin.jsx`.

### Registro

- El frontend envia `name`, `email`, `password` y `birthDate`.
- El backend calcula si el usuario es adulto o menor.
- Segun edad y reglas internas, asigna `role`, `is_adult` y, si procede, `parent_token`.
- Devuelve JWT y perfil inicial.

### Login

- El frontend llama a `loginUser()`.
- El backend valida credenciales y firma un JWT con `id`, `email`, `role` e `isAdult`.
- El token se guarda en `localStorage` como `cafeteria_token`.
- El usuario resumido se guarda como `cafeteria_user`.

### Sesion persistente

Al recargar la app:

- si hay token, el frontend consulta `GET /api/auth/me`;
- si la validacion falla, limpia `cafeteria_token` y `cafeteria_user`;
- si funciona, reconstruye el usuario activo.

## 6. Catalogo de productos

El catalogo se sirve desde `backend/src/routes/catalogRoutes.js`.

### Lectura publica del menu

- Endpoint: `GET /api/menu`
- Devuelve solo productos activos y aprobados sanitariamente.
- Intenta leer primero de PostgreSQL local.
- Si falla, intenta Supabase.
- Si tampoco esta disponible, recurre al almacen mock en memoria.

### Gestion admin de productos

- Endpoints: `GET /api/products`, `POST /api/products`, `PUT /api/products/:id`, `DELETE /api/products/:id`
- Requieren `authenticateToken` y `requireAdmin`.
- El backend normaliza payloads con helpers de `appContext.js`.
- Si faltan campos tecnicos como ingredientes, alergenos o nutricion, intenta inferirlos automaticamente a partir del nombre y categoria.

### Transformacion en frontend

`frontend/src/components/ProductsGrid.jsx` descarga el catalogo con `getActiveProducts()` y adapta la respuesta al formato visual de las tarjetas:

- normaliza categoria `sandwich -> bocadillos`;
- parsea JSON de ingredientes, opciones, badges y alergenos;
- infiere datos tecnicos si faltan;
- aplica reglas de "modo especial" para ciertos usuarios.

## 7. Navegacion principal en cliente

La pantalla principal vive en `frontend/src/components/MainScreen.jsx`.

### Flujo base

- `activeSection = 'catalog'` muestra categorias y productos.
- `activeSection = 'favorites'` muestra solo favoritos.
- `BottomNav` cambia entre historial, carrito y favoritos.
- `Categories` controla categoria y subcategoria.
- `ProductsGrid` renderiza el grid y abre `ProductModal` para detalle.

La app usa varios modales en lugar de muchas rutas SPA tradicionales. La navegacion real es mas "estado de componentes" que "router completo".

## 8. Carrito

La logica del carrito esta en `frontend/src/lib/useCart.js`.

### Como funciona

- Se persiste en `localStorage` bajo `cafeteria-cart`.
- Los descuentos se guardan en `cafeteria-discount`.
- El cupon aplicado se guarda en `cafeteria-coupon`.
- Un item se considera el mismo producto si coincide el `id` y tambien las `chosen_options`.

### Acciones disponibles

- `addItem`
- `updateQuantity`
- `removeItem`
- `clearCart`
- `applyCoupon`
- `removeCoupon`

`CartModal.jsx` muestra el contenido del carrito y abre `CheckoutModal` para seguir al pago.

## 9. Pedidos normales

Los pedidos estandar viven en `backend/src/routes/orderRoutes.js`.

### Creacion de pedido

- Endpoint: `POST /api/orders`
- Requiere usuario autenticado.
- Bloquea expresamente perfiles `child`, que deben usar el flujo parental.
- Valida items y calcula total con `validateOrderItems`.
- Guarda cabecera del pedido y lineas.

### Consulta de pedidos

- Endpoint: `GET /api/orders/my`
- Devuelve historial del usuario.
- Soporta filtro por estado y limite.
- Adapta la respuesta segun si la fuente real es `pedidos/lineas_pedido` o `orders/order_items`.

### Checkout con Stripe

- Endpoint: `POST /api/stripe/create-checkout-session`
- Convierte el carrito validado en `line_items`.
- Usa `FRONTEND_URL` para construir `success_url` y `cancel_url`.

## 10. Sistema padre-hijo

La logica principal vive en `backend/src/routes/familyRoutes.js`.

### Token de vinculacion

- Endpoint: `GET /api/parent/token`
- Solo usuarios adultos pueden tener token.
- Si no existe, se genera y se guarda.

### Solicitud de vinculacion

- Endpoint: `POST /api/child/link-parent`
- Solo un hijo autenticado puede solicitarla.
- El hijo envia `parentToken`.
- El backend valida:
  - que el token exista;
  - que el usuario destino sea apto para rol parental;
  - limites de vinculacion;
  - ausencia de duplicados pendientes.

Si todo es correcto:

- crea un registro en `parent_child_links` con estado `pending`;
- registra evento de seguridad;
- envia notificacion al padre.

### Gestion por el padre

Los padres pueden:

- listar solicitudes pendientes;
- aprobarlas;
- rechazarlas;
- consultar hijos ya vinculados.

La aprobacion establece o reutiliza el `spending_limit`, que luego se usa al crear pedidos infantiles.

## 11. Pedidos de hijos

La logica esta en `backend/src/routes/childOrderRoutes.js`.

### Creacion

- Endpoint: `POST /api/child/orders`
- Solo para `role === 'child'`.
- Usa el vinculo activo con un padre.
- Valida productos, total y limite de gasto.
- Exige un minimo de 5 EUR.
- Guarda el pedido como `pending`.
- Notifica al padre.

### Consulta

- `GET /api/child/orders`: pedidos del hijo autenticado.
- Existen tambien endpoints de lado padre para revisar, aprobar, rechazar, modificar y marcar como pagado.

En frontend, estas operaciones se consumen desde `frontend/src/lib/api.js` y se muestran en modales o listas especializadas.

## 12. Favoritos

Los favoritos se guardan como lista de IDs en la columna `users.favoritos`.

### Backend

- `GET /api/auth/favorites`
- `PUT /api/auth/favorites`

Antes de devolver o guardar, el backend normaliza la lista para:

- convertir valores a string;
- eliminar vacios;
- quitar duplicados.

### Frontend

`frontend/src/components/ProductsGrid.jsx`:

- carga favoritos del usuario al montar;
- fusiona favoritos remotos con antiguos favoritos locales si existieran;
- elimina el almacenamiento legado;
- actualiza la UI de forma optimista al pulsar el corazon.

La vista "Favoritos" es el mismo grid de productos filtrado por `favoriteIds`.

## 13. Perfil de usuario

El perfil se obtiene con `GET /api/auth/me` y se actualiza con `PUT /api/auth/profile`.

Entre los campos relevantes que el frontend usa o persiste estan:

- `id`
- `email`
- `name`
- `alias`
- `role`
- `isAdult`
- `parentToken`
- `specialCode`
- `favorites`
- `created_at`

`ProfileModal` se encarga de mostrar y editar datos del usuario desde cliente.

## 14. Modo especial

En `ProductsGrid.jsx` existe una logica adicional llamada aqui "modo especial".

Se activa cuando:

- el usuario es adulto;
- y `specialCode` es exactamente `ayuda`.

Cuando esta activo:

- solo se muestran productos con el alergeno `ayuda`;
- esos productos aparecen a `0 EUR`;
- cambia el mensaje visual de cabecera del catalogo.

## 15. Notificaciones push

En frontend, `frontend/src/lib/pushNotifications.js` intenta usar el plugin Capacitor `PushNotifications`.

Flujo:

1. La app pide permisos.
2. Registra listeners una sola vez.
3. Si recibe token del dispositivo, lo envia al backend con `registerDeviceToken`.
4. Si llega una notificacion en primer plano, se muestra un toast.

En backend, la gestion vive en `authRoutes.js` y `services/notificationService.js`, donde se registran dispositivos, se listan notificaciones y se marcan como leidas.

## 16. Seguridad y anti-fraude

Hay dos piezas principales:

- `backend/src/middleware/rateLimiter.js`
- `backend/src/middleware/fraudPrevention.js`

Estas cubren:

- limitacion de intentos de login y registro;
- limites para solicitudes de vinculacion;
- registro de eventos sospechosos;
- scoring de confianza;
- validaciones extra en flujos sensibles.

Parte de esos eventos aparece en el area de administracion.

## 17. Administracion

La API admin esta en `backend/src/routes/adminRoutes.js`.

Incluye, entre otras, estas capacidades:

- estadisticas globales;
- consulta de logs de fraude;
- listado de usuarios;
- bloqueo y desbloqueo de usuarios;
- cola o vision operativa de pedidos segun datos disponibles.

En frontend, `frontend/src/pages/AdminDashboard.jsx` consume esos endpoints cuando el usuario autenticado tiene rol `admin`.

## 18. Almacenamiento y fuentes de datos

El sistema esta preparado para trabajar con varias fuentes:

### PostgreSQL local

Es la primera opcion en muchas rutas y se usa mucho durante desarrollo.

### Supabase

Se usa como fuente alternativa o primaria en determinados despliegues. El codigo detecta su disponibilidad y cambia de estrategia.

### Mock store en memoria

Se usa como ultimo fallback para catalogo y algunos escenarios no criticos.

Esto significa que algunas rutas contienen varios caminos de lectura/escritura segun la infraestructura disponible.

## 19. Esquema de datos importante

Campos y tablas que conviene conocer:

- `users`: sesion, rol, edad, alias, token parental, favoritos, verificacion.
- `productos_menu`: catalogo.
- `orders` y `order_items`: flujo clasico.
- `pedidos` y `lineas_pedido`: otra estructura historica compatible.
- `parent_child_links`: relacion padre-hijo.
- `child_orders` y `child_order_items`: flujo de pedidos infantiles.
- `fraud_prevention_log`: eventos de seguridad.

## 20. Donde tocar cada aspecto

- Login/registro/perfil: `backend/src/routes/authRoutes.js`, `frontend/src/components/FancyLogin.jsx`, `frontend/src/components/ProfileModal.jsx`
- Catalogo y productos: `backend/src/routes/catalogRoutes.js`, `frontend/src/components/ProductsGrid.jsx`
- Carrito y checkout: `frontend/src/lib/useCart.js`, `frontend/src/components/CartModal.jsx`, `backend/src/routes/orderRoutes.js`
- Favoritos: `frontend/src/components/ProductCard.jsx`, `frontend/src/components/ProductsGrid.jsx`, `backend/src/routes/authRoutes.js`
- Padre-hijo: `backend/src/routes/familyRoutes.js`, `frontend/src/components/LinkParentModal.jsx`
- Pedidos de hijos: `backend/src/routes/childOrderRoutes.js`, componentes de historial y gestion parental
- Admin: `backend/src/routes/adminRoutes.js`, `frontend/src/pages/AdminDashboard.jsx`
- Push notifications: `frontend/src/lib/pushNotifications.js`, `backend/src/services/notificationService.js`

## 21. Recomendacion para nuevos cambios

Antes de modificar una funcionalidad:

1. Revisa primero `frontend/src/lib/api.js` para ver que endpoint usa el cliente.
2. Busca la ruta correspondiente en `backend/src/routes/`.
3. Comprueba en `backend/src/appContext.js` si hay helpers reutilizables para esa logica.
4. Verifica si la funcionalidad tiene fallback entre PostgreSQL, Supabase y mock.

Esa secuencia evita romper rutas antiguas o flujos alternativos que siguen activos en el proyecto.
