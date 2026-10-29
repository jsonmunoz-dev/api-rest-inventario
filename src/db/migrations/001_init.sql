CREATE TABLE IF NOT EXISTS categories (
  id          SERIAL PRIMARY KEY,
  name        VARCHAR(80)  NOT NULL UNIQUE,
  description TEXT,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS products (
  id          SERIAL PRIMARY KEY,
  sku         VARCHAR(40)    NOT NULL UNIQUE,
  name        VARCHAR(150)   NOT NULL,
  description TEXT,
  price       NUMERIC(12, 2) NOT NULL CHECK (price >= 0),
  -- La base de datos garantiza que el stock nunca sea negativo,
  -- incluso si dos movimientos llegan al mismo tiempo.
  stock       INTEGER        NOT NULL DEFAULT 0 CHECK (stock >= 0),
  min_stock   INTEGER        NOT NULL DEFAULT 0 CHECK (min_stock >= 0),
  category_id INTEGER        NOT NULL REFERENCES categories (id) ON DELETE RESTRICT,
  created_at  TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_products_category ON products (category_id);
CREATE INDEX IF NOT EXISTS idx_products_name_lower ON products (LOWER(name));

CREATE TABLE IF NOT EXISTS stock_movements (
  id         SERIAL PRIMARY KEY,
  product_id INTEGER     NOT NULL REFERENCES products (id) ON DELETE CASCADE,
  type       VARCHAR(3)  NOT NULL CHECK (type IN ('in', 'out')),
  quantity   INTEGER     NOT NULL CHECK (quantity > 0),
  note       TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_movements_product ON stock_movements (product_id, created_at DESC);
