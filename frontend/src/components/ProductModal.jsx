import React, { useState } from "react";
import "./ProductModal.css";
import TechnicalSheetModal from "./TechnicalSheetModal";

export default function ProductModal({ product, isOpen, onClose, onAddToCart }) {
  const [quantity, setQuantity] = useState(1);
  const [showTechnicalSheet, setShowTechnicalSheet] = useState(false);
  const [customizations, setCustomizations] = useState({
    sugar: 0,
    removables: [],
    addables: []
  });

  if (!isOpen || !product) return null;

  const options = product.options || {};
  const isCafe = product.category === 'cafes';
  const isSandwich = product.category === 'sandwich';
  const hasSugar = options.sugar?.available;
  const hasRemovables = options.removables && options.removables.length > 0;
  const hasAddables = options.addables && options.addables.length > 0;
  const ingredients = Array.isArray(product.ingredients) ? product.ingredients : [];
  const nutrition = product.nutritionTable && typeof product.nutritionTable === 'object' ? product.nutritionTable : {};
  const shelfLifeHours = Number.isFinite(product.shelfLifeHours) ? product.shelfLifeHours : 24;

  const calculateTotalPrice = () => {
    let basePrice = product.price;
    // Añadir precios de extras si los hay
    return basePrice * quantity;
  };

  const handleToggleRemovable = (item) => {
    setCustomizations(prev => ({
      ...prev,
      removables: prev.removables.includes(item)
        ? prev.removables.filter(i => i !== item)
        : [...prev.removables, item]
    }));
  };

  const handleAddToCart = () => {
    const productToAdd = {
      ...product,
      quantity,
      customizations,
      totalPrice: calculateTotalPrice()
    };
    onAddToCart && onAddToCart(productToAdd);
    onClose && onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="product-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Personalizar producto</h3>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button 
              className="info-btn" 
              onClick={() => setShowTechnicalSheet(true)} 
              title="Ver ficha técnica"
              aria-label="Información técnica"
            >
              ℹ️
            </button>
            <button className="close-btn" onClick={onClose} aria-label="Cerrar">
              ✕
            </button>
          </div>
        </div>

        <div className="modal-content">
          <div className="product-hero">
            <img src={product.image} alt={product.name} className="product-image-large" />
            <div className="product-info-large">
              <h2>{product.name}</h2>
              <p className="product-description">{product.description}</p>
              <div className="base-price">{product.price.toFixed(2)} €</div>
            </div>
          </div>

          {/* Azúcar solo para cafés */}
          {hasSugar && (
            <div className="customization-section">
              <h4>Azúcar</h4>
              <div className="option-group">
                {[0, 1, 2, 3].slice(0, (options.sugar?.max || 3) + 1).map(num => (
                  <label key={num} className="option-item">
                    <input
                      type="radio"
                      name="sugar"
                      value={num}
                      checked={customizations.sugar === num}
                      onChange={(e) => setCustomizations(prev => ({ ...prev, sugar: parseInt(e.target.value) }))}
                    />
                    <span className="option-label">
                      {num === 0 ? 'Sin azúcar' : `${num} ${num === 1 ? 'sobre' : 'sobres'}`}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Quitar ingredientes (bocadillos/sandwiches) */}
          {hasRemovables && (
            <div className="customization-section">
              <h4>Quitar ingredientes</h4>
              <div className="option-group">
                {options.removables.map(item => (
                  <label key={item} className="option-item">
                    <input
                      type="checkbox"
                      checked={customizations.removables.includes(item)}
                      onChange={() => handleToggleRemovable(item)}
                    />
                    <span className="option-label">Sin {item}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="quantity-section">
            <h4>Cantidad</h4>
            <div className="quantity-controls">
              <button 
                className="quantity-btn" 
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                disabled={quantity <= 1}
              >
                -
              </button>
              <span className="quantity-display">{quantity}</span>
              <button 
                className="quantity-btn" 
                onClick={() => setQuantity(quantity + 1)}
              >
                +
              </button>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="add-to-cart-btn" onClick={handleAddToCart}>
            Añadir al carrito • {calculateTotalPrice().toFixed(2)} €
          </button>
        </div>

        <TechnicalSheetModal 
          product={product} 
          isOpen={showTechnicalSheet} 
          onClose={() => setShowTechnicalSheet(false)} 
        />
      </div>
    </div>
  );
}