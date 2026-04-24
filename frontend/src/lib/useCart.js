// Hook principal del carrito: estado, persistencia, cupones y totales.
import { useState, useEffect, useCallback } from 'react';

/**
 * Hook personalizado para manejar el estado del carrito
 * Incluye persistencia en localStorage y funciones auxiliares
 */
function normalizeStoredCartItem(item) {
  // Limpia y valida los items recuperados desde localStorage.
  if (!item || typeof item !== 'object') return null;

  const id = String(item.id ?? '').trim();
  const name = String(item.name ?? '').trim();
  const price = Number.parseFloat(item.price);
  const quantity = Number.parseInt(item.quantity, 10);

  if (!id || !name || !Number.isFinite(price) || !Number.isFinite(quantity) || quantity <= 0) {
    return null;
  }

  return {
    id,
    name,
    price,
    image: item.image || '',
    quantity,
    chosen_options: item.chosen_options && typeof item.chosen_options === 'object' ? item.chosen_options : {},
    notes: typeof item.notes === 'string' ? item.notes : '',
  };
}

export const useCart = () => {
  const [cartItems, setCartItems] = useState([]);
  const [discount, setDiscount] = useState(0);
  const [appliedCoupon, setAppliedCoupon] = useState(null);

  // Cargar carrito desde localStorage al iniciar
  useEffect(() => {
    const savedCart = localStorage.getItem('cafeteria-cart');
    const savedDiscount = localStorage.getItem('cafeteria-discount');
    const savedCoupon = localStorage.getItem('cafeteria-coupon');

    if (savedCart) {
      try {
        const parsedCart = JSON.parse(savedCart);
        const normalizedCart = Array.isArray(parsedCart)
          ? parsedCart.map(normalizeStoredCartItem).filter(Boolean)
          : [];

        setCartItems(normalizedCart);
      } catch (error) {
        console.error('Error loading cart from localStorage:', error);
      }
    }

    if (savedDiscount) {
      setDiscount(parseFloat(savedDiscount));
    }

    if (savedCoupon) {
      setAppliedCoupon(savedCoupon);
    }
  }, []);

  // Guardar en localStorage cuando cambie el carrito
  useEffect(() => {
    localStorage.setItem('cafeteria-cart', JSON.stringify(cartItems));
  }, [cartItems]);

  useEffect(() => {
    localStorage.setItem('cafeteria-discount', discount.toString());
  }, [discount]);

  useEffect(() => {
    if (appliedCoupon) {
      localStorage.setItem('cafeteria-coupon', appliedCoupon);
    } else {
      localStorage.removeItem('cafeteria-coupon');
    }
  }, [appliedCoupon]);

  // Calcular totales
  const subtotal = cartItems.reduce((total, item) => total + (item.price * item.quantity), 0);
  const deliveryFee = 0;
  const total = Math.max(0, subtotal - discount);
  const itemCount = cartItems.reduce((total, item) => total + item.quantity, 0);

  // Añadir producto al carrito
  const addItem = useCallback((product, quantity = 1, customOptions = {}) => {
    setCartItems(prev => {
      // Buscar si ya existe un producto idéntico (mismo ID y opciones)
      const existingIndex = prev.findIndex(item => 
        item.id === product.id && 
        JSON.stringify(item.chosen_options) === JSON.stringify(customOptions)
      );

      if (existingIndex >= 0) {
        // Si existe, aumentar cantidad
        const updated = [...prev];
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: updated[existingIndex].quantity + quantity
        };
        return updated;
      } else {
        // Si no existe, añadir nuevo item
        const newItem = {
          id: product.id,
          name: product.name,
          price: product.price,
          image: product.image,
          quantity: quantity,
          chosen_options: customOptions,
          notes: customOptions.notes || ""
        };
        return [...prev, newItem];
      }
    });
  }, []);

  // Actualizar cantidad de un item
  const updateQuantity = useCallback((itemId, newQuantity, customOptions = null) => {
    if (newQuantity <= 0) {
      removeItem(itemId, customOptions);
      return;
    }

    setCartItems(prev => 
      prev.map(item => {
        // Si se especifican opciones personalizadas, buscar coincidencia exacta
        if (customOptions && JSON.stringify(item.chosen_options) !== JSON.stringify(customOptions)) {
          return item;
        }
        
        return item.id === itemId 
          ? { ...item, quantity: newQuantity }
          : item;
      })
    );
  }, []);

  // Eliminar item del carrito
  const removeItem = useCallback((itemId, customOptions = null) => {
    setCartItems(prev => 
      prev.filter(item => {
        if (item.id !== itemId) return true;
        
        // Si se especifican opciones, solo eliminar si coinciden exactamente
        if (customOptions) {
          return JSON.stringify(item.chosen_options) !== JSON.stringify(customOptions);
        }
        
        return false;
      })
    );
  }, []);

  // Vaciar carrito completamente
  const clearCart = useCallback(() => {
    setCartItems([]);
    setDiscount(0);
    setAppliedCoupon(null);
  }, []);

  // Aplicar cupón de descuento
  const applyCoupon = useCallback((couponCode) => {
    // Cupones válidos (esto debería venir del backend)
    const validCoupons = {
      'DESCUENTO10': { type: 'percentage', value: 0.10, name: '10% de descuento' },
      'WELCOME5': { type: 'fixed', value: 5.00, name: '5€ de descuento' },
      'STUDENT': { type: 'percentage', value: 0.15, name: 'Descuento estudiante 15%' },
      'FIRSTORDER': { type: 'percentage', value: 0.20, name: 'Primer pedido 20% off' }
    };

    const coupon = validCoupons[couponCode.toUpperCase()];
    
    if (coupon) {
      let discountAmount = 0;
      
      if (coupon.type === 'percentage') {
        discountAmount = subtotal * coupon.value;
      } else if (coupon.type === 'fixed') {
        discountAmount = Math.min(coupon.value, subtotal);
      }
      
      setDiscount(discountAmount);
      setAppliedCoupon({
        code: couponCode.toUpperCase(),
        name: coupon.name,
        amount: discountAmount
      });
      
      return { success: true, discount: discountAmount, coupon: coupon };
    } else {
      return { success: false, message: 'Cupón no válido' };
    }
  }, [subtotal]);

  // Eliminar cupón aplicado
  const removeCoupon = useCallback(() => {
    setDiscount(0);
    setAppliedCoupon(null);
  }, []);

  // Verificar si un producto específico está en el carrito
  const isInCart = useCallback((productId, customOptions = null) => {
    return cartItems.some(item => {
      if (item.id !== productId) return false;
      
      if (customOptions) {
        return JSON.stringify(item.chosen_options) === JSON.stringify(customOptions);
      }
      
      return true;
    });
  }, [cartItems]);

  // Obtener cantidad de un producto específico
  const getItemQuantity = useCallback((productId, customOptions = null) => {
    const item = cartItems.find(item => {
      if (item.id !== productId) return false;
      
      if (customOptions) {
        return JSON.stringify(item.chosen_options) === JSON.stringify(customOptions);
      }
      
      return true;
    });
    
    return item ? item.quantity : 0;
  }, [cartItems]);

  return {
    // Estado
    cartItems,
    subtotal,
    discount,
    deliveryFee,
    total,
    itemCount,
    appliedCoupon,
    
    // Acciones
    addItem,
    updateQuantity,
    removeItem,
    clearCart,
    applyCoupon,
    removeCoupon,
    
    // Utilidades
    isInCart,
    getItemQuantity
  };
};

export default useCart;
