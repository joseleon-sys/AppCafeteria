
import React from "react";
import './ProductCard.css';

export default function ProductCard({ 
  product, 
  onClick, 
  allergenIcons = {}, 
  isFavorite = false, 
  onToggleFavorite 
}) {
  // Badge class for color
  let badgeClass = "product-badge";
  if (product.badge) {
    const badge = product.badge.toLowerCase();
    if (badge.includes("hot")) badgeClass += " badge-hot-sale";
    else if (badge.includes("nuevo")) badgeClass += " badge-nuevo";
    else if (badge.includes("popular")) badgeClass += " badge-popular";
    else if (badge.includes("zero")) badgeClass += " badge-zero";
    else if (badge.includes("premium")) badgeClass += " badge-premium";
    else if (badge.includes("casero")) badgeClass += " badge-casero";
    else if (badge.includes("combo")) badgeClass += " badge-combo";
  }

  const handleFavoriteClick = (e) => {
    e.stopPropagation();
    onToggleFavorite && onToggleFavorite(product.id);
  };

  const handleAddClick = (e) => {
    e.stopPropagation();
    onClick && onClick(product);
  };

  return (
    <div 
      className={`product-card ${product.allergens?.length ? "has-allergen" : ""}`}
      onClick={() => onClick && onClick(product)}
      style={{ cursor: 'pointer' }}
    >
      <div className="product-image-wrapper">
        <img 
          src={product.image} 
          alt={product.name} 
          className="product-image" 
          loading="lazy" 
        />
        
        {product.badge && (
          <span className={badgeClass}>{product.badge}</span>
        )}
        
        {/* Botón de favoritos */}
        <button 
          className={`favorite-btn ${isFavorite ? 'active' : ''}`}
          onClick={handleFavoriteClick}
          aria-label={isFavorite ? 'Quitar de favoritos' : 'Añadir a favoritos'}
        >
          {isFavorite ? '❤️' : '🤍'}
        </button>

        {/* Iconos de alérgenos */}
        {product.allergens && product.allergens.length > 0 && (
          <div className="allergen-icons">
            {product.allergens.map(allergen => (
              <span 
                key={allergen}
                className="allergen-icon"
                title={`Contiene ${allergen}`}
              >
                {allergenIcons[allergen] || '⚠️'}
              </span>
            ))}
          </div>
        )}
      </div>
      
      <div className="product-info">
        <h4>{product.name}</h4>
        <div className="product-desc">{product.description}</div>
        
        {/* Features */}
        {product.features && product.features.length > 0 && (
          <div className="product-features">
            {product.features.slice(0, 2).map(feature => (
              <span key={feature} className="feature-tag">{feature}</span>
            ))}
          </div>
        )}
        
        <div className="card-bottom">
          <div className="price">
            <span className="price-new">{product.price.toFixed(2)}€</span>
            {product.oldPrice && (
              <span className="price-old">{product.oldPrice.toFixed(2)}€</span>
            )}
          </div>
          <button 
            className="add-btn" 
            title="Ver detalles" 
            onClick={handleAddClick}
          >
            +
          </button>
        </div>
      </div>
    </div>
  );
}
