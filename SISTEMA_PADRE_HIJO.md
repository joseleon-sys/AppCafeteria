# 🔐 Sistema Padre-Hijo con Tokens - Propuesta Completa

## 📊 1. ESTRUCTURA DE BASE DE DATOS

### Tabla `users` (actualizada)
```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'customer', -- 'admin', 'parent', 'child', 'customer'
  is_adult BOOLEAN DEFAULT false,
  birth_date DATE,
  parent_token VARCHAR(10) UNIQUE, -- Token único generado para padres
  phone VARCHAR(20), -- Para verificación adicional
  verified_phone BOOLEAN DEFAULT false,
  verified_email BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  last_login TIMESTAMP,
  active BOOLEAN DEFAULT true
);
```

### Nueva tabla: `parent_child_links`
```sql
CREATE TABLE parent_child_links (
  id SERIAL PRIMARY KEY,
  parent_id INT REFERENCES users(id) ON DELETE CASCADE,
  child_id INT REFERENCES users(id) ON DELETE CASCADE,
  status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'active', 'rejected', 'suspended'
  requested_at TIMESTAMP DEFAULT NOW(),
  approved_at TIMESTAMP,
  spending_limit NUMERIC(10,2) DEFAULT 20.00, -- Límite de gasto diario/mensual
  can_order BOOLEAN DEFAULT true,
  notes TEXT,
  UNIQUE(parent_id, child_id)
);

CREATE INDEX idx_parent_child_parent ON parent_child_links(parent_id);
CREATE INDEX idx_parent_child_child ON parent_child_links(child_id);
```

### Nueva tabla: `child_orders` (pedidos de hijos)
```sql
CREATE TABLE child_orders (
  id SERIAL PRIMARY KEY,
  child_id INT REFERENCES users(id) ON DELETE SET NULL,
  parent_id INT REFERENCES users(id) ON DELETE SET NULL,
  link_id INT REFERENCES parent_child_links(id),
  status VARCHAR(50) DEFAULT 'pending_approval', 
  -- Posibles estados: 'pending_approval', 'approved', 'modified', 'paid', 'rejected', 'cancelled'
  total NUMERIC(10, 2) DEFAULT 0,
  items JSONB NOT NULL, -- Array de items del pedido
  notes TEXT,
  delivery_time TIMESTAMP, -- Cuándo quiere recogerlo
  created_at TIMESTAMP DEFAULT NOW(),
  reviewed_at TIMESTAMP,
  paid_at TIMESTAMP,
  cancelled_at TIMESTAMP,
  rejection_reason TEXT
);

CREATE INDEX idx_child_orders_child ON child_orders(child_id);
CREATE INDEX idx_child_orders_parent ON child_orders(parent_id);
CREATE INDEX idx_child_orders_status ON child_orders(status);
```

### Nueva tabla: `fraud_prevention_log`
```sql
CREATE TABLE fraud_prevention_log (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id),
  action_type VARCHAR(100), -- 'token_check', 'link_request', 'excessive_links', etc.
  severity VARCHAR(20), -- 'low', 'medium', 'high'
  details JSONB,
  ip_address VARCHAR(50),
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_fraud_log_user ON fraud_prevention_log(user_id);
CREATE INDEX idx_fraud_log_severity ON fraud_prevention_log(severity);
```

---

## 🔒 2. MEDIDAS ANTI-FRAUDE

### A) **Límites Estrictos**
1. **Máximo de padres por hijo**: 2 padres (para familias separadas)
2. **Máximo de hijos por padre**: 10 hijos
3. **Cooldown de vinculación**: No más de 3 solicitudes en 24h
4. **Verificación obligatoria**: Email + teléfono para padres

### B) **Validaciones en Tiempo Real**
```javascript
// Reglas anti-fraude:
- Un mismo hijo no puede tener más de 2 padres activos
- Un padre no puede vincular más de 10 hijos
- No se pueden crear más de 3 vínculos en 24 horas (mismo usuario)
- Tokens de padre expiran cada 90 días (deben renovarse)
- Los pedidos tienen límite de gasto configurado por padre
- Máximo 5 pedidos pendientes por hijo
```

### C) **Sistema de Reputación**
```javascript
// Puntuación de confianza (0-100):
- Inicio: 50 puntos
- Email verificado: +10
- Teléfono verificado: +15
- Primer pedido completado: +5
- Cada pedido rechazado por padre: -3
- Intento de vincular >2 padres: -20 (sospechoso)
- Pedidos cancelados frecuentemente: -2
- Cuenta >30 días sin problemas: +10
```

