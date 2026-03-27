# Sistema de Autenticación - Cafetería App

## 📋 Descripción General

El sistema de autenticación está completamente implementado y funcional. Soporta:

- **Login y Registro** real con base de datos
- **Roles de usuario**: admin, parent, child, customer
- **Sistema Padre-Hijo** para menores
- **JWT tokens** para sesiones seguras
- **Bcrypt** para hashing de contraseñas
- **Rate limiting** anti-fraude
- **Doble backend**: Supabase (remoto) y PostgreSQL local

## 🔐 Usuarios Predefinidos

### Administrador (Hardcoded - siempre funciona)
```
Email: admin@admin (o admin@admin.com)
Password: admin
Rol: admin
```

### Usuario Demo
```
Email: demo@demo.com
Password: demo
Rol: customer
```

### Usuarios en Base de Datos (después de ejecutar init.sql)
```
Email: padre@cafeteria.local
Password: admin
Rol: parent
Token: DEMO1234

Email: hijo@cafeteria.local
Password: admin
Rol: child
```

## 🚀 Configuración Inicial

### 1. Iniciar Docker (Base de Datos PostgreSQL)

```bash
# Desde la raíz del proyecto
docker-compose up -d
```

Esto creará:
- PostgreSQL en puerto 5433
- pgAdmin en http://localhost:5050
- Ejecutará automáticamente `backend/db/init.sql`

### 2. Iniciar Backend

```bash
cd backend
npm install
npm run dev
```

Backend corriendo en: http://localhost:3000

### 3. Iniciar Frontend

```bash
cd frontend
npm install
npm run dev -- --host
```

Frontend accesible en:
- Local: http://localhost:5175
- Red: http://192.168.0.194:5175

## 📡 Endpoints de API

### Registro de Usuario
```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "usuario@ejemplo.com",
  "password": "contraseña123",
  "name": "Nombre Usuario",
  "birthDate": "2005-06-15"
}
```

**Respuesta exitosa:**
```json
{
  "message": "Usuario creado correctamente",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 123,
    "email": "usuario@ejemplo.com",
    "name": "Nombre Usuario",
    "role": "child",
    "isAdult": false,
    "parentToken": null
  }
}
```

### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "admin@admin",
  "password": "admin"
}
```

**Respuesta exitosa:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "email": "admin@admin",
    "name": "Administrador",
    "role": "admin"
  }
}
```

### Obtener Perfil (Requiere JWT)
```http
GET /api/auth/me
Authorization: Bearer <token>
```

## 🎨 Uso en el Frontend

### FancyLogin Component

El componente `FancyLogin.jsx` maneja tanto login como registro:

```jsx
import FancyLogin from './components/FancyLogin';

function App() {
  const handleLogin = (userData) => {
    console.log('Usuario logueado:', userData);
    // userData contiene: { role, email, name, userId, parentToken }
  };

  return <FancyLogin onLogin={handleLogin} />;
}
```

### Almacenamiento del Token

El token JWT se guarda automáticamente en `localStorage`:

```javascript
// Al hacer login exitoso
localStorage.setItem('cafeteria_token', token);

// Para usar el token en peticiones
const token = localStorage.getItem('cafeteria_token');
fetch('/api/some-endpoint', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
```

### Verificar Autenticación

```javascript
// Verificar si hay sesión activa
const isLoggedIn = !!localStorage.getItem('cafeteria_token');

// Obtener datos del usuario actual
const response = await fetch('http://localhost:3000/api/auth/me', {
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('cafeteria_token')}`
  }
});
const userData = await response.json();
```

## 👨‍👦 Sistema Padre-Hijo

### Flujo de Vinculación

1. **Padre crea cuenta** (mayor de 18)
   - Recibe un `parentToken` único (ej: "DEMO1234")
   
2. **Hijo crea cuenta** (menor de 18)
   - No recibe token, su rol es "child"
   
3. **Hijo solicita vinculación**
   ```http
   POST /api/child/link-parent
   Authorization: Bearer <child-token>
   Content-Type: application/json
   
   {
     "parentToken": "DEMO1234"
   }
   ```

4. **Padre aprueba solicitud**
   ```http
   PUT /api/parent/link-requests/:id/approve
   Authorization: Bearer <parent-token>
   ```

### Límites de Gasto

Los padres pueden configurar límites de gasto para sus hijos:

```http
PUT /api/parent/link-requests/:id/approve
Authorization: Bearer <parent-token>
Content-Type: application/json

