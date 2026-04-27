import React from "react";
import LinkRequestsList from "../LinkRequestsList";
import { showSuccess } from "../Toast";

function TokenCard({ tokenPadre }) {
  return (
    <div className="token-card">
      <div className="token-header">
        <span className="token-icon">🎫</span>
        <span className="token-label">Tu Token de Vinculación</span>
      </div>
      <div className="token-value">{tokenPadre}</div>
      <button
        className="copy-token-btn"
        onClick={() => {
          navigator.clipboard.writeText(tokenPadre);
          showSuccess("Token copiado al portapapeles");
        }}
      >
        📋 Copiar token
      </button>
      <div className="token-info">
        <p>✅ Comparte este token con familiares menores de edad</p>
        <p>✅ Ellos deben introducirlo al crear su cuenta</p>
        <p>✅ Podrás aprobar y gestionar sus pedidos</p>
      </div>
    </div>
  );
}

function NoTokenCard({ isAdult }) {
  return (
    <div className="no-token-card">
      <div className="no-token-icon">👶</div>
      <p className="no-token-message">
        {isAdult === false
          ? "Eres menor de edad. Solicita el token de vinculación a tu padre/madre/tutor para vincular tu cuenta."
          : "El token de vinculación familiar está disponible solo para usuarios mayores de edad."}
      </p>
    </div>
  );
}

function LinkedCard({ link }) {
  const relative = link.child || link.parent;
  const statusLabel = link.status === "active"
    ? "Activo"
    : link.status === "pending"
      ? "Pendiente"
      : link.status;

  return (
    <div className="linked-card">
      <div className="linked-card-main">
        <div className="linked-card-name">
          {relative?.name || "Usuario"}
        </div>
        <div className="linked-card-email">
          {relative?.email || "Sin email disponible"}
        </div>
      </div>
      <div className="linked-card-meta">
        <span className={`linked-status linked-status-${link.status}`}>
          {statusLabel}
        </span>
        {typeof link.spending_limit !== "undefined" && link.child && (
          <span className="linked-limit">
            Limite: {Number(link.spending_limit).toFixed(2)} EUR
          </span>
        )}
      </div>
    </div>
  );
}

function LinkedUsers({ familyLinks, familyLoading, familyTitle, onRefresh }) {
  return (
    <div className="linked-users">
      <div className="linked-header">
        <h5 className="linked-title">{familyTitle}</h5>
        <button
          type="button"
          className="linked-refresh-btn"
          onClick={onRefresh}
          disabled={familyLoading}
        >
          {familyLoading ? "Cargando..." : "Actualizar"}
        </button>
      </div>

      {familyLoading ? (
        <p className="linked-empty">Cargando familiares vinculados...</p>
      ) : familyLinks.length === 0 ? (
        <p className="linked-empty">Aún no tienes familiares vinculados</p>
      ) : (
        <div className="linked-list">
          {familyLinks.map((link) => (
            <LinkedCard key={link.id} link={link} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function FamilyTab({ familyLinks, familyLoading, familyTitle, onRefresh, user }) {
  return (
    <div className="family-tab">
      <div className="family-section">
        <p className="section-description">
          Vincula familiares menores de edad a tu cuenta para gestionar sus pedidos.
        </p>

        {user?.tokenPadre ? (
          <TokenCard tokenPadre={user.tokenPadre} />
        ) : (
          <NoTokenCard isAdult={user?.isAdult} />
        )}

        {user?.isAdult && user?.role !== "admin" && (
          <div className="linked-users" style={{ marginTop: 16 }}>
            <h5 className="linked-title">Solicitudes pendientes</h5>
            <LinkRequestsList onChange={onRefresh} />
          </div>
        )}

        <LinkedUsers
          familyLinks={familyLinks}
          familyLoading={familyLoading}
          familyTitle={familyTitle}
          onRefresh={onRefresh}
        />
      </div>
    </div>
  );
}
