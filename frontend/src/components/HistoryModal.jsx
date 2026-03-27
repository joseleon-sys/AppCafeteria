import React, { useEffect, useState } from "react";
import "./HistoryModal.css";
import { showError } from "./Toast";
import { fetchOrderDetailForUser, fetchOrderHistoryForUser } from "../lib/orderService";

export default function HistoryModal({ isOpen, onClose, user }) {
  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen || !user) return;

    let cancelled = false;

    const loadHistory = async () => {
      setLoading(true);
      try {
        const data = await fetchOrderHistoryForUser(user);
        if (!cancelled) {
          setOrders(data);
        }
      } catch (error) {
        console.error('Error cargando historial:', error);
        showError(error.message || 'No se pudo cargar el historial');
        if (!cancelled) {
          setOrders([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadHistory();

    return () => {
      cancelled = true;
    };
  }, [isOpen, user]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'paid':
      case 'completed':
      case 'completado':
        return '#28a745';
      case 'approved':
        return '#17a2b8';
      case 'rejected':
      case 'cancelado':
        return '#dc3545';
      case 'pending':
        return '#ffc107';
      default:
        return '#6c757d';
    }
  };

  const getStatusLabel = (status) => {
    const labels = {
      paid: 'pagado',
      completed: 'completado',
      approved: 'aprobado',
      rejected: 'rechazado',
      pending: 'pendiente',
    };

    return labels[status] || status || 'desconocido';
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatTime = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleOpenOrder = async (order) => {
    try {
      const detail = await fetchOrderDetailForUser(user, order);
      setSelectedOrder(detail);
    } catch (error) {
      console.error('Error cargando detalle:', error);
      showError(error.message || 'No se pudo cargar el detalle del pedido');
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="history-modal-overlay" onClick={onClose}>
        <div className="history-modal" onClick={(e) => e.stopPropagation()}>
          <div className="history-modal-header">
            <h3>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '8px' }}>
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <line x1="16" y1="13" x2="8" y2="13"></line>
                <line x1="16" y1="17" x2="8" y2="17"></line>
                <polyline points="10 9 9 9 8 9"></polyline>
              </svg>
              Historial de pedidos
            </h3>
            <button className="close-btn" onClick={onClose} aria-label="Cerrar historial">
              ✕
            </button>
          </div>

          <div className="history-modal-content">
            {loading ? (
              <div className="empty-history">
                <h4>Cargando historial...</h4>
              </div>
            ) : orders.length === 0 ? (
              <div className="empty-history">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.3, color: '#6c757d' }}>
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                </svg>
                <h4>Sin historial</h4>
                <p>Aún no hay pedidos reales registrados para esta cuenta</p>
              </div>
            ) : (
              <div className="order-list">
                {orders.map((order) => (
                  <div key={order.id} className="order-card" onClick={() => handleOpenOrder(order)}>
                    <div className="order-card-header">
                      <div className="order-number">Nº {order.id}</div>
                      <div className="order-price">{order.total.toFixed(2)} €</div>
                    </div>
                    <div className="order-card-body">
                      <div className="order-datetime">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '4px' }}>
                          <circle cx="12" cy="12" r="10"></circle>
                          <polyline points="12 6 12 12 16 14"></polyline>
                        </svg>
                        {formatDate(order.date)} • {formatTime(order.date)}
                      </div>
                      <div className="order-summary">{order.summary}</div>
                    </div>
                    <div className="order-card-footer">
                      <span className="order-status-badge" style={{ backgroundColor: getStatusColor(order.status) }}>
                        {getStatusLabel(order.status)}
                      </span>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="chevron-icon">
                        <polyline points="9 18 15 12 9 6"></polyline>
                      </svg>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="history-modal-footer">
            <button className="close-history-btn" onClick={onClose}>
              Cerrar
            </button>
          </div>
        </div>
      </div>

      {selectedOrder && (
        <div className="ticket-modal-overlay" onClick={() => setSelectedOrder(null)}>
          <div className="ticket-modal" onClick={(e) => e.stopPropagation()}>
            <div className="ticket-header">
              <h3>Pedido #{selectedOrder.id}</h3>
              <button className="close-btn" onClick={() => setSelectedOrder(null)} aria-label="Cerrar ticket">
                ✕
              </button>
            </div>

            <div className="ticket-content">
              <div className="ticket-section">
                <div className="ticket-info-row">
                  <span className="ticket-label">Fecha:</span>
                  <span className="ticket-value">{formatDate(selectedOrder.date)}</span>
                </div>
                <div className="ticket-info-row">
                  <span className="ticket-label">Hora:</span>
                  <span className="ticket-value">{formatTime(selectedOrder.date)}</span>
                </div>
                <div className="ticket-info-row">
                  <span className="ticket-label">Estado:</span>
                  <span className="ticket-status" style={{ color: getStatusColor(selectedOrder.status) }}>
                    {getStatusLabel(selectedOrder.status).toUpperCase()}
                  </span>
                </div>
              </div>

              <div className="ticket-divider"></div>

              <div className="ticket-section">
                <h4 className="ticket-section-title">Productos</h4>
                {(selectedOrder.items || []).map((item, index) => (
                  <div key={`${item.product_id || item.id || index}-${index}`} className="ticket-item">
                    <div className="ticket-item-header">
                      <span className="ticket-item-qty">{item.quantity}x</span>
                      <span className="ticket-item-name">{item.product_name || item.name}</span>
                      <span className="ticket-item-price">{(Number.parseFloat(item.subtotal || item.price * item.quantity || 0) || 0).toFixed(2)} €</span>
                    </div>
                    {item.notes && (
                      <div className="ticket-item-customizations">
                        {item.notes}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="ticket-divider"></div>

              <div className="ticket-total-section">
                <div className="ticket-total-row">
                  <span className="ticket-total-label">TOTAL</span>
                  <span className="ticket-total-value">{selectedOrder.total.toFixed(2)} €</span>
                </div>
              </div>
            </div>

            <div className="ticket-footer">
              <button className="ticket-close-btn" onClick={() => setSelectedOrder(null)}>
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
