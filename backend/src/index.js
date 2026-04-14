import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { randomBytes } from 'crypto';
import { createClient } from '@supabase/supabase-js';
import path from 'path';
import { fileURLToPath } from 'url';
import pkg from 'pg';
const { Pool } = pkg;
import Stripe from 'stripe';
import { 
  loginRateLimiter, 
  registrationRateLimiter, 
  linkingRateLimiter,
  resetLoginAttempts,
  getClientIP 
} from './middleware/rateLimiter.js';
import { 
  logSecurityEvent, 
  calculateTrustScore, 
  requireTrustScore,
  validateLinkingLimits 
} from './middleware/fraudPrevention.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });
dotenv.config({ path: path.join(__dirname, '../../.env'), override: false });

const app = express();
const PORT = process.env.PORT || 3000;
const isProduction = process.env.NODE_ENV === 'production';
const JWT_SECRET = process.env.JWT_SECRET || (!isProduction ? randomBytes(32).toString('hex') : null);

if (!process.env.JWT_SECRET) {
  if (isProduction) {
    throw new Error('JWT_SECRET es obligatorio en producción');
  }
  console.warn('⚠️ JWT_SECRET no configurado. Se usa una clave temporal de desarrollo.');
}

// Inicializar cliente de Supabase para uso del servidor.
const supabaseUrl = (process.env.SUPABASE_URL || '').trim();
const supabaseServerKey = (
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SECRET_KEY ||
  process.env.SUPABASE_SERVICE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  ''
).trim();

if (!supabaseUrl || !supabaseServerKey) {
  console.warn('⚠️ Variables de Supabase incompletas. Usando PostgreSQL local o datos mock.');
}

const supabase = supabaseUrl && supabaseServerKey ? createClient(supabaseUrl, supabaseServerKey) : null;

// Inicializar conexión a PostgreSQL local
const pool = new Pool({
  user: process.env.POSTGRES_USER || 'cafeteria_user',
  password: process.env.POSTGRES_PASSWORD || 'cafeteria_pass',
  host: process.env.POSTGRES_HOST || '127.0.0.1',
  port: parseInt(process.env.POSTGRES_PORT || '5433', 10),
  database: process.env.POSTGRES_DB || 'cafeteria_db'
});

pool.on('error', (err) => {
  console.error('Error en pool:', err);
});

// Inicializar Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Middlewares
app.use(cors());
app.use(express.json());

// Middleware para inyectar supabase en req
app.use((req, res, next) => {
  req.supabase = supabase;
  next();
});

// ============================================
// DATOS MOCK (mientras se conecta Supabase)
// ============================================

const MOCK_MENU_BASE = [
  { name: 'Café Espresso', description: 'Café espresso clásico', price: 1.50, category: 'cafes' },
  { name: 'Café Americano', description: 'Espresso con agua caliente', price: 1.80, category: 'cafes' },
  { name: 'Café con Leche', description: 'Espresso con leche espumada', price: 2.00, category: 'cafes' },
  { name: 'Capuchino', description: 'Café con leche y cacao en polvo', price: 2.50, category: 'cafes' },
  { name: 'Latte Macchiato', description: 'Leche con café y espuma', price: 2.80, category: 'cafes' },
  { name: 'Café Descafeinado', description: 'Espresso sin cafeína', price: 2.00, category: 'cafes' },
  { name: 'Café Cortado', description: 'Espresso con un poco de leche', price: 1.70, category: 'cafes' },
  { name: 'Bocadillo de Jamón Serrano', description: 'Pan tostado con jamón serrano', price: 4.50, category: 'bocadillos' },
  { name: 'Bocadillo de Queso', description: 'Pan tostado con queso manchego', price: 3.50, category: 'bocadillos' },
  { name: 'Bocadillo Mixto', description: 'Pan tostado con jamón y queso', price: 5.00, category: 'bocadillos' },
  { name: 'Bocadillo de Atún', description: 'Pan con atún fresco y mayonesa', price: 4.00, category: 'bocadillos' },
  { name: 'Bocadillo Vegetal', description: 'Pan con lechuga, tomate y aguacate', price: 4.50, category: 'bocadillos' },
  { name: 'Sándwich de Pollo', description: 'Pan con pechuga de pollo a la plancha', price: 5.00, category: 'bocadillos' },
  { name: 'Tostada de Aguacate', description: 'Pan integral con aguacate y huevo', price: 4.50, category: 'bocadillos' },
  { name: 'Pincho de Tortilla', description: 'Pincho de tortilla española típica', price: 3.00, category: 'bocadillos' },
  { name: 'Mini Croissant Relleno', description: 'Croissant mini con jamón y queso', price: 3.50, category: 'bocadillos' },
  { name: 'Croissant de Mantequilla', description: 'Croissant de hojaldre crujiente', price: 2.50, category: 'dulces' },
  { name: 'Cruasán de Chocolate', description: 'Croissant relleno de chocolate', price: 3.00, category: 'dulces' },
  { name: 'Muffin de Arándanos', description: 'Muffin casero con arándanos frescos', price: 2.80, category: 'dulces' },
  { name: 'Donut Glaseado', description: 'Donut con cobertura de azúcar', price: 2.00, category: 'dulces' },
  { name: 'Tarta de Queso', description: 'Porción de tarta de queso neoyorquina', price: 4.00, category: 'dulces' },
  { name: 'Galleta de Chocolate', description: 'Galleta casera con pepitas de chocolate', price: 1.50, category: 'dulces' },
  { name: 'Zumo de Naranja Natural', description: 'Zumo natural de naranja recién exprimido', price: 3.00, category: 'bebidas' },
  { name: 'Batido de Fresa', description: 'Batido casero de fresas frescas', price: 3.50, category: 'bebidas' },
  { name: 'Batido de Vainilla', description: 'Batido cremoso de vainilla', price: 3.50, category: 'bebidas' },
  { name: 'Agua Mineral', description: 'Agua mineral sin gas', price: 1.00, category: 'bebidas' }
];

let products = MOCK_MENU_BASE.map((product, index) => {
  const technical = inferTechnicalFromName(product.name, product.category);
  const options = product.category === 'cafes'
    ? { sugar: { available: true, max: 3 }, removables: product.name.toLowerCase().includes('leche') ? ['leche', 'cacao'] : [] }
    : { sugar: { available: false }, removables: [] };

  return {
    id: index + 1,
    ...product,
    active: true,
    image_url: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=400&q=80',
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
    approved_at: new Date().toISOString()
  };
});

let nextProductId = products.length + 1;

// ============================================
// HELPERS Y UTILIDADES
// ============================================

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

function normalizeIncomingProductPayload(payload = {}) {
  const normalized = {
    name: (payload.name || '').trim(),
    description: payload.description || '',
    price: Number(payload.price),
    category: payload.category === 'sandwich' ? 'bocadillos' : payload.category,
    active: parseBooleanValue(payload.active, true),
    image_url: payload.image_url || 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=400&q=80',
    badges: parseJsonArray(payload.badges),
    allergens: parseJsonArray(payload.allergens),
    options: parseJsonObject(payload.options),
    ingredients: parseJsonArray(payload.ingredients),
    contains_info: payload.contains_info || '',
    conservation: payload.conservation || 'Conservar refrigerado entre 0ºC y 4ºC. Consumir en el día.',
    shelf_life_hours: Number(payload.shelf_life_hours || 24),
    calories_kcal: Number(payload.calories_kcal || 0),
    nutrition_table: parseJsonObject(payload.nutrition_table),
    sanitary_approved: parseBooleanValue(payload.sanitary_approved, true),
    sanitary_notes: payload.sanitary_notes || '',
    approved_at: payload.approved_at || null
  };

  if (!normalized.ingredients.length) {
    const inferred = inferTechnicalFromName(normalized.name, normalized.category);
    normalized.ingredients = inferred.ingredients;
    normalized.contains_info = normalized.contains_info || inferred.contains_info;
    normalized.conservation = normalized.conservation || inferred.conservation;
    normalized.shelf_life_hours = Number.isFinite(normalized.shelf_life_hours) ? normalized.shelf_life_hours : inferred.shelf_life_hours;
    normalized.calories_kcal = Number.isFinite(normalized.calories_kcal) && normalized.calories_kcal > 0 ? normalized.calories_kcal : inferred.calories_kcal;
    if (!Object.keys(normalized.nutrition_table).length) {
      normalized.nutrition_table = inferred.nutrition_table;
    }
    if (!normalized.allergens.length) {
      normalized.allergens = inferred.allergens;
    }
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
      nutrition_table = { proteins_g: 0.2, carbs_g: 0.3, fats_g: 0.0, salt_g: 0.0 };
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
    nutrition_table = { proteins_g: 11.0, carbs_g: 28.0, fats_g: 10.0, salt_g: 1.2 };
  } else if (cat === 'dulces') {
    ingredients = ['Harina de trigo', 'Azúcar', 'Mantequilla', 'Huevo'];
    allergens = ['gluten', 'lactosa', 'huevo'];
    calories_kcal = 340;
    nutrition_table = { proteins_g: 6.0, carbs_g: 42.0, fats_g: 16.0, salt_g: 0.4 };
  } else {
    ingredients = nombre.includes('zumo') ? ['Zumo de fruta'] : ['Agua'];
    if (nombre.includes('batido')) {
      ingredients = ['Leche', 'Fruta'];
      allergens = ['lactosa'];
    }
    calories_kcal = nombre.includes('agua') ? 0 : 48;
    nutrition_table = { proteins_g: 0.5, carbs_g: 11.0, fats_g: 0.3, salt_g: 0.1 };
  }

  return {
    ingredients,
    allergens: [...new Set(allergens)],
    conservation: 'Conservar refrigerado entre 0ºC y 4ºC. Consumir en el día.',
    shelf_life_hours: cat === 'bebidas' ? 12 : 24,
    calories_kcal,
    nutrition_table,
    contains_info: allergens.length ? `Contiene: ${[...new Set(allergens)].join(', ')}` : 'Sin alérgenos declarados'
  };
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
    image_url: row.image_url || 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=400&q=80',
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
    created_at: row.created_at
  };
}

async function ensureLocalProductSchema() {
  const alterStatements = [
    `ALTER TABLE productos_menu ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'cafes'`,
    `ALTER TABLE productos_menu ADD COLUMN IF NOT EXISTS description TEXT DEFAULT ''`,
    `ALTER TABLE productos_menu ADD COLUMN IF NOT EXISTS image_url TEXT`,
    `ALTER TABLE productos_menu ADD COLUMN IF NOT EXISTS badges JSONB DEFAULT '[]'::jsonb`,
    `ALTER TABLE productos_menu ADD COLUMN IF NOT EXISTS options JSONB DEFAULT '{}'::jsonb`,
    `ALTER TABLE productos_menu ADD COLUMN IF NOT EXISTS ingredients JSONB DEFAULT '[]'::jsonb`,
    `ALTER TABLE productos_menu ADD COLUMN IF NOT EXISTS contains_info TEXT DEFAULT ''`,
    `ALTER TABLE productos_menu ADD COLUMN IF NOT EXISTS conservation TEXT DEFAULT 'Conservar refrigerado entre 0ºC y 4ºC'`,
    `ALTER TABLE productos_menu ADD COLUMN IF NOT EXISTS shelf_life_hours INT DEFAULT 24`,
    `ALTER TABLE productos_menu ADD COLUMN IF NOT EXISTS calories_kcal INT DEFAULT 0`,
    `ALTER TABLE productos_menu ADD COLUMN IF NOT EXISTS nutrition_table JSONB DEFAULT '{}'::jsonb`,
    `ALTER TABLE productos_menu ADD COLUMN IF NOT EXISTS sanitary_approved BOOLEAN DEFAULT true`,
    `ALTER TABLE productos_menu ADD COLUMN IF NOT EXISTS sanitary_notes TEXT DEFAULT ''`,
    `ALTER TABLE productos_menu ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP`
  ];

  for (const statement of alterStatements) {
    await pool.query(statement);
  }

  await pool.query(`
    UPDATE productos_menu
    SET
      badges = COALESCE(badges, '[]'::jsonb),
      alergenos = COALESCE(alergenos, '[]'::jsonb),
      options = COALESCE(options, '{}'::jsonb),
      ingredients = COALESCE(ingredients, '[]'::jsonb),
      contains_info = COALESCE(contains_info, ''),
      conservation = COALESCE(conservation, 'Conservar refrigerado entre 0ºC y 4ºC'),
      shelf_life_hours = COALESCE(shelf_life_hours, 24),
      calories_kcal = COALESCE(calories_kcal, 0),
      nutrition_table = COALESCE(nutrition_table, '{}'::jsonb),
      sanitary_approved = COALESCE(sanitary_approved, true),
      sanitary_notes = COALESCE(sanitary_notes, '')
  `);
}

