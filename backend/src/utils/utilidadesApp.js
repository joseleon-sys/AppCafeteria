// Utilidades generales del dominio de la app: parseo, normalizacion y datos de apoyo.
const DEFAULT_PRODUCT_IMAGE = 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=400&q=80';
const DEFAULT_CONSERVATION = 'Conservar refrigerado entre 0ºC y 4ºC. Consumir en el día.';

const MOCK_MENU_BASE = [
  { name: 'Café Espresso', description: 'Café espresso clásico', price: 1.5, category: 'cafes' },
  { name: 'Café Americano', description: 'Espresso con agua caliente', price: 1.8, category: 'cafes' },
  { name: 'Café con Leche', description: 'Espresso con leche espumada', price: 2, category: 'cafes' },
  { name: 'Capuchino', description: 'Café con leche y cacao en polvo', price: 2.5, category: 'cafes' },
  { name: 'Latte Macchiato', description: 'Leche con café y espuma', price: 2.8, category: 'cafes' },
  { name: 'Café Descafeinado', description: 'Espresso sin cafeína', price: 2, category: 'cafes' },
  { name: 'Café Cortado', description: 'Espresso con un poco de leche', price: 1.7, category: 'cafes' },
  { name: 'Bocadillo de Jamón Serrano', description: 'Pan tostado con jamón serrano', price: 4.5, category: 'bocadillos' },
  { name: 'Bocadillo de Queso', description: 'Pan tostado con queso manchego', price: 3.5, category: 'bocadillos' },
  { name: 'Bocadillo Mixto', description: 'Pan tostado con jamón y queso', price: 5, category: 'bocadillos' },
  { name: 'Bocadillo de Atún', description: 'Pan con atún fresco y mayonesa', price: 4, category: 'bocadillos' },
  { name: 'Bocadillo Vegetal', description: 'Pan con lechuga, tomate y aguacate', price: 4.5, category: 'bocadillos' },
  { name: 'Sándwich de Pollo', description: 'Pan con pechuga de pollo a la plancha', price: 5, category: 'bocadillos' },
  { name: 'Tostada de Aguacate', description: 'Pan integral con aguacate y huevo', price: 4.5, category: 'bocadillos' },
  { name: 'Pincho de Tortilla', description: 'Pincho de tortilla española típica', price: 3, category: 'bocadillos' },
  { name: 'Mini Croissant Relleno', description: 'Croissant mini con jamón y queso', price: 3.5, category: 'bocadillos' },
  { name: 'Croissant de Mantequilla', description: 'Croissant de hojaldre crujiente', price: 2.5, category: 'dulces' },
  { name: 'Cruasán de Chocolate', description: 'Croissant relleno de chocolate', price: 3, category: 'dulces' },
  { name: 'Muffin de Arándanos', description: 'Muffin casero con arándanos frescos', price: 2.8, category: 'dulces' },
  { name: 'Donut Glaseado', description: 'Donut con cobertura de azúcar', price: 2, category: 'dulces' },
  { name: 'Tarta de Queso', description: 'Porción de tarta de queso neoyorquina', price: 4, category: 'dulces' },
  { name: 'Galleta de Chocolate', description: 'Galleta casera con pepitas de chocolate', price: 1.5, category: 'dulces' },
  { name: 'Zumo de Naranja Natural', description: 'Zumo natural de naranja recién exprimido', price: 3, category: 'bebidas' },
  { name: 'Batido de Fresa', description: 'Batido casero de fresas frescas', price: 3.5, category: 'bebidas' },
  { name: 'Batido de Vainilla', description: 'Batido cremoso de vainilla', price: 3.5, category: 'bebidas' },
  { name: 'Agua Mineral', description: 'Agua mineral sin gas', price: 1, category: 'bebidas' },
];

export function parsearArrayJson(value) {
  // Acepta arrays reales o texto JSON y siempre devuelve un array seguro.
  if (Array.isArray(value)) return value;
  if (!value) return [];

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  return [];
}

export function parsearObjetoJson(value) {
  // Acepta objetos reales o texto JSON y siempre devuelve un objeto seguro.
  if (value && typeof value === 'object' && !Array.isArray(value)) return value;
  if (!value) return {};

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
    } catch {
      return {};
    }
  }

  return {};
}

