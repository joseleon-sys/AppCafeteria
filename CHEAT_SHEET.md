# 📋 CHEAT SHEET - Referencia Rápida

## 🚀 Arranque Rápido

```bash
# Terminal 1: Backend
cd backend && npm run dev

# Terminal 2: Frontend  
cd frontend && npm run dev

# Accede: http://localhost:5173
# Demo: admin@admin.com / admin
```

---

## 👥 Roles

| Role | Created | Auth | Products | Family | Orders |
|------|---------|------|----------|--------|--------|
| **admin** | Solo seeding | ✅ | ✅ CRUD | ❌ | ❌ |
| **parent** | Link approval | ✅ | ❌ | ✅ | ✅ Approve |
| **customer** | Register 18+ | ✅ | ❌ | ❌ | ❌ |
| **child** | Register <18 | ✅ | ❌ | ✅ Link | ✅ Create |

---

## 🔑 Cuentas Demo

| Email | Pass | Role |
|-------|------|------|
| `admin@admin.com` | `admin` | admin |
| `demo@demo.com` | `demo` | customer |

---

## 🔐 Endpoints Clave

### Auth
```
POST   /api/auth/register      (create account)
POST   /api/auth/login         (get JWT)
GET    /api/auth/me            (validate session)
```

### Products (Admin Only)
```
GET    /api/products           (list) - Requiere token
POST   /api/products           (create) - token + admin
PUT    /api/products/:id       (edit) - token + admin
DELETE /api/products/:id       (delete) - token + admin
```

### Family (Solos Adultos)
```
GET    /api/parent/token       (get parent_token)
POST   /api/child/link-parent  (solicitar víncular)
GET    /api/parent/link-requests  (ver solicitudes)
PUT    /api/parent/link-requests/:id/approve (aprobar)
```

---

## 📱 Frontend Components

| Component | Uso | Props |
|-----------|-----|-------|
| `FancyLogin` | Register/Login form | - |
| `ProfileModal` | User profile + family | `user` |
| `LinkRequestsList` | Pending family requests | - |
| `ProductCard` | Product display | `product` |
| `Cart` | Shopping cart | - |
| `Toast` | Notifications | `showSuccess()`, `showError()` |

---

## 🗄️ Database Tablas

```sql
-- Users
users
  id, email, password_hash, name, birth_date
  is_adult, role, parent_token, created_at

-- Family
parent_child_links
  id, parent_id, child_id, status, spending_limit
  created_at, approved_at

-- Products
products
  id, name, price, available, created_at

-- Orders (FASE 3)
child_orders
  id, child_id, parent_id, status, total, created_at

child_order_items
  id, order_id, product_id, quantity, price, subtotal
```

---

## 🔒 Headers Necesarios

```javascript
// Requiere Bearer token:
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...

// Obtenido del login response:
{
  "user": { ... },
  "token": "eyJhbGciOiJIUzI1NiIs..."
}

// Usado en: localStorage.getItem('token')
```

---

## 🧪 Flujo Test Completo

### 1. Register Adulto
```
Name: Juan Pérez
Email: juan@test.com
Pass: 123456
DOB: 01/01/1985 (>18)

→ role: customer
→ Recibe parent_token: ABC12345
```

### 2. Register Menor
```
Name: Carlos
Email: carlos@test.com
Pass: 123456
DOB: 01/01/2010 (<18)

→ role: child
→ SIN parent_token
```

### 3. Vincular
```
1. Login como Carlos
2. Profile → "Solicitar Padre"
3. Pega: ABC12345
4. POST /api/child/link-parent

→ status: pending
```

### 4. Aprobar
```
1. Login como Juan
2. Profile → Familia
3. Click "Aprobar"
4. PUT /api/parent/link-requests/{id}/approve

→ Juan ahora es role: parent
→ Carlos vinculado
```

---

## ✅ Validaciones

| Validación | Regla | Error |
|-----------|-------|-------|
| **Edad** | >= 18 = adult | Auto-detect |
| **Spending** | No exceder limit | 403 Forbidden |
| **Parents** | Max 2 por hijo | 400 Bad Request |
| **Children** | Max 10 por padre | 400 Bad Request |
| **Password** | Min 6 caracteres | 400 Bad Request |
| **Email** | Único | 409 Conflict |

---

## 🛑 Status Codes

| Code | Meaning | Ejemplo |
|------|---------|---------|
| 200 | OK | Login exitoso |
| 201 | Created | Producto creado |
| 400 | Bad Request | Email duplicate |
| 401 | Unauthorized | Token inválido |
| 403 | Forbidden | No es admin |
| 404 | Not Found | Product no existe |
| 409 | Conflict | Email en uso |
| 500 | Server Error | DB down |

