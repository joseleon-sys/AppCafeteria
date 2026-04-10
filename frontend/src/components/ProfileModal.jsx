import React, { useState } from "react";
import "./ProfileModal.css";
import { getMyChildrenLinks, getMyParentLinks, updateProfile } from "../lib/api";
import { showError, showSuccess } from "./Toast";
import LinkRequestsList from "./LinkRequestsList";
import { buildProfileStatsFromOrders, fetchOrderHistoryForUser } from "../lib/orderService";

export default function ProfileModal({ isOpen, onClose, user, onLogout, onUserUpdate }) {
  const [activeTab, setActiveTab] = useState('info');
  const [aliasInput, setAliasInput] = useState('');
  const [specialCodeInput, setSpecialCodeInput] = useState('');
  const [aliasSaving, setAliasSaving] = useState(false);
  const [aliasMessage, setAliasMessage] = useState('');
  const [profileStats, setProfileStats] = useState(() => buildProfileStatsFromOrders([], user));
  const [familyLinks, setFamilyLinks] = useState([]);
  const [familyLoading, setFamilyLoading] = useState(false);

  React.useEffect(() => {
    setAliasInput(user?.alias || '');
    setSpecialCodeInput(user?.specialCode || '');
    setAliasMessage('');
  }, [user?.alias, user?.specialCode, isOpen]);

  React.useEffect(() => {
    if (!isOpen || !user) return;

    let cancelled = false;

    const loadProfileData = async () => {
      try {
        const orders = await fetchOrderHistoryForUser(user);
        if (!cancelled) {
          setProfileStats(buildProfileStatsFromOrders(orders, user));
        }
      } catch (error) {
        console.error('Error cargando estadisticas de perfil:', error);
        if (!cancelled) {
          setProfileStats(buildProfileStatsFromOrders([], user));
        }
        showError(error.message || 'No se pudieron cargar las estadisticas del perfil');
      }
    };

    loadProfileData();

    return () => {
      cancelled = true;
    };
  }, [isOpen, user]);

  const loadFamilyData = React.useCallback(async () => {
    if (!user || !isOpen) return;

    setFamilyLoading(true);
    try {
      if (user?.isAdult && user?.role !== 'admin') {
        const data = await getMyChildrenLinks();
        setFamilyLinks(data.children || []);
      } else {
        const data = await getMyParentLinks();
        setFamilyLinks(data.parents || []);
      }
    } catch (error) {
      console.error('Error cargando familiares vinculados:', error);
      setFamilyLinks([]);
      showError(error.message || 'No se pudieron cargar los familiares vinculados');
    } finally {
      setFamilyLoading(false);
    }
  }, [isOpen, user]);

  React.useEffect(() => {
    if (activeTab !== 'family' || !isOpen || !user) return;
    loadFamilyData();
  }, [activeTab, isOpen, user, loadFamilyData]);

  const realName = user?.name || 'Usuario';
  const visibleAlias = user?.alias ? `@${user.alias}` : null;
  const roleLabel = user?.role === 'admin'
    ? 'Administrador'
    : user?.role === 'child'
      ? 'Menor'
      : user?.isAdult
        ? 'Adulto'
        : 'Cliente';
  const familyTitle = user?.isAdult && user?.role !== 'admin' ? 'Familiares vinculados' : 'Padres y tutores vinculados';

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
      const result = await updateProfile(normalizedAlias || null, user?.specialCode || null);
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

  async function handleSaveSpecialCode() {
    if (!user?.isAdult) {
      setAliasMessage('El código especial solo está disponible para perfiles Adulto');
      return;
    }

    setAliasSaving(true);
    setAliasMessage('');

    try {
      const result = await updateProfile(user?.alias || null, specialCodeInput.trim() || null);
      const savedSpecialCode = result?.user?.specialCode || null;
      onUserUpdate && onUserUpdate({ specialCode: savedSpecialCode });
      setSpecialCodeInput(savedSpecialCode || '');
      setAliasMessage(savedSpecialCode ? 'Código especial guardado correctamente' : 'Código especial desactivado correctamente');
    } catch (error) {
      setAliasMessage(error.message || 'No se pudo guardar el código especial');
    } finally {
      setAliasSaving(false);
    }
  }

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
                        onClick={handleSaveSpecialCode}
                        disabled={aliasSaving}
                      >
                        {aliasSaving ? '⟳' : '✓'}
                      </button>
                    </div>
                    <p className="alias-help">
                      {user?.specialCode
                        ? 'Si vuelves a guardar ayuda, se desactiva el modo especial.'
                        : 'Déjalo vacío o escribe ayuda.'}
                    </p>
                    {aliasMessage && <p className="alias-message">{aliasMessage}</p>}
                  </div>
                )}
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
                      <LinkRequestsList onChange={loadFamilyData} />
                    </div>
                  )}

                  <div className="linked-users">
                    <div className="linked-header">
                      <h5 className="linked-title">{familyTitle}</h5>
                      <button
                        type="button"
                        className="linked-refresh-btn"
                        onClick={loadFamilyData}
                        disabled={familyLoading}
                      >
                        {familyLoading ? 'Cargando...' : 'Actualizar'}
                      </button>
                    </div>

                    {familyLoading ? (
                      <p className="linked-empty">Cargando familiares vinculados...</p>
                    ) : familyLinks.length === 0 ? (
                      <p className="linked-empty">Aún no tienes familiares vinculados</p>
                    ) : (
                      <div className="linked-list">
                        {familyLinks.map((link) => {
                          const relative = link.child || link.parent;
                          const statusLabel = link.status === 'active'
                            ? 'Activo'
                            : link.status === 'pending'
                              ? 'Pendiente'
                              : link.status;

                          return (
                            <div key={link.id} className="linked-card">
                              <div className="linked-card-main">
                                <div className="linked-card-name">
                                  {relative?.name || 'Usuario'}
                                </div>
                                <div className="linked-card-email">
                                  {relative?.email || 'Sin email disponible'}
                                </div>
                              </div>
                              <div className="linked-card-meta">
                                <span className={`linked-status linked-status-${link.status}`}>
                                  {statusLabel}
                                </span>
                                {typeof link.spending_limit !== 'undefined' && link.child && (
                                  <span className="linked-limit">
                                    Limite: {Number(link.spending_limit).toFixed(2)} EUR
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
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
