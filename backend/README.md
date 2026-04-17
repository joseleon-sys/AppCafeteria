# Backend - CafeteriaSSG

API REST para la aplicación de cafetería. Stack: Node.js + Express + PostgreSQL (dockerizada).

## Requisitos

- Node.js 18+ (recomendado LTS)
- Docker y Docker Compose
- npm o pnpm

## Dependencias necesarias del backend

El backend usa estas dependencias de `npm`:

- Producción: `@supabase/supabase-js`, `bcryptjs`, `cors`, `dotenv`, `express`, `firebase-admin`, `jsonwebtoken`, `pg`, `stripe`
- Desarrollo: `nodemon`

Si aparece un error tipo `Cannot find package 'bcryptjs'`, significa que falta instalar las dependencias de `backend/`.

## Arrancar la base de datos (Docker)

Desde la raíz del proyecto (`D:\CafeteriaSSG`), ejecuta:

```powershell
# Copia el archivo de ejemplo de variables de entorno
Copy-Item .env.example .env

# Arranca Postgres y pgAdmin en contenedores
docker-compose up -d

# Verifica que los contenedores están corriendo
docker ps
```

**Acceso a la base de datos:**
- Host: `localhost`
- Puerto: `5432`
- Usuario: `cafeteria_user` (configurable en `.env`)
- Password: `cafeteria_pass`
- Base de datos: `cafeteria_db`

**Acceso a pgAdmin (interfaz web):**
- URL: [http://localhost:8080](http://localhost:8080)
- Email: `admin@cafeteria.local`
- Password: `admin`

### Conectar pgAdmin a Postgres

1. Abre [http://localhost:8080](http://localhost:8080)
2. Añade un nuevo servidor (Add New Server):
   - **General > Name**: Cafeteria Local
   - **Connection > Host**: `postgres` (nombre del contenedor en la red Docker)
   - **Connection > Port**: `5432`
   - **Connection > Username**: `cafeteria_user`
   - **Connection > Password**: `cafeteria_pass`
   - **Connection > Maintenance database**: `cafeteria_db`
3. Guarda y conéctate.

## Estructura del backend

```
backend/
├── src/
│   ├── routes/         # Rutas de la API (orders, menu, users)
│   ├── controllers/    # Lógica de negocio
│   ├── models/         # Modelos (si usas ORM como Prisma)
│   ├── middlewares/    # Autenticación, validación, etc.
│   └── index.js        # Punto de entrada del servidor
├── db/
│   ├── init.sql        # Script inicial (schema + seeds)
│   └── migrations/     # Migraciones (si usas herramienta de migrations)
├── package.json
├── .env                # Variables locales (no commitear)
└── README.md           # Este archivo
```

## Instalar dependencias

Desde la carpeta `backend/`:

```powershell
cd backend
npm install
```

Si quieres una instalación limpia usando el lockfile:

```powershell
cd backend
npm ci
```

## Verificación rápida

Tras instalar dependencias, estos comandos deben funcionar:

```powershell
cd backend
npm run dev
```

Si el problema era por paquetes no instalados, errores como `bcryptjs not found` o `pg not found` deberían desaparecer.

## Ejecutar el servidor de desarrollo

```powershell
npm run dev
```

El servidor arranca en [http://localhost:3000](http://localhost:3000) por defecto.

## Endpoints de ejemplo

- `GET /api/health` — healthcheck
- `GET /api/menu` — lista de productos del menú
- `POST /api/orders` — crear orden
- `GET /api/orders/:id` — detalle de orden

## Persistencia de pedidos

El backend maneja ahora mismo dos rutas de persistencia para pedidos estandar:

- Esquema principal: si el usuario autenticado tiene un ID UUID, el pedido se guarda en `pedidos` y `lineas_pedido`.
- Esquema local legacy: si el usuario autenticado tiene un ID numerico, el pedido se guarda en `orders` y `order_items`.

Esto afecta especialmente al modo `DEV_BYPASS_STRIPE_PAYMENT`:

- Antes: el bypass podia terminar solo en memoria si el usuario no tenia UUID.
- Ahora: el bypass intenta persistir tambien en base de datos local usando `orders` y `order_items`.
- Solo se usa el fallback en memoria si la base de datos no esta disponible.
- Si `DEV_BYPASS_STRIPE_PAYMENT=true`, el backend omite Stripe solo fuera de `NODE_ENV=production`. En produccion se ignora para evitar saltar la pasarela de pago por accidente.

El historial `GET /api/orders/my` y el detalle `GET /api/orders/:id` leen del mismo esquema en el que se persistio el pedido.

(Implementar según necesidad del proyecto.)

## Migraciones y seeds

Si usas una herramienta de migraciones (Prisma Migrate, node-pg-migrate, Flyway):

```powershell
# Ejemplo con Prisma
npx prisma migrate dev --name init

# O ejecutar directamente SQL
docker exec -i cafeteria_db psql -U cafeteria_user -d cafeteria_db < db/migrations/001_create_tables.sql
```

## Detener y limpiar Docker

```powershell
# Detener contenedores
docker-compose down

# Detener y borrar volúmenes (borra datos)
docker-compose down -v
```

## Buenas prácticas

- Usar variables de entorno para credenciales y configuración.
- Nunca commitear `.env` (ya está en `.gitignore`).
- Validar y sanitizar inputs del cliente.
- Usar transacciones para operaciones compuestas.
- Testear endpoints con Postman, Insomnia o REST Client (VS Code).

## Recursos

- [Documentación de PostgreSQL](https://www.postgresql.org/docs/)
- [Express.js](https://expressjs.com/)
- [node-postgres (pg)](https://node-postgres.com/)
- [Prisma](https://www.prisma.io/docs/) (ORM opcional)
