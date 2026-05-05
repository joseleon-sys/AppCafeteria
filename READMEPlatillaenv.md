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
LOG_LEVEL=
```

El backend tambien acepta `SUPABASE_SECRET_KEY`, `SUPABASE_SERVICE_KEY` o `SUPABASE_ANON_KEY` por compatibilidad, aunque se prefiere `SUPABASE_SERVICE_ROLE_KEY` para operaciones del servidor.

Supabase es el unico servicio externo vigente en la configuracion documentada. Las variables antiguas de otras integraciones no deben agregarse a la plantilla salvo que se reactiven de forma explicita.
