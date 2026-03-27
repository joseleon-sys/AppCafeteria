import React, { useState } from 'react';
import CartPanel from '../components/CartPanel';












































































































































// ...existing code...
import './CartPreview.css';

// Datos de prueba para previsualizar el componente
const SAMPLE_CART_ITEMS = [
  {
    id: 1,
    name: "Café con Leche",
    price: 1.80,
    quantity: 2,
    image: "https://images.unsplash.com/photo-1541167760496-1628856ab772?w=300&h=200&fit=crop&crop=center",
    notes: "Muy caliente por favor",
    chosen_options: {
      sugar: 2,
      removed: ["cacao"]
    }
  },
  {
    id: 2,
    name: "Bocadillo de Jamón",
    price: 3.50,
    quantity: 1,
    image: "https://images.unsplash.com/photo-1553909489-cd47e332431e?w=300&h=200&fit=crop&crop=center",
    chosen_options: {
      removed: ["tomate", "cebolla"]
    }
  },
  {
    id: 3,
    name: "Croissant de Chocolate",
    price: 2.20,
    quantity: 1,
    image: "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=300&h=200&fit=crop&crop=center",
    notes: "Sin azúcar glas",
    chosen_options: {
      removed: ["almendras"]
    }
  }
];

const CartPreview = () => {
  const [cartItems, setCartItems] = useState(SAMPLE_CART_ITEMS);
  const [discount, setDiscount] = useState(0);
  const [messages, setMessages] = useState([]);
  const [isProcessingOrder, setIsProcessingOrder] = useState(false);

  // Calcular subtotal
  const subtotal = cartItems.reduce((total, item) => total + (item.price * item.quantity), 0);

  const addMessage = (message, type = 'info') => {
    const newMessage = { id: Date.now(), text: message, type };
    setMessages(prev => [...prev, newMessage]);
    
    // Remover mensaje después de 3 segundos
    setTimeout(() => {
      setMessages(prev => prev.filter(msg => msg.id !== newMessage.id));
    }, 3000);
  };

  // Manejar cambios de cantidad
  const handleUpdateQuantity = (itemId, newQuantity) => {
    if (newQuantity === 0) {
      const item = cartItems.find(item => item.id === itemId);
      setCartItems(prev => prev.filter(item => item.id !== itemId));
      addMessage(`${item.name} eliminado del carrito`, 'warning');
    } else {
      setCartItems(prev => 
        prev.map(item => 
          item.id === itemId 
            ? { ...item, quantity: newQuantity }
            : item
        )
      );
      addMessage('Cantidad actualizada', 'success');
    }
  };

  // Aplicar cupón de descuento
  const handleApplyCoupon = (couponCode) => {
    const validCoupons = {
      'DESCUENTO10': { type: 'percentage', value: 0.10, name: '10% de descuento' },
      'WELCOME5': { type: 'fixed', value: 5.00, name: '5€ de descuento' },
      'STUDENT': { type: 'percentage', value: 0.15, name: 'Descuento estudiante 15%' },
      'PREVIEW': { type: 'fixed', value: 2.50, name: 'Descuento de demostración' }
    };

    const coupon = validCoupons[couponCode.toUpperCase()];
    
    if (coupon) {
      let discountAmount = 0;
      
      if (coupon.type === 'percentage') {
        discountAmount = subtotal * coupon.value;
      } else {
        discountAmount = Math.min(coupon.value, subtotal);
      }
      
      setDiscount(discountAmount);
      addMessage(`Cupón aplicado: ${coupon.name}`, 'success');
    } else {
      addMessage('Cupón no válido', 'error');
    }
  };

  // Procesar checkout
  const handleCheckout = async () => {
    setIsProcessingOrder(true);
    addMessage('Iniciando procesamiento del pedido...', 'info');
    
    // Simular tiempo de procesamiento
    await new Promise(resolve => setTimeout(resolve, 4000));
    
    addMessage('¡Demo de checkout ejecutada! En la app real se procesaría el pedido.', 'success');
    console.log('Cart items:', cartItems);
    console.log('Total:', (subtotal - discount + 2.50).toFixed(2) + '€');
    
    setIsProcessingOrder(false);
  };

  // Función para resetear el carrito
  const resetCart = () => {
    setCartItems(SAMPLE_CART_ITEMS);
    setDiscount(0);
    addMessage('Carrito restablecido', 'info');
  };

  // Función para vaciar el carrito
  const clearCart = () => {
    setCartItems([]);
    setDiscount(0);
    addMessage('Carrito vaciado', 'warning');
  };

  return (
    <div className="cart-preview">
      <header className="preview-header">
        <h1>🛒 Preview del CartPanel</h1>
        <p>Demostración interactiva del componente de carrito</p>
      </header>

      <div className="preview-controls">
        <button className="control-btn reset" onClick={resetCart}>
          🔄 Restablecer carrito
        </button>
        <button className="control-btn clear" onClick={clearCart}>
          🗑️ Vaciar carrito
        </button>
      </div>

      <div className="preview-content">
        <div className="cart-demo">
          <CartPanel
            cartItems={cartItems}
            onUpdateQuantity={handleUpdateQuantity}
            onApplyCoupon={handleApplyCoupon}
            subtotal={subtotal}
            discount={discount}
            deliveryFee={2.50}
            onCheckout={handleCheckout}
            isLoading={isProcessingOrder}
            loadingMessage="🐹 El hámster está preparando tu pedido..."
          />
        </div>

        <div className="preview-info">
          <div className="info-section">
            <h3>💡 Cupones de prueba:</h3>
            <ul>
              <li><code>DESCUENTO10</code> - 10% de descuento</li>
              <li><code>WELCOME5</code> - 5€ de descuento</li>
              <li><code>STUDENT</code> - 15% descuento estudiante</li>
              <li><code>PREVIEW</code> - 2.50€ de descuento</li>
            </ul>
          </div>

          <div className="info-section">
            <h3>🎮 Funciones interactivas:</h3>
            <ul>
              <li>Aumentar/disminuir cantidades</li>
              <li>Eliminar productos (botón 🗑️)</li>
              <li>Aplicar cupones de descuento</li>
              <li>Simular proceso de checkout con spinner animado 🐹</li>
              <li>Ver estado vacío del carrito</li>
            </ul>
          </div>

          <div className="info-section">
            <h3>📱 Diseño responsive:</h3>
            <p>Redimensiona la ventana para ver como se adapta a móviles</p>
          </div>
        </div>
      </div>

      {/* Mensajes de notificación */}
      <div className="messages-container">
        {messages.map(message => (
          <div key={message.id} className={`message ${message.type}`}>
            {message.text}
          </div>
        ))}
      </div>
    </div>
  );
};

export default CartPreview;