### D) **Alertas Automáticas**
- ⚠️ Si un hijo intenta vincular más de 2 padres → requiere revisión manual
- ⚠️ Si un padre vincula >5 hijos en 1 semana → verificación adicional
- ⚠️ Si hay muchos pedidos cancelados (>50%) → suspensión temporal
- ⚠️ Pedidos muy caros desde cuentas nuevas → requieren aprobación admin

---

## 🎯 3. FLUJO DE USUARIO

### **Registro (con edad)**
```
1. Usuario ingresa nombre, email, contraseña, fecha de nacimiento
2. Sistema calcula si es mayor de 18
3. Si es mayor → rol "parent", se genera token único de 8 caracteres
4. Si es menor → rol "child", puede solicitar vinculación
5. Se envía email de verificación
```

### **Vinculación Padre-Hijo**
```
DESDE EL HIJO:
1. Hijo va a "Vincular con Padre"
2. Introduce el token del padre (ej: "ABC12XYZ")
3. Sistema valida:
   - Token existe
   - No tiene ya 2 padres
   - Padre no tiene ya 10 hijos
4. Se crea link con status "pending"
5. Padre recibe notificación

DESDE EL PADRE:
1. Padre ve solicitud en su dashboard
2. Puede aprobar/rechazar
3. Si aprueba → configura límite de gasto
4. Status cambia a "active"
```

### **Crear Pedido (Hijo)**
```
1. Hijo navega productos y añade al carrito
2. Al finalizar, pulsa "Enviar a Padre"
3. Selecciona qué padre (si tiene varios)
4. Puede añadir nota: "Para mañana 10:30"
5. Pedido se guarda con status "pending_approval"
6. Padre recibe notificación
```

### **Dashboard Padre**
```
VER PEDIDOS PENDIENTES:
- Lista de pedidos de todos sus hijos
- Filtros: por hijo, por fecha, por estado
- Acciones: Aprobar / Modificar / Rechazar

APROBAR:
- Pedido pasa a "approved"
- Puede ir a pagar (integración pasarela)
- Al pagar → status "paid"

MODIFICAR:
- Puede quitar items o cambiar cantidades
- Guarda cambios, notifica al hijo
- Status → "modified"

RECHAZAR:
- Debe dar un motivo
- Status → "rejected"
- Hijo ve el motivo
```

---

## 💡 4. IDEAS ADICIONALES

### A) **Gamificación para Hijos**
- 🏆 **Puntos por comportamiento**: Pedidos razonables suman puntos
- 🎁 **Recompensas**: Al llegar a X puntos, descuento del 10%
- 📊 **Estadísticas**: Cuánto han gastado este mes, productos favoritos

### B) **Control Parental Avanzado**
- 📅 **Horarios permitidos**: Solo pueden pedir entre 8:00-20:00
- 🚫 **Productos bloqueados**: Padre puede bloquear categorías (ej: dulces)
- 💰 **Presupuesto semanal/mensual**: Límite automático
- 📱 **Notificaciones push**: Cuando hijo hace pedido

### C) **Historial y Analytics**
- 📈 Gráficos de gastos mensuales por hijo
- 🥐 Productos más pedidos
- ⏰ Horarios pico de pedidos
- 💳 Resumen mensual para padres

### D) **Sistema de Aprobación Rápida**
- ✅ **Pre-aprobados**: Padre puede marcar ciertos productos como "siempre ok"
- ⚡ **Auto-aprobar**: Pedidos <5€ se aprueban automáticamente
- 🔔 **Solo notificar**: Padre solo recibe notificación post-pago

### E) **Seguridad Extra**
- 📧 **Verificación 2FA**: Para padres al aprobar pedidos >20€
- 🔐 **PIN de padre**: Código adicional para cambios críticos
- 📸 **Foto de perfil**: Verificación visual de identidad

### F) **Social Features**
- 👥 **Grupos familiares**: Varios padres gestionan varios hijos
- 💬 **Chat interno**: Padre e hijo pueden chatear sobre pedidos
- 📝 **Listas de deseos**: Hijo guarda productos para pedir después

---

## 🛠️ 5. IMPLEMENTACIÓN TÉCNICA

### Backend (Endpoints necesarios)