---

## 📊 Flujo JWT

```
1. POST /api/auth/login
   → Backend valida credenciales
   → Genera JWT con exp: now + 7 days
   → Devuelve { user, token }

2. Frontend guarda: localStorage.setItem('token', token)

3. Cada solicitud posterior:
   → Authorization: Bearer {token}

4. Backend valida:
   → jwt.verify(token, JWT_SECRET)
   → req.user = payload
   → next()

5. Si token expirado (401):
   → Frontend clearStorage()
   → Redirige a login
```

---

## 🎯 Imports Necesarios

### Backend
```javascript
const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
const { createClient } = require('@supabase/supabase-js');
```

### Frontend
```javascript
import { ShowSuccess, showError } from "./Toast";
import { getCurrentUser, getAuthHeaders } from "./lib/api";
import { useCart } from "./lib/useCart";
```

---

## 🐛 Common Errors & Fixes

| Error | Causa | Fix |
|-------|-------|-----|
| `ReferenceError: showSuccess` | Import faltante | Add import en component |
| `401 Unauthorized` | Token expirado | Re-login |
| `403 Forbidden` | No es admin | Change user role |
| `Email already exists` | Duplicate email | Use otro email |
| `JWT_SECRET is required` | Env variable faltante | Set en .env |
| `Connection refused` | DB down | `npm run dev` backend |

---

## 📈 Endpoints Usados en APP

### Por Usuario
```
ADMIN:
  ✅ POST /api/products
  ✅ PUT /api/products/:id
  ✅ DELETE /api/products/:id

PARENT:
  ✅ GET /api/parent/link-requests
  ✅ PUT /api/parent/link-requests/:id/approve
  ✅ GET /api/parent/my-children

CHILD:
  ✅ POST /api/child/link-parent
  ✅ GET /api/child/my-parents

TODOS:
  ✅ GET /api/products
  ✅ POST /api/auth/login
  ✅ POST /api/auth/register
  ✅ GET /api/auth/me
```

---

## 🚀 FASE 3 Endpoints (Próximo)

```
POST   /api/child/orders
GET    /api/parent/child-orders
PUT    /api/parent/orders/:id/approve
PUT    /api/parent/orders/:id/reject
PUT    /api/parent/orders/:id/modify
PUT    /api/parent/orders/:id/pay
GET    /api/child/orders
GET    /api/child/orders/:id
```

---

## 📚 Docs Referencia

| Doc | Contenido |
|-----|----------|
| `README_SPRINT.md` | Overview general |
| `ESTADO_IMPLEMENTACION.md` | Estado actual + resumen |
| `CAMBIOS_Q1_2026.md` | Cambios técnicos detallados |
| `VERIFICACION_SPRINT.md` | Checklist + validaciones |
| `FASE3_ROADMAP.md` | Endpoints próxima fase |
| `VISION_GENERAL.md` | Arquitectura completa |

---

## ⚡ Pro Tips

### Debug JWT Token
```javascript
// En browser console:
localStorage.getItem('token')
// Copiar y pegar en jwt.io
```

### Ver Network Requests
```
F12 → Network tab
Login/Register → Ver request headers
POST /api/auth/login con Authorization header
```

### Resetear Sesión
```javascript
// En console:
localStorage.clear()
location.reload()
```

### Ver User Data
```javascript
// En console:
JSON.parse(localStorage.getItem('user'))
```

---

## 🔄 Git Commands

```bash
# Ver cambios recientes
git log --oneline -10

# Ver qué archivos cambiaron
git diff HEAD~1 --name-only

# Ver cambios específicos
git show commit-hash

# Current status
git status
```

---

## 🎓 Quick Reference

**3 Roles Principales**:
- `admin`: Gestiona productos
- `parent`: Aprueba pedidos de hijos
- `child`: Crea pedidos (FASE 3)

**3 Endpoint Types**:
- `/api/auth/*`: Autenticación
- `/api/parent/*`: Operaciones padre
- `/api/child/*`: Operaciones hijo

**3 Security Layers**:
- JWT validation
- Role-based access
- Rate limiting

---

## 📞 Contact

¿Problemas? Revisa:
1. [VERIFICACION_SPRINT.md](./VERIFICACION_SPRINT.md) - Troubleshooting
2. [CAMBIOS_Q1_2026.md](./CAMBIOS_Q1_2026.md) - Cambios recientes
3. Logs: `npm run dev` output

---

**Quick Status**: ✅ Fase 1-2.5 completado, FASE 3 ready to go

Versión: Q1 2026 | Sprint: Security Hardening
