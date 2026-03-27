import React, { useState } from "react";
import "./ProfileModal.css";
import { updateProfileAlias } from "../lib/api";
import { showSuccess } from "./Toast";
import LinkRequestsList from "./LinkRequestsList";

export default function ProfileModal({ isOpen, onClose, user, onLogout, onUserUpdate }) {
  const [activeTab, setActiveTab] = useState('info');
  const [aliasInput, setAliasInput] = useState('');
  const [aliasSaving, setAliasSaving] = useState(false);
  const [aliasMessage, setAliasMessage] = useState('');

  React.useEffect(() => {
    setAliasInput(user?.alias || '');
    setAliasMessage('');
  }, [user?.alias, isOpen]);

  const realName = user?.name || 'Usuario';
  const visibleAlias = user?.alias ? `@${user.alias}` : null;
  const roleLabel = user?.role === 'admin'
    ? 'Administrador'
    : user?.role === 'child'
      ? 'Menor'
      : user?.isAdult
        ? 'Adulto'
        : 'Cliente';

  // Calcular fecha de miembro
  const formatMemberDate = (dateString) => {
    if (!dateString) return 'Información no disponible';
    try {
      const date = new Date(dateString);
      return new Intl.DateTimeFormat('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }).format(date);
    } catch (e) {
      return 'Información no disponible';
    }
  };

  const tabs = [
    { id: 'info', label: 'Información', icon: 'ℹ︎', description: 'Tus datos personales' },
    { id: 'alias', label: 'Alias', icon: '👤', description: 'Tu alias personalizado' },
    { id: 'stats', label: 'Estadísticas', icon: '📊', description: 'Tu actividad' },
    { id: 'achievements', label: 'Logros', icon: '🏆', description: 'Tus logros' },
    { id: 'family', label: 'Familia', icon: '👨‍👩‍👧', description: 'Vinculación' }
  ];

  async function handleSaveAlias() {
    const normalizedAlias = aliasInput.trim();

    if (normalizedAlias && !/^[A-Za-z0-9_.-]{3,30}$/.test(normalizedAlias)) {
      setAliasMessage('El alias debe tener 3-30 caracteres (letras, números, _ . -)');
      return;
    }

    setAliasSaving(true);
    setAliasMessage('');

    try {
      const result = await updateProfileAlias(normalizedAlias || null);
      const savedAlias = result?.user?.alias || null;
      onUserUpdate && onUserUpdate({ alias: savedAlias });
      setAliasInput(savedAlias || '');
      setAliasMessage(savedAlias ? 'Alias guardado correctamente' : 'Alias eliminado correctamente');
    } catch (error) {
      setAliasMessage(error.message || 'No se pudo guardar el alias');
    } finally {
      setAliasSaving(false);
    }
  }

  const userStats = {
    totalOrders: 24,
    favoriteProduct: "Café con leche",
    totalSpent: 127.50,
    memberSince: "2025-12-01"
  };

  const achievements = [
    { id: 1, name: "Primer pedido", icon: "🎉", unlocked: true },
    { id: 2, name: "Coffee lover", icon: "☕", unlocked: true },
    { id: 3, name: "Fiel cliente", icon: "⭐", unlocked: true },
    { id: 4, name: "Eco-friendly", icon: "🌱", unlocked: false }
  ];

  if (!isOpen) return null;

  return (
    <div className="profile-modal-overlay" onClick={onClose}>
      <div className="profile-modal" onClick={e => e.stopPropagation()}>
        <div className="profile-modal-header">
          <h3>👤 Mi perfil</h3>
          <button className="close-btn" onClick={onClose} aria-label="Cerrar perfil">
            ✕
          </button>
        </div>

        <div className="profile-modal-content">
          {/* User Avatar & Basic Info */}
          <div className="profile-hero">
            <div className="profile-avatar">
              {realName?.[0]?.toUpperCase() || 'U'}
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
                  onClick={() => setActiveTab('alias')}
                >
                  ✎
                </button>
              </div>
            </div>
            <p className="profile-role">{roleLabel}</p>
          </div>

          <div className="profile-tab-content">
            {activeTab === 'info' && (
              <div className="info-tab">
                <div className="info-item">
                  <span className="info-label">Nombre real:</span>
                  <span className="info-value info-value-strong">{realName}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Email:</span>
                  <span className="info-value">{user?.email || 'No disponible'}</span>
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
              </div>
            )}

            {activeTab === 'alias' && (
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
                      onClick={handleSaveAlias}
                      disabled={aliasSaving}
                    >
                      {aliasSaving ? '⟳' : '✓'}
                    </button>
                  </div>
                  <p className="alias-help">3-30 caracteres: letras, números, guiones y puntos</p>
                  {aliasMessage && <p className="alias-message">{aliasMessage}</p>}
                </div>
              </div>
            )}

            {activeTab === 'stats' && (
              <div className="stats-tab">
                <div className="stat-card">
                  <div className="stat-icon">📊</div>
                  <div className="stat-info">
                    <div className="stat-value">{userStats.totalOrders}</div>
                    <div className="stat-label">Pedidos realizados</div>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon">☕</div>
                  <div className="stat-info">
                    <div className="stat-value">{userStats.favoriteProduct}</div>
                    <div className="stat-label">Producto favorito</div>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon">💰</div>
                  <div className="stat-info">
                    <div className="stat-value">{userStats.totalSpent.toFixed(2)} €</div>
                    <div className="stat-label">Total gastado</div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'achievements' && (
              <div className="achievements-tab">
                {achievements.map(achievement => (
                  <div
                    key={achievement.id}
                    className={`achievement-item ${achievement.unlocked ? 'unlocked' : 'locked'}`}
                  >
                    <div className="achievement-icon">{achievement.icon}</div>
                    <div className="achievement-info">
                      <div className="achievement-name">{achievement.name}</div>
                      <div className="achievement-status">
                        {achievement.unlocked ? 'Desbloqueado' : 'Bloqueado'}
                      </div>
                    </div>
                    {achievement.unlocked && <div className="achievement-check">✓</div>}
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'family' && (
              <div className="family-tab">
                <div className="family-section">
                  <p className="section-description">
                    Vincula familiares menores de edad a tu cuenta para gestionar sus pedidos.
                  </p>

                  {user?.parentToken ? (
                    <div className="token-card">
                      <div className="token-header">
                        <span className="token-icon">🎫</span>
                        <span className="token-label">Tu Token de Vinculación</span>
                      </div>
                      <div className="token-value">{user.parentToken}</div>
                      <button
                        className="copy-token-btn"
                        onClick={() => {
                          navigator.clipboard.writeText(user.parentToken);
                          showSuccess('Token copiado al portapapeles');
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
                  ) : (
                    <div className="no-token-card">
                      <div className="no-token-icon">👶</div>
                      <p className="no-token-message">
                        {user?.isAdult === false
                          ? 'Eres menor de edad. Solicita el token de vinculación a tu padre/madre/tutor para vincular tu cuenta.'
                          : 'El token de vinculación familiar está disponible solo para usuarios mayores de edad.'}
                      </p>
                    </div>
                  )}

                  {user?.isAdult && user?.role !== 'admin' && (
                    <div className="linked-users" style={{ marginTop: 16 }}>
                      <h5 className="linked-title">Solicitudes pendientes</h5>
                      <LinkRequestsList />
                    </div>
                  )}

                  <div className="linked-users">
                    <h5 className="linked-title">Familiares vinculados</h5>
                    <p className="linked-empty">Aún no tienes familiares vinculados</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <nav className="profile-bottom-nav" aria-label="Opciones del perfil">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`profile-nav-btn ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
              title={tab.description}
              aria-label={tab.label}
            >
              <span className="profile-nav-icon" aria-hidden="true">{tab.icon}</span>
              <span className="profile-nav-label">{tab.label}</span>
            </button>
          ))}
        </nav>
      </div>
    </div>
  );
}