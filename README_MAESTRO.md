# 📋 ÍNDICE MAESTRO - CafeteriaApp SSG (2026)

**Última actualización:** 4 de Marzo 2026 (fin de día)  
**Estado:** FASE 3 COMPLETADA (Pedidos de Hijos) ✅

---

## 📑 NAVEGACIÓN POR TEMAS

### 🎯 Para Entender el Proyecto
1. **[VISION_GENERAL.md](./VISION_GENERAL.md)** - Visión general del proyecto
2. **[ESTADO_IMPLEMENTACION.md](./ESTADO_IMPLEMENTACION.md)** - Estado actual SPRINT (Seguridad + Fase 3)
3. **[COMO_FUNCIONA_EL_PROYECTO.md](./COMO_FUNCIONA_EL_PROYECTO.md)** - Guía funcional por módulos y flujos reales del código
4. **README_MAESTRO.md** ← **ESTÁS AQUÍ** (Índice integrado + flujos + endpoints)

### 👥 Sistema Padre-Hijo (Core)
- **[SISTEMA_PADRE_HIJO.md](./SISTEMA_PADRE_HIJO.md)** - Arquitectura BD + flujos + medidas anti-fraude
- **[SISTEMA_AUTENTICACION.md](./SISTEMA_AUTENTICACION.md)** - JWT, registro, login, roles
- **[LinkParentModal.jsx](./frontend/src/components/LinkParentModal.jsx)** - UI: Vincular con padre

### 🛒 Pedidos de Hijos (FASE 3)
- **[FASE3_COMPLETADA.md](./FASE3_COMPLETADA.md)** - Detalles completos de endpoints, componentes, validaciones
- **[ChildOrderForm.jsx](./frontend/src/components/ChildOrderForm.jsx)** - UI: Crear pedido como hijo
- **[ParentOrdersList.jsx](./frontend/src/components/ParentOrdersList.jsx)** - UI: Listar pedidos de hijo (padre)
- **[OrderDetailModal.jsx](./frontend/src/components/OrderDetailModal.jsx)** - UI: Detalle de pedido

### 🔒 Seguridad & Anti-Fraude
- **[IMPLEMENTACION_COMPLETADA.md](./IMPLEMENTACION_COMPLETADA.md)** - Medidas, rate limiting, fraud log
- **[CAMBIOS_Q1_2026.md](./CAMBIOS_Q1_2026.md)** - Detalles técnicos de cambios de seguridad

### 📱 Contrato de API
- **[API_CONTRACT.md](./API_CONTRACT.md)** - Estructura exacta de JSON (GET productos, POST órdenes, etc.)

### 📖 Documentación de Desarrollo
- **[GIT_WORKFLOW.md](./GIT_WORKFLOW.md)** - Convenciones, flujo de gitflow
- **[CONTRIBUTING.md](./CONTRIBUTING.md)** - Guía de contribución
- **[INTEGRATION_GUIDE.md](./INTEGRATION_GUIDE.md)** - Integración Supabase + PostgreSQL

---

## 🚀 RESUMEN RÁPIDO DEL PROYECTO

### ¿Qué Hacemos?
Aplicación móvil de cafetería escolar donde:
- **Menores (hijos)** crean pedidos
- **Adultos (padres)** los aprueban y pagan
- **Sistema robusto** de anti-fraude y límites de gasto

### Tecnología
| Layer | Tech |
|-------|------|
| **Frontend** | React + JSX (Vite) |
| **Backend** | Node.js + Express |
| **BD Primary** | Supabase (PostgreSQL) |
| **BD Fallback** | PostgreSQL local |

### Dependencias de ejecución
- `frontend/`: `react`, `react-dom`, `@ionic/react`, `ionicons`, `@capacitor/*`, `vite`
- `backend/`: `express`, `pg`, `bcryptjs`, `jsonwebtoken`, `dotenv`, `cors`, `@supabase/supabase-js`, `firebase-admin`, `stripe`

### Instalación rápida de dependencias
```bash
cd backend && npm install
cd ../frontend && npm install
```

Si prefieres instalaciones reproducibles con lockfile:
```bash
cd backend && npm ci
cd ../frontend && npm ci
```

