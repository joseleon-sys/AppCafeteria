import React, { useState } from "react";
import { useCart } from "../lib/CartContext";
import { showError, showSuccess } from "./Toast";
import { submitOrderForUser } from "../lib/orderService";
import "./CheckoutModal.css";

export default function CheckoutModal({ isOpen, onClose, user }) {
  const [isProcessing, setIsProcessing] = useState(false);
  const { cartItems, total, clearCart, updateQuantity, removeItem } = useCart();

  const subtotal = cartItems.reduce((sum, item) => sum + (item.totalPrice || item.price * item.quantity), 0);
  const finalTotal = total;

  const handleQuantityChange = (itemId, newQuantity) => {
    if (newQuantity <= 0) {
      removeItem(itemId);
    } else {
      updateQuantity(itemId, newQuantity);
    }
  };

  const handleRemoveItem = (itemId) => {
    removeItem(itemId);
  };

  const handleCheckout = async () => {
    if (cartItems.length === 0) {
      showError('Agrega al menos un producto');
      return;
    }

    if (!user) {
      showError('Necesitas iniciar sesion para confirmar el pedido');
      return;
    }

    setIsProcessing(true);

    try {
      await submitOrderForUser(user, cartItems);
      clearCart();
      onClose && onClose();
      showSuccess(user.role === 'child'
        ? 'Pedido enviado a revision familiar'
        : 'Pedido confirmado. Ya esta registrado en produccion.'
      );
    } catch (error) {
      console.error('Error al confirmar pedido:', error);
      showError(error.message || 'No se pudo confirmar el pedido');
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="checkout-modal-overlay" onClick={onClose}>
      <div className="checkout-container" onClick={e => e.stopPropagation()}>
        <div className="checkout-header">
          <h2>Confirmar Pedido</h2>
          <button className="close-btn" onClick={onClose} aria-label="Cerrar">✕</button>
        </div>

        <div className="checkout-content">
          {/* Resumen de Productos */}
          <section className="checkout-section">
            <div className="section-header">
              <h3>📦 Tus productos ({cartItems.length})</h3>
            </div>
            <div className="products-list">
              {cartItems.map(item => (
                <div key={`${item.id}-${item.selectedSize || 'default'}`} className="product-item">
                  <div className="product-info">
                    <div className="product-name">{item.name}</div>
                    {(item.customizations?.milk || item.selectedSize) && (
                      <div className="product-details">
                        {item.customizations?.milk && <span className="detail-badge">🥛 {item.customizations.milk}</span>}
                        {item.selectedSize && <span className="detail-badge">📏 {item.selectedSize}</span>}
                      </div>
                    )}
                    <div className="product-unit-price">({(item.price).toFixed(2)}€ c/u)</div>
                  </div>
                  <div className="product-controls">
                    <div className="quantity-controls">
                      <button 
                        className="qty-btn" 
                        onClick={() => handleQuantityChange(item.id, item.quantity - 1)}
                        title="Disminuir cantidad"
                      >
                        −
                      </button>
                      <span className="product-qty">{item.quantity}</span>
                      <button 
                        className="qty-btn" 
                        onClick={() => handleQuantityChange(item.id, item.quantity + 1)}
                        title="Aumentar cantidad"
                      >
                        +
                      </button>
                    </div>
                    <button
                      className="remove-btn"
                      onClick={() => handleRemoveItem(item.id)}
                      title="Eliminar producto"
                    >
                      🗑️
                    </button>
                  </div>
                  <div className="product-price">{(item.totalPrice || item.price * item.quantity).toFixed(2)}€</div>
                </div>
              ))}
            </div>
          </section>

          {/* Resumen Final */}
          <section className="checkout-summary">
            <div className="summary-row">
              <span>Subtotal:</span>
              <span className="price">{subtotal.toFixed(2)}€</span>
            </div>
            <div className="summary-row total">
              <span>Total:</span>
              <span className="price-large">{finalTotal.toFixed(2)}€</span>
            </div>
          </section>
        </div>

        <div className="checkout-footer">
          <button 
            className="checkout-btn" 
            onClick={handleCheckout}
            disabled={isProcessing || cartItems.length === 0}
          >
            {isProcessing ? "Procesando..." : "Confirmar y Pagar"}
          </button>
        </div>
      </div>
    </div>
  );
}
