import React from "react";

export default function AdminSecurityLog({ fraudLog }) {
  return (
    <div className="section-container">
      <h2>Log de Fraude</h2>
      {fraudLog.length === 0 ? (
        <div className="empty-state">No hay alertas de fraude registradas</div>
      ) : (
        <div className="fraud-table">
          {fraudLog.map((log, idx) => (
            <div key={idx} className={`fraud-row severity-${log.severity || "low"}`}>
              <div className="fraud-user">{log.user_name || "Usuario"}</div>
              <div className="fraud-action">{log.action_type}</div>
              <div className="fraud-severity">{log.severity}</div>
              <div className="fraud-time">{new Date(log.created_at).toLocaleString()}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
