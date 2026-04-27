# 🚀 QUICK START - Guía de Setup

**Para:** Developers que necesitan empezar YA  
**Tiempo estimado:** 10 minutos  
**Última actualización:** 5 de marzo 2026

---

## ⚡ 5 Minutos: Setup Inicial

### 0️⃣ Instalar dependencias del monorepo

Este proyecto tiene dependencias separadas para `backend/` y `frontend/`. Hay que instalarlas en ambas carpetas.

```bash
cd backend
npm install

cd ../frontend
npm install
```

Si quieres respetar exactamente los `package-lock.json`, usa:

```bash
cd backend
npm ci

cd ../frontend
npm ci
```

**Errores típicos que esto corrige:**
- `Cannot find package 'bcryptjs'` → faltan dependencias de `backend/`
- `vite: not found` → faltan dependencias de `frontend/`

### 1️⃣ Backend

```bash
cd backend
npm run dev
```

**Resultado esperado:**
```
✅ Server running on http://localhost:3000
✅ PostgreSQL connected (o Supabase)
```

### 2️⃣ Frontend

```bash
cd frontend
npm run dev
```

**Resultado esperado:**
```
✅ Vite dev server running at http://localhost:5173
```

### 3️⃣ Test Login

Abre http://localhost:5173

**Usuario de prueba:**
- Email: `admin@admin`
- Password: `admin`

✅ **¡Listo!** La app está funcionando 🎉

---

## 🗄️ Base de Datos Setup

### Opción A: Supabase (Recomendado)

**Si la tabla `users` NO existe:**

1. Ve a https://supabase.com/dashboard
2. Selecciona tu proyecto de Supabase
3. Abre **SQL Editor** → **New Query**
4. Copia el contenido de `SUPABASE_USERS_SETUP.sql`
5. Ejecuta el script

**Script crea:**
- ✅ Tabla `users` (con admin@admin preconfigurado)
- ✅ Tabla `parent_child_links`
- ✅ Tabla `child_orders` + `child_order_items`
- ✅ Tabla `fraud_prevention_log`
- ✅ Índices para optimización

### Opción B: PostgreSQL Local

**Si trabajas con PostgreSQL local:**

1. Asegúrate que PostgreSQL está corriendo
2. Crea BD: `createdb cafeteria_db`
3. Ejecuta setup SQL:
   ```bash
   cd backend/db
   psql cafeteria_db < setup.js
   ```

**Variables `.env` necesarias:**
```env
# Supabase (si usas)
SUPABASE_URL=
SUPABASE_ANON_KEY=

# PostgreSQL local (si usas)
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=tu_password
DB_NAME=cafeteria_db

# JWT (IMPORTANTE)
JWT_SECRET=tu_secreto_super_largo_y_seguro_aqui
NODE_ENV=development
```

---

## 🧪 Testing Flujos Básicos

### Test 1: Login Adulto

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@admin",
    "password": "admin"
  }'
```

**Respuesta esperada:**
```json
{
  "user": {
    "id": 1,
    "email": "admin@admin",
    "name": "Admin User",
    "role": "admin",
    "is_adult": true,
    "parent_token": "ADMIN001",
    "created_at": "2026-03-04T..."
  },
  "token": "eyJhbGciOiJIUzI1NiIs..."
}
```

### Test 2: Registro Nuevo Usuario

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "papa@test.com",
    "password": "test123",
    "name": "Papá Test",
    "birth_date": "1990-01-01"
  }'
```

**Respuesta esperada:**
```json
{
  "user": {
    "id": 42,
    "email": "papa@test.com",
    "name": "Papá Test",
    "role": "parent",
    "is_adult": true,
    "parent_token": "ABC12XYZ",  // ← Usar para vincular hijo
    "created_at": "2026-03-05T..."
  },
  "token": "eyJhbGci..."
}
```

### Test 3: Vinculación Padre-Hijo

```bash
# 1. Registra menor
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "hijo@test.com",
    "password": "test123",
    "name": "Hijito",
    "birth_date": "2012-01-01"
  }'
# Nota el token del response

# 2. Como hijo, vincúlate con padre (usando parent_token de paso 1)
curl -X POST http://localhost:3000/api/child/link-parent \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <TOKEN_DEL_HIJO>" \
  -d '{
    "parentToken": "ABC12XYZ"
  }'
```

**Respuesta esperada:**
```json
{
  "link_id": 5,
  "status": "pending",
  "requested_at": "2026-03-05T..."
}
```

### Test 4: Padre Aprueba Vinculación

```bash
curl -X PUT http://localhost:3000/api/parent/link-requests/5/approve \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <TOKEN_DEL_PADRE>" \
  -d '{
    "spendingLimit": 25.00
  }'
```

