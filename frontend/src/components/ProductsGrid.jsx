// Grid principal del catalogo: carga productos, favoritos y abre el modal de detalle.
import React from "react";
import ProductModal from "./ProductModal";
import { useCart } from "../lib/CartContext";
import { useProductsCatalog } from "../hooks/useProductsCatalog";
import ProductsGridContent from "./products/ProductsGridContent";
import { FavoritesHero, SpecialModeHero } from "./products/ProductsHero";

export default function ProductsGrid({
  user,
  mode = "catalog",
  selectedCategory = "cafes",
  selectedSubcategory = null,
  selectedAllergens = [],
  onBackToCatalog,
}) {
  const [selectedProduct, setSelectedProduct] = React.useState(null);
  const { addItem } = useCart();
  const catalog = useProductsCatalog({
    user,
    mode,
    selectedCategory,
    selectedSubcategory,
    selectedAllergens,
  });

  const handleAddToCart = (productWithCustomizations) => {
    addItem(
      productWithCustomizations,
      productWithCustomizations.quantity || 1,
      productWithCustomizations.customizations || {}
    );
    setSelectedProduct(null);
  };

  return (
    <section className="content">
      {catalog.specialModeActive && <SpecialModeHero />}

      {mode === "favorites" && (
        <FavoritesHero
          count={catalog.favoriteProductsCount}
          onBackToCatalog={onBackToCatalog}
        />
      )}

      <div id="products" className="products-grid">
        <ProductsGridContent
          error={catalog.error}
          favoriteIds={catalog.favoriteIds}
          filteredProducts={catalog.filteredProducts}
          isLoading={catalog.isLoading}
          mode={mode}
          onShowDetail={setSelectedProduct}
          onToggleFavorite={catalog.toggleFavorite}
        />
      </div>

      <ProductModal
        product={selectedProduct}
        isOpen={!!selectedProduct}
        onClose={() => setSelectedProduct(null)}
        onAddToCart={handleAddToCart}
      />
    </section>
  );
}
