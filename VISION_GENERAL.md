# 📚 VISIÓN GENERAL DEL PROYECTO - CafeteriaApp Sistema Padre-Hijo

## 🎯 Objetivo del Proyecto

Sistema de cafetería escolar con control parental:
- **Estudiantes** hacen pedidos en la cafetería
- **Padres** controlan y aprueban los pedidos
- **Presupuestos** y límites de gasto por hijo
- **Historial** de compras y analytics para padres

---

## 🏗️ Arquitectura General

```
Frontend (React 18 + Vite)
  ├── Clients: register, login, browse products
  ├── Parents: approve orders, set budgets, view analytics
  └── Admins: manage products, view system

        ↓ HTTP/REST

Backend (Node.js + Express)
  ├── /api/auth/* - Authentication (JWT)
  ├── /api/products/* - Product CRUD (admin only)
  ├── /api/parent/* - Parent operations
  ├── /api/child/* - Child operations
  └── Middleware: Auth, RateLimit, FraudPrevention

        ↓ Database

PostgreSQL (Primary) + Supabase (Optional Fallback)
  ├── users - Customers, parents, children, admins
  ├── products - Cafeteria items
  ├── parent_child_links - Family relationships
  ├── child_orders - Pending/approved orders
  └── fraud_prevention_log - Security audit
```

---

## 👥 Roles del Sistema

### 1. **admin**
- Gestiona productos (create, edit, delete)
- Ve estadísticas globales
- Requiere Bearer token + admin role

### 2. **parent** (Adulto que vinculó hijos)
- Genera token para que hijos se vinculen
- Aprueba/rechaza pedidos de hijos
- Establece límites de gasto
- Ve historial de compras
- Respuesta: `{ role: 'parent', is_adult: true }`

### 3. **customer** (Adulto sin hijos)
- Acceso básico a productos
- Puede convertirse en parent al vincularse
- Respuesta: `{ role: 'customer', is_adult: true }`

### 4. **child** (Menor)
- Solicita vinculación a padre (con token)
- Crea pedidos que requieren aprobación padre
- No genera hijos propios
- Respuesta: `{ role: 'child', is_adult: false }`

---

## 🔄 Flujos Principales

### Flujo 1: Registro & Login

```
Usuario nuevo
  → Navega a "Crear cuenta"
  → Ingresa nombre, email, contraseña, fecha nacimiento
  → POST /api/auth/register
  
Backend:
  → Calcula edad
  → Hash de contraseña
  → Si edad >= 18: role='customer', genera parent_token
  → Si edad < 18: role='child', sin parent_token
  → Devuelve JWT token + user data
  
Frontend:
  → Guarda token en localStorage
  → Muestra alert con parent_token si adulto
  → AppMobile rehidrata sesión con GET /api/auth/me
  
✅ Usuario autenticado
```

### Flujo 2: Vinculación Padre-Hijo

```
A. ADULTO LISTO:
   → Login
   → Profile → Copyea parent_token (ej: "ABC12345")

B. MENOR VINCULA:
   → Crea su propia cuenta (edad < 18)
   → Login
   → Profile → "Solicitar Padre"
   → Pega token: "ABC12345"
   → POST /api/child/link-parent
   
Backend:
   → Valida token existe y es de adulto
   → Crea registro en parent_child_links (status='pending')
   → Establece spending_limit default ($50/mes)
   
C. PADRE APRUEBA:
   → Login
   → Profile → "Familia" → LinkRequestsList
   → Ve solicitud pendiente de "Carlos Jr"
   → Click "✅ Aprobar"
   → PUT /api/parent/link-requests/{id}/approve
   
Backend:
   → Aprueba vínculo (status='active')
   → **AUTOMÁTICO**: Cambia adulto de 'customer' a 'parent'
   → Crea entrada en parent_child_links creada
   
✅ Relación confirmada, adulto es ahora PARENT
```

### Flujo 3: Pedido de Hijo (FASE 3)

