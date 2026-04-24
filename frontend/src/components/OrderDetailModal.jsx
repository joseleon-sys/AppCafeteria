// Modal para inspeccionar el detalle de un pedido concreto.
import { useState, useEffect } from 'react';
import { obtenerDetallePedidoPadre } from '../lib/api';
import { showError } from './Toast';
import './OrderDetailModal.css';

export default function OrderDetailModal({ order, onClose, onRefresh }) {
  const [fullOrder, setFullOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrderDetail();
  }, [order.id]);

  const fetchOrderDetail = async () => {
    setLoading(true);
    try {
      const response = await obtenerDetallePedidoPadre(order.id);
      setFullOrder(response.order);
    } catch (error) {
      console.error('Error fetching order detail:', error);
      showError('Error al cargar detalle del pedido');
    } finally {
      setLoading(false);
    }
  };

  const getStatusInfo = (status) => {
    const statusMap = {
      pending: { emoji: '⏳', text: 'Pendiente de Aprobación', color: '#f39c12' },
      approved: { emoji: '✅', text: 'Aprobado', color: '#27ae60' },
      rejected: { emoji: '❌', text: 'Rechazado', color: '#e74c3c' },
      paid: { emoji: '💰', text: 'Pagado', color: '#3498db' },
    };
    return statusMap[status] || { emoji: '❓', text: status, color: '#95a5a6' };
  };

  const statusInfo = getStatusInfo(order.status);

  if (loading) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
          <div className="loading-spinner">⏳ Cargando...</div>
        </div>
      </div>
    );
  }

  if (!fullOrder) {
    return null;
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content order-detail-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>📋 Detalle del Pedido</h2>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          {/* Status */}
          <div className="detail-section status-section" style={{ borderLeftColor: statusInfo.color }}>
            <h3>Estado del Pedido</h3>
            <p className="status-large" style={{ color: statusInfo.color }}>
              {statusInfo.emoji} {statusInfo.text}
            </p>
          </div>

          {/* Info del hijo */}
          <div className="detail-section">
            <h3>👤 Solicitado por</h3>
            <p className="child-name-large">{fullOrder.child?.name}</p>
            <p className="child-email">{fullOrder.child?.email}</p>
          </div>

          {/* Fecha */}
          <div className="detail-section">
            <h3>📅 Fecha</h3>
            <p>{new Date(fullOrder.created_at).toLocaleString('es-ES', {
              dateStyle: 'long',
              timeStyle: 'short'
            })}</p>
          </div>

          {/* Items */}
          <div className="detail-section">
            <h3>🛒 Productos</h3>
            <div className="items-list">
              {fullOrder.items && fullOrder.items.map((item, index) => (
                <div key={index} className="item-row">
                  <span className="item-name">{item.product_name}</span>
                  <span className="item-quantity">x{item.quantity}</span>
                  <span className="item-price">${parseFloat(item.price).toFixed(2)}</span>
                  <span className="item-subtotal">${parseFloat(item.subtotal).toFixed(2)}</span>
                </div>
              ))}
            </div>

            <div className="totals-section">
              <div className="total-row">
                <span>Subtotal:</span>
                <span>${parseFloat(fullOrder.subtotal || 0).toFixed(2)}</span>
              </div>
              <div className="total-row">
                <span>Impuesto (5%):</span>
                <span>${parseFloat(fullOrder.tax || 0).toFixed(2)}</span>
              </div>
              <div className="total-row grand-total">
                <span><strong>Total:</strong></span>
                <span><strong>${parseFloat(fullOrder.total).toFixed(2)}</strong></span>
              </div>
            </div>
          </div>

          {/* Notas */}
          {fullOrder.notes && (
            <div className="detail-section">
              <h3>💬 Notas del Hijo</h3>
              <p className="notes-text">{fullOrder.notes}</p>
            </div>
          )}

          {/* Razón de rechazo */}
          {fullOrder.rejection_reason && (
            <div className="detail-section rejection-section">
              <h3>❌ Motivo del Rechazo</h3>
              <p className="rejection-text">{fullOrder.rejection_reason}</p>
            </div>
          )}

          {/* Información de pago */}
          {fullOrder.status === 'paid' && (
            <div className="detail-section paid-section">
              <h3>💰 Información de Pago</h3>
              <p>Método: <strong>{fullOrder.payment_method || 'Efectivo'}</strong></p>
              <p>Monto: <strong>${parseFloat(fullOrder.amount_paid || fullOrder.total).toFixed(2)}</strong></p>
              {fullOrder.paid_at && (
                <p>Pagado: {new Date(fullOrder.paid_at).toLocaleString('es-ES')}</p>
              )}
            </div>
          )}

          {/* Límite de gasto */}
          {fullOrder.spending_limit && (
            <div className="detail-section">
              <h3>📊 Límite de Gasto</h3>
              <p>Límite mensual: <strong>${parseFloat(fullOrder.spending_limit).toFixed(2)}</strong></p>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
// Modal para inspeccionar el detalle de un pedido concreto.
// Modal para inspeccionar el detalle de un pedido concreto.
