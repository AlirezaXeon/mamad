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

CREATE TABLE IF NOT EXISTS projects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  summary TEXT,
  description TEXT,
  cover TEXT,
  images TEXT NOT NULL DEFAULT '[]', -- آرایه JSON از آدرس تصاویر
  facts TEXT NOT NULL DEFAULT '{}',   -- شیء JSON از مشخصات پروژه
  sort_order INTEGER DEFAULT 0,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_projects_sort ON projects(is_active, sort_order, id);
CREATE INDEX IF NOT EXISTS idx_projects_slug ON projects(slug);

CREATE TABLE IF NOT EXISTS site_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- ذخیره‌سازی رسانه و تصاویر WebP مستقیماً در دیتابیس D1 (بدون نیاز به R2 یا کارت اعتباری)
CREATE TABLE IF NOT EXISTS media (
  key TEXT PRIMARY KEY,
  mime TEXT NOT NULL DEFAULT 'image/webp',
  size INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS media_chunks (
  key TEXT NOT NULL,
  chunk_index INTEGER NOT NULL,
  data TEXT NOT NULL,
  PRIMARY KEY (key, chunk_index)
);
CREATE INDEX IF NOT EXISTS idx_media_chunks ON media_chunks(key, chunk_index);