### Estado Actual
- ✅ Sistema padre-hijo completo (vinculación, aprobación)
- ✅ FASE 3: Pedidos de hijos (crear, aprobar, pagar, rechazar)
- ✅ Seguridad: JWT hardening, roles coherentes, rate limiting
- ✅ Anti-fraude: Scoring, logging, límites inteligentes
- 🚧 Admin dashboard: **A IMPLEMENTAR**

---

## 📊 FLUJO DE VINCULACIÓN FAMILIAR (completo)

### Diagrama del Flujo
```
REGISTRO
   ↓
Adulto (age ≥18) → role="parent" + parent_token único (8 caracteres)
   ↓
Menor (age <18)  → role="child", puede solicitar vinculación
   ↓
VINCULACIÓN
   ↓
Hijo obtiene token del padre (ej: "ABC12XYZ")
   ↓
POST /api/child/link-parent { parentToken: "ABC12XYZ" }
   ↓
Validaciones:
  ✓ Token existe y pertenece a un padre
  ✓ Hijo no tiene ya 2 padres activos
  ✓ Padre no tiene ya 10 hijos
  ✓ No hay solicitud duplicada pendiente
  ✓ Rate limit: max 10 solicitudes/día
   ↓
Link creado con status="pending"
   ↓
Padre ve notificación & solicitud en UI
   ↓
APROBACIÓN (por el padre)
   ↓
PUT /api/parent/link-requests/:id/approve
Body: { spendingLimit: 20.00 } (optional)
   ↓
Link actualizado: status="active"
spending_limit establecido
   ↓
Hijo ahora puede:
  • Ver información del padre
  • Crear pedidos (hasta spending_limit)
  • Ver estado de pedidos
   ↓
PEDIDOS DEL HIJO
   ↓
POST /api/child/orders
{
  items: [{ product_id, quantity, chosen_options }],
  delivery_time: timestamp,
  notes: "Sin azúcar, porfa"
}
   ↓
Validaciones:
  ✓ Total > $5.00 (monto mínimo)
  ✓ Total < spending_limit del padre
  ✓ Productos disponibles
   ↓
Order creada con status="pending_approval"
   ↓
APROBACIÓN DEL PEDIDO (por el padre)
   ↓
Padre ve en /api/parent/child-orders
Puede:
  • Aprobar: PUT /api/parent/orders/:id/approve
  • Rechazar: PUT /api/parent/orders/:id/reject
  • Modificar: PUT /api/parent/orders/:id/modify
   ↓
Si aprobado → status="approved"
   ↓
PAGO
   ↓
Padre paga: PUT /api/parent/orders/:id/pay
   ↓
Order status → "paid"
Fecha de entrega se confirma
   ↓
[FIN]
```

### Estados de Link (parent_child_links)
| Estado | Descripción | Quién actúa |
|--------|-------------|------------|
| `pending` | Solicitud creada, esperando aprobación | Padre |
| `active` | Aprobado, relación activa | - |
| `rejected` | Padre rechazó | - |
| `suspended` | (Futuro) Fraude detectado | Admin |

### Estados de Pedido (child_orders)
| Estado | Descripción |
|--------|-------------|
| `pending_approval` | Hijo creó, esperando padre |
| `approved` | Padre aprobó, listo para pagar |
| `modified` | Padre modificó algo |
| `paid` | Padre pagó, orden confirmada |
| `rejected` | Padre rechazó |
| `cancelled` | Cancelado (por hijo o admin) |

---

## 🔌 ENDPOINTS DISPONIBLES (Listado Completo)

### 🔐 AUTENTICACIÓN

#### `POST /api/auth/register`
Registra usuario nuevo (adulto o menor)
```json
{
  "email": "usuario@ejemplo.com",
  "password": "segura123",
  "name": "Juan López",
  "birth_date": "2010-05-15"
}
```
**Response (201):**
```json
{
  "user": {
    "id": 42,
    "email": "usuario@ejemplo.com",
    "name": "Juan López",
    "role": "child",           // o "parent" si age≥18
    "is_adult": false,         // o true
    "parent_token": "ABC12XYZ", // solo si parent
    "created_at": "2026-03-04T..."
  },
  "token": "eyJhbGc..."
}
```

#### `POST /api/auth/login`
Login usuario existente
```json
{
  "email": "usuario@ejemplo.com",
  "password": "segura123"
}
```
**Response (200):** Mismo formato que register

