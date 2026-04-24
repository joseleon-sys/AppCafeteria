// Formulario alternativo para que un menor envie un pedido pendiente de aprobacion.
import { useState } from 'react';
import { useCart } from '../lib/useCart';
import { crearPedidoHijo } from '../lib/api';
import { showSuccess, showError } from './Toast';
import './ChildOrderForm.css';

export default function ChildOrderForm({ user, onOrderCreated }) {
  const { cart, clearCart } = useCart();
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const tax = total * 0.05;
  const grandTotal = total + tax;

  const gestionarEnvio = async (e) => {
    // Convierte el carrito actual al formato que espera el backend para pedidos infantiles.
    e.preventDefault();

    if (cart.length === 0) {
      showError('El carrito está vacío');
      return;
    }

    if (grandTotal < 5.00) {
      showError('El monto mínimo del pedido es $5.00');
      return;
    }

    setLoading(true);

    try {
      const items = cart.map(item => ({
        product_id: item.id,
        quantity: item.quantity
      }));

      const response = await crearPedidoHijo(items, notes);
      
      showSuccess('✅ Pedido enviado a tu padre para aprobación');
      clearCart();
      setNotes('');
      
      if (onOrderCreated) {
        onOrderCreated(response.order);
      }
    } catch (error) {
      console.error('Error creating order:', error);
      showError(error.message || 'Error al crear el pedido');
    } finally {
      setLoading(false);
    }
  };

  if (cart.length === 0) {
    return (
      <div className="child-order-form empty">
        <p>🛒 Tu carrito está vacío</p>
        <p className="hint">Agrega productos para crear un pedido</p>
      </div>
    );
  }

  return (
    <div className="child-order-form">
      <h3>📝 Crear Pedido</h3>
      
      <div className="order-summary">
        <h4>Resumen del Pedido</h4>
        {cart.map(item => (
          <div key={item.id} className="order-item">
            <span className="item-name">{item.name}</span>
            <span className="item-quantity">x{item.quantity}</span>
            <span className="item-price">${(item.price * item.quantity).toFixed(2)}</span>
          </div>
        ))}
        
        <div className="order-totals">
          <div className="total-line">
            <span>Subtotal:</span>
            <span>${total.toFixed(2)}</span>
          </div>
          <div className="total-line">
            <span>Impuesto (5%):</span>
            <span>${tax.toFixed(2)}</span>
          </div>
          <div className="total-line grand-total">
            <span><strong>Total:</strong></span>
            <span><strong>${grandTotal.toFixed(2)}</strong></span>
          </div>
        </div>
      </div>

      <form onSubmit={gestionarEnvio}>
        <div className="form-group">
          <label htmlFor="notes">Notas (opcional)</label>
          <textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="¿Alguna preferencia o comentario?"
            rows="3"
            maxLength="200"
          />
          <small>{notes.length}/200 caracteres</small>
        </div>

        <div className="form-actions">
          <button 
            type="submit" 
            className="btn btn-primary"
            disabled={loading}
          >
            {loading ? '⏳ Enviando...' : '🚀 Enviar Pedido'}
          </button>
        </div>

        {grandTotal < 5.00 && (
          <p className="warning">⚠️ Monto mínimo: $5.00</p>
        )}
      </form>
    </div>
  );
}
