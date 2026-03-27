# 🚀 Integración de Componentes - CafeteriaAppSSG

**Branch:** `feature/alejandro-cart-components`  
**Creada por:** Alejandro (Project Coordinator)  
**Para:** Darlyng (Backend) y José Manuel (Frontend)

---

## 📋 **Resumen del trabajo realizado**

He implementado **componentes completos del carrito de compras** con spinner personalizado y toda la funcionalidad necesaria para integrar con el backend y expandir el frontend.

---

## 🎯 **Para Darlyng (Backend Developer)**

### **API Endpoints necesarios:**

#### 1. **GET /api/products** 
```json http://localhost:5173/?preview=cart
// Estructura requerida (ya documentada en API_CONTRACT.md)
[
  {
    "id": 1,
    "name": "Café con Leche",
    "price": 1.20,
    "original_price": 1.50, // opcional para ofertas
    "category": "cafes", // debe coincidir con filtros frontend
    "image": "https://...",
    "badges": ["popular", "nuevo"],
    "allergens": ["lactosa"],
    "options": {
      "sugar": { "available": true, "max": 3, "price_per_unit": 0.00 },
      "removables": ["leche", "cacao"]
    }
  }
]
```

#### 2. **POST /api/orders**
```json
// Lo que envía el frontend:
{
  "user_id": 101,
  "items": [
    {
      "product_id": 1,
      "quantity": 2,
      "notes": "Muy caliente por favor",
      "chosen_options": {
        "sugar": 2,
        "removed": ["cacao"]
      }
    }
  ]
}

// Lo que debe responder:
{
  "order_id": 5050,
  "status": "PAID",
  "new_balance": 15.50,
  "message": "Pedido confirmado correctamente"
}
```

#### 3. **GET /api/users/{id}/balance**
```json
{
  "user_id": 101,
  "current_balance": 15.50,
  "currency": "EUR"
}
```

### **Archivos de integración listos:**
- `frontend/src/lib/useCart.js` - Hook con todas las funciones del carrito
- `frontend/src/pages/CartPage.jsx` - Página con llamadas API preparadas
- `API_CONTRACT.md` - Contrato completo actualizado

---

## 🎨 **Para José Manuel (Frontend Developer)**

### **Componentes implementados y listos para usar:**

#### **1. CartPanel** - Componente principal del carrito
```jsx
import CartPanel from '../components/CartPanel';

<CartPanel
  cartItems={cartItems}
  onUpdateQuantity={updateQuantity}
  onApplyCoupon={applyCoupon}
  subtotal={subtotal}
  discount={discount}
  deliveryFee={2.50}
  onCheckout={handleCheckout}
  isLoading={isProcessingOrder}
  loadingMessage="Preparando tu pedido..."
/>
```

#### **2. HamsterSpinner** - Spinner personalizado para la cafetería
```jsx
import HamsterSpinner from '../components/HamsterSpinner';

<HamsterSpinner 
  message="Cargando menú..." 
  size="medium" // small, medium, large
/>
```

#### **3. useCart** - Hook completo para gestión del carrito
```jsx
import useCart from '../lib/useCart';

const {
  // Estado
  cartItems, subtotal, discount, total, itemCount,
  
  // Acciones
  addItem, updateQuantity, removeItem, clearCart,
  applyCoupon, removeCoupon,
  
  // Utilidades
  isInCart, getItemQuantity
} = useCart();
```

### **Variables CSS disponibles:**
- `frontend/src/styles/variables.css` - Paleta completa de colores
- Tonos marrones: `--primary: #6b4226`, `--accent: #d4915f`
- Espaciado: `--spacing-sm`, `--spacing-md`, `--spacing-lg`
- Sombras: `--shadow-sm`, `--shadow-md`, `--shadow-lg`

### **Páginas de ejemplo implementadas:**
- `CartPage.jsx` - Página completa del carrito con navegación Ionic
- `CartPreview.jsx` - Preview interactivo para desarrollo
- `SpinnerDemo.jsx` - Demostración de todos los spinners

---

## 🔧 **Cómo arrancar y probar**

### **1. Checkout a mi branch:**
```bash
git fetch origin
git checkout feature/alejandro-cart-components
cd frontend
npm install  # si es necesario
npm run dev
```

### **2. URLs de prueba:**
- **App principal:** http://localhost:5173/
- **Preview carrito:** http://localhost:5173/?preview=cart
- **Demo spinner:** http://localhost:5173/?preview=spinner

### **3. Funcionalidades para probar:**
- ✅ Añadir/quitar productos del carrito
- ✅ Aplicar cupones: `DESCUENTO10`, `WELCOME5`, `STUDENT`
- ✅ Proceso de checkout con spinner
- ✅ Responsive design en móviles
- ✅ Persistencia en localStorage

---

## 📱 **Integración con Ionic React**

Los componentes están **100% compatibles** con Ionic React:
- Usan `IonIcon`, `IonButton`, `IonContent`, etc.
- Navegación con `useHistory`
- Notificaciones con `IonToast`
- Colores y temas de Ionic

---

## 🔄 **Próximos pasos sugeridos**

### **Para Darlyng:**
1. [ ] Implementar endpoints según API_CONTRACT.md
2. [ ] Probar integración con `fetch('/api/orders')` 
3. [ ] Validar estructura de productos y cupones

### **Para José Manuel:**
1. [ ] Integrar CartPanel en las páginas principales
2. [ ] Añadir botón "Carrito" en la navegación
3. [ ] Usar HamsterSpinner en otras operaciones de carga
4. [ ] Adaptar colores si es necesario

### **Para todos:**
1. [ ] Revisar esta branch y hacer comentarios
2. [ ] Crear PRs hacia develop cuando esté listo
3. [ ] Testing en diferentes dispositivos

---

## 📁 **Estructura de archivos creados**

```
frontend/src/
├── components/
│   ├── CartPanel.jsx          # Componente principal del carrito
│   ├── CartPanel.css          # Estilos del carrito
│   ├── HamsterSpinner.jsx     # Spinner animado del hámster
│   ├── HamsterSpinner.css     # Estilos del spinner
│   ├── LoadingOverlay.jsx     # Overlay de carga
│   └── README.md              # Documentación detallada
├── lib/
│   └── useCart.js             # Hook de gestión del carrito
├── pages/
│   ├── CartPage.jsx           # Página del carrito
│   ├── CartPage.css           # Estilos de la página
│   ├── CartPreview.jsx        # Preview interactivo
│   ├── CartPreview.css        # Estilos del preview
│   └── SpinnerDemo.jsx        # Demo del spinner
├── styles/
│   └── variables.css          # Variables CSS del proyecto
└── API_CONTRACT.md            # Contrato de API actualizado
```

---

## 💬 **Contacto**

**Alejandro** - Project Coordinator  
- Branch: `feature/alejandro-cart-components`
- Cualquier duda, ping me! 🚀

¡Todo listo para que empecemos a integrar! 🎉