#### `GET /api/auth/me`
Obtiene datos del usuario autenticado
**Headers:** `Authorization: Bearer <token>`
**Response:** Mismo formato user object

---

### 👨‍👩‍👧‍👦 SISTEMA PADRE-HIJO

#### `GET /api/parent/token`
Obtiene token único del padre para compartir con hijos
**Auth:** Requiere token + role=parent/admin
**Response (200):**
```json
{
  "token": "ABC12XYZ"
}
```

#### `POST /api/child/link-parent`
Hijo solicita vinculación con padre
**Auth:** Requiere token + role=child
**Body:**
```json
{
  "parentToken": "ABC12XYZ"
}
```
**Response (201):**
```json
{
  "link_id": 5,
  "status": "pending",
  "requested_at": "2026-03-04T..."
}
```

#### `GET /api/parent/link-requests`
Lista solicitudes de vinculación pendientes
**Auth:** Requiere token + role=parent
**Response (200):**
```json
{
  "requests": [
    {
      "id": 5,
      "child_id": 10,
      "child_name": "María",
      "child_email": "maria@ejemplo.com",
      "status": "pending",
      "requested_at": "2026-03-04T..."
    }
  ]
}
```

#### `PUT /api/parent/link-requests/:id/approve`
Padre aprueba solicitud
**Auth:** Requiere token + role=parent
**Body:**
```json
{
  "spendingLimit": 25.00
}
```
**Response (200):**
```json
{
  "message": "Link approved",
  "status": "active",
  "spending_limit": 25.00
}
```

#### `PUT /api/parent/link-requests/:id/reject`
Padre rechaza solicitud
**Auth:** Requiere token + role=parent
**Body:**
```json
{
  "reason": "No es mi hijo"
}
```
**Response (200):**
```json
{
  "message": "Link rejected",
  "status": "rejected"
}
```

#### `GET /api/child/my-parents`
Hijo lista sus padres (activos y pendientes)
**Auth:** Requiere token + role=child
**Response (200):**
```json
{
  "parents": [
    {
      "id": 3,
      "name": "Carlos López",
      "link_id": 5,
      "status": "active",
      "spending_limit": 25.00
    }
  ]
}
```

#### `GET /api/parent/my-children`
Padre lista sus hijos
**Auth:** Requiere token + role=parent
**Response (200):**
```json
{
  "children": [
    {
      "id": 10,
      "name": "María",
      "email": "maria@ejemplo.com",
      "link_id": 5,
      "status": "active",
      "can_order": true
    }
  ]
}
```

---

### 📦 PRODUCTOS

#### `GET /api/products`
Lista productos disponibles
**Auth:** Requiere token
**Response (200):**
```json
[
  {
    "id": 1,
    "name": "Café con Leche",
    "description": "Café espresso con leche espumada",
    "price": 1.20,
    "original_price": 1.50,
    "category": "cafes",
    "image": "https://...",
    "badges": ["popular"],
    "allergens": ["lactosa"],
    "options": {
      "sugar": { "available": true, "max": 3, "step": 1 },
      "removables": ["leche", "cacao"]
    }
  }
]
```

#### `POST /api/products`
Crea producto (admin only)
**Auth:** Requiere token + admin
**Body:** Mismo estructura de producto
**Response (201):** Producto creado con id

#### `PUT /api/products/:id`
Actualiza producto (admin only)
**Auth:** Requiere token + admin
**Body:** Campos a actualizar
**Response (200):** Producto actualizado

#### `DELETE /api/products/:id`
Elimina producto (admin only)
**Auth:** Requiere token + admin
**Response (200):** Confirmación

---

### 🛒 PEDIDOS REGULARES (Usuarios normales)

#### `POST /api/orders`
Crea pedido (usuario normal)
**Auth:** Requiere token
**Body:**
```json
{
  "items": [
    {
      "product_id": 1,
      "quantity": 2,
      "notes": "Muy caliente",
      "chosen_options": {
        "sugar": 2,
        "removed": ["cacao"]
      }
    }
  ]
}
```
**Response (201):**
```json
{
  "order_id": 5050,
  "status": "PAID",
  "total": 2.40,
  "message": "Pedido confirmado"
}
```

#### `GET /api/orders`
Lista pedidos del usuario
**Auth:** Requiere token
**Response (200):** Array de órdenes del usuario

