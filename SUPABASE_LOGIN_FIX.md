# 🚀 Configuración de Autenticación con Supabase

## ⚠️ Problema Actual

La tabla `users` no existe en tu base de datos de Supabase. Necesitas ejecutar el script SQL para crear todas las tablas necesarias.

## 📋 Pasos para Solucionar

### 1. **Accede a Supabase Dashboard**

Ve a: https://supabase.com/dashboard

### 2. **Abre el SQL Editor**

1. Selecciona tu proyecto: `qbchjmgonvvskmnrqxdh`
2. En el menú lateral, haz clic en **SQL Editor**
3. Crea una nueva consulta (New Query)

### 3. **Ejecuta el Script SQL**

Copia y pega el contenido completo del archivo **`SUPABASE_USERS_SETUP.sql`** y ejecútalo.

Este script creará:
- ✅ Tabla `users` con todos los campos necesarios
- ✅ Tabla `parent_child_links` para sistema padre-hijo
- ✅ Tabla `fraud_prevention_log` para seguridad
- ✅ Índices para optimizar consultas
- ✅ Políticas RLS (Row Level Security)
- ✅ Usuarios de prueba:
  - **admin@admin** / admin (rol: admin)
  - **padre@cafeteria.local** / admin (rol: parent, token: DEMO1234)
  - **hijo@cafeteria.local** / admin (rol: child)

### 4. **Verificar la Creación**

Después de ejecutar el script, verifica en **Table Editor** que las tablas fueron creadas:
- `users`
- `parent_child_links`
- `fraud_prevention_log`

### 5. **Reiniciar el Backend**

```bash
cd backend
npm run dev
```

## 🧪 Probar el Login

### Desde el Frontend

1. Inicia el frontend: `cd frontend && npm run dev -- --host`
2. Intenta logear con:
   - **Email:** `admin@admin`
   - **Password:** `admin`

### Desde cURL (Testing)

```bash
# Login con usuario de Supabase
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@admin",
    "password": "admin"
  }'
```

Deberías recibir una respuesta con el token JWT y los datos del usuario.

## 🔐 Crear Nuevos Usuarios

### Registro desde Frontend

1. En la pantalla de login, haz clic en **"Crear cuenta"**
2. Completa el formulario:
   - Nombre completo
   - Email
   - Password (mínimo 6 caracteres)
   - Fecha de nacimiento
3. Si eres mayor de 18 años, recibirás un **token de padre** para vincular hijos

### Registro desde API

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "nuevo@usuario.com",
    "password": "password123",
    "name": "Nombre Usuario",
    "birthDate": "2000-01-15"
  }'
```

## 📊 Verificar Datos en Supabase

Para ver los usuarios creados:

1. Ve a **Table Editor** en Supabase
2. Selecciona la tabla `users`
3. Verás todos los usuarios con sus datos (password_hash está encriptado)

## 🐛 Troubleshooting

### Error: "Could not find the table 'public.users'"

**Solución:** Ejecuta el script `SUPABASE_USERS_SETUP.sql` en el SQL Editor de Supabase.

### Error: "Credenciales incorrectas"

**Posibles causas:**
1. El usuario no existe en Supabase
2. La contraseña es incorrecta
3. El usuario está marcado como `active = false`

**Solución:** Verifica en la tabla `users` de Supabase que el usuario existe y está activo.

### Login funciona con admin@admin pero no con otros usuarios

**Causa:** El usuario hardcoded admin@admin tiene prioridad en el código.

**Solución:** Esto es normal. Para usuarios reales, asegúrate de que estén registrados en Supabase.

## 🔄 Flujo de Autenticación

```
Usuario ingresa credenciales
         ↓
Frontend envía POST /api/auth/login
         ↓
Backend verifica:
  1. ¿Es admin@admin? → Login hardcoded ✅
  2. ¿Existe en Supabase? → Busca en tabla users
  3. ¿Password correcto? → bcrypt.compare()
  4. ¿Usuario activo? → active = true
         ↓
Genera JWT token (válido 7 días)
         ↓
Frontend recibe token + datos usuario
         ↓
Token guardado en localStorage
```

## ✅ Checklist de Configuración

- [ ] Ejecutar script `SUPABASE_USERS_SETUP.sql` en Supabase
- [ ] Verificar que tabla `users` existe en Supabase
- [ ] Verificar que hay al menos 3 usuarios de prueba
- [ ] Backend tiene variables `SUPABASE_URL` y `SUPABASE_ANON_KEY` en `.env`
- [ ] Backend corriendo en puerto 3000
- [ ] Frontend corriendo y conectado al backend
- [ ] Probar login con `admin@admin` / `admin`
- [ ] Probar registro de nuevo usuario
- [ ] Verificar que el nuevo usuario aparece en Supabase

## 📝 Configuración Actual

Tu configuración `.env` ya tiene las credenciales correctas:

```env
SUPABASE_URL=https://qbchjmgonvvskmnrqxdh.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

Solo falta ejecutar el script SQL para crear las tablas. 🎯

---

**🎉 Una vez completados estos pasos, el sistema de autenticación estará 100% funcional con Supabase!**
