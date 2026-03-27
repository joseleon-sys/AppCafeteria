# 📚 Documentación Completa - CafeteriaAppSSG

**Proyecto:** Aplicación de Cafetería para Autoservicio  
**Stack Tecnológico:** React + Ionic + Node.js + PostgreSQL  
**Período:** Desde inicio hasta 30 de enero de 2026  
**Estado:** En desarrollo activo

---

## 📋 Índice

1. [Visión General del Proyecto](#1-visión-general-del-proyecto)
2. [Arquitectura del Frontend](#2-arquitectura-del-frontend)
3. [Arquitectura del Backend](#3-arquitectura-del-backend)
4. [Contribuciones del Equipo](#4-contribuciones-del-equipo)
5. [Cómo Arrancar el Proyecto](#5-cómo-arrancar-el-proyecto)
6. [Memorias Individuales](#6-memorias-individuales)

---

## 1. Visión General del Proyecto

### 1.1 Descripción
CafeteriaAppSSG es una aplicación móvil/web diseñada para facilitar el pedido de productos en una cafetería. Los usuarios pueden navegar por el menú, personalizar productos, gestionar su carrito de compra y realizar pedidos de forma eficiente.

### 1.2 Stack Tecnológico

#### Frontend
- **Framework:** React 18.2.0
- **Build Tool:** Vite 5.4.21
- **UI Library:** Ionic React 8.7.17
- **Gestión de Estado:** Context API (CartContext)
- **Persistencia:** LocalStorage
- **Iconos:** Ionicons

#### Backend
- **Runtime:** Node.js 18+
- **Framework:** Express 4.18.2
- **Base de Datos:** PostgreSQL
- **ORM/Query:** node-postgres (pg)
- **Infraestructura:** Docker + Docker Compose
- **Herramientas:** pgAdmin (interfaz web)

### 1.3 Roles del Equipo

- **Darlyng** — Backend Developer
  - API REST, endpoints, base de datos
  - Validaciones y seguridad
  - Prevención de inyección SQL
  
- **Jose Manuel** — Frontend Developer
  - Implementación de componentes React
  - Conversión de mockups a código funcional
  - Usabilidad y armonía visual

- **Alejandro** — Project Coordinator & Pivote
  - Documentación del proyecto
  - Gestión de Git (merges, PRs)
  - Testing de funcionalidades
  - Desarrollo del Dashboard Admin
  - Componentes de UI (ProductCard, CheckoutModal, etc.)

### 1.4 Estructura del Repositorio

```
CafeteriaAppSSG/
├── backend/                      # API REST
│   ├── src/
│   │   └── index.js             # Servidor Express
│   ├── db/
│   │   └── init.sql             # Schema y seeds
│   ├── package.json
│   └── README.md
├── frontend/                     # Aplicación React
│   ├── src/
│   │   ├── App.jsx              # (obsoleto)
│   │   ├── AppMobile.jsx        # Componente principal
│   │   ├── main.jsx             # Punto de entrada
│   │   ├── components/          # Componentes reutilizables
│   │   ├── lib/                 # Context y hooks
│   │   ├── pages/               # Páginas/vistas
│   │   └── styles/              # Estilos globales
│   ├── mockup/                  # Prototipo HTML/CSS/JS
│   ├── reference/               # Código de referencia
│   ├── package.json
│   └── README.md
├── docker-compose.yml           # PostgreSQL + pgAdmin
├── API_CONTRACT.md              # Contrato de API
├── CONTRIBUTING.md              # Guía de contribución
├── GIT_WORKFLOW.md              # Flujo de trabajo Git
├── INTEGRATION_GUIDE.md         # Guía de integración
├── MEMORIA.MD                   # Memoria del equipo
└── memoriaAlejandro.md          # Memoria individual de Alejandro
```

---

## 2. Arquitectura del Frontend

### 2.1 Punto de Entrada

El frontend utiliza **Vite** como bundler y arranca desde `main.jsx`, que renderiza `AppMobile.jsx` como componente principal.

**Comando para arrancar:**
```bash
cd frontend
npm install      # Primera vez
npm run dev      # Desarrollo (puerto 5173)
```

### 2.2 Componentes Principales

#### Navegación
- **TopBar.jsx** - Barra superior con logo, menú hamburguesa, búsqueda y notificaciones
- **BottomNav.jsx** - Navegación inferior con 5 secciones (Promociones, Historial, Carrito, Perfil, Ajustes)
- **SideMenu.jsx** - Menú lateral desplegable (hamburguesa)

#### Catálogo y Productos
- **Categories.jsx** - Selector de categorías (Cafés, Bocadillos, Dulces, Bebidas)
- **ProductsGrid.jsx** - Grid responsive de productos
- **ProductCard.jsx** - Tarjeta individual de producto con:
  - Imagen del producto
  - Nombre, descripción y precio
  - Badges (Popular, Nuevo, Oferta)
  - Iconos de alérgenos
  - Botón de favoritos (corazón)
  - Botón "Añadir al carrito"
- **ProductModal.jsx** - Modal de personalización con:
  - Opciones de azúcar (stepper)
  - Ingredientes removibles (checkboxes)
  - Selector de cantidad
  - Precio calculado en tiempo real

#### Carrito de Compra
- **CartContext.jsx** - Context API para estado global del carrito
- **useCart.js** - Hook personalizado con toda la lógica del carrito
- **CartPanel.jsx** - Panel lateral deslizante del carrito
- **CartModal.jsx** - Modal completo del carrito
- **CartPage.jsx** - Página dedicada del carrito
- **CartPreview.jsx** - Vista previa compacta

**Funcionalidades del Carrito:**
- Añadir/eliminar productos
- Modificar cantidades
- Descuentos y cupones promocionales
- Cálculo de subtotal, IGIC (7%) y total
- Persistencia en LocalStorage
- Animaciones y transiciones

#### Checkout y Pagos
- **CheckoutModal.jsx** - Modal de pago con:
  - Lista de productos con iconos SVG
  - Campo de cupones promocionales
  - Resumen de pago (subtotal + IGIC + total)
  - Botón de pago con estado de carga
  - Confirmación de pago exitoso

#### Autenticación
- **FancyLogin.jsx** - Pantalla de login/registro con animación flip
- **LoginScreen.jsx** - Login simple alternativo

**Usuarios de Prueba:**
```
Usuario normal: demo / demo
Usuario admin: admin / admin
```

#### Historial y Perfil
- **HistoryModal.jsx** - Historial de pedidos con:
  - ID de pedido, fecha y estado
  - Lista de productos con cantidades
  - Precio total
  - Botón "Repetir pedido"
- **ProfileModal.jsx** - Perfil de usuario con:
  - Información personal
  - Gestión de alergias
  - Preferencias de la app
  - Cerrar sesión / Eliminar cuenta

#### UI/UX Auxiliares
- **HamsterSpinner.jsx** - Spinner de carga animado (hamster corriendo)
- **SkeletonLoader.jsx** - Skeleton loading para productos
- **LoadingOverlay.jsx** - Overlay de carga
- **Toast.jsx** - Sistema de notificaciones
- **Overlay.jsx** - Overlay genérico para modales

#### Páginas Especiales
- **DashboardAdmin.jsx** - Panel de administración (en mockup)
- **KDSPanel.jsx** - Kitchen Display System (en mockup)
- **SpinnerDemo.jsx** - Demostración de spinners

### 2.3 Gestión del Estado

#### Context API
```javascript
// CartContext.jsx proporciona:
- items: Array de productos en el carrito
- addToCart(product, options): Añade producto
- removeFromCart(productId): Elimina producto
- updateQuantity(productId, quantity): Actualiza cantidad
- clearCart(): Vacía el carrito
- applyDiscount(code): Aplica cupón de descuento
- subtotal, tax, total: Cálculos automáticos
```

#### LocalStorage
- Persistencia del carrito entre sesiones
- Almacenamiento de cupones aplicados
- Preferencias de usuario
- Estado de autenticación

### 2.4 Estilos y Diseño

**Paleta de Colores:**
- Fondo principal: `#fffbe6` (crema)
- Acentos: `#b08968` (marrón cálido)
- Cards: `#ffffff`
- Botones primarios: `#b08968`
- Texto: `#333333`

**Características de Diseño:**
- Responsive (mobile-first)
- Animaciones suaves con CSS transitions
- Sombras sutiles (`box-shadow`)
- Border-radius redondeados
- Iconos SVG personalizados
- Sistema de badges visuales

### 2.5 Integración con Backend

**Variables de Entorno (`.env`):**
```env
VITE_API_URL=http://localhost:3000
```

**Ejemplo de Consumo:**
```javascript
const API_URL = import.meta.env.VITE_API_URL;

// Obtener menú
const response = await fetch(`${API_URL}/api/menu`);
const { data } = await response.json();

// Crear orden
await fetch(`${API_URL}/api/orders`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(orderData)
});
```

---

## 3. Arquitectura del Backend

### 3.1 Punto de Entrada

El backend es una API REST construida con Express.js que se conecta a PostgreSQL mediante `node-postgres` (pg).

**Comando para arrancar:**
```bash
cd backend
npm install      # Primera vez
npm run dev      # Desarrollo con --watch (reinicio automático)
```

**Puerto por defecto:** `http://localhost:3000`

### 3.2 Estructura del Código

```javascript
// backend/src/index.js
import express from 'express';
import cors from 'cors';
import pg from 'pg';
import dotenv from 'dotenv';

const app = express();
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL
});

app.use(cors());
app.use(express.json());
```

### 3.3 Base de Datos (PostgreSQL)

**Arrancar con Docker:**
```bash
# Desde la raíz del proyecto
docker-compose up -d

# Verificar que está corriendo
docker ps
```

**Credenciales:**
- Host: `localhost`
- Puerto: `5432`
- Usuario: `cafeteria_user`
- Password: `cafeteria_pass`
- Base de datos: `cafeteria_db`

**pgAdmin (interfaz web):**
- URL: http://localhost:8080
- Email: `admin@cafeteria.local`
- Password: `admin`

**Schema Principal:**
```sql
-- Tablas principales
users           -- Usuarios de la aplicación
menu_items      -- Productos del menú
orders          -- Pedidos realizados
order_items     -- Items individuales de cada pedido
```

### 3.4 Endpoints Disponibles

#### Health Check
```
GET /api/health
Response: { status: 'ok', timestamp: '...' }
```

#### Menú
```
GET /api/menu
Response: { data: [{ id, name, description, price, category, ... }] }
```

#### Órdenes
```
POST /api/orders
Body: { user_id, table_number, items: [] }
Response: { order_id, status, ... }

GET /api/orders/:id
Response: { id, user_id, items, total, status, ... }
```

### 3.5 Contrato de API (API_CONTRACT.md)

El contrato define la estructura EXACTA de datos que el backend debe devolver:

```json
// GET /api/products
[
  {
    "id": 1,
    "name": "Café con Leche",
    "description": "Café espresso con leche espumada.",
    "price": 1.20,
    "original_price": 1.50,
    "category": "cafes",
    "image": "https://...",
    "badges": ["popular", "nuevo"],
    "allergens": ["lactosa"],
    "options": {
      "sugar": { 
        "available": true, 
        "max": 3, 
        "price_per_unit": 0.00 
      },
      "removables": ["leche", "cacao", "canela"]
    }
  }
]
```

### 3.6 Seguridad y Validación

**Implementadas:**
- CORS habilitado
- Validación de inputs
- Sanitización de datos
- Manejo de errores con try/catch
- Transacciones para operaciones compuestas

**Pendientes:**
- Autenticación JWT
- Rate limiting
- Encriptación de contraseñas (bcrypt)
- Variables de entorno seguras

---

## 4. Contribuciones del Equipo

### 4.1 Trabajo de Alejandro (Project Coordinator & Pivote)

**Documentación:**
- ✅ API_CONTRACT.md - Contrato de API Backend/Frontend
- ✅ CONTRIBUTING.md - Guía de contribución Git
- ✅ GIT_WORKFLOW.md - Flujo de trabajo con ramas
- ✅ INTEGRATION_GUIDE.md - Guía de integración
- ✅ MEMORIA.MD - Memoria del equipo
- ✅ memoriaAlejandro.md - Memoria personal detallada (632 líneas)

**Componentes Desarrollados:**
- ✅ ProductCard.jsx + CSS - Tarjeta de producto con badges, alérgenos y favoritos
- ✅ ProductModal.jsx + CSS - Modal de personalización de productos
- ✅ CheckoutModal.jsx + CSS - Modal de pago con cupones
- ✅ HistoryModal.jsx + CSS - Historial de pedidos
- ✅ ProfileModal.jsx + CSS - Perfil de usuario
- ✅ CartPanel.jsx + CSS - Panel lateral del carrito
- ✅ Categories.jsx + CSS - Selector de categorías
- ✅ SkeletonLoader.jsx + CSS - Loading skeleton
- ✅ HamsterSpinner.jsx + CSS - Spinner animado
- ✅ Toast.jsx - Sistema de notificaciones

**Gestión del Proyecto:**
- ✅ Configuración de Git y flujo de trabajo
- ✅ Revisión de Pull Requests
- ✅ Testing de funcionalidades
- ✅ Coordinación entre frontend y backend
- ✅ Resolución de conflictos de merge

**Estadísticas (según memoria):**
- **Commits realizados:** 47+ commits
- **Archivos modificados:** 50+ archivos
- **Líneas de código:** 3,000+ líneas
- **Componentes creados:** 15+ componentes
- **Documentación:** 6 archivos MD principales

### 4.2 Trabajo de Jose Manuel (Frontend Developer)

**Responsabilidades Principales:**
- Conversión de mockups HTML/CSS a componentes React
- Implementación de componentes escalables
- Asegurar buena usabilidad
- Mantener armonía visual

**Componentes Asignados:**
- TopBar.jsx - Barra superior
- BottomNav.jsx - Navegación inferior
- SideMenu.jsx - Menú lateral
- FancyLogin.jsx - Pantalla de login animada
- ProductsGrid.jsx - Grid de productos
- LoadingOverlay.jsx - Overlay de carga
- Mockup inicial HTML/CSS/JS

### 4.3 Trabajo de Darlyng (Backend Developer)

**Responsabilidades Principales:**
- Desarrollo de API REST con Express
- Configuración de PostgreSQL con Docker
- Implementación de endpoints
- Validaciones y seguridad
- Prevención de inyección SQL

**Backend Implementado:**
- ✅ src/index.js - Servidor Express
- ✅ Configuración de PostgreSQL Pool
- ✅ Endpoints: /api/health, /api/menu, /api/orders
- ✅ Middleware CORS y JSON
- ✅ Manejo de transacciones
- ✅ Docker Compose para BD

**Pendiente:**
- Autenticación JWT
- Más endpoints (usuarios, favoritos, historial)
- Migraciones de base de datos
- Testing de endpoints

### 4.4 Trabajo Colaborativo

**Integraciones Exitosas:**
- Mockup HTML → Componentes React (Jose + Alejandro)
- API Contract → Endpoints Backend (Darlyng + Alejandro)
- CartContext → Componentes de UI (Alejandro + Jose)
- Docker Setup → Desarrollo local (Darlyng + Equipo)

**Metodología:**
- Git Flow con ramas feature
- Pull Requests con revisión obligatoria
- Conventional Commits
- Panel Kanban para seguimiento
- Comunicación diaria

---

## 5. Cómo Arrancar el Proyecto

### 5.1 Requisitos Previos

- **Node.js** 18+ (LTS recomendado)
- **Docker** y **Docker Compose**
- **Git** configurado
- **npm** o **pnpm**

### 5.2 Instalación Inicial

```bash
# 1. Clonar el repositorio
git clone https://github.com/KalzKiw/CafeteriaAppSSG.git
cd CafeteriaAppSSG

# 2. Copiar archivo de entorno
cp .env.example .env

# 3. Arrancar la base de datos
docker-compose up -d

# 4. Verificar que PostgreSQL está corriendo
docker ps
```

### 5.3 Arrancar el Backend

```bash
# Desde la raíz del proyecto
cd backend

# Instalar dependencias (solo primera vez)
npm install

# Arrancar servidor en modo desarrollo
npm run dev

# El servidor arranca en http://localhost:3000
```

**Verificar que funciona:**
```bash
curl http://localhost:3000/api/health
# Debería responder: {"status":"ok","timestamp":"..."}
```

### 5.4 Arrancar el Frontend

```bash
# Desde la raíz del proyecto
cd frontend

# Instalar dependencias (solo primera vez)
npm install

# Arrancar aplicación en modo desarrollo
npm run dev

# La app arranca en http://localhost:5173
```

**Verificar que funciona:**
- Abrir http://localhost:5173 en el navegador
- Debería aparecer la pantalla de login
- Usar credenciales: `demo` / `demo`

### 5.5 Solución de Problemas Comunes

#### Error: "Cannot connect to database"
```bash
# Verificar que PostgreSQL está corriendo
docker ps | grep postgres

# Si no está, arrancarlo
docker-compose up -d

# Ver logs del contenedor
docker logs cafeteria_db
```

#### Error: "Port 5173 already in use"
```bash
# Matar el proceso en el puerto
lsof -ti:5173 | xargs kill -9

# O usar otro puerto
npm run dev -- --port 5174
```

#### Error: "Module not found"
```bash
# Limpiar node_modules y reinstalar
rm -rf node_modules package-lock.json
npm install
```

### 5.6 Comandos Útiles

```bash
# Backend
cd backend
npm run dev          # Desarrollo con auto-reload
npm start            # Producción
npm run db:migrate   # Ejecutar migraciones

# Frontend
cd frontend
npm run dev          # Desarrollo (Vite)
npm run build        # Build de producción
npm run preview      # Preview del build

# Docker
docker-compose up -d              # Arrancar contenedores
docker-compose down               # Parar contenedores
docker-compose down -v            # Parar y borrar volúmenes
docker-compose logs -f postgres   # Ver logs de PostgreSQL
docker exec -it cafeteria_db psql -U cafeteria_user -d cafeteria_db  # Conectar a PostgreSQL
```

---

## 6. Memorias Individuales

### 6.1 Memoria del Equipo (MEMORIA.MD)

**Contenido:**
- Definición y planificación inicial
- Stack tecnológico decidido
- Roles y responsabilidades
- Estructura del proyecto
- Diseño y mockup
- Base de datos
- Flujo de trabajo con Git
- Próximos pasos

**Autores:** Equipo completo  
**Fecha:** 19 de noviembre de 2025  
**Líneas:** 135 líneas

### 6.2 Memoria de Alejandro (memoriaAlejandro.md)

**Contenido:**
- Configuración inicial del proyecto
- Arquitectura completa del frontend
- Documentación de todos los componentes
- Funcionalidades implementadas paso a paso
- Sistema de autenticación
- Catálogo de productos
- Carrito de compra
- Sistema de checkout
- Historial y perfil
- Diseño y estilos
- Estadísticas de commits y cambios

**Autor:** Alejandro  
**Fecha:** 28 de enero de 2026  
**Líneas:** 632 líneas (documento extenso y detallado)

**Secciones Destacadas:**
1. **Configuración Inicial del Proyecto** - Setup completo
2. **Arquitectura Frontend** - Estructura de componentes
3. **Funcionalidades Implementadas** - 11 sistemas completos
4. **Diseño y Estilos** - Paleta de colores y patrones
5. **Integración Backend/Frontend** - Contrato de API
6. **Gestión del Proyecto** - Git workflow y documentación
7. **Estadísticas y Métricas** - Commits, archivos, líneas de código

### 6.3 Memorias Pendientes

**memoriaJose.md** - No encontrada en el proyecto  
**memoriaDarlyn.md** - No encontrada en el proyecto

**Nota:** Para crear una memoria completa del proyecto, será necesario fusionar las memorias individuales de Jose y Darlyng una vez estén disponibles.

---

## 7. Estado Actual y Próximos Pasos

### 7.1 Estado Actual (30 de enero de 2026)

**Frontend:** ✅ Funcional
- Login/registro implementado
- Catálogo de productos con filtros
- Carrito de compra completo
- Sistema de checkout
- Historial de pedidos
- Perfil de usuario
- Diseño responsive mobile-first

**Backend:** ⚠️ En desarrollo
- API REST básica funcionando
- Endpoints de menú y órdenes
- PostgreSQL configurado con Docker
- Falta autenticación JWT
- Falta integración completa con frontend

**Base de Datos:** ✅ Configurada
- PostgreSQL corriendo en Docker
- pgAdmin disponible
- Schema inicial creado
- Seeds de ejemplo

**Documentación:** ✅ Completa
- README principal
- README frontend/backend
- Guías de contribución
- Contrato de API
- Memorias del equipo

### 7.2 Próximos Pasos

**Prioridad Alta:**
- [ ] Integrar frontend con backend real (reemplazar datos mock)
- [ ] Implementar autenticación JWT en backend
- [ ] Conectar sistema de checkout con API de órdenes
- [ ] Sincronizar historial de pedidos con base de datos
- [ ] Testing end-to-end del flujo completo

**Prioridad Media:**
- [ ] Sistema de favoritos con persistencia en BD
- [ ] Dashboard de administración funcional
- [ ] Panel KDS (Kitchen Display System)
- [ ] Gestión de mesas
- [ ] Sistema de promociones y cupones en BD

**Prioridad Baja:**
- [ ] PWA (Progressive Web App) con Service Workers
- [ ] Build para producción
- [ ] Empaquetado APK con Capacitor
- [ ] Deploy en Vercel (frontend) y Render/Railway (backend)
- [ ] Testing automatizado (Jest, Vitest)

---

## 8. Recursos y Referencias

### 8.1 Documentación Oficial

- [React](https://react.dev/)
- [Ionic React](https://ionicframework.com/docs/react)
- [Vite](https://vitejs.dev/)
- [Express.js](https://expressjs.com/)
- [PostgreSQL](https://www.postgresql.org/docs/)
- [node-postgres](https://node-postgres.com/)
- [Docker](https://docs.docker.com/)

### 8.2 Repositorio

- **GitHub:** https://github.com/KalzKiw/CafeteriaAppSSG
- **Rama principal:** `develop`
- **Rama estable:** `main`

### 8.3 Herramientas Recomendadas

- **VS Code** con extensiones:
  - ES7+ React/Redux/React-Native snippets
  - Prettier - Code formatter
  - ESLint
  - Docker
- **Postman** o **Insomnia** para testing de API
- **Git GUI** (GitKraken, SourceTree, GitHub Desktop)
- **TablePlus** o **DBeaver** para visualizar PostgreSQL

---

## 9. Créditos y Licencia

**Desarrolladores:**
- Alejandro - Project Coordinator & Pivote
- Jose Manuel - Frontend Developer
- Darlyng - Backend Developer

**Institución:** SSG (San Sebastián de Gomera)  
**Año:** 2025-2026  
**Licencia:** MIT

---

**Última actualización:** 30 de enero de 2026  
**Versión del documento:** 1.0

---

## 📞 Contacto y Soporte

Para preguntas o issues, abrir un ticket en GitHub Issues o contactar al coordinador del proyecto.

**Happy Coding! ☕**
