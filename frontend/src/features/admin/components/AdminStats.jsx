import React from "react";

export function AdminDashboardStats({ statistics }) {
  if (!statistics) return <div>Cargando estadísticas...</div>;

  const conversionRate =
    statistics.summary.total_users > 0
      ? ((statistics.orders.completed / statistics.summary.total_users) * 100).toFixed(1)
      : "0.0";

  return (
    <div className="dashboard-grid">
      <div className="kpi-card">
        <div className="kpi-label">Total Usuarios</div>
        <div className="kpi-value">{statistics.summary.total_users}</div>
        <div className="kpi-detail">
          {statistics.users.adults} adultos | {statistics.users.children} menores
        </div>
      </div>

      <div className="kpi-card">
        <div className="kpi-label">Órdenes Completadas</div>
        <div className="kpi-value">{statistics.orders.completed}</div>
        <div className="kpi-detail">{statistics.orders.pending} pendientes</div>
      </div>

      <div className="kpi-card">
        <div className="kpi-label">Ingresos Totales</div>
        <div className="kpi-value">€{statistics.summary.total_revenue.toFixed(2)}</div>
        <div className="kpi-detail">
          Ticket promedio: €{statistics.summary.average_order_value.toFixed(2)}
        </div>
      </div>

      <div className="kpi-card alert">
        <div className="kpi-label">Alertas de Fraude</div>
        <div className="kpi-value">{statistics.summary.fraud_alerts}</div>
        <div className="kpi-detail">{statistics.today.fraud_incidents} hoy</div>
      </div>

      <div className="section-card">
        <h3>Hoy</h3>
        <div className="today-stats">
          <div className="stat-item">
            <span className="stat-label">Nuevas órdenes</span>
            <span className="stat-value">{statistics.today.new_orders}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Nuevos usuarios</span>
            <span className="stat-value">{statistics.today.new_users}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Ingresos</span>
            <span className="stat-value">
              €{(statistics.today.new_orders * statistics.summary.average_order_value).toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      <div className="section-card">
        <h3>Métricas de Conversión</h3>
        <div className="conversion-stats">
          <div className="metric">
            <span className="metric-name">Tasa de Conversión</span>
            <span className="metric-value">{conversionRate}%</span>
          </div>
          <div className="metric">
            <span className="metric-name">Órdenes Rechazadas</span>
            <span className="metric-value">{statistics.orders.rejected}</span>
          </div>
          <div className="metric">
            <span className="metric-name">Orden Valor Medio</span>
            <span className="metric-value">€{statistics.summary.average_order_value.toFixed(2)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminStats({ statistics }) {
  if (!statistics) return <div>Cargando...</div>;

  return (
    <div className="section-container">
      <h2>Estadísticas Detalladas</h2>

      <div className="stats-table">
        <div className="stats-row">
          <span className="stats-label">Total Usuarios</span>
          <span className="stats-value">{statistics.summary.total_users}</span>
        </div>
        <div className="stats-row">
          <span className="stats-label">Órdenes Completadas</span>
          <span className="stats-value">{statistics.orders.completed}</span>
        </div>
        <div className="stats-row">
          <span className="stats-label">Órdenes Pendientes</span>
          <span className="stats-value">{statistics.orders.pending}</span>
        </div>
        <div className="stats-row">
          <span className="stats-label">Ingresos Totales</span>
          <span className="stats-value">€{statistics.summary.total_revenue.toFixed(2)}</span>
        </div>
        <div className="stats-row">
          <span className="stats-label">Ticket Promedio</span>
          <span className="stats-value">€{statistics.summary.average_order_value.toFixed(2)}</span>
        </div>
        <div className="stats-row alert-row">
          <span className="stats-label">Alertas Fraude</span>
          <span className="stats-value">{statistics.summary.fraud_alerts}</span>
        </div>
      </div>
    </div>
  );
}
