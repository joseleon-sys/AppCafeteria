import React from "react";
import { formatMemberDate } from "../../hooks/useProfileModalData";

export default function InfoTab({
  aliasMessage,
  aliasSaving,
  onSaveSpecialCode,
  realName,
  setSpecialCodeInput,
  specialCodeInput,
  user,
}) {
  return (
    <div className="info-tab">
      <div className="info-item">
        <span className="info-label">Nombre real:</span>
        <span className="info-value info-value-strong">{realName}</span>
      </div>
      <div className="info-item">
        <span className="info-label">Email:</span>
        <span className="info-value">{user?.email || "No disponible"}</span>
      </div>
      <div className="info-item">
        <span className="info-label">Miembro desde:</span>
        <span className="info-value">{formatMemberDate(user?.created_at)}</span>
      </div>
      <div className="info-item">
        <span className="info-label">Estado:</span>
        <span className="info-value">
          <span className="status-badge active">Activo</span>
        </span>
      </div>
      <div className="info-item">
        <span className="info-label">Notificaciones:</span>
        <span className="info-value">
          <label className="switch">
            <input type="checkbox" defaultChecked />
            <span className="slider"></span>
          </label>
        </span>
      </div>
      {user?.isAdult && (
        <div className="alias-card" style={{ marginTop: 20 }}>
          <label className="alias-label" htmlFor="profile-special-code-input">Código especial</label>
          <div className="alias-input-row">
            <input
              id="profile-special-code-input"
              className="alias-input"
              type="text"
              placeholder="ayuda"
              value={specialCodeInput}
              onChange={(e) => setSpecialCodeInput(e.target.value)}
              maxLength={50}
            />
            <button
              className="alias-save-btn"
              type="button"
              onClick={onSaveSpecialCode}
              disabled={aliasSaving}
            >
              {aliasSaving ? "⟳" : "✓"}
            </button>
          </div>
          <p className="alias-help">
            {user?.specialCode
              ? "Si vuelves a guardar ayuda, se desactiva el modo especial."
              : "Déjalo vacío o escribe ayuda."}
          </p>
          {aliasMessage && <p className="alias-message">{aliasMessage}</p>}
        </div>
      )}
    </div>
  );
}
