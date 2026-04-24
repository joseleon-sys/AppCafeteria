# Guia: que hace cada `.js` y `.jsx`

Este documento sirve como mapa del proyecto.

No explica cada linea todavia.
Su objetivo es decirte, de forma clara, **para que sirve cada archivo JavaScript del codigo fuente**.

La guia esta centrada en:

- `backend/src`
- `frontend/src`

No incluye dependencias, CSS, imagenes, Android/iOS, ni archivos generados.

---

## Como leer esta guia

- **Ruta**: donde esta el archivo.
- **Que hace**: su responsabilidad principal.
- **Cuando se usa**: en que momento entra en juego dentro de la app.

---

## Backend

### Arranque y contexto

#### `backend/src/index.js`
**Que hace**  
Es el punto de entrada mas pequeño del backend. Solo importa `server.js`.

**Cuando se usa**  
Cuando arrancas el backend, este archivo dispara la carga del servidor.

#### `backend/src/server.js`
**Que hace**  
Crea la app del backend llamando a `createServerApp()` y luego arranca el servidor con `iniciarServidor()`.

**Cuando se usa**  
Es el arranque real del backend.

#### `backend/src/legacyServer.js`
**Que hace**  
Importa `server.js` para mantener compatibilidad con una forma antigua de arrancar el servidor.

**Cuando se usa**  
Cuando alguna parte vieja del proyecto o del despliegue sigue apuntando a este archivo.

#### `backend/src/appContext.js`
**Que hace**  
Es uno de los archivos mas importantes del backend. Prepara el contexto comun de la aplicacion:

- crea la app Express
- carga variables de entorno
- configura Supabase
- configura Stripe
- configura JWT
- activa middlewares globales
- define helpers reutilizables
- prepara funciones como `autenticarToken`, `requireAdmin` o `puedeActuarComoPadre`

**Cuando se usa**  
Cada vez que se construye la app del backend.

#### `backend/src/app/createServerApp.js`
**Que hace**  
Usa `crearContextoApp()` y registra todas las rutas del backend:

- sistema
- autenticacion
- pedidos
- familia
- catalogo
- administracion
- pedidos infantiles

Tambien conecta los manejadores globales de error.

**Cuando se usa**  
Cuando `server.js` necesita montar la app completa.

---

### Middlewares

#### `backend/src/middleware/rateLimiter.js`
**Que hace**  
Aplica limites simples en memoria para frenar abusos:

- demasiados intentos de login
- demasiados registros
- demasiadas solicitudes de vinculacion

Tambien tiene una funcion para obtener la IP del cliente.

**Cuando se usa**  
En rutas sensibles como login, registro y vinculacion padre-hijo.

#### `backend/src/middleware/fraudPrevention.js`
**Que hace**  
Gestiona funciones de seguridad y fraude:

- registra eventos de seguridad
- calcula un `trust score`
- bloquea acciones si la confianza es baja
- valida limites de relaciones padre-hijo

**Cuando se usa**  
En rutas donde hace falta control extra o trazabilidad de seguridad.

---

### Observabilidad y logs

#### `backend/src/observability/httpLogger.js`
**Que hace**  
Configura el logger HTTP del backend. Da un identificador a cada peticion, oculta datos sensibles y puede reenviar logs a Logstash.

**Cuando se usa**  
En todas las peticiones HTTP del backend.

#### `backend/src/observability/sentry.js`
**Que hace**  
Configura Sentry para capturar errores del backend y registrar respuestas graves del servidor.

**Cuando se usa**  
Durante el arranque y en el manejo de errores del backend.

---

### Rutas

#### `backend/src/routes/systemRoutes.js`
**Que hace**  
Define rutas y handlers tecnicos:

- healthcheck `/api/health`
- 404 global
- manejador global de errores

**Cuando se usa**  
Siempre. Son las rutas y handlers de infraestructura.

#### `backend/src/routes/authRoutes.js`
**Que hace**  
Gestiona autenticacion y perfil del usuario:

- registro
- login
- perfil
- favoritos
- recuperacion de contraseña
- notificaciones del usuario

**Cuando se usa**  
Cuando el frontend necesita crear cuenta, iniciar sesion o consultar datos del usuario.