async function ensureLocalUserSchema() {
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS alias VARCHAR(30)`);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS favoritos TEXT[] DEFAULT '{}'::TEXT[]`);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS special_code VARCHAR(50)`);
  await pool.query(`
    ALTER TABLE users
    ALTER COLUMN favoritos TYPE TEXT[]
    USING (
      CASE
        WHEN favoritos IS NULL THEN '{}'::TEXT[]
        ELSE ARRAY(SELECT item::TEXT FROM unnest(favoritos) AS item)
      END
    )
  `);
  await pool.query(`ALTER TABLE users ALTER COLUMN favoritos SET DEFAULT '{}'::TEXT[]`);
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

async function getUserSpecialMode(userId) {
  if (!userId) {
    return { enabled: false, code: null };
  }

  try {
    if (supabase) {
      const { data, error } = await supabase
        .from('users')
        .select('is_adult, special_code')
        .eq('id', userId)
        .single();

      if (error) {
        if (error.message?.toLowerCase().includes('special_code')) {
          return { enabled: false, code: null };
        }
        throw error;
      }

      const code = normalizeSpecialCode(data?.special_code);
      return {
        enabled: Boolean(data?.is_adult && code === 'ayuda'),
        code,
      };
    }

    const result = await pool.query(
      'SELECT is_adult, special_code FROM users WHERE id = $1 LIMIT 1',
      [userId]
    );

    const row = result.rows[0];
    const code = normalizeSpecialCode(row?.special_code);
    return {
      enabled: Boolean(row?.is_adult && code === 'ayuda'),
      code,
    };
  } catch (error) {
    console.error('Error al comprobar el modo especial del usuario:', error);
    return { enabled: false, code: null };
  }
}

function isLocalDatabaseUnavailable(error) {
  const message = String(error?.message || '').toLowerCase();
  return (
    error?.code === 'ECONNREFUSED' ||
    error?.code === 'EPERM' ||
    message.includes('connect econnrefused') ||
    message.includes('connect eperm')
  );
}

async function getActiveProductSummary() {
  if (supabase) {
    try {
      const { data, count, error } = await supabase
        .from('productos_menu')
        .select('id', { count: 'exact' })
        .eq('activo', true);

      if (error) {
        console.warn('⚠️ Supabase no devolvio productos activos:', error.message || String(error));
      } else {
        const resolvedCount = Number.isFinite(count)
          ? count
          : (Array.isArray(data) ? data.length : 0);

        return { source: 'Supabase', count: resolvedCount };
      }
    } catch (error) {
      console.warn('⚠️ No se pudo contar productos en Supabase:', error?.message || String(error));
    }
  }

  try {
    const result = await pool.query(
      'SELECT COUNT(*) AS count FROM productos_menu WHERE activo = true AND sanitary_approved = true'
    );

    return {
      source: 'PostgreSQL local',
      count: Number.parseInt(result.rows[0]?.count, 10) || 0
    };
  } catch (error) {
    if (!isLocalDatabaseUnavailable(error)) {
      console.warn('⚠️ No se pudo contar productos en PostgreSQL local:', error?.message || String(error));
    }
  }

  return {
    source: 'fallback en memoria',
    count: products.filter((product) => product.active).length
  };
}

async function findCatalogProductById(productId) {
  const normalizedId = String(productId || '').trim();

  if (!normalizedId) {
    return null;
  }

  try {
    const result = await pool.query('SELECT * FROM productos_menu WHERE id = $1 LIMIT 1', [normalizedId]);
    if (result.rows.length > 0) {
      return normalizeProductFromPg(result.rows[0]);
    }
  } catch (error) {
    console.warn('⚠️ No se pudo consultar producto en PostgreSQL local:', error?.message || String(error));
  }

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('productos_menu')
        .select('*')
        .eq('id', normalizedId)
        .single();

      if (!error && data) {
        return transformProducto(data);
      }
    } catch (error) {
      console.warn('⚠️ No se pudo consultar producto en Supabase:', error?.message || String(error));
    }
  }

  const fallbackProduct = products.find((product) => String(product.id) === normalizedId);
  return fallbackProduct || null;
}

function buildLineItemNotes(item = {}) {
  const noteParts = [];

  if (item.notes) {
    noteParts.push(String(item.notes).trim());
  }

  const chosenOptions = item.chosen_options && typeof item.chosen_options === 'object'
    ? item.chosen_options
    : {};

  if (Array.isArray(chosenOptions.removed) && chosenOptions.removed.length > 0) {
    noteParts.push(`Sin: ${chosenOptions.removed.join(', ')}`);
  }

  if (chosenOptions.sugar !== undefined && chosenOptions.sugar !== null && chosenOptions.sugar !== '') {
    noteParts.push(`Azucar: ${chosenOptions.sugar}`);
  }

  return noteParts.filter(Boolean).join(' | ');
}

async function validateOrderItems(items = [], options = {}) {
  const buildValidationError = (message) => {
    const error = new Error(message);
    error.statusCode = 400;
    return error;
  };

  const userSpecialMode = options.userId
    ? await getUserSpecialMode(options.userId)
    : { enabled: false, code: null };

  let subtotal = 0;
  const validatedItems = [];

  for (const rawItem of items) {
    const productId = rawItem?.product_id;
    const quantity = Number.parseInt(rawItem?.quantity, 10);
    const normalizedProductId = String(productId || '').trim();

    if (!normalizedProductId) {
      throw buildValidationError('Producto invalido');
    }

    if (Number.isNaN(quantity) || quantity <= 0 || quantity > 50) {
      throw buildValidationError('Cantidad invalida (1-50)');
    }

    const product = await findCatalogProductById(normalizedProductId);
    if (!product) {
      throw buildValidationError(`Producto ${normalizedProductId} no encontrado`);
    }

    if (!product.active) {
      throw buildValidationError(`Producto ${product.name} no esta disponible`);
    }

    const productAllergens = Array.isArray(product.allergens) ? product.allergens : [];
    const hasHelpAllergen = productAllergens.some(
      (allergen) => String(allergen || '').trim().toLowerCase() === 'ayuda'
    );

    if (userSpecialMode.enabled && !hasHelpAllergen) {
      throw buildValidationError(`Producto ${product.name} no disponible con el codigo especial`);
    }

    const unitPrice = userSpecialMode.enabled
      ? 0
      : (Number.parseFloat(product.price) || 0);
    const itemSubtotal = unitPrice * quantity;
    subtotal += itemSubtotal;

    validatedItems.push({
      product_id: product.id,
      product_name: product.name,
      quantity,
      price: unitPrice,
      subtotal: itemSubtotal,
      notes: buildLineItemNotes(rawItem),
      allergens: productAllergens
    });
  }

  const tax = Number((subtotal * 0.05).toFixed(2));
  const total = Number((subtotal + tax).toFixed(2));

  return {
    subtotal: Number(subtotal.toFixed(2)),
    tax,
    total,
    items: validatedItems
  };
}

function buildOrderQueueEntry(order, items = []) {
  const uniqueAllergens = [...new Set(
    items.flatMap((item) => Array.isArray(item.allergens) ? item.allergens : [])
  )];

  return {
    ...order,
    items: items.map((item) => ({
      product_id: item.product_id,
      product_name: item.product_name,
      quantity: item.quantity,
      price: item.price,
      subtotal: item.subtotal,
      notes: item.notes || ''
    })),
    allergens: uniqueAllergens
  };
}

// Generar token único de padre (8 caracteres alfanuméricos)
function generateParentToken() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Sin letras/números confusos
  let token = '';
  for (let i = 0; i < 8; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

// Calcular edad desde fecha de nacimiento
function calculateAge(birthDate) {
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
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
    .map((part) => {
      if (!part) return part;
      const first = part.charAt(0).toUpperCase();
      const rest = part.slice(1).toLowerCase();
      return `${first}${rest}`;
    })
    .join(' ');
}

function normalizeRelatedUser(user = null) {
  if (!user || typeof user !== 'object') {
    return null;
  }

  return {
    ...user,
    name: user.name || user.nombre || null,
    email: user.email || null
  };
}

function parsePositiveInteger(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

function normalizeOrderStatus(status) {
  const normalized = String(status || '').trim().toLowerCase();

  if (['pagado', 'paid', 'completada', 'completado', 'completed'].includes(normalized)) {
    return 'paid';
  }
  if (['pendiente', 'pending', 'procesando', 'processing'].includes(normalized)) {
    return 'pending';
  }
  if (['aprobado', 'approved'].includes(normalized)) {
    return 'approved';
  }
  if (['rechazado', 'rejected', 'cancelado', 'cancelled'].includes(normalized)) {
    return 'rejected';
  }

  return normalized || 'pending';
}

function buildOrderStatusAliases(status) {
  const normalized = normalizeOrderStatus(status);

  const aliases = {
    paid: ['paid', 'pagado', 'completed', 'completado', 'completada'],
    pending: ['pending', 'pendiente', 'procesando', 'processing'],
    approved: ['approved', 'aprobado'],
    rejected: ['rejected', 'rechazado', 'cancelado', 'cancelled']
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
    items
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
  if (!alias) return null;
  return alias;
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
      source = trimmed
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
    }
  }

  if (!Array.isArray(source)) {
    return [];
  }

  const uniqueIds = new Set();

  for (const item of source) {
    const normalizedId = String(item ?? '').trim();
    if (normalizedId) {
      uniqueIds.add(normalizedId);
    }
  }

  return Array.from(uniqueIds);
}

function serializeFavoriteIdsForDatabase(favoriteIds) {
  return normalizeFavoriteIds(favoriteIds);
}

// Middleware para verificar JWT
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'Token no proporcionado' });
  }
  
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Token inválido' });
    }
    req.user = user;
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

// Helper para transformar producto de Supabase al formato del frontend
function transformProducto(supabaseProduct) {
  const productName = supabaseProduct.nombre || supabaseProduct.name || 'Sin nombre';
  const nombre = productName.toLowerCase();
  
  // Detectar categoría basándose en el nombre del producto
  let category = 'otros';
  let options = {};
  
  if (nombre.includes('café') || nombre.includes('cacao') || nombre.includes('infusión')) {
    category = 'cafes';
    // Opciones para bebidas calientes
    options = {
      sugar: { available: true, max: 3 },
      removables: nombre.includes('leche') ? ['leche', 'cacao'] : []
    };
  } else if (nombre.includes('bocadillo') || nombre.includes('sandwich') || nombre.includes('combo') || 
             (nombre.includes('croissant') && (nombre.includes('mixto') || nombre.includes('vegetal')))) {
    category = 'bocadillos';
    // Opciones para bocadillos/sandwiches/croissants rellenos
    const removables = ['tomate', 'lechuga', 'aceite'];
    if (nombre.includes('queso') || nombre.includes('mixto')) removables.push('queso');
    if (nombre.includes('jamón') || nombre.includes('embutido')) removables.push('jamón');
    if (nombre.includes('vegetal')) removables.push('vegetal');
    options = {
      sugar: { available: false },
      removables: removables,
      addables: ['extra queso', 'extra tomate', 'extra lechuga']
    };
  } else if (nombre.includes('galleta') || nombre.includes('barrita') || nombre.includes('pan')) {
    category = 'dulces';
    options = {
      sugar: { available: false },
      removables: []
    };
  } else if (nombre.includes('zumo') || nombre.includes('agua') || nombre.includes('refresco')) {
    category = 'bebidas';
    options = {
      sugar: { available: false },
      removables: [],
      ice: { available: nombre.includes('refresco') || nombre.includes('zumo') }
    };
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
    image_url: supabaseProduct.imagen_url || supabaseProduct.image_url || 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=400&q=80',
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
    approved_at: supabaseProduct.fecha_aprobacion || supabaseProduct.approved_at || null
  };
}

// ============================================
// ENDPOINTS
// ============================================

// Healthcheck
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ============================================
// AUTENTICACIÓN
// ============================================

// Registro de nuevo usuario
app.post('/api/auth/register', registrationRateLimiter, async (req, res) => {
  try {
    const { email, password, name, birthDate } = req.body;
    const clientIP = getClientIP(req);
    const formattedName = formatFullName(name);
    
    // Validaciones básicas
    if (!email || !password || !formattedName || !birthDate) {
      await logSecurityEvent(supabase, {
        actionType: 'registration_failed_validation',
        severity: 'low',
        details: { reason: 'missing_fields', email },
        req
      });
      return res.status(400).json({ error: 'Faltan campos requeridos' });
    }

    if (!isValidFullName(formattedName)) {
      await logSecurityEvent(supabase, {
        actionType: 'registration_failed_validation',
        severity: 'low',
        details: { reason: 'invalid_full_name', email },
        req
      });
      return res.status(400).json({ error: 'Debes introducir nombre y apellidos con formato válido' });
    }
    
    if (password.length < 6) {
      await logSecurityEvent(supabase, {
        actionType: 'registration_failed_validation',
        severity: 'low',
        details: { reason: 'weak_password', email },
        req
      });
      return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });
    }
    
    // Calcular edad y determinar rol
    const age = calculateAge(birthDate);
    const isAdult = age >= 18;
    // Los adultos son 'customer' por defecto, no 'parent'
    // 'parent' solo se asigna cuando tienen hijos vinculados
    const role = isAdult ? 'customer' : 'child';
    // Los adultos reciben un token para poder vincular familiares si lo desean
    const parentToken = isAdult ? generateParentToken() : null;
    
    // Hash de contraseña
    const passwordHash = await bcrypt.hash(password, 10);
    
    // Crear usuario en la base de datos (Supabase o PostgreSQL local)
    let userData = null;
    
    if (supabase) {
      // Crear en Supabase
      const { data, error } = await supabase
        .from('users')
        .insert([{
          email,
          password_hash: passwordHash,
          nombre: formattedName,
          birth_date: birthDate,
          is_adult: isAdult,
          role,
          parent_token: parentToken
        }])
        .select()
        .single();
      
      if (error) {
        if (error.code === '23505') { // Unique violation
          await logSecurityEvent(supabase, {
            actionType: 'registration_duplicate_email',
            severity: 'medium',
            details: { email },
            req
          });
          return res.status(400).json({ error: 'El email ya está registrado' });
        }
        throw error;
      }
      userData = data;
    } else {
      // Crear en PostgreSQL local
      try {
        const result = await pool.query(
          `INSERT INTO users (email, password_hash, nombre, birth_date, is_adult, role, parent_token)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           RETURNING *`,
          [email, passwordHash, formattedName, birthDate, isAdult, role, parentToken]
        );
        userData = result.rows[0];
      } catch (err) {
        if (err.code === '23505') { // Unique violation
          await logSecurityEvent(supabase, {
            actionType: 'registration_duplicate_email',
            severity: 'medium',
            details: { email },
            req
          });
          return res.status(400).json({ error: 'El email ya está registrado' });
        }
        throw err;
      }
    }
    
    if (!userData) {
      return res.status(500).json({ error: 'Error al crear usuario' });
    }
    
    // Log de registro exitoso
    await logSecurityEvent(supabase, {
      userId: userData.id,
      actionType: 'registration_success',
      severity: 'low',
      details: { email: userData.email, role: userData.role, isAdult: userData.is_adult },
      req
    });
    
    // Generar JWT
    const token = jwt.sign(
      { id: userData.id, email: userData.email, role: userData.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    res.status(201).json({
      message: 'Usuario creado correctamente',
      token,
      user: {
        id: userData.id,
        email: userData.email,
        name: userData.nombre || userData.name,
        alias: userData.alias || null,
        role: userData.role,
        isAdult: userData.is_adult,
        parentToken: userData.parent_token,
        specialCode: normalizeSpecialCode(userData.special_code),
        created_at: userData.created_at || null
      }
    });
  } catch (error) {
    console.error('Error al registrar usuario:', error);
    await logSecurityEvent(supabase, {
      actionType: 'registration_error',
      severity: 'high',
      details: { error: error.message },
      req
    });
    res.status(500).json({ error: 'Error al crear usuario' });
  }
});

// Login
app.post('/api/auth/login', loginRateLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;
    const clientIP = getClientIP(req);
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email y contraseña requeridos' });
    }
    
    // Usuarios demo (hardcoded) - fallback si no hay DB
    if (email === 'demo@demo.com' && password === 'demo') {
      resetLoginAttempts(clientIP);
      const token = jwt.sign(
        { id: 999, email: 'demo@demo.com', role: 'customer', isAdult: true },
        JWT_SECRET,
        { expiresIn: '7d' }
      );
      
      await logSecurityEvent(supabase, {
        userId: 999,
        actionType: 'login_demo',
        severity: 'low',
        details: { email },
        req
      });
      
      return res.json({
        token,
        user: {
          id: 999,
          email: 'demo@demo.com',
        name: 'Usuario Demo',
          alias: null,
          role: 'customer',
          isAdult: true,
          parentToken: null,
          specialCode: null,
          created_at: null
        }
      });
    }
    
    // Admin hardcoded - funciona siempre como fallback
    if ((email === 'admin@admin' || email === 'admin@admin.com') && password === 'admin') {
      resetLoginAttempts(clientIP);
      const token = jwt.sign(
        { id: 1, email: email, role: 'admin', isAdult: true },
        JWT_SECRET,
        { expiresIn: '7d' }
      );
      
      await logSecurityEvent(supabase, {
        userId: 1,
        actionType: 'login_admin',
        severity: 'low',
        details: { email },
        req
      });
      
      return res.json({
        token,
        user: {
          id: 1,
          email: email,
        name: 'Administrador',
          alias: null,
          role: 'admin',
          isAdult: true,
          parentToken: null,
          specialCode: null,
          created_at: null
        }
      });
    }
    
    // Intentar login con base de datos (Supabase o PostgreSQL local)
    let user = null;
    
    if (supabase) {
      // Buscar en Supabase
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .eq('active', true)
        .single();
      
      if (!error && data) {
        user = data;
      }
    } else {
      // Buscar en PostgreSQL local
      try {
        const result = await pool.query(
          'SELECT * FROM users WHERE email = $1 AND active = true',
          [email]
        );
        if (result.rows.length > 0) {
          user = result.rows[0];
        }
      } catch (err) {
        console.error('Error consultando PostgreSQL local:', err);
      }
    }
    
    if (!user) {
      await logSecurityEvent(supabase, {
        actionType: 'login_failed_user_not_found',
        severity: 'medium',
        details: { email },
        req
      });
      return res.status(401).json({ error: 'Credenciales incorrectas' });
    }
    
    // Verificar contraseña
    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      await logSecurityEvent(supabase, {
        userId: user.id,
        actionType: 'login_failed_wrong_password',
        severity: 'high',
        details: { email },
        req
      });
      return res.status(401).json({ error: 'Credenciales incorrectas' });
    }
    
    // Login exitoso - resetear intentos
    resetLoginAttempts(clientIP);
    
    // Actualizar último login
    if (supabase) {
      await supabase
        .from('users')
        .update({ last_login: new Date().toISOString() })
        .eq('id', user.id);
    } else {
      await pool.query(
        'UPDATE users SET last_login = NOW() WHERE id = $1',
        [user.id]
      );
    }
    
    await logSecurityEvent(supabase, {
      userId: user.id,
      actionType: 'login_success',
      severity: 'low',
      details: { email: user.email, role: user.role },
      req
    });
    
    // Generar JWT
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, isAdult: Boolean(user.is_adult) },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    // Calcular trust score
    const trustScore = supabase ? await calculateTrustScore(supabase, user.id) : 100;
    
    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.nombre || user.name,
        alias: user.alias || null,
        role: user.role,
        isAdult: user.is_adult,
        parentToken: user.parent_token,
        specialCode: normalizeSpecialCode(user.special_code),
        favorites: normalizeFavoriteIds(user.favoritos),
        trustScore,
        created_at: user.created_at || null
      }
    });
  } catch (error) {
    console.error('Error al hacer login:', error);
    await logSecurityEvent(supabase, {
      actionType: 'login_error',
      severity: 'high',
      details: { error: error.message },
      req
    });
    res.status(500).json({ error: 'Error al iniciar sesión' });
  }
});

// Obtener perfil del usuario autenticado
app.get('/api/auth/me', authenticateToken, async (req, res) => {
  try {
    if (!supabase) {
      const result = await pool.query(
        'SELECT id, email, nombre AS name, alias, role, is_adult, parent_token, special_code, favoritos, verified_email, verified_phone, created_at FROM users WHERE id = $1 LIMIT 1',
        [req.user.id]
      );

      if (result.rows.length > 0) {
        const user = result.rows[0];
        return res.json({
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            alias: user.alias || null,
            role: user.role,
            isAdult: user.is_adult,
            parentToken: user.parent_token,
            specialCode: normalizeSpecialCode(user.special_code),
            favorites: normalizeFavoriteIds(user.favoritos),
            verified_email: user.verified_email,
            verified_phone: user.verified_phone,
            created_at: user.created_at || null
          }
        });
      }

      return res.json({
        user: {
          id: req.user.id,
          email: req.user.email,
          role: req.user.role,
          favorites: [],
          created_at: null
        }
      });
    }
    
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', req.user.id)
      .single();
    
    if (error || !user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    
    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.nombre || user.name,
        alias: user.alias || null,
        role: user.role,
        isAdult: user.is_adult,
        parentToken: user.parent_token,
        specialCode: normalizeSpecialCode(user.special_code),
        favorites: normalizeFavoriteIds(user.favoritos),
        verified_email: user.verified_email,
        verified_phone: user.verified_phone,
        created_at: user.created_at || null
      }
    });
  } catch (error) {
    console.error('Error al obtener perfil:', error);
    res.status(500).json({ error: 'Error al obtener perfil' });
  }
});

app.get('/api/auth/favorites', authenticateToken, async (req, res) => {
  try {
    if (supabase) {
      const { data, error } = await supabase
        .from('users')
        .select('favoritos')
        .eq('id', req.user.id)
        .single();

      if (error) {
        if (error.message?.toLowerCase().includes('favoritos')) {
          return res.status(400).json({ error: 'Falta la columna favoritos en Supabase. Ejecuta el SQL actualizado.' });
        }
        throw error;
      }

      return res.json({ favorites: normalizeFavoriteIds(data?.favoritos) });
    }

    const result = await pool.query(
      'SELECT favoritos FROM users WHERE id = $1 LIMIT 1',
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    return res.json({ favorites: normalizeFavoriteIds(result.rows[0].favoritos) });
  } catch (error) {
    console.error('Error al obtener favoritos:', error);
    return res.status(500).json({ error: 'Error al obtener favoritos' });
  }
});

app.put('/api/auth/favorites', authenticateToken, async (req, res) => {
  try {
    const favoriteIds = normalizeFavoriteIds(req.body?.favoriteIds);

    if (supabase) {
      const { data, error } = await supabase
        .from('users')
        .update({ favoritos: favoriteIds })
        .eq('id', req.user.id)
        .select('id, favoritos')
        .single();

      if (error) {
        if (error.message?.toLowerCase().includes('favoritos')) {
          return res.status(400).json({ error: 'Falta la columna favoritos en Supabase. Ejecuta el SQL actualizado.' });
        }
        throw error;
      }

      return res.json({
        message: 'Favoritos actualizados correctamente',
        favorites: normalizeFavoriteIds(data?.favoritos)
      });
    }

    const result = await pool.query(
      `UPDATE users
       SET favoritos = $1
       WHERE id = $2
       RETURNING id, favoritos`,
      [serializeFavoriteIdsForDatabase(favoriteIds), req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    return res.json({
      message: 'Favoritos actualizados correctamente',
      favorites: normalizeFavoriteIds(result.rows[0].favoritos)
    });
  } catch (error) {
    console.error('Error al actualizar favoritos:', error);
    return res.status(500).json({ error: 'Error al actualizar favoritos' });
  }
});

// ============================================
// PEDIDOS ESTANDAR (CLIENTE / PADRE / ADMIN)
// ============================================

app.post('/api/orders', authenticateToken, async (req, res) => {
  const { items } = req.body || {};

  if (req.user.role === 'child') {
    return res.status(403).json({ error: 'Los perfiles de menor deben usar el flujo de pedidos con aprobacion parental' });
  }

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'El carrito esta vacio' });
  }

  try {
    const validatedOrder = await validateOrderItems(items, { userId: req.user.id });

    if (supabase) {
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          user_id: req.user.id,
          status: 'paid',
          total: validatedOrder.total
        })
        .select()
        .single();

      if (orderError) throw orderError;

      const itemsToInsert = validatedOrder.items.map((item) => ({
        order_id: order.id,
        menu_item_id: item.product_id,
        quantity: item.quantity,
        price: item.price,
        notes: item.notes || null
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(itemsToInsert);

      if (itemsError) throw itemsError;

      return res.status(201).json({
        order_id: order.id,
        status: order.status,
        total: validatedOrder.total,
        message: 'Pedido confirmado correctamente'
      });
    }

    const orderResult = await pool.query(
      `INSERT INTO orders (user_id, status, total)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [req.user.id, 'paid', validatedOrder.total]
    );

    const order = orderResult.rows[0];

    for (const item of validatedOrder.items) {
      await pool.query(
        `INSERT INTO order_items (order_id, menu_item_id, quantity, price, notes)
         VALUES ($1, $2, $3, $4, $5)`,
        [order.id, item.product_id, item.quantity, item.price, item.notes || null]
      );
    }

    return res.status(201).json({
      order_id: order.id,
      status: order.status,
      total: validatedOrder.total,
      message: 'Pedido confirmado correctamente'
    });
  } catch (error) {
    console.error('Error al crear pedido estandar:', error);
    return res.status(error.statusCode || 500).json({ error: error.message || 'Error al crear el pedido' });
  }
});

