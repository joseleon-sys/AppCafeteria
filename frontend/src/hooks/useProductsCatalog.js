import React from "react";
import { obtenerMisFavoritos, obtenerProductosActivos, actualizarMisFavoritos } from "../lib/api";

export function normalizeFavoriteId(value) {
  return String(value ?? "").trim();
}

export function isSpecialModeEnabled(user) {
  return Boolean(user?.isAdult && String(user?.specialCode || "").trim().toLowerCase() === "ayuda");
}

function parseJsonField(value, fallback) {
  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch (error) {
      return fallback;
    }
  }

  return value ?? fallback;
}

function inferTechnicalData(name, category) {
  const nombre = (name || "").toLowerCase();
  const cat = category === "sandwich" ? "bocadillos" : category;

  let ingredients = [];
  let caloriesKcal = 0;
  let nutritionTable = { proteins_g: "-", carbs_g: "-", fats_g: "-", salt_g: "-" };

  if (cat === "cafes") {
    if (nombre.includes("leche") || nombre.includes("latte") || nombre.includes("capuchino") || nombre.includes("cortado")) {
      ingredients = ["Café", "Leche"];
      caloriesKcal = 55;
      nutritionTable = { proteins_g: 2.8, carbs_g: 4.6, fats_g: 2.8, salt_g: 0.1 };
    } else {
      ingredients = ["Café", "Agua"];
      caloriesKcal = 3;
      nutritionTable = { proteins_g: 0.2, carbs_g: 0.3, fats_g: 0.0, salt_g: 0.0 };
    }
  } else if (cat === "bocadillos") {
    ingredients = ["Pan"];
    if (nombre.includes("jamón")) ingredients.push("Jamón");
    if (nombre.includes("queso") || nombre.includes("mixto")) ingredients.push("Queso");
    if (nombre.includes("atún")) ingredients.push("Atún", "Mayonesa");
    if (nombre.includes("tortilla")) ingredients.push("Huevo");
    if (nombre.includes("vegetal") || nombre.includes("aguacate")) ingredients.push("Lechuga", "Tomate");
    caloriesKcal = 255;
    nutritionTable = { proteins_g: 11.0, carbs_g: 28.0, fats_g: 10.0, salt_g: 1.2 };
  } else if (cat === "dulces") {
    ingredients = ["Harina de trigo", "Azúcar", "Mantequilla", "Huevo"];
    caloriesKcal = 340;
    nutritionTable = { proteins_g: 6.0, carbs_g: 42.0, fats_g: 16.0, salt_g: 0.4 };
  } else {
    ingredients = nombre.includes("zumo") ? ["Zumo de fruta"] : ["Agua"];
    caloriesKcal = nombre.includes("agua") ? 0 : 48;
    nutritionTable = { proteins_g: 0.5, carbs_g: 11.0, fats_g: 0.3, salt_g: 0.1 };
  }

  return { ingredients, caloriesKcal, nutritionTable };
}

function transformProduct(product, specialModeActive) {
  const normalizedCategory = product.category === "sandwich" ? "bocadillos" : product.category;
  const ingredients = parseJsonField(product.ingredients, []);
  const nutritionTable = parseJsonField(product.nutrition_table, {});
  const badges = parseJsonField(product.badges, []);
  const allergens = parseJsonField(product.allergens, []);
  const options = parseJsonField(product.options, {});
  const inferred = inferTechnicalData(product.name, normalizedCategory);
  const tieneAlergenoAyuda = Array.isArray(allergens)
    && allergens.some((allergen) => String(allergen || "").trim().toLowerCase() === "ayuda");

  return {
    id: product.id,
    name: product.name,
    price: specialModeActive && tieneAlergenoAyuda ? 0 : parseFloat(product.price),
    originalPrice: parseFloat(product.price),
    category: normalizedCategory,
    description: product.description || "",
    image: product.image_url || "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=400&q=80",
    badge: Array.isArray(badges) && badges.length > 0 ? badges[0] : null,
    allergens: Array.isArray(allergens) ? allergens : [],
    features: [],
    options: typeof options === "object" && options ? options : {},
    ingredients: Array.isArray(ingredients) && ingredients.length ? ingredients : inferred.ingredients,
    containsInfo: product.contains_info || "",
    conservation: product.conservation || "Conservar refrigerado entre 0ºC y 4ºC. Consumir en el día.",
    shelfLifeHours: Number.isFinite(product.shelf_life_hours) ? product.shelf_life_hours : 24,
    caloriesKcal: Number.isFinite(product.calories_kcal) && product.calories_kcal > 0 ? product.calories_kcal : inferred.caloriesKcal,
    nutritionTable: Object.keys(nutritionTable || {}).length ? nutritionTable : inferred.nutritionTable,
    sanitaryApproved: product.sanitary_approved !== false,
    sanitaryNotes: product.sanitary_notes || "Ficha técnica revisada para cafetería escolar.",
    approvedAt: product.approved_at || null,
    tieneAlergenoAyuda,
  };
}

