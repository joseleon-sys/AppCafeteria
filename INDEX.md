# 🚀 ÍNDICE CENTRAL - CafeteriaApp SSG

**Última actualización:** 4 de marzo 2026  
**Versión proyecto:** FASE 3 COMPLETADA + Seguridad Q1 ✅

---

## 📌 PUNTO DE ENTRADA ÚNICO

Usa este documento como tu **mapa de navegación**. No leas el proyecto sin pasar por aquí primero.

---

## 🎯 SEGÚN TU ROL

---

### 👨‍💻 Soy Backend Developer
1. **Arquitectura BD:** [🏗️ SISTEMA_PADRE_HIJO.md](./SISTEMA_PADRE_HIJO.md) - Tablas + relaciones + anti-fraude
2. **Endpoints implementados:** [🔌 README_MAESTRO.md#endpoints-disponibles](./README_MAESTRO.md) - ListadoCompleto
3. **Qué implementar next:** [🚀 ADMIN_DASHBOARD_SPEC.md#backend-expansión](./ADMIN_DASHBOARD_SPEC.md) - Admin endpoints
4. **Cambios de ayer:** [⚡ CHANGELOG.md](./CHANGELOG.md) - Historial Q1 2026

---

### 🎨 Soy Frontend Developer
1. **Flujos de usuario:** [🔄 README_MAESTRO.md#flujo-de-vinculación-familiar](./README_MAESTRO.md) - Diagrama completo
2. **Componentes existentes:** [📱 README_MAESTRO.md#línea-de-interfaz-de-usuario](./README_MAESTRO.md) - Mapa de componentes
3. **Qué implementar:** [💻 ADMIN_DASHBOARD_SPEC.md#frontend-estructura-de-componentes](./ADMIN_DASHBOARD_SPEC.md) - Admin Dashboard (crítico)
4. **API Contract:** [📋 API_CONTRACT.md](./API_CONTRACT.md) - JSON exacto para consumir

---

### 🔐 Trabajo en Seguridad
1. **Medidas implementadas:** [🛡️ CHANGELOG.md](./CHANGELOG.md) - Rate limiting + fraud log + trust score
2. **Anti-fraude:** [🔒 SISTEMA_PADRE_HIJO.md#medidas-anti-fraude](./SISTEMA_PADRE_HIJO.md) - Límites + validaciones + alertas
3. **Cambios recientes:** [⚡ CHANGELOG.md](./CHANGELOG.md) - JWT hardening + role coherence
4. **Auditoría:** `fraud_prevention_log` tabla con todos los eventos

---

### 📱 Trabajo en Mobile / UX
1. **Interfaz actual:** [📱 README_MAESTRO.md#línea-de-interfaz-de-usuario](./README_MAESTRO.md) - Árbol de componentes
2. **Flujos que debe soportar:** [🔄 README_MAESTRO.md#flujo-de-vinculación-familiar](./README_MAESTRO.md) - Diagrama y pasos
3. **Componentes pendientes:** [❌ README_MAESTRO.md#lo-que-falta-por-implementar](./README_MAESTRO.md) - HistoryModal, ProfileModal editable, etc.
4. **Guía de estilos:** Mantener consistencia con AdminDashboard.css

---

## 📚 DOCUMENTOS DISPONIBLES

| Archivo | Propósito | Leer si... |
|---------|-----------|-----------|
| **📌 Este archivo** | Índice central | Eres novo aquí |
| **⚡ [QUICK_START.md](./QUICK_START.md)** | Setup en 5 minutos | Necesitas empezar YA |
| **📜 [CHANGELOG.md](./CHANGELOG.md)** | Historial de cambios | Necesitas saber qué se hizo |
| **📖 [README_MAESTRO.md](./README_MAESTRO.md)** | Referencia técnica completa | Necesitas documentación exhaustiva |
| **🚀 [ADMIN_DASHBOARD_SPEC.md](./ADMIN_DASHBOARD_SPEC.md)** | Especificación admin | Vas a implementar admin |
| **🎓 [VISION_GENERAL.md](./VISION_GENERAL.md)** | ¿Qué es el proyecto? | Necesitas visión general |
| **🏗️ [SISTEMA_PADRE_HIJO.md](./SISTEMA_PADRE_HIJO.md)** | Arquitectura padre-hijo | Necesitas entender familias |
| **🔒 [SISTEMA_AUTENTICACION.md](./SISTEMA_AUTENTICACION.md)** | JWT, registro, login, roles | Necesitas entender auth |
| **📋 [API_CONTRACT.md](./API_CONTRACT.md)** | Contrato de API (JSON) | Integras frontend-backend |
| **🔗 [INTEGRATION_GUIDE.md](./INTEGRATION_GUIDE.md)** | Setup componentes y BD | Configuras bases de datos |
| **🌳 [GIT_WORKFLOW.md](./GIT_WORKFLOW.md)** | Convenciones git | Haces commit |
| **👥 [CONTRIBUTING.md](./CONTRIBUTING.md)** | Guía de contribución | Eres nuevo en el equipo |

✅ **Archivos consolidados:** ESTADO_IMPLEMENTACION, CAMBIOS_Q1_2026, IMPLEMENTACION_COMPLETADA, FASE3_COMPLETADA → Ver [CHANGELOG.md](./CHANGELOG.md)

---

## ⚡ SETUP RÁPIDO

**Ver: [QUICK_START.md](./QUICK_START.md) (5 minutos)**

👉 Contiene:
- Setup backend + frontend
- Configuración base de datos
- Tests de flujos
- Troubleshooting

### Test Flujo Padre-Hijo
```bash
# 1. Registra adulto → obtiene parent_token
# 2. Registra menor
# 3. Menor vincula usando parent_token
# 4. Adulto aprueba en ProfileModal
# 5. Menor crea pedido
# 6. Adulto aprueba pedido en ParentOrdersList
```

---

## 📊 ESTADO ACTUAL (Snapshot 4 marzo 2026)

### ✅ HECHO
- [x] Autenticación JWT + registro + login
- [x] Sistema padre-hijo (vinculación, aprobación)
- [x] FASE 3: Pedidos de hijos (crear, aprobar, pagar, rechazar)
- [x] Seguridad: Rate limiting, anti-fraude log, trust score
- [x] Seguridad: JWT hardening, roles coherentes
- [x] Fallback PostgreSQL (sin dependencia Supabase)
- [x] 30+ endpoints backend funcionando
- [x] 7+ componentes frontend funcionando
- [x] Documentación completa

### 🚧 EN PROGRESO
- [ ] Admin Dashboard (especificación hecha → implementación)

### ❌ FALTA
- [ ] Email transaccional (confirmaciones, alertas)
- [ ] HistoryModal integración en UI
- [ ] Perfil editable (cambiar contraseña, datos)
- [ ] Notificaciones en tiempo real (WebSocket)
- [ ] Analytics & reportes
- [ ] Mobile: optimizaciones si es needed

---

## 🎯 PRÓXIMOS 3 DÍAS

### HOY (4 marzo) - YA HECHO
- [x] Revisar estado
- [x] Crear índice & documentación
- [x] Especificar Admin Dashboard
- [x] Handoff a equipo

### MAÑANA (5 marzo) - ASIGNAR
- [ ] **Backend A:** Endpoints de Admin (2-3 horas)
- [ ] **Frontend A:** Admin Dashboard UI (4-5 horas)
- [ ] **Backend B:** Email Service (2-3 horas)

### VIERNES (6 marzo) - INTEGRACIÓN
- [ ] Testing completo
- [ ] Correcciones de UX
- [ ] Deploy a staging

---

## 🔍 CÓMO NAVEGAR LA DOCUMENTACIÓN

### Si Necesitas...

**Entender qué es el proyecto:**
→ Lee [VISION_GENERAL.md](./VISION_GENERAL.md) (5 min)

**Saber qué está implementado:**
→ Lee [CHANGELOG.md](./CHANGELOG.md) (10 min)

**Ver todos los endpoints disponibles:**
→ Lee [README_MAESTRO.md#endpoints-disponibles](./README_MAESTRO.md) (20 min)

**Entender flujo padre-hijo:**
→ Lee [SISTEMA_PADRE_HIJO.md](./SISTEMA_PADRE_HIJO.md) (15 min)

**Saber cómo implementar Admin Dashboard:**
→ Lee [ADMIN_DASHBOARD_SPEC.md](./ADMIN_DASHBOARD_SPEC.md) (30 min)

**Entender seguridad & anti-fraude:**
→ Lee [CHANGELOG.md#sprint-seguridad-q1](./CHANGELOG.md) (15 min)

**Deep dive en arquitectura BD:**
→ Lee [SISTEMA_PADRE_HIJO.md](./SISTEMA_PADRE_HIJO.md) (20 min)

**Consumir API desde frontend:**
→ Lee [API_CONTRACT.md](./API_CONTRACT.md) (10 min)

---

## 🎓 CONCEPTOS CLAVE

### Roles (user.role)
| Role | Es Adulto | Puede Hacer |
|------|----------|-----------|
| `admin` | Sí | Todo (productos, usuarios, estadísticas) |
| `parent` | Sí | Aprobar pedidos de hijo, establecer límites |
| `child` | No | Crear pedidos, vincularse con profes |
| `customer` | Var | Comprar directamente en cafetería |

### Estados de Link Padre-Hijo
- `pending` → Hijo solicitó, padre no respondió
- `active` → Aprobado, relación funciona
- `rejected` → Padre rechazó
- `suspended` → Admin detectó fraude

### Estados de Pedido Hijo
- `pending_approval` → Esperando decisión del padre
- `approved` → Padre aprobó, listo cobrar
- `paid` → Padre pagó, orden se prepara
- `rejected` → Padre rechazó
- `cancelled` → Cancelado

### Límites Anti-Fraude
- Max 2 padres por hijo
- Max 10 hijos por padre
- Max $X/día gasto (configurable por padre)
- Max 5 intentos login/hora
- Trust score (0-100) con eventos

---

## 🚨 SI ENCONTRAS UN BUG

1. **¿Es en autenticación?** → Ver [SISTEMA_AUTENTICACION.md](./SISTEMA_AUTENTICACION.md)
2. **¿Es en padre-hijo?** → Ver [SISTEMA_PADRE_HIJO.md](./SISTEMA_PADRE_HIJO.md)
3. **¿Es en seguridad?** → Ver [CHANGELOG.md](./CHANGELOG.md)
5. **¿Es en FASE 3 (pedidos)?** → Ver [README_MAESTRO.md](./README_MAESTRO.md)

---

## 👥 EQUIPO & CONTACT

**Proyecto iniciado:** Enero 2026  
**Current status:** FASE 3 lista, Admin Dashboard pendiente  
**Docs activos:** INDEX + QUICK_START + CHANGELOG + README_MAESTRO

---

## 🔗 RESOURCES EXTERNOS

- **Supabase:** https://supabase.com (BD remota)
- **Vercel:** https://vercel.com (deploy frontend)
- **Express.js:** ExpressJS docs
- **React:** React docs

---

## ✨ TIPS PARA NUEVO DESARROLLO

1. **Antes de escribir código:** Review [README_MAESTRO.md#lo-que-falta-por-implementar](./README_MAESTRO.md)
2. **Para cada endpoint nuevo:** Documenta en [API_CONTRACT.md](./API_CONTRACT.md)
3. **Componentes nuevos:** Agrega a [README_MAESTRO.md#línea-de-interfaz-de-usuario](./README_MAESTRO.md)
4. **Cambios importantes:** Actualiza [CHANGELOG.md](./CHANGELOG.md)
5. **Considera fallback:** ¿Funciona sin Supabase? (ver [INTEGRATION_GUIDE.md](./INTEGRATION_GUIDE.md))

---

---

**Creado:** 4-5 de marzo 2026  
**Actualizado:** 5 de marzo 2026 (consolidación de docs)  
**Propósito:** Único punto de entrada centralizado  
**Documentación activa:** ✅ 7 archivos core + CHANGELOG

---

### 🎯 TU SIGUIENTE PASO

**Si eres desenvolvedor nuevo:**
→ Lee este documento entero (15 min) + [README_MAESTRO.md](./README_MAESTRO.md) (30 min)

**Si vienes a continuar el trabajo:**
→ Lee [CAMBIOS_AYER_HANDOFF.md](./CAMBIOS_AYER_HANDOFF.md) (15 min) + el documento de tu tarea específica