export function parsearValorBooleano(value, defaultValue = true) {
  // Convierte distintos formatos de entrada a true o false.
  if (value === undefined || value === null) return defaultValue;
  if (typeof value === 'boolean') return value;

  if (typeof value === 'string') {
    if (value.toLowerCase() === 'true') return true;
    if (value.toLowerCase() === 'false') return false;
  }

  return Boolean(value);
}

export function inferirDatosTecnicosDesdeNombre(name, category) {
  // Si el producto llega con pocos datos tecnicos, aqui se intenta deducir una ficha basica.
  const nombre = (name || '').toLowerCase();
  const cat = category === 'sandwich' ? 'bocadillos' : category;

  let ingredients = [];
  let calories_kcal = 0;
  let nutrition_table = {};
  let allergens = [];

  if (cat === 'cafes') {
    if (nombre.includes('leche') || nombre.includes('latte') || nombre.includes('capuchino') || nombre.includes('cortado')) {
      ingredients = ['Café', 'Leche'];
      allergens = ['lactosa'];
      calories_kcal = 55;
      nutrition_table = { proteins_g: 2.8, carbs_g: 4.6, fats_g: 2.8, salt_g: 0.1 };
    } else {
      ingredients = ['Café', 'Agua'];
      calories_kcal = 3;
      nutrition_table = { proteins_g: 0.2, carbs_g: 0.3, fats_g: 0, salt_g: 0 };
    }
  } else if (cat === 'bocadillos') {
    ingredients = ['Pan'];
    allergens = ['gluten'];

    if (nombre.includes('jamón')) ingredients.push('Jamón');
    if (nombre.includes('queso') || nombre.includes('mixto')) {
      ingredients.push('Queso');
      allergens.push('lactosa');
    }
    if (nombre.includes('atún')) {
      ingredients.push('Atún', 'Mayonesa');
      allergens.push('pescado', 'huevo');
    }
    if (nombre.includes('tortilla')) {
      ingredients.push('Huevo');
      allergens.push('huevo');
    }
    if (nombre.includes('vegetal') || nombre.includes('aguacate')) {
      ingredients.push('Lechuga', 'Tomate');
    }

    calories_kcal = 255;
    nutrition_table = { proteins_g: 11, carbs_g: 28, fats_g: 10, salt_g: 1.2 };
  } else if (cat === 'dulces') {
    ingredients = ['Harina de trigo', 'Azúcar', 'Mantequilla', 'Huevo'];
    allergens = ['gluten', 'lactosa', 'huevo'];
    calories_kcal = 340;
    nutrition_table = { proteins_g: 6, carbs_g: 42, fats_g: 16, salt_g: 0.4 };
  } else {
    ingredients = nombre.includes('zumo') ? ['Zumo de fruta'] : ['Agua'];
    if (nombre.includes('batido')) {
      ingredients = ['Leche', 'Fruta'];
      allergens = ['lactosa'];
    }
    calories_kcal = nombre.includes('agua') ? 0 : 48;
    nutrition_table = { proteins_g: 0.5, carbs_g: 11, fats_g: 0.3, salt_g: 0.1 };
  }

  const uniqueAllergens = [...new Set(allergens)];
  return {
    ingredients,
    allergens: uniqueAllergens,
    conservation: DEFAULT_CONSERVATION,
    shelf_life_hours: cat === 'bebidas' ? 12 : 24,
    calories_kcal,
    nutrition_table,
    contains_info: uniqueAllergens.length ? `Contiene: ${uniqueAllergens.join(', ')}` : 'Sin alérgenos declarados',
  };
}

