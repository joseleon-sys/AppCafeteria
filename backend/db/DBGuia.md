# 📋 FUNCIONALIDADES.md: Sistema Cafetería Escolar (CafeteriaSSG)

Este documento detalla los requisitos funcionales de la aplicación, considerando el contexto de **compra remota por tutores** y la **recogida sin móvil** por parte de los alumnos, además de la gestión logística interna de la cafetería.

## 1. 👥 Actores y Roles del Sistema

| Actor | Responsabilidad Principal | Casos de Uso Clave |
| :--- | :--- | :--- |
| **Tutor / Padre** | **Gestión de Cuentas y Pago** | Programa pedidos, gestiona el Monedero y establece límites de gasto. |
| **Alumno Menor** | **Beneficiario de Recogida** | Recoge el pedido mediante PIN/código. No interactúa con la app. |
| **Alumno Mayor (16+)** | **Autogestión de Pedidos** | Si está permitido, gestiona su propio Monedero y realiza pedidos. |
| **Staff Cafetería** | **Gestión Logística y Entrega** | Utiliza el Dashboard para previsiones y la pantalla KDS para preparar y validar entregas (escaneo del PIN). |

## 2. 🛡️ Módulo de Pedidos Programados y Seguridad

Este módulo sustituye la compra inmediata por la planificación con foco en la seguridad alimentaria.

### 2.1. Ficha de Usuario (Base de Datos)

* Cada usuario debe tener campos para **Nombre, Apellidos, ID Único (escolar)**.
* **Alergias:** Se gestionará mediante un **Selector Múltiple de Alérgenos** (leche, gluten, frutos secos, etc.), vinculado al perfil del Beneficiario.

### 2.2. Programación de Pedidos

* **Header Dinámico (Dev UI):** Sustituir la localización estática por un selector que muestre el **Beneficiario Activo** y el **Turno/Fecha de Recogida**.
* **Selección Obligatoria:** Al crear el carrito o finalizar la compra, es obligatorio seleccionar **Fecha** y **Turno de Recogida** (Ej: "Lunes, 8:30 - 9:00 Desayuno").
* **Repetición y Programación:** Permitir al Tutor **repetir un pedido histórico** y/o establecer un pedido como **recurrente** para días específicos (ej. Lunes y Miércoles).

### 2.3. Control de Alergias (Advertencia)

* **Lógica (Dev Lógica):** El sistema debe verificar si los alérgenos de un producto coinciden con los del Beneficiario activo.
* **UI (Dev UI):** En la vista de Inicio, el producto **NO se oculta**. En su lugar, se muestra un **ICONO DE ADVERTENCIA (🚨)** y un breve mensaje, como **"Contiene alérgeno del Beneficiario"**.
* **UI (Dev UI):** Dentro de la modal de Producto/Carrito, se debe mostrar un **banner de advertencia prominente y de color rojo/naranja** si hay riesgo.

---

## 3. 💳 Módulo de Finanzas y Autogestión

Se incorpora un sistema de monedero virtual para mayor flexibilidad.

| Componente | Requisito Funcional | Responsable |
| :--- | :--- | :--- |
| **Monedero Virtual** | Permite al Tutor recargar un **saldo virtual** a través de la pasarela de pago. | Dev Lógica (API de Monedero) |
| **Pagos** | El Tutor/Alumno Mayor puede pagar pedidos usando la **Pasarela de Pago** o el **Saldo del Monedero**. | Dev Lógica |
| **Límites de Gasto** | El Tutor debe poder establecer un **límite de gasto diario o semanal** asociado al Beneficiario (para alumnos menores). | Dev Lógica |
| **Autogestión** | Los alumnos mayores pueden tener acceso al Monedero para autogestionar su propio gasto. | Dev UI / Dev Lógica (Reglas de Acceso) |

---

## 4. 🎫 Módulo de Recogida (Flujo y Ticket)

El proceso de *checkout* y recogida debe ser rápido y seguro.

### 4.1. Generación del Ticket

* Al pagar, se genera un **Ticket Digital Único** (descargable/imprimible/compartible).
* **Seguridad:** El ticket debe mostrar un **PIN Único de 4-6 dígitos** y un **Código QR** para el escaneo por el personal de la cafetería.

### 4.2. Advertencia en la Entrega (QA de Alergias)

* El ticket debe tener una sección de advertencia de **ALERGIA** con tipografía **grande, negrita y color de alta visibilidad** (ej. Rojo o Naranja fuerte).
* **Texto:** **"¡ATENCIÓN! ALUMNO CON RIESGO DE ALERGIA: [LISTA DE ALERGIAS]"**

---

## 5. 📊 Módulo de Logística (Dashboard de la Cafetería)

Este *dashboard* es el foco del **Dev Lógica** y su integración con PostgreSQL para la eficiencia operativa.

### 5.1. Escandallo e Inventario

* **Inventario:** El sistema debe registrar la materia prima en *stock*.
* **Escandallo (Recetas):** Cada producto vendido en la app debe tener una **Ficha Técnica** que especifica la materia prima que consume.
* **Ventas Estimadas y Requisición (KPI):** El *dashboard* debe calcular: **Pedidos Programados y Pagados x Escandallo = Requisición total de Materia Prima** para el día/turno siguiente.

### 5.2. KDS (Kitchen Display System)

