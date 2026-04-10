-- Script SQL para crear tabla de usuarios en Supabase
-- Copia este contenido en el SQL Editor de Supabase Dashboard

-- Crear tabla de usuarios
CREATE TABLE IF NOT EXISTS users (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  alias VARCHAR(30),
  role VARCHAR(50) DEFAULT 'customer',
  is_adult BOOLEAN DEFAULT false,
  birth_date DATE,
  parent_token VARCHAR(10) UNIQUE,
  phone VARCHAR(20),
  verified_phone BOOLEAN DEFAULT false,
  verified_email BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  last_login TIMESTAMP,
  active BOOLEAN DEFAULT true
);

ALTER TABLE users ADD COLUMN IF NOT EXISTS alias VARCHAR(30);

-- Crear índices
CREATE INDEX IF NOT EXISTS users_email_idx ON users(email);
CREATE INDEX IF NOT EXISTS users_role_idx ON users(role);
CREATE INDEX IF NOT EXISTS users_active_idx ON users(active);
CREATE INDEX IF NOT EXISTS users_parent_token_idx ON users(parent_token);

-- Configurar Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Eliminar políticas existentes si existen
DROP POLICY IF EXISTS "Users can read own data" ON users;
DROP POLICY IF EXISTS "Enable insert for registration" ON users;
DROP POLICY IF EXISTS "Users can update own data" ON users;
DROP POLICY IF EXISTS "Only admins can delete" ON users;
DROP POLICY IF EXISTS "Service role full access" ON users;

-- Política: Los usuarios pueden leer su propia información
CREATE POLICY "Users can read own data" ON users
  FOR SELECT
  USING (auth.uid()::text = id::text OR role = 'admin');

-- Política: Permitir inserción pública para registro
CREATE POLICY "Enable insert for registration" ON users
  FOR INSERT
  WITH CHECK (true);

-- Política: Los usuarios pueden actualizar su propia información
CREATE POLICY "Users can update own data" ON users
  FOR UPDATE
  USING (auth.uid()::text = id::text OR role = 'admin');

-- Política: Solo admins pueden eliminar usuarios
CREATE POLICY "Only admins can delete" ON users
  FOR DELETE
  USING (role = 'admin');

-- Permitir que service role pueda hacer CRUD completo (para el backend)
CREATE POLICY "Service role full access" ON users
  USING (true)
  WITH CHECK (true);

-- ============================================
-- TABLAS ADICIONALES DEL SISTEMA
-- ============================================

-- Tabla de vínculos padre-hijo
CREATE TABLE IF NOT EXISTS parent_child_links (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  parent_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
  child_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
  status VARCHAR(50) DEFAULT 'pending',
  requested_at TIMESTAMP DEFAULT NOW(),
  approved_at TIMESTAMP,
  spending_limit NUMERIC(10,2) DEFAULT 20.00,
  can_order BOOLEAN DEFAULT true,
  notes TEXT,
  UNIQUE(parent_id, child_id)
);

CREATE INDEX IF NOT EXISTS parent_child_parent_idx ON parent_child_links(parent_id);
CREATE INDEX IF NOT EXISTS parent_child_child_idx ON parent_child_links(child_id);
CREATE INDEX IF NOT EXISTS parent_child_status_idx ON parent_child_links(status);

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

-- RLS para parent_child_links
ALTER TABLE parent_child_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can see their own links" ON parent_child_links;
DROP POLICY IF EXISTS "Service role full access on links" ON parent_child_links;

CREATE POLICY "Users can see their own links" ON parent_child_links
  FOR SELECT
  USING (parent_id IN (SELECT id FROM users WHERE auth.uid()::text = id::text) 
         OR child_id IN (SELECT id FROM users WHERE auth.uid()::text = id::text));

CREATE POLICY "Service role full access on links" ON parent_child_links
  USING (true) WITH CHECK (true);

-- Tabla de log anti-fraude
CREATE TABLE IF NOT EXISTS fraud_prevention_log (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  action_type VARCHAR(100),
  severity VARCHAR(20),
  details JSONB,
  ip_address VARCHAR(50),
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS fraud_log_user_idx ON fraud_prevention_log(user_id);
CREATE INDEX IF NOT EXISTS fraud_log_severity_idx ON fraud_prevention_log(severity);
CREATE INDEX IF NOT EXISTS fraud_log_created_idx ON fraud_prevention_log(created_at DESC);

-- RLS para fraud_prevention_log
ALTER TABLE fraud_prevention_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can see fraud logs" ON fraud_prevention_log;
DROP POLICY IF EXISTS "Service role full access on fraud logs" ON fraud_prevention_log;

CREATE POLICY "Admins can see fraud logs" ON fraud_prevention_log
  FOR SELECT
  USING (EXISTS (SELECT 1 FROM users WHERE id::text = auth.uid()::text AND role = 'admin'));

CREATE POLICY "Service role full access on fraud logs" ON fraud_prevention_log
  USING (true) WITH CHECK (true);

-- ============================================
-- INSERTAR USUARIO ADMINISTRADOR POR DEFECTO
-- ============================================
-- Password: admin (hash bcrypt)
INSERT INTO users (email, password_hash, name, role, is_adult, active) VALUES
  ('admin@admin', '$2b$10$LHjzQBQvIm6iWxj0vaHO..OhdaE6oyl6B5BJmaPk7eJj0NxbwrcWa', 'Administrador', 'admin', true, true)
ON CONFLICT (email) DO NOTHING;

-- Usuario demo padre
INSERT INTO users (email, password_hash, name, role, is_adult, parent_token, active, birth_date) VALUES
  ('padre@cafeteria.local', '$2b$10$LHjzQBQvIm6iWxj0vaHO..OhdaE6oyl6B5BJmaPk7eJj0NxbwrcWa', 'Padre Demo', 'parent', true, 'DEMO1234', true, '1985-01-15')
ON CONFLICT (email) DO NOTHING;

-- Usuario demo hijo
INSERT INTO users (email, password_hash, name, role, is_adult, active, birth_date) VALUES
  ('hijo@cafeteria.local', '$2b$10$LHjzQBQvIm6iWxj0vaHO..OhdaE6oyl6B5BJmaPk7eJj0NxbwrcWa', 'Hijo Demo', 'child', false, true, '2010-06-20')
ON CONFLICT (email) DO NOTHING;

-- Verificar que las tablas se crearon correctamente
SELECT 'Tablas de usuarios creadas correctamente' AS status;
SELECT COUNT(*) as total_users FROM users;
