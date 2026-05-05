# AGENTS.md

## Descripcion Del Proyecto

AppCafeteria es una aplicacion de cafeteria con frontend React/Vite/Capacitor y backend Node.js/Express. El sistema gestiona catalogo de productos, carrito, pedidos, autenticacion, perfiles adulto/menor, vinculacion padre-hijo, aprobacion de pedidos infantiles y panel de administracion. Supabase es el unico servicio externo vigente documentado.

El objetivo de cualquier cambio es mejorar el codigo manteniendo la funcionalidad actual. No se debe mezclar logica nueva con refactors grandes sin una razon clara y verificable.

## Estructura Esperada

El proyecto debe mantener frontend y backend separados:

```txt
frontend/
  src/
    api/
    features/
    components/
    hooks/
    pages/
    lib/
    styles/

backend/
  src/
    app/
    routes/
    controllers/
    services/
    repositories/
    validators/
    middleware/
    utils/
    observability/
```

La raiz queda para documentacion, configuracion de Docker, guias y archivos comunes del repositorio.

## Convenciones De Backend

- `routes`: solo definen endpoints, middlewares aplicables y delegan en controllers.
- `controllers`: traducen `req`/`res` hacia casos de uso; no deben contener consultas largas ni reglas de negocio complejas.
- `services`: contienen reglas de negocio, orquestacion y decisiones del dominio.
- `repositories`: encapsulan acceso a Supabase.
- `validators`: validan y normalizan entradas antes de ejecutar logica de negocio.
- `middleware`: autenticacion, autorizacion, rate limiting, CORS, logs, errores y seguridad transversal.
- `utils`: funciones puras y pequenas, sin dependencia directa de Express ni Supabase salvo que sea inevitable.

Reglas especificas:

- Evitar rutas Express con validacion, queries, negocio y respuesta mezcladas.
- Centralizar errores con un manejador comun y errores tipados.
- No devolver detalles internos de errores en produccion.
- Mantener contratos API estables o actualizar frontend/backend juntos.
- Nombrar DTOs y payloads de forma consistente entre frontend y backend.

## Convenciones De Frontend

- `api`: cliente HTTP base y modulos por dominio (`auth`, `catalog`, `orders`, `family`, `admin`).
- `features`: funcionalidades completas agrupadas por dominio.
- `components`: componentes reutilizables y presentacionales.
- `hooks`: estado reutilizable, efectos y logica de UI.
- `pages`: pantallas principales o vistas de nivel superior.
- `lib`: utilidades compartidas existentes; mover progresivamente a `api`, `features` o `shared` cuando tenga sentido.

Reglas especificas:

- Evitar componentes enormes que mezclen fetch, estado, renderizado y formularios.
- Extraer hooks para carga de datos y acciones repetidas.
- Mantener componentes presentacionales sin conocimiento de endpoints cuando sea posible.
- Evitar CSS global innecesario; preferir estilos por feature/componente siguiendo el patron existente.
- No duplicar contratos de API; usar funciones centralizadas.

## Reglas De Clean Code

- Cambios pequenos, enfocados y verificables.
- Nombres claros antes que comentarios largos.
- Funciones cortas con una responsabilidad principal.
- Separar validacion, negocio, persistencia y presentacion.
- Evitar duplicacion de reglas de negocio.
- No introducir abstracciones prematuras.
- Mantener compatibilidad con la funcionalidad actual durante refactors.
- No reescribir archivos completos si basta con una extraccion incremental.
- Eliminar `console.log` de depuracion antes de finalizar cambios, salvo logs intencionales del backend.
- Preferir codigo explicito y simple frente a soluciones magicas.

## Reglas De Seguridad

- No subir secretos reales al repositorio.
- Los archivos `.env.example` deben contener placeholders, nunca claves validas.
- Rotar cualquier secreto que haya sido expuesto accidentalmente.
- Configurar CORS con origenes permitidos, no abierto por defecto en produccion.
- Aplicar rate limiting a login, registro, reset de password y endpoints sensibles.
- No exponer `error.message` interno al cliente en produccion.
- Validar todos los payloads entrantes en backend.
- No confiar en roles enviados por frontend; siempre verificar JWT y estado real del usuario.
- Usar generadores criptograficos para tokens de seguridad.
- Evitar guardar datos sensibles en `localStorage` cuando exista una alternativa mas segura.
- Redactar tokens, passwords y cabeceras sensibles en logs.

## Comandos

Instalar dependencias del backend:

```bash
cd backend
npm install
```

Ejecutar backend en desarrollo:

```bash
cd backend
npm run dev
```

Ejecutar backend en modo normal:

```bash
cd backend
npm start
```

Instalar dependencias del frontend:

```bash
cd frontend
npm install
```

Ejecutar frontend en desarrollo:

```bash
cd frontend
npm run dev
```

Compilar frontend:

```bash
cd frontend
npm run build
```

## Secretos Y Variables De Entorno

- Usar `.env` local para valores reales.
- Usar `.env.example` solo con nombres descriptivos o placeholders.
- No commitear claves de Supabase, JWT ni otros secretos.
- Revisar diffs antes de subir cambios que toquen configuracion.
- Si una clave real aparece en git, asumir que esta comprometida y rotarla.

Ejemplo correcto:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=replace-me
JWT_SECRET=replace-me
```

## Criterio De Finalizacion

Un cambio se considera terminado cuando:

- El proyecto mantiene la funcionalidad actual.
- El frontend compila con `npm run build`.
- El backend arranca con sus variables requeridas.
- No se han introducido secretos reales.
- Los contratos frontend/backend siguen alineados.
- Las rutas criticas de autenticacion, catalogo, pedidos, familia y administracion conservan su comportamiento esperado.
- Cualquier riesgo o prueba no ejecutada queda documentada en la respuesta final.
