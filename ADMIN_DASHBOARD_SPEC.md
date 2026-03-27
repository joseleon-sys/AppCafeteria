# 🚀 ADMIN DASHBOARD - Especificación & Línea a Seguir

**Responsable:** (Integrante 2 del equipo)  
**Prioridad:** 🔴 CRÍTICO (Bloqueador para producción)  
**Estimado:** 8-10 horas  
**Inicio:** 5 de marzo 2026

---

## 📋 RESUMEN EJECUTIVO

El **Admin Dashboard** permite a los administradores:
1. ✅ Ver estadísticas globales (usuarios, órdenes, ingresos, fraude)
2. ✅ Gestionar productos (crear, editar, eliminar, cambiar estado)
3. ✅ Revisar log de fraude y comportamiento sospechoso
4. ✅ Suspender/reactivar usuarios problemáticos
5. ✅ Gestionar horarios de cafetería

**Estado actual:** No existe en el codebase. Hay un componente vacío en `ProfileModal.jsx` que intenta importar admin features.

---

## 🏗️ ARQUITECTURA

### Backend (Expansión en `src/index.js`)

#### 1. Endpoints de Estadísticas

```javascript
// GET /api/admin/statistics
// Requiere: token + role=admin
// Response:
{
  "summary": {
    "total_users": 156,
    "total_orders": 1240,
    "total_revenue": 3480.50,
    "fraud_alerts": 12,
    "average_order_value": 2.81
  },
  "users": {
    "adults": 42,
    "children": 114,
    "admins": 2
  },
  "orders": {
    "completed": 1200,
    "pending": 30,
    "rejected": 10
  },
  "today": {
    "new_orders": 45,
    "new_users": 8,
    "fraude_incidents": 2
  }
}
```

#### 2. Endpoints de Productos (ya existen, expander)

```javascript
// POST /api/products
// PUT /api/products/:id
// DELETE /api/products/:id
// GET /api/products?admin=true (incluye inactivos)
```

**Cambio necesario:** Incluir campo `active` en respuesta

```javascript
{
  "id": 1,
  "name": "Café",
  "price": 1.20,
  "active": true,  // ← NUEVO (para soft delete)
  "category": "cafes",
  "created_at": "...",
  "updated_at": "...",
  "total_sold": 450  // ← NUEVO (para analytics)
}
```

#### 3. Endpoint de Fraud Log

```javascript
// GET /api/admin/fraud-log
// Requiere: token + role=admin
// Query params: ?days=7, ?severity=high, ?user_id=10
// Response:
{
  "logs": [
    {
      "id": 1,
      "user_id": 42,
      "user_name": "Usuario Sospechoso",
      "action_type": "link_request",
      "severity": "medium",
      "details": {
        "attempts": 5,
        "reason": "Demasiados intentos de vinculación"
      },
      "ip_address": "192.168.1.100",
      "user_agent": "Mozilla/5.0...",
      "timestamp": "2026-03-04T10:30:00Z"
    }
  ],
  "total": 45,
  "high_severity_count": 12
}
```

#### 4. Endpoint de Gestión de Usuarios

```javascript
// PUT /api/admin/users/:id/suspend
// Requiere: token + role=admin
// Body: { reason: "Comportamiento fraudulento" }
// Response:
{
  "user_id": 42,
  "status": "suspended",
  "reason": "Comportamiento fraudulento"
}

// PUT /api/admin/users/:id/reactivate
// Response:
{
  "user_id": 42,
  "status": "active"
}
```

#### 5. Endpoint de Horarios

```javascript
// GET /api/admin/cafeteria-hours
// POST /api/admin/cafeteria-hours (crear/actualizar)
// Response:
{
  "monday": { "open": "07:00", "close": "18:00" },
  "tuesday": { "open": "07:00", "close": "18:00" },
  ...
  "special_dates": [
    {
      "date": "2026-03-15",
      "closed": true,
      "reason": "Día festivo"
    }
  ]
}
```

---

## 💻 Frontend - Estructura de Componentes

### Árbol de Archivos a Crear

