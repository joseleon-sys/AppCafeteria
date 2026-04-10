import React, { useState } from 'react';
import { IonIcon } from '@ionic/react';
import { remove, add, removeOutline } from 'ionicons/icons';
import HamsterSpinner from './HamsterSpinner';
import './CartPanel.css';

const CartPanel = ({ 
  cartItems = [], 
  onUpdateQuantity, 
  onApplyCoupon,
  subtotal = 0,
  discount = 0,
  deliveryFee = 2.50,
  onCheckout,
  isLoading = false,
  loadingMessage = "Procesando tu pedido..."
}) => {
  const [couponCode, setCouponCode] = useState('');
  
  const total = Math.max(0, subtotal - discount + deliveryFee);

  const handleQuantityChange = (itemId, newQuantity) => {
    if (newQuantity <= 0) {
      // Eliminar item del carrito
      onUpdateQuantity(itemId, 0);
    } else {
      onUpdateQuantity(itemId, newQuantity);
    }
  };

  const handleApplyCoupon = (e) => {
    e.preventDefault();
    if (couponCode.trim()) {
      onApplyCoupon(couponCode.trim());
      setCouponCode('');
    }
  };

  const formatPrice = (price) => {
    return `${price.toFixed(2)}€`;
  };

  return (
    <div className="cart-panel">
      {/* Loading overlay */}
      {isLoading && (
        <div className="cart-loading-overlay">
          <HamsterSpinner message={loadingMessage} size="medium" />
        </div>
      )}
      
      {/* Carrito de productos */}
      <div className="cart-section">
        <div className="section-header">
          <h3 className="section-title">Tu pedido</h3>
          <span className="item-count">{cartItems.length} {cartItems.length === 1 ? 'producto' : 'productos'}</span>
        </div>
        
        <div className="cart-items">
          {cartItems.length === 0 ? (
            <div className="empty-cart">
              <div className="empty-cart-icon">☕</div>
              <p>Tu carrito está vacío</p>
              <span>Añade algunos productos deliciosos</span>
            </div>
          ) : (
            cartItems.map((item) => (
              <div key={item.id} className="cart-item">
                <div className="item-image">
                  <img 
                    src={item.image || '/placeholder-coffee.jpg'} 
                    alt={item.name}
                    onError={(e) => {
                      e.target.src = '/placeholder-coffee.jpg';
                    }}
                  />
                </div>
                
                <div className="item-details">
                  <h4 className="item-name">{item.name}</h4>
                  {item.notes && <p className="item-notes">{item.notes}</p>}
                  {item.chosen_options?.removed && item.chosen_options.removed.length > 0 && (
                    <p className="item-customization">
                      Sin: {item.chosen_options.removed.join(', ')}
                    </p>
                  )}
                  {item.chosen_options?.sugar > 0 && (
                    <p className="item-customization">
                      Azúcar: {item.chosen_options.sugar}
                    </p>
                  )}
                </div>
                
                <div className="item-controls">
                  <div className="quantity-controls">
                    <button 
                      className="quantity-btn decrease"
                      onClick={() => handleQuantityChange(item.id, item.quantity - 1)}
                      disabled={item.quantity <= 1}
                    >
                      <IonIcon icon={remove} />
                    </button>
                    <span className="quantity">{item.quantity}</span>
                    <button 
                      className="quantity-btn increase"
                      onClick={() => handleQuantityChange(item.id, item.quantity + 1)}
                    >
                      <IonIcon icon={add} />
                    </button>
                  </div>
                  <button 
                    className="remove-item-btn"
                    onClick={() => handleQuantityChange(item.id, 0)}
                    title="Eliminar producto"
                  >
                    <IonIcon icon={removeOutline} />
                  </button>
                </div>
                
                <div className="item-price">
                  {formatPrice(item.price * item.quantity)}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Sección de cupones */}
      {cartItems.length > 0 && (
        <div className="coupon-section">
          <div className="section-header">
            <h3 className="section-title">Cupones de descuento</h3>
          </div>
          <form className="coupon-form" onSubmit={handleApplyCoupon}>
            <input 
              type="text" 
              placeholder="Introduce tu código de descuento" 
              className="coupon-input"
              value={couponCode}
              onChange={(e) => setCouponCode(e.target.value)}
            />
            <button type="submit" className="coupon-btn">
              Aplicar
            </button>
          </form>
        </div>
      )}

      {/* Resumen y checkout */}
      {cartItems.length > 0 && (
        <div className="checkout-section">
          <div className="section-header">
            <h3 className="section-title">Resumen del pedido</h3>
          </div>
          
          <div className="order-summary">
            <div className="summary-row">
              <span className="summary-label">Subtotal:</span>
              <span className="summary-value">{formatPrice(subtotal)}</span>
            </div>
            
            {discount > 0 && (
              <div className="summary-row discount">
                <span className="summary-label">Descuento aplicado:</span>
                <span className="summary-value">-{formatPrice(discount)}</span>
              </div>
            )}
            
            {deliveryFee > 0 && (
              <div className="summary-row">
                <span className="summary-label">Gastos de envío:</span>
                <span className="summary-value">{formatPrice(deliveryFee)}</span>
              </div>
            )}
            
            <div className="summary-divider"></div>
            
            <div className="summary-row total">
              <span className="summary-label">Total:</span>
              <span className="summary-value total-price">{formatPrice(total)}</span>
            </div>
          </div>
          
          <button 
            className="checkout-btn" 
            onClick={onCheckout}
            disabled={isLoading}
          >
            {isLoading ? 'Procesando...' : 'Finalizar pedido'}
            <span className="checkout-price">{formatPrice(total)}</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default CartPanel;
