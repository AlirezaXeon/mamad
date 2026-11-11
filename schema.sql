CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  status TEXT NOT NULL DEFAULT 'new',
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  contact_method TEXT,
  contact_time TEXT,
  telegram_id TEXT,
  services TEXT NOT NULL,
  property_type TEXT,
  property_state TEXT,
  city TEXT,
  area REAL,
  rooms TEXT,
  styles TEXT,
  budget TEXT,
  timeline TEXT,
  notes TEXT,
  refs TEXT,
  admin_note TEXT,
  ip_hash TEXT
);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status, id);
CREATE INDEX IF NOT EXISTS idx_orders_ip ON orders(ip_hash, created_at);
