import React from "react";
import ProductCard from "../ProductCard";
import SkeletonLoader from "../SkeletonLoader";
import { normalizeFavoriteId } from "../../hooks/useProductsCatalog";

const retryButtonStyle = {
  marginTop: 16,
  padding: "8px 16px",
  background: "#b08968",
  color: "#fff",
  border: "none",
  borderRadius: 8,
  cursor: "pointer",
};

function ProductsError({ error }) {
  return (
    <div className="no-products">
      <div className="no-products-icon">⚠️</div>
      <h4>Error al cargar productos</h4>
      <p>{error}</p>
      <button onClick={() => window.location.reload()} style={retryButtonStyle}>
        Reintentar
      </button>
    </div>
  );
}

function EmptyProducts({ mode }) {
  return (
    <div className="no-products">
      <div className="no-products-icon">{mode === "favorites" ? "❤️" : "🔍"}</div>
      <h4>{mode === "favorites" ? "Aún no tienes favoritos" : "No hay productos"}</h4>
      <p>
        {mode === "favorites"
          ? "Pulsa el corazón de cualquier tarjeta para guardarla aquí."
          : "No se encontraron productos en esta categoría"}
      </p>
    </div>
  );
}

export default function ProductsGridContent({
  error,
  favoriteIds,
  filteredProducts,
  isLoading,
  mode,
  onShowDetail,
  onToggleFavorite,
}) {
  if (isLoading) return <SkeletonLoader type="product" count={4} />;
  if (error) return <ProductsError error={error} />;
  if (filteredProducts.length === 0) return <EmptyProducts mode={mode} />;

  return filteredProducts.map((product) => (
    <ProductCard
      key={product.id}
      product={product}
      onClick={onShowDetail}
      isFavorite={favoriteIds.includes(normalizeFavoriteId(product.id))}
      onToggleFavorite={onToggleFavorite}
    />
  ));
}
