import React, { useEffect, useState } from "react";
import {
  obtenerTodosLosProductos,
  crearProducto,
  actualizarProducto,
  eliminarProducto,
  obtenerTodosLosUsuarios,
  bloquearUsuario,
  actualizarUsuario,
  eliminarUsuario,
  obtenerEstadisticasAdmin,
  obtenerRegistroFraude,
  obtenerColaPedidosAdmin,
  obtenerConfiguracionImpresora,
  guardarConfiguracionImpresora,
  cerrarSesion,
} from "../../lib/api";
import { limpiarSesion } from "../../lib/sesion";
import "../../pages/AdminDashboard.css";
import AdminOrdersPanel from "./components/AdminOrdersPanel";
import AdminProductsPanel, { EMPTY_PRODUCT_FORM } from "./components/AdminProductsPanel";
import AdminPrinterSettings, { DEFAULT_PRINTER_CONFIG } from "./components/AdminPrinterSettings";
import AdminSecurityLog from "./components/AdminSecurityLog";
import AdminStats, { AdminDashboardStats } from "./components/AdminStats";
import AdminUsersTable from "./components/AdminUsersTable";

const MENU_ITEMS = [
  { key: "dashboard", label: "Dashboard", icon: "📊" },
  { key: "estadisticas", label: "Estadísticas", icon: "📈" },
  { key: "productos", label: "Productos", icon: "🛍️" },
  { key: "usuarios", label: "Usuarios", icon: "👥" },
  { key: "fraude", label: "Fraude Log", icon: "⚠️" },
  { key: "kds", label: "Kitchen Display", icon: "🖥️" },
];

const ADMIN_MENU_ITEMS = [
  ...MENU_ITEMS,
  { key: "impresora", label: "Impresora", icon: "I" },
];

const FALLBACK_STATISTICS = {
  summary: {
    total_users: 0,
    total_orders: 0,
    total_revenue: 0,
    fraud_alerts: 0,
    average_order_value: 0,
  },
  users: { adults: 0, children: 0, admins: 0 },
  orders: { completed: 0, pending: 0, rejected: 0 },
  today: { new_orders: 0, new_users: 0, fraud_incidents: 0 },
};

