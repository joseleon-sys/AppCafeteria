# AppCafeteria

Aplicacion de cafeteria escolar con frontend React/Vite/Capacitor y backend Node.js/Express. Permite gestionar catalogo de productos, carrito, pedidos, autenticacion, perfiles adulto/menor, vinculacion padre-hijo, aprobacion de pedidos infantiles y panel de administracion.

## Tecnologias usadas

- Frontend: React 18, Vite, Ionic React, Capacitor.
- Backend: Node.js, Express, Supabase.
- Autenticacion y seguridad: JWT, bcryptjs, helmet, CORS, express-rate-limit.
- Persistencia y datos: Supabase como unico servicio externo vigente.
- Observabilidad local: pino-http.
- Validacion: Zod.

## Requisitos previos

- Node.js 18 o superior.
- npm.
- Proyecto Supabase configurado.

## Instalacion

Instala dependencias por separado en backend y frontend:

```bash
cd backend
npm install

cd ../frontend
npm install
```

Para instalaciones reproducibles con lockfile:

```bash
cd backend
npm ci

cd ../frontend
npm ci
```

## Ejecucion del frontend

```bash
cd frontend
npm run dev
```

Por defecto Vite levanta la app en `http://localhost:5173`.

Build de produccion:

```bash
cd frontend
npm run build
```

Preview del build:

```bash
cd frontend
npm run preview
```

## Ejecucion del backend

```bash
cd backend
npm run dev
```

Por defecto el backend escucha en `http://localhost:3000`.

Ejecucion normal:

```bash
cd backend
npm start
```

## Variables de entorno

Copia las plantillas antes de arrancar los servicios:

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

En Windows PowerShell:

```powershell
Copy-Item backend/.env.example backend/.env
Copy-Item frontend/.env.example frontend/.env
```

Variables principales del backend:

```env
NODE_ENV=development
PORT=3000
FRONTEND_URL=http://localhost:5173
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=replace-me
JWT_SECRET=replace-me-with-a-long-random-secret
```

Variables principales del frontend:

```env
VITE_API_URL=http://localhost:3000
VITE_API_FALLBACK_URL=
VITE_RAILWAY_API_URL=
BACKEND_URL=
VITE_APP_VERSION=
```

Notas:

- El backend tambien acepta `SUPABASE_SECRET_KEY`, `SUPABASE_SERVICE_KEY` o `SUPABASE_ANON_KEY` por compatibilidad, aunque se prefiere `SUPABASE_SERVICE_ROLE_KEY`.
- El frontend se comunica con Supabase a traves del backend; no necesita claves de Supabase en el cliente.
- En produccion, configura `FRONTEND_URL` con el dominio real permitido por CORS.

## Estructura del proyecto

```txt
AppCafeteria/
  backend/
    src/
      app/
      config/
      middlewares/
      modules/
      observability/
      routes/
      services/
      shared/
      utils/
    db/
    package.json
  frontend/
    src/
      api/
      components/
      features/
      hooks/
      lib/
      pages/
      styles/
    android/
    package.json
  observability/
  docker-compose.yml
  docker-compose.elk.yml
  *.md
```

Documentacion util:

- `QUICK_START.md`: setup rapido y troubleshooting.
- `README_MAESTRO.md`: indice funcional y flujos principales.
- `API_CONTRACT.md`: contrato de endpoints.
- `SISTEMA_AUTENTICACION.md`: autenticacion, JWT y roles.
- `SISTEMA_PADRE_HIJO.md`: vinculacion familiar y aprobacion de pedidos.

## Scripts disponibles

Backend (`backend/package.json`):

| Script | Comando | Descripcion |
| --- | --- | --- |
| `dev` | `node --watch src/index.js` | Arranca la API en modo desarrollo. |
| `start` | `node src/index.js` | Arranca la API en modo normal. |
| `db:migrate` | `node db/migrate.js` | Ejecuta migraciones de base de datos. |

Frontend (`frontend/package.json`):

| Script | Comando | Descripcion |
| --- | --- | --- |
| `dev` | `vite` | Arranca el servidor de desarrollo. |
| `build` | `vite build` | Compila el frontend para produccion. |
| `preview` | `vite preview` | Sirve localmente el build generado. |

## Credenciales de prueba

Segun la documentacion y los scripts SQL del proyecto, existe un usuario de prueba:

```txt
Email: admin@admin
Password: admin
Rol: admin
```

Algunos documentos historicos mencionan `admin@admin.com` / `admin`; si una base de datos local fue creada con datos antiguos, puede existir tambien esa variante. Para el setup actual con `SUPABASE_USERS_SETUP.sql`, usa `admin@admin` / `admin`.

Tambien puedes registrar usuarios desde `POST /api/auth/register` para probar flujos padre-hijo:

```json
{
  "email": "papa@test.com",
  "password": "test123",
  "name": "Papa Test",
  "birth_date": "1990-01-01"
}
```

```json
{
  "email": "hijo@test.com",
  "password": "test123",
  "name": "Hijo Test",
  "birth_date": "2012-01-01"
}
```

## Notas de seguridad

- No subas archivos `.env` ni secretos reales al repositorio.
- Mantén `.env.example` solo con placeholders.
- Rota cualquier clave que haya sido expuesta accidentalmente.
- Usa un `JWT_SECRET` largo, aleatorio y distinto por entorno.
- Configura `FRONTEND_URL` en produccion para evitar CORS abierto.
- No confies en roles enviados por el frontend; el backend debe validar JWT y estado real del usuario.
- Revisa los diffs antes de commitear cambios en configuracion, autenticacion o logs.
