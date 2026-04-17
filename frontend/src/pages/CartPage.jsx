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
import { createCheckoutSession } from '../lib/api';
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

    const token = localStorage.getItem('cafeteria_token');
    const storedUser = JSON.parse(localStorage.getItem('cafeteria_user') || 'null');

    if (!token) {
      showNotification('Necesitas iniciar sesión para pagar', 'warning');
      return;
    }

    if (storedUser?.role === 'child' || storedUser?.isAdult === false) {
      showNotification('Los perfiles de menor no pueden usar este flujo de pago', 'warning');
      return;
    }

    setIsProcessingOrder(true);

    try {
      const hasInvalidItems = cartItems.some((item) => !String(item?.id ?? '').trim());
      if (hasInvalidItems) {
        throw new Error('Hay productos antiguos o invalidos en el carrito. Vacialo y vuelve a anadirlos.');
      }

      const itemsPayload = cartItems.map(item => ({
        product_id: item.id,
        quantity: item.quantity
      }));

      const data = await createCheckoutSession(itemsPayload);

      if (data?.url) {
        window.location.href = data.url;
        return;
      }

      if (data?.bypassed && data?.redirect_url) {
        clearCart();
        window.location.href = data.redirect_url;
        return;
      }

      showNotification('No se pudo iniciar el pago. Intenta de nuevo.', 'danger');
    } catch (error) {
      console.error('Error processing checkout:', error);
      showNotification(error.message || 'Error de conexión. Inténtalo de nuevo.', 'danger');
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
