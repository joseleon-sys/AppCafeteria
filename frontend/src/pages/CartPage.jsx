import React from 'react';
import { 
  IonContent, 
  IonHeader, 
  IonPage, 
  IonTitle, 
  IonToolbar, 
  IonButton,
  IonIcon,
  IonToast
} from '@ionic/react';
import { arrowBack, checkmark, close } from 'ionicons/icons';
import { useHistory } from 'react-router-dom';
import CartPanel from '../components/CartPanel';
import { useCart } from '../lib/CartContext';
import './CartPage.css';

const CartPage = () => {
  const history = useHistory();
  const {
    cartItems,
    subtotal,
    discount,
    deliveryFee,
    total,
    appliedCoupon,
    updateQuantity,
    applyCoupon,
    removeCoupon,
    clearCart
  } = useCart();

  const [showToast, setShowToast] = React.useState(false);
  const [toastMessage, setToastMessage] = React.useState('');
  const [toastColor, setToastColor] = React.useState('success');
  const [isProcessingOrder, setIsProcessingOrder] = React.useState(false);

  const showNotification = (message, color = 'success') => {
    setToastMessage(message);
    setToastColor(color);
    setShowToast(true);
  };

  // Manejar cambios de cantidad
  const handleUpdateQuantity = (itemId, newQuantity) => {
    const item = cartItems.find(item => item.id === itemId);
    
    if (newQuantity === 0) {
      showNotification(`${item.name} eliminado del carrito`, 'warning');
    } else if (newQuantity > item.quantity) {
      showNotification(`Cantidad de ${item.name} aumentada`);
    } else {
      showNotification(`Cantidad de ${item.name} reducida`);
    }
    
    updateQuantity(itemId, newQuantity);
  };

  // Aplicar cupón de descuento
  const handleApplyCoupon = (couponCode) => {
    const result = applyCoupon(couponCode);
    
    if (result.success) {
      showNotification(`Cupón aplicado: ${result.coupon.name}`, 'success');
    } else {
      showNotification(result.message, 'danger');
    }
  };

  // Procesar checkout
  const handleCheckout = async () => {
    if (cartItems.length === 0) {
      showNotification('Tu carrito está vacío', 'warning');
      return;
    }

    setIsProcessingOrder(true);

    try {
      // Simular tiempo de procesamiento (en la app real sería la llamada API)
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Preparar datos del pedido según el contrato API
      const orderData = {
        user_id: 101, // Esto vendría del contexto de autenticación
        items: cartItems.map(item => ({
          product_id: item.id,
          quantity: item.quantity,
          notes: item.notes,
          chosen_options: item.chosen_options
        }))
      };

      // Llamar a la API
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // 'Authorization': `Bearer ${userToken}` // Si usas JWT
        },
        body: JSON.stringify(orderData)
      });

      const data = await response.json();

      if (response.ok) {
        // Pedido exitoso
        showNotification('¡Pedido realizado con éxito!', 'success');
        clearCart();
        
        // Redirigir a página de confirmación o pedidos
        setTimeout(() => {
          history.push('/orders');
        }, 2000);
      } else {
        showNotification(data.message || 'Error al procesar el pedido', 'danger');
      }
    } catch (error) {
      console.error('Error processing checkout:', error);
      showNotification('Error de conexión. Inténtalo de nuevo.', 'danger');
    } finally {
      setIsProcessingOrder(false);
    }
  };

  const goBack = () => {
    history.goBack();
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar color="primary">
          <IonButton 
            slot="start" 
            fill="clear" 
            color="light"
            onClick={goBack}
          >
            <IonIcon icon={arrowBack} />
          </IonButton>
          <IonTitle>Mi Carrito</IonTitle>
        </IonToolbar>
      </IonHeader>
      
      <IonContent>
        <div className="cart-page-container">
          {appliedCoupon && (
            <div className="applied-coupon-banner">
              <div className="coupon-info">
                <IonIcon icon={checkmark} className="coupon-icon" />
                <span>
                  Cupón aplicado: <strong>{appliedCoupon.name}</strong>
                </span>
              </div>
              <IonButton 
                fill="clear" 
                size="small" 
                color="medium"
                onClick={removeCoupon}
              >
                <IonIcon icon={close} />
              </IonButton>
            </div>
          )}
          
          <div className="cart-panel-wrapper">
            <CartPanel
              cartItems={cartItems}
              onUpdateQuantity={handleUpdateQuantity}
              onApplyCoupon={handleApplyCoupon}
              subtotal={subtotal}
              discount={discount}
              deliveryFee={deliveryFee}
              onCheckout={handleCheckout}
              isLoading={isProcessingOrder}
              loadingMessage="Preparando tu delicioso pedido..."
            />
          </div>

          {cartItems.length === 0 && (
            <div className="empty-cart-actions">
              <IonButton 
                expand="block" 
                color="primary"
                onClick={() => history.push('/menu')}
                className="continue-shopping-btn"
              >
                Explorar el menú
              </IonButton>
            </div>
          )}
        </div>

        <IonToast
          isOpen={showToast}
          onDidDismiss={() => setShowToast(false)}
          message={toastMessage}
          duration={3000}
          color={toastColor}
          position="top"
        />
      </IonContent>
    </IonPage>
  );
};

export default CartPage;
