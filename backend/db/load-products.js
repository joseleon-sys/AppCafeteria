import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  user: process.env.POSTGRES_USER || 'cafeteria_user',
  password: process.env.POSTGRES_PASSWORD || 'cafeteria_pass',
  host: 'localhost',
  port: 5433,
  database: process.env.POSTGRES_DB || 'cafeteria_db'
});

const products = [
  // CAFÉS (7 productos)
  { name: 'Café Espresso', description: 'Café espresso clásico', price: 1.50, category: 'cafes', active: true },
  { name: 'Café Americano', description: 'Espresso con agua caliente', price: 1.80, category: 'cafes', active: true },
  { name: 'Café con Leche', description: 'Espresso con leche espumada', price: 2.00, category: 'cafes', active: true },
  { name: 'Capuchino', description: 'Café con leche y cacao en polvo', price: 2.50, category: 'cafes', active: true },
  { name: 'Latte Macchiato', description: 'Leche con café y espuma', price: 2.80, category: 'cafes', active: true },
  { name: 'Café Descafeinado', description: 'Espresso sin cafeína', price: 2.00, category: 'cafes', active: true },
  { name: 'Café Cortado', description: 'Espresso con un poco de leche', price: 1.70, category: 'cafes', active: true },
  
  // BOCADILLOS (9 productos)
  { name: 'Bocadillo de Jamón Serrano', description: 'Pan tostado con jamón serrano de calidad', price: 4.50, category: 'bocadillos', active: true },
  { name: 'Bocadillo de Queso', description: 'Pan tostado con queso manchego', price: 3.50, category: 'bocadillos', active: true },
  { name: 'Bocadillo Mixto', description: 'Pan tostado con jamón y queso', price: 5.00, category: 'bocadillos', active: true },
  { name: 'Bocadillo de Atún', description: 'Pan con atún fresco y mayonesa', price: 4.00, category: 'bocadillos', active: true },
  { name: 'Bocadillo Vegetal', description: 'Pan tostado con lechuga, tomate, cebolla y aguacate', price: 4.50, category: 'bocadillos', active: true },
  { name: 'Sándwich de Pollo', description: 'Pan con pechuga de pollo a la plancha', price: 5.00, category: 'bocadillos', active: true },
  { name: 'Tostada de Aguacate', description: 'Pan integral con aguacate y huevo', price: 4.50, category: 'bocadillos', active: true },
  { name: 'Pincho de Tortilla', description: 'Pincho de tortilla española típica', price: 3.00, category: 'bocadillos', active: true },
  { name: 'Mini Croissant Relleno', description: 'Croissant mini con jamón y queso', price: 3.50, category: 'bocadillos', active: true },
  
  // DULCES (6 productos)
  { name: 'Croissant de Mantequilla', description: 'Croissant de hojaldre crujiente', price: 2.50, category: 'dulces', active: true },
  { name: 'Cruasán de Chocolate', description: 'Croissant relleno de chocolate', price: 3.00, category: 'dulces', active: true },
  { name: 'Muffin de Arándanos', description: 'Muffin casero con arándanos frescos', price: 2.80, category: 'dulces', active: true },
  { name: 'Donut Glaseado', description: 'Donut con cobertura de azúcar', price: 2.00, category: 'dulces', active: true },
  { name: 'Tarta de Queso', description: 'Porción de tarta de queso neoyorquina', price: 4.00, category: 'dulces', active: true },
  { name: 'Galleta de Chocolate', description: 'Galleta casera con pepitas de chocolate', price: 1.50, category: 'dulces', active: true },
  
  // BEBIDAS (4 productos)
  { name: 'Zumo de Naranja Natural', description: 'Zumo natural de naranja recién exprimido', price: 3.00, category: 'bebidas', active: true },
  { name: 'Batido de Fresa', description: 'Batido casero de fresas frescas', price: 3.50, category: 'bebidas', active: true },
  { name: 'Batido de Vainilla', description: 'Batido cremoso de vainilla', price: 3.50, category: 'bebidas', active: true },
  { name: 'Agua Mineral', description: 'Agua mineral sin gas', price: 1.00, category: 'bebidas', active: true }
];