* **Objetivo:** Reducir errores de preparación.
* **Funcionalidad:** Pantalla simple que muestra las comandas agrupadas por **Turno de Recogida** con la capacidad de cambiar su **Estado** (`PENDIENTE` → `EN PREPARACIÓN` → `LISTO`).
* **Seguridad KDS:** La comanda en el KDS debe mostrar el **Nombre del Alumno** y sus **Alergias** de manera destacada.

---

## 6. ⏱️ Gestión de Turnos y Caducidad

Este módulo establece límites de tiempo y la lógica de qué ocurre fuera de la ventana de pedido.

| Componente | Requisito Funcional | Responsable |
| :--- | :--- | :--- |
| **Límite de Pedidos** | El *dashboard* debe permitir al Staff establecer una **Hora Límite** para la aceptación de pedidos para cada turno (Ej. Pedidos de Desayuno cierran a las 22:00h del día anterior). | Dev Lógica / Staff Cafetería |
| **Precios/Disponibilidad Dinámica** | El *dashboard* debe permitir al Staff **activar o desactivar temporalmente** productos o categorías fuera de un turno específico (Ej. No se puede pedir café después del mediodía), lo cual se refleja en el *front*. | Dev Lógica / Staff Cafetería |
| **Expiración de PIN** | El **PIN Único** del ticket debe expirar **30 minutos después** de la finalización del Turno de Recogida programado. Después de este tiempo, el pedido pasa a estado **"NO RECOGIDO"**. | Dev Lógica |

---

## 7. 🔔 Módulo de Notificaciones y Flujo de Error

Este módulo cubre la comunicación en situaciones críticas.

| Caso de Uso | Requisito Funcional | Responsable |
| :--- | :--- | :--- |
| **Falta de Stock** | Si la cafetería detecta que la materia prima falló después de la compra (Ej. Se agotó el pan), el Staff debe poder **Cancelar el Pedido** desde el *dashboard*. Se activa una notificación al Tutor explicando el motivo y procesando el **reembolso automático** (Monedero o tarjeta). | Dev Lógica / Staff Cafetería |
| **Recordatorio de Compra** | Si el Tutor no ha realizado el pedido semanal, la app debe enviarle una **notificación Push** o Email un día antes de la fecha límite para hacer pedidos programados. | Dev Lógica |
| **Pedido Listo** | El Tutor debe recibir una notificación (Push o Email) cuando el estado de su pedido en el KDS cambie a **"LISTO PARA RECOGER"** (o 5 minutos antes del turno programado). | Dev Lógica |

---
## 8. 📝 Backlog de Funcionalidades (Para Kanban)

Este listado está diseñado para ser copiado directamente a las tarjetas de tu tablero Kanban, permitiéndote priorizar (P1, P2, P3) y asignar la tarea (Dev UI o Dev Lógica).

| ID | Módulo | Descripción de la Tarea (Historia de Usuario) | Prioridad Sugerida | Asignado a |
| :--- | :--- | :--- | :--- | :--- |
| **AP-01** | Pedidos | Como Tutor, quiero poder seleccionar el **Beneficiario** y el **Turno/Fecha de Recogida** en el *header* de la app. | P1 | Dev UI / Lógica |
| **AP-02** | Seguridad | Como Tutor, quiero que se me muestre una **Advertencia Visual (🚨)** si un producto tiene alérgenos del Beneficiario activo. | P1 | Dev UI / Lógica |
| **AP-03** | Recogida | Como Tutor, al pagar, quiero que se genere un **PIN Único** y un **Ticket Digital** descargable con las advertencias de Alergia destacadas. | P1 | Dev Lógica / UI |
| **AP-04** | Finanzas | Como Tutor, quiero poder **Recargar Saldo** en el Monedero Virtual de mi cuenta. | P1 | Dev Lógica |
| **AP-05** | Finanzas | Como Tutor, quiero poder pagar un pedido usando el **Saldo del Monedero** o la Pasarela de Pago. | P2 | Dev Lógica |
| **AP-06** | Pedidos | Como Tutor, quiero poder establecer **Límites de Gasto Diario/Semanal** para un Beneficiario menor. | P2 | Dev Lógica / UI |
| **AP-07** | Pedidos | Como Tutor, quiero poder **Repetir un Pedido Histórico** y/o **Programarlo** para días recurrentes. | P2 | Dev UI / Lógica |
| **AD-01** | Dashboard | Como Staff, quiero tener una pantalla **KDS** que muestre comandos agrupados por Turno y las **Alergias** de cada alumno. | P1 | Dev UI / Lógica |
| **AD-02** | Dashboard | Como Staff, quiero que el sistema calcule la **Requisición de Materia Prima** para el día/turno basada en el Escandallo y los pedidos programados. | P1 | Dev Lógica |
| **AD-03** | Dashboard | Como Staff, quiero poder establecer la **Hora Límite de Cierre de Pedidos** para cada turno. | P2 | Dev Lógica / UI |
| **AD-04** | Dashboard | Como Staff, quiero poder **Cancelar un Pedido** y activar el **reembolso automático** al Tutor con una notificación por Falta de Stock. | P2 | Dev Lógica |
| **AD-05** | Dashboard | Como Staff, quiero poder **Activar/Desactivar productos** en tiempo real fuera de su turno de venta (Ej. Café fuera de la mañana). | P2 | Dev Lógica / UI |
| **AD-06** | Dashboard | Como Staff, quiero poder ver los **KPIs** de Ventas Estimadas, Recaudación y Productos más vendidos por Turno. | P3 | Dev Lógica / UI |