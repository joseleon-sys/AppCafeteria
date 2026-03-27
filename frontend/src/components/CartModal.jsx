import React, { useState } from "react";
import { useCart } from "../lib/CartContext";
import HamsterSpinner from "./HamsterSpinner";
import CheckoutModal from "./CheckoutModal";
import { showSuccess } from "./Toast";
import "./CartModal.css";

export default function CartModal({ isOpen, onClose, onShowSpinner, user }) {
  const { cartItems, total, updateQuantity, clearCart } = useCart();
  const [isProcessing, setIsProcessing] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);

  if (!isOpen) return null;

  const handleUpdateQuantity = (itemId, newQuantity) => {
    if (newQuantity <= 0) {
      updateQuantity(itemId, 0); // Remove item
    } else {
      updateQuantity(itemId, newQuantity);
    }
  };

  const handleCheckout = async () => {
    setIsProcessing(true);
    onShowSpinner && onShowSpinner();
    
    // Simular procesamiento del pedido
    setTimeout(() => {
      setIsProcessing(false);
      clearCart();
      onClose && onClose();
      showSuccess('¡Pedido realizado con éxito!');
    }, 2000);
  };

  const isEmpty = cartItems.length === 0;

  return (
    <div className="cart-modal-overlay" onClick={onClose}>
      <div className="cart-modal" onClick={e => e.stopPropagation()}>
        <div className="cart-modal-header">
          <h3>🛒 Tu carrito</h3>
          <button className="close-btn" onClick={onClose} aria-label="Cerrar carrito">
            ✕
          </button>
        </div>

        <div className="cart-modal-content">
          {isEmpty ? (
            <div className="empty-cart">
              <div className="empty-cart-icon">🛒</div>
              <h4>Carrito vacío</h4>
              <p>Añade algunos productos para comenzar tu pedido</p>
            </div>
          ) : (
            <>
              <div className="cart-items">
                {cartItems.map(item => (
                  <div key={`${item.id}-${item.selectedSize || 'default'}`} className="cart-item">
                    <img src={item.image} alt={item.name} className="cart-item-image" />
                    <div className="cart-item-info">
                      <h4>{item.name}</h4>
                      {item.selectedSize && (
                        <span className="cart-item-size">Tamaño: {item.selectedSize}</span>
                      )}
                      {item.customizations && (
                        <div className="cart-item-customizations">
                          {item.customizations.milk && item.customizations.milk !== 'normal' && (
                            <span>• {item.customizations.milk}</span>
                          )}
                          {item.customizations.temperature && (
                            <span>• {item.customizations.temperature === 'hot' ? 'Caliente' : 'Frío'}</span>
                          )}
                        </div>
                      )}
                      <div className="cart-item-price">
                        {(item.totalPrice || item.price * item.quantity).toFixed(2)} €
                      </div>
                    </div>
                    <div className="cart-item-actions">
                      <div className="quantity-controls">
                        <button 
                          className="quantity-btn"
                          onClick={() => handleUpdateQuantity(item.id, item.quantity - 1)}
                        >
                          -
                        </button>
                        <span className="quantity">{item.quantity}</span>
                        <button 
                          className="quantity-btn"
                          onClick={() => handleUpdateQuantity(item.id, item.quantity + 1)}
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="cart-summary">
                <div className="cart-total">
                  <div className="total-row">
                    <span>Total:</span>
                    <strong>{total.toFixed(2)} €</strong>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {!isEmpty && (
          <div className="cart-modal-footer">
            <div className="cart-actions">
              <button 
                className="clear-btn" 
                onClick={clearCart}
                disabled={isProcessing}
              >
                Vaciar carrito
              </button>
              <button 
                className="checkout-btn" 
                onClick={() => setShowCheckout(true)}
                disabled={isProcessing}
              >
                Ir al checkout • {total.toFixed(2)} €
              </button>
            </div>
          </div>
        )}
      </div>
      
      <CheckoutModal 
        isOpen={showCheckout} 
        onClose={() => setShowCheckout(false)}
        user={user}
      />
    </div>
  );
}