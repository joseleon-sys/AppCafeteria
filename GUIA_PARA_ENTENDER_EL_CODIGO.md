# Guia Para Entender El Codigo

Este proyecto esta pensado como una app de cafeteria con dos partes:

- `frontend/`: lo que ve el usuario
- `backend/`: la API que guarda datos, valida usuarios y procesa pedidos

## Idea general

El flujo principal es este:

1. El usuario entra en la app.
2. El frontend comprueba si ya habia una sesion guardada.
3. Si el usuario inicia sesion, el backend devuelve un `token` y los datos del usuario.
4. El frontend usa ese token para pedir productos, crear pedidos y ver historial.
5. El backend consulta Supabase, valida permisos y responde.

## Archivos mas importantes

### Frontend

- `frontend/src/AppMobile.jsx`
  Punto de entrada visual. Decide que pantalla mostrar.
- `frontend/src/hooks/useCargaSesion.js`
  Carga la sesion guardada y activa notificaciones.
- `frontend/src/hooks/useEstadoVistaApp.js`
  Controla modales, spinner y ruta inicial.
- `frontend/src/lib/api.js`
  Todas las peticiones HTTP al backend.
- `frontend/src/lib/session.js`
  Guardar, leer y limpiar la sesion del usuario.

### Backend

- `backend/src/server.js`
  Arranca el servidor.
- `backend/src/app/createServerApp.js`
  Conecta todas las rutas.
- `backend/src/appContext.js`
  Configura Express, Supabase, Stripe y funciones comunes.
- `backend/src/routes/authRoutes.js`
  Registro, login, perfil y favoritos.
- `backend/src/utils/utilidadesApp.js`
  Funciones reutilizables del proyecto.
- `backend/src/utils/authHelpers.js`
  Funciones pequeñas para construir el usuario publico y el token.

## Como leer el proyecto sin perderse

Si no sabes programar mucho, lee en este orden:

1. `frontend/src/AppMobile.jsx`
2. `frontend/src/lib/session.js`
3. `frontend/src/lib/api.js`
4. `backend/src/server.js`
5. `backend/src/app/createServerApp.js`
6. `backend/src/routes/authRoutes.js`

Asi primero entiendes que pantalla sale, despues como se guarda la sesion, luego como habla con el servidor y por ultimo como responde el backend.

## Idea mental sencilla

Piensa en el proyecto como si fueran empleados de una cafeteria:

- `AppMobile.jsx`: recepcion. Decide a donde va cada persona.
- `api.js`: camarero. Lleva peticiones del cliente a cocina.
- `authRoutes.js`: control de acceso. Comprueba quien eres.
- `appContext.js`: sala de maquinas. Prepara conexiones y herramientas.
- `Supabase`: almacen principal de datos.

## Consejo para seguir simplificandolo

Cuando un archivo haga muchas cosas a la vez, conviene dividirlo asi:

- una parte para "leer datos"
- una parte para "validar"
- una parte para "mostrar o responder"

Ese patron hace el codigo mucho mas facil de entender.