**Respuesta esperada:**
```json
{
  "message": "Link approved",
  "status": "active",
  "spending_limit": 25.00
}
```

---

## 🔧 Variables de Entorno

### Backend: `.env`

```env
# 🔐 CRÍTICO
JWT_SECRET=tu_secret_muy_largo_y_seguro_aqui_min_32chars

# Base de Datos
NODE_ENV=development
SUPABASE_URL=
SUPABASE_ANON_KEY=

# PostgreSQL Fallback (si usas)
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=tu_password
DB_NAME=cafeteria_db

# Server
PORT=3000
```

### Frontend: `.env`

```env
VITE_API_URL=http://localhost:3000
```

---

## ✅ Checklist de Setup

- [ ] Backend instalado (`cd backend && npm install` o `npm ci`)
- [ ] Frontend instalado (`cd frontend && npm install` o `npm ci`)
- [ ] Base de datos setup (Supabase o PostgreSQL)
- [ ] `.env` configurado en backend
- [ ] `JWT_SECRET` configurado
- [ ] Backend corriendo en puerto 3000
- [ ] Frontend corriendo en puerto 5173
- [ ] Login funciona con `admin@admin`
- [ ] Puedo registrar nuevo usuario
- [ ] Puedo ver productos

---

## 🐛 Troubleshooting

### Error: `vite: not found`

Faltan dependencias del frontend:

```bash
cd frontend
npm install
```

### Error: `Cannot find package 'bcryptjs'`

Faltan dependencias del backend:

```bash
cd backend
npm install
```

### Error: `Cannot find module` o paquetes ausentes

Reinstala dependencias del subproyecto afectado:

```bash
cd backend
npm install

cd ../frontend
npm install
```

### Error: "JWT_SECRET is required in production"

**Solución:** Añade `JWT_SECRET` a tu `.env`
```bash
echo "JWT_SECRET=$(openssl rand -base64 32)" >> backend/.env
```

### Error: "Could not find the table 'public.users'"

**Solución:** Ejecuta script SQL en Supabase
1. Ve a SQL Editor en Supabase
2. Ejecuta `SUPABASE_USERS_SETUP.sql`

### Error: "Connection refused" en backend

**Solución:** PostgreSQL/Supabase no responde
- Verifica variables `.env`
- Verifica conexión a Supabase
- Si usas local, inicia PostgreSQL: `brew services start postgresql`

### Error: CORS error en frontend

**Solución:** Backend no está en puerto 3000
1. Verifica: `lsof -i :3000`
2. Mata proceso si es necesario: `kill -9 <PID>`
3. Reinicia: `npm run dev`

### Error: "ReferenceError: Toast not defined"

**Solución:** Ya está arreglado en última versión
- Si persiste, verifica imports en componentes:
  ```javascript
  import { showError, showSuccess } from '../lib/toast';
  ```

---

## 📱 Próximos Pasos

**Después de setup exitoso:**

1. **Revisar flujos:** Lee [README_MAESTRO.md](./README_MAESTRO.md)
2. **Entender padre-hijo:** Lee [SISTEMA_PADRE_HIJO.md](./SISTEMA_PADRE_HIJO.md)
3. **Ver endpoints:** Lee [API_CONTRACT.md](./API_CONTRACT.md)
4. **Implementar features:** Ver [README_MAESTRO.md#lo-que-falta](./README_MAESTRO.md)

---

## 🎓 Comandos Útiles

```bash
# Backend
cd backend && npm install && npm run dev      # Iniciar
npm run build                                 # Compilar
npm test                                      # Testing (si existe)

# Frontend
cd frontend && npm install && npm run dev     # Iniciar
npm run build                                 # Build para producción
npm run preview                               # Preview del build

# Debugging
curl http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer <TOKEN>"          # Check token

tail -f backend/logs/error.log               # Ver errores

# Database
psql cafeteria_db -U postgres                 # Conectar a BD local
```

---

## 📞 Recursos

- **API Endpoints:** [API_CONTRACT.md](./API_CONTRACT.md)
- **Documentación Técnica:** [README_MAESTRO.md](./README_MAESTRO.md)
- **Flujos:** [SISTEMA_PADRE_HIJO.md](./SISTEMA_PADRE_HIJO.md)
- **Git Workflow:** [GIT_WORKFLOW.md](./GIT_WORKFLOW.md)

---

**¿Atascado?** 🆘

1. Verifica [CHANGELOG.md](./CHANGELOG.md) - Cambios recientes
2. Revisa logs de backend: `tail -f /tmp/backend.log`
3. Verifica network tab en DevTools (frontend)
4. Lee documentación completa en [INDEX.md](./INDEX.md)

**¡Éxito! 🚀**