```
A. HIJO CREA PEDIDO:
   → Login
   → Browse productos
   → Agrega al carrito (Nachos $5, Pizza $8)
   → Click "Hacer Pedido"
   → POST /api/child/orders
   
Backend:
   → Valida hijo tiene padre aprobado
   → Valida total $13 <= spending_limit $50
   → Crea registro en child_orders (status='pending')
   → Crea items en child_order_items
   
B. PADRE REVISA Y APRUEBA:
   → Login
   → Profile → "Mis Hijos"
   → Click "Carlos Jr: Pedido pendiente $13"
   → Ve detalle del pedido
   → Click "✅ Aprobar"
   → PUT /api/parent/orders/{id}/approve
   
Backend:
   → Cambia status a 'approved'
   → Deduce de spending_limit del mes
   → Notificación (email/toast) al hijo
   
C. PADRE MARCA COMO PAGADO:
   → Hijo llega a la cafetería con código QR
   → Cafetero escanea y ve pedido aprobado
   → Padre confirma pago
   → PUT /api/parent/orders/{id}/pay
   
Backend:
   → Cambia status a 'paid'
   → Registra en historial
   → Notificación de entrega
   
✅ Pedido completado
```

---

## 🔐 Sistema de Seguridad

### 1. Autenticación (JWT)
- Login genera JWT válido 7 días
- Token guardado en localStorage
- Todas solicitudes include: `Authorization: Bearer {token}`
- `/api/auth/me` valida sesión al cargar app

### 2. Rate Limiting
- Login: max 5 intentos/15min por IP
- Register: max 3 intentos/30min por IP
- Linking: max 10 solicitudes/día por usuario

### 3. Role-Based Access Control (RBAC)
```
GET    /api/products          → Requiere token
POST   /api/products          → Requiere token + admin
PUT    /api/products/:id      → Requiere token + admin
DELETE /api/products/:id      → Requiere token + admin

GET    /api/parent/token              → Requiere adult
POST   /api/parent/link-requests/..   → Requiere adult
GET    /api/child/my-parents          → Requiere child
```

### 4. Validaciones
- Spending limits no pueden ser excedidos
- Solo 2 padres máximo por hijo
- Solo 10 hijos máximo por padre
- Contraseñas hasheadas con bcrypt (10 salt rounds)

### 5. Fraud Prevention
- Log de intentos fallidos
- Detección de patrones sospechosos
- Cooldown en operaciones repetidas

---

## 📊 Estado Actual por Fase

### ✅ FASE 1: Autenticación (COMPLETADO)
- [x] Register con validación edad
- [x] Login con JWT
- [x] Role assignment automático
- [x] Demo users (demo@demo.com, admin@admin.com)
- [x] Password hashing (bcrypt)

### ✅ FASE 2: Sistema Padre-Hijo (COMPLETADO)
- [x] Parent token generation
- [x] Link request workflow
- [x] Approval/rejection de vínculos
- [x] Spending limits
- [x] LinkRequestsList UI integrado

### ✅ FASE 2.5: Security Hardening (COMPLETADO - Sprint Q1 2026)
- [x] JWT_SECRET validation
- [x] API endpoints protected with Bearer auth
- [x] Admin role guard (product CRUD)
- [x] Session rehidration (/auth/me)
- [x] Runtime imports fixed (toasts)
- [x] Family endpoints have DB fallback
- [x] Build validated

### 🚀 FASE 3: Child Orders (PRÓXIMO)
- [ ] Create order endpoints
- [ ] Parent approval flow
- [ ] Spending limit enforcement
- [ ] Order history
- [ ] Email notifications (optional)

### 📋 FASE 4: Analytics & Admin Dashboard (FUTURO)
- [ ] Order statistics
- [ ] Spending reports
- [ ] Popular products
- [ ] Admin dashboard UI

---

## 🛠️ Stack Técnico

### Backend
- **Runtime**: Node.js 18+
- **Framework**: Express 4.x
- **Database**: PostgreSQL (primary) + Supabase (optional)
- **Auth**: JWT + bcrypt
- **Security**: Rate limiting, fraud prevention
- **Database Driver**: `pg` (PostgreSQL Node client)

### Frontend
- **UI Framework**: React 18
- **Build Tool**: Vite 5.x
- **Components**: Ionic (mobile-friendly)
- **State**: React Context (CartContext)
- **API Client**: Custom fetch wrapper con auth headers
- **Styling**: Custom CSS + Ionic