// ============================================
// STRIPE CHECKOUT SESSION
// ============================================

app.post('/api/stripe/create-checkout-session', authenticateToken, async (req, res) => {
  try {
    const { items } = req.body || {};

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'El carrito está vacío' });
    }

    const validatedOrder = await validateOrderItems(items, { userId: req.user.id });

    const line_items = validatedOrder.items.map((item) => ({
      price_data: {
        currency: 'eur',
        product_data: {
          name: item.product_name
        },
        unit_amount: Math.round(Number(item.price) * 100)
      },
      quantity: item.quantity
    }));

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items,
      success_url: `${process.env.FRONTEND_URL}/pago-exitoso?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL}/carrito`,
      metadata: {
        user_id: String(req.user.id)
      }
    });

    return res.json({ url: session.url });
  } catch (error) {
    console.error('Error creando checkout session:', error);
    const detailedMessage = error?.raw?.message || error?.message || 'Error al iniciar el pago con Stripe';
    return res.status(error.statusCode || 500).json({
      error: process.env.NODE_ENV === 'production' ? 'Error al iniciar el pago con Stripe' : detailedMessage
    });
  }
});

app.get('/api/orders/my', authenticateToken, async (req, res) => {
  const { status } = req.query;
  const limit = parsePositiveInteger(req.query.limit, 50);
  const normalizedStatuses = buildOrderStatusAliases(status);

  if (req.user.role === 'child') {
    return res.status(403).json({ error: 'Los perfiles de menor deben consultar sus pedidos infantiles' });
  }

  try {
    if (supabase && isUuidLike(req.user.id)) {
      let query = supabase
        .from('pedidos')
        .select(`
          id,
          estado,
          fecha_creacion,
          id_perfil,
          id_pagador,
          lineas_pedido (
            id,
            id_producto_menu,
            nombre_producto,
            precio_compra,
            notas
          )
        `)
        .or(`id_perfil.eq.${req.user.id},id_pagador.eq.${req.user.id}`)
        .order('fecha_creacion', { ascending: false })
        .limit(limit);

      const { data, error } = await query;
      if (error) throw error;

      const orders = (data || [])
        .map((order) => {
          const items = Array.isArray(order.lineas_pedido)
            ? order.lineas_pedido.map((item) => {
                const price = Number.parseFloat(item.precio_compra ?? 0) || 0;
                return {
                  id: item.id,
                  product_id: item.id_producto_menu,
                  product_name: item.nombre_producto || 'Producto',
                  quantity: 1,
                  price,
                  subtotal: price,
                  notes: item.notas || ''
                };
              })
            : [];

          return normalizeHistoricOrderEntry({
            id: order.id,
            status: order.estado,
            created_at: order.fecha_creacion,
            items,
            items_count: items.length,
            total: items.reduce((sum, item) => sum + item.subtotal, 0)
          });
        })
        .filter((order) => !status || normalizedStatuses.includes(order.status));

      return res.json({ orders });
    }

    const pedidosTableExists = await pool.query(
      `SELECT EXISTS (
         SELECT 1
         FROM information_schema.tables
         WHERE table_schema = 'public' AND table_name = 'pedidos'
       ) AS exists`
    );

    if (pedidosTableExists.rows[0]?.exists) {
      const params = [String(req.user.id)];
      let paramIndex = 2;
      let query = `
        SELECT
          p.id,
          p.estado,
          p.fecha_creacion,
          COALESCE(SUM(COALESCE(lp.precio_compra, 0)), 0) AS total,
          COUNT(lp.id) AS items_count,
          COALESCE(
            json_agg(
              json_build_object(
                'id', lp.id,
                'product_id', lp.id_producto_menu,
                'product_name', lp.nombre_producto,
                'quantity', 1,
                'price', COALESCE(lp.precio_compra, 0),
                'subtotal', COALESCE(lp.precio_compra, 0),
                'notes', COALESCE(lp.notas, '')
              )
            ) FILTER (WHERE lp.id IS NOT NULL),
            '[]'::json
          ) AS items
        FROM pedidos p
        LEFT JOIN lineas_pedido lp ON lp.id_pedido = p.id
        WHERE (p.id_perfil::text = $1 OR p.id_pagador::text = $1)
      `;

      if (status) {
        query += ` AND LOWER(COALESCE(p.estado, '')) = ANY($${paramIndex})`;
        params.push(normalizedStatuses);
        paramIndex++;
      }

      query += `
        GROUP BY p.id, p.estado, p.fecha_creacion
        ORDER BY p.fecha_creacion DESC
        LIMIT $${paramIndex}
      `;
      params.push(limit);

      const result = await pool.query(query, params);
      return res.json({
        orders: (result.rows || []).map((row) => normalizeHistoricOrderEntry({
          id: row.id,
          status: row.estado,
          created_at: row.fecha_creacion,
          total: row.total,
          items_count: row.items_count,
          items: Array.isArray(row.items) ? row.items : []
        }))
      });
    }

    if (status) {
      const params = [req.user.id, status, limit];
      const query = 'SELECT * FROM orders WHERE user_id = $1 AND status = $2 ORDER BY created_at DESC LIMIT $3';
      const result = await pool.query(query, params);
      const ordersWithCounts = await Promise.all((result.rows || []).map(async (order) => {
        const itemsResult = await pool.query(
          'SELECT COUNT(*) AS count FROM order_items WHERE order_id = $1',
          [order.id]
        );

        return {
          ...order,
          items_count: Number.parseInt(itemsResult.rows[0]?.count, 10) || 0
        };
      }));

      return res.json({ orders: ordersWithCounts });
    }

    const result = await pool.query('SELECT * FROM orders WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2', [req.user.id, limit]);
    const ordersWithCounts = await Promise.all((result.rows || []).map(async (order) => {
      const itemsResult = await pool.query(
        'SELECT COUNT(*) AS count FROM order_items WHERE order_id = $1',
        [order.id]
      );

      return {
        ...order,
        items_count: Number.parseInt(itemsResult.rows[0]?.count, 10) || 0
      };
    }));

    return res.json({ orders: ordersWithCounts });
  } catch (error) {
    console.error('Error al listar pedidos estandar:', error);
    return res.status(500).json({ error: 'Error al obtener pedidos' });
  }
});

app.get('/api/orders/:id', authenticateToken, async (req, res) => {
  const orderId = String(req.params.id || '').trim();

  if (!orderId) {
    return res.status(400).json({ error: 'ID de pedido invalido' });
  }

  if (req.user.role === 'child') {
    return res.status(403).json({ error: 'Los perfiles de menor deben consultar sus pedidos infantiles' });
  }

  try {
    if (supabase && isUuidLike(req.user.id)) {
      let query = supabase
        .from('pedidos')
        .select(`
          id,
          estado,
          fecha_creacion,
          id_perfil,
          id_pagador,
          lineas_pedido (
            id,
            id_producto_menu,
            nombre_producto,
            precio_compra,
            notas
          )
        `)
        .eq('id', orderId);

      if (req.user.role !== 'admin') {
        query = query.or(`id_perfil.eq.${req.user.id},id_pagador.eq.${req.user.id}`);
      }

      const { data: order, error } = await query.single();
      if (error || !order) {
        return res.status(404).json({ error: 'Pedido no encontrado' });
      }

      const items = Array.isArray(order.lineas_pedido)
        ? order.lineas_pedido.map((item) => {
            const price = Number.parseFloat(item.precio_compra ?? 0) || 0;
            return {
              id: item.id,
              product_id: item.id_producto_menu,
              product_name: item.nombre_producto || 'Producto',
              quantity: 1,
              price,
              subtotal: price,
              notes: item.notas || ''
            };
          })
        : [];

      return res.json({
        order: normalizeHistoricOrderEntry({
          id: order.id,
          status: order.estado,
          created_at: order.fecha_creacion,
          items,
          items_count: items.length,
          total: items.reduce((sum, item) => sum + item.subtotal, 0)
        })
      });
    }

    const pedidosTableExists = await pool.query(
      `SELECT EXISTS (
         SELECT 1
         FROM information_schema.tables
         WHERE table_schema = 'public' AND table_name = 'pedidos'
       ) AS exists`
    );

    if (pedidosTableExists.rows[0]?.exists) {
      const params = [orderId];
      let query = `
        SELECT
          p.id,
          p.estado,
          p.fecha_creacion,
          COALESCE(SUM(COALESCE(lp.precio_compra, 0)), 0) AS total,
          COUNT(lp.id) AS items_count,
          COALESCE(
            json_agg(
              json_build_object(
                'id', lp.id,
                'product_id', lp.id_producto_menu,
                'product_name', lp.nombre_producto,
                'quantity', 1,
                'price', COALESCE(lp.precio_compra, 0),
                'subtotal', COALESCE(lp.precio_compra, 0),
                'notes', COALESCE(lp.notas, '')
              )
            ) FILTER (WHERE lp.id IS NOT NULL),
            '[]'::json
          ) AS items
        FROM pedidos p
        LEFT JOIN lineas_pedido lp ON lp.id_pedido = p.id
        WHERE p.id::text = $1
      `;

      if (req.user.role !== 'admin') {
        params.push(String(req.user.id));
        query += ` AND (p.id_perfil::text = $2 OR p.id_pagador::text = $2)`;
      }

      query += `
        GROUP BY p.id, p.estado, p.fecha_creacion
        LIMIT 1
      `;

      const orderResult = await pool.query(query, params);
      const order = orderResult.rows[0];

      if (!order) {
        return res.status(404).json({ error: 'Pedido no encontrado' });
      }

      return res.json({
        order: normalizeHistoricOrderEntry({
          id: order.id,
          status: order.estado,
          created_at: order.fecha_creacion,
          total: order.total,
          items_count: order.items_count,
          items: Array.isArray(order.items) ? order.items : []
        })
      });
    }

    const numericOrderId = Number.parseInt(orderId, 10);
    if (Number.isNaN(numericOrderId)) {
      return res.status(400).json({ error: 'ID de pedido invalido' });
    }

    const params = [numericOrderId];
    let query = 'SELECT * FROM orders WHERE id = $1';

    if (req.user.role !== 'admin') {
      params.push(req.user.id);
      query += ` AND user_id = $${params.length}`;
    }

    const orderResult = await pool.query(query, params);
    const order = orderResult.rows[0];

    if (!order) {
      return res.status(404).json({ error: 'Pedido no encontrado' });
    }

    const itemsResult = await pool.query(
      'SELECT * FROM order_items WHERE order_id = $1 ORDER BY id ASC',
      [order.id]
    );

    return res.json({
      order: {
        ...order,
        items: itemsResult.rows || []
      }
    });
  } catch (error) {
    console.error('Error al obtener detalle de pedido estandar:', error);
    return res.status(500).json({ error: 'Error al obtener detalle del pedido' });
  }
});