#### `backend/src/routes/familyRoutes.js`
**Que hace**  
Gestiona la logica padre-hijo:

- generar token de padre
- solicitar vinculacion
- ver solicitudes
- aprobar o rechazar solicitudes
- ver padres vinculados
- ver hijos vinculados

**Cuando se usa**  
Cuando entra en juego la funcionalidad familiar.

#### `backend/src/routes/orderRoutes.js`
**Que hace**  
Gestiona los pedidos de usuarios adultos:

- crear pedidos
- crear sesion de pago Stripe
- consultar historico
- consultar detalle de pedidos

**Cuando se usa**  
Cuando un usuario adulto compra por el flujo normal.

#### `backend/src/routes/childOrderRoutes.js`
**Que hace**  
Gestiona pedidos creados por menores y revisados por padres:

- crear pedido infantil
- ver historico del menor
- ver pedidos de hijos para un padre
- aprobar o rechazar pedidos infantiles

**Cuando se usa**  
Cuando la app trabaja con el flujo de pedido con aprobacion parental.

#### `backend/src/routes/catalogRoutes.js`
**Que hace**  
Gestiona productos y menu:

- ver productos completos como admin
- ver menu publico
- crear productos
- editar productos
- borrar productos

**Cuando se usa**  
Cuando el frontend necesita mostrar el menu o el panel admin gestiona catalogo.

#### `backend/src/routes/adminRoutes.js`
**Que hace**  
Contiene endpoints de administracion:

- estadisticas
- usuarios
- fraude
- bloqueo de usuarios
- cola de pedidos

**Cuando se usa**  
Cuando entra un usuario administrador al panel admin.

---

### Servicios

#### `backend/src/services/notificationService.js`
**Que hace**  
Gestiona notificaciones push y notificaciones internas:

- registrar tokens de dispositivo
- desactivar tokens
- guardar notificaciones
- listar notificaciones
- marcar como leidas
- enviar push mediante Firebase

**Cuando se usa**  
Cuando el sistema quiere avisar a un usuario dentro o fuera de la app.

#### `backend/src/services/passwordResetService.js`
**Que hace**  
Contiene la logica para restablecer la contraseña validando datos del usuario.

**Cuando se usa**  
Cuando un usuario olvida la contraseña y quiere cambiarla.

---

### Utilidades

#### `backend/src/utils/utilidadesApp.js`
**Que hace**  
Es una caja de herramientas general del backend. Contiene funciones de apoyo como:

- parsear arrays y objetos JSON
- normalizar booleanos
- inferir datos tecnicos de productos
- normalizar payloads de productos
- transformar productos para API
- otras utilidades generales del dominio

**Cuando se usa**  
En muchas rutas y helpers del backend.

#### `backend/src/utils/utilidadesAuth.js`
**Que hace**  
Agrupa utilidades pequeñas de autenticacion:

- construir el usuario publico
- firmar JWT
- registrar fallos de validacion de auth

**Cuando se usa**  
Principalmente dentro de `authRoutes.js`.

---

## Frontend

### Arranque de la app

#### `frontend/src/main.jsx`
**Que hace**  
Es el punto de entrada del frontend. Monta React en el DOM y envuelve la app con `CartProvider`.

**Cuando se usa**  
Cuando se carga la aplicacion web.

#### `frontend/src/App.jsx`
**Que hace**  
Es un alias simple que exporta `AppMovil`.

**Cuando se usa**  
Cuando otras partes del frontend esperan importar `App.jsx`.

#### `frontend/src/AppMovil.jsx`
**Que hace**  
Es la raiz visual del frontend. Decide que pantalla mostrar segun el estado:

- login
- pantalla principal
- panel admin
- pantalla de pago exitoso
- modales globales

**Cuando se usa**  
Siempre. Es el gran organizador de la interfaz.

---

### Componentes

#### `frontend/src/components/BottomNav.jsx`
**Que hace**  
Barra inferior con accesos a historial, carrito y favoritos.

#### `frontend/src/components/CartModal.jsx`
**Que hace**  
Modal del carrito donde el usuario revisa productos y va al checkout.

