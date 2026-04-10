import React, { useState, useEffect } from "react";
import ProductCard from "./ProductCard";
import ProductModal from "./ProductModal";
import SkeletonLoader from "./SkeletonLoader";
import { useCart } from "../lib/CartContext";
import { getActiveProducts } from "../lib/api";

function inferTechnicalData(name, category) {
  const nombre = (name || '').toLowerCase();
  const cat = category === 'sandwich' ? 'bocadillos' : category;

  let ingredients = [];
  let caloriesKcal = 0;
  let nutritionTable = { proteins_g: '-', carbs_g: '-', fats_g: '-', salt_g: '-' };

  if (cat === 'cafes') {
    if (nombre.includes('leche') || nombre.includes('latte') || nombre.includes('capuchino') || nombre.includes('cortado')) {
      ingredients = ['Café', 'Leche'];
      caloriesKcal = 55;
      nutritionTable = { proteins_g: 2.8, carbs_g: 4.6, fats_g: 2.8, salt_g: 0.1 };
    } else {
      ingredients = ['Café', 'Agua'];
      caloriesKcal = 3;
      nutritionTable = { proteins_g: 0.2, carbs_g: 0.3, fats_g: 0.0, salt_g: 0.0 };
    }
  } else if (cat === 'bocadillos') {
    ingredients = ['Pan'];
    if (nombre.includes('jamón')) ingredients.push('Jamón');
    if (nombre.includes('queso') || nombre.includes('mixto')) ingredients.push('Queso');
    if (nombre.includes('atún')) ingredients.push('Atún', 'Mayonesa');
    if (nombre.includes('tortilla')) ingredients.push('Huevo');
    if (nombre.includes('vegetal') || nombre.includes('aguacate')) ingredients.push('Lechuga', 'Tomate');
    caloriesKcal = 255;
    nutritionTable = { proteins_g: 11.0, carbs_g: 28.0, fats_g: 10.0, salt_g: 1.2 };
  } else if (cat === 'dulces') {
    ingredients = ['Harina de trigo', 'Azúcar', 'Mantequilla', 'Huevo'];
    caloriesKcal = 340;
    nutritionTable = { proteins_g: 6.0, carbs_g: 42.0, fats_g: 16.0, salt_g: 0.4 };
  } else {
    ingredients = nombre.includes('zumo') ? ['Zumo de fruta'] : ['Agua'];
    caloriesKcal = nombre.includes('agua') ? 0 : 48;
    nutritionTable = { proteins_g: 0.5, carbs_g: 11.0, fats_g: 0.3, salt_g: 0.1 };
  }

  return { ingredients, caloriesKcal, nutritionTable };
}

