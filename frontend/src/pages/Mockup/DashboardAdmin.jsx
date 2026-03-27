import React, { useEffect, useState } from "react";
import { getAllProducts, createProduct, updateProduct, deleteProduct } from "../../lib/api";
import { showSuccess, showError } from "../../components/Toast";
import { showConfirm } from "../../components/Dialog";

const MENU = [
  { key: "productos", label: "Productos", icon: "🍔" },
  { key: "usuarios", label: "Usuarios", icon: "👤" },
  { key: "pedidos", label: "Pedidos", icon: "🧾" },
];

export default function DashboardAdmin({ onLogout }) {
  const [section, setSection] = useState("productos");
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sideOpen, setSideOpen] = useState(false);
  const [editProduct, setEditProduct] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: 0,
    category: 'cafes',
    active: true,
    image_url: '',
    badges: [],
    allergens: []
  });

  const handleLogout = () => {
    localStorage.removeItem('cafeteria_user');
    if (onLogout) {
      onLogout();
    }
  };

  // Cargar productos desde la API
  useEffect(() => {
    fetchProductsFromAPI();
  }, []);

  const fetchProductsFromAPI = async () => {
    setLoading(true);
    try {
      const response = await getAllProducts();
      setProducts(response.data || []);
    } catch (error) {
      console.error('Error al obtener productos:', error);
      showError('Error al cargar productos');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
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
      badges: typeof product.badges === 'string' ? JSON.parse(product.badges) : product.badges || [],
      allergens: typeof product.allergens === 'string' ? JSON.parse(product.allergens) : product.allergens || []
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (editProduct) {
        // Actualizar producto existente
        await updateProduct(editProduct.id, formData);
        showSuccess('Producto actualizado correctamente');
      } else {
        // Crear nuevo producto
        await createProduct(formData);
        showSuccess('Producto creado correctamente');
      }
      setEditProduct(null);
      setFormData({
        name: '',
        description: '',
        price: 0,
        category: 'cafes',
        active: true,
        image_url: '',
        badges: [],
        allergens: []
      });
      await fetchProductsFromAPI(); // Recargar lista
    } catch (error) {
      console.error('Error al guardar:', error);
      showError('Error al guardar el producto');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteProduct = async (id) => {
    const confirmed = await showConfirm('¿Estás seguro de que quieres eliminar este producto?', 'Eliminar producto');
    if (!confirmed) return;

    try {
      await deleteProduct(id, false); // Borrado lógico
      showSuccess('Producto eliminado correctamente');
      await fetchProductsFromAPI(); // Recargar lista
    } catch (error) {
      console.error('Error al eliminar:', error);
      showError('Error al eliminar el producto');
    }
  };

  const handleCancel = () => {
    setEditProduct(null);
    setFormData({
      name: '',
      description: '',
      price: 0,
      category: 'cafes',
      active: true,
      image_url: '',
      badges: [],
      allergens: []
    });
  };

  if (loading) return <div style={{ padding: 32 }}>Cargando datos...</div>;

  return (
    <div style={{ minHeight: '100vh', background: '#f8f9fa', position: 'relative' }}>
      {/* Header con hamburguesa y métricas */}
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 24, background: '#fff', borderBottom: '1px solid #eee' }}>
        <button onClick={() => setSideOpen(true)} style={{ background: 'none', border: 'none', fontSize: 28, cursor: 'pointer', color: '#6b4226' }} aria-label="Abrir menú admin">
          <span style={{ fontSize: 32 }}>☰</span>
        </button>
        <div style={{ display: 'flex', gap: 32 }}>
          <div style={{ background: '#f4f4f5', borderRadius: 12, padding: 18, minWidth: 120, textAlign: 'center' }}>
            <div style={{ fontWeight: 700, fontSize: 16, color: '#6b4226' }}>Facturación</div>
            <div style={{ fontSize: 22, fontWeight: 700 }}>€ 1,234.56</div>
          </div>
          <div style={{ background: '#f4f4f5', borderRadius: 12, padding: 18, minWidth: 120, textAlign: 'center' }}>
            <div style={{ fontWeight: 700, fontSize: 16, color: '#6b4226' }}>Productos</div>
            <div style={{ fontSize: 22, fontWeight: 700 }}>{products.length}</div>
          </div>
        </div>
        <button 
          onClick={handleLogout}
          style={{ 
            fontSize: 16, 
            padding: '10px 20px', 
            borderRadius: 8, 
            background: '#dc3545', 
            color: '#fff', 
            border: 'none', 
            cursor: 'pointer', 
            fontWeight: 600 
          }}
        >
          🚪 Logout
        </button>
      </header>
      {/* Menú lateral hamburguesa */}
      {sideOpen && (
        <div style={{ position: 'fixed', inset: 0, background: '#0007', zIndex: 1000 }} onClick={() => setSideOpen(false)}>
          <aside style={{ width: 260, height: '100%', background: '#fff', boxShadow: '2px 0 16px #0002', padding: 0, position: 'absolute', left: 0, top: 0 }} onClick={e => e.stopPropagation()}>
            <div style={{ fontWeight: 700, fontSize: 22, padding: 24, borderBottom: '1px solid #eee', color: '#6b4226', letterSpacing: 1 }}>☕ Admin</div>
            <nav style={{ display: 'flex', flexDirection: 'column' }}>
              {MENU.map(item => (
                <button key={item.key} onClick={() => { setSection(item.key); setSideOpen(false); }} style={{
                  background: section === item.key ? '#f1f3f5' : 'none',
                  border: 'none',
                  color: section === item.key ? '#6b4226' : '#444',
                  fontWeight: section === item.key ? 700 : 500,
                  fontSize: 18,
                  padding: '18px 24px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  borderLeft: section === item.key ? '4px solid #d4915f' : '4px solid transparent',
                  transition: 'all 0.15s',
                }}>{item.icon} {item.label}</button>
              ))}
            </nav>
          </aside>
        </div>
      )}
      {/* Contenido principal */}
      <main style={{ maxWidth: 1200, margin: '0 auto', padding: 40 }}>
        <h1 style={{ fontSize: 32, marginBottom: 24, color: '#6b4226' }}>Panel de Administración</h1>
        {section === "productos" && (
          <section>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <h2 style={{ fontSize: 24, margin: 0 }}>Gestión de productos</h2>
              <button 
                style={{ 
                  fontSize: 16, 
                  padding: '10px 24px', 
                  borderRadius: 8, 
                  background: '#d4915f', 
                  color: '#fff', 
                  border: 'none', 
                  cursor: 'pointer', 
                  fontWeight: 700 
                }} 
                onClick={() => {
                  setEditProduct(null);
                  setFormData({
                    name: '',
                    description: '',
                    price: 0,
                    category: 'cafes',
                    active: true,
                    image_url: '',
                    badges: [],
                    allergens: []
                  });
                }}
              >
                + Nuevo Producto
              </button>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24, marginTop: 24 }}>
              {products.map((p) => (
                <div 
                  key={p.id} 
                  style={{ 
                    background: '#fff', 
                    borderRadius: 14, 
                    boxShadow: '0 2px 12px #0001', 
                    width: 260, 
                    padding: 18,
                    position: 'relative', 
                    border: p.active ? '2px solid #d4915f' : '2px solid #eee' 
                  }}
                >
                  <img src={p.image_url} alt={p.name} style={{ width: '100%', height: 120, objectFit: 'cover', borderRadius: 10, marginBottom: 12 }} />
                  <div style={{ fontWeight: 700, fontSize: 18, color: '#6b4226', marginBottom: 4 }}>{p.name}</div>
                  <div style={{ color: '#888', fontSize: 14, marginBottom: 8, minHeight: 40 }}>{p.description}</div>
                  <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 12 }}>{p.price?.toFixed(2) || '0.00'} €</div>
                  <div style={{ position: 'absolute', top: 12, right: 12, background: p.active ? '#6b4226' : '#ccc', color: '#fff', borderRadius: 8, fontSize: 12, padding: '4px 10px' }}>{p.active ? 'Activo' : 'Inactivo'}</div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                    <button 
                      onClick={() => handleEditProduct(p)}
                      style={{ flex: 1, fontSize: 14, padding: '8px 12px', borderRadius: 6, background: '#b08968', color: '#fff', border: 'none', cursor: 'pointer' }}
                    >
                      Editar
                    </button>
                    <button 
                      onClick={() => handleDeleteProduct(p.id)}
                      style={{ flex: 1, fontSize: 14, padding: '8px 12px', borderRadius: 6, background: '#dc3545', color: '#fff', border: 'none', cursor: 'pointer' }}
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
        
        {section === "usuarios" && (
          <section>
            <h2 style={{ fontSize: 24 }}>Usuarios</h2>
            <p style={{ color: '#888', marginTop: 16 }}>Gestión de usuarios (en desarrollo)</p>
          </section>
        )}
        
        {section === "pedidos" && (
          <section>
            <h2 style={{ fontSize: 24 }}>Pedidos</h2>
            <p style={{ color: '#888', marginTop: 16 }}>Gestión de pedidos (en desarrollo)</p>
          </section>
        )}
      </main>

      {/* Modal de edición/creación de producto */}
      {editProduct !== null && (
        <div style={{ position: 'fixed', inset: 0, background: '#0007', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => handleCancel()}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 32, minWidth: 360, boxShadow: '0 2px 16px #0003', maxWidth: 500 }} onClick={e => e.stopPropagation()}>
            <h2 style={{ marginTop: 0, color: '#6b4226' }}>{editProduct?.id ? 'Editar Producto' : 'Nuevo Producto'}</h2>
            
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', marginBottom: 6, fontWeight: 600, color: '#333' }}>Nombre:</label>
              <input 
                type="text"
                value={formData.name} 
                onChange={(e) => handleChange('name', e.target.value)} 
                style={{ fontSize: 14, width: '100%', padding: 10, borderRadius: 6, border: '1px solid #ccc', boxSizing: 'border-box' }} 
              />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', marginBottom: 6, fontWeight: 600, color: '#333' }}>Descripción:</label>
              <textarea 
                value={formData.description} 
                onChange={(e) => handleChange('description', e.target.value)} 
                style={{ fontSize: 14, width: '100%', minHeight: 60, borderRadius: 6, border: '1px solid #ccc', boxSizing: 'border-box', resize: 'vertical', padding: 10 }} 
              />
            </div>

            <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', marginBottom: 6, fontWeight: 600, color: '#333' }}>Precio:</label>
                <input 
                  type="number" 
                  min={0} 
                  step={0.01} 
                  value={formData.price} 
                  onChange={(e) => handleChange('price', parseFloat(e.target.value))} 
                  style={{ fontSize: 14, width: '100%', padding: 10, borderRadius: 6, border: '1px solid #ccc', boxSizing: 'border-box' }} 
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', marginBottom: 6, fontWeight: 600, color: '#333' }}>Categoría:</label>
                <select 
                  value={formData.category} 
                  onChange={(e) => handleChange('category', e.target.value)} 
                  style={{ fontSize: 14, width: '100%', padding: 10, borderRadius: 6, border: '1px solid #ccc', boxSizing: 'border-box' }}
                >
                  <option value="cafes">Cafés</option>
                  <option value="bocadillos">Bocadillos</option>
                  <option value="dulces">Dulces</option>
                  <option value="bebidas">Bebidas</option>
                </select>
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', marginBottom: 6, fontWeight: 600, color: '#333' }}>URL de Imagen:</label>
              <input 
                type="text"
                value={formData.image_url} 
                onChange={(e) => handleChange('image_url', e.target.value)} 
                style={{ fontSize: 14, width: '100%', padding: 10, borderRadius: 6, border: '1px solid #ccc', boxSizing: 'border-box' }} 
                placeholder="https://example.com/image.jpg"
              />
            </div>

            <div style={{ marginBottom: 16, display: 'flex', gap: 16 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <input 
                  type="checkbox" 
                  checked={formData.active} 
                  onChange={(e) => handleChange('active', e.target.checked)} 
                />
                <span style={{ fontWeight: 600, color: '#333' }}>Activo</span>
              </label>
            </div>

            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button 
                onClick={handleCancel}
                style={{ fontSize: 14, padding: '10px 20px', borderRadius: 8, background: '#eee', color: '#333', border: 'none', cursor: 'pointer', fontWeight: 600 }}
              >
                Cancelar
              </button>
              <button 
                onClick={handleSave}
                disabled={saving || !formData.name}
                style={{ fontSize: 14, padding: '10px 20px', borderRadius: 8, background: '#d4915f', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600, opacity: saving ? 0.6 : 1 }}
              >
                {saving ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