app.put('/api/auth/profile', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const alias = normalizeAlias(req.body?.alias);
    const specialCode = normalizeSpecialCode(req.body?.specialCode);

    if (!isValidAlias(alias)) {
      return res.status(400).json({ error: 'Alias inválido. Usa 3-30 caracteres: letras, números, _ . -' });
    }

    if (!isValidSpecialCode(specialCode)) {
      return res.status(400).json({ error: 'Código especial inválido. El único valor permitido es "ayuda".' });
    }

    let currentUser = null;
    let missingSpecialCodeColumn = false;

    if (supabase) {
      let { data, error } = await supabase
        .from('users')
        .select('id, is_adult, special_code')
        .eq('id', userId)
        .single();

      if (error && error.message?.toLowerCase().includes('special_code')) {
        missingSpecialCodeColumn = true;
        const fallbackResponse = await supabase
          .from('users')
          .select('id, is_adult')
          .eq('id', userId)
          .single();

        data = fallbackResponse.data;
        error = fallbackResponse.error;
      }

      if (error) {
        throw error;
      }

      currentUser = {
        ...data,
        special_code: missingSpecialCodeColumn ? null : data?.special_code
      };
    } else {
      const result = await pool.query(
        'SELECT id, is_adult, special_code FROM users WHERE id = $1 LIMIT 1',
        [userId]
      );

      currentUser = result.rows[0] || null;
    }

    if (!currentUser) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    if (!currentUser.is_adult && specialCode !== null) {
      return res.status(403).json({ error: 'El código especial solo está disponible para perfiles Adulto' });
    }

    const currentSpecialCode = normalizeSpecialCode(currentUser.special_code);
    const nextSpecialCode = currentUser.is_adult && specialCode === 'ayuda' && currentSpecialCode === 'ayuda'
      ? null
      : (currentUser.is_adult ? specialCode : null);

    let updatedUser = null;

    if (supabase) {
      if (missingSpecialCodeColumn && nextSpecialCode !== null) {
        return res.status(400).json({ error: 'Falta la columna special_code en Supabase. Ejecuta el script SQL actualizado.' });
      }

      const updatePayload = missingSpecialCodeColumn
        ? { alias }
        : { alias, special_code: nextSpecialCode };

      const selectFields = missingSpecialCodeColumn
        ? 'id, email, nombre, alias, role, is_adult, parent_token'
        : 'id, email, nombre, alias, role, is_adult, parent_token, special_code';

      const { data, error } = await supabase
        .from('users')
        .update(updatePayload)
        .eq('id', userId)
        .select(selectFields)
        .single();

      if (error) {
        if (error.message?.toLowerCase().includes('alias')) {
          return res.status(400).json({ error: 'Falta la columna alias en Supabase. Ejecuta el script SQL actualizado.' });
        }
        if (error.message?.toLowerCase().includes('special_code')) {
          return res.status(400).json({ error: 'Falta la columna special_code en Supabase. Ejecuta el script SQL actualizado.' });
        }
        throw error;
      }

      updatedUser = {
        ...data,
        special_code: missingSpecialCodeColumn ? null : data?.special_code
      };
    } else {
      const result = await pool.query(
        `UPDATE users
         SET alias = $1,
             special_code = $2
         WHERE id = $3
         RETURNING id, email, nombre, alias, role, is_adult, parent_token, special_code`,
        [alias, nextSpecialCode, userId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
      }

      updatedUser = result.rows[0];
    }

    return res.json({
      message: 'Perfil actualizado correctamente',
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        name: updatedUser.nombre || updatedUser.name,
        alias: updatedUser.alias || null,
        role: updatedUser.role,
        isAdult: updatedUser.is_adult,
        parentToken: updatedUser.parent_token,
        specialCode: normalizeSpecialCode(updatedUser.special_code)
      }
    });
  } catch (error) {
    console.error('Error al actualizar perfil:', error);
    return res.status(500).json({ error: 'Error al actualizar perfil' });
  }
});

// ============================================
// VINCULACIÓN PADRE-HIJO
// ============================================

// Obtener token de padre (solo para padres)
app.get('/api/parent/token', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    let user = null;
    if (supabase) {
      const { data, error } = await supabase
        .from('users')
        .select('id, parent_token, role, is_adult')
        .eq('id', userId)
        .single();

      if (error || !data) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
      }
      user = data;
    } else {
      const result = await pool.query(
        'SELECT id, parent_token, role, is_adult FROM users WHERE id = $1 LIMIT 1',
        [userId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
      }
      user = result.rows[0];
    }

    if (!isParentCapableUser(user)) {
      return res.status(403).json({ error: 'Solo los adultos pueden tener token de vinculación' });
    }

    if (!user.parent_token) {
      const newToken = generateParentToken();

      if (supabase) {
        const { error } = await supabase
          .from('users')
          .update({ parent_token: newToken })
          .eq('id', userId);

        if (error) throw error;
      } else {
        await pool.query(
          'UPDATE users SET parent_token = $1 WHERE id = $2',
          [newToken, userId]
        );
      }

      return res.json({ parentToken: newToken });
    }

    res.json({ parentToken: user.parent_token });
  } catch (error) {
    console.error('Error al obtener token:', error);
    res.status(500).json({ error: 'Error al obtener token' });
  }
});

// Solicitar vinculación con padre (desde hijo)
app.post('/api/child/link-parent', authenticateToken, linkingRateLimiter, async (req, res) => {
  try {
    const childId = req.user.id;
    const { parentToken } = req.body;
    const normalizedParentToken = String(parentToken || '').trim().toUpperCase();

    if (!normalizedParentToken) {
      return res.status(400).json({ error: 'Token de padre requerido' });
    }

    let child = null;
    let parent = null;

    if (supabase) {
      const { data: childData } = await supabase
        .from('users')
        .select('id, role, is_adult, email')
        .eq('id', childId)
        .single();

      child = childData;

      const { data: parentData } = await supabase
        .from('users')
        .select('id, nombre, email, role, is_adult')
        .eq('parent_token', normalizedParentToken)
        .single();

      parent = normalizeRelatedUser(parentData);
    } else {
      const childResult = await pool.query(
        'SELECT id, role, is_adult, email FROM users WHERE id = $1 AND active = true LIMIT 1',
        [childId]
      );
      child = childResult.rows[0] || null;

      const parentResult = await pool.query(
        'SELECT id, nombre AS name, email, role, is_adult FROM users WHERE parent_token = $1 AND active = true LIMIT 1',
        [normalizedParentToken]
      );
      parent = parentResult.rows[0] || null;
    }

    if (!child || child.role !== 'child' || child.is_adult) {
      return res.status(403).json({ error: 'Solo los hijos pueden vincular padres' });
    }

    if (!parent || !isParentCapableUser(parent)) {
      await logSecurityEvent(supabase, {
        userId: childId,
        actionType: 'link_invalid_token',
        severity: 'medium',
        details: { token: normalizedParentToken },
        req
      });
      return res.status(404).json({ error: 'Token de padre no válido' });
    }

    if (supabase) {
      const validation = await validateLinkingLimits(supabase, {
        childId,
        parentId: parent.id
      });

      if (!validation.valid) {
        await logSecurityEvent(supabase, {
          userId: childId,
          actionType: 'link_limit_exceeded',
          severity: validation.severity,
          details: { reason: validation.reason, parentId: parent.id },
          req
        });
        return res.status(400).json({ error: validation.reason });
      }
    } else {
      const childLinks = await pool.query(
        "SELECT COUNT(*)::int AS total FROM parent_child_links WHERE child_id = $1 AND status = 'active'",
        [childId]
      );
      if ((childLinks.rows[0]?.total || 0) >= 5) {
        return res.status(400).json({ error: 'Este hijo ya tiene el máximo de adultos permitidos (5)' });
      }

      const parentLinks = await pool.query(
        "SELECT COUNT(*)::int AS total FROM parent_child_links WHERE parent_id = $1 AND status = 'active'",
        [parent.id]
      );
      if ((parentLinks.rows[0]?.total || 0) >= 10) {
        return res.status(400).json({ error: 'Este padre ya tiene el máximo de hijos vinculados (10)' });
      }

      const pendingLinks = await pool.query(
        "SELECT id FROM parent_child_links WHERE child_id = $1 AND parent_id = $2 AND status = 'pending' LIMIT 1",
        [childId, parent.id]
      );
      if (pendingLinks.rows.length > 0) {
        return res.status(400).json({ error: 'Ya existe una solicitud de vinculación pendiente' });
      }
    }

    let link = null;
    if (supabase) {
      const { data, error } = await supabase
        .from('parent_child_links')
        .insert([{
          parent_id: parent.id,
          child_id: childId,
          status: 'pending'
        }])
        .select()
        .single();

      if (error) throw error;
      link = data;
    } else {
      try {
        const result = await pool.query(
          `INSERT INTO parent_child_links (parent_id, child_id, status)
           VALUES ($1, $2, 'pending')
           RETURNING *`,
          [parent.id, childId]
        );
        link = result.rows[0];
      } catch (error) {
        if (error.code === '23505') {
          return res.status(400).json({ error: 'Ya existe una relación o solicitud previa con este padre' });
        }
        throw error;
      }
    }

    await logSecurityEvent(supabase, {
      userId: childId,
      actionType: 'link_request_created',
      severity: 'low',
      details: { parentId: parent.id, linkId: link.id },
      req
    });

    res.status(201).json({
      message: 'Solicitud de vinculación enviada',
      link: {
        id: link.id,
        parentName: parent?.name || null,
        status: link.status
      }
    });
  } catch (error) {
    console.error('Error al solicitar vinculación:', error);
    res.status(500).json({ error: 'Error al crear solicitud' });
  }
});

// Obtener solicitudes de vinculación pendientes (padre)
app.get('/api/parent/link-requests', authenticateToken, async (req, res) => {
  try {
    const parentId = req.user.id;

    let parent = null;
    if (supabase) {
      const { data } = await supabase
        .from('users')
        .select('id, role, is_adult')
        .eq('id', parentId)
        .single();
      parent = data;
    } else {
      const parentResult = await pool.query(
        'SELECT id, role, is_adult FROM users WHERE id = $1 LIMIT 1',
        [parentId]
      );
      parent = parentResult.rows[0] || null;
    }

    if (!isParentCapableUser(parent)) {
      return res.status(403).json({ error: 'Solo los adultos pueden ver solicitudes familiares' });
    }

    if (supabase) {
      const { data: requests, error } = await supabase
        .from('parent_child_links')
        .select(`
          id,
          status,
          requested_at,
          child:child_id (
            id,
            nombre,
            email
          )
        `)
        .eq('parent_id', parentId)
        .eq('status', 'pending')
        .order('requested_at', { ascending: false });

      if (error) throw error;
      return res.json({
        requests: (requests || []).map((request) => ({
          ...request,
          child: normalizeRelatedUser(request.child)
        }))
      });
    }

    const result = await pool.query(
      `SELECT
        l.id,
        l.status,
        l.requested_at,
        json_build_object('id', c.id, 'name', c.nombre, 'email', c.email) AS child
      FROM parent_child_links l
      JOIN users c ON c.id = l.child_id
      WHERE l.parent_id = $1
        AND l.status = 'pending'
      ORDER BY l.requested_at DESC`,
      [parentId]
    );

    res.json({ requests: result.rows || [] });
  } catch (error) {
    console.error('Error al obtener solicitudes:', error);
    res.status(500).json({ error: 'Error al obtener solicitudes' });
  }
});

// Aprobar solicitud de vinculación
app.put('/api/parent/link-requests/:id/approve', authenticateToken, async (req, res) => {
  try {
    const parentId = req.user.id;
    const linkId = req.params.id;
    const { spendingLimit = 20.00 } = req.body;

    let link = null;
    let updated = null;

    if (supabase) {
      const { data: linkData, error: linkError } = await supabase
        .from('parent_child_links')
        .select('*, child:child_id(id, nombre, email)')
        .eq('id', linkId)
        .eq('parent_id', parentId)
        .eq('status', 'pending')
        .single();

      if (linkError) throw linkError;

      if (!linkData) {
        return res.status(404).json({ error: 'Solicitud no encontrada' });
      }
      link = linkData;

      const { data: updatedData, error } = await supabase
        .from('parent_child_links')
        .update({
          status: 'active',
          approved_at: new Date().toISOString(),
          spending_limit: spendingLimit
        })
        .eq('id', linkId)
        .select()
        .single();

      if (error) throw error;
      updated = updatedData;

      await supabase
        .from('users')
        .update({ role: 'parent' })
        .eq('id', parentId)
        .eq('is_adult', true)
        .eq('role', 'customer');
    } else {
      const linkResult = await pool.query(
        `SELECT l.*, c.nombre AS child_name, c.email AS child_email
         FROM parent_child_links l
         JOIN users c ON c.id = l.child_id
         WHERE l.id = $1 AND l.parent_id = $2 AND l.status = 'pending'
         LIMIT 1`,
        [linkId, parentId]
      );

      if (linkResult.rows.length === 0) {
        return res.status(404).json({ error: 'Solicitud no encontrada' });
      }
      link = linkResult.rows[0];

      const updatedResult = await pool.query(
        `UPDATE parent_child_links
         SET status = 'active', approved_at = NOW(), spending_limit = $1
         WHERE id = $2
         RETURNING *`,
        [spendingLimit, linkId]
      );
      updated = updatedResult.rows[0];

      await pool.query(
        `UPDATE users
         SET role = 'parent'
         WHERE id = $1
           AND is_adult = true
           AND role = 'customer'`,
        [parentId]
      );
    }

    await logSecurityEvent(supabase, {
      userId: parentId,
      actionType: 'link_approved',
      severity: 'low',
      details: { linkId, childId: link.child_id, spendingLimit },
      req
    });

    res.json({
      message: 'Vinculación aprobada',
      link: updated
    });
  } catch (error) {
    console.error('Error al aprobar vinculación:', error);
    res.status(500).json({ error: 'Error al aprobar vinculación' });
  }
});

// Rechazar solicitud de vinculación
app.put('/api/parent/link-requests/:id/reject', authenticateToken, async (req, res) => {
  try {
    const parentId = req.user.id;
    const linkId = req.params.id;
    const { reason } = req.body;

    let link = null;
    if (supabase) {
      const { data } = await supabase
        .from('parent_child_links')
        .select('*')
        .eq('id', linkId)
        .eq('parent_id', parentId)
        .eq('status', 'pending')
        .single();
      link = data;
    } else {
      const linkResult = await pool.query(
        `SELECT *
         FROM parent_child_links
         WHERE id = $1 AND parent_id = $2 AND status = 'pending'
         LIMIT 1`,
        [linkId, parentId]
      );
      link = linkResult.rows[0] || null;
    }

    if (!link) {
      return res.status(404).json({ error: 'Solicitud no encontrada' });
    }

    if (supabase) {
      const { error } = await supabase
        .from('parent_child_links')
        .update({
          status: 'rejected',
          notes: reason || 'Rechazado por el padre'
        })
        .eq('id', linkId);

      if (error) throw error;
    } else {
      await pool.query(
        `UPDATE parent_child_links
         SET status = 'rejected', notes = $1
         WHERE id = $2`,
        [reason || 'Rechazado por el padre', linkId]
      );
    }

    await logSecurityEvent(supabase, {
      userId: parentId,
      actionType: 'link_rejected',
      severity: 'low',
      details: { linkId, childId: link.child_id, reason },
      req
    });

    res.json({ message: 'Vinculación rechazada' });
  } catch (error) {
    console.error('Error al rechazar vinculación:', error);
    res.status(500).json({ error: 'Error al rechazar vinculación' });
  }
});