export function normalizarPayloadProductoEntrante(payload = {}) {
  // Convierte el payload recibido del frontend a un formato consistente para trabajar.
  const normalized = {
    name: (payload.name || '').trim(),
    description: payload.description || '',
    price: Number(payload.price),
    category: payload.category === 'sandwich' ? 'bocadillos' : payload.category,
    active: parsearValorBooleano(payload.active, true),
    image_url: payload.image_url || DEFAULT_PRODUCT_IMAGE,
    badges: parsearArrayJson(payload.badges),
    allergens: parsearArrayJson(payload.allergens),
    options: parsearObjetoJson(payload.options),
    ingredients: parsearArrayJson(payload.ingredients),
    contains_info: payload.contains_info || '',
    conservation: payload.conservation || DEFAULT_CONSERVATION,
    shelf_life_hours: Number(payload.shelf_life_hours || 24),
    calories_kcal: Number(payload.calories_kcal || 0),
    nutrition_table: parsearObjetoJson(payload.nutrition_table),
    sanitary_approved: parsearValorBooleano(payload.sanitary_approved, true),
    sanitary_notes: payload.sanitary_notes || '',
    approved_at: payload.approved_at || null,
  };

  if (!normalized.ingredients.length) {
    const inferred = inferirDatosTecnicosDesdeNombre(normalized.name, normalized.category);
    normalized.ingredients = inferred.ingredients;
    normalized.contains_info = normalized.contains_info || inferred.contains_info;
    normalized.conservation = normalized.conservation || inferred.conservation;
    normalized.shelf_life_hours = Number.isFinite(normalized.shelf_life_hours) ? normalized.shelf_life_hours : inferred.shelf_life_hours;
    normalized.calories_kcal = Number.isFinite(normalized.calories_kcal) && normalized.calories_kcal > 0 ? normalized.calories_kcal : inferred.calories_kcal;
    if (!Object.keys(normalized.nutrition_table).length) normalized.nutrition_table = inferred.nutrition_table;
    if (!normalized.allergens.length) normalized.allergens = inferred.allergens;
  }

  if (normalized.sanitary_approved && !normalized.approved_at) {
    normalized.approved_at = new Date().toISOString();
  }

  return normalized;
}

export function normalizarPayloadParcialProductoEntrante(payload = {}) {
  // Igual que la funcion anterior, pero solo para campos presentes en una actualizacion parcial.
  const normalized = {};
  if (Object.prototype.hasOwnProperty.call(payload, 'name')) normalized.name = (payload.name || '').trim();
  if (Object.prototype.hasOwnProperty.call(payload, 'description')) normalized.description = payload.description || '';
  if (Object.prototype.hasOwnProperty.call(payload, 'price')) normalized.price = Number(payload.price);
  if (Object.prototype.hasOwnProperty.call(payload, 'category')) normalized.category = payload.category === 'sandwich' ? 'bocadillos' : payload.category;
  if (Object.prototype.hasOwnProperty.call(payload, 'active')) normalized.active = parsearValorBooleano(payload.active, true);
  if (Object.prototype.hasOwnProperty.call(payload, 'image_url')) normalized.image_url = payload.image_url;
  if (Object.prototype.hasOwnProperty.call(payload, 'badges')) normalized.badges = parsearArrayJson(payload.badges);
  if (Object.prototype.hasOwnProperty.call(payload, 'allergens')) normalized.allergens = parsearArrayJson(payload.allergens);
  if (Object.prototype.hasOwnProperty.call(payload, 'options')) normalized.options = parsearObjetoJson(payload.options);
  if (Object.prototype.hasOwnProperty.call(payload, 'ingredients')) normalized.ingredients = parsearArrayJson(payload.ingredients);
  if (Object.prototype.hasOwnProperty.call(payload, 'contains_info')) normalized.contains_info = payload.contains_info || '';
  if (Object.prototype.hasOwnProperty.call(payload, 'conservation')) normalized.conservation = payload.conservation || '';
  if (Object.prototype.hasOwnProperty.call(payload, 'shelf_life_hours')) normalized.shelf_life_hours = Number(payload.shelf_life_hours);
  if (Object.prototype.hasOwnProperty.call(payload, 'calories_kcal')) normalized.calories_kcal = Number(payload.calories_kcal);
  if (Object.prototype.hasOwnProperty.call(payload, 'nutrition_table')) normalized.nutrition_table = parsearObjetoJson(payload.nutrition_table);
  if (Object.prototype.hasOwnProperty.call(payload, 'sanitary_approved')) normalized.sanitary_approved = parsearValorBooleano(payload.sanitary_approved, true);
  if (Object.prototype.hasOwnProperty.call(payload, 'sanitary_notes')) normalized.sanitary_notes = payload.sanitary_notes || '';
  if (Object.prototype.hasOwnProperty.call(payload, 'approved_at')) normalized.approved_at = payload.approved_at;
  return normalized;
}