export default function AdminDashboard({ onLogout }) {
  const [section, setSection] = useState("dashboard");
  const [products, setProducts] = useState([]);
  const [users, setUsers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [statistics, setStatistics] = useState(null);
  const [fraudLog, setFraudLog] = useState([]);
  const [printerConfig, setPrinterConfig] = useState(DEFAULT_PRINTER_CONFIG);
  const [printerSaving, setPrinterSaving] = useState(false);
  const [printerMessage, setPrinterMessage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editProduct, setEditProduct] = useState(null);
  const [blockingUser, setBlockingUser] = useState(null);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState(EMPTY_PRODUCT_FORM);

  useEffect(() => {
    cargarDatosPanel();
  }, []);

  const cargarDatosPanel = async () => {
    setLoading(true);
    try {
      const [productsRes, statsRes, fraudRes, usersRes, ordersRes, printerRes] = await Promise.all([
        obtenerTodosLosProductos(),
        cargarEstadisticas(),
        cargarRegistroFraude(),
        cargarUsuarios(),
        cargarPedidos(),
        cargarConfiguracionImpresora(),
      ]);

      setProducts(productsRes.data || []);
      setStatistics(statsRes);
      setFraudLog(fraudRes || []);
      setUsers(usersRes || []);
      setOrders(ordersRes || []);
      setPrinterConfig({ ...DEFAULT_PRINTER_CONFIG, ...(printerRes || {}) });
    } catch (error) {
      console.error("Error cargando datos:", error);
    } finally {
      setLoading(false);
    }
  };

  const cargarEstadisticas = async () => {
    try {
      return await obtenerEstadisticasAdmin();
    } catch (err) {
      console.error("Error en estadísticas:", err);
      return FALLBACK_STATISTICS;
    }
  };

  const cargarRegistroFraude = async () => {
    try {
      const response = await obtenerRegistroFraude();
      return response.logs || [];
    } catch (err) {
      console.error("Error en fraude log:", err);
      return [];
    }
  };

  const cargarUsuarios = async () => {
    try {
      const data = await obtenerTodosLosUsuarios();
      return data.users || [];
    } catch (err) {
      console.error("Error en usuarios:", err);
      return [];
    }
  };

  const cargarPedidos = async () => {
    try {
      const data = await obtenerColaPedidosAdmin();
      return data.orders || [];
    } catch (err) {
      console.error("Error en órdenes:", err);
      return [];
    }
  };

  const cargarConfiguracionImpresora = async () => {
    try {
      const data = await obtenerConfiguracionImpresora();
      return data.config || DEFAULT_PRINTER_CONFIG;
    } catch (err) {
      console.error("Error en configuracion de impresora:", err);
      return DEFAULT_PRINTER_CONFIG;
    }
  };

  const gestionarGuardarImpresora = async () => {
    setPrinterSaving(true);
    setPrinterMessage(null);
    try {
      const response = await guardarConfiguracionImpresora({
        enabled: Boolean(printerConfig.enabled),
        host: printerConfig.host,
        port: Number.parseInt(printerConfig.port, 10),
        timeoutMs: Number.parseInt(printerConfig.timeoutMs, 10),
      });
      setPrinterConfig({ ...DEFAULT_PRINTER_CONFIG, ...(response.config || {}) });
      setPrinterMessage({ type: "success", text: "Configuracion guardada correctamente" });
    } catch (error) {
      console.error("Error al guardar impresora:", error);
      setPrinterMessage({ type: "error", text: error.message || "Error al guardar la configuracion" });
    } finally {
      setPrinterSaving(false);
    }
  };

  const gestionarCierreSesion = async () => {
    try {
      await cerrarSesion();
    } catch (error) {
      console.error("Error cerrando sesión:", error);
    }
    limpiarSesion();
    if (onLogout) onLogout();
  };

  const gestionarCrearProducto = () => {
    setEditProduct({});
    setFormData(EMPTY_PRODUCT_FORM);
  };

  const gestionarEditarProducto = (product) => {
    setEditProduct(product);
    setFormData({
      name: product.name,
      description: product.description || "",
      price: product.price,
      category: product.category,
      active: product.active !== false,
      image_url: product.image_url || "",
    });
  };

  const gestionarGuardarProducto = async () => {
    try {
      if (editProduct?.id) {
        await actualizarProducto(editProduct.id, formData);
      } else {
        await crearProducto(formData);
      }
      gestionarCancelarProducto();
      await cargarDatosPanel();
    } catch (error) {
      console.error("Error al guardar:", error);
    }
  };

  const gestionarEliminarProducto = async (id) => {
    if (window.confirm("¿Eliminar este producto?")) {
      try {
        await eliminarProducto(id, false);
        await cargarDatosPanel();
      } catch (error) {
        console.error("Error al eliminar:", error);
      }
    }
  };

  const gestionarCancelarProducto = () => {
    setEditProduct(null);
    setFormData(EMPTY_PRODUCT_FORM);
  };

  const gestionarBloquearUsuario = async (idUsuario, shouldBlock) => {
    try {
      await bloquearUsuario(idUsuario, shouldBlock);
      await cargarDatosPanel();
      setBlockingUser(null);
    } catch (error) {
      console.error("Error al bloquear usuario:", error);
      alert(error.message || "Error al procesar la solicitud");
    }
  };

  const gestionarEditarUsuario = (user) => {
    setEditingUser({
      ...user,
      editName: user.name,
      editEmail: user.email,
      editRole: user.role,
    });
  };

  const gestionarGuardarUsuario = async () => {
    if (!editingUser.editName.trim() || !editingUser.editEmail.trim()) {
      alert("Nombre y email son requeridos");
      return;
    }

    try {
      await actualizarUsuario(editingUser.id, {
        name: editingUser.editName,
        email: editingUser.editEmail,
        role: editingUser.editRole,
      });
      await cargarDatosPanel();
      setEditingUser(null);
      alert("Usuario actualizado correctamente");
    } catch (error) {
      console.error("Error al actualizar usuario:", error);
      alert(error.message || "Error al procesar la solicitud");
    }
  };

  const gestionarEliminarUsuario = async (idUsuario, userName) => {
    if (
      !window.confirm(
        `¿Estás seguro de que deseas eliminar a ${userName}? Esta acción no se puede deshacer.`,
      )
    ) {
      return;
    }

    try {
      await eliminarUsuario(idUsuario);
      await cargarDatosPanel();
      alert("Usuario eliminado correctamente");
    } catch (error) {
      console.error("Error al eliminar usuario:", error);
      alert(error.message || "Error al procesar la solicitud");
    }
  };

  if (loading && !statistics) {
    return <div className="loading">Cargando panel...</div>;
  }

  return (
    <div className="admin-dashboard">
      <aside className="admin-sidebar">
        <div className="sidebar-header">
          <h1>Admin</h1>
        </div>

        <nav className="sidebar-menu">
          {ADMIN_MENU_ITEMS.map((item) => (
            <button
              key={item.key}
              className={`menu-item ${section === item.key ? "active" : ""}`}
              onClick={() => setSection(item.key)}
            >
              <span className="menu-icon">{item.icon}</span>
              <span className="menu-label">{item.label}</span>
            </button>
          ))}
        </nav>

        <button className="btn-logout" onClick={gestionarCierreSesion}>
          Cerrar Sesión
        </button>
      </aside>

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
          {section === "dashboard" && <AdminDashboardStats statistics={statistics} />}
          {section === "estadisticas" && <AdminStats statistics={statistics} />}
          {section === "productos" && (
            <AdminProductsPanel
              products={products}
              editProduct={editProduct}
              formData={formData}
              onCreate={gestionarCrearProducto}
              onEdit={gestionarEditarProducto}
              onDelete={gestionarEliminarProducto}
              onCancel={gestionarCancelarProducto}
              onSave={gestionarGuardarProducto}
              onFormChange={setFormData}
            />
          )}
          {section === "fraude" && <AdminSecurityLog fraudLog={fraudLog} />}
          {section === "usuarios" && (
            <AdminUsersTable
              users={users}
              blockingUser={blockingUser}
              editingUser={editingUser}
              onEdit={gestionarEditarUsuario}
              onDelete={gestionarEliminarUsuario}
              onBlockRequest={setBlockingUser}
              onBlockConfirm={gestionarBloquearUsuario}
              onCancelBlock={() => setBlockingUser(null)}
              onEditingUserChange={setEditingUser}
              onCancelEdit={() => setEditingUser(null)}
              onSaveUser={gestionarGuardarUsuario}
            />
          )}
          {section === "kds" && <AdminOrdersPanel orders={orders} />}
          {section === "impresora" && (
            <AdminPrinterSettings
              config={printerConfig}
              saving={printerSaving}
              message={printerMessage}
              onChange={setPrinterConfig}
              onSave={gestionarGuardarImpresora}
            />
          )}
        </div>
      </main>
    </div>
  );
}