```javascript
// AUTENTICACIÓN
POST /api/auth/register
POST /api/auth/login
POST /api/auth/verify-email
POST /api/auth/verify-phone

// VINCULACIÓN
GET  /api/parent/token          // Obtener mi token de padre
POST /api/child/link-parent     // Vincular con padre (body: {parent_token})
GET  /api/parent/link-requests  // Ver solicitudes pendientes
PUT  /api/parent/link-requests/:id/approve
PUT  /api/parent/link-requests/:id/reject

// PEDIDOS DE HIJOS
POST /api/child/orders          // Crear pedido como hijo
GET  /api/parent/child-orders   // Ver todos los pedidos de mis hijos
PUT  /api/parent/orders/:id/approve
PUT  /api/parent/orders/:id/modify
PUT  /api/parent/orders/:id/reject
PUT  /api/parent/orders/:id/pay

// CONFIGURACIÓN
PUT  /api/parent/child/:childId/settings // Límites, horarios, etc.
GET  /api/parent/analytics      // Estadísticas
```

### Frontend (Componentes necesarios)

```
components/
  └── ParentDashboard/
      ├── PendingOrders.jsx
      ├── ChildList.jsx
      ├── LinkRequests.jsx
      ├── Analytics.jsx
      └── Settings.jsx
  └── ChildView/
      ├── LinkParent.jsx
      ├── CreateOrder.jsx
      ├── OrderHistory.jsx
      └── MyParents.jsx
```

---

## 🚀 6. ROADMAP DE DESARROLLO

### **FASE 1: MVP (2 semanas)**
- ✅ Actualizar BD con nuevas tablas
- ✅ Sistema de registro con edad
- ✅ Generación de tokens de padre
- ✅ Vinculación básica padre-hijo
- ✅ Crear pedido como hijo
- ✅ Dashboard padre simple (aprobar/rechazar)

### **FASE 2: Seguridad (1 semana)**
- ✅ Límites anti-fraude
- ✅ Log de acciones sospechosas
- ✅ Verificación email/teléfono
- ✅ Cooldowns y límites

### **FASE 3: Features Avanzadas (2 semanas)**
- ✅ Control parental (horarios, productos bloqueados)
- ✅ Presupuestos y límites
- ✅ Modificar pedidos
- ✅ Analytics básico

### **FASE 4: Pulido (1 semana)**
- ✅ Notificaciones
- ✅ Gamificación
- ✅ UI/UX mejorado
- ✅ Testing completo

---

## ⚠️ 7. CONSIDERACIONES LEGALES

1. **RGPD/Protección de Datos**:
   - Consentimiento de menores (<14 años requiere autorización parental)
   - Derecho al olvido
   - Datos mínimos necesarios

2. **Verificación de Edad**:
   - No confiar solo en fecha de nacimiento
   - Considerar verificación de identidad para padres

3. **Responsabilidad**:
   - Términos y condiciones claros
   - Padre es responsable legal de pagos
   - Sistema de reembolsos

---

## 🎨 8. MOCKUPS DE FLUJO

### Registro con Edad
```
┌─────────────────────────┐
│  Crear Cuenta           │
│                         │
│  Nombre: _________      │
│  Email:  _________      │
│  Contraseña: ______     │
│  Fecha Nac: __/__/__    │
│                         │
│  ☐ Acepto términos      │
│                         │
│  [  Registrarse  ]      │
└─────────────────────────┘
      ↓
  ¿Es >18?
      ↓
    SÍ → Rol: Parent + Token generado
    NO → Rol: Child
```

### Dashboard Padre
```
┌───────────────────────────────────┐
│  👨‍👧‍👦 Dashboard Padre            │
│  Tu token: ABC12XYZ [📋 Copiar]   │
├───────────────────────────────────┤
│  📊 Resumen Mensual               │
│  Gastado: 45.20€ / 100.00€        │
├───────────────────────────────────┤
│  🔔 Pedidos Pendientes (3)        │
│  ┌─────────────────────────┐     │
│  │ María - 6.50€           │     │
│  │ Café + Croissant        │     │
│  │ Para hoy 10:30          │     │
│  │ [✅ Aprobar] [✏️ Editar] [❌ Rechazar]
│  └─────────────────────────┘     │
├───────────────────────────────────┤
│  👥 Mis Hijos (2)                 │
│  • María (12 años) - Activa       │
│  • Juan (15 años) - Activo        │
└───────────────────────────────────┘
```

---

**¿Qué te parece esta propuesta? ¿Por dónde empezamos?** 🚀