// Obtener mis padres (hijo)
app.get('/api/child/my-parents', authenticateToken, async (req, res) => {
  try {
    const childId = req.user.id;

    if (supabase) {
      const { data: links, error } = await supabase
        .from('parent_child_links')
        .select(`
          id,
          status,
          spending_limit,
          approved_at,
          parent:parent_id (
            id,
            nombre,
            email
          )
        `)
        .eq('child_id', childId)
        .in('status', ['active', 'pending']);

      if (error) throw error;
      return res.json({
        parents: (links || []).map((link) => ({
          ...link,
          parent: normalizeRelatedUser(link.parent)
        }))
      });
    }

    const result = await pool.query(
      `SELECT
        l.id,
        l.status,
        l.spending_limit,
        l.approved_at,
        json_build_object('id', p.id, 'name', p.nombre, 'email', p.email) AS parent
      FROM parent_child_links l
      JOIN users p ON p.id = l.parent_id
      WHERE l.child_id = $1
        AND l.status IN ('active', 'pending')`,
      [childId]
    );

    res.json({ parents: result.rows || [] });
  } catch (error) {
    console.error('Error al obtener padres:', error);
    res.status(500).json({ error: 'Error al obtener padres' });
  }
});

// Obtener mis hijos (padre)
app.get('/api/parent/my-children', authenticateToken, async (req, res) => {
  try {
    const parentId = req.user.id;

    let parent = null;
    if (supabase) {
      const { data } = await supabase
        .from('users')
        .select('id, role, is_adult')
        .eq('id', parentId)
        .single();
      parent = data;
    } else {
      const parentResult = await pool.query(
        'SELECT id, role, is_adult FROM users WHERE id = $1 LIMIT 1',
        [parentId]
      );
      parent = parentResult.rows[0] || null;
    }

    if (!isParentCapableUser(parent)) {
      return res.status(403).json({ error: 'Solo los adultos pueden ver sus hijos vinculados' });
    }

    if (supabase) {
      const { data: links, error } = await supabase
        .from('parent_child_links')
        .select(`
          id,
          status,
          spending_limit,
          approved_at,
          child:child_id (
            id,
            nombre,
            email
          )
        `)
        .eq('parent_id', parentId)
        .eq('status', 'active');

      if (error) throw error;
      return res.json({
        children: (links || []).map((link) => ({
          ...link,
          child: normalizeRelatedUser(link.child)
        }))
      });
    }

    const result = await pool.query(
      `SELECT
        l.id,
        l.status,
        l.spending_limit,
        l.approved_at,
        json_build_object('id', c.id, 'name', c.nombre, 'email', c.email) AS child
      FROM parent_child_links l
      JOIN users c ON c.id = l.child_id
      WHERE l.parent_id = $1
        AND l.status = 'active'`,
      [parentId]
    );

    res.json({ children: result.rows || [] });
  } catch (error) {
    console.error('Error al obtener hijos:', error);
    res.status(500).json({ error: 'Error al obtener hijos' });
  }
});

// ============================================
// PRODUCTOS
// ============================================

// Obtener todos los productos (incluyendo inactivos para el admin)
app.get('/api/products', authenticateToken, requireAdmin, async (req, res) => {
  try {
    // Primero, intentar desde PostgreSQL local
    try {
      const result = await pool.query('SELECT * FROM productos_menu ORDER BY category, nombre');
      const products = result.rows.map(normalizeProductFromPg);
      console.log(`📦 ${products.length} productos desde PostgreSQL local`);
      return res.json({ data: products });
    } catch (pgError) {
      console.log('ℹ️ PostgreSQL no disponible, intentando Supabase...');
    }

    // Si PostgreSQL falla, intentar Supabase
    if (!supabase) {
      return res.json({ data: products });
    }

    const { data, error } = await supabase
      .from('productos_menu')
      .select('*');

    if (error) throw error;

    // Transformar datos de Supabase al formato del frontend
    const transformedData = (data || []).map(transformProducto);
    res.json({ data: transformedData });
  } catch (error) {
    console.error('Error al obtener productos:', error);
    // Fallback a datos mock
    res.json({ data: products });
  }
});

// Obtener solo productos activos (para usuarios normales)
app.get('/api/menu', async (req, res) => {
  try {
    // Primero, intentar desde PostgreSQL local
    try {
      const result = await pool.query(
        'SELECT * FROM productos_menu WHERE activo = true AND sanitary_approved = true ORDER BY category, nombre'
      );
      const products = result.rows.map(normalizeProductFromPg);
      console.log(`📦 ${products.length} productos desde PostgreSQL local`);
      return res.json({ data: products });
    } catch (pgError) {
      console.log('ℹ️ PostgreSQL no disponible, intentando Supabase...');
    }

    // Si PostgreSQL falla, intentar Supabase
    if (!supabase) {
      const activeProducts = products.filter(p => p.active);
      return res.json({ data: activeProducts });
    }

    const { data, error } = await supabase
      .from('productos_menu')
      .select('*')
      .eq('activo', true);

    if (error) throw error;

    // Transformar datos de Supabase al formato del frontend
    const transformedData = (data || []).map(transformProducto);
    return res.json({ data: transformedData });
  } catch (error) {
    console.error('Error al obtener menú:', error);
    // Último fallback a datos mock
    const activeProducts = products.filter(p => p.active);
    res.json({ data: activeProducts });
  }
});

// Crear nuevo producto
app.post('/api/products', authenticateToken, requireAdmin, async (req, res) => {
  const product = normalizeIncomingProductPayload(req.body);

  if (!product.name || Number.isNaN(product.price) || !product.category) {
    return res.status(400).json({ error: 'Faltan campos requeridos: name, price, category' });
  }

  try {
    const localResult = await pool.query(
      `INSERT INTO productos_menu (
        nombre, description, precio, category, activo,
        image_url, badges, alergenos, options,
        ingredients, contains_info, conservation, shelf_life_hours,
        calories_kcal, nutrition_table, sanitary_approved, sanitary_notes, approved_at
      ) VALUES (
        $1, $2, $3, $4, $5,
        $6, $7::jsonb, $8::jsonb, $9::jsonb,
        $10::jsonb, $11, $12, $13,
        $14, $15::jsonb, $16, $17, $18
      ) RETURNING *`,
      [
        product.name,
        product.description,
        product.price,
        product.category,
        product.active,
        product.image_url,
        JSON.stringify(product.badges),
        JSON.stringify(product.allergens),
        JSON.stringify(product.options),
        JSON.stringify(product.ingredients),
        product.contains_info,
        product.conservation,
        product.shelf_life_hours,
        product.calories_kcal,
        JSON.stringify(product.nutrition_table),
        product.sanitary_approved,
        product.sanitary_notes,
        product.approved_at
      ]
    );

    return res.status(201).json({
      data: normalizeProductFromPg(localResult.rows[0]),
      message: 'Producto creado correctamente (PostgreSQL local)'
    });
  } catch (localError) {
    console.warn('⚠️ No se pudo guardar en PostgreSQL local:', localError?.message || String(localError));
  }

  try {
    if (supabase) {
      const supabaseProduct = {
        nombre: product.name,
        description: product.description,
        precio: product.price,
        category: product.category,
        activo: product.active,
        image_url: product.image_url,
        badges: product.badges,
        alergenos: product.allergens,
        options: product.options
      };

      const { data, error } = await supabase
        .from('productos_menu')
        .insert([supabaseProduct])
        .select();

      if (error) throw error;

      return res.status(201).json({
        data: transformProducto(data[0]),
        message: 'Producto creado correctamente (Supabase)'
      });
    }
  } catch (supabaseError) {
    console.warn('⚠️ No se pudo guardar en Supabase:', supabaseError?.message || String(supabaseError));
    if (supabase) {
      return res.status(503).json({
        error: 'No se pudo persistir el producto en almacenamiento permanente',
        details: supabaseError?.message || String(supabaseError)
      });
    }
  }

  const productMock = {
    id: nextProductId++,
    ...product
  };
  products.push(productMock);
  res.status(201).json({
    data: productMock,
    message: 'Producto creado correctamente (modo offline)'
  });
});

// Actualizar producto existente
app.put('/api/products/:id', authenticateToken, requireAdmin, async (req, res) => {
  const id = String(req.params.id || '').trim();
  const updates = normalizePartialIncomingProductPayload(req.body);

  if (!id) {
    return res.status(400).json({ error: 'ID de producto requerido' });
  }

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ error: 'No se enviaron campos para actualizar' });
  }

  try {
    const fieldMap = {
      name: 'nombre',
      description: 'description',
      price: 'precio',
      category: 'category',
      active: 'activo',
      image_url: 'image_url',
      badges: 'badges',
      allergens: 'alergenos',
      options: 'options',
      ingredients: 'ingredients',
      contains_info: 'contains_info',
      conservation: 'conservation',
      shelf_life_hours: 'shelf_life_hours',
      calories_kcal: 'calories_kcal',
      nutrition_table: 'nutrition_table',
      sanitary_approved: 'sanitary_approved',
      sanitary_notes: 'sanitary_notes',
      approved_at: 'approved_at'
    };

    const jsonColumns = new Set(['badges', 'allergens', 'options', 'ingredients', 'nutrition_table']);
    const setParts = [];
    const values = [];

    Object.entries(updates).forEach(([key, value]) => {
      if (!fieldMap[key]) return;
      const column = fieldMap[key];
      const isJson = jsonColumns.has(key);
      setParts.push(`${column} = $${values.length + 1}${isJson ? '::jsonb' : ''}`);
      values.push(isJson ? JSON.stringify(value) : value);
    });

    if (setParts.length > 0) {
      values.push(id);
      const localResult = await pool.query(
        `UPDATE productos_menu SET ${setParts.join(', ')} WHERE id = $${values.length} RETURNING *`,
        values
      );

      if (localResult.rows.length > 0) {
        return res.json({
          data: normalizeProductFromPg(localResult.rows[0]),
          message: 'Producto actualizado correctamente (PostgreSQL local)'
        });
      }
    }
  } catch (localError) {
    console.warn('⚠️ No se pudo actualizar en PostgreSQL local:', localError?.message || String(localError));
  }

  try {
    if (supabase) {
      const supabaseUpdateMap = {
        name: 'nombre',
        description: 'description',
        price: 'precio',
        category: 'category',
        active: 'activo',
        image_url: 'image_url',
        badges: 'badges',
        allergens: 'alergenos',
        options: 'options'
      };

      const supabaseUpdate = {};
      Object.entries(updates).forEach(([key, value]) => {
        const mappedKey = supabaseUpdateMap[key];
        if (!mappedKey) return;
        supabaseUpdate[mappedKey] = value;
      });

      const unsupportedKeys = Object.keys(updates).filter((key) => !Object.prototype.hasOwnProperty.call(supabaseUpdateMap, key));

      if (Object.keys(supabaseUpdate).length > 0) {
        const { data, error } = await supabase
          .from('productos_menu')
          .update(supabaseUpdate)
          .eq('id', id)
          .select();

        if (error) throw error;
        if (data && data.length > 0) {
          return res.json({
            data: transformProducto(data[0]),
            message: unsupportedKeys.length
              ? `Producto actualizado en Supabase. Campos no soportados ignorados: ${unsupportedKeys.join(', ')}`
              : 'Producto actualizado correctamente (Supabase)'
          });
        }
      }

      if (unsupportedKeys.length) {
        return res.status(400).json({
          error: `Los campos solicitados no existen en el esquema actual de Supabase: ${unsupportedKeys.join(', ')}`
        });
      }
    }
  } catch (supabaseError) {
    console.warn('⚠️ No se pudo actualizar en Supabase:', supabaseError?.message || String(supabaseError));
    if (supabase) {
      return res.status(503).json({
        error: 'No se pudo persistir la actualización en almacenamiento permanente',
        details: supabaseError?.message || String(supabaseError)
      });
    }
  }

  const productIndex = products.findIndex(p => String(p.id) === id);
  if (productIndex === -1) {
    return res.status(404).json({ error: 'Producto no encontrado' });
  }

  products[productIndex] = {
    ...products[productIndex],
    ...updates
  };

  res.json({
    data: products[productIndex],
    message: 'Producto actualizado correctamente (modo offline)'
  });
});

// Eliminar producto (borrado lógico: marcar como inactivo)
app.delete('/api/products/:id', authenticateToken, requireAdmin, async (req, res) => {
  const id = String(req.params.id || '').trim();
  const isPermanent = req.query.permanent === 'true';

  if (!id) {
    return res.status(400).json({ error: 'ID de producto requerido' });
  }

  try {
    if (isPermanent) {
      const localDelete = await pool.query('DELETE FROM productos_menu WHERE id = $1 RETURNING *', [id]);
      if (localDelete.rows.length > 0) {
        return res.json({
          data: normalizeProductFromPg(localDelete.rows[0]),
          message: 'Producto eliminado permanentemente (PostgreSQL local)'
        });
      }
    } else {
      const localDeactivate = await pool.query(
        'UPDATE productos_menu SET activo = false WHERE id = $1 RETURNING *',
        [id]
      );

      if (localDeactivate.rows.length > 0) {
        return res.json({
          data: normalizeProductFromPg(localDeactivate.rows[0]),
          message: 'Producto desactivado correctamente (PostgreSQL local)'
        });
      }
    }
  } catch (localError) {
    console.warn('⚠️ No se pudo eliminar/desactivar en PostgreSQL local:', localError?.message || String(localError));
  }

  try {
    if (supabase) {
      if (isPermanent) {
        const { data, error } = await supabase
          .from('productos_menu')
          .delete()
          .eq('id', id)
          .select();

        if (error) throw error;
        if (data && data.length > 0) {
          return res.json({
            data: transformProducto(data[0]),
            message: 'Producto eliminado permanentemente (Supabase)'
          });
        }
      } else {
        const { data, error } = await supabase
          .from('productos_menu')
          .update({ activo: false })
          .eq('id', id)
          .select();

        if (error) throw error;
        if (data && data.length > 0) {
          return res.json({
            data: transformProducto(data[0]),
            message: 'Producto desactivado correctamente (Supabase)'
          });
        }
      }
    }
  } catch (supabaseError) {
    console.warn('⚠️ No se pudo eliminar/desactivar en Supabase:', supabaseError?.message || String(supabaseError));
    if (supabase) {
      return res.status(503).json({
        error: 'No se pudo persistir la eliminación en almacenamiento permanente',
        details: supabaseError?.message || String(supabaseError)
      });
    }
  }

  const productIndex = products.findIndex(p => String(p.id) === id);
  if (productIndex === -1) {
    return res.status(404).json({ error: 'Producto no encontrado' });
  }

  if (isPermanent) {
    const [deletedProduct] = products.splice(productIndex, 1);
    return res.json({
      data: deletedProduct,
      message: 'Producto eliminado permanentemente (modo offline)'
    });
  }

  products[productIndex].active = false;
  return res.json({
    data: products[productIndex],
    message: 'Producto desactivado correctamente (modo offline)'
  });
});

// ============================================
// ADMIN ENDPOINTS - Usuarios
// ============================================