---

### 👧 PEDIDOS DE HIJOS (FASE 3)

#### `POST /api/child/orders`
Hijo crea pedido para aprobación del padre
**Auth:** Requiere token + role=child + link activo
**Body:**
```json
{
  "parent_id": 3,
  "items": [
    {
      "product_id": 1,
      "quantity": 2,
      "chosen_options": {
        "sugar": 1,
        "removed": []
      }
    }
  ],
  "delivery_time": "2026-03-04T12:30:00Z",
  "notes": "Sin azúcar, porfa"
}
```
**Response (201):**
```json
{
  "order_id": 101,
  "status": "pending_approval",
  "total": 2.40,
  "message": "Pedido enviado a padre para aprobación"
}
```

#### `GET /api/child/orders`
Hijo lista sus pedidos
**Auth:** Requiere token + role=child
**Response (200):**
```json
{
  "orders": [
    {
      "id": 101,
      "status": "pending_approval",
      "total": 2.40,
      "items_count": 2,
      "parent_name": "Carlos",
      "created_at": "2026-03-04T..."
    }
  ]
}
```

#### `GET /api/child/orders/:id`
Detalle de pedido del hijo
**Auth:** Requiere token + role=child
**Response (200):** Detalle completo con items

---

#### `GET /api/parent/child-orders`
Padre lista pedidos de sus hijos
**Auth:** Requiere token + role=parent
**Query params:** `?status=pending_approval` (opcional)
**Response (200):**
```json
{
  "orders": [
    {
      "id": 101,
      "child_id": 10,
      "child_name": "María",
      "status": "pending_approval",
      "total": 2.40,
      "items_count": 2,
      "created_at": "2026-03-04T..."
    }
  ]
}
```

#### `GET /api/parent/orders/:id`
Padre ve detalle de pedido de su hijo
**Auth:** Requiere token + role=parent
**Response (200):**
```json
{
  "id": 101,
  "child_id": 10,
  "child_name": "María",
  "status": "pending_approval",
  "items": [
    {
      "product_id": 1,
      "name": "Café",
      "quantity": 2,
      "price": 1.20,
      "subtotal": 2.40,
      "chosen_options": { "sugar": 1 }
    }
  ],
  "subtotal": 2.40,
  "tax": 0.24,
  "total": 2.64,
  "notes": "Sin azúcar, porfa",
  "delivery_time": "2026-03-04T12:30:00Z",
  "created_at": "2026-03-04T10:00:00Z"
}
```

#### `PUT /api/parent/orders/:id/approve`
Padre aprueba pedido
**Auth:** Requiere token + role=parent
**Response (200):**
```json
{
  "message": "Order approved",
  "status": "approved"
}
```

#### `PUT /api/parent/orders/:id/reject`
Padre rechaza pedido
**Auth:** Requiere token + role=parent
**Body:**
```json
{
  "reason": "Demasiado caro"
}
```
**Response (200):**
```json
{
  "message": "Order rejected",
  "status": "rejected",
  "rejection_reason": "Demasiado caro"
}
```

#### `PUT /api/parent/orders/:id/modify`
Padre modifica items o cantidad
**Auth:** Requiere token + role=parent
**Body:**
```json
{
  "items": [
    {
      "product_id": 1,
      "quantity": 1
    }
  ]
}
```
**Response (200):**
```json
{
  "message": "Order modified",
  "status": "modified",
  "new_total": 1.32
}
```

#### `PUT /api/parent/orders/:id/pay`
Padre marca pedido como pagado
**Auth:** Requiere token + role=parent
**Response (200):**
```json
{
  "message": "Order marked as paid",
  "status": "paid",
  "paid_at": "2026-03-04T10:30:00Z"
}
```

#### `GET /api/parent/child-orders/history`
Padre ve historial de pedidos (aprobados + pagados)
**Auth:** Requiere token + role=parent
**Response (200):**
```json
{
  "history": [
    {
      "id": 101,
      "child_name": "María",
      "total": 2.64,
      "status": "paid",
      "paid_at": "2026-03-04T"
    }
  ]
}
```

---

## ❌ LO QUE FALTA POR IMPLEMENTAR

### 🚨 CRÍTICO (Antes de producción)

