import React from "react";

export default function ProfileHero({ realName, roleLabel, visibleAlias, onEditAlias }) {
  return (
    <div className="profile-hero">
      <div className="profile-avatar">
        {realName?.[0]?.toUpperCase() || "U"}
      </div>
      <div className="profile-name-section">
        <div className="profile-name-row">
          <div className="profile-name-content">
            <h4>{realName}</h4>
            {visibleAlias && <small className="profile-alias-small">{visibleAlias}</small>}
          </div>
          <button
            className="alias-edit-btn"
            title="Editar alias"
            onClick={onEditAlias}
          >
            ✎
          </button>
        </div>
      </div>
      <p className="profile-role">{roleLabel}</p>
    </div>
  );
}