#### `frontend/src/components/CartPanel.jsx`
**Que hace**  
Panel mas completo del carrito con resumen, cupones y total.

#### `frontend/src/components/Categories.jsx`
**Que hace**  
Selector de categorias y subcategorias del catalogo.

#### `frontend/src/components/CheckoutModal.jsx`
**Que hace**  
Modal final donde el usuario confirma el pedido antes de pagar.

#### `frontend/src/components/ChildOrderForm.jsx`
**Que hace**  
Formulario para que un menor envie un pedido al flujo de aprobacion parental.

#### `frontend/src/components/Dialog.jsx`
**Que hace**  
Sistema global de dialogs:

- alert
- confirm
- prompt

Permite abrir cuadros de dialogo desde distintos puntos de la app.

#### `frontend/src/components/FancyLogin.jsx`
**Que hace**  
Pantalla principal de acceso con login, registro y recuperacion de contraseña.

#### `frontend/src/components/HamsterSpinner.jsx`
**Que hace**  
Spinner visual personalizado usado durante cargas.

#### `frontend/src/components/HistoryModal.jsx`
**Que hace**  
Modal para ver el historial de pedidos del usuario.

#### `frontend/src/components/LinkParentModal.jsx`
**Que hace**  
Modal para introducir el token de un padre y enviar una solicitud de vinculacion.

#### `frontend/src/components/LinkRequestsList.jsx`
**Que hace**  
Lista solicitudes familiares para que un adulto las apruebe o rechace.

#### `frontend/src/components/LoadingOverlay.jsx`
**Que hace**  
Capa de bloqueo visual mientras algo esta cargando.

#### `frontend/src/components/LoginScreen.jsx`
**Que hace**  
Pantalla de login mas simple o alternativa a `FancyLogin`.

#### `frontend/src/components/MainScreen.jsx`
**Que hace**  
Pantalla principal del usuario autenticado:

- menu lateral
- categorias
- grid de productos
- navegacion inferior

#### `frontend/src/components/OrderDetailModal.jsx`
**Que hace**  
Modal para ver el detalle de un pedido concreto.

#### `frontend/src/components/Overlay.jsx`
**Que hace**  
Oscurece el fondo cuando hay modales o menus abiertos.

#### `frontend/src/components/ParentOrdersList.jsx`
**Que hace**  
Lista pedidos de hijos para que un padre los revise.

#### `frontend/src/components/Pixie.jsx`
**Que hace**  
Componente visual decorativo o animado de la interfaz.

#### `frontend/src/components/ProductCard.jsx`
**Que hace**  
Tarjeta visual de un producto dentro del catalogo.

#### `frontend/src/components/ProductModal.jsx`
**Que hace**  
Modal para personalizar un producto antes de añadirlo al carrito.

#### `frontend/src/components/ProductsGrid.jsx`
**Que hace**  
Carga productos desde API y los muestra en cuadrícula. Tambien gestiona favoritos y abre `ProductModal`.

#### `frontend/src/components/ProfileModal.jsx`
**Que hace**  
Modal de perfil con varias pestañas:

- informacion personal
- alias
- estadisticas
- familia

#### `frontend/src/components/SideMenu.jsx`
**Que hace**  
Menu lateral con accesos secundarios:

- perfil
- vincular familiar
- favoritos
- cerrar sesion

#### `frontend/src/components/SkeletonLoader.jsx`
**Que hace**  
Muestra esqueletos de carga mientras llegan datos.

#### `frontend/src/components/TechnicalSheetModal.jsx`
**Que hace**  
Modal con la ficha tecnica y nutricional de un producto.

#### `frontend/src/components/Toast.jsx`
**Que hace**  
Sistema global de notificaciones flotantes cortas.

#### `frontend/src/components/TopBar.jsx`
**Que hace**  
Barra superior con buscador y boton de filtros.

---

### Hooks

#### `frontend/src/hooks/useCargaSesion.js`
**Que hace**  
Gestiona la sesion del usuario en el frontend:

- intenta recuperar sesion previa
- guarda usuario en localStorage
- permite logout
- actualiza datos del usuario
- inicializa push notifications cuando hay sesion