### Database Schema
```
users
  ├── id (PK)
  ├── email (unique)
  ├── password_hash
  ├── name
  ├── birth_date
  ├── is_adult (calculated)
  ├── role (admin|parent|customer|child)
  ├── parent_token (unique, nullable)
  ├── created_at
  └── updated_at

parent_child_links
  ├── id (PK)
  ├── parent_id (FK → users)
  ├── child_id (FK → users)
  ├── status (pending|active|rejected)
  ├── spending_limit (monthly)
  ├── current_spent (this month)
  ├── created_at
  └── approved_at

products
  ├── id (PK)
  ├── name
  ├── price
  ├── available
  ├── created_at
  └── updated_at

child_orders (FASE 3)
  ├── id (PK)
  ├── child_id (FK → users)
  ├── parent_id (FK → users)
  ├── status (pending|approved|rejected|paid)
  ├── total
  ├── created_at
  └── ...

fraud_prevention_log
  ├── id (PK)
  ├── user_id (FK)
  ├── action
  ├── severity
  ├── created_at
```

---

## 📈 Métricas del Proyecto

### Código Generado
- **Backend**: ~2030 líneas (index.js)
- **Frontend**: ~1500+ líneas (components + lib)
- **Database**: Schema + init scripts
- **Documentation**: 6 archivos MD

### Componentes Frontend
- **Auth**: FancyLogin, LoginScreen
- **Shopping**: ProductCard, Cart, Checkout
- **Family**: LinkParentModal, LinkRequestsList
- **Profile**: ProfileModal, DashboardAdmin
- **UI**: Toast, Dialog, Loading states

### Endpoints API
- **Auth**: 3 (register, login, me)
- **Products**: 4 (get, post, put, delete)
- **Parent**: 6+ (token, link-requests, approve, my-children)
- **Child**: 5+ (link-parent, my-parents, orders)
- **Total**: 18+ endpoints

### Seguridad
- Rate limiters: 3 (login, register, linking)
- Middleware: 2 (authenticateToken, requireAdmin)
- Validations: 5+ (spending limits, age, role-based)

---

## 🚀 Próximos Pasos

### Immediatamente
1. Testear localmente: `npm run dev` (backend + frontend)
2. Probar flujo completo: Register → Login → Link → Approve
3. Verificar que admins pueden crear productos

### En la Próxima Sesión (FASE 3)
1. Implementar endpoints de pedidos
2. Crear componentes de aprobación
3. Agregar validaciones de spending limit
4. Integración test end-to-end

### Después de FASE 3
1. Email notifications
2. Analytics dashboard
3. Production deployment
4. User testing con escuela

---

## 📞 Cómo Arrancar Ahora

### Backend
```bash
cd backend
cp ../.env.example ../.env
# Editar .env si quieres custom JWT_SECRET
npm install
npm run dev
# Accede en http://localhost:3000/api
```

### Frontend
```bash
cd frontend
npm install
npm run dev
# Accede en http://localhost:5173
```

### Test Demo Users
- **Admin**: admin@admin.com / admin
- **User**: demo@demo.com / demo

---

## 📚 Documentación Disponible

| Archivo | Contenido |
|---------|----------|
| `ESTADO_IMPLEMENTACION.md` | Estado actual del proyecto |
| `CAMBIOS_Q1_2026.md` | Detalles técnicos de cambios recientes |
| `VERIFICACION_SPRINT.md` | Checklist y validaciones |
| `FASE3_ROADMAP.md` | Endpoints y componentes para FASE 3 |
| `DOCUMENTACION_PROYECTO.md` | Docs antigua (referencia) |

---

## 🎉 Conclusión

**Estado**: MVP funcional y seguro para FASE 2
**Bloqueadores**: Ninguno
**Listo para**: Testing local, FASE 3 cuando quieras
**Próximo**: Pedidos de hijos (FASE 3)

---

**Última actualización**: Q1 2026 - Security Hardening Sprint
**Commits**: Múltiples patches, 615+ líneas de código
**Build Status**: ✅ Vite passed, ✅ Node syntax valid
**Ready for**: Deployment o E2E testing
