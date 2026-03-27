# Notas Front

## ✅ IMPLEMENTADO EN MOCKUP (19/11/2025)

### Diseño General
- ✅ **Diseño profesional** inspirado en Glovo con tema marrón (#6b4226)
- ✅ **Header sticky** con logo, menú hamburguesa y botón de logout
- ✅ **Bottom navigation sticky** con 5 botones: Promos | Historial | Carrito (central) | Favoritos | Perfil
- ✅ **Barra de búsqueda** funcional en el header
- ✅ **Sistema de categorías** con scroll horizontal (Cafés, Bocadillos, Dulces, Bebidas, Otros)

### Autenticación
- ✅ **Login/Signup** con LocalStorage
- ✅ Usuario demo: `demo` / `demo` con alergias a lácteos configuradas
- ✅ **Logout** y eliminación de cuenta
- ✅ Persistencia de sesión

### Catálogo de Productos
- ✅ **9 productos** con imágenes reales de Unsplash:
  - 3 Cafés (Solo, Con leche, Cappuccino)
  - 2 Bocadillos (Jamón, Vegetal)
  - 2 Dulces (Croissant, Palmera)
  - 2 Bebidas (Zumo, Batido)
  - 1 Agua
- ✅ **Tarjetas de producto** estilo Glovo: imagen 140px, 2 columnas, fondo gris, botón circular +
- ✅ **Badges** en productos: POPULAR (marrón), HOT SALE (rojo), NUEVO (verde)
- ✅ **Sistema de alérgenos**: Badge rojo "🚨 Alérgeno" en productos con lácteos/gluten
- ✅ **Advertencia visual** en tarjetas con borde amarillo + mensaje "Contiene alérgeno"
- ✅ Precios con descuento (precio antiguo tachado)

### Drawer de Producto
- ✅ **Modal full-screen** estilo Glovo
- ✅ **Hero image** de 300px con fondo del producto
- ✅ Descripción y precio del producto
- ✅ **Sección de extras**: "Opciones de Personalización" (1 extra) o "Complementos & Extras" (múltiples)
- ✅ **Controles de cantidad** para extras (azúcar)
- ✅ **Ingredientes removibles** con checkboxes custom
- ✅ **Footer button** con icono carrito, cantidad y precio dinámico
- ✅ Botón X para cerrar (top-right)

### Carrito de Compras
- ✅ **Modal de carrito** con overlay
- ✅ Lista de productos añadidos con cantidades y personalizaciones
- ✅ **Badge contador** en botón de carrito (muestra total de items)
- ✅ **Cálculo de total** dinámico
- ✅ Botones: Vaciar carrito, Pagar
- ✅ Función eliminar productos individuales

### Sistema de Pedidos
- ✅ **Pantalla de confirmación** post-pago:
  - Hero image de cafetería
  - Card de estado: "Entregado" con emoji ✌️
  - Fecha y hora del pedido
  - ID único de pedido (ORD + timestamp)
  - Lista de productos con cantidades y extras
  - Detalles de entrega (recogida en mostrador)
  - Resumen: subtotal, servicios, total
  - Método de pago mostrado
- ✅ **Pantalla de historial**:
  - Lista de pedidos anteriores
  - Tarjetas clicables para ver detalles
  - Fecha, número de productos, total
  - Estado del pedido
- ✅ **Persistencia** en LocalStorage
- ✅ Navegación: Carrito → Pagar → Confirmación → Volver

### UI/UX
- ✅ **Toast notifications** para acciones (producto añadido, pedido confirmado, etc.)
- ✅ **Overlay** para modales
- ✅ **Animaciones** suaves en botones y transiciones
- ✅ **Responsive** con grid 2 columnas
- ✅ **Accesibilidad**: aria-labels, roles, estados
- ✅ **Loading states** y feedback visual

---

## ❌ PENDIENTE DE IMPLEMENTAR

### Funcionalidades Críticas
- ❌ **Integración con Backend/API** (actualmente todo es LocalStorage)
- ❌ **Pedidos recurrentes**: Repetir pedidos anteriores con 1 clic
- ❌ **Pedidos programados**: Comprar bocadillo para varios días y pagar todo de una vez
- ❌ **Sistema de favoritos**: Guardar productos favoritos
- ❌ **Búsqueda funcional**: Filtrar productos por texto

### Mejoras de Negocio
- ❌ **Promociones activas**: Pantalla de ofertas especiales
- ❌ **Gestión de beneficiarios**: Padre puede gestionar pedidos de hijos
- ❌ **Límites de gasto**: Control parental de presupuesto
- ❌ **Notificaciones push**: Avisos de pedido listo

### Perfil y Configuración
- ❌ **Pantalla de perfil**: Datos personales, preferencias
- ❌ **Gestión de alergias**: Editar alergias desde perfil (actualmente hardcoded en usuario demo)
- ❌ **Métodos de pago**: Añadir/editar tarjetas
- ❌ **Direcciones**: Gestión de puntos de recogida

### Mejoras Técnicas
- ❌ **Optimización de imágenes**: Servir imágenes locales optimizadas
- ❌ **Service Worker**: Para funcionamiento offline
- ❌ **Testing**: Unit tests y E2E tests
- ❌ **i18n**: Soporte multiidioma

---

## 🎯 PRÓXIMOS PASOS

El flujo de la app es: 

- Usuario se loguea (comprueba con una petición que tiene que hacer el back para ver que el usuario exista, tenga una contraseña y coincida.)

- Si no existe no entra y pide que te registres.

- Si entras ves lo que hay en el mockup. Una barra inferior muy popular en diseño movil. Con el botón Promociones (badge Hot)/ historial / "Carrito" (da por hecho que es el pedid) / ? / ajustes. 
- Ves un botón hamburgesa arriba a la izquierda que tendrá el resto de las opcioens. El nomrbe de la app en el centro, a la derecha el botón de salir. 

- Tanto el header como la barra inferior, son Sticky, es decir, no se mueven nunca de su posición y acompañan siempre. Esto para dar sensación de app solida y porque el deslizamiento horizontal y vertical son un problema enorme de diseño. Solo se tolera el deslizamiento horizontal para cambiar de categoria pero es un gesto que cambia y no tanto que parezca que hay scroll. Y el vertical pues en menús op ara ver productos que están más para a abajo. 

- Tiene que existir la forma de repetir un pedido de forma recurrente (Ej: Manolito quiere todos los días un café y un cigarro pues su papi rico puede recuperar el pedido anterior y repetirlo(hace falta back, se tienen que almacenar los pedidos))

- Tiene que haber una forma de hacer a varios dias vista "Comprar un bocadillo cada día y dejarlo todo pagado desde el primero" simplifica el uso de la app. 