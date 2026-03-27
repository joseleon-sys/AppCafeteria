import React, { useState } from "react";
import "./HistoryModal.css";
import { showSuccess } from "./Toast";

export default function HistoryModal({ isOpen, onClose }) {
  const [selectedOrder, setSelectedOrder] = useState(null);
  
  const orderHistory = [
    {
      id: "001",
      date: "2026-01-28",
      time: "14:30",
      status: "completado",
      total: 8.50,
      items: [
        { name: "Café con leche", quantity: 1, price: 1.80, customizations: "2 sobres de azúcar" },
        { name: "Bocadillo jamón", quantity: 1, price: 3.50, customizations: "" },
        { name: "Croissant", quantity: 2, price: 1.50, customizations: "" }
      ]
    },
    {
      id: "002", 
      date: "2026-01-27",
      time: "09:15",
      status: "completado",
      total: 4.40,
      items: [
        { name: "Cappuccino", quantity: 1, price: 2.20, customizations: "1 sobre de azúcar" },
        { name: "Café solo", quantity: 1, price: 1.20, customizations: "Sin azúcar" }
      ]
    },
    {
      id: "003",
      date: "2026-01-26", 
      time: "16:45",
      status: "cancelado",
      total: 3.50,
      items: [
        { name: "Bocadillo vegetal", quantity: 1, price: 3.50, customizations: "Sin tomate" }
      ]
    },
    {
      id: "004",
      date: "2026-01-25",
      time: "11:20",
      status: "completado", 
      total: 7.20,
      items: [
        { name: "Café con leche", quantity: 2, price: 1.80, customizations: "" },
        { name: "Croissant", quantity: 2, price: 1.50, customizations: "" }
      ]
    }
  ];

  const getStatusColor = (status) => {
    switch (status) {
      case 'completado': return '#28a745';
      case 'cancelado': return '#dc3545';
      case 'pendiente': return '#ffc107';
      default: return '#6c757d';
    }
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-ES', { 
      day: 'numeric', 
      month: 'short',
      year: 'numeric'
    });
  };

  const getItemsSummary = (items) => {
    if (items.length === 0) return "Sin productos";
    if (items.length === 1) return items[0].name;
    return `${items[0].name} + ${items.length - 1} más`;
  };

  const handleRepeatOrder = () => {
    showSuccess('Pedido añadido al carrito');
    setSelectedOrder(null);
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Modal Principal de Historial */}
      <div className="history-modal-overlay" onClick={onClose}>
        <div className="history-modal" onClick={e => e.stopPropagation()}>
          <div className="history-modal-header">
            <h3>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{display: 'inline-block', verticalAlign: 'middle', marginRight: '8px'}}>
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
            {orderHistory.length === 0 ? (
              <div className="empty-history">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{opacity: 0.3, color: '#6c757d'}}>
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                </svg>
                <h4>Sin historial</h4>
                <p>Aún no tienes pedidos realizados</p>
              </div>
            ) : (
              <div className="order-list">
                {orderHistory.map(order => (
                  <div 
                    key={order.id} 
                    className="order-card"
                    onClick={() => setSelectedOrder(order)}
                  >
                    <div className="order-card-header">
                      <div className="order-number">Nº {order.id}</div>
                      <div className="order-price">{order.total.toFixed(2)} €</div>
                    </div>
                    <div className="order-card-body">
                      <div className="order-datetime">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{display: 'inline-block', verticalAlign: 'middle', marginRight: '4px'}}>
                          <circle cx="12" cy="12" r="10"></circle>
                          <polyline points="12 6 12 12 16 14"></polyline>
                        </svg>
                        {formatDate(order.date)} • {order.time}
                      </div>
                      <div className="order-summary">{getItemsSummary(order.items)}</div>
                    </div>
                    <div className="order-card-footer">
                      <span 
                        className="order-status-badge" 
                        style={{ backgroundColor: getStatusColor(order.status) }}
                      >
                        {order.status}
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

      {/* Modal de Ticket Detallado */}
      {selectedOrder && (
        <div className="ticket-modal-overlay" onClick={() => setSelectedOrder(null)}>
          <div className="ticket-modal" onClick={e => e.stopPropagation()}>
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
                  <span className="ticket-value">{selectedOrder.time}</span>
                </div>
                <div className="ticket-info-row">
                  <span className="ticket-label">Estado:</span>
                  <span 
                    className="ticket-status"
                    style={{ color: getStatusColor(selectedOrder.status) }}
                  >
                    {selectedOrder.status.toUpperCase()}
                  </span>
                </div>
              </div>

              <div className="ticket-divider"></div>

              <div className="ticket-section">
                <h4 className="ticket-section-title">Productos</h4>
                {selectedOrder.items.map((item, index) => (
                  <div key={index} className="ticket-item">
                    <div className="ticket-item-header">
                      <span className="ticket-item-qty">{item.quantity}x</span>
                      <span className="ticket-item-name">{item.name}</span>
                      <span className="ticket-item-price">{(item.price * item.quantity).toFixed(2)} €</span>
                    </div>
                    {item.customizations && (
                      <div className="ticket-item-customizations">
                        {item.customizations}
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
              {selectedOrder.status === 'completado' && (
                <button className="repeat-order-btn" onClick={handleRepeatOrder}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{display: 'inline-block', verticalAlign: 'middle', marginRight: '8px'}}>
                    <polyline points="23 4 23 10 17 10"></polyline>
                    <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
                  </svg>
                  Repetir pedido
                </button>
              )}
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