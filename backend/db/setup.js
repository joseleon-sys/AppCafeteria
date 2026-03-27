import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });
dotenv.config({ path: path.join(__dirname, '../../.env'), override: false });

const supabaseUrl = (process.env.SUPABASE_URL || '').trim();
const supabaseServiceKey = (
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_KEY ||
  ''
).trim();

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Faltan variables de Supabase en .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function setupDatabase() {
  try {
    console.log('� Insertando productos en Supabase...');

    const products = [
      {
        name: 'Café con Leche',
        description: 'Café espresso con leche espumada',
        price: 1.20,
        category: 'cafes',
        active: true,
        image_url: 'https://images.unsplash.com/photo-1541167760496-1628856ab772?w=400&q=80',
        badges: ['popular'],
        allergens: ['lactosa'],
        options: { sugar: { available: true, max: 3 }, removables: ['leche', 'cacao'] }
      },
      {
        name: 'Bocadillo de Jamón',
        description: 'Pan tostado con jamón serrano',
        price: 3.50,
        category: 'bocadillos',
        active: true,
        image_url: 'https://images.unsplash.com/photo-1553909489-cd47e332431e?w=400&q=80',
        badges: [],
        allergens: ['gluten'],
        options: { sugar: { available: false }, removables: ['tomate', 'aceite'] }
      },
      {
        name: 'Croissant',
        description: 'Croissant de mantequilla recién horneado',
        price: 2.50,
        category: 'dulces',
        active: true,
        image_url: 'https://images.unsplash.com/photo-1585518419759-fdfae1f6d335?w=400&q=80',
        badges: ['nuevo'],
        allergens: ['lactosa', 'gluten'],
        options: { sugar: { available: false }, removables: [] }
      },
      {
        name: 'Zumo de Naranja',
        description: 'Zumo natural de naranja recién exprimido',
        price: 2.00,
        category: 'bebidas',
        active: true,
        image_url: 'https://images.unsplash.com/photo-1600271886742-f049cd451bba?w=400&q=80',
        badges: [],
        allergens: [],
        options: { sugar: { available: false }, removables: [] }
      },
      {
        name: 'Ensalada Griega',
        description: 'Lechuga, tomate, queso feta y aceitunas',
        price: 5.00,
        category: 'bocadillos',
        active: true,
        image_url: 'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=400&q=80',
        badges: ['saludable'],
        allergens: ['lactosa'],
        options: { sugar: { available: false }, removables: ['feta', 'aceitunas'] }
      }
    ];

    // Primero, eliminar productos existentes para limpiar
    const { error: deleteError } = await supabase
      .from('products')
      .delete()
      .neq('id', 0);

    if (deleteError && deleteError.code !== 'PGRST116') {
      console.log('ℹ️ Nota: No se pudo limpiar productos existentes (tabla podría estar vacía)');
    }

    // Insertar nuevos productos
    const { data, error } = await supabase
      .from('products')
      .insert(products)
      .select();

    if (error) {
      console.error('❌ Error al insertar productos:', error);
      console.log('💡 Asegúrate de que la tabla "products" existe en Supabase');
      process.exit(1);
    }

    console.log(`✅ ${data?.length || products.length} productos insertados correctamente`);
    console.log('🎉 Productos cargados desde Supabase!');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

setupDatabase();