function buildTechnicalSheet(product) {
  const name = product.name.toLowerCase();

  let ingredients = [];
  let allergens = [];
  let caloriesKcal = 0;
  let nutritionTable = {};

  if (product.category === 'cafes') {
    if (name.includes('leche') || name.includes('latte') || name.includes('cortado') || name.includes('capuchino')) {
      ingredients = ['Café', 'Leche'];
      allergens = ['lactosa'];
      caloriesKcal = 55;
      nutritionTable = { proteins_g: 2.8, carbs_g: 4.6, fats_g: 2.8, salt_g: 0.1 };
    } else {
      ingredients = ['Café', 'Agua'];
      caloriesKcal = 3;
      nutritionTable = { proteins_g: 0.2, carbs_g: 0.3, fats_g: 0.0, salt_g: 0.0 };
    }
  } else if (product.category === 'bocadillos') {
    ingredients = ['Pan'];
    allergens = ['gluten'];
    if (name.includes('jamón')) ingredients.push('Jamón');
    if (name.includes('queso') || name.includes('mixto') || name.includes('croissant')) {
      ingredients.push('Queso');
      allergens.push('lactosa');
    }
    if (name.includes('atún')) {
      ingredients.push('Atún', 'Mayonesa');
      allergens.push('pescado', 'huevo');
    }
    if (name.includes('tortilla')) {
      ingredients.push('Huevo');
      allergens.push('huevo');
    }
    if (name.includes('vegetal') || name.includes('aguacate')) ingredients.push('Lechuga', 'Tomate');
    if (name.includes('pollo') || name.includes('pechuga')) ingredients.push('Pollo');
    caloriesKcal = 255;
    nutritionTable = { proteins_g: 11.0, carbs_g: 28.0, fats_g: 10.0, salt_g: 1.2 };
  } else if (product.category === 'dulces') {
    ingredients = ['Harina de trigo', 'Azúcar', 'Mantequilla', 'Huevo'];
    allergens = ['gluten', 'lactosa', 'huevo'];
    caloriesKcal = 340;
    nutritionTable = { proteins_g: 6.0, carbs_g: 42.0, fats_g: 16.0, salt_g: 0.4 };
  } else {
    ingredients = ['Agua'];
    if (name.includes('zumo')) ingredients = ['Zumo de fruta'];
    if (name.includes('batido')) {
      ingredients = ['Leche', 'Fruta'];
      allergens = ['lactosa'];
    }
    caloriesKcal = name.includes('agua') ? 0 : 48;
    nutritionTable = { proteins_g: 0.5, carbs_g: 11.0, fats_g: 0.3, salt_g: 0.1 };
  }

  const uniqueAllergens = [...new Set(allergens)];

  return {
    ingredients,
    allergens: uniqueAllergens,
    contains_info: uniqueAllergens.length
      ? `Contiene: ${uniqueAllergens.join(', ')}`
      : 'Sin alérgenos declarados',
    conservation: 'Conservar refrigerado entre 0ºC y 4ºC. Consumir en el día.',
    shelf_life_hours: product.category === 'bebidas' ? 12 : 24,
    calories_kcal: caloriesKcal,
    nutrition_table: nutritionTable,
    sanitary_approved: true,
    sanitary_notes: 'Ficha técnica revisada y aprobada para venta en cafetería escolar.',
    approved_at: new Date().toISOString(),
    image_url: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=400&q=80',
    badges: []
  };
}

async function ensureSchema() {
  const statements = [
    `ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS image_url TEXT`,
    `ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS badges JSONB DEFAULT '[]'::jsonb`,
    `ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS allergens JSONB DEFAULT '[]'::jsonb`,
    `ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS options JSONB DEFAULT '{}'::jsonb`,
    `ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS ingredients JSONB DEFAULT '[]'::jsonb`,
    `ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS contains_info TEXT DEFAULT ''`,
    `ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS conservation TEXT DEFAULT 'Conservar refrigerado entre 0ºC y 4ºC'`,
    `ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS shelf_life_hours INT DEFAULT 24`,
    `ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS calories_kcal INT DEFAULT 0`,
    `ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS nutrition_table JSONB DEFAULT '{}'::jsonb`,
    `ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS sanitary_approved BOOLEAN DEFAULT true`,
    `ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS sanitary_notes TEXT DEFAULT ''`,
    `ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP`
  ];

  for (const statement of statements) {
    await pool.query(statement);
  }
}

async function loadProducts() {
  try {
    await ensureSchema();
    console.log('🔄 Limpiando productos existentes...');
    await pool.query('DELETE FROM menu_items');
    
    console.log('📦 Cargando 26 productos...');
    for (const product of products) {
      const technical = buildTechnicalSheet(product);
      await pool.query(
        `INSERT INTO menu_items (
          name, description, price, category, active,
          image_url, badges, allergens, options,
          ingredients, contains_info, conservation, shelf_life_hours,
          calories_kcal, nutrition_table, sanitary_approved, sanitary_notes, approved_at
        ) VALUES (
          $1, $2, $3, $4, $5,
          $6, $7, $8, $9,
          $10, $11, $12, $13,
          $14, $15, $16, $17, $18
        )`,
        [
          product.name,
          product.description,
          product.price,
          product.category,
          product.active,
          technical.image_url,
          JSON.stringify(technical.badges),
          JSON.stringify(technical.allergens),
          JSON.stringify({}),
          JSON.stringify(technical.ingredients),
          technical.contains_info,
          technical.conservation,
          technical.shelf_life_hours,
          technical.calories_kcal,
          JSON.stringify(technical.nutrition_table),
          technical.sanitary_approved,
          technical.sanitary_notes,
          technical.approved_at
        ]
      );
    }
    
    const result = await pool.query('SELECT COUNT(*) FROM menu_items');
    console.log(`✅ ${result.rows[0].count} productos cargados correctamente`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error al cargar productos:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

loadProducts();