// GET /api/admin/statistics - Resumen operativo del sistema
app.get('/api/admin/statistics', authenticateToken, requireAdmin, async (req, res) => {
  try {
    if (supabase) {
      const [{ data: users, error: usersError }, { data: orders, error: ordersError }, { data: fraudLogs, error: fraudError }] = await Promise.all([
        supabase.from('users').select('role, is_adult, created_at'),
        supabase.from('pedidos').select('estado, fecha_creacion'),
        supabase.from('fraud_prevention_log').select('severity, created_at')
      ]);

      if (usersError) throw usersError;
      if (ordersError) throw ordersError;
      if (fraudError) throw fraudError;

      const todayDate = new Date().toISOString().slice(0, 10);
      const safeUsers = users || [];
      const safeOrders = orders || [];
      const safeFraudLogs = fraudLogs || [];
      return res.json({
        summary: {
          total_users: safeUsers.length,
          total_orders: safeOrders.length,
          total_revenue: 0,
          fraud_alerts: safeFraudLogs.length,
          average_order_value: 0
        },
        users: {
          adults: safeUsers.filter((user) => user.role !== 'child' || user.is_adult).length,
          children: safeUsers.filter((user) => user.role === 'child' || user.is_adult === false).length,
          admins: safeUsers.filter((user) => user.role === 'admin').length
        },
        orders: {
          completed: safeOrders.filter((order) => ['PAGADO', 'COMPLETADA', 'APROBADO'].includes(order.estado)).length,
          pending: safeOrders.filter((order) => ['PENDIENTE', 'PROCESANDO'].includes(order.estado)).length,
          rejected: safeOrders.filter((order) => ['RECHAZADO', 'CANCELADO'].includes(order.estado)).length
        },
        today: {
          new_orders: safeOrders.filter((order) => String(order.fecha_creacion || '').slice(0, 10) === todayDate).length,
          new_users: safeUsers.filter((user) => String(user.created_at || '').slice(0, 10) === todayDate).length,
          fraud_incidents: safeFraudLogs.filter((log) => String(log.created_at || '').slice(0, 10) === todayDate).length
        }
      });
    }

    const [usersResult, ordersResult] = await Promise.all([
      pool.query('SELECT role, is_adult, created_at FROM users'),
      pool.query('SELECT estado, fecha_creacion FROM pedidos')
    ]);

    let fraudRows = [];
    try {
      const fraudResult = await pool.query('SELECT severity, created_at FROM fraud_prevention_log');
      fraudRows = fraudResult.rows || [];
    } catch {
      fraudRows = [];
    }

    const users = usersResult.rows || [];
    const orders = ordersResult.rows || [];
    const todayDate = new Date().toISOString().slice(0, 10);
    return res.json({
      summary: {
        total_users: users.length,
        total_orders: orders.length,
        total_revenue: 0,
        fraud_alerts: fraudRows.length,
        average_order_value: 0
      },
      users: {
        adults: users.filter((user) => user.role !== 'child' || user.is_adult).length,
        children: users.filter((user) => user.role === 'child' || user.is_adult === false).length,
        admins: users.filter((user) => user.role === 'admin').length
      },
      orders: {
        completed: orders.filter((order) => ['PAGADO', 'COMPLETADA', 'APROBADO'].includes(order.estado)).length,
        pending: orders.filter((order) => ['PENDIENTE', 'PROCESANDO'].includes(order.estado)).length,
        rejected: orders.filter((order) => ['RECHAZADO', 'CANCELADO'].includes(order.estado)).length
      },
      today: {
        new_orders: orders.filter((order) => String(order.fecha_creacion || '').slice(0, 10) === todayDate).length,
        new_users: users.filter((user) => String(user.created_at || '').slice(0, 10) === todayDate).length,
        fraud_incidents: fraudRows.filter((log) => String(log.created_at || '').slice(0, 10) === todayDate).length
      }
    });
  } catch (error) {
    console.error('Error al obtener estadísticas admin:', error);
    return res.status(500).json({ error: 'Error al obtener estadísticas' });
  }
});

// GET /api/admin/fraud-log - Últimos eventos de seguridad
app.get('/api/admin/fraud-log', authenticateToken, requireAdmin, async (req, res) => {
  try {
    if (supabase) {
      const { data, error } = await supabase
        .from('fraud_prevention_log')
        .select('id, user_id, action_type, severity, details, ip_address, user_agent, created_at')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      return res.json({
        logs: (data || []).map((log) => ({
          ...log,
          user_name: log.user_id ? `Usuario #${log.user_id}` : 'Sistema'
        }))
      });
    }

    try {
      const result = await pool.query(
        `SELECT f.id, f.user_id, f.action_type, f.severity, f.details, f.ip_address, f.user_agent, f.created_at,
                COALESCE(u.nombre, 'Sistema') AS user_name
         FROM fraud_prevention_log f
         LEFT JOIN users u ON u.id = f.user_id
         ORDER BY f.created_at DESC
         LIMIT 100`
      );

      return res.json({ logs: result.rows || [] });
    } catch {
      return res.json({ logs: [] });
    }
  } catch (error) {
    console.error('Error al obtener fraude log:', error);
    return res.status(500).json({ error: 'Error al obtener fraude log' });
  }
});

// GET /api/admin/users - Obtener todos los usuarios
app.get('/api/admin/users', authenticateToken, requireAdmin, async (req, res) => {
  try {
    // PostgreSQL local (más confiable)
    const result = await pool.query(
      `SELECT 
        u.id, u.email, u.nombre AS name, u.role, u.is_adult, u.created_at,
        COALESCE(u.blocked, false) as blocked,
        COUNT(DISTINCT pcl.child_id) as children_count
      FROM users u
      LEFT JOIN parent_child_links pcl ON u.id = pcl.parent_id AND pcl.status = 'active'
      GROUP BY u.id, u.email, u.nombre, u.role, u.is_adult, u.created_at, u.blocked
      ORDER BY u.created_at DESC`
    );

    console.log('✅ Usuarios obtenidos:', result.rows.length);

    return res.json({
      users: result.rows.map(u => ({
        id: u.id,
        email: u.email,
        name: u.name || 'N/A',
        role: u.role,
        is_adult: u.is_adult,
        created_at: u.created_at,
        blocked: u.blocked || false,
        children_count: parseInt(u.children_count) || 0
      }))
    });
  } catch (err) {
    console.error('Error al obtener usuarios:', err);
    
    // Si falla por columna blocked no existe, intentar sin ella
    if (err.message.includes('blocked') || err.column === 'blocked') {
      try {
        const result = await pool.query(
          `SELECT 
            u.id, u.email, u.nombre AS name, u.role, u.is_adult, u.created_at,
            COUNT(DISTINCT pcl.child_id) as children_count
          FROM users u
          LEFT JOIN parent_child_links pcl ON u.id = pcl.parent_id AND pcl.status = 'active'
          GROUP BY u.id, u.email, u.nombre, u.role, u.is_adult, u.created_at
          ORDER BY u.created_at DESC`
        );

        return res.json({
          users: result.rows.map(u => ({
            id: u.id,
            email: u.email,
            name: u.name || 'N/A',
            role: u.role,
            is_adult: u.is_adult,
            created_at: u.created_at,
            blocked: false,
            children_count: parseInt(u.children_count) || 0
          }))
        });
      } catch (retryErr) {
        console.error('Retry también falló:', retryErr);
      }
    }
    
    return res.status(500).json({
      error: 'Error al obtener usuarios',
      details: err.message
    });
  }
});

// PUT /api/admin/users/:id/block - Bloquear/desbloquear usuario
app.put('/api/admin/users/:id/block', authenticateToken, requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { blocked } = req.body;

  try {
    // Intentar actualizar en Supabase
    if (supabase) {
      const { data, error } = await supabase
        .from('users')
        .update({ blocked: blocked || false })
        .eq('id', id)
        .select();

      if (!error && data && data.length > 0) {
        return res.json({
          message: `Usuario ${blocked ? 'bloqueado' : 'desbloqueado'} correctamente`,
          user: data[0]
        });
      }
    }
  } catch (supabaseError) {
    console.warn('⚠️ Error en Supabase, usando PostgreSQL local:', supabaseError?.message);
  }

  // Fallback: PostgreSQL local
  try {
    const result = await pool.query(
      'UPDATE users SET blocked = $1 WHERE id = $2 RETURNING *',
      [blocked || false, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    return res.json({
      message: `Usuario ${blocked ? 'bloqueado' : 'desbloqueado'} correctamente`,
      user: result.rows[0]
    });
  } catch (localError) {
    console.error('Error al bloquear usuario:', localError);
    return res.status(500).json({
      error: 'Error al bloquear usuario',
      details: localError.message
    });
  }
});

// PUT /api/admin/users/:id - Actualizar datos del usuario
app.put('/api/admin/users/:id', authenticateToken, requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { name, email, role } = req.body;

  try {
    if (supabase) {
      const updateData = {};
      if (name) updateData.nombre = name;
      if (email) updateData.email = email;
      if (role) updateData.role = role;

      const { data, error } = await supabase
        .from('users')
        .update(updateData)
        .eq('id', id)
        .select();

      if (!error && data && data.length > 0) {
        return res.json({
          message: 'Usuario actualizado correctamente',
          user: data[0]
        });
      }
    }
  } catch (supabaseError) {
    console.warn('⚠️ Error en Supabase, usando PostgreSQL local:', supabaseError?.message);
  }

  // Fallback: PostgreSQL local
  try {
    const updates = [];
    const values = [];
    let paramCount = 1;

    if (name) {
      updates.push(`nombre = $${paramCount}`);
      values.push(name);
      paramCount++;
    }
    if (email) {
      updates.push(`email = $${paramCount}`);
      values.push(email);
      paramCount++;
    }
    if (role) {
      updates.push(`role = $${paramCount}`);
      values.push(role);
      paramCount++;
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No hay campos para actualizar' });
    }

    values.push(id);
    const query = `UPDATE users SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`;

    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    return res.json({
      message: 'Usuario actualizado correctamente',
      user: result.rows[0]
    });
  } catch (localError) {
    console.error('Error al actualizar usuario:', localError);
    return res.status(500).json({
      error: 'Error al actualizar usuario',
      details: localError.message
    });
  }
});

// DELETE /api/admin/users/:id - Eliminar usuario
app.delete('/api/admin/users/:id', authenticateToken, requireAdmin, async (req, res) => {
  const { id } = req.params;

  try {
    if (supabase) {
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', id);

      if (!error) {
        return res.json({
          message: 'Usuario eliminado correctamente'
        });
      }
    }
  } catch (supabaseError) {
    console.warn('⚠️ Error en Supabase, usando PostgreSQL local:', supabaseError?.message);
  }

  // Fallback: PostgreSQL local
  try {
    const result = await pool.query(
      'DELETE FROM users WHERE id = $1 RETURNING id',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    return res.json({
      message: 'Usuario eliminado correctamente'
    });
  } catch (localError) {
    console.error('Error al eliminar usuario:', localError);
    return res.status(500).json({
      error: 'Error al eliminar usuario',
      details: localError.message
    });
  }
});

// GET /api/admin/orders/queue - Cola real para Kitchen Display
app.get('/api/admin/orders/queue', authenticateToken, requireAdmin, async (req, res) => {
  try {
    if (supabase) {
      const { data: orders, error } = await supabase
        .from('child_orders')
        .select('*, child:child_id(id, nombre, email)')
        .in('status', ['pending', 'approved'])
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      const queue = await Promise.all((orders || []).map(async (order) => {
        const { data: items, error: itemsError } = await supabase
          .from('child_order_items')
          .select('product_id, product_name, quantity, price, subtotal')
          .eq('order_id', order.id);

        if (itemsError) throw itemsError;

        return buildOrderQueueEntry({
          id: order.id,
          child_id: order.child_id,
          child_name: order.child?.name || 'Sin nombre',
          child_email: order.child?.email || null,
          status: order.status,
          notes: order.notes || '',
          created_at: order.created_at
        }, items || []);
      }));

      return res.json({ orders: queue });
    }

    const ordersResult = await pool.query(
      `SELECT co.id, co.child_id, co.status, co.notes, co.created_at,
              u.nombre AS child_name, u.email AS child_email
       FROM child_orders co
       LEFT JOIN users u ON u.id = co.child_id
       WHERE co.status IN ('pending', 'approved')
       ORDER BY co.created_at DESC
       LIMIT 100`
    );

    const queue = await Promise.all((ordersResult.rows || []).map(async (order) => {
      const itemsResult = await pool.query(
        `SELECT coi.product_id, coi.product_name, coi.quantity, coi.price, coi.subtotal, coi.notes, mi.alergenos AS allergens
         FROM child_order_items coi
         LEFT JOIN productos_menu mi ON mi.id = coi.product_id
         WHERE coi.order_id = $1
         ORDER BY coi.id ASC`,
        [order.id]
      );

      const enrichedItems = (itemsResult.rows || []).map((item) => ({
        ...item,
        allergens: parseJsonArray(item.allergens)
      }));

      return buildOrderQueueEntry(order, enrichedItems);
    }));

    return res.json({ orders: queue });
  } catch (error) {
    console.error('Error al obtener cola KDS:', error);
    return res.status(500).json({ error: 'Error al obtener la cola de cocina' });
  }
});

// ============================================
// FASE 3: CHILD ORDERS (Pedidos de Hijos)
// ============================================

// 1. POST /api/child/orders - Crear pedido como hijo
app.post('/api/child/orders', authenticateToken, async (req, res) => {
  const { items, notes, parent_id } = req.body;

  // Validar que sea un child
  if (req.user.role !== 'child') {
    return res.status(403).json({ error: 'Solo los hijos pueden crear pedidos' });
  }

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'El carrito está vacío' });
  }

  try {
    // 1. Buscar vínculo activo con padre
    let link;
    let selectedParentId = parent_id;

    if (supabase) {
      const { data: links, error } = await supabase
        .from('parent_child_links')
        .select('*, parent:parent_id(*)')
        .eq('child_id', req.user.id)
        .eq('status', 'active');

      if (error || !links || links.length === 0) {
        return res.status(400).json({ error: 'No tienes padres vinculados activos' });
      }

      // Si no especifica padre, toma el primero
      link = parent_id ? links.find(l => l.parent_id === parent_id) : links[0];
      if (!link) {
        return res.status(400).json({ error: 'Padre especificado no encontrado' });
      }
      selectedParentId = link.parent_id;
    } else {
      const links = await new Promise((resolve, reject) => {
        pool.query(
          'SELECT * FROM parent_child_links WHERE child_id = $1 AND status = $2',
          [req.user.id, 'active'],
          (err, result) => {
            if (err) return reject(err);
            resolve(result.rows);
          }
        );
      });

      if (!links || links.length === 0) {
        return res.status(400).json({ error: 'No tienes padres vinculados activos' });
      }

      link = parent_id ? links.find(l => l.parent_id === parent_id) : links[0];
      if (!link) {
        return res.status(400).json({ error: 'Padre especificado no encontrado' });
      }
      selectedParentId = link.parent_id;
    }

    // 2. Calcular total y validar productos contra catalogo real
    const validatedOrder = await validateOrderItems(items);
    const validatedItems = validatedOrder.items.map((item) => ({
      product_id: item.product_id,
      product_name: item.product_name,
      quantity: item.quantity,
      price: item.price,
      subtotal: item.subtotal
    }));
    const { subtotal, tax, total } = validatedOrder;

    // 3. Validar spending limit
    if (total > link.spending_limit) {
      return res.status(403).json({
        error: `El total (${total.toFixed(2)} EUR) excede el limite de gasto (${Number(link.spending_limit).toFixed(2)} EUR)`
      });
    }

    // 4. Validar mínimo de pedido
    if (total < 5.00) {
      return res.status(400).json({ error: 'El monto minimo del pedido es 5.00 EUR' });
    }

    // 5. Crear pedido
    if (supabase) {
      const { data: order, error: orderError } = await supabase
        .from('child_orders')
        .insert({
          child_id: req.user.id,
          parent_id: selectedParentId,
          link_id: link.id,
          status: 'pending',
          subtotal,
          tax,
          total,
          notes: notes || null
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // 6. Insertar items
      const itemsToInsert = validatedItems.map(item => ({
        order_id: order.id,
        ...item
      }));

      const { error: itemsError } = await supabase
        .from('child_order_items')
        .insert(itemsToInsert);

      if (itemsError) throw itemsError;

      return res.status(201).json({
        order: {
          id: order.id,
          status: order.status,
          total: order.total,
          items: validatedItems,
          created_at: order.created_at
        }
      });
    } else {
      // PostgreSQL fallback
      const orderResult = await new Promise((resolve, reject) => {
        pool.query(
          `INSERT INTO child_orders (child_id, parent_id, link_id, status, subtotal, tax, total, notes)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
          [req.user.id, selectedParentId, link.id, 'pending', subtotal, tax, total, notes || null],
          (err, result) => {
            if (err) return reject(err);
            resolve(result.rows[0]);
          }
        );
      });

      // Insertar items
      for (const item of validatedItems) {
        await new Promise((resolve, reject) => {
          pool.query(
            `INSERT INTO child_order_items (order_id, product_id, product_name, quantity, price, subtotal)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [orderResult.id, item.product_id, item.product_name, item.quantity, item.price, item.subtotal],
            (err) => {
              if (err) return reject(err);
              resolve();
            }
          );
        });
      }

      return res.status(201).json({
        order: {
          id: orderResult.id,
          status: orderResult.status,
          total: orderResult.total,
          items: validatedItems,
          created_at: orderResult.created_at
        }
      });
    }
  } catch (error) {
    console.error('Error creating child order:', error);
    return res.status(error.statusCode || 500).json({ error: error.message || 'Error al crear el pedido' });
  }
});

