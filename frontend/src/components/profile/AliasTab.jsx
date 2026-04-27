import React from "react";

export default function AliasTab({ aliasInput, aliasMessage, aliasSaving, onSaveAlias, setAliasInput }) {
  return (
    <div className="alias-tab">
      <div className="alias-card">
        <p className="alias-description">Crea un alias personalizado para la app. Siempre se mostrará tu nombre real.</p>

        <label className="alias-label" htmlFor="profile-alias-input">Alias (opcional)</label>
        <div className="alias-input-row">
          <input
            id="profile-alias-input"
            className="alias-input"
            type="text"
            placeholder="Ej: cafe_alejandro"
            value={aliasInput}
            onChange={(e) => setAliasInput(e.target.value)}
            maxLength={30}
          />
          <button
            className="alias-save-btn"
            type="button"
            onClick={onSaveAlias}
            disabled={aliasSaving}
          >
            {aliasSaving ? "⟳" : "✓"}
          </button>
        </div>
        <p className="alias-help">3-30 caracteres: letras, números, guiones y puntos</p>
        {aliasMessage && <p className="alias-message">{aliasMessage}</p>}
      </div>
    </div>
  );
}
