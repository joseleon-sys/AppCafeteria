# Memoria del Proyecto - CafeteriaSSG

## 📅 Fase inicial: Definición y planificación (Semana 1)

Los primeros días hemos decidido el rumbo que queremos tomar con la app. Lo primero que decidimos es usar **React** como nuestra tecnología principal e **Ionic** para poderla empaquetar como una APK y subirla a la PlayStore, cumpliendo así los requisitos del trabajo.

### Stack tecnológico decidido

- **Frontend**: React + Ionic Framework
- **Backend**: Node.js + Express
- **Base de datos**: PostgreSQL (dockerizada con Docker Compose)
- **Control de versiones**: Git + GitHub
- **Gestión de proyecto**: Panel Kanban

### Roles y responsabilidades del equipo

- **Darlyng** — Backend Developer
  - Rol: Asegurar que toda la lógica, base de datos y funciones estén funcionando minimizando errores
  - Responsabilidades: API REST, endpoints, integraciones con PostgreSQL, validaciones y seguridad (prevención de inyección SQL)

- **Jose Manuel** — Frontend Developer
  - Rol: Convertir los mockups a código React funcional
  - Responsabilidades: Implementar componentes escalables, asegurar buena usabilidad y mantener armonía visual en toda la aplicación

- **Alejandro** — Project Coordinator
  - Rol: Documentar, estructurar el proyecto y pivotear entre front y back. Desarollo de DashBoard Admin-
  - Responsabilidades: Gestionar el flujo de trabajo con Git (merges, PR reviews), testear funcionalidades e interfaz en caliente, descargar trabajo a los devs, mantener documentación actualizada

### Estado actual: Estructuración del proyecto

Ya hemos definido el camino que va a tomar la interfaz y estamos diseñando la base de datos. Hemos discutido las tecnologías, el rumbo de la interfaz y las funcionalidades principales de la app. Ahora estamos generando:

- **Estructura del proyecto** con carpetas separadas `backend/` y `frontend/`
- **Repositorio en GitHub**: [https://github.com/KalzKiw/CafeteriaAppSSG](https://github.com/KalzKiw/CafeteriaAppSSG)
- **Panel Kanban** para llevar el ritmo del trabajo durante todo el desarrollo
- **Docker Compose** configurado para base de datos PostgreSQL + pgAdmin
- **Mockup funcional** en HTML/CSS/JS como prototipo visual para el frontend dev

---

## 🗂️ Estructura del proyecto

```
CafeteriaSSG/
├── backend/              # API REST (Node.js + Express)
│   ├── src/              # Código fuente del servidor
│   ├── db/               # Scripts SQL (init.sql, migrations)
│   ├── package.json
│   └── README.md
├── frontend/             # App Ionic React
│   ├── src/              # Componentes, páginas, hooks
│   ├── mockup/           # Prototipo HTML/CSS/JS (base para React)
│   ├── public/           # Assets estáticos
│   ├── package.json
│   └── README.md
├── docker-compose.yml    # Postgres + pgAdmin
├── .env.example          # Variables de entorno de ejemplo
├── CONTRIBUTING.md       # Guía de contribución y Git
├── GIT_WORKFLOW.md       # Flujo de ramas y PRs
├── MEMORIA.MD            # Este archivo
└── README.md             # Documentación principal
```

---

## 🎨 Diseño y mockup

Hemos creado un mockup funcional en HTML/CSS/JS (carpeta `frontend/mockup/`) que sirve como prototipo visual y guía para el frontend developer. El mockup incluye:

- Login/registro con localStorage
- Navegación con menú lateral (hamburger)
- Categorías de productos (cafés, bocadillos, dulces, bebidas)
- Carrito de compra funcional
- Diseño responsive y accesible

**Objetivo**: Facilitar la conversión a componentes React manteniendo la estética y UX definidas.

---

## 🗄️ Base de datos (PostgreSQL)

Modelo inicial con las siguientes tablas:

- `users` — usuarios de la aplicación
- `menu_items` — productos del menú (cafés, bocadillos, etc.)
- `orders` — pedidos realizados
- `order_items` — items individuales de cada pedido

**Scripts disponibles**:
- `backend/db/init.sql` — inicialización de schema y seeds
- Migraciones futuras se gestionarán con herramienta (Prisma/node-pg-migrate)

---

## 🔄 Flujo de trabajo con Git

**Ramas principales**:
- `main` — releases estables (solo merges desde `develop`)
- `develop` — rama de integración protegida (todos trabajan desde aquí)

**Flujo recomendado**:
1. Crear rama desde `develop`: `feature/<nombre>` o `task/<id>-<desc>`
2. Hacer commits con Conventional Commits (`feat:`, `fix:`, `chore:`)
3. Push y abrir Pull Request hacia `develop`
4. Revisión y aprobación (mínimo 1 revisor + líder)
5. Merge a `develop` por el coordinador

**Documentación**:
- `CONTRIBUTING.md` — comandos Git paso a paso para novatos
- `GIT_WORKFLOW.md` — convenciones de ramas y normas de PR
- `.github/PULL_REQUEST_TEMPLATE.md` — plantilla para PRs estandarizadas

---

## 🚀 Próximos pasos

- [ ] Completar diseño de la base de datos (tablas adicionales: mesas, promociones)
- [ ] Implementar autenticación básica en backend (JWT o sesiones)
- [ ] Convertir mockup HTML/CSS/JS a componentes React + Ionic
- [ ] Crear hooks personalizados (`useMenu`, `useOrders`, `useAuth`)
- [ ] Integrar frontend con backend (fetch/axios hacia API REST)
- [ ] Testear flujo completo: login → ver menú → añadir al carrito → crear pedido
- [ ] Preparar build para producción y empaquetado APK con Capacitor

---

## 📝 Notas y decisiones

- **¿Por qué Postgres en Docker?** Control total sobre infra, fácil replicar entorno local, sin vendor lock-in.
- **¿Por qué separar backend y frontend?** Claridad organizativa para que cada dev trabaje en su área sin conflictos.
- **Mockup primero, luego React**: Validar UX/diseño rápidamente antes de componentizar.

---

**Última actualización**: 19 de noviembre de 2025 