export function normalizarProductoDesdePg(row) {
  const productName = row.nombre || row.name || '';
  const productCategory = row.category;
  const inferred = inferirDatosTecnicosDesdeNombre(productName, productCategory);
  const allergens = parsearArrayJson(row.alergenos ?? row.allergens);
  const ingredients = parsearArrayJson(row.ingredients);
  const nutrition = parsearObjetoJson(row.nutrition_table);

  return {
    id: row.id,
    name: productName,
    description: row.description || '',
    price: parseFloat(row.precio ?? row.price) || 0,
    category: productCategory === 'sandwich' ? 'bocadillos' : productCategory,
    active: (row.activo ?? row.active) !== false,
    image_url: row.image_url || DEFAULT_PRODUCT_IMAGE,
    badges: parsearArrayJson(row.badges),
    allergens: allergens.length ? allergens : inferred.allergens,
    options: parsearObjetoJson(row.options),
    ingredients: ingredients.length ? ingredients : inferred.ingredients,
    contains_info: row.contains_info || inferred.contains_info,
    conservation: row.conservation || inferred.conservation,
    shelf_life_hours: Number.isFinite(row.shelf_life_hours) ? row.shelf_life_hours : inferred.shelf_life_hours,
    calories_kcal: Number.isFinite(row.calories_kcal) && row.calories_kcal > 0 ? row.calories_kcal : inferred.calories_kcal,
    nutrition_table: Object.keys(nutrition).length ? nutrition : inferred.nutrition_table,
    sanitary_approved: row.sanitary_approved !== false,
    sanitary_notes: row.sanitary_notes || '',
    approved_at: row.approved_at || null,
    created_at: row.created_at,
  };
}

export function normalizarCodigoEspecial(value) {
  if (value === undefined || value === null) return null;
  const normalized = String(value).trim();
  return normalized ? normalized.toLowerCase() : null;
}

export function esCodigoEspecialValido(code) {
  if (code === null) return true;
  return code === 'ayuda';
}

export function construirNotasLineaPedido(item = {}) {
  const noteParts = [];
  if (item.notes) noteParts.push(String(item.notes).trim());

  const chosenOptions = item.chosen_options && typeof item.chosen_options === 'object' ? item.chosen_options : {};
  if (Array.isArray(chosenOptions.removed) && chosenOptions.removed.length > 0) {
    noteParts.push(`Sin: ${chosenOptions.removed.join(', ')}`);
  }
  if (chosenOptions.sugar !== undefined && chosenOptions.sugar !== null && chosenOptions.sugar !== '') {
    noteParts.push(`Azucar: ${chosenOptions.sugar}`);
  }

  return noteParts.filter(Boolean).join(' | ');
}

export function construirEntradaColaPedidos(order, items = []) {
  const uniqueAllergens = [...new Set(items.flatMap((item) => Array.isArray(item.allergens) ? item.allergens : []))];

  return {
    ...order,
    items: items.map((item) => ({
      product_id: item.product_id,
      product_name: item.product_name,
      quantity: item.quantity,
      price: item.price,
      subtotal: item.subtotal,
      notes: item.notes || '',
    })),
    allergens: uniqueAllergens,
  };
}

export function generarTokenPadre() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let token = '';
  for (let i = 0; i < 8; i += 1) token += chars.charAt(Math.floor(Math.random() * chars.length));
  return token;
}

export function calcularEdad(birthDate) {
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age -= 1;
  }

  return age;
}

export function normalizarEspaciosNombre(value = '') {
  return String(value).trim().replace(/\s+/g, ' ');
}

export function formatearNombreCompleto(value = '') {
  const normalized = normalizarEspaciosNombre(value);
  if (!normalized) return '';

  return normalized
    .split(' ')
    .map((part) => (part ? `${part.charAt(0).toUpperCase()}${part.slice(1).toLowerCase()}` : part))
    .join(' ');
}

