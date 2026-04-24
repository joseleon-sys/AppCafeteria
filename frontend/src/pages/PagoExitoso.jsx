// Pantalla a la que vuelve el usuario despues de un pago completado.
import React from 'react';
import './CartPage.css';

export default function PagoExitoso() {
  const searchParams = new URLSearchParams(window.location.search);
  const sessionId = searchParams.get('session_id');
  const devBypass = searchParams.get('dev_bypass') === '1';
  const idPedido = searchParams.get('order_id');
  const viewOrderHref = idPedido
    ? `/?history=1&order_id=${encodeURIComponent(idPedido)}`
    : '/?history=1';

  return (
    <div className="cart-page-container" style={{ padding: '2rem', textAlign: 'center' }}>
      <div
        className="success-card"
        style={{
          maxWidth: 560,
          margin: '0 auto',
          background: '#fff',
          borderRadius: 16,
          padding: '2rem',
          boxShadow: '0 18px 70px rgba(0,0,0,0.12)',
        }}
      >
        <h1 style={{ marginBottom: '1rem', color: '#2f6b49' }}>Pago completado con éxito</h1>
        <p style={{ fontSize: '1rem', color: '#4a4a4a', marginBottom: '1.5rem' }}>
          {devBypass
            ? 'Pedido marcado como pagado en modo desarrollo/pruebas. No se ha realizado ningun cobro real.'
            : 'Gracias por tu compra. Tu pago fue procesado correctamente y tu pedido está en camino.'}
        </p>
        {sessionId && (
          <div
            style={{
              marginBottom: '1.5rem',
              padding: '1rem',
              background: '#f3f7f2',
              borderRadius: 12,
              wordBreak: 'break-word',
            }}
          >
            <strong>ID de sesión Stripe:</strong>
            <p style={{ marginTop: '0.5rem', color: '#333' }}>{sessionId}</p>
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <a href="/" className="checkout-btn" style={{ padding: '0.9rem 1.6rem' }}>
            Volver al menú
          </a>
          <a href={viewOrderHref} className="checkout-btn" style={{ padding: '0.9rem 1.6rem' }}>
            Ver mi pedido
          </a>
        </div>
        <p style={{ marginTop: '1.5rem', color: '#7a7a7a', fontSize: '0.95rem' }}>
          Si no ves tu pedido en unos minutos, recarga la página o revisa el historial de pedidos.
        </p>
      </div>
    </div>
  );
}
