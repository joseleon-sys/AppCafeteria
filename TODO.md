# TODO

## Incoherencias entre el proyecto y `backend/db/Estructura.sql`

### 1. Migrar el flujo padre/hijo al esquema real

- [ ] Reescribir `backend/src/routes/childOrderRoutes.js` para dejar de usar `child_orders` y `child_order_items`.
- [ ] Adaptar creación, listado, detalle, aprobación, rechazo, pago y modificación de pedidos infantiles para trabajar con `pedidos` y `lineas_pedido`.
- [ ] Definir cómo se relacionan `users.id` (`bigint`) y `perfiles.id` (`uuid`) dentro del flujo padre/hijo.
- [ ] Resolver la incompatibilidad entre `parent_child_links.parent_id/child_id -> users.id` y `pedidos.id_perfil/id_pagador -> perfiles.id`.
- [ ] Revisar `backend/src/routes/childOrderRoutes.js`: aún mantiene un flujo dual legacy (`child_orders`/`child_order_items`) y el nuevo modelo (`pedidos`/`lineas_pedido`) según el origen de datos.
- [ ] Definir si el `req.user.id` autenticado debe normalizarse a `perfiles.id` o a `users.id`; el backend actual mezcla bigint y UUID en los mismos flujos de pedido.
- [ ] Revisar `backend/src/routes/authRoutes.js` para crear/leer `perfiles` junto con `users`, porque `pedidos` y `lineas_pedido` requieren IDs de `perfiles`.
- [ ] Confirmar si la tabla `vinculos_familiares` forma parte del esquema actual o debe eliminarse, porque no se usa en ningún handler del backend.
- [ ] Decidir si el backend debe operar sobre `users`, sobre `perfiles`, o sobre ambos con un mapeo explícito.

### 2. Revisar el modelo de autenticación frente al modelo de pedidos

- [ ] Alinear el alta/login actual en `backend/src/routes/authRoutes.js` con el esquema real.
- [ ] Confirmar si al registrar un usuario en `users` debe crearse también una fila asociada en `perfiles`.
- [ ] Revisar `backend/src/routes/orderRoutes.js` para eliminar la dependencia funcional de que el usuario autenticado tenga un ID UUID.
- [ ] Revisar todos los puntos donde se compara `req.user.id` con `pedidos.id_perfil` o `pedidos.id_pagador`.

### 3. Añadir tablas de notificaciones que el código sigue usando

- [ ] Crear en SQL la tabla `user_device_tokens`.
- [ ] Crear en SQL la tabla `app_notifications`.
- [ ] Verificar que sus columnas coincidan con lo que usa `backend/src/services/notificationService.js`.
- [ ] Comprobar claves foráneas y tipos de `user_id` en esas tablas frente al tipo real de `users.id`.

### 4. Alinear `productos_menu` con el uso real del backend

- [ ] Añadir al esquema real las columnas que el proyecto usa en `productos_menu`:
  - `category`
  - `description`
  - `image_url`
  - `badges`
  - `options`
  - `ingredients`
  - `contains_info`
  - `conservation`
  - `shelf_life_hours`
  - `calories_kcal`
  - `nutrition_table`
  - `sanitary_approved`
  - `sanitary_notes`
  - `approved_at`
- [ ] Revisar `backend/src/routes/catalogRoutes.js` para confirmar que no queda ninguna columna usada que no exista en el esquema final.
- [ ] Revisar `backend/src/appContext.js` y `backend/db/load-products.js`, que actualmente asumen esas columnas extendidas.

### 5. Resolver la columna ausente `users.blocked`

- [ ] Añadir `users.blocked` al esquema real o eliminar su uso del backend.
- [ ] Revisar `backend/src/routes/adminRoutes.js`, donde se consulta y actualiza esa columna.
- [ ] Decidir el comportamiento funcional del bloqueo de usuarios si esa columna no va a existir.

### 6. Revisar scripts y SQL legacy que ya no representan el esquema real

- [ ] Revisar `backend/db/init.sql`, que sigue definiendo tablas antiguas como `menu_items`, `orders`, `order_items`, `child_orders` y `child_order_items`.
- [ ] Decidir si `backend/db/init.sql` debe migrarse al esquema real o marcarse explícitamente como legacy/no usado.
- [ ] Revisar documentación que todavía asume el esquema antiguo.

### 7. Revisar integridad general tras la migración de nombres

- [ ] Hacer una pasada global para confirmar que no queden referencias activas a:
  - `orders`
  - `order_items`
  - `child_orders`
  - `child_order_items`
  - `menu_items`
- [ ] Validar que todas las consultas a `pedidos`, `lineas_pedido`, `perfiles`, `users`, `productos_menu` y `parent_child_links` usan columnas existentes.
- [ ] Ejecutar pruebas manuales de:
  - Registro/login
  - Pedido normal
  - Pedido infantil
  - Historial de pedidos
  - Cola admin
  - Favoritos/perfil
  - Notificaciones

## Cambios ya hechos

- [x] `backend/src/routes/orderRoutes.js` actualizado para soportar `pedidos`/`lineas_pedido` con usuarios UUID y `orders`/`order_items` en el flujo local legacy y `dev bypass`.
- [x] `backend/src/middleware/fraudPrevention.js` actualizado para consultar `pedidos` en lugar de `orders`.
- [x] `backend/src/routes/adminRoutes.js` actualizado para construir la cola admin desde `pedidos` y `lineas_pedido`.