```
/frontend/src/
├── pages/
│   └── AdminDashboard.jsx         (300 líneas) ← PRINCIPAL
│       └── AdminDashboard.css     (200 líneas)
│
├── components/
│   ├── AdminStats.jsx             (120 líneas) - Widget de estadísticas
│   ├── AdminStats.css             (80 líneas)
│   │
│   ├── ProductManager.jsx          (250 líneas) - Tabla + CRUD de productos
│   ├── ProductManager.css          (150 líneas)
│   │
│   ├── FraudLogViewer.jsx          (180 líneas) - Ver log de fraude
│   ├── FraudLogViewer.css          (100 líneas)
│   │
│   ├── UserManagement.jsx          (200 líneas) - Suspender/reactivar users
│   ├── UserManagement.css          (100 líneas)
│   │
│   ├── CafeteriaHours.jsx          (150 líneas) - Horarios cafetería
│   └── CafeteriaHours.css          (80 líneas)
│
└── lib/
    └── adminApi.js                 (100 líneas) - Funciones API admin
```

### AdminDashboard.jsx (Estructura)

```javascript
import React, { useState, useEffect } from 'react';
import AdminStats from '../components/AdminStats';
import ProductManager from '../components/ProductManager';
import FraudLogViewer from '../components/FraudLogViewer';
import UserManagement from '../components/UserManagement';
import CafeteriaHours from '../components/CafeteriaHours';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('statistics');
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);

  useEffect(() => {
    // Cargar estadísticas iniciales
    loadStatistics();
  }, []);

  const loadStatistics = async () => {
    try {
      const stats = await fetch('/api/admin/statistics', {
        headers: { 'Authorization': `Bearer ${getAuthToken()}` }
      }).then(r => r.json());
      setData(stats);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const renderTab = () => {
    switch(activeTab) {
      case 'statistics':
        return <AdminStats data={data} />;
      case 'products':
        return <ProductManager onRefresh={loadStatistics} />;
      case 'fraud':
        return <FraudLogViewer />;
      case 'users':
        return <UserManagement />;
      case 'hours':
        return <CafeteriaHours />;
      default:
        return null;
    }
  };

  return (
    <div className="admin-dashboard">
      <nav className="admin-nav">
        <button 
          className={activeTab === 'statistics' ? 'active' : ''}
          onClick={() => setActiveTab('statistics')}
        >
          📊 Estadísticas
        </button>
        <button 
          className={activeTab === 'products' ? 'active' : ''}
          onClick={() => setActiveTab('products')}
        >
          📦 Productos
        </button>
        <button 
          className={activeTab === 'fraud' ? 'active' : ''}
          onClick={() => setActiveTab('fraud')}
        >
          🚨 Fraude
        </button>
        <button 
          className={activeTab === 'users' ? 'active' : ''}
          onClick={() => setActiveTab('users')}
        >
          👥 Usuarios
        </button>
        <button 
          className={activeTab === 'hours' ? 'active' : ''}
          onClick={() => setActiveTab('hours')}
        >
          ⏰ Horarios
        </button>
      </nav>

      <div className="admin-content">
        {loading ? <LoadingOverlay /> : renderTab()}
      </div>
    </div>
  );
}
```

### AdminStats.jsx (Ejemplo)

```javascript
export default function AdminStats({ data }) {
  if (!data) return <div>Cargando...</div>;

  return (
    <div className="admin-stats">
      <div className="stat-card">
        <h3>Usuarios Totales</h3>
        <p className="stat-number">{data.summary.total_users}</p>
        <small>+{data.today.new_users} hoy</small>
      </div>

      <div className="stat-card">
        <h3>Órdenes Completadas</h3>
        <p className="stat-number">{data.orders.completed}</p>
        <span className="stat-pending">{data.orders.pending} pendientes</span>
      </div>

      <div className="stat-card">
        <h3>Ingresos Totales</h3>
        <p className="stat-number">${data.summary.total_revenue}</p>
        <small>Promedio: ${data.summary.average_order_value} por orden</small>
      </div>

      <div className="stat-card alert">
        <h3>🚨 Alertas de Fraude</h3>
        <p className="stat-number">{data.summary.fraud_alerts}</p>
        <small>{data.today.fraude_incidents} hoy</small>
      </div>
    </div>
  );
}
```

---

## 🔐 Cambios en App.jsx

Necesitas detectar si el usuario es admin y mostrar AdminDashboard:

```javascript
// App.jsx (actualización)

useEffect(() => {
  // Después de hydrateSession()
  if (currentUser?.role === 'admin') {
    setShowAdmin(true);
  }
}, [currentUser]);

return (
  <>
    {showAdmin ? (
      <AdminDashboard />
    ) : (
      <MainScreen />
    )}
  </>
);
```

