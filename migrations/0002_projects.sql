-- Migration 0002: Projects, Site Settings and Native Media in D1
CREATE TABLE IF NOT EXISTS projects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  summary TEXT,
  description TEXT,
  cover TEXT,
  images TEXT NOT NULL DEFAULT '[]',
  facts TEXT NOT NULL DEFAULT '{}',
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

-- داده‌های اولیه پروژه‌ها
INSERT OR IGNORE INTO projects (slug, title, category, summary, description, cover, images, facts, sort_order) VALUES
(
  'villa-narenjestan',
  'ویلای نارنجستان',
  'مسکونی',
  'ویلا، شمال، ۲۵۰ متر',
  'بازطراحی فضای نشیمن و آشپزخانه با تکیه بر امتداد نور طبیعی، متریال چوب گردو و بتن اکسپوز به منظور ایجاد فضایی گرم، صمیمی و مینیمال.',
  'images/projects/villa-narenjestan/1.jpg',
  '["images/projects/villa-narenjestan/1.jpg","images/projects/villa-narenjestan/2.jpg","images/projects/villa-narenjestan/3.jpg","images/projects/villa-narenjestan/4.jpg"]',
  '{"موقعیت":"نوشهر","متراژ":"۲۵۰ متر","سال":"۱۴۰۴","وضعیت":"رندر"}',
  1
),
(
  'penthouse-saadat',
  'پنت‌هاوس سعادت‌آباد',
  'مسکونی',
  'پنت‌هاوس، تهران، ۱۸۰ متر',
  'طراحی داخلی یک پنت‌هاوس با پلان باز و پالت رنگی خنثی.',
  'images/projects/penthouse-saadat/1.jpg',
  '["images/projects/penthouse-saadat/1.jpg","images/projects/penthouse-saadat/2.jpg","images/projects/penthouse-saadat/3.jpg","images/projects/penthouse-saadat/4.jpg"]',
  '{"موقعیت":"تهران","متراژ":"۱۸۰ متر","سال":"۱۴۰۴","کارفرما":"خصوصی"}',
  2
),
(
  'cafe-roshan',
  'کافه روشن',
  'تجاری',
  'کافه، اردبیل، ۹۰ متر',
  'طراحی فضای کافه با نورپردازی گرم و چیدمان انعطاف‌پذیر.',
  'images/projects/cafe-roshan/1.jpg',
  '["images/projects/cafe-roshan/1.jpg","images/projects/cafe-roshan/2.jpg","images/projects/cafe-roshan/3.jpg","images/projects/cafe-roshan/4.jpg"]',
  '{"موقعیت":"اردبیل","متراژ":"۹۰ متر","سال":"۱۴۰۳","وضعیت":"اجرا شده"}',
  3
),
(
  'office-arman',
  'دفتر آرمان',
  'اداری',
  'دفتر کار، تبریز، ۱۴۰ متر',
  'فضای کار باز با اتاق جلسه شیشه‌ای و مصالح روشن.',
  'images/projects/office-arman/1.jpg',
  '["images/projects/office-arman/1.jpg","images/projects/office-arman/2.jpg","images/projects/office-arman/3.jpg","images/projects/office-arman/4.jpg"]',
  '{"موقعیت":"تبریز","متراژ":"۱۴۰ متر","سال":"۱۴۰۴","وضعیت":"رندر"}',
  4
);
