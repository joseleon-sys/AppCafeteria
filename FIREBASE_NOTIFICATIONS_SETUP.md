# Firebase Notifications Setup

## Backend

Variables nuevas esperadas por el backend:

```env
FIREBASE_SERVICE_ACCOUNT_JSON={"type":"service_account","project_id":"..."}
```

Notas:

- La clave debe cargarse solo en backend.
- Si esta variable no existe, la app seguira guardando notificaciones en Supabase, pero no enviara push real.

## Base de datos

Las notificaciones usan siempre Supabase. Deben existir estas tablas en Supabase:

- `user_device_tokens`
- `app_notifications`

No se usa PostgreSQL local para tokens ni bandeja de notificaciones.

## Endpoints nuevos

- `POST /api/notifications/devices`
- `DELETE /api/notifications/devices/:token`
- `GET /api/notifications`
- `PUT /api/notifications/:id/read`

## Frontend

El frontend ya intenta inicializar push al autenticarse desde `AppMobile.jsx`.

Para activar push real en movil hace falta:

1. Ejecutar `npm install` en `frontend/` y `backend/`.
2. Configurar Capacitor en `frontend/`.
3. Registrar la app en Firebase.
4. Anadir `google-services.json` en Android.
5. Anadir `GoogleService-Info.plist` en iOS.
6. Ejecutar `npx cap sync`.

## Eventos ya conectados

- Solicitud de vinculacion padre-hijo
- Aprobacion de vinculacion
- Rechazo de vinculacion
- Nuevo pedido de hijo
- Pedido aprobado
- Pedido rechazado
- Pedido pagado

## Pendientes recomendados

- Pantalla de bandeja de notificaciones en frontend
- Navegacion profunda al pulsar una push
- Preferencias de notificacion por tipo
- Pruebas en dispositivo fisico Android/iOS
