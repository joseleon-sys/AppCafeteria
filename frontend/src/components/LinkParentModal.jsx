import React, { useState } from 'react';
import './LinkParentModal.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export default function LinkParentModal({ isOpen, onClose }) {
  const [parentToken, setParentToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const token = localStorage.getItem('cafeteria_token');
      const response = await fetch(`${API_URL}/api/child/link-parent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ parentToken: parentToken.toUpperCase() })
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Error al enviar solicitud');
        setLoading(false);
        return;
      }

      setSuccess(`Solicitud enviada a ${data.link.parentName}. Espera su aprobación.`);
      setParentToken('');
      setTimeout(() => {
        onClose && onClose();
        setSuccess('');
      }, 2000);
    } catch (err) {
      console.error('Error:', err);
      setError('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>🔗 Vincular con Padre</h2>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>
        
        <div className="modal-body">
          <p style={{ marginBottom: 16, color: '#666' }}>
            Pide a tu padre su <strong>token de vinculación</strong> (8 caracteres) y escríbelo aquí:
          </p>
          
          <form onSubmit={handleSubmit}>
            <input
              type="text"
              value={parentToken}
              onChange={e => setParentToken(e.target.value.toUpperCase())}
              placeholder="Ej: ABC12XYZ"
              maxLength={8}
              required
              style={{
                width: '100%',
                padding: 12,
                fontSize: 18,
                textAlign: 'center',
                textTransform: 'uppercase',
                letterSpacing: 2,
                borderRadius: 8,
                border: '2px solid #d4915f',
                marginBottom: 16
              }}
            />
            
            <button 
              type="submit" 
              disabled={loading || parentToken.length !== 8}
              style={{
                width: '100%',
                padding: 12,
                background: parentToken.length === 8 ? '#d4915f' : '#ccc',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                fontSize: 16,
                fontWeight: 600,
                cursor: parentToken.length === 8 ? 'pointer' : 'not-allowed'
              }}
            >
              {loading ? 'Enviando...' : 'Enviar Solicitud'}
            </button>
          </form>
          
          {error && (
            <div style={{ marginTop: 16, padding: 12, background: '#fee', borderRadius: 8, color: '#c00' }}>
              {error}
            </div>
          )}
          
          {success && (
            <div style={{ marginTop: 16, padding: 12, background: '#efe', borderRadius: 8, color: '#060' }}>
              {success}
            </div>
          )}
          
          <div style={{ marginTop: 16, fontSize: 13, color: '#999' }}>
            ℹ️ Tu padre recibirá una notificación y podrá aprobar o rechazar la vinculación.
          </div>
        </div>
      </div>
    </div>
  );
}
