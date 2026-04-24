// Barra de navegacion inferior de la app para acceder a historial, carrito y favoritos.
import React from "react";
import { useCart } from "../lib/CartContext";
import './BottomNav.css';

export default function BottomNav({ activeTab = 'home', onTabChange, onShowSpinner, onShowCart, onShowHistory }) {
  const { cartItems } = useCart();
  const transitionDurationMs = 600;
  
  const cartCount = cartItems.reduce((total, item) => total + item.quantity, 0);

  const gestionarClickNavegacion = (tabId, action) => {
    // Cada pestaña puede cambiar de vista, abrir un modal o lanzar una animacion previa.
    if (action === 'cart') {
      onTabChange && onTabChange(tabId);
      onShowCart && onShowCart();
    } else if (action === 'history') {
      onShowSpinner && onShowSpinner();
      setTimeout(() => {
        onTabChange && onTabChange(tabId);
        onShowHistory && onShowHistory();
      }, transitionDurationMs);
    } else if (action === 'loading') {
      onTabChange && onTabChange(tabId);
      onShowSpinner && onShowSpinner();
    } else {
      onTabChange && onTabChange(tabId);
    }
  };

  return (
    <nav className="bottom-nav" aria-label="Navegación principal">
      <button 
        className={`nav-btn ${activeTab === 'orders' ? 'active' : ''}`} 
        onClick={() => gestionarClickNavegacion('orders', 'history')}
        aria-label="Ver historial"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 3" />
        </svg>
        <span>Historial</span>
      </button>
      
      <button 
        className="nav-btn-central" 
        onClick={() => gestionarClickNavegacion('cart', 'cart')}
        aria-label="Ver carrito"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4" />
          <line x1="3" y1="6" x2="21" y2="6" />
          <path d="M16 10a4 4 0 01-8 0" />
        </svg>
        {cartCount > 0 && (
          <span className="cart-badge">{cartCount}</span>
        )}
      </button>
      
      <button 
        className={`nav-btn ${activeTab === 'favorites' ? 'active' : ''}`} 
        onClick={() => gestionarClickNavegacion('favorites', 'loading')}
        aria-label="Favoritos"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
        </svg>
        <span>Favoritos</span>
      </button>
    </nav>
  );
}