export default function ProductsGrid({ mode = 'catalog', selectedCategory = 'cafes', selectedSubcategory = null, onBackToCatalog }) {
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [products, setProducts] = useState([]);
  const [error, setError] = useState(null);
  const [favoriteIds, setFavoriteIds] = useState([]);
  const { addItem } = useCart();

  useEffect(() => {
    try {
      const savedFavorites = localStorage.getItem('cafeteria-favorites');
      if (!savedFavorites) return;

      const parsedFavorites = JSON.parse(savedFavorites);
      setFavoriteIds(Array.isArray(parsedFavorites) ? parsedFavorites : []);
    } catch (storageError) {
      console.error('Error al cargar favoritos:', storageError);
      setFavoriteIds([]);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('cafeteria-favorites', JSON.stringify(favoriteIds));
  }, [favoriteIds]);

  // Cargar productos desde la API
  useEffect(() => {
    const fetchProducts = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await getActiveProducts();
        const apiProducts = response.data || [];
        
        // Transformar productos de la API al formato esperado
        const transformedProducts = apiProducts.map(p => {
          const normalizedCategory = p.category === 'sandwich' ? 'bocadillos' : p.category;
          const ingredients = typeof p.ingredients === 'string'
            ? JSON.parse(p.ingredients)
            : (Array.isArray(p.ingredients) ? p.ingredients : []);
          const nutritionTable = typeof p.nutrition_table === 'string'
            ? JSON.parse(p.nutrition_table)
            : (typeof p.nutrition_table === 'object' && p.nutrition_table ? p.nutrition_table : {});

          const inferred = inferTechnicalData(p.name, normalizedCategory);

          return {
            id: p.id,
            name: p.name,
            price: parseFloat(p.price),
            category: normalizedCategory,
            description: p.description || '',
            image: p.image_url || 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=400&q=80',
            badge: typeof p.badges === 'string' ? (JSON.parse(p.badges)[0] || null) : (Array.isArray(p.badges) && p.badges.length > 0 ? p.badges[0] : null),
            allergens: typeof p.allergens === 'string' ? JSON.parse(p.allergens) : (Array.isArray(p.allergens) ? p.allergens : []),
            features: [],
            options: typeof p.options === 'string' ? JSON.parse(p.options) : (typeof p.options === 'object' ? p.options : {}),
            ingredients: ingredients.length ? ingredients : inferred.ingredients,
            containsInfo: p.contains_info || '',
            conservation: p.conservation || 'Conservar refrigerado entre 0ºC y 4ºC. Consumir en el día.',
            shelfLifeHours: Number.isFinite(p.shelf_life_hours) ? p.shelf_life_hours : 24,
            caloriesKcal: Number.isFinite(p.calories_kcal) && p.calories_kcal > 0 ? p.calories_kcal : inferred.caloriesKcal,
            nutritionTable: Object.keys(nutritionTable).length ? nutritionTable : inferred.nutritionTable,
            sanitaryApproved: p.sanitary_approved !== false,
            sanitaryNotes: p.sanitary_notes || 'Ficha técnica revisada para cafetería escolar.',
            approvedAt: p.approved_at || null
          };
        });
        
        setProducts(transformedProducts);
      } catch (err) {
        console.error('Error al cargar productos:', err);
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProducts();
  }, []); // Cargar una sola vez al montar el componente

  // Filtrar productos basado en la categoría y subcategoría seleccionadas
  const filteredProducts = products.filter(product => {
    if (mode === 'favorites') {
      return favoriteIds.includes(product.id);
    }

    // Filtro de categoría
    if (selectedCategory === 'otros') return false;
    if (product.category !== selectedCategory) return false;
    
    // Filtro de subcategoría
    if (!selectedSubcategory || selectedSubcategory === 'all') return true;
    
    const nombre = product.name.toLowerCase();
    
    // Subcategorías de cafés
    if (selectedCategory === 'cafes') {
      if (selectedSubcategory === 'con-leche') return nombre.includes('leche');
      if (selectedSubcategory === 'solos') return !nombre.includes('leche') && !nombre.includes('cacao');
    }
    
    // Subcategorías de bocadillos
    if (selectedCategory === 'bocadillos') {
      if (selectedSubcategory === 'bocadillos') return nombre.includes('bocadillo');
      if (selectedSubcategory === 'croissants') return nombre.includes('croissant');
      if (selectedSubcategory === 'sandwiches') return nombre.includes('sandwich') || nombre.includes('sándwich');
    }
    
    // Subcategorías de bebidas
    if (selectedCategory === 'bebidas') {
      if (selectedSubcategory === 'zumos') return nombre.includes('zumo');
      if (selectedSubcategory === 'agua') return nombre.includes('agua');
      if (selectedSubcategory === 'refrescos') return nombre.includes('refresco');
    }
    
    return true;
  });

  const handleShowDetail = (product) => {
    setSelectedProduct(product);
  };

  const handleAddToCart = (productWithCustomizations) => {
    // Usar addItem del hook del carrito
    addItem(
      productWithCustomizations, 
      productWithCustomizations.quantity || 1,
      productWithCustomizations.customizations || {}
    );
    setSelectedProduct(null);
  };

  const handleToggleFavorite = (productId) => {
    setFavoriteIds((currentFavorites) =>
      currentFavorites.includes(productId)
        ? currentFavorites.filter((id) => id !== productId)
        : [...currentFavorites, productId]
    );
  };

  const favoriteProductsCount = products.filter((product) => favoriteIds.includes(product.id)).length;

  return (
    <section className="content">
      {mode === 'favorites' && (
        <div className="favorites-hero">
          <div className="favorites-hero-copy">
            <span className="favorites-eyebrow">Tu selección</span>
            <h3>Favoritos</h3>
            <p>
              {favoriteProductsCount > 0
                ? `Aquí tienes ${favoriteProductsCount} producto${favoriteProductsCount === 1 ? '' : 's'} guardado${favoriteProductsCount === 1 ? '' : 's'} para volver rápido a ellos.`
                : 'Todavía no has marcado ningún producto como favorito.'}
            </p>
          </div>
          <button className="favorites-back-btn" onClick={() => onBackToCatalog && onBackToCatalog()}>
            Ver catálogo
          </button>
        </div>
      )}

      <div id="products" className="products-grid">
        {isLoading ? (
          <SkeletonLoader type="product" count={4} />
        ) : error ? (
          <div className="no-products">
            <div className="no-products-icon">⚠️</div>
            <h4>Error al cargar productos</h4>
            <p>{error}</p>
            <button 
              onClick={() => window.location.reload()} 
              style={{ 
                marginTop: 16, 
                padding: '8px 16px', 
                background: '#b08968', 
                color: '#fff', 
                border: 'none', 
                borderRadius: 8, 
                cursor: 'pointer' 
              }}
            >
              Reintentar
            </button>
          </div>
        ) : filteredProducts.length > 0 ? (
          filteredProducts.map(product => (
            <ProductCard 
              key={product.id}
              product={product} 
              onClick={handleShowDetail}
              isFavorite={favoriteIds.includes(product.id)}
              onToggleFavorite={handleToggleFavorite}
            />
          ))
        ) : (
          <div className="no-products">
            <div className="no-products-icon">{mode === 'favorites' ? '❤️' : '🔍'}</div>
            <h4>{mode === 'favorites' ? 'Aún no tienes favoritos' : 'No hay productos'}</h4>
            <p>
              {mode === 'favorites'
                ? 'Pulsa el corazón de cualquier tarjeta para guardarla aquí.'
                : 'No se encontraron productos en esta categoría'}
            </p>
          </div>
        )}
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
