-- Script SQL para crear tabla de productos en Supabase
-- Copia este contenido en el SQL Editor de Supabase Dashboard

CREATE TABLE IF NOT EXISTS products (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  price DECIMAL(10, 2) NOT NULL,
  category VARCHAR(100) NOT NULL,
  active BOOLEAN DEFAULT true,
  image_url TEXT,
  badges JSONB DEFAULT '[]'::jsonb,
  allergens JSONB DEFAULT '[]'::jsonb,
  options JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Crear índices para mejorar performance
CREATE INDEX IF NOT EXISTS products_category_idx ON products(category);
CREATE INDEX IF NOT EXISTS products_active_idx ON products(active);
CREATE INDEX IF NOT EXISTS products_created_at_idx ON products(created_at DESC);

-- Configurar Row Level Security (RLS)
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Permitir lectura pública de productos activos
CREATE POLICY "Allow public read active products" ON products
  FOR SELECT USING (active = true);

-- Permitir que service role pueda hacer CRUD completo
CREATE POLICY "Allow service role full access" ON products
  USING (true);

-- Para verificar que la tabla se creó correctamente
-- SELECT * FROM products;
