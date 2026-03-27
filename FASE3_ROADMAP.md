# 🎯 Roadmap - Próximas Fases

## 📊 Estado Actual (Q1 2026)

### ✅ FASE 1: Autenticación Base
- [x] Register/Login con JWT
- [x] Password hashing (bcrypt)
- [x] Role assignment (admin, customer, child)
- [x] Demo usuarios funcionales

### ✅ FASE 2: Sistema Padre-Hijo (Completado en Sprint Seguridad)
- [x] Adultos pueden generar parent_token
- [x] Menores pueden solicitar vinculación
- [x] Padres aprueban/rechazan solicitudes
- [x] Rol adulto promocionado a parent automáticamente
- [x] LinkRequestsList UI integrado
- [x] Coherencia de roles mejorada
- [x] DB fallback PostgreSQL

### ✅ FASE 2.5: Security Hardening (COMPLETADO)
- [x] JWT_SECRET validation (prod/dev)
- [x] API endpoints protegidos con Bearer token
- [x] Admin role guard en product CRUD
- [x] Sesión rehidratación con /auth/me
- [x] Todos imports de toasts en su lugar
- [x] Build validation (Vite ✅, node --check ✅)

---

## 🚀 FASE 3: Pedidos de Hijos (PRÓXIMA)

### Overview
Los hijos pueden crear pedidos que requieren aprobación del padre antes de pago.

### Endpoints a Implementar

```javascript
// 1. CREAR PEDIDO (Como hijo)
POST /api/child/orders
Headers: { Authorization: Bearer {token} }
Body: {
  items: [
    { product_id: 1, quantity: 2 },
    { product_id: 3, quantity: 1 }
  ],
  notes: "Para mañana en la mañana",
  parent_id: null  // Si null, auto-detecta padre primario
}

Response: {
  id: "order-123",
  status: "pending",
  created_by_child_id: 5,
  parent_id: 10,
  items: [...],
  total: 45.50,
  created_at: "..."
}

// 2. LISTAR PEDIDOS PENDIENTES (Como padre)
GET /api/parent/child-orders
Headers: { Authorization: Bearer {token} }

Query params:
  ?status=pending   // pending, approved, rejected, paid
  ?child_id=5       // Filter por hijo específico
  ?limit=20
  ?offset=0

Response: [
  {
    id: "order-123",
    child_name: "Carlos",
    items_count: 3,
    total: 45.50,
    status: "pending",
    created_at: "..."
  },
  ...
]

// 3. OBTENER DETALLE PEDIDO
GET /api/parent/orders/:order_id
Response: {
  id: "order-123",
  child: { id, name, email },
  items: [
    { product_id, name, price, quantity, subtotal }
  ],
  subtotal: 45.00,
  tax: 0.50,
  total: 45.50,
  notes: "Para mañana",
  status: "pending",
  created_at: "....",
  spending_limit: 50.00,
  current_spent_month: 35.00,
  would_exceed: false
}

// 4. APROBAR PEDIDO
PUT /api/parent/orders/:order_id/approve
Headers: { Authorization: Bearer {token} }
Body: {
  approved_amount: 45.50  // Opcional: padre puede reducir
}

Response: {
  id: "order-123",
  status: "approved",
  approved_at: "..."
}

// 5. MODIFICAR PEDIDO (Padre puede editar antes de pagar)
PUT /api/parent/orders/:order_id/modify
Headers: { Authorization: Bearer {token} }
Body: {
  items: [
    { product_id: 1, quantity: 1 },  // Reducir de 2 a 1
    { product_id: 3, quantity: 1 }   // Igual
  ]
}

Response: {
  id: "order-123",
  total: 30.00,  // Recalculado
  items: [...]
}

// 6. RECHAZAR PEDIDO
PUT /api/parent/orders/:order_id/reject
Headers: { Authorization: Bearer {token} }
Body: {
  reason: "Demasiado caro, espera al próximo mes"
}

Response: {
  id: "order-123",
  status: "rejected",
  rejected_at: "...",
  reason: "..."
}

// 7. MARCAR COMO PAGADO
PUT /api/parent/orders/:order_id/pay
Headers: { Authorization: Bearer {token} }
Body: {
  payment_method: "cash",  // O "card", "app", etc.
  amount_paid: 45.50
}

Response: {
  id: "order-123",
  status: "paid",
  paid_at: "...",
  payment_method: "cash"
}

// 8. OBTENER HISTORIAL DE PEDIDOS (Como padre)
GET /api/parent/child-orders/history
Query params:
  ?child_id=5         // Filtro por hijo
  ?status=paid        // Solo pedidos pagados
  ?from_date=2026-01-01
  ?to_date=2026-01-31
  ?limit=50

Response: [
  {
    id: "order-123",
    child_name: "Carlos",
    total: 45.50,
    status: "paid",
    paid_at: "...",
    items: [...]
  },
  ...
]

// 9. VER MIS PEDIDOS (Como hijo)
GET /api/child/orders
Query params:
  ?status=pending

Response: [
  {
    id: "order-123",
    parent_names: ["Mamá"],
    status: "pending",
    items_count: 3,
    total: 45.50,
    created_at: "..."
  },
  ...
]

// 10. OBTENER MI PEDIDO (Como hijo)
GET /api/child/orders/:order_id
Response: {
  id: "order-123",
  parent: { id, name, email },
  items: [...],
  status: "pending",
  notes: "...",
  approval_status: "Sin revisar",  // "En revisión" / "Aprobado" / "Rechazado"
  approved_amount: null,
  rejection_reason: null
}
```