O mejor, usa rutas (si tienes React Router):

```javascript
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

<Routes>
  <Route path="/login" element={<LoginScreen />} />
  <Route path="/admin" element={currentUser?.role === 'admin' ? <AdminDashboard /> : <Navigate to="/login" />} />
  <Route path="/" element={currentUser ? <MainScreen /> : <LoginScreen />} />
</Routes>
```

---

## 📝 Checklist de Implementación

### Fase 1: Backend (2 horas)
- [ ] Crear endpoint `GET /api/admin/statistics`
- [ ] Crear endpoint `GET /api/admin/fraud-log`
- [ ] Actualizar `PUT /api/products/:id` para incluir campo `active`
- [ ] Crear endpoint `PUT /api/admin/users/:id/suspend`
- [ ] Crear endpoint `PUT /api/admin/users/:id/reactivate`
- [ ] Crear endpoint `GET/POST /api/admin/cafeteria-hours`
- [ ] Testear todos con Postman

### Fase 2: Frontend - Base (3 horas)
- [ ] Crear carpeta de componentes admin
- [ ] Implementar `AdminDashboard.jsx` (estructura principal)
- [ ] Implementar `AdminStats.jsx` (widget de estadísticas)
- [ ] Crear `adminApi.js` con funciones para llamadas API
- [ ] Integrar en `App.jsx` (nav admin)

### Fase 3: Frontend - Tablas & CRUD (4 horas)
- [ ] Implementar `ProductManager.jsx` (tabla + formulario CRUD)
- [ ] Implementar `FraudLogViewer.jsx` (tabla con filtros)
- [ ] Implementar `UserManagement.jsx` (tabla con acciones)
- [ ] Implementar `CafeteriaHours.jsx` (edición de horarios)

### Fase 4: Pruebas (1 hora)
- [ ] Testear flujo completo como admin
- [ ] Verificar permisos (no admins no pueden acceder)
- [ ] Testear CRUD de productos
- [ ] Testear suspensión de usuarios

---

## 🔗 Dependencias & Integraciones

### Con FASE 3
- **child_orders** deben incluirse en estadísticas
- Las órdenes de hijos contribuyen al `total_revenue`

### Con Seguridad
- Solo role='admin' puede acceder
- Todas las acciones se registran en `fraud_prevention_log`
- Cambios de producto son auditados

### Con Autenticación
- Usar `getAuthToken()` de `lib/api.js`
- Detectar sesión expirada (401) y logout

---

## 📊 Datos de Ejemplo (para testing)

```bash
# Login como admin
POST /api/auth/login
{
  "email": "admin@test.com",
  "password": "admin123"
}

# Acceder a admin
GET http://localhost:5173/admin

# Crear producto de prueba
POST /api/products
Headers: Authorization: Bearer <admin_token>
{
  "name": "Galletas de Chocolate",
  "price": 0.75,
  "category": "dulces",
  "description": "Galletas caseras",
  "image": "https://...",
  "allergens": ["gluten", "lactosa"],
  "options": { "sugar": { "available": false } }
}
```

---

## 🎨 Estilos (Admin Dashboard)

Mantener consistencia con el diseño mobile actual:
- Colores: Mismo esquema que MainScreen
- Layout: Tabs horizontales en desktop, vertical si es mobile
- Tables: Scrolleable en mobile, normal en desktop
- Forms: Modales para crear/editar productos

---

## 🚀 Siguiente Fase (Después de Admin)

Una vez completado Admin Dashboard:
1. **Integrante A:** Pasar a implementar **Email Transaccional**
2. **Integrante B:** Completar **HistoryModal** + integración en MainScreen
3. **Integrante C:** Empezar **Perfil Editable** (cambiar contraseña, datos)

---

## 📞 Recursos

- API endpoints: Ver `README_MAESTRO.md`
- CRUD de productos: Ver `FASE3_COMPLETADA.md`
- Rate limiting & seguridad: Ver `IMPLEMENTACION_COMPLETADA.md`
- Roles & autenticación: Ver `SISTEMA_AUTENTICACION.md`

---

**Última actualización:** 4 de marzo 2026  
**Prioridad:** 🔴 CRÍTICO  
**Estimado:** 8-10 horas (1 día de desarrollo)
