// Lista de pedidos pendientes o historicos que un padre puede revisar para sus hijos.
import { useState, useEffect } from 'react';
import { obtenerPedidosPadreHijo, aprobarPedidoHijo, rechazarPedidoHijo, marcarPedidoComoPagado } from '../lib/api';
import { showSuccess, showError } from './Toast';
import { showPrompt } from './Dialog';
import OrderDetailModal from './OrderDetailModal';
import './ParentOrdersList.css';

export default function ParentOrdersList({ user }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showDetail, setShowDetail] = useState(false);

  useEffect(() => {
    obtenerPedidos();
  }, [filter]);

  const obtenerPedidos = async () => {
    setLoading(true);
    try {
      const response = await obtenerPedidosPadreHijo({ status: filter });
      setOrders(response.orders || []);
    } catch (error) {
      console.error('Error fetching orders:', error);
      showError('Error al cargar pedidos');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (idPedido) => {
    try {
      await aprobarPedidoHijo(idPedido);
      showSuccess('✅ Pedido aprobado');
      obtenerPedidos();
    } catch (error) {
      showError(error.message || 'Error al aprobar pedido');
    }
  };

  const handleReject = async (idPedido) => {
    const reason = await showPrompt('Motivo del rechazo', 'Por favor indica por qué rechazas este pedido');
    
    if (!reason || reason.trim().length < 3) {
      showError('Debes proporcionar un motivo válido');
      return;
    }

    try {
      await rechazarPedidoHijo(idPedido, reason);
      showSuccess('❌ Pedido rechazado');
      obtenerPedidos();
    } catch (error) {
      showError(error.message || 'Error al rechazar pedido');
    }
  };

  const handleMarkPaid = async (idPedido) => {
    try {
      await marcarPedidoComoPagado(idPedido, 'cash');
      showSuccess('💰 Pedido marcado como pagado');
      obtenerPedidos();
    } catch (error) {
      showError(error.message || 'Error al marcar como pagado');
    }
  };

  const handleViewDetail = (order) => {
    setSelectedOrder(order);
    setShowDetail(true);
  };

  const getStatusBadge = (status) => {
    const badges = {
      pending: { emoji: '⏳', text: 'Pendiente', class: 'status-pending' },
      approved: { emoji: '✅', text: 'Aprobado', class: 'status-approved' },
      rejected: { emoji: '❌', text: 'Rechazado', class: 'status-rejected' },
      paid: { emoji: '💰', text: 'Pagado', class: 'status-paid' },
    };
    
    const badge = badges[status] || { emoji: '❓', text: status, class: '' };
    return (
      <span className={`status-badge ${badge.class}`}>
        {badge.emoji} {badge.text}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="parent-orders-list loading">
        <div className="spinner">⏳ Cargando pedidos...</div>
      </div>
    );
  }

  return (
    <div className="parent-orders-list">
      <div className="orders-header">
        <h3>👨‍👩‍👧 Pedidos de Mis Hijos</h3>
        
        <div className="filters">
          <button 
            className={filter === 'pending' ? 'active' : ''}
            onClick={() => setFilter('pending')}
          >
            ⏳ Pendientes
          </button>
          <button 
            className={filter === 'approved' ? 'active' : ''}
            onClick={() => setFilter('approved')}
          >
            ✅ Aprobados
          </button>
          <button 
            className={filter === 'paid' ? 'active' : ''}
            onClick={() => setFilter('paid')}
          >
            💰 Pagados
          </button>
          <button 
            className={filter === 'rejected' ? 'active' : ''}
            onClick={() => setFilter('rejected')}
          >
            ❌ Rechazados
          </button>
        </div>
      </div>

      {orders.length === 0 ? (
        <div className="no-orders">
          <p>📭 No hay pedidos {filter === 'pending' ? 'pendientes' : filter}</p>
        </div>
      ) : (
        <div className="orders-grid">
          {orders.map(order => (
            <div key={order.id} className="order-card">
              <div className="order-card-header">
                <div className="child-info">
                  <span className="child-name">👤 {order.child?.name || 'Hijo'}</span>
                  {getStatusBadge(order.status)}
                </div>
                <span className="order-total">${parseFloat(order.total).toFixed(2)}</span>
              </div>

              <div className="order-card-body">
                <p className="order-date">
                  📅 {new Date(order.created_at).toLocaleString('es-ES', {
                    dateStyle: 'short',
                    timeStyle: 'short'
                  })}
                </p>
                <p className="items-count">🛒 {order.items_count} producto(s)</p>
                {order.notes && (
                  <p className="order-notes">💬 {order.notes}</p>
                )}
              </div>

              <div className="order-card-actions">
                <button 
                  className="btn btn-sm btn-info"
                  onClick={() => handleViewDetail(order)}
                >
                  👁️ Ver
                </button>

                {order.status === 'pending' && (
                  <>
                    <button 
                      className="btn btn-sm btn-success"
                      onClick={() => handleApprove(order.id)}
                    >
                      ✅ Aprobar
                    </button>
                    <button 
                      className="btn btn-sm btn-danger"
                      onClick={() => handleReject(order.id)}
                    >
                      ❌ Rechazar
                    </button>
                  </>
                )}

                {order.status === 'approved' && (
                  <button 
                    className="btn btn-sm btn-primary"
                    onClick={() => handleMarkPaid(order.id)}
                  >
                    💰 Marcar Pagado
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showDetail && selectedOrder && (
        <OrderDetailModal
          order={selectedOrder}
          onClose={() => {
            setShowDetail(false);
            setSelectedOrder(null);
          }}
          onRefresh={obtenerPedidos}
        />
      )}
    </div>
  );
}
// Lista de pedidos pendientes o historicos que un padre puede revisar para sus hijos.
// Lista de pedidos pendientes o historicos que un padre puede revisar para sus hijos.
