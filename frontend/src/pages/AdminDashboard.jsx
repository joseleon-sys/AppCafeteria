import React, { useEffect, useState } from "react";
import {
  getAllProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  getAllUsers,
  blockUser,
  updateUser,
  deleteUser,
  getAdminStatistics,
  getFraudLog,
  getParentChildOrders
} from "../lib/api";
import "./AdminDashboard.css";

const MENU_ITEMS = [
  { key: "dashboard", label: "Dashboard", icon: "📊" },
  { key: "estadisticas", label: "Estadísticas", icon: "📈" },
  { key: "productos", label: "Productos", icon: "🛍️" },
  { key: "usuarios", label: "Usuarios", icon: "👥" },
  { key: "fraude", label: "Fraude Log", icon: "⚠️" },
  { key: "kds", label: "Kitchen Display", icon: "🖥️" },
];

export default function AdminDashboard({ onLogout }) {
  const [section, setSection] = useState("dashboard");
  const [products, setProducts] = useState([]);
  const [users, setUsers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [statistics, setStatistics] = useState(null);
  const [fraudLog, setFraudLog] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editProduct, setEditProduct] = useState(null);
  const [blockingUser, setBlockingUser] = useState(null);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: 0,
    category: 'cafes',
    active: true,
    image_url: '',
  });

  // Cargar datos al montar
  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const [productsRes, statsRes, fraudRes, usersRes, ordersRes] = await Promise.all([
        getAllProducts(),
        fetchStatistics(),
        fetchFraudLog(),
        fetchUsers(),
        fetchOrders(),
      ]);
      
      setProducts(productsRes.data || []);
      setStatistics(statsRes);
      setFraudLog(fraudRes || []);
      setUsers(usersRes || []);
      setOrders(ordersRes || []);
    } catch (error) {
      console.error('Error cargando datos:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStatistics = async () => {
    try {
      return await getAdminStatistics();
    } catch (err) {
      console.error('Error en estadísticas:', err);
      return generateMockStats();
    }
  };

  const fetchFraudLog = async () => {
    try {
      const response = await getFraudLog();
      return response.logs || [];
    } catch (err) {
      console.error('Error en fraude log:', err);
      return [];
    }
  };

  const fetchUsers = async () => {
    try {
      const data = await getAllUsers();
      console.log('📥 Usuarios cargados:', data);

      return data.users || [];
    } catch (err) {
      console.error('Error en usuarios:', err);
      return [];
    }
  };

  const fetchOrders = async () => {
    try {
      const data = await getParentChildOrders({ limit: 50 });
      return data.orders || [];
    } catch (err) {
      console.error('Error en órdenes:', err);
      return [];
    }
  };

  const generateMockStats = () => ({
    summary: {
      total_users: 156,
      total_orders: 1240,
      total_revenue: 3480.50,
      fraud_alerts: 12,
      average_order_value: 2.81
    },
    users: { adults: 42, children: 114, admins: 2 },
    orders: { completed: 1200, pending: 30, rejected: 10 },
    today: { new_orders: 45, new_users: 8, fraud_incidents: 2 }
  });

  const handleLogout = () => {
    localStorage.removeItem('cafeteria_user');
    localStorage.removeItem('cafeteria_token');
    if (onLogout) onLogout();
  };

  const handleEditProduct = (product) => {
    setEditProduct(product);
    setFormData({
      name: product.name,
      description: product.description || '',
      price: product.price,
      category: product.category,
      active: product.active !== false,
      image_url: product.image_url || '',
    });
  };

  const handleSave = async () => {
    try {
      if (editProduct) {
        await updateProduct(editProduct.id, formData);
      } else {
        await createProduct(formData);
      }
      handleCancel();
      await loadDashboardData();
    } catch (error) {
      console.error('Error al guardar:', error);
    }
  };

  const handleDeleteProduct = async (id) => {
    if (window.confirm('¿Eliminar este producto?')) {
      try {
        await deleteProduct(id, false);
        await loadDashboardData();
      } catch (error) {
        console.error('Error al eliminar:', error);
      }
    }
  };

  const handleCancel = () => {
    setEditProduct(null);
    setFormData({ name: '', description: '', price: 0, category: 'cafes', active: true, image_url: '' });
  };

  const handleBlockUser = async (userId, shouldBlock) => {
    try {
      await blockUser(userId, shouldBlock);
      await loadDashboardData();
      setBlockingUser(null);
    } catch (error) {
      console.error('Error al bloquear usuario:', error);
      alert(error.message || 'Error al procesar la solicitud');
    }
  };

  const handleEditUser = (user) => {
    setEditingUser({
      ...user,
      editName: user.name,
      editEmail: user.email,
      editRole: user.role
    });
  };

  const handleSaveUser = async () => {
    if (!editingUser.editName.trim() || !editingUser.editEmail.trim()) {
      alert('Nombre y email son requeridos');
      return;
    }

    try {
      await updateUser(editingUser.id, {
        name: editingUser.editName,
        email: editingUser.editEmail,
        role: editingUser.editRole
      });
      await loadDashboardData();
      setEditingUser(null);
      alert('Usuario actualizado correctamente');
    } catch (error) {
      console.error('Error al actualizar usuario:', error);
      alert(error.message || 'Error al procesar la solicitud');
    }
  };

  const handleDeleteUser = async (userId, userName) => {
    if (!window.confirm(`¿Estás seguro de que deseas eliminar a ${userName}? Esta acción no se puede deshacer.`)) {
      return;
    }

    try {
      await deleteUser(userId);
      await loadDashboardData();
      alert('Usuario eliminado correctamente');
    } catch (error) {
      console.error('Error al eliminar usuario:', error);
      alert(error.message || 'Error al procesar la solicitud');
    }
  };

  const renderDashboard = () => {
    if (!statistics) return <div>Cargando estadísticas...</div>;

    return (
      <div className="dashboard-grid">
        {/* KPI Cards */}
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
          <div className="kpi-detail">Ticket promedio: €{statistics.summary.average_order_value.toFixed(2)}</div>
        </div>

        <div className="kpi-card alert">
          <div className="kpi-label">Alertas de Fraude</div>
          <div className="kpi-value">{statistics.summary.fraud_alerts}</div>
          <div className="kpi-detail">{statistics.today.fraud_incidents} hoy</div>
        </div>

        {/* Hoy */}
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
              <span className="stat-value">€{(statistics.today.new_orders * statistics.summary.average_order_value).toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Conversión */}
        <div className="section-card">
          <h3>Métricas de Conversión</h3>
          <div className="conversion-stats">
            <div className="metric">
              <span className="metric-name">Tasa de Conversión</span>
              <span className="metric-value">{((statistics.orders.completed / statistics.summary.total_users) * 100).toFixed(1)}%</span>
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
  };

  const renderEstadisticas = () => {
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
  };

  const renderProductos = () => {
    return (
      <div className="section-container">
        <div className="section-header">
          <h2>Gestión de Productos</h2>
          <button 
            className="btn-primary"
            onClick={() => {
              setEditProduct(null);
              setFormData({ name: '', description: '', price: 0, category: 'cafes', active: true, image_url: '' });
            }}
          >
            Nuevo Producto
          </button>
        </div>

        <div className="products-grid">
          {products.map(p => (
            <div key={p.id} className={`product-card ${!p.active ? 'inactive' : ''}`}>
              {p.image_url && <img src={p.image_url} alt={p.name} className="product-image" />}
              <div className="product-info">
                <h4>{p.name}</h4>
                <p>{p.description}</p>
                <div className="product-meta">
                  <span className="price">€{p.price.toFixed(2)}</span>
                  <span className={`badge ${p.active ? 'active' : 'inactive'}`}>
                    {p.active ? 'Activo' : 'Inactivo'}
                  </span>
                </div>
              </div>
              <div className="product-actions">
                <button className="btn-edit" onClick={() => handleEditProduct(p)}>Editar</button>
                <button className="btn-delete" onClick={() => handleDeleteProduct(p.id)}>Eliminar</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderFraud = () => {
    return (
      <div className="section-container">
        <h2>Log de Fraude</h2>
        {fraudLog.length === 0 ? (
          <div className="empty-state">No hay alertas de fraude registradas</div>
        ) : (
          <div className="fraud-table">
            {fraudLog.map((log, idx) => (
              <div key={idx} className={`fraud-row severity-${log.severity || 'low'}`}>
                <div className="fraud-user">{log.user_name || 'Usuario'}</div>
                <div className="fraud-action">{log.action_type}</div>
                <div className="fraud-severity">{log.severity}</div>
                <div className="fraud-time">{new Date(log.created_at).toLocaleString()}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderUsuarios = () => {
    return (
      <div className="section-container">
        <h2>Usuarios Registrados</h2>
        
        {users.length === 0 ? (
          <div className="empty-state">No hay usuarios registrados aún</div>
        ) : (
          <div className="users-table">
            <div className="users-header">
              <div className="users-col-email">Email</div>
              <div className="users-col-name">Nombre</div>
              <div className="users-col-role">Rol</div>
              <div className="users-col-date">Registrado</div>
              <div className="users-col-count">Hijos</div>
              <div className="users-col-actions">Acciones</div>
            </div>
            
            {users.map(user => (
              <div key={user.id} className={`users-row ${user.blocked ? 'blocked' : ''}`}>
                <div className="users-col-email">{user.email}</div>
                <div className="users-col-name">{user.name}</div>
                <div className="users-col-role">
                  <span className={`role-badge role-${user.role}`}>
                    {user.role === 'admin' && 'Admin'}
                    {user.role === 'parent' && 'Padre'}
                    {user.role === 'child' && 'Hijo'}
                    {user.role === 'customer' && 'Cliente'}
                  </span>
                </div>
                <div className="users-col-date">
                  {new Date(user.created_at).toLocaleDateString('es-ES')}
                </div>
                <div className="users-col-count">{user.children_count || 0}</div>
                <div className="users-col-actions">
                  <button 
                    className="btn-edit"
                    onClick={() => handleEditUser(user)}
                    style={{marginRight: 8}}
                  >
                    Editar
                  </button>
                  <button 
                    className={`btn-danger ${user.blocked ? 'danger-unblock' : ''}`}
                    onClick={() => setBlockingUser(user)}
                    style={{marginRight: 8}}
                  >
                    {user.blocked ? 'Desbloquear' : 'Bloquear'}
                  </button>
                  <button 
                    className="btn-delete"
                    onClick={() => handleDeleteUser(user.id, user.name)}
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderKDS = () => {
    // Usar usuarios reales como base para órdenes de prueba
    const testOrders = users
      .filter(u => u.role === 'child')
      .slice(0, 3) // Primeros 3 niños
      .map((user, idx) => ({
        id: user.id,
        child_name: user.name,
        child_id: user.id,
        status: idx % 2 === 0 ? 'approved' : 'pending_approval',
        created_at: new Date(Date.now() - idx * 10 * 60000).toISOString(),
        items: [
          { product_name: 'Café con leche', quantity: 1 },
          { product_name: products[idx % products.length]?.name || 'Producto', quantity: 1 }
        ],
        allergens: [
          'Gluten',
          'Lácteos',
          'Frutos secos'
        ].slice(0, idx % 3 + 1),
        notes: idx === 0 ? 'Sin azúcar en el café' : ''
      }));

    const pendingOrders = (orders.length > 0 ? orders : testOrders)
      .filter(o => o.status === 'pending_approval' || o.status === 'approved');
    
    return (
      <div style={{ 
        position: 'fixed', 
        inset: 0, 
        background: '#0f1419', 
        marginLeft: 260, 
        padding: '32px', 
        overflow: 'auto',
        display: 'flex',
        flexDirection: 'column'
      }}>
        <div style={{ marginBottom: 24, paddingRight: 20 }}>
          <h1 style={{ margin: 0, color: '#4a9eff', fontSize: 36, fontWeight: 700 }}>
            Kitchen Display System
          </h1>
          <p style={{ color: '#888', margin: '8px 0 0 0', fontSize: 16 }}>
            {pendingOrders.length} órdenes {pendingOrders.length === 1 ? 'pendiente' : 'pendientes'}
          </p>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
          gap: '24px',
          autoRows: 'max-content'
        }}>
          {pendingOrders.length === 0 ? (
            <div style={{ 
              gridColumn: '1 / -1',
              padding: 60,
              textAlign: 'center',
              color: '#666',
              fontSize: 18
            }}>
              No hay órdenes pendientes
            </div>
          ) : (
            pendingOrders.map(order => (
              <div key={order.id} style={{
                background: 'linear-gradient(135deg, #1a1f2e 0%, #242d3d 100%)',
                border: `4px solid ${order.status === 'approved' ? '#27ae60' : '#f39c12'}`,
                borderRadius: 12,
                padding: 20,
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4)'
              }}>
                {/* Status Badge */}
                <div style={{
                  background: order.status === 'approved' ? '#27ae60' : '#f39c12',
                  color: 'white',
                  padding: '10px 16px',
                  borderRadius: 8,
                  fontWeight: 700,
                  textAlign: 'center',
                  fontSize: 14,
                  textTransform: 'uppercase',
                  letterSpacing: 1
                }}>
                  {order.status === 'approved' ? 'Aprobado' : 'Pendiente'}
                </div>

                {/* Child Name */}
                <div>
                  <div style={{ color: '#888', fontSize: 12, textTransform: 'uppercase', fontWeight: 600, letterSpacing: 0.5, marginBottom: 4 }}>
                    Nombre del Niño
                  </div>
                  <div style={{ color: '#e0e0e0', fontWeight: 700, fontSize: 22 }}>
                    {order.child_name || 'Usuario ' + order.id}
                  </div>
                </div>

                {/* Allergens - Prominent Warning */}
                {order.allergens && order.allergens.length > 0 && (
                  <div style={{
                    background: '#c0392b',
                    color: '#ffe0e0',
                    padding: '16px',
                    borderRadius: 8,
                    fontWeight: 700,
                    borderLeft: '6px solid #ff6b6b',
                    fontSize: 16
                  }}>
                    <div style={{ marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1, fontSize: 12 }}>
                      ⚠️ ALERGENOS DETECTADOS
                    </div>
                    <div style={{ fontSize: 15, lineHeight: 1.6 }}>
                      {order.allergens.map((a, i) => (
                        <div key={i}>• {a}</div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Items */}
                <div>
                  <div style={{ color: '#888', fontSize: 12, textTransform: 'uppercase', fontWeight: 600, letterSpacing: 0.5, marginBottom: 8 }}>
                    Items del Pedido
                  </div>
                  <div style={{
                    background: '#0f1419',
                    padding: 12,
                    borderRadius: 8,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8
                  }}>
                    {order.items && order.items.map((item, i) => (
                      <div key={i} style={{
                        color: '#4a9eff',
                        fontSize: 16,
                        fontWeight: 600,
                        borderBottom: i < order.items.length - 1 ? '1px solid #3a4254' : 'none',
                        paddingBottom: i < order.items.length - 1 ? 8 : 0
                      }}>
                        <span style={{ color: '#27ae60', fontWeight: 700, marginRight: 8 }}>
                          {item.quantity}x
                        </span>
                        {item.product_name}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Notes */}
                {order.notes && (
                  <div style={{
                    background: '#2d3a4a',
                    padding: 12,
                    borderRadius: 8,
                    fontSize: 14,
                    color: '#a0d5ff',
                    borderLeft: '4px solid #4a9eff'
                  }}>
                    <strong style={{ color: '#4a9eff' }}>Notas:</strong><br/>{order.notes}
                  </div>
                )}

                {/* Time */}
                <div style={{ 
                  color: '#666', 
                  fontSize: 12,
                  textAlign: 'center',
                  borderTop: '1px solid #3a4254',
                  paddingTop: 8,
                  fontWeight: 600
                }}>
                  {new Date(order.created_at).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    );
  };

  if (loading && !statistics) {
    return <div className="loading">Cargando panel...</div>;
  }

  return (
    <div className="admin-dashboard">
      {/* Sidebar */}
      <aside className="admin-sidebar">
        <div className="sidebar-header">
          <h1>Admin</h1>
        </div>

        <nav className="sidebar-menu">
          {MENU_ITEMS.map(item => (
            <button
              key={item.key}
              className={`menu-item ${section === item.key ? 'active' : ''}`}
              onClick={() => setSection(item.key)}
            >
              <span className="menu-icon">{item.icon}</span>
              <span className="menu-label">{item.label}</span>
            </button>
          ))}
        </nav>

        <button className="btn-logout" onClick={handleLogout}>
          Cerrar Sesión
        </button>
      </aside>

      {/* Main Content */}
      <main className="admin-main">
        <header className="admin-header">
          <h1>Panel de Administración</h1>
          <div className="header-stats">
            <div className="stat-badge">
              <span className="badge-label">Productos</span>
              <span className="badge-value">{products.length}</span>
            </div>
            <div className="stat-badge alert">
              <span className="badge-label">Fraude</span>
              <span className="badge-value">{statistics?.summary?.fraud_alerts || 0}</span>
            </div>
          </div>
        </header>

        <div className="admin-content">
          {section === 'dashboard' && renderDashboard()}
          {section === 'estadisticas' && renderEstadisticas()}
          {section === 'productos' && renderProductos()}
          {section === 'fraude' && renderFraud()}
          {section === 'usuarios' && renderUsuarios()}
          {section === 'kds' && renderKDS()}
        </div>
      </main>

      {/* Product Edit Modal */}
      {editProduct !== null && (
        <div className="modal-overlay" onClick={handleCancel}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h2>{editProduct?.id ? 'Editar Producto' : 'Nuevo Producto'}</h2>
            
            <div className="form-group">
              <label>Nombre</label>
              <input 
                type="text"
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
                placeholder="Nombre del producto"
              />
            </div>

            <div className="form-group">
              <label>Descripción</label>
              <textarea 
                value={formData.description}
                onChange={e => setFormData({...formData, description: e.target.value})}
                placeholder="Descripción"
                rows={3}
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Precio</label>
                <input 
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.price}
                  onChange={e => setFormData({...formData, price: parseFloat(e.target.value)})}
                />
              </div>
              <div className="form-group">
                <label>Categoría</label>
                <select 
                  value={formData.category}
                  onChange={e => setFormData({...formData, category: e.target.value})}
                >
                  <option value="cafes">Cafés</option>
                  <option value="bocadillos">Bocadillos</option>
                  <option value="dulces">Dulces</option>
                  <option value="bebidas">Bebidas</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label>URL Imagen</label>
              <input 
                type="text"
                value={formData.image_url}
                onChange={e => setFormData({...formData, image_url: e.target.value})}
                placeholder="https://..."
              />
            </div>

            <div className="form-group checkbox">
              <input 
                type="checkbox"
                checked={formData.active}
                onChange={e => setFormData({...formData, active: e.target.checked})}
              />
              <label>Activo</label>
            </div>

            <div className="modal-actions">
              <button className="btn-secondary" onClick={handleCancel}>Cancelar</button>
              <button className="btn-primary" onClick={handleSave}>Guardar</button>
            </div>
          </div>
        </div>
      )}

      {/* User Edit Modal */}
      {editingUser && (
        <div className="modal-overlay" onClick={() => setEditingUser(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h2>Editar Usuario</h2>
            
            <div className="form-group">
              <label>Nombre</label>
              <input 
                type="text"
                value={editingUser.editName}
                onChange={e => setEditingUser({...editingUser, editName: e.target.value})}
                placeholder="Nombre del usuario"
              />
            </div>

            <div className="form-group">
              <label>Email</label>
              <input 
                type="email"
                value={editingUser.editEmail}
                onChange={e => setEditingUser({...editingUser, editEmail: e.target.value})}
                placeholder="email@ejemplo.com"
              />
            </div>

            <div className="form-group">
              <label>Rol</label>
              <select 
                value={editingUser.editRole}
                onChange={e => setEditingUser({...editingUser, editRole: e.target.value})}
              >
                <option value="admin">Admin</option>
                <option value="parent">Padre</option>
                <option value="child">Hijo</option>
                <option value="customer">Cliente</option>
              </select>
            </div>

            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setEditingUser(null)}>Cancelar</button>
              <button className="btn-primary" onClick={handleSaveUser}>Guardar</button>
            </div>
          </div>
        </div>
      )}

      {/* User Block Confirmation Modal */}
      {blockingUser && (
        <div className="modal-overlay" onClick={() => setBlockingUser(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h2>{blockingUser.blocked ? 'Desbloquear Usuario' : 'Bloquear Usuario'}</h2>
            <p style={{color: '#666', marginTop: 16}}>
              {blockingUser.blocked 
                ? `¿Desbloquear a ${blockingUser.name} (${blockingUser.email})?` 
                : `¿Bloquear a ${blockingUser.name} (${blockingUser.email})? No podrá acceder a la aplicación.`
              }
            </p>
            <div className="modal-actions" style={{marginTop: 24}}>
              <button className="btn-secondary" onClick={() => setBlockingUser(null)}>Cancelar</button>
              <button 
                className={blockingUser.blocked ? "btn-primary" : "btn-danger"}
                onClick={() => handleBlockUser(blockingUser.id, !blockingUser.blocked)}
              >
                {blockingUser.blocked ? 'Desbloquear' : 'Bloquear'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