#### `frontend/src/hooks/useEstadoVistaApp.js`
**Que hace**  
Gestiona el estado visual principal de la app:

- ruta actual
- apertura de carrito
- apertura de historial
- apertura de perfil
- apertura de modal de vinculo
- spinner de carga

---

### Librerias del frontend

#### `frontend/src/lib/api.js`
**Que hace**  
Es la capa central de acceso a la API del backend.

Aqui viven funciones como:

- iniciar sesion
- registrar usuario
- pedir productos
- crear pedidos
- gestionar familia
- llamar a endpoints admin

Es uno de los archivos mas importantes del frontend.

#### `frontend/src/lib/sesion.js`
**Que hace**  
Gestiona sesion en el navegador:

- guardar token
- guardar usuario
- limpiar sesion
- reconstruir usuario local

#### `frontend/src/lib/CartContext.jsx`
**Que hace**  
Expone el carrito por contexto React para que cualquier componente pueda usarlo.

#### `frontend/src/lib/useCart.js`
**Que hace**  
Hook principal del carrito:

- añadir productos
- cambiar cantidades
- eliminar productos
- vaciar carrito
- aplicar cupones
- calcular subtotal y total
- persistir carrito en localStorage

#### `frontend/src/lib/orderService.js`
**Que hace**  
Unifica y normaliza el trabajo con pedidos en frontend:

- transforma carrito a payload
- decide si usar flujo adulto o flujo infantil
- normaliza historiales y detalles

#### `frontend/src/lib/pushNotifications.js`
**Que hace**  
Integra la app con notificaciones push usando Capacitor:

- pide permisos
- registra listeners
- registra token en backend

#### `frontend/src/lib/sentry.js`
**Que hace**  
Configura Sentry en frontend para errores, trazas y sesiones.

---

### Paginas

#### `frontend/src/pages/AdminDashboard.jsx`
**Que hace**  
Es la pagina principal del administrador. Carga datos de:

- productos
- usuarios
- fraude
- pedidos
- estadisticas

#### `frontend/src/pages/CartPage.jsx`
**Que hace**  
Es una pagina completa del carrito, pensada para navegacion por rutas o version Ionic.

#### `frontend/src/pages/CartPreview.jsx`
**Que hace**  
Vista preliminar o pagina auxiliar del carrito.

#### `frontend/src/pages/PagoExitoso.jsx`
**Que hace**  
Pantalla que se muestra cuando el pago termina correctamente.

#### `frontend/src/pages/SpinnerDemo.jsx`
**Que hace**  
Pantalla de prueba visual del spinner personalizado.

---

## Resumen rapido del flujo del proyecto

### Backend

1. `index.js` carga `server.js`
2. `server.js` crea la app
3. `createServerApp.js` registra las rutas
4. `appContext.js` prepara todo el contexto comun
5. las rutas usan servicios, middlewares y utilidades

### Frontend

1. `main.jsx` monta React
2. `AppMovil.jsx` decide que pantalla mostrar
3. `api.js` habla con el backend
4. componentes y paginas muestran la interfaz
5. hooks y libs mantienen sesion, carrito, pedidos y notificaciones

---

## Siguiente paso recomendado

Despues de esta guia, lo mejor es estudiar el proyecto en este orden:

1. `backend/src/index.js`
2. `backend/src/server.js`
3. `backend/src/app/createServerApp.js`
4. `backend/src/appContext.js`
5. `backend/src/routes/authRoutes.js`
6. `backend/src/routes/catalogRoutes.js`
7. `backend/src/routes/orderRoutes.js`
8. `backend/src/routes/familyRoutes.js`
9. `frontend/src/main.jsx`
10. `frontend/src/AppMovil.jsx`
11. `frontend/src/lib/api.js`
12. `frontend/src/components/MainScreen.jsx`
13. `frontend/src/components/ProductsGrid.jsx`
14. `frontend/src/lib/useCart.js`

Si quieres, el siguiente paso puedo hacerlo yo:

- o te explico este `.md`
- o te genero otro `.md` mas detallado con **archivo + funciones internas + flujo**
- o empezamos por `appContext.js` y te lo explico linea por linea
