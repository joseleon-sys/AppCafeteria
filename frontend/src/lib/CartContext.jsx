import React, { createContext, useContext } from 'react';
import { useCart as useCartHook } from './useCart';

const CartContext = createContext();

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};

export const CartProvider = ({ children }) => {
  const cartData = useCartHook();
  
  return (
    <CartContext.Provider value={cartData}>
      {children}
    </CartContext.Provider>
  );
};