// 2. GET /api/child/orders - Ver mis pedidos (como hijo)
app.get('/api/child/orders', authenticateToken, async (req, res) => {
  if (req.user.role !== 'child') {
    return res.status(403).json({ error: 'Solo los hijos pueden ver sus pedidos' });
  }

  const { status } = req.query;
  const normalizedStatuses = buildOrderStatusAliases(status);

  try {
    if (supabase && isUuidLike(req.user.id)) {
      const { data, error } = await supabase
        .from('pedidos')
        .select(`
          id,
          estado,
          fecha_creacion,
          id_perfil,
          lineas_pedido (
            id,
            id_producto_menu,
            nombre_producto,
            precio_compra,
            notas
          )
        `)
        .eq('id_perfil', req.user.id)
        .order('fecha_creacion', { ascending: false });

      if (error) throw error;

      const orders = (data || [])
        .map((order) => {
          const items = Array.isArray(order.lineas_pedido)
            ? order.lineas_pedido.map((item) => {
                const price = Number.parseFloat(item.precio_compra ?? 0) || 0;
                return {
                  id: item.id,
                  product_id: item.id_producto_menu,
                  product_name: item.nombre_producto || 'Producto',
                  quantity: 1,
                  price,
                  subtotal: price,
                  notes: item.notas || ''
                };
              })
            : [];

          return normalizeHistoricOrderEntry({
            id: order.id,
            status: order.estado,
            created_at: order.fecha_creacion,
            items,
            items_count: items.length,
            total: items.reduce((sum, item) => sum + item.subtotal, 0)
          });
        })
        .filter((order) => !status || normalizedStatuses.includes(order.status));

      return res.json({ orders });
    }

    const pedidosTableExists = await pool.query(
      `SELECT EXISTS (
         SELECT 1
         FROM information_schema.tables
         WHERE table_schema = 'public' AND table_name = 'pedidos'
       ) AS exists`
    );

    if (pedidosTableExists.rows[0]?.exists) {
      const params = [String(req.user.id)];
      let paramIndex = 2;
      let query = `
        SELECT
          p.id,
          p.estado,
          p.fecha_creacion,
          COALESCE(SUM(COALESCE(lp.precio_compra, 0)), 0) AS total,
          COUNT(lp.id) AS items_count,
          COALESCE(
            json_agg(
              json_build_object(
                'id', lp.id,
                'product_id', lp.id_producto_menu,
                'product_name', lp.nombre_producto,
                'quantity', 1,
                'price', COALESCE(lp.precio_compra, 0),
                'subtotal', COALESCE(lp.precio_compra, 0),
                'notes', COALESCE(lp.notas, '')
              )
            ) FILTER (WHERE lp.id IS NOT NULL),
            '[]'::json
          ) AS items
        FROM pedidos p
        LEFT JOIN lineas_pedido lp ON lp.id_pedido = p.id
        WHERE p.id_perfil::text = $1
      `;

      if (status) {
        query += ` AND LOWER(COALESCE(p.estado, '')) = ANY($${paramIndex})`;
        params.push(normalizedStatuses);
        paramIndex++;
      }

      query += `
        GROUP BY p.id, p.estado, p.fecha_creacion
        ORDER BY p.fecha_creacion DESC
      `;

      const result = await pool.query(query, params);
      return res.json({
        orders: (result.rows || []).map((row) => normalizeHistoricOrderEntry({
          id: row.id,
          status: row.estado,
          created_at: row.fecha_creacion,
          total: row.total,
          items_count: row.items_count,
          items: Array.isArray(row.items) ? row.items : []
        }))
      });
    }

    const orders = await new Promise((resolve, reject) => {
      let query = 'SELECT co.*, u.nombre as parent_name, u.email as parent_email FROM child_orders co LEFT JOIN users u ON co.parent_id = u.id WHERE co.child_id = $1';
      const params = [req.user.id];

      if (status) {
        query += ' AND co.status = $2';
        params.push(status);
      }

      query += ' ORDER BY co.created_at DESC';

      pool.query(query, params, (err, result) => {
        if (err) return reject(err);
        resolve(result.rows);
      });
    });

    const ordersWithItems = await Promise.all(orders.map(async (order) => {
      const items = await new Promise((resolve, reject) => {
        pool.query(
          'SELECT COUNT(*) as count FROM child_order_items WHERE order_id = $1',
          [order.id],
          (err, result) => {
            if (err) return reject(err);
            resolve(result.rows[0]);
          }
        );
      });

      return normalizeHistoricOrderEntry({
        ...order,
        parent: { name: order.parent_name, email: order.parent_email },
        items_count: parseInt(items.count, 10)
      });
    }));

    return res.json({ orders: ordersWithItems });
  } catch (error) {
    console.error('Error fetching child orders:', error);
    return res.status(500).json({ error: 'Error al obtener pedidos' });
  }
});

// 3. GET /api/child/orders/:id - Detalle de mi pedido
app.get('/api/child/orders/:id', authenticateToken, async (req, res) => {
  if (req.user.role !== 'child') {
    return res.status(403).json({ error: 'Solo los hijos pueden ver detalles de pedidos' });
  }

  const id = String(req.params.id || '').trim();

  try {
    if (supabase && isUuidLike(req.user.id)) {
      const { data: order, error } = await supabase
        .from('pedidos')
        .select(`
          id,
          estado,
          fecha_creacion,
          id_perfil,
          lineas_pedido (
            id,
            id_producto_menu,
            nombre_producto,
            precio_compra,
            notas
          )
        `)
        .eq('id', id)
        .eq('id_perfil', req.user.id)
        .single();

      if (error || !order) {
        return res.status(404).json({ error: 'Pedido no encontrado' });
      }

      const items = Array.isArray(order.lineas_pedido)
        ? order.lineas_pedido.map((item) => {
            const price = Number.parseFloat(item.precio_compra ?? 0) || 0;
            return {
              id: item.id,
              product_id: item.id_producto_menu,
              product_name: item.nombre_producto || 'Producto',
              quantity: 1,
              price,
              subtotal: price,
              notes: item.notas || ''
            };
          })
        : [];

      return res.json({
        order: normalizeHistoricOrderEntry({
          id: order.id,
          status: order.estado,
          created_at: order.fecha_creacion,
          items,
          items_count: items.length,
          total: items.reduce((sum, item) => sum + item.subtotal, 0)
        })
      });
    }

    const pedidosTableExists = await pool.query(
      `SELECT EXISTS (
         SELECT 1
         FROM information_schema.tables
         WHERE table_schema = 'public' AND table_name = 'pedidos'
       ) AS exists`
    );

    if (pedidosTableExists.rows[0]?.exists) {
      const result = await pool.query(
        `
          SELECT
            p.id,
            p.estado,
            p.fecha_creacion,
            COALESCE(SUM(COALESCE(lp.precio_compra, 0)), 0) AS total,
            COUNT(lp.id) AS items_count,
            COALESCE(
              json_agg(
                json_build_object(
                  'id', lp.id,
                  'product_id', lp.id_producto_menu,
                  'product_name', lp.nombre_producto,
                  'quantity', 1,
                  'price', COALESCE(lp.precio_compra, 0),
                  'subtotal', COALESCE(lp.precio_compra, 0),
                  'notes', COALESCE(lp.notas, '')
                )
              ) FILTER (WHERE lp.id IS NOT NULL),
              '[]'::json
            ) AS items
          FROM pedidos p
          LEFT JOIN lineas_pedido lp ON lp.id_pedido = p.id
          WHERE p.id::text = $1
            AND p.id_perfil::text = $2
          GROUP BY p.id, p.estado, p.fecha_creacion
          LIMIT 1
        `,
        [id, String(req.user.id)]
      );

      const order = result.rows[0];
      if (!order) {
        return res.status(404).json({ error: 'Pedido no encontrado' });
      }

      return res.json({
        order: normalizeHistoricOrderEntry({
          id: order.id,
          status: order.estado,
          created_at: order.fecha_creacion,
          total: order.total,
          items_count: order.items_count,
          items: Array.isArray(order.items) ? order.items : []
        })
      });
    }

    const order = await new Promise((resolve, reject) => {
      pool.query(
        `SELECT co.*, u.id as parent_id, u.nombre as parent_name, u.email as parent_email 
         FROM child_orders co 
         LEFT JOIN users u ON co.parent_id = u.id 
         WHERE co.id = $1 AND co.child_id = $2`,
        [id, req.user.id],
        (err, result) => {
          if (err) return reject(err);
          resolve(result.rows[0]);
        }
      );
    });

    if (!order) {
      return res.status(404).json({ error: 'Pedido no encontrado' });
    }

    const items = await new Promise((resolve, reject) => {
      pool.query(
        'SELECT * FROM child_order_items WHERE order_id = $1',
        [order.id],
        (err, result) => {
          if (err) return reject(err);
          resolve(result.rows);
        }
      );
    });

    return res.json({
      order: normalizeHistoricOrderEntry({
        ...order,
        parent: { id: order.parent_id, name: order.parent_name, email: order.parent_email },
        items: items || []
      })
    });
  } catch (error) {
    console.error('Error fetching order detail:', error);
    return res.status(500).json({ error: 'Error al obtener detalle del pedido' });
  }
});

