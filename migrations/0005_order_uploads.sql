-- Migration 0005: آپلودهای موقت عکس سفارش (قبل از ثبت سفارش)
CREATE TABLE IF NOT EXISTS order_uploads (
  id TEXT PRIMARY KEY,
  sid TEXT NOT NULL,
  key TEXT NOT NULL,
  name TEXT,
  size INTEGER,
  type TEXT,
  ip_hash TEXT,
  order_code TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_uploads_sid ON order_uploads(sid, order_code);
CREATE INDEX IF NOT EXISTS idx_uploads_ip ON order_uploads(ip_hash, created_at);