### Database Changes Needed

**New Table: `child_orders`**
```sql
CREATE TABLE child_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID REFERENCES users(id) NOT NULL,
  parent_id UUID REFERENCES users(id) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',  -- pending, approved, rejected, paid
  total DECIMAL(10, 2) NOT NULL,
  subtotal DECIMAL(10, 2),
  tax DECIMAL(10, 2),
  notes TEXT,
  approved_amount DECIMAL(10, 2),
  approved_at TIMESTAMP,
  rejected_at TIMESTAMP,
  rejection_reason TEXT,
  paid_at TIMESTAMP,
  payment_method VARCHAR(50),
  amount_paid DECIMAL(10, 2),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_child_orders_parent ON child_orders(parent_id);
CREATE INDEX idx_child_orders_child ON child_orders(child_id);
CREATE INDEX idx_child_orders_status ON child_orders(status);
```

**New Table: `child_order_items`**
```sql
CREATE TABLE child_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES child_orders(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES products(id) NOT NULL,
  quantity INT NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  subtotal DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_order_items_order ON child_order_items(order_id);
```

---

## 🎮 Frontend Components para FASE 3

### Components Nuevos

**`ChildOrderForm.jsx`**
- Formulario para crear pedido como hijo
- Carrito visual con items
- Notes field (opcional)
- Submit button
- Toast confirmación

**`ParentOrdersList.jsx`** (mejorado)
- Lista de pedidos pendientes
- Filtros por status/child
- Cards con resumen
- Actions: Aprobar, Rechazar, Pagar

**`OrderDetail.jsx`**
- Vista detallada del pedido
- Items con precios
- Validación de spending limit
- Botones de acción según estado

**`OrderHistory.jsx`**
- Historial de pedidos pagados
- Filtros por fecha/hijo
- Gráficos de gasto
- Export a CSV

**`ChildOrdersModal.jsx`**
- Ver mis pedidos (como hijo)
- Estado de cada pedido
- Detalles con approval reason si rechazado

---

## 📋 Validaciones para FASE 3

### Backend Validations
```javascript
// 1. Spending limit check
if (child_total > remaining_budget) {
  return 403 { error: "Exceeds spending limit" };
}

// 2. Max 2 parents per child
const parents = await get_my_parents(child_id);
if (parents.length < 1) {
  return 400 { error: "No approved parents" };
}

// 3. Product availability
for (item of order.items) {
  const product = await get_product(item.product_id);
  if (!product.available) {
    return 400 { error: `${product.name} not available` };
  }
}

// 4. Min order amount
if (order.total < 5.00) {
  return 400 { error: "Minimum order is $5.00" };
}

// 5. Quantity limits per product
MAX_QUANTITY_PER_ITEM = 50;
if (item.quantity > MAX_QUANTITY_PER_ITEM) {
  return 400 { error: "Too many items" };
}
```

