import React, { useEffect, useState } from "react";
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

  useEffect(() => {
    if (!isOpen || !product) return;
    setQuantity(1);
    setCustomizations({
      sugar: 0,
      removables: [],
      addables: []
    });
  }, [isOpen, product]);

  if (!isOpen || !product) return null;

  const options = product.options || {};
  const hasSugar = options.sugar?.available;
  const hasRemovables = options.removables && options.removables.length > 0;
  const features = Array.isArray(product.features) ? product.features : [];
  const allergens = Array.isArray(product.allergens) ? product.allergens : [];

  let badgeClassName = "product-badge";
  if (product.badge) {
    const badge = product.badge.toLowerCase();
    if (badge.includes("hot")) badgeClassName += " badge-hot-sale";
    else if (badge.includes("nuevo")) badgeClassName += " badge-nuevo";
    else if (badge.includes("popular")) badgeClassName += " badge-popular";
    else if (badge.includes("zero")) badgeClassName += " badge-zero";
    else if (badge.includes("premium")) badgeClassName += " badge-premium";
    else if (badge.includes("casero")) badgeClassName += " badge-casero";
    else if (badge.includes("combo")) badgeClassName += " badge-combo";
  }

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
            <div className="product-hero-card">
              <div className="product-image-stage">
                <img src={product.image} alt={product.name} className="product-image-large" />
                {product.badge && (
                  <span className={badgeClassName}>{product.badge}</span>
                )}
              </div>

              <div className="product-info-large">
                <div className="product-title-row">
                  <h2>{product.name}</h2>
                  <div className="base-price">{product.price.toFixed(2)} €</div>
                </div>

                <p className="product-description">{product.description}</p>

                {(features.length > 0 || allergens.length > 0) && (
                  <div className="product-meta-row">
                    {features.length > 0 && (
                      <div className="product-features modal-product-features">
                        {features.slice(0, 3).map((feature) => (
                          <span key={feature} className="feature-tag modal-feature-tag">{feature}</span>
                        ))}
                      </div>
                    )}

                    {allergens.length > 0 && (
                      <div className="modal-allergens" aria-label="Alergenos">
                        {allergens.map((allergen) => (
                          <span key={allergen} className="modal-allergen-chip">
                            {allergen}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
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