export function normalizarUsuarioRelacionado(user = null) {
  if (!user || typeof user !== 'object') return null;

  return {
    ...user,
    name: user.name || user.nombre || null,
    email: user.email || null,
  };
}

export function parsearEnteroPositivo(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

export function normalizarEstadoPedido(status) {
  const normalized = String(status || '').trim().toLowerCase();
  if (['pagado', 'paid', 'completada', 'completado', 'completed'].includes(normalized)) return 'paid';
  if (['pendiente', 'pending', 'procesando', 'processing'].includes(normalized)) return 'pending';
  if (['aprobado', 'approved'].includes(normalized)) return 'approved';
  if (['rechazado', 'rejected', 'cancelado', 'cancelled'].includes(normalized)) return 'rejected';
  return normalized || 'pending';
}

export function construirAliasEstadoPedido(status) {
  const normalized = normalizarEstadoPedido(status);
  const aliases = {
    paid: ['paid', 'pagado', 'completed', 'completado', 'completada'],
    pending: ['pending', 'pendiente', 'procesando', 'processing'],
    approved: ['approved', 'aprobado'],
    rejected: ['rejected', 'rechazado', 'cancelado', 'cancelled'],
  };

  return aliases[normalized] || [normalized];
}

export function normalizarEntradaHistoricaPedido(order = {}) {
  const items = Array.isArray(order.items) ? order.items : [];
  const parsedTotal = Number.parseFloat(order.total ?? 0);

  return {
    ...order,
    status: normalizarEstadoPedido(order.status || order.estado),
    created_at: order.created_at || order.fecha_creacion || new Date().toISOString(),
    total: Number.isFinite(parsedTotal) ? parsedTotal : 0,
    items_count: Number.parseInt(order.items_count, 10) || items.length || 0,
    items,
  };
}

export function tieneFormatoUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || '').trim());
}

export function esNombreCompletoValido(value = '') {
  const normalized = normalizarEspaciosNombre(value);
  const words = normalized.split(' ').filter(Boolean);
  if (words.length < 2) return false;
  return /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ' -]+$/.test(normalized);
}

export function normalizarAlias(value) {
  if (value === undefined || value === null) return null;
  const alias = String(value).trim();
  return alias || null;
}

export function esAliasValido(value) {
  if (value === null || value === undefined || value === '') return true;
  return /^[A-Za-z0-9_.-]{3,30}$/.test(String(value));
}

export function normalizarIdsFavoritos(value) {
  let source = value;

  if (typeof source === 'string') {
    const trimmed = source.trim();
    if (!trimmed) return [];

    try {
      source = JSON.parse(trimmed);
    } catch {
      source = trimmed.split(',').map((item) => item.trim()).filter(Boolean);
    }
  }

  if (!Array.isArray(source)) return [];

  const uniqueIds = new Set();
  for (const item of source) {
    const normalizedId = String(item ?? '').trim();
    if (normalizedId) uniqueIds.add(normalizedId);
  }

  return Array.from(uniqueIds);
}

export function serializarIdsFavoritosParaBaseDeDatos(idsFavoritos) {
  return normalizarIdsFavoritos(idsFavoritos);
}

export function obtenerNombreVisibleUsuario(user = {}) {
  return user.alias || user.name || user.nombre || user.email || 'Usuario';
}