### Frontend Validations
```javascript
// 1. Empty cart check
if (cart.items.length === 0) {
  showError("Carrito vacío");
  return;
}

// 2. Parent approval check (hijo)
if (user.role === 'child' && !user.my_parents?.length) {
  showError("No tienes padre aprobado");
  return;
}

// 3. Spending limit preview
if (computed_total > remaining_budget) {
  showWarning(`Excede presupuesto en $${computed_total - remaining_budget}`);
}

// 4. Min amount check
if (computed_total < 5.00) {
  showError("Monto mínimo es $5.00");
  return;
}
```

---

## 🔔 Notificaciones para FASE 3 (Opcional)

```javascript
// Cuando hijo crea pedido:
Email (padre): "Tu hijo Carlos ha creado un pedido de $45.50"

// Cuando padre aprueba:
Toast (hijo): "✅ Tu pedido fue aprobado"
Email (hijo): "Tu pedido fue aprobado por Mamá"

// Cuando padre rechaza:
Toast (hijo): "❌ Tu pedido fue rechazado: 'Demasiado caro'"
Email (hijo): "Tu pedido fue rechazado"

// Cuando padre marca como pagado:
Toast (hijo): "✅ Tu pedido fue procesado"
Email (hijo): "Pedido confirmado para mañana"
```

---

## 🧪 Test Cases para FASE 3

### Test 1: Crear Pedido Como Hijo
```
Setup: Child login con 2 productos en carrito ($30 total)
Action: POST /api/child/orders
Expected: 201 Created, order status = "pending"
```

### Test 2: Padre Ve Pedidos Pendientes
```
Setup: Parent login, child tiene pedido pendiente
Action: GET /api/parent/child-orders?status=pending
Expected: 200 OK, lista incluye el pedido del hijo
```

### Test 3: Padre Aprueba Pedido
```
Setup: Padre ve pedido pendiente
Action: PUT /api/parent/orders/:id/approve
Expected: 200 OK, status = "approved"
```

### Test 4: Validación Spending Limit
```
Setup: Child con spending_limit $50, carrito $60
Action: POST /api/child/orders
Expected: 403 Forbidden con mensaje
```

### Test 5: Rechazo de Pedido
```
Setup: Padre ve pedido
Action: PUT /api/parent/orders/:id/reject { reason: "Muy caro" }
Expected: 200 OK, hijo ve rechazo con razón
```

---

## 📈 Métricas para FASE 3

### Backend Additions
- ~300-400 líneas de código (endpoints + validations)
- 2 tablas nuevas (child_orders, child_order_items)
- 5-6 índices para performance

### Frontend Additions
- 4-5 componentes nuevos
- ~200-300 líneas de CSS
- Estados para pending/approved/rejected/paid

### Estimated Time
- Backend: 4-6 horas
- Frontend: 6-8 horas
- Testing/Fixes: 2-3 horas

---

## 🎯 Próximas Prioridades

### P0 (Críticos)
- [x] JWT Security hardening ✅ (DONE)
- [x] Role coherence ✅ (DONE)
- [ ] Child order endpoints (NEXT)
- [ ] Parent approval flow

### P1 (Importantes)
- [ ] Order history & analytics
- [ ] Spending limit enforcement
- [ ] Email notifications

### P2 (Opcional)
- [ ] SMS notifications
- [ ] Auto-approve small orders
- [ ] Bulk approve orders
- [ ] Analytics dashboard

---

## 📞 Cómo Empezar FASE 3

Cuando estés listo:
1. Déjame saber "Vamos con FASE 3"
2. Haré el mismo proceso:
   - Crear endpoints backend
   - Agregar components frontend
   - Implementar validaciones
   - Validar build
   - Agregar documentación

---

**Estado Actual**: ✅ FASE 2.5 Sprint Seguridad COMPLETADO
**Bloqueadores**: Ninguno
**Listo para**: FASE 3 cuando digas

Para más detalles sobre cambios, ver: `CAMBIOS_Q1_2026.md` y `VERIFICACION_SPRINT.md`
