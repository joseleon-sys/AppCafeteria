// Modal con la ficha tecnica y nutricional de un producto.
import React from 'react';
import './TechnicalSheetModal.css';

export default function TechnicalSheetModal({ product, isOpen, onClose }) {
  if (!isOpen || !product) return null;

  const ingredients = Array.isArray(product.ingredients) ? product.ingredients : [];
  const nutrition = product.nutritionTable && typeof product.nutritionTable === 'object' ? product.nutritionTable : {};

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content technical-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>📋 Ficha Técnica y Nutricional</h2>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>
        
        <div className="modal-body">
          <div className="section">
            <h3>🥘 Ingredientes y Alérgenos</h3>
            <div className="info-row">
              <strong>Ingredientes:</strong>
              <span>{ingredients.length ? ingredients.join(', ') : 'No especificado'}</span>
            </div>
            <div className="info-row">
              <strong>Alérgenos:</strong>
              <span>{product.allergens?.length ? product.allergens.join(', ') : 'Sin alérgenos declarados'}</span>
            </div>
            {!!product.containsInfo && (
              <div className="info-row">
                <strong>Contiene:</strong>
                <span>{product.containsInfo}</span>
              </div>
            )}
          </div>

          <div className="section">
            <h3>⚡ Información Nutricional</h3>
            <div className="info-row">
              <strong>Energía:</strong>
              <span>{product.caloriesKcal || 0} kcal (por 100 g/ml)</span>
            </div>
            <div className="nutrition-grid">
              <div className="nutrition-item">
                <span className="nutrition-label">Proteínas</span>
                <span className="nutrition-value">{nutrition.proteins_g ?? '-'} g</span>
              </div>
              <div className="nutrition-item">
                <span className="nutrition-label">Hidratos C.</span>
                <span className="nutrition-value">{nutrition.carbs_g ?? '-'} g</span>
              </div>
              <div className="nutrition-item">
                <span className="nutrition-label">Grasas</span>
                <span className="nutrition-value">{nutrition.fats_g ?? '-'} g</span>
              </div>
              <div className="nutrition-item">
                <span className="nutrition-label">Sal</span>
                <span className="nutrition-value">{nutrition.salt_g ?? '-'} g</span>
              </div>
            </div>
          </div>

          <div className="disclaimer">
            ⓘ Esta información ha sido revisada para cumplir con los estándares sanitarios aplicables a cafeterías escolares.
          </div>
        </div>
      </div>
    </div>
  );
}