{
  "spendingLimit": 15.00,
  "canOrder": true
}
```

## 🔧 Variables de Entorno

### Backend (.env)

```env
PORT=3000
JWT_SECRET=cafeteria_secret_key_change_in_production

# PostgreSQL Local
POSTGRES_USER=cafeteria_user
POSTGRES_PASSWORD=cafeteria_pass
POSTGRES_HOST=127.0.0.1
POSTGRES_PORT=5433
POSTGRES_DB=cafeteria_db

# Supabase (Opcional)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
```

### Frontend (.env)

```env
VITE_API_URL=http://localhost:3000
```

## 🛡️ Seguridad

### Características Implementadas

- ✅ Passwords hasheados con bcrypt (10 rounds)
- ✅ JWT tokens con expiración 7 días
- ✅ Rate limiting en login/registro
- ✅ Sistema anti-fraude con trust scores
- ✅ Logs de seguridad
- ✅ Validación de edad (18+)
- ✅ Tokens únicos para padres

### Rate Limits

- **Login**: 5 intentos por IP cada 15 minutos
- **Registro**: 3 registros por IP cada 15 minutos
- **Vinculación**: 10 intentos por usuario cada hora

## 🧪 Testing Manual

### Probar Registro

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@test.com",
    "password": "test123",
    "name": "Test User",
    "birthDate": "2000-01-01"
  }'
```

### Probar Login Admin

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@admin",
    "password": "admin"
  }'
```

### Probar Perfil (con token)

```bash
TOKEN="tu-token-jwt-aqui"
curl -X GET http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer $TOKEN"
```

## 📚 Estructura de la Base de Datos

### Tabla: users

```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'customer',
  is_adult BOOLEAN DEFAULT false,
  birth_date DATE,
  parent_token VARCHAR(10) UNIQUE,
  phone VARCHAR(20),
  verified_phone BOOLEAN DEFAULT false,
  verified_email BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  last_login TIMESTAMP,
  active BOOLEAN DEFAULT true
);
```

## 🐛 Troubleshooting

### Error: "Token no proporcionado"
- Verifica que estés enviando el header `Authorization: Bearer <token>`

### Error: "Credenciales incorrectas"
- Verifica email y password
- Para admin usa: `admin@admin` / `admin`

### Error de conexión a DB
```bash
# Verificar que Docker esté corriendo
docker ps

# Si no está, arrancar
docker-compose up -d

# Ver logs
docker-compose logs postgres
```

### Frontend no conecta con backend
- Verifica que backend esté en http://localhost:3000
- Revisa CORS en el backend (ya está configurado)
- Chequea `VITE_API_URL` en frontend/.env

## 📝 Notas Adicionales

- El usuario **admin@admin** siempre funciona (hardcoded) sin importar el estado de la base de datos
- El sistema funciona tanto con Supabase como con PostgreSQL local
- Los tokens JWT expiran en 7 días
- Las contraseñas deben tener mínimo 6 caracteres
- La edad se calcula automáticamente desde `birthDate`

## ✅ Checklist de Implementación

- [x] Rutas de autenticación (login, register, me)
- [x] Hashing de passwords con bcrypt
- [x] JWT token generation y validación
- [x] Middleware authenticateToken
- [x] Rate limiting anti-fraude
- [x] Sistema padre-hijo completo
- [x] FancyLogin component en frontend
- [x] Soporte dual: Supabase + PostgreSQL local
- [x] Usuario admin hardcoded
- [x] Base de datos inicializada con users
- [x] Trust score system
- [x] Security event logging

---

**🎉 Sistema 100% funcional y listo para usar!**
