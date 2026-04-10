-- Script de inicialización de base de datos (se ejecuta automáticamente al crear el contenedor)

-- Crear tablas principales
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  alias VARCHAR(30),
  role VARCHAR(50) DEFAULT 'customer', -- 'admin', 'parent', 'child', 'customer'
  is_adult BOOLEAN DEFAULT false,
  birth_date DATE,
  parent_token VARCHAR(10) UNIQUE, -- Token único generado para padres
  phone VARCHAR(20),
  verified_phone BOOLEAN DEFAULT false,
  verified_email BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  last_login TIMESTAMP,
  active BOOLEAN DEFAULT true,
  favoritos TEXT[] DEFAULT '{}',
  special_code VARCHAR(50)
);

ALTER TABLE users ADD COLUMN IF NOT EXISTS alias VARCHAR(30);
ALTER TABLE users ADD COLUMN IF NOT EXISTS favoritos TEXT[] DEFAULT '{}';
ALTER TABLE users ADD COLUMN IF NOT EXISTS special_code VARCHAR(50);

CREATE TABLE IF NOT EXISTS menu_items (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  price NUMERIC(10, 2) NOT NULL,
  category VARCHAR(100),
  active BOOLEAN DEFAULT true,
  image_url TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tipos_alergenos (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  slug TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS orders (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id) ON DELETE SET NULL,
  table_number INT,
  status VARCHAR(50) DEFAULT 'pending',
  total NUMERIC(10, 2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  served_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS order_items (
  id SERIAL PRIMARY KEY,
  order_id INT REFERENCES orders(id) ON DELETE CASCADE,
  menu_item_id INT REFERENCES menu_items(id) ON DELETE SET NULL,
  quantity INT NOT NULL DEFAULT 1,
  price NUMERIC(10, 2) NOT NULL,
  notes TEXT
);

-- Crear índices
CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_order_items_order_id ON order_items(order_id);

INSERT INTO tipos_alergenos (nombre, slug) VALUES
  ('Gluten', 'gluten'),
  ('Lactosa', 'lactosa'),
  ('Huevo', 'huevo'),
  ('Frutos secos', 'frutos secos'),
  ('Pescado', 'pescado'),
  ('Sesamo', 'sesamo'),
  ('Sulfitos', 'sulfitos'),
  ('Soja', 'soja')
ON CONFLICT (slug) DO NOTHING;

-- ============================================
-- SISTEMA PADRE-HIJO
-- ============================================

-- Tabla de vínculos padre-hijo
CREATE TABLE IF NOT EXISTS parent_child_links (
  id SERIAL PRIMARY KEY,
  parent_id INT REFERENCES users(id) ON DELETE CASCADE,
  child_id INT REFERENCES users(id) ON DELETE CASCADE,
  status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'active', 'rejected', 'suspended'
  requested_at TIMESTAMP DEFAULT NOW(),
  approved_at TIMESTAMP,
  spending_limit NUMERIC(10,2) DEFAULT 20.00,
  can_order BOOLEAN DEFAULT true,
  notes TEXT,
  UNIQUE(parent_id, child_id)
);

CREATE INDEX idx_parent_child_parent ON parent_child_links(parent_id);
CREATE INDEX idx_parent_child_child ON parent_child_links(child_id);

CREATE OR REPLACE FUNCTION enforce_child_adult_limit()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status IN ('pending', 'active') AND (
    SELECT COUNT(*)
    FROM parent_child_links
    WHERE child_id = NEW.child_id
      AND status = 'active'
      AND id <> COALESCE(NEW.id, -1)
  ) >= 5 THEN
    RAISE EXCEPTION 'Un menor no puede tener más de 5 adultos relacionados';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_enforce_child_adult_limit ON parent_child_links;

CREATE TRIGGER trg_enforce_child_adult_limit
BEFORE INSERT OR UPDATE OF child_id, status
ON parent_child_links
FOR EACH ROW
EXECUTE FUNCTION enforce_child_adult_limit();

-- Tabla de pedidos de hijos
CREATE TABLE IF NOT EXISTS child_orders (
  id SERIAL PRIMARY KEY,
  child_id INT REFERENCES users(id) ON DELETE SET NULL,
  parent_id INT REFERENCES users(id) ON DELETE SET NULL,
  link_id INT REFERENCES parent_child_links(id),
  status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'approved', 'rejected', 'paid', 'cancelled'
  subtotal NUMERIC(10, 2) DEFAULT 0,
  tax NUMERIC(10, 2) DEFAULT 0,
  total NUMERIC(10, 2) DEFAULT 0,
  notes TEXT,
  approved_amount NUMERIC(10, 2),
  approved_at TIMESTAMP,
  rejected_at TIMESTAMP,
  rejection_reason TEXT,
  paid_at TIMESTAMP,
  payment_method VARCHAR(50),
  amount_paid NUMERIC(10, 2),
  delivery_time TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Tabla de items de pedidos de hijos (normalizada)
CREATE TABLE IF NOT EXISTS child_order_items (
  id SERIAL PRIMARY KEY,
  order_id INT REFERENCES child_orders(id) ON DELETE CASCADE NOT NULL,
  product_id INT REFERENCES menu_items(id) ON DELETE SET NULL,
  product_name VARCHAR(255) NOT NULL, -- Cache del nombre por si se elimina el producto
  quantity INT NOT NULL DEFAULT 1,
  price NUMERIC(10, 2) NOT NULL,
  subtotal NUMERIC(10, 2) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_child_orders_child ON child_orders(child_id);
CREATE INDEX idx_child_orders_parent ON child_orders(parent_id);
CREATE INDEX idx_child_orders_status ON child_orders(status);
CREATE INDEX idx_child_order_items_order ON child_order_items(order_id);

-- Tabla de log anti-fraude
CREATE TABLE IF NOT EXISTS fraud_prevention_log (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id),
  action_type VARCHAR(100),
  severity VARCHAR(20),
  details JSONB,
  ip_address VARCHAR(50),
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_fraud_log_user ON fraud_prevention_log(user_id);
CREATE INDEX idx_fraud_log_severity ON fraud_prevention_log(severity);

-- Seeds de ejemplo (productos del menú)
INSERT INTO menu_items (name, description, price, category, active) VALUES
  ('Café Espresso', 'Café espresso clásico', 2.00, 'Bebidas', true),
  ('Café Latte', 'Café con leche espumosa', 2.50, 'Bebidas', true),
  ('Croissant', 'Croissant de mantequilla', 1.50, 'Panadería', true),
  ('Tostada con aguacate', 'Pan integral con aguacate y huevo', 4.50, 'Comida', true),
  ('Zumo de naranja', 'Zumo natural recién exprimido', 3.00, 'Bebidas', true)
ON CONFLICT DO NOTHING;

-- Usuario de ejemplo
INSERT INTO users (email, password_hash, name, role, is_adult, parent_token) VALUES
  ('admin@admin', '$2b$10$LHjzQBQvIm6iWxj0vaHO..OhdaE6oyl6B5BJmaPk7eJj0NxbwrcWa', 'Administrador', 'admin', true, NULL),
  ('admin@cafeteria.local', '$2b$10$LHjzQBQvIm6iWxj0vaHO..OhdaE6oyl6B5BJmaPk7eJj0NxbwrcWa', 'Admin', 'admin', true, NULL),
  ('padre@cafeteria.local', '$2b$10$LHjzQBQvIm6iWxj0vaHO..OhdaE6oyl6B5BJmaPk7eJj0NxbwrcWa', 'Padre Demo', 'parent', true, 'DEMO1234'),
  ('hijo@cafeteria.local', '$2b$10$LHjzQBQvIm6iWxj0vaHO..OhdaE6oyl6B5BJmaPk7eJj0NxbwrcWa', 'Hijo Demo', 'child', false, NULL)
ON CONFLICT (email) DO NOTHING;

-- Mensaje de confirmación
SELECT 'Base de datos inicializada correctamente' AS status;
