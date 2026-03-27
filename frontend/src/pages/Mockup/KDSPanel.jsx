import React from "react";

const sampleOrders = [
  { id: "CAFE001", mesa: "5", estado: "En preparación", items: ["Café solo", "Croissant"], hora: "12:01" },
  { id: "CAFE002", mesa: "2", estado: "Listo para servir", items: ["Bocadillo vegetal"], hora: "12:03" },
  { id: "CAFE003", mesa: "Barra", estado: "En preparación", items: ["Café con leche"], hora: "12:05" },
];

export default function KDSPanel() {
  return (
    <div style={{ padding: 32, background: '#f8f9fa', minHeight: '100vh' }}>
      <h1>KDS — Comandas de Cocina</h1>
      <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', marginTop: 32 }}>
        {sampleOrders.map(order => (
          <div key={order.id} style={{ background: '#fff', borderRadius: 12, boxShadow: '0 2px 8px #0001', padding: 24, minWidth: 260 }}>
            <h2 style={{ margin: 0 }}>#{order.id}</h2>
            <div style={{ color: '#6b4226', fontWeight: 600, marginBottom: 8 }}>Mesa: {order.mesa}</div>
            <div style={{ marginBottom: 8 }}><strong>Estado:</strong> {order.estado}</div>
            <ul style={{ margin: '12px 0', paddingLeft: 20 }}>
              {order.items.map((item, i) => <li key={i}>{item}</li>)}
            </ul>
            <div style={{ color: '#888', fontSize: 14 }}>Hora: {order.hora}</div>
            <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
              <button className="btn btn-primary btn-sm">Marcar como listo</button>
              <button className="btn btn-outline btn-sm">Cancelar</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
