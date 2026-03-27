import React from "react";
import { showInfo } from "./Toast";

export default function SideMenu({ onLogout, onShowProfile, onShowLinkParent }) {
  const closeMenu = () => {
    const sideMenu = document.getElementById('side-menu');
    const overlay = document.getElementById('overlay');
    sideMenu?.classList.add('hidden');
    overlay?.classList.add('hidden');
  };

  const handleShowProfile = () => {
    onShowProfile?.();
    closeMenu();
  };

  const handleShowLinkParent = () => {
    onShowLinkParent?.();
    closeMenu();
  };

  const handleLogout = () => {
    onLogout?.();
    closeMenu();
  };
  return (
    <nav id="side-menu" className="side-menu hidden" aria-label="Menú principal" aria-hidden="true">
      <div className="menu-header">
        <div className="avatar" aria-hidden="true">C</div>
        <div className="profile-info">
          <div id="menu-username" className="profile-name">Invitado</div>
          <div className="profile-subtitle muted">Mi cuenta</div>
        </div>
      </div>
      <ul className="menu-list" role="list">
        <li><button className="menu-item" type="button" onClick={handleShowProfile}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{display: 'inline-block', verticalAlign: 'middle', marginRight: '8px'}}>
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
            <circle cx="12" cy="7" r="4"></circle>
          </svg>
          Perfil
        </button></li>
        <li><button className="menu-item" type="button" onClick={handleShowLinkParent}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{display: 'inline-block', verticalAlign: 'middle', marginRight: '8px'}}>
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
            <circle cx="9" cy="7" r="4"></circle>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
          </svg>
          Vincular Familiar
        </button></li>
        <li><button className="menu-item" type="button" onClick={() => { showInfo('Funcionalidad de Favoritos próximamente'); closeMenu(); }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{display: 'inline-block', verticalAlign: 'middle', marginRight: '8px'}}>
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
          </svg>
          Favoritos
        </button></li>
        <li>
          <hr style={{ margin: "12px 0", border: "none", borderTop: "1px solid #f4f4f5" }} />
        </li>
        <li><button id="logout-menu-btn" className="menu-item menu-item-danger" type="button" onClick={handleLogout}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{display: 'inline-block', verticalAlign: 'middle', marginRight: '8px'}}>
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
            <polyline points="16 17 21 12 16 7"></polyline>
            <line x1="21" y1="12" x2="9" y2="12"></line>
          </svg>
          Cerrar sesión
        </button></li>
      </ul>
    </nav>
  );
}
