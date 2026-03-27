# CartPanel Component

Componente React del carrito de compras para la aplicación de cafetería, adaptado al diseño y funcionalidades específicas del proyecto.

## Características

### 🎨 Diseño Personalizado
- Paleta de colores adaptada al tema de cafetería (tonos marrones cálidos)
- Interfaz responsive que se adapta a móviles
- Iconografía con Ionicons integrados
- Sombras y efectos visuales profesionales

### 🛒 Funcionalidades del Carrito
- **Gestión de productos**: Añadir, eliminar, modificar cantidades
- **Opciones personalizadas**: Mostrar personalizaciones del producto (sin ingredientes, azúcar, etc.)
- **Cálculo automático**: Subtotal, descuentos, gastos de envío y total
- **Persistencia**: Guardado automático en localStorage
- **Estado vacío**: Mensaje y CTA cuando no hay productos

### 🎫 Sistema de Cupones
- Aplicación de códigos de descuento
- Soporte para descuentos porcentuales y fijos
- Validación de cupones
- Indicador visual de cupón aplicado

### 💳 Proceso de Checkout
- Resumen detallado del pedido
- Botón de finalizar con precio destacado
- Integración con API según contrato definido
- Notificaciones de éxito/error

## Estructura de Archivos

```
frontend/src/
├── components/
│   ├── CartPanel.jsx          # Componente principal
│   └── CartPanel.css          # Estilos del componente
├── pages/
│   ├── CartPage.jsx           # Página del carrito
│   └── CartPage.css           # Estilos de la página
└── lib/
    └── useCart.js             # Hook personalizado para gestión del carrito
```

## Uso Básico

### 1. Importar y usar el componente

```jsx
import CartPanel from '../components/CartPanel';
import useCart from '../lib/useCart';

const MyPage = () => {
  const {
    cartItems,
    subtotal,
    discount,
    deliveryFee,
    updateQuantity,
    applyCoupon
  } = useCart();

  return (
    <CartPanel
      cartItems={cartItems}
      onUpdateQuantity={updateQuantity}
      onApplyCoupon={applyCoupon}
      subtotal={subtotal}
      discount={discount}
      deliveryFee={deliveryFee}
      onCheckout={handleCheckout}
    />
  );
};
```

### 2. Usar el hook useCart

```jsx
const {
  // Estado
  cartItems,        // Array de productos en el carrito
  subtotal,         // Precio sin descuentos ni envío
  discount,         // Descuento aplicado
  deliveryFee,      // Gastos de envío
  total,            // Precio final
  itemCount,        // Total de items
  appliedCoupon,    // Información del cupón aplicado
  
  // Funciones
  addItem,          // Añadir producto
  updateQuantity,   // Cambiar cantidad
  removeItem,       // Eliminar producto
  clearCart,        // Vaciar carrito
  applyCoupon,      // Aplicar cupón
  removeCoupon,     // Quitar cupón
  
  // Utilidades
  isInCart,         // Verificar si producto está en carrito
  getItemQuantity   // Obtener cantidad específica
} = useCart();
```

## Props del CartPanel

| Prop | Tipo | Descripción |
|------|------|-------------|
| `cartItems` | `Array` | Lista de productos en el carrito |
| `onUpdateQuantity` | `Function` | Callback para cambios de cantidad `(itemId, newQuantity)` |
| `onApplyCoupon` | `Function` | Callback para aplicar cupones `(couponCode)` |
| `subtotal` | `Number` | Subtotal sin descuentos |
| `discount` | `Number` | Descuento aplicado |
| `deliveryFee` | `Number` | Gastos de envío |
| `onCheckout` | `Function` | Callback para procesar el pedido |

## Estructura de datos

### Formato de item en el carrito

```javascript
{
  id: 1,
  name: "Café con Leche",
  price: 1.20,
  quantity: 2,
  image: "https://images.unsplash.com/...",
  notes: "Muy caliente por favor",
  chosen_options: {
    sugar: 2,
    removed: ["cacao", "canela"]
  }
}
```

### Formato de cupón aplicado

```javascript
{
  code: "DESCUENTO10",
  name: "10% de descuento",
  amount: 2.40
}
```

## Integración con API

El componente está diseñado para funcionar con el contrato API definido en `API_CONTRACT.md`:

### Crear pedido (POST /api/orders)

```javascript
const orderData = {
  user_id: 101,
  items: cartItems.map(item => ({
    product_id: item.id,
    quantity: item.quantity,
    notes: item.notes,
    chosen_options: item.chosen_options
  }))
};
```

## Cupones Válidos (Ejemplo)

```javascript
const validCoupons = {
  'DESCUENTO10': { type: 'percentage', value: 0.10 },
  'WELCOME5': { type: 'fixed', value: 5.00 },
  'STUDENT': { type: 'percentage', value: 0.15 },
  'FIRSTORDER': { type: 'percentage', value: 0.20 }
};
```

## Personalización

### Variables CSS Disponibles

El componente utiliza las variables CSS definidas en el mockup:

```css
:root {
  --primary: #6b4226;
  --accent: #d4915f;
  --bg-main: #ffffff;
  --text-primary: #1a1a2e;
  --shadow-md: 0 4px 8px rgba(0, 0, 0, 0.08);
  --radius-md: 10px;
  --spacing-md: 16px;
  /* ... más variables */
}
```

### Responsive Breakpoints

- **Desktop**: > 768px - Layout completo
- **Tablet**: 481px - 768px - Ajustes menores
- **Mobile**: ≤ 480px - Layout adaptado para móvil

## Ejemplos de Uso

### Añadir producto al carrito desde lista de productos

```jsx
const handleAddToCart = (product, customizations) => {
  addItem(product, 1, {
    sugar: customizations.sugar,
    removed: customizations.removedIngredients,
    notes: customizations.specialRequests
  });
};
```

### Verificar si un producto está en el carrito

```jsx
const productInCart = isInCart(productId, customOptions);
const quantity = getItemQuantity(productId, customOptions);
```

### Aplicar cupón con validación

```jsx
const handleCouponSubmit = (code) => {
  const result = applyCoupon(code);
  
  if (result.success) {
    showNotification(`Cupón aplicado: ${result.coupon.name}`);
  } else {
    showNotification(result.message, 'error');
  }
};
```

## Notas de Desarrollo

1. **Persistencia**: El hook `useCart` automáticamente guarda el estado en localStorage
2. **Performance**: Use React.memo si el componente se re-renderiza frecuentemente
3. **Accessibility**: El componente incluye roles y labels apropiados
4. **Ionic**: Compatible con rutas y navegación de Ionic React
5. **API**: Preparado para la integración con el backend según el contrato definido

## Próximas Mejoras

- [ ] Animaciones de transición entre estados
- [ ] Modo offline con sincronización
- [ ] Personalización de temas avanzada
- [ ] Integración con sistema de notificaciones push
- [ ] Análiticas de carrito abandonado