#### 0. **Retirar ayudas temporales de desarrollo y pruebas**
Antes de desplegar a producción hay que revisar y desactivar cualquier atajo, bypass o comportamiento pensado para testing local.

- [ ] Confirmar que no quedan flags de desarrollo activas en `.env`
- [ ] Eliminar o desactivar bypass de pago, respuestas mock, redirecciones especiales y flujos sin cobro real
- [ ] Revisar que cualquier fallback pensado para QA no quede accesible desde usuarios reales
- [ ] Verificar manualmente el flujo real de pago en entorno preproductivo

**Ejemplo actual a retirar o dejar desactivado:** `DEV_BYPASS_STRIPE_PAYMENT`

**Regla de equipo:** toda característica temporal que altere seguridad, cobro, autenticación, permisos o integridad de pedidos debe documentarse y quedar fuera de producción antes del release.

#### 1. **Admin Dashboard** 🔴
Interfaz de administrador para:
- Ver estadísticas globales (usuarios, órdenes, ingresos)
- Gestionar productos (crear, editar, eliminar)
- Ver log de fraude
- Suspender/reactivar usuarios
- **Línea en App:** Componente `AdminDashboard.jsx` en `/frontend/src/pages/`
- **Endpoints necesarios:** GET `/api/admin/statistics`, GET `/api/admin/fraud-log`, etc.

#### 2. **Completar Interfaz Usuario App**
Componentes pendientes:
- [ ] **HistoryModal.jsx** ✓ Existe pero sin integración
- [ ] **TechnicalSheetModal.jsx** ✓ Existe pero sin nutrir
- [ ] **Overlay.jsx** ✓ Existe pero sin uso
- [ ] Integración completa de errores en flujos de pedidos
- **Línea en App:** MainScreen.jsx → módulo de historial

#### 3. **Email Transaccional** 🔴
Sistema de notificaciones:
- Confirmación de vinculación familiar
- Notificación de solicitud de pedido
- Confirmación de aprobación/rechazo
- Alertas de fraude
- **Backend:** Nuevo módulo `src/services/emailService.js`

#### 4. **Perfil de Usuario Editable** 🟡
- Cambiar contraseña
- Actualizar datos personales
- Confirmar email/teléfono
- Configurar preferencias de notificación
- **Frontend:** Expandir `ProfileModal.jsx`

### 🟡 IMPORTANTE (Próximo sprint)

#### 5. **Estadísticas y Analytics**
- Dashboard para padres (qué gasta hijo, cuándo)
- Reportes mensuales de gasto
- Gráficas de tendencias
- **Endpoints:** GET `/api/analytics/child-spending`

#### 6. **Búsqueda de Productos Avanzada**
- Filtros por alergia
- Búsqueda por nombre
- Ordenamiento (precio, popularidad, nuevos)
- **Frontend:** Expandir `Categories.jsx` + `ProductsGrid.jsx`

#### 7. **Favoritos/Historial de Compra**
- Guardar productos favoritos
- Repetir pedido anterior
- Tabla `user_favorites`
- **Frontend:** Componente `FavoriteButton.jsx`

#### 8. **Notificaciones en Tiempo Real** 🟡
- WebSocket para actualizaciones live
- Push notifications
- Toast mejorados con auto-dismiss
- **Backend:** Socket.io integration

### 🟢 FUTURO (Nice to have)

#### 9. **Múltiples Métodos de Pago**
- Tarjeta de crédito
- PayPal
- Billetera digital escolar
- **Servicio:** Stripe/Mercado Pago integration

#### 10. **Sistema de Recompensas** 🟢
- Puntos por cada compra
- Canjeable por descuentos
- Logros/badges
- Tabla `user_rewards`

#### 11. **Admin: Gestión de Horarios** 🟢
- Cuándo abre/cierra la cafetería
- Horarios especiales
- Fechas no operativas
- **Tabla:** `cafeteria_hours`

---

## 📱 LÍNEA DE INTERFAZ DE USUARIO (Mapa de Componentes)