function matchesSubcategory(product, selectedCategory, selectedSubcategory) {
  if (!selectedSubcategory || selectedSubcategory === "all") return true;

  const nombre = product.name.toLowerCase();

  if (selectedCategory === "cafes") {
    if (selectedSubcategory === "con-leche") return nombre.includes("leche");
    if (selectedSubcategory === "solos") return !nombre.includes("leche") && !nombre.includes("cacao");
  }

  if (selectedCategory === "bocadillos") {
    if (selectedSubcategory === "bocadillos") return nombre.includes("bocadillo");
    if (selectedSubcategory === "croissants") return nombre.includes("croissant");
    if (selectedSubcategory === "sandwiches") return nombre.includes("sandwich") || nombre.includes("sándwich");
  }

  if (selectedCategory === "bebidas") {
    if (selectedSubcategory === "zumos") return nombre.includes("zumo");
    if (selectedSubcategory === "agua") return nombre.includes("agua");
    if (selectedSubcategory === "refrescos") return nombre.includes("refresco");
  }

  return true;
}

function hasExcludedAllergen(product, selectedAllergens) {
  if (selectedAllergens.length === 0) return false;

  const normalizedAllergens = Array.isArray(product.allergens)
    ? product.allergens.map((allergen) => String(allergen || "").trim().toLowerCase())
    : [];

  return selectedAllergens.some((selectedAllergen) =>
    normalizedAllergens.includes(String(selectedAllergen).trim().toLowerCase())
  );
}

function filterProducts(products, filters) {
  const {
    favoriteIds,
    mode,
    selectedAllergens,
    selectedCategory,
    selectedSubcategory,
    specialModeActive,
  } = filters;

  return products.filter((product) => {
    if (specialModeActive && !product.tieneAlergenoAyuda) return false;
    if (mode === "favorites") return favoriteIds.includes(normalizeFavoriteId(product.id));
    if (specialModeActive) return true;
    if (hasExcludedAllergen(product, selectedAllergens)) return false;
    if (selectedCategory === "otros") return false;
    if (product.category !== selectedCategory) return false;

    return matchesSubcategory(product, selectedCategory, selectedSubcategory);
  });
}

export function useProductsCatalog({ user, mode, selectedCategory, selectedSubcategory, selectedAllergens }) {
  const [isLoading, setIsLoading] = React.useState(true);
  const [products, setProducts] = React.useState([]);
  const [error, setError] = React.useState(null);
  const [favoriteIds, setFavoriteIds] = React.useState([]);
  const specialModeActive = isSpecialModeEnabled(user);

  React.useEffect(() => {
    let mounted = true;

    const loadFavorites = async () => {
      try {
        const response = await obtenerMisFavoritos();
        const remoteFavorites = Array.isArray(response?.favorites)
          ? response.favorites.map(normalizeFavoriteId).filter(Boolean)
          : [];

        if (mounted) setFavoriteIds(remoteFavorites);
      } catch (favoritesError) {
        console.error("Error al cargar favoritos del usuario:", favoritesError);
        if (mounted) setFavoriteIds([]);
      }
    };

    loadFavorites();

    return () => {
      mounted = false;
    };
  }, []);

  React.useEffect(() => {
    let mounted = true;

    const fetchProducts = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await obtenerProductosActivos();
        const apiProducts = response.data || [];
        const transformedProducts = apiProducts.map((product) => transformProduct(product, specialModeActive));

        if (mounted) setProducts(transformedProducts);
      } catch (err) {
        console.error("Error al cargar productos:", err);
        if (mounted) setError(err.message);
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    fetchProducts();

    return () => {
      mounted = false;
    };
  }, [specialModeActive]);

  const filteredProducts = React.useMemo(() => filterProducts(products, {
    favoriteIds,
    mode,
    selectedAllergens,
    selectedCategory,
    selectedSubcategory,
    specialModeActive,
  }), [favoriteIds, mode, products, selectedAllergens, selectedCategory, selectedSubcategory, specialModeActive]);

  const favoriteProductsCount = React.useMemo(() => products.filter((product) => (
    favoriteIds.includes(normalizeFavoriteId(product.id))
    && (!specialModeActive || product.tieneAlergenoAyuda)
  )).length, [favoriteIds, products, specialModeActive]);

  const toggleFavorite = React.useCallback(async (productId) => {
    const normalizedProductId = normalizeFavoriteId(productId);
    const previousFavorites = favoriteIds;
    const nextFavorites = previousFavorites.includes(normalizedProductId)
      ? previousFavorites.filter((id) => id !== normalizedProductId)
      : [...previousFavorites, normalizedProductId];

    setFavoriteIds(nextFavorites);

    try {
      const response = await actualizarMisFavoritos(nextFavorites);
      setFavoriteIds(Array.isArray(response?.favorites) ? response.favorites.map(normalizeFavoriteId) : nextFavorites);
    } catch (favoritesError) {
      console.error("Error al guardar favoritos del usuario:", favoritesError);
      setFavoriteIds(previousFavorites);
    }
  }, [favoriteIds]);

  return {
    error,
    favoriteIds,
    favoriteProductsCount,
    filteredProducts,
    isLoading,
    specialModeActive,
    toggleFavorite,
  };
}
