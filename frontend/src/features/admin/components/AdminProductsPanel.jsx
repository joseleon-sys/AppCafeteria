import React from "react";

const EMPTY_PRODUCT_FORM = {
  name: "",
  description: "",
  price: 0,
  category: "cafes",
  active: true,
  image_url: "",
};

export default function AdminProductsPanel({
  products,
  editProduct,
  formData,
  onCreate,
  onEdit,
  onDelete,
  onCancel,
  onSave,
  onFormChange,
}) {
  return (
    <>
      <div className="section-container">
        <div className="section-header">
          <h2>Gestión de Productos</h2>
          <button className="btn-primary" onClick={onCreate}>
            Nuevo Producto
          </button>
        </div>

        <div className="products-grid">
          {products.map((product) => (
            <div key={product.id} className={`product-card ${!product.active ? "inactive" : ""}`}>
              {product.image_url && (
                <img src={product.image_url} alt={product.name} className="product-image" />
              )}
              <div className="product-info">
                <h4>{product.name}</h4>
                <p>{product.description}</p>
                <div className="product-meta">
                  <span className="price">€{product.price.toFixed(2)}</span>
                  <span className={`badge ${product.active ? "active" : "inactive"}`}>
                    {product.active ? "Activo" : "Inactivo"}
                  </span>
                </div>
              </div>
              <div className="product-actions">
                <button className="btn-edit" onClick={() => onEdit(product)}>
                  Editar
                </button>
                <button className="btn-delete" onClick={() => onDelete(product.id)}>
                  Eliminar
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {editProduct !== null && (
        <div className="modal-overlay" onClick={onCancel}>
          <div className="modal-content" onClick={(event) => event.stopPropagation()}>
            <h2>{editProduct?.id ? "Editar Producto" : "Nuevo Producto"}</h2>

            <div className="form-group">
              <label>Nombre</label>
              <input
                type="text"
                value={formData.name}
                onChange={(event) => onFormChange({ ...formData, name: event.target.value })}
                placeholder="Nombre del producto"
              />
            </div>

            <div className="form-group">
              <label>Descripción</label>
              <textarea
                value={formData.description}
                onChange={(event) => onFormChange({ ...formData, description: event.target.value })}
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
                  onChange={(event) =>
                    onFormChange({ ...formData, price: parseFloat(event.target.value) })
                  }
                />
              </div>
              <div className="form-group">
                <label>Categoría</label>
                <select
                  value={formData.category}
                  onChange={(event) => onFormChange({ ...formData, category: event.target.value })}
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
                onChange={(event) => onFormChange({ ...formData, image_url: event.target.value })}
                placeholder="https://..."
              />
            </div>

            <div className="form-group checkbox">
              <input
                type="checkbox"
                checked={formData.active}
                onChange={(event) => onFormChange({ ...formData, active: event.target.checked })}
              />
              <label>Activo</label>
            </div>

            <div className="modal-actions">
              <button className="btn-secondary" onClick={onCancel}>
                Cancelar
              </button>
              <button className="btn-primary" onClick={onSave}>
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export { EMPTY_PRODUCT_FORM };