### Estructura Actual (App.jsx / AppMobile.jsx)
```
App
├── LoginScreen (pantalla inicial)
│   ├── FancyLogin (formulario)
│   └── [Demo login, Admin login]
│
├── MainScreen (pantalla principal logueado)
│   ├── TopBar
│   │   ├── Logo
│   │   └── Usuario logueado
│   │
│   ├── Categories (filtros productos)
│   │
│   ├── ProductsGrid
│   │   └── ProductCard (click → ProductModal)
│   │       └── ProductModal
│   │           ├── Descripción + Imagen
│   │           ├── Alérgenos
│   │           └── Opciones (azúcar, remover items)
│   │
│   ├── BottomNav (navegación móvil)
│   │   ├── Shopping (carrito)
│   │   ├── Familia (vinculación)
│   │   ├── Historial
│   │   ├── Profile (perfil)
│   │   └── Menú (más opciones)
│   │
│   └── Modales (en modal overlay)
│       ├── CartModal (ver/editar carrito)
│       │   └── CheckoutModal (finalizar compra)
│       │
│       ├── LinkParentModal (vincular con padre)
│       │   └── Ingresa parent_token
│       │
│       ├── LinkRequestsList (solicitudes pendientes)
│       │   └── Acciones: aprobar/rechazar
│       │
│       ├── ChildOrderForm (hijo crea pedido)
│       │   └── Validaciones de límite
│       │
│       ├── ParentOrdersList (padre ve pedidos hijos)
│       │   └── Filtros por estado
│       │
│       ├── OrderDetailModal (detalle de pedido)
│       │   └── Acciones: aprobar/rechazar/pagar
│       │
│       ├── HistoryModal (historial órdenes) ← PENDIENTE INTEGRACIÓN
│       │
│       ├── ProfileModal (perfil usuario)
│       │   ├── Datos personales
│       │   ├── LinkRequestsList (si es padre)
│       │   └── Botón logout
│       │
│       └── TechnicalSheetModal (detalles técnicos) ← PENDIENTE USO
│
└── [AdminDashboard] ← 🚨 NO EXISTE, A CREAR
    ├── Estadísticas globales
    ├── Gestión de productos
    ├── Log de fraude
    └── Gestión de usuarios
```

### Dónde Colocar AdminDashboard
```javascript
// App.jsx (lógica)
if (currentUser?.role === 'admin') {
  return <AdminDashboard />;  // En lugar de MainScreen
}

// O mejor: ruta separada
// /home → MainScreen
// /admin → AdminDashboard
```

**Nuevo componente a crear:**
- `/frontend/src/pages/AdminDashboard.jsx` (~300 líneas)
- `/frontend/src/pages/AdminDashboard.css` (~200 líneas)
- `/frontend/src/components/AdminStats.jsx` (subcomponente)
- `/frontend/src/components/ProductManager.jsx` (subcomponente)
- `/frontend/src/components/FraudLog.jsx` (subcomponente)

---

## 🔄 PRÓXIMOS PASOS (Checklist para siguiente fase)

### Hoy (4 marzo)
- [x] Revisar estado actual
- [x] Documentar flujos
- [ ] Asignar tareas a integrantes

### Mañana (5 marzo)
- [ ] Integrante A: Comenzar AdminDashboard
- [ ] Integrante B: Completar HistoryModal + integración
- [ ] Integrante C: Email transaccional

### Esta semana
- [ ] Testing de flujos padre-hijo
- [ ] Correcciones de UX
- [ ] Documentación API adicional

---

## 📞 QUICK LINKS & COMANDOS

### Desarrollo Local
```bash
# Backend
cd backend && npm install && npm run dev

# Frontend
cd frontend && npm install && npm run dev
```

### Testing Common Flows
```bash
# 1. Registro adulto
POST /api/auth/register
{
  "email": "papa@test.com",
  "password": "test123",
  "name": "Papá",
  "birth_date": "1990-01-01"
}
→ Recibe parent_token (ej: "ABC12XYZ")

# 2. Registro menor
POST /api/auth/register
{
  "email": "hijo@test.com",
  "password": "test123",
  "name": "Hijito",
  "birth_date": "2012-01-01"
}

# 3. Hijo vincula
POST /api/child/link-parent
{ "parentToken": "ABC12XYZ" }

# 4. Padre aprueba
PUT /api/parent/link-requests/1/approve
{ "spendingLimit": 25.00 }

# 5. Hijo crea pedido
POST /api/child/orders
{
  "parent_id": 1,
  "items": [...],
  "delivery_time": "..."
}
```

---
**Última versión:** Incluye FASE 3 completa + Seguridad Q1