export function transformarProducto(supabaseProduct) {
  const productName = supabaseProduct.nombre || supabaseProduct.name || 'Sin nombre';
  const nombre = productName.toLowerCase();
  let category = 'otros';
  let options = {};

  if (nombre.includes('café') || nombre.includes('cacao') || nombre.includes('infusión')) {
    category = 'cafes';
    options = { sugar: { available: true, max: 3 }, removables: nombre.includes('leche') ? ['leche', 'cacao'] : [] };
  } else if (
    nombre.includes('bocadillo') ||
    nombre.includes('sandwich') ||
    nombre.includes('combo') ||
    (nombre.includes('croissant') && (nombre.includes('mixto') || nombre.includes('vegetal')))
  ) {
    category = 'bocadillos';
    const removables = ['tomate', 'lechuga', 'aceite'];
    if (nombre.includes('queso') || nombre.includes('mixto')) removables.push('queso');
    if (nombre.includes('jamón') || nombre.includes('embutido')) removables.push('jamón');
    if (nombre.includes('vegetal')) removables.push('vegetal');
    options = {
      sugar: { available: false },
      removables,
      addables: ['extra queso', 'extra tomate', 'extra lechuga'],
    };
  } else if (nombre.includes('galleta') || nombre.includes('barrita') || nombre.includes('pan')) {
    category = 'dulces';
    options = { sugar: { available: false }, removables: [] };
  } else if (nombre.includes('zumo') || nombre.includes('agua') || nombre.includes('refresco')) {
    category = 'bebidas';
    options = { sugar: { available: false }, removables: [], ice: { available: nombre.includes('refresco') || nombre.includes('zumo') } };
  } else if (nombre.includes('extra')) {
    category = 'extras';
    options = { sugar: { available: false }, removables: [] };
  }

  const inferred = inferirDatosTecnicosDesdeNombre(productName, category);
  return {
    id: supabaseProduct.id,
    name: productName,
    description: supabaseProduct.descripcion || supabaseProduct.description || '',
    price: parseFloat(supabaseProduct.precio ?? supabaseProduct.price) || 0,
    category: supabaseProduct.category || category,
    active: (supabaseProduct.activo ?? supabaseProduct.active) !== false,
    image_url: supabaseProduct.imagen_url || supabaseProduct.image_url || DEFAULT_PRODUCT_IMAGE,
    badges: Array.isArray(supabaseProduct.badges) ? supabaseProduct.badges : [],
    allergens: Array.isArray(supabaseProduct.alergenos)
      ? supabaseProduct.alergenos
      : (Array.isArray(supabaseProduct.allergens) && supabaseProduct.allergens.length ? supabaseProduct.allergens : inferred.allergens),
    options: supabaseProduct.options || options,
    ingredients: Array.isArray(supabaseProduct.ingredientes)
      ? supabaseProduct.ingredientes
      : (Array.isArray(supabaseProduct.ingredients) && supabaseProduct.ingredients.length ? supabaseProduct.ingredients : inferred.ingredients),
    contains_info: supabaseProduct.contiene || supabaseProduct.contains_info || inferred.contains_info,
    conservation: supabaseProduct.conservacion || supabaseProduct.conservation || inferred.conservation,
    shelf_life_hours: supabaseProduct.caducidad_horas || supabaseProduct.shelf_life_hours || inferred.shelf_life_hours,
    calories_kcal: supabaseProduct.calorias_kcal || supabaseProduct.calories_kcal || inferred.calories_kcal,
    nutrition_table: supabaseProduct.tabla_nutricional || supabaseProduct.nutrition_table || inferred.nutrition_table,
    sanitary_approved: (supabaseProduct.aprobado_sanidad ?? supabaseProduct.sanitary_approved) !== false,
    sanitary_notes: supabaseProduct.notas_sanidad || supabaseProduct.sanitary_notes || '',
    approved_at: supabaseProduct.fecha_aprobacion || supabaseProduct.approved_at || null,
  };
}

export const utilidadesApp = {
  parsearArrayJson,
  parsearObjetoJson,
  parsearValorBooleano,
  inferirDatosTecnicosDesdeNombre,
  normalizarPayloadProductoEntrante,
  normalizarPayloadParcialProductoEntrante,
  normalizarProductoDesdePg,
  normalizarCodigoEspecial,
  esCodigoEspecialValido,
  construirNotasLineaPedido,
  construirEntradaColaPedidos,
  generarTokenPadre,
  calcularEdad,
  normalizarEspaciosNombre,
  formatearNombreCompleto,
  normalizarUsuarioRelacionado,
  parsearEnteroPositivo,
  normalizarEstadoPedido,
  construirAliasEstadoPedido,
  normalizarEntradaHistoricaPedido,
  tieneFormatoUuid,
  esNombreCompletoValido,
  normalizarAlias,
  esAliasValido,
  normalizarIdsFavoritos,
  serializarIdsFavoritosParaBaseDeDatos,
  obtenerNombreVisibleUsuario,
  transformarProducto,
};
