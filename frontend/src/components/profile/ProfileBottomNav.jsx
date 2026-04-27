import React from "react";

export default function ProfileBottomNav({ activeTab, onTabChange, tabs }) {
  return (
    <nav className="profile-bottom-nav" aria-label="Opciones del perfil">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          className={`profile-nav-btn ${activeTab === tab.id ? "active" : ""}`}
          onClick={() => onTabChange(tab.id)}
          title={tab.description}
          aria-label={tab.label}
        >
          <span className="profile-nav-icon" aria-hidden="true">{tab.icon}</span>
          <span className="profile-nav-label">{tab.label}</span>
        </button>
      ))}
    </nav>
  );
}
