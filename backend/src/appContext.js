import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import { randomBytes } from 'crypto';
import { createClient } from '@supabase/supabase-js';
import path from 'path';
import { fileURLToPath } from 'url';
import Stripe from 'stripe';
import {
  loginRateLimiter,
  registrationRateLimiter,
  linkingRateLimiter,
  resetLoginAttempts,
  getClientIP,
} from './middleware/rateLimiter.js';
import {
  logSecurityEvent,
  calculateTrustScore,
  requireTrustScore,
  validateLinkingLimits,
} from './middleware/fraudPrevention.js';
import {
  registerDeviceToken,
  deactivateDeviceToken,
  listUserNotifications,
  markNotificationAsRead,
  sendPushToUser,
} from './services/notificationService.js';
import { Sentry, captureServerResponse, initSentry, isSentryEnabled } from './observability/sentry.js';
import { createHttpLogger } from './observability/httpLogger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });
dotenv.config({ path: path.join(__dirname, '../../.env'), override: false });

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

function parseJsonArray(value) {
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

function parseJsonObject(value) {
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

function parseBooleanValue(value, defaultValue = true) {
  if (value === undefined || value === null) return defaultValue;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    if (value.toLowerCase() === 'true') return true;
    if (value.toLowerCase() === 'false') return false;
  }
  return Boolean(value);
}

function isHostedDeployment() {
  return Boolean(
    process.env.RAILWAY_ENVIRONMENT ||
    process.env.RAILWAY_ENVIRONMENT_NAME ||
    process.env.RAILWAY_PROJECT_ID ||
    process.env.RAILWAY_SERVICE_ID ||
    process.env.RAILWAY_STATIC_URL,
  );
}

function isDevelopmentPaymentBypassEnabled({
  isProduction = process.env.NODE_ENV === 'production',
  isHosted = isHostedDeployment(),
} = {}) {
  if (isProduction || isHosted) {
    return false;
  }

  return parseBooleanValue(process.env.DEV_BYPASS_STRIPE_PAYMENT, false);
}

function inferTechnicalFromName(name, category) {
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
    if (nombre.includes('vegetal') || nombre.includes('aguacate')) ingredients.push('Lechuga', 'Tomate');
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

function normalizeIncomingProductPayload(payload = {}) {
  const normalized = {
    name: (payload.name || '').trim(),
    description: payload.description || '',
    price: Number(payload.price),
    category: payload.category === 'sandwich' ? 'bocadillos' : payload.category,
    active: parseBooleanValue(payload.active, true),
    image_url: payload.image_url || DEFAULT_PRODUCT_IMAGE,
    badges: parseJsonArray(payload.badges),
    allergens: parseJsonArray(payload.allergens),
    options: parseJsonObject(payload.options),
    ingredients: parseJsonArray(payload.ingredients),
    contains_info: payload.contains_info || '',
    conservation: payload.conservation || DEFAULT_CONSERVATION,
    shelf_life_hours: Number(payload.shelf_life_hours || 24),
    calories_kcal: Number(payload.calories_kcal || 0),
    nutrition_table: parseJsonObject(payload.nutrition_table),
    sanitary_approved: parseBooleanValue(payload.sanitary_approved, true),
    sanitary_notes: payload.sanitary_notes || '',
    approved_at: payload.approved_at || null,
  };

  if (!normalized.ingredients.length) {
    const inferred = inferTechnicalFromName(normalized.name, normalized.category);
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

function normalizePartialIncomingProductPayload(payload = {}) {
  const normalized = {};
  if (Object.prototype.hasOwnProperty.call(payload, 'name')) normalized.name = (payload.name || '').trim();
  if (Object.prototype.hasOwnProperty.call(payload, 'description')) normalized.description = payload.description || '';
  if (Object.prototype.hasOwnProperty.call(payload, 'price')) normalized.price = Number(payload.price);
  if (Object.prototype.hasOwnProperty.call(payload, 'category')) normalized.category = payload.category === 'sandwich' ? 'bocadillos' : payload.category;
  if (Object.prototype.hasOwnProperty.call(payload, 'active')) normalized.active = parseBooleanValue(payload.active, true);
  if (Object.prototype.hasOwnProperty.call(payload, 'image_url')) normalized.image_url = payload.image_url;
  if (Object.prototype.hasOwnProperty.call(payload, 'badges')) normalized.badges = parseJsonArray(payload.badges);
  if (Object.prototype.hasOwnProperty.call(payload, 'allergens')) normalized.allergens = parseJsonArray(payload.allergens);
  if (Object.prototype.hasOwnProperty.call(payload, 'options')) normalized.options = parseJsonObject(payload.options);
  if (Object.prototype.hasOwnProperty.call(payload, 'ingredients')) normalized.ingredients = parseJsonArray(payload.ingredients);
  if (Object.prototype.hasOwnProperty.call(payload, 'contains_info')) normalized.contains_info = payload.contains_info || '';
  if (Object.prototype.hasOwnProperty.call(payload, 'conservation')) normalized.conservation = payload.conservation || '';
  if (Object.prototype.hasOwnProperty.call(payload, 'shelf_life_hours')) normalized.shelf_life_hours = Number(payload.shelf_life_hours);
  if (Object.prototype.hasOwnProperty.call(payload, 'calories_kcal')) normalized.calories_kcal = Number(payload.calories_kcal);
  if (Object.prototype.hasOwnProperty.call(payload, 'nutrition_table')) normalized.nutrition_table = parseJsonObject(payload.nutrition_table);
  if (Object.prototype.hasOwnProperty.call(payload, 'sanitary_approved')) normalized.sanitary_approved = parseBooleanValue(payload.sanitary_approved, true);
  if (Object.prototype.hasOwnProperty.call(payload, 'sanitary_notes')) normalized.sanitary_notes = payload.sanitary_notes || '';
  if (Object.prototype.hasOwnProperty.call(payload, 'approved_at')) normalized.approved_at = payload.approved_at;
  return normalized;
}

function normalizeProductFromPg(row) {
  const productName = row.nombre || row.name || '';
  const productCategory = row.category;
  const inferred = inferTechnicalFromName(productName, productCategory);
  const allergens = parseJsonArray(row.alergenos ?? row.allergens);
  const ingredients = parseJsonArray(row.ingredients);
  const nutrition = parseJsonObject(row.nutrition_table);

  return {
    id: row.id,
    name: productName,
    description: row.description || '',
    price: parseFloat(row.precio ?? row.price) || 0,
    category: productCategory === 'sandwich' ? 'bocadillos' : productCategory,
    active: (row.activo ?? row.active) !== false,
    image_url: row.image_url || DEFAULT_PRODUCT_IMAGE,
    badges: parseJsonArray(row.badges),
    allergens: allergens.length ? allergens : inferred.allergens,
    options: parseJsonObject(row.options),
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

function createProductStore() {
  const state = {
    products: MOCK_MENU_BASE.map((product, index) => {
      const technical = inferTechnicalFromName(product.name, product.category);
      const options = product.category === 'cafes'
        ? { sugar: { available: true, max: 3 }, removables: product.name.toLowerCase().includes('leche') ? ['leche', 'cacao'] : [] }
        : { sugar: { available: false }, removables: [] };

      return {
        id: index + 1,
        ...product,
        active: true,
        image_url: DEFAULT_PRODUCT_IMAGE,
        badges: [],
        allergens: technical.allergens,
        options,
        ingredients: technical.ingredients,
        contains_info: technical.contains_info,
        conservation: technical.conservation,
        shelf_life_hours: technical.shelf_life_hours,
        calories_kcal: technical.calories_kcal,
        nutrition_table: technical.nutrition_table,
        sanitary_approved: true,
        sanitary_notes: 'Ficha técnica cargada en modo fallback',
        approved_at: new Date().toISOString(),
      };
    }),
  };

  return {
    list() {
      return state.products;
    },
    nextId() {
      return state.products.reduce((maxId, product) => Math.max(maxId, Number(product.id) || 0), 0) + 1;
    },
    add(product) {
      state.products.push(product);
      return product;
    },
    findIndexById(id) {
      return state.products.findIndex((product) => String(product.id) === String(id));
    },
    findById(id) {
      return state.products.find((product) => String(product.id) === String(id)) || null;
    },
    removeAt(index) {
      return state.products.splice(index, 1);
    },
    updateAt(index, updater) {
      state.products[index] = typeof updater === 'function' ? updater(state.products[index]) : updater;
      return state.products[index];
    },
  };
}

function normalizeSpecialCode(value) {
  if (value === undefined || value === null) return null;
  const normalized = String(value).trim();
  return normalized ? normalized.toLowerCase() : null;
}

function isValidSpecialCode(code) {
  if (code === null) return true;
  return code === 'ayuda';
}

function buildLineItemNotes(item = {}) {
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

function buildOrderQueueEntry(order, items = []) {
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

function generateParentToken() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let token = '';
  for (let i = 0; i < 8; i += 1) token += chars.charAt(Math.floor(Math.random() * chars.length));
  return token;
}

function calculateAge(birthDate) {
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) age -= 1;
  return age;
}

function normalizeNameSpaces(value = '') {
  return String(value).trim().replace(/\s+/g, ' ');
}

function formatFullName(value = '') {
  const normalized = normalizeNameSpaces(value);
  if (!normalized) return '';
  return normalized
    .split(' ')
    .map((part) => (part ? `${part.charAt(0).toUpperCase()}${part.slice(1).toLowerCase()}` : part))
    .join(' ');
}

function normalizeRelatedUser(user = null) {
  if (!user || typeof user !== 'object') return null;
  return {
    ...user,
    name: user.name || user.nombre || null,
    email: user.email || null,
  };
}

function parsePositiveInteger(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

function normalizeOrderStatus(status) {
  const normalized = String(status || '').trim().toLowerCase();
  if (['pagado', 'paid', 'completada', 'completado', 'completed'].includes(normalized)) return 'paid';
  if (['pendiente', 'pending', 'procesando', 'processing'].includes(normalized)) return 'pending';
  if (['aprobado', 'approved'].includes(normalized)) return 'approved';
  if (['rechazado', 'rejected', 'cancelado', 'cancelled'].includes(normalized)) return 'rejected';
  return normalized || 'pending';
}

function buildOrderStatusAliases(status) {
  const normalized = normalizeOrderStatus(status);
  const aliases = {
    paid: ['paid', 'pagado', 'completed', 'completado', 'completada'],
    pending: ['pending', 'pendiente', 'procesando', 'processing'],
    approved: ['approved', 'aprobado'],
    rejected: ['rejected', 'rechazado', 'cancelado', 'cancelled'],
  };
  return aliases[normalized] || [normalized];
}

function normalizeHistoricOrderEntry(order = {}) {
  const items = Array.isArray(order.items) ? order.items : [];
  const parsedTotal = Number.parseFloat(order.total ?? 0);
  return {
    ...order,
    status: normalizeOrderStatus(order.status || order.estado),
    created_at: order.created_at || order.fecha_creacion || new Date().toISOString(),
    total: Number.isFinite(parsedTotal) ? parsedTotal : 0,
    items_count: Number.parseInt(order.items_count, 10) || items.length || 0,
    items,
  };
}

function isUuidLike(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || '').trim());
}

function isValidFullName(value = '') {
  const normalized = normalizeNameSpaces(value);
  const words = normalized.split(' ').filter(Boolean);
  if (words.length < 2) return false;
  return /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ' -]+$/.test(normalized);
}

function normalizeAlias(value) {
  if (value === undefined || value === null) return null;
  const alias = String(value).trim();
  return alias || null;
}

function isValidAlias(value) {
  if (value === null || value === undefined || value === '') return true;
  return /^[A-Za-z0-9_.-]{3,30}$/.test(String(value));
}

function normalizeFavoriteIds(value) {
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

function serializeFavoriteIdsForDatabase(favoriteIds) {
  return normalizeFavoriteIds(favoriteIds);
}

function getUserDisplayName(user = {}) {
  return user.alias || user.name || user.nombre || user.email || 'Usuario';
}

function transformProducto(supabaseProduct) {
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

  const inferred = inferTechnicalFromName(productName, category);
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

export function createAppContext() {
  initSentry();

  const app = express();
  const PORT = process.env.PORT || 3000;
  const isProduction = process.env.NODE_ENV === 'production';
  const isHosted = isHostedDeployment();
  const JWT_SECRET = process.env.JWT_SECRET || (!isProduction ? randomBytes(32).toString('hex') : null);

  if (!process.env.JWT_SECRET) {
    if (isProduction) throw new Error('JWT_SECRET es obligatorio en producción');
    console.warn('JWT_SECRET no configurado. Se usa una clave temporal de desarrollo.');
  }

  const supabaseUrl = (process.env.SUPABASE_URL || '').trim();
  const supabaseServerKey = (
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SECRET_KEY ||
    process.env.SUPABASE_SERVICE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    ''
  ).trim();

  if (!supabaseUrl || !supabaseServerKey) {
    throw new Error('SUPABASE_URL y SUPABASE_SECRET_KEY/SUPABASE_SERVICE_ROLE_KEY son obligatorios');
  }

  const supabase = createClient(supabaseUrl, supabaseServerKey);
  const bypassRequestedInDisabledEnvironment = (isProduction || isHosted) && parseBooleanValue(process.env.DEV_BYPASS_STRIPE_PAYMENT, false);
  const developmentPaymentBypassEnabled = isDevelopmentPaymentBypassEnabled({ isProduction, isHosted });
  const stripeSecretKey = (process.env.STRIPE_SECRET_KEY || '').trim();

  if (bypassRequestedInDisabledEnvironment) {
    console.warn('DEV_BYPASS_STRIPE_PAYMENT esta activo en produccion/Railway, pero se ignorara para no saltar Stripe.');
  }

  if (!stripeSecretKey) {
    if ((isProduction || isHosted) && !developmentPaymentBypassEnabled) {
      throw new Error('STRIPE_SECRET_KEY es obligatorio en produccion/Railway para no saltar la pasarela de pago');
    }
    console.warn('STRIPE_SECRET_KEY no configurado. Stripe quedara deshabilitado hasta definir la clave.');
  }

  const stripe = stripeSecretKey ? new Stripe(stripeSecretKey) : null;

  console.log('Supabase configurado. Se usara como unico origen de datos.');

  app.use(cors());
  app.use(express.json());
  app.use(createHttpLogger());
  app.use((req, res, next) => {
    res.on('finish', () => captureServerResponse(req, res));
    next();
  });
  app.use((req, res, next) => {
    req.supabase = supabase;
    next();
  });

  function authenticateToken(req, res, next) {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Token no proporcionado' });
    jwt.verify(token, JWT_SECRET, (err, user) => {
      if (err) return res.status(403).json({ error: 'Token inválido' });
      req.user = user;
      if (isSentryEnabled() && user?.id) {
        Sentry.setUser({ id: String(user.id), role: user.role });
      }
      next();
    });
  }

  function isParentCapableUser(user) {
    if (!user) return false;
    return user.role !== 'child';
  }

  function requireAdmin(req, res, next) {
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Acceso denegado: solo administradores' });
    }
    next();
  }

  async function notifyUserSafely(userId, payload) {
    if (!userId || !supabase) return;
    try {
      await sendPushToUser(supabase, { userId, ...payload });
    } catch (error) {
      console.error(`Error enviando notificacion a user ${userId}:`, error);
    }
  }

  async function getUserSpecialMode(userId) {
    if (!userId) return { enabled: false, code: null };
    try {
      const { data, error } = await supabase
        .from('users')
        .select('is_adult, special_code')
        .eq('id', userId)
        .single();

      if (error) {
        if (error.message?.toLowerCase().includes('special_code')) return { enabled: false, code: null };
        throw error;
      }

      const code = normalizeSpecialCode(data?.special_code);
      return { enabled: Boolean(data?.is_adult && code === 'ayuda'), code };
    } catch (error) {
      console.error('Error al comprobar el modo especial del usuario:', error);
      return { enabled: false, code: null };
    }
  }

  async function findAuthUserByEmail(email) {
    const normalizedEmail = String(email || '').trim().toLowerCase();
    if (!normalizedEmail) return null;

    const perPage = 200;
    for (let page = 1; page <= 25; page += 1) {
      const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
      if (error) throw error;

      const users = Array.isArray(data?.users) ? data.users : [];
      const match = users.find((user) => String(user?.email || '').trim().toLowerCase() === normalizedEmail);
      if (match) return match;
      if (users.length < perPage) break;
    }

    return null;
  }

  async function ensureProfileForAppUser(appUser, options = {}) {
    if (!supabase) {
      const error = new Error('Supabase no esta configurado en el backend');
      error.statusCode = 503;
      throw error;
    }

    if (!appUser?.email) {
      const error = new Error('No se puede resolver el perfil del usuario sin email');
      error.statusCode = 400;
      throw error;
    }

    let authUser = await findAuthUserByEmail(appUser.email);

    if (!authUser) {
      const generatedPassword = options.password || randomBytes(24).toString('hex');
      const { data, error } = await supabase.auth.admin.createUser({
        email: appUser.email,
        password: generatedPassword,
        email_confirm: true,
        user_metadata: {
          legacy_user_id: appUser.id ?? null,
          role: appUser.role ?? null,
          is_adult: Boolean(appUser.is_adult),
          full_name: appUser.nombre || null,
        },
      });

      if (error) {
        const maybeExistingUser = await findAuthUserByEmail(appUser.email);
        if (!maybeExistingUser) throw error;
        authUser = maybeExistingUser;
      } else {
        authUser = data?.user || null;
      }
    }

    if (!authUser?.id) {
      const error = new Error('No se pudo resolver el usuario auth de Supabase');
      error.statusCode = 500;
      throw error;
    }

    const { error: profileError } = await supabase
      .from('perfiles')
      .upsert({
        id: authUser.id,
        nombre_completo: appUser.nombre || null,
      }, { onConflict: 'id' });

    if (profileError) throw profileError;
    return authUser.id;
  }

  async function resolveProfileIdForUser(userLike, options = {}) {
    if (!supabase || !userLike) return null;

    if (isUuidLike(userLike.profileId)) return String(userLike.profileId);
    if (isUuidLike(userLike.id) && !userLike.email) return String(userLike.id);

    let appUser = null;
    if (userLike.email) {
      const { data, error } = await supabase
        .from('users')
        .select('id, email, nombre, role, is_adult')
        .eq('email', userLike.email)
        .maybeSingle();

      if (error) throw error;
      appUser = data;
    } else if (userLike.id !== undefined && userLike.id !== null) {
      const { data, error } = await supabase
        .from('users')
        .select('id, email, nombre, role, is_adult')
        .eq('id', userLike.id)
        .maybeSingle();

      if (error) throw error;
      appUser = data;
    }

    if (!appUser) return null;
    return ensureProfileForAppUser(appUser, options);
  }

  async function getActiveProductSummary() {
    const { data, count, error } = await supabase
      .from('productos_menu')
      .select('id', { count: 'exact' })
      .eq('activo', true);

    if (error) throw error;

    return {
      source: 'Supabase',
      count: Number.isFinite(count) ? count : (Array.isArray(data) ? data.length : 0),
    };
  }

  async function findCatalogProductById(productId) {
    const normalizedId = String(productId || '').trim();
    if (!normalizedId) return null;

    const { data, error } = await supabase.from('productos_menu').select('*').eq('id', normalizedId).single();
    if (error || !data) return null;
    return transformProducto(data);
  }

  async function validateOrderItems(items = [], options = {}) {
    const buildValidationError = (message) => {
      const error = new Error(message);
      error.statusCode = 400;
      return error;
    };

    const userSpecialMode = options.userId ? await getUserSpecialMode(options.userId) : { enabled: false, code: null };
    let subtotal = 0;
    const validatedItems = [];

    for (const rawItem of items) {
      const productId = rawItem?.product_id;
      const quantity = Number.parseInt(rawItem?.quantity, 10);
      const normalizedProductId = String(productId || '').trim();

      if (!normalizedProductId) throw buildValidationError('Producto invalido');
      if (Number.isNaN(quantity) || quantity <= 0 || quantity > 50) throw buildValidationError('Cantidad invalida (1-50)');

      const product = await findCatalogProductById(normalizedProductId);
      if (!product) throw buildValidationError(`Producto ${normalizedProductId} no encontrado`);
      if (!product.active) throw buildValidationError(`Producto ${product.name} no esta disponible`);

      const productAllergens = Array.isArray(product.allergens) ? product.allergens : [];
      const hasHelpAllergen = productAllergens.some((allergen) => String(allergen || '').trim().toLowerCase() === 'ayuda');
      if (userSpecialMode.enabled && !hasHelpAllergen) {
        throw buildValidationError(`Producto ${product.name} no disponible con el codigo especial`);
      }

      const unitPrice = userSpecialMode.enabled ? 0 : (Number.parseFloat(product.price) || 0);
      const itemSubtotal = unitPrice * quantity;
      subtotal += itemSubtotal;

      validatedItems.push({
        product_id: product.id,
        product_name: product.name,
        quantity,
        price: unitPrice,
        subtotal: itemSubtotal,
        notes: buildLineItemNotes(rawItem),
        allergens: productAllergens,
      });
    }

    const tax = Number((subtotal * 0.05).toFixed(2));
    const total = Number((subtotal + tax).toFixed(2));
    return {
      subtotal: Number(subtotal.toFixed(2)),
      tax,
      total,
      items: validatedItems,
    };
  }

  async function startServer() {
    app.listen(PORT, () => {
      console.log(`Servidor corriendo en http://localhost:${PORT}`);

      void (async () => {
        try {
          const productSummary = await getActiveProductSummary();
          console.log(`Productos disponibles (${productSummary.source}): ${productSummary.count}`);
        } catch (error) {
          console.error('No se pudo obtener el resumen inicial de productos:', error);
        }
      })();
    });
  }

  return {
    app,
    PORT,
    JWT_SECRET,
    supabase,
    stripe,
    developmentPaymentBypassEnabled,
    authenticateToken,
    requireAdmin,
    isParentCapableUser,
    notifyUserSafely,
    getActiveProductSummary,
    findCatalogProductById,
    validateOrderItems,
    ensureProfileForAppUser,
    resolveProfileIdForUser,
    startServer,
    loginRateLimiter,
    registrationRateLimiter,
    linkingRateLimiter,
    resetLoginAttempts,
    getClientIP,
    logSecurityEvent,
    calculateTrustScore,
    requireTrustScore,
    validateLinkingLimits,
    registerDeviceToken,
    deactivateDeviceToken,
    listUserNotifications,
    markNotificationAsRead,
    isSentryEnabled,
    parseJsonArray,
    parseJsonObject,
    parseBooleanValue,
    inferTechnicalFromName,
    normalizeIncomingProductPayload,
    normalizePartialIncomingProductPayload,
    normalizeProductFromPg,
    normalizeSpecialCode,
    isValidSpecialCode,
    buildLineItemNotes,
    buildOrderQueueEntry,
    generateParentToken,
    calculateAge,
    normalizeNameSpaces,
    formatFullName,
    normalizeRelatedUser,
    parsePositiveInteger,
    normalizeOrderStatus,
    buildOrderStatusAliases,
    normalizeHistoricOrderEntry,
    isUuidLike,
    isValidFullName,
    normalizeAlias,
    isValidAlias,
    normalizeFavoriteIds,
    serializeFavoriteIdsForDatabase,
    getUserDisplayName,
    transformProducto,
  };
}