// 4. GET /api/parent/child-orders - Listar pedidos de hijos (como padre)
app.get('/api/parent/child-orders', authenticateToken, async (req, res) => {
  if (!isParentCapableUser(req.user)) {
    return res.status(403).json({ error: 'Solo los padres pueden ver pedidos de hijos' });
  }

  const { status, child_id } = req.query;
  const limit = parsePositiveInteger(req.query.limit, 20);
  const offset = parsePositiveInteger(req.query.offset, 0);

  try {
    if (supabase) {
      let query = supabase
        .from('child_orders')
        .select('*, child:child_id(id, nombre, email)')
        .eq('parent_id', req.user.id)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (status) {
        query = query.eq('status', status);
      }
      if (child_id) {
        query = query.eq('child_id', child_id);
      }

      const { data: orders, error } = await query;
      if (error) throw error;

      // Obtener items count
      const ordersWithCount = await Promise.all(orders.map(async (order) => {
        const { count } = await supabase
          .from('child_order_items')
          .select('*', { count: 'exact', head: true })
          .eq('order_id', order.id);

        return {
          ...order,
          child: normalizeRelatedUser(order.child),
          items_count: count || 0
        };
      }));

      return res.json({ orders: ordersWithCount });
    } else {
      // PostgreSQL fallback
      let query = `SELECT co.*, u.id as child_id, u.nombre as child_name, u.email as child_email 
                   FROM child_orders co 
                   LEFT JOIN users u ON co.child_id = u.id 
                   WHERE co.parent_id = $1`;
      const params = [req.user.id];
      let paramIndex = 2;

      if (status) {
        query += ` AND co.status = $${paramIndex}`;
        params.push(status);
        paramIndex++;
      }
      if (child_id) {
        query += ` AND co.child_id = $${paramIndex}`;
        params.push(child_id);
        paramIndex++;
      }

      query += ` ORDER BY co.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      params.push(limit, offset);

      const orders = await new Promise((resolve, reject) => {
        pool.query(query, params, (err, result) => {
          if (err) return reject(err);
          resolve(result.rows);
        });
      });

      const ordersWithCount = await Promise.all(orders.map(async (order) => {
        const count = await new Promise((resolve, reject) => {
          pool.query(
            'SELECT COUNT(*) as count FROM child_order_items WHERE order_id = $1',
            [order.id],
            (err, result) => {
              if (err) return reject(err);
              resolve(result.rows[0]);
            }
          );
        });

        return {
          ...order,
          child: { id: order.child_id, name: order.child_name, email: order.child_email },
          items_count: parseInt(count.count)
        };
      }));

      return res.json({ orders: ordersWithCount });
    }
  } catch (error) {
    console.error('Error fetching parent child-orders:', error);
    return res.status(500).json({ error: 'Error al obtener pedidos' });
  }
});

// 5. GET /api/parent/orders/:id - Detalle de pedido (como padre)
app.get('/api/parent/orders/:id', authenticateToken, async (req, res) => {
  if (!isParentCapableUser(req.user)) {
    return res.status(403).json({ error: 'Solo los padres pueden ver detalles de pedidos' });
  }

  const { id } = req.params;

  try {
    if (supabase) {
      const { data: order, error } = await supabase
        .from('child_orders')
        .select('*, child:child_id(id, nombre, email), link:link_id(spending_limit)')
        .eq('id', id)
        .eq('parent_id', req.user.id)
        .single();

      if (error || !order) {
        return res.status(404).json({ error: 'Pedido no encontrado' });
      }

      const { data: items } = await supabase
        .from('child_order_items')
        .select('*')
        .eq('order_id', order.id);

      return res.json({
        order: {
          ...order,
          child: normalizeRelatedUser(order.child),
          items: items || [],
          spending_limit: order.link?.spending_limit || 0
        }
      });
    } else {
      // PostgreSQL fallback
      const order = await new Promise((resolve, reject) => {
        pool.query(
          `SELECT co.*, u.id as child_id, u.nombre as child_name, u.email as child_email,
                  pcl.spending_limit
           FROM child_orders co 
           LEFT JOIN users u ON co.child_id = u.id 
           LEFT JOIN parent_child_links pcl ON co.link_id = pcl.id
           WHERE co.id = $1 AND co.parent_id = $2`,
          [id, req.user.id],
          (err, result) => {
            if (err) return reject(err);
            resolve(result.rows[0]);
          }
        );
      });

      if (!order) {
        return res.status(404).json({ error: 'Pedido no encontrado' });
      }

      const items = await new Promise((resolve, reject) => {
        pool.query(
          'SELECT * FROM child_order_items WHERE order_id = $1',
          [order.id],
          (err, result) => {
            if (err) return reject(err);
            resolve(result.rows);
          }
        );
      });

      return res.json({
        order: {
          ...order,
          child: { id: order.child_id, name: order.child_name, email: order.child_email },
          items: items || []
        }
      });
    }
  } catch (error) {
    console.error('Error fetching order detail:', error);
    return res.status(500).json({ error: 'Error al obtener detalle del pedido' });
  }
});

// 6. PUT /api/parent/orders/:id/approve - Aprobar pedido
app.put('/api/parent/orders/:id/approve', authenticateToken, async (req, res) => {
  if (!isParentCapableUser(req.user)) {
    return res.status(403).json({ error: 'Solo los padres pueden aprobar pedidos' });
  }

  const { id } = req.params;
  const { approved_amount } = req.body;

  try {
    if (supabase) {
      const { data: order, error: fetchError } = await supabase
        .from('child_orders')
        .select('*')
        .eq('id', id)
        .eq('parent_id', req.user.id)
        .eq('status', 'pending')
        .single();

      if (fetchError || !order) {
        return res.status(404).json({ error: 'Pedido no encontrado o ya procesado' });
      }

      const finalAmount = approved_amount || order.total;

      const { data: updated, error: updateError } = await supabase
        .from('child_orders')
        .update({
          status: 'approved',
          approved_amount: finalAmount,
          approved_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (updateError) throw updateError;

      return res.json({
        order: updated,
        message: 'Pedido aprobado exitosamente'
      });
    } else {
      // PostgreSQL fallback
      const order = await new Promise((resolve, reject) => {
        pool.query(
          'SELECT * FROM child_orders WHERE id = $1 AND parent_id = $2 AND status = $3',
          [id, req.user.id, 'pending'],
          (err, result) => {
            if (err) return reject(err);
            resolve(result.rows[0]);
          }
        );
      });

      if (!order) {
        return res.status(404).json({ error: 'Pedido no encontrado o ya procesado' });
      }

      const finalAmount = approved_amount || order.total;

      const updated = await new Promise((resolve, reject) => {
        pool.query(
          `UPDATE child_orders 
           SET status = $1, approved_amount = $2, approved_at = NOW(), updated_at = NOW()
           WHERE id = $3 
           RETURNING *`,
          ['approved', finalAmount, id],
          (err, result) => {
            if (err) return reject(err);
            resolve(result.rows[0]);
          }
        );
      });

      return res.json({
        order: updated,
        message: 'Pedido aprobado exitosamente'
      });
    }
  } catch (error) {
    console.error('Error approving order:', error);
    return res.status(500).json({ error: 'Error al aprobar pedido' });
  }
});

// 7. PUT /api/parent/orders/:id/reject - Rechazar pedido
app.put('/api/parent/orders/:id/reject', authenticateToken, async (req, res) => {
  if (!isParentCapableUser(req.user)) {
    return res.status(403).json({ error: 'Solo los padres pueden rechazar pedidos' });
  }

  const { id } = req.params;
  const { reason } = req.body;

  if (!reason || reason.length < 3) {
    return res.status(400).json({ error: 'Debe proporcionar una razón para el rechazo' });
  }

  try {
    if (supabase) {
      const { data: order, error: fetchError } = await supabase
        .from('child_orders')
        .select('*')
        .eq('id', id)
        .eq('parent_id', req.user.id)
        .eq('status', 'pending')
        .single();

      if (fetchError || !order) {
        return res.status(404).json({ error: 'Pedido no encontrado o ya procesado' });
      }

      const { data: updated, error: updateError } = await supabase
        .from('child_orders')
        .update({
          status: 'rejected',
          rejection_reason: reason,
          rejected_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (updateError) throw updateError;

      return res.json({
        order: updated,
        message: 'Pedido rechazado'
      });
    } else {
      // PostgreSQL fallback
      const order = await new Promise((resolve, reject) => {
        pool.query(
          'SELECT * FROM child_orders WHERE id = $1 AND parent_id = $2 AND status = $3',
          [id, req.user.id, 'pending'],
          (err, result) => {
            if (err) return reject(err);
            resolve(result.rows[0]);
          }
        );
      });

      if (!order) {
        return res.status(404).json({ error: 'Pedido no encontrado o ya procesado' });
      }

      const updated = await new Promise((resolve, reject) => {
        pool.query(
          `UPDATE child_orders 
           SET status = $1, rejection_reason = $2, rejected_at = NOW(), updated_at = NOW()
           WHERE id = $3 
           RETURNING *`,
          ['rejected', reason, id],
          (err, result) => {
            if (err) return reject(err);
            resolve(result.rows[0]);
          }
        );
      });

      return res.json({
        order: updated,
        message: 'Pedido rechazado'
      });
    }
  } catch (error) {
    console.error('Error rejecting order:', error);
    return res.status(500).json({ error: 'Error al rechazar pedido' });
  }
});

// 8. PUT /api/parent/orders/:id/pay - Marcar como pagado
app.put('/api/parent/orders/:id/pay', authenticateToken, async (req, res) => {
  if (!isParentCapableUser(req.user)) {
    return res.status(403).json({ error: 'Solo los padres pueden marcar pedidos como pagados' });
  }

  const { id } = req.params;
  const { payment_method = 'cash', amount_paid } = req.body;

  try {
    if (supabase) {
      const { data: order, error: fetchError } = await supabase
        .from('child_orders')
        .select('*')
        .eq('id', id)
        .eq('parent_id', req.user.id)
        .eq('status', 'approved')
        .single();

      if (fetchError || !order) {
        return res.status(404).json({ error: 'Pedido no encontrado o no está aprobado' });
      }

      const finalAmount = amount_paid || order.approved_amount || order.total;

      const { data: updated, error: updateError } = await supabase
        .from('child_orders')
        .update({
          status: 'paid',
          payment_method,
          amount_paid: finalAmount,
          paid_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (updateError) throw updateError;

      return res.json({
        order: updated,
        message: 'Pedido marcado como pagado'
      });
    } else {
      // PostgreSQL fallback
      const order = await new Promise((resolve, reject) => {
        pool.query(
          'SELECT * FROM child_orders WHERE id = $1 AND parent_id = $2 AND status = $3',
          [id, req.user.id, 'approved'],
          (err, result) => {
            if (err) return reject(err);
            resolve(result.rows[0]);
          }
        );
      });

      if (!order) {
        return res.status(404).json({ error: 'Pedido no encontrado o no está aprobado' });
      }

      const finalAmount = amount_paid || order.approved_amount || order.total;

      const updated = await new Promise((resolve, reject) => {
        pool.query(
          `UPDATE child_orders 
           SET status = $1, payment_method = $2, amount_paid = $3, paid_at = NOW(), updated_at = NOW()
           WHERE id = $4 
           RETURNING *`,
          ['paid', payment_method, finalAmount, id],
          (err, result) => {
            if (err) return reject(err);
            resolve(result.rows[0]);
          }
        );
      });

      return res.json({
        order: updated,
        message: 'Pedido marcado como pagado'
      });
    }
  } catch (error) {
    console.error('Error marking order as paid:', error);
    return res.status(500).json({ error: 'Error al marcar como pagado' });
  }
});

// 9. PUT /api/parent/orders/:id/modify - Modificar pedido (antes de pagar)
app.put('/api/parent/orders/:id/modify', authenticateToken, async (req, res) => {
  if (!isParentCapableUser(req.user)) {
    return res.status(403).json({ error: 'Solo los padres pueden modificar pedidos' });
  }

  const { id } = req.params;
  const { items } = req.body;

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Debe proporcionar items para modificar' });
  }

  try {
    // Verificar que el pedido existe y está en estado apropiado
    let order;
    if (supabase) {
      const { data, error } = await supabase
        .from('child_orders')
        .select('*')
        .eq('id', id)
        .eq('parent_id', req.user.id)
        .in('status', ['pending', 'approved'])
        .single();

      if (error || !data) {
        return res.status(404).json({ error: 'Pedido no encontrado o ya procesado' });
      }
      order = data;
    } else {
      order = await new Promise((resolve, reject) => {
        pool.query(
          `SELECT * FROM child_orders 
           WHERE id = $1 AND parent_id = $2 AND status IN ('pending', 'approved')`,
          [id, req.user.id],
          (err, result) => {
            if (err) return reject(err);
            resolve(result.rows[0]);
          }
        );
      });

      if (!order) {
        return res.status(404).json({ error: 'Pedido no encontrado o ya procesado' });
      }
    }

    const validatedOrder = await validateOrderItems(items);
    const validatedItems = validatedOrder.items.map((item) => ({
      product_id: item.product_id,
      product_name: item.product_name,
      quantity: item.quantity,
      price: item.price,
      subtotal: item.subtotal
    }));
    const { subtotal, tax, total } = validatedOrder;

    // Actualizar pedido y reemplazar items
    if (supabase) {
      // Eliminar items viejos
      await supabase
        .from('child_order_items')
        .delete()
        .eq('order_id', id);

      // Insertar nuevos items
      const itemsToInsert = validatedItems.map(item => ({
        order_id: id,
        ...item
      }));

      await supabase
        .from('child_order_items')
        .insert(itemsToInsert);

      // Actualizar total
      const { data: updated, error: updateError } = await supabase
        .from('child_orders')
        .update({
          subtotal,
          tax,
          total,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (updateError) throw updateError;

      return res.json({
        order: updated,
        items: validatedItems,
        message: 'Pedido modificado exitosamente'
      });
    } else {
      // PostgreSQL fallback
      // Eliminar items viejos
      await new Promise((resolve, reject) => {
        pool.query(
          'DELETE FROM child_order_items WHERE order_id = $1',
          [id],
          (err) => {
            if (err) return reject(err);
            resolve();
          }
        );
      });

      // Insertar nuevos items
      for (const item of validatedItems) {
        await new Promise((resolve, reject) => {
          pool.query(
            `INSERT INTO child_order_items (order_id, product_id, product_name, quantity, price, subtotal)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [id, item.product_id, item.product_name, item.quantity, item.price, item.subtotal],
            (err) => {
              if (err) return reject(err);
              resolve();
            }
          );
        });
      }

      // Actualizar total
      const updated = await new Promise((resolve, reject) => {
        pool.query(
          `UPDATE child_orders 
           SET subtotal = $1, tax = $2, total = $3, updated_at = NOW()
           WHERE id = $4 
           RETURNING *`,
          [subtotal, tax, total, id],
          (err, result) => {
            if (err) return reject(err);
            resolve(result.rows[0]);
          }
        );
      });

      return res.json({
        order: updated,
        items: validatedItems,
        message: 'Pedido modificado exitosamente'
      });
    }
  } catch (error) {
    console.error('Error modifying order:', error);
    return res.status(error.statusCode || 500).json({ error: error.message || 'Error al modificar pedido' });
  }
});

// 10. GET /api/parent/child-orders/history - Historial de pedidos
app.get('/api/parent/child-orders/history', authenticateToken, async (req, res) => {
  if (!isParentCapableUser(req.user)) {
    return res.status(403).json({ error: 'Solo los padres pueden ver el historial' });
  }

  const { child_id, status = 'paid', from_date, to_date } = req.query;
  const limit = parsePositiveInteger(req.query.limit, 50);
  const normalizedStatuses = buildOrderStatusAliases(status);

  try {
    if (supabase && isUuidLike(req.user.id)) {
      let query = supabase
        .from('pedidos')
        .select(`
          id,
          estado,
          fecha_creacion,
          id_perfil,
          id_pagador,
          perfiles:id_perfil (
            id,
            nombre_completo
          ),
          lineas_pedido (
            id,
            id_producto_menu,
            nombre_producto,
            precio_compra,
            notas
          )
        `)
        .eq('id_pagador', req.user.id)
        .order('fecha_creacion', { ascending: false })
        .limit(limit);

      if (child_id) {
        query = query.eq('id_perfil', child_id);
      }

      const { data, error } = await query;
      if (error) throw error;

      const orders = (data || [])
        .map((order) => {
          const items = Array.isArray(order.lineas_pedido)
            ? order.lineas_pedido.map((item) => {
                const price = Number.parseFloat(item.precio_compra ?? 0) || 0;
                return {
                  id: item.id,
                  product_id: item.id_producto_menu,
                  product_name: item.nombre_producto || 'Producto',
                  quantity: 1,
                  price,
                  subtotal: price,
                  notes: item.notas || ''
                };
              })
            : [];

          return normalizeHistoricOrderEntry({
            id: order.id,
            status: order.estado,
            created_at: order.fecha_creacion,
            child: {
              id: order.id_perfil,
              name: order.perfiles?.nombre_completo || null
            },
            items,
            items_count: items.length,
            total: items.reduce((sum, item) => sum + item.subtotal, 0)
          });
        })
        .filter((order) => normalizedStatuses.includes(order.status))
        .filter((order) => !from_date || order.created_at >= from_date)
        .filter((order) => !to_date || order.created_at <= to_date);

      return res.json({ orders });
    }

    const pedidosTableExists = await pool.query(
      `SELECT EXISTS (
         SELECT 1
         FROM information_schema.tables
         WHERE table_schema = 'public' AND table_name = 'pedidos'
       ) AS exists`
    );

    if (pedidosTableExists.rows[0]?.exists) {
      const params = [String(req.user.id)];
      let paramIndex = 2;
      let query = `
        SELECT
          p.id,
          p.estado,
          p.fecha_creacion,
          p.id_perfil,
          p.id_pagador,
          perf.nombre_completo AS child_name,
          COALESCE(SUM(COALESCE(lp.precio_compra, 0)), 0) AS total,
          COUNT(lp.id) AS items_count,
          COALESCE(
            json_agg(
              json_build_object(
                'id', lp.id,
                'product_id', lp.id_producto_menu,
                'product_name', lp.nombre_producto,
                'quantity', 1,
                'price', COALESCE(lp.precio_compra, 0),
                'subtotal', COALESCE(lp.precio_compra, 0),
                'notes', COALESCE(lp.notas, '')
              )
            ) FILTER (WHERE lp.id IS NOT NULL),
            '[]'::json
          ) AS items
        FROM pedidos p
        LEFT JOIN lineas_pedido lp ON lp.id_pedido = p.id
        LEFT JOIN perfiles perf ON perf.id = p.id_perfil
        WHERE p.id_pagador::text = $1
      `;

      if (child_id) {
        query += ` AND p.id_perfil::text = $${paramIndex}`;
        params.push(String(child_id));
        paramIndex++;
      }

      if (status) {
        query += ` AND LOWER(COALESCE(p.estado, '')) = ANY($${paramIndex})`;
        params.push(normalizedStatuses);
        paramIndex++;
      }

      if (from_date) {
        query += ` AND p.fecha_creacion >= $${paramIndex}`;
        params.push(from_date);
        paramIndex++;
      }

      if (to_date) {
        query += ` AND p.fecha_creacion <= $${paramIndex}`;
        params.push(to_date);
        paramIndex++;
      }

      query += `
        GROUP BY p.id, p.estado, p.fecha_creacion, p.id_perfil, p.id_pagador, perf.nombre_completo
        ORDER BY p.fecha_creacion DESC
        LIMIT $${paramIndex}
      `;
      params.push(limit);

      const result = await pool.query(query, params);
      const orders = (result.rows || []).map((row) => normalizeHistoricOrderEntry({
        id: row.id,
        status: row.estado,
        created_at: row.fecha_creacion,
        child: {
          id: row.id_perfil,
          name: row.child_name || null
        },
        total: row.total,
        items_count: row.items_count,
        items: Array.isArray(row.items) ? row.items : []
      }));

      return res.json({ orders });
    }

    let query = `SELECT co.*, u.id as child_id, u.nombre as child_name, u.email as child_email 
                 FROM child_orders co 
                 LEFT JOIN users u ON co.child_id = u.id 
                 WHERE co.parent_id = $1`;
    const params = [req.user.id];
    let paramIndex = 2;

    if (child_id) {
      query += ` AND co.child_id = $${paramIndex}`;
      params.push(child_id);
      paramIndex++;
    }
    if (status) {
      query += ` AND LOWER(COALESCE(co.status, '')) = ANY($${paramIndex})`;
      params.push(normalizedStatuses);
      paramIndex++;
    }
    if (from_date) {
      query += ` AND co.created_at >= $${paramIndex}`;
      params.push(from_date);
      paramIndex++;
    }
    if (to_date) {
      query += ` AND co.created_at <= $${paramIndex}`;
      params.push(to_date);
      paramIndex++;
    }

    query += ` ORDER BY co.created_at DESC LIMIT $${paramIndex}`;
    params.push(limit);

    const orders = await new Promise((resolve, reject) => {
      pool.query(query, params, (err, result) => {
        if (err) return reject(err);
        resolve(result.rows);
      });
    });

    const ordersWithItems = await Promise.all(orders.map(async (order) => {
      const items = await new Promise((resolve, reject) => {
        pool.query(
          'SELECT * FROM child_order_items WHERE order_id = $1',
          [order.id],
          (err, result) => {
            if (err) return reject(err);
            resolve(result.rows);
          }
        );
      });

      return normalizeHistoricOrderEntry({
        ...order,
        child: { id: order.child_id, name: order.child_name, email: order.child_email },
        items: items || []
      });
    }));

    return res.json({ orders: ordersWithItems });
  } catch (error) {
    console.error('Error fetching order history:', error);
    return res.status(500).json({ error: 'Error al obtener historial' });
  }
});

// ============================================
// MANEJO DE ERRORES Y ARRANQUE
// ============================================

// 404
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint no encontrado' });
});

async function startServer() {
  if (supabase) {
    console.log('☁️ Supabase configurado. Se priorizara como origen principal de datos.');
  }

  try {
    await ensureLocalUserSchema();
    console.log('👤 Esquema local de usuarios verificado');
    await ensureLocalProductSchema();
    console.log('🧾 Esquema local de ficha técnica verificado');
  } catch (error) {
    if (isLocalDatabaseUnavailable(error)) {
      if (supabase) {
        console.log('ℹ️ PostgreSQL local no disponible. El servidor continuara usando Supabase.');
      } else {
        console.warn('⚠️ No se pudo inicializar el esquema local. Se continúa con fallback. Detalle:', error?.message || String(error));
      }
    } else {
      console.warn('⚠️ No se pudo inicializar el esquema local. Se continúa con fallback. Detalle:', error?.message || String(error));
    }
  }

  app.listen(PORT, async () => {
    console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
    const productSummary = await getActiveProductSummary();
    console.log(`📊 Productos disponibles (${productSummary.source}): ${productSummary.count}`);
  });
}

startServer();
