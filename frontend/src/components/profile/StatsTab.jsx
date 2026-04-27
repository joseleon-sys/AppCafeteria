import React from "react";

export default function StatsTab({ profileStats }) {
  return (
    <div className="stats-tab">
      <div className="stat-card">
        <div className="stat-icon">📊</div>
        <div className="stat-info">
          <div className="stat-value">{profileStats.totalOrders}</div>
          <div className="stat-label">Pedidos realizados</div>
        </div>
      </div>
      <div className="stat-card">
        <div className="stat-icon">☕</div>
        <div className="stat-info">
          <div className="stat-value">{profileStats.favoriteProduct}</div>
          <div className="stat-label">Producto favorito</div>
        </div>
      </div>
      <div className="stat-card">
        <div className="stat-icon">💰</div>
        <div className="stat-info">
          <div className="stat-value">{profileStats.totalSpent.toFixed(2)} €</div>
          <div className="stat-label">Total gastado</div>
        </div>
      </div>
    </div>
  );
}
