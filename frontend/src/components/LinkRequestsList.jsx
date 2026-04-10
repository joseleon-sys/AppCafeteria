import React, { useState, useEffect } from 'react';
import { showSuccess, showError } from './Toast';
import { showConfirm, showPrompt } from './Dialog';
import { approveParentLinkRequest, getParentLinkRequests, rejectParentLinkRequest } from '../lib/api';

export default function LinkRequestsList({ onChange = null }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(null);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      const data = await getParentLinkRequests();
      setRequests(data.requests || []);
    } catch (error) {
      console.error('Error al obtener solicitudes:', error);
      showError(error.message || 'No se pudieron cargar las solicitudes');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (requestId) => {
    const confirmed = await showConfirm('¿Aprobar esta vinculación?', 'Aprobar vinculación');
    if (!confirmed) return;

    setProcessing(requestId);
    try {
      await approveParentLinkRequest(requestId, 20.0);
      showSuccess('Vinculación aprobada correctamente');
      if (typeof onChange === 'function') {
        await onChange();
      }
      fetchRequests();
    } catch (error) {
      console.error('Error:', error);
      showError(error.message || 'Error de conexión');
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (requestId) => {
    const reason = await showPrompt('¿Por qué rechazas esta solicitud?', 'Rechazar solicitud', '');
    if (!reason) return;

    setProcessing(requestId);
    try {
      await rejectParentLinkRequest(requestId, reason);
      showSuccess('Vinculación rechazada');
      if (typeof onChange === 'function') {
        await onChange();
      }
      fetchRequests();
    } catch (error) {
      console.error('Error:', error);
      showError(error.message || 'Error de conexión');
    } finally {
      setProcessing(null);
    }
  };

  if (loading) {
    return <div style={{ padding: 24 }}>Cargando solicitudes...</div>;
  }

  if (requests.length === 0) {
    return (
      <div style={{ padding: 24, textAlign: 'center', color: '#999' }}>
        No tienes solicitudes de vinculación pendientes
      </div>
    );
  }

  return (
    <div style={{ padding: 24 }}>
      <h3 style={{ marginBottom: 16, color: '#6b4226' }}>🔔 Solicitudes de Vinculación</h3>
      
      {requests.map(req => (
        <div 
          key={req.id} 
          style={{ 
            background: '#fff', 
            border: '2px solid #d4915f', 
            borderRadius: 12, 
            padding: 16, 
            marginBottom: 12 
          }}
        >
          <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 4 }}>
            {req.child?.name || 'Usuario'}
          </div>
          <div style={{ fontSize: 14, color: '#666', marginBottom: 8 }}>
            {req.child?.email}
          </div>
          <div style={{ fontSize: 12, color: '#999', marginBottom: 12 }}>
            Solicitado: {new Date(req.requested_at).toLocaleDateString()}
          </div>
          
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => handleApprove(req.id)}
              disabled={processing === req.id}
              style={{
                flex: 1,
                padding: '8px 16px',
                background: '#28a745',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 600,
                cursor: processing === req.id ? 'not-allowed' : 'pointer',
                opacity: processing === req.id ? 0.5 : 1
              }}
            >
              ✅ Aprobar
            </button>
            <button
              onClick={() => handleReject(req.id)}
              disabled={processing === req.id}
              style={{
                flex: 1,
                padding: '8px 16px',
                background: '#dc3545',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 600,
                cursor: processing === req.id ? 'not-allowed' : 'pointer',
                opacity: processing === req.id ? 0.5 : 1
              }}
            >
              ❌ Rechazar
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
