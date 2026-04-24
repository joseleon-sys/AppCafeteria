// Contexto React para compartir el carrito entre componentes sin pasar props manualmente.
import React, { createContext, useContext } from 'react';
import { useCart as useCartHook } from './useCart';

const CartContext = createContext();

export const useCart = () => {
  // Hook de acceso al contexto; falla pronto si se usa fuera del proveedor.
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};

export const CartProvider = ({ children }) => {
  // Usa el hook real del carrito y expone su resultado al resto de la app.
  const cartData = useCartHook();
  
  return (
    <CartContext.Provider value={cartData}>
      {children}
    </CartContext.Provider>
  );
};
