// Worker: API سفارش‌ها، پروژه‌ها، مدیریت رسانه و تنظیمات سایت
// پیش‌نیازها: D1 (DB)، Workers KV (MEDIA)، ASSETS و سکرت‌های ADMIN_PASSWORD ، TELEGRAM_BOT_TOKEN ، TELEGRAM_CHAT_ID

const MAX_IMAGE_SIZE = 3 * 1024 * 1024; // حداکثر ۳ مگابایت برای هر تصویر WebP
const STATUSES = ['new', 'review', 'contacted', 'contract', 'archived'];

const J = (data, status = 200) => new Response(JSON.stringify(data), {
  status,
  headers: {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'x-content-type-options': 'nosniff'
  },
});

const toEn = s => String(s ?? '')
  .replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d))
  .replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d));

const parseNumber = s => {
  const clean = toEn(s)
    .replace(/[،,٬]/g, '')
    .replace(/٫/g, '.');
  const n = parseFloat(clean);
  return Number.isFinite(n) ? n : 0;
};

const clean = (s, n) => String(s ?? '').replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, n);
const esc = s => String(s ?? '').replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));

// اعتبارسنجی آدرس‌های تصویر، تصاویر و مشخصات پروژه
function cleanImageUrl(v) {
  if (v == null || v === '') return '';
  if (typeof v !== 'string') return null;
  const s = v.replace(/[\u0000-\u001f]/g, '').trim();
  if (!s) return '';
  if (s.length > 300) return null;
  const isKv = /^\/api\/media\/img:[a-f0-9]{32}\.webp$/.test(s);
  const isStatic = /^\/?images\/[\w./-]+$/.test(s);
  const isHttps = /^https:\/\/\S+$/.test(s);
  if (isKv || isStatic || isHttps) return s;
  return null;
}

function cleanImages(arr) {
  if (!Array.isArray(arr)) return { error: 'تصاویر پروژه باید به صورت آرایه ارسال شوند.' };
  if (arr.length > 30) return { error: 'حداکثر ۳۰ تصویر برای هر پروژه مجاز است.' };
  const out = [];
  for (let i = 0; i < arr.length; i++) {
    const u = cleanImageUrl(arr[i]);
    if (!u) {
      return { error: `آدرس تصویر شماره ${i + 1} نامعتبر است.` };
    }
    out.push(u);
  }
  return { images: out };
}

function cleanFacts(obj) {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return {};
  const entries = Object.entries(obj).slice(0, 20);
  const out = {};
  for (const [k, v] of entries) {
    const ck = clean(k, 40);
    const cv = clean(String(v ?? ''), 120);
    if (ck) out[ck] = cv;
  }
  return out;
}

async function sha(s) {
  const b = await crypto.subtle.digest('SHA-256', typeof s === 'string' ? new TextEncoder().encode(s) : s);
  return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join('');
}

async function clientHash(req, env) {
  const ip = req.headers.get('cf-connecting-ip') || 'x';
  const salt = env.ADMIN_PASSWORD || '';
  const h = await sha(ip + salt);
  return h.slice(0, 16);
}

async function isAdmin(req, env) {
  let t = (req.headers.get('authorization') || '').replace(/^Bearer /, '');
  try { t = decodeURIComponent(t); } catch {}
  if (!env.ADMIN_PASSWORD || !t) return false;
  const [a, b] = await Promise.all([sha(t), sha(env.ADMIN_PASSWORD)]);
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

// بررسی بایت‌های جادویی WebP: ۴ بایت اول RIFF و بایت‌های ۸ تا ۱۲ WEBP
function isWebP(bytes) {
  if (!bytes || bytes.length < 12) return false;
  const riff = bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46;
  const webp = bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50;
  return riff && webp;
}

let cfgCache;
async function getCfg(env, url) {
  if (cfgCache) return cfgCache;
  const res = await env.ASSETS.fetch(new URL('/data/order.json', url));
  if (!res.ok) throw new Error('order.json unavailable: ' + res.status);
  cfgCache = await res.json();
  return cfgCache;
}
const lab = (list, id) => (list.find(o => o.id === id) || {}).label || id || '—';

function newCode() {
  const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789', r = crypto.getRandomValues(new Uint8Array(6));
  return [...r].map(x => A[x % A.length]).join('');
}

// ══════════════════════════════════════════════
// مدیریت رسانه و آپلود WebP در Workers KV (نیم‌اسپیس MEDIA)
// ══════════════════════════════════════════════

function toKvKey(key) {
  return key.startsWith('img:') ? key : ('img:' + key);
}

async function uploadMedia(req, env) {
  if (!env.MEDIA) {
    return J({ error: 'نیم‌اسپیس Workers KV (با شناسه MEDIA) تنظیم نشده است.' }, 500);
  }

  let buffer;
  let originalName = '';
  const contentType = req.headers.get('content-type') || '';

  if (contentType.includes('multipart/form-data')) {
    const formData = await req.formData();
    const file = formData.get('file');
    if (!file) return J({ error: 'فایلی جهت آپلود ارسال نشده است.' }, 400);
    originalName = file.name || '';
    buffer = await file.arrayBuffer();
  } else {
    buffer = await req.arrayBuffer();
  }

  if (buffer.byteLength > MAX_IMAGE_SIZE) {
    return J({ error: 'حجم تصویر نباید بیشتر از ۳ مگابایت باشد.' }, 400);
  }
  if (buffer.byteLength < 12) {
    return J({ error: 'فایل ارسالی نامعتبر یا خالی است.' }, 400);
  }

  const bytes = new Uint8Array(buffer);
  if (!isWebP(bytes)) {
    return J({ error: 'تنها فرمت مجاز برای آپلود WebP است.' }, 400);
  }

  const hash = (await sha(buffer)).slice(0, 32);
  const key = `img:${hash}.webp`;

  const metadata = {
    size: buffer.byteLength,
    type: 'image/webp',
    name: clean(originalName, 100) || key,
    createdAt: new Date().toISOString()
  };

  await env.MEDIA.put(key, buffer, { metadata });

  return J({ ok: true, url: `/api/media/${key}`, key });
}

async function serveMedia(rawKey, env, ctx, req) {
  // اعتبارسنجی کلید پیش از دسترسی به Workers KV
  if (!/^(img:)?[a-f0-9]{32}\.webp$/.test(rawKey)) {
    return new Response('Image not found', { status: 404 });
  }

  if (!env.MEDIA) return new Response('Storage unavailable', { status: 503 });

  const kvKey = toKvKey(rawKey);
  const etag = `"${kvKey}"`;
  const ifNoneMatch = req?.headers.get('if-none-match');

  // ۱. بررسی کش لبه‌ای کلادفلر (Cache API) با کلید نرمال‌شده (بدون search params)
  const cache = typeof caches !== 'undefined' ? caches.default : null;
  let cacheKey = null;
  if (req) {
    const u = new URL(req.url);
    u.search = '';
    cacheKey = new Request(u.toString(), { method: 'GET' });
  }

  if (ifNoneMatch && (ifNoneMatch === etag || ifNoneMatch === kvKey || ifNoneMatch === '*')) {
    return new Response(null, {
      status: 304,
      headers: {
        'ETag': etag,
        'Cache-Control': 'public, max-age=31536000, immutable',
        'X-Content-Type-Options': 'nosniff'
      }
    });
  }

  if (cache && cacheKey) {
    try {
      const cached = await cache.match(cacheKey);
      if (cached) {
        const cachedEtag = cached.headers.get('etag');
        if (ifNoneMatch && cachedEtag && (ifNoneMatch === cachedEtag || ifNoneMatch === '*')) {
          return new Response(null, {
            status: 304,
            headers: {
              'ETag': cachedEtag,
              'Cache-Control': 'public, max-age=31536000, immutable',
              'X-Content-Type-Options': 'nosniff'
            }
          });
        }
        return cached;
      }
    } catch (e) {
      console.warn('Cache API match error:', e);
    }
  }

  // ۲. دریافت از Workers KV
  const buffer = await env.MEDIA.get(kvKey, 'arrayBuffer');
  if (!buffer) {
    return new Response('Image not found', { status: 404 });
  }

  const headers = new Headers();
  headers.set('Content-Type', 'image/webp');
  headers.set('Cache-Control', 'public, max-age=31536000, immutable');
  headers.set('Content-Length', String(buffer.byteLength));
  headers.set('ETag', etag);
  headers.set('X-Content-Type-Options', 'nosniff');

  const response = new Response(buffer, { headers });

  // ۳. ذخیره در Cache API به صورت نامتقارن با کلید نرمال‌شده
  if (cache && cacheKey && ctx && ctx.waitUntil) {
    ctx.waitUntil(cache.put(cacheKey, response.clone()));
  }

  return response;
}

function extractMediaKey(urlOrPath) {
  if (!urlOrPath || typeof urlOrPath !== 'string') return null;
  const match = urlOrPath.match(/(?:^|\/api\/media\/)(img:[a-zA-Z0-9_.-]+|[a-zA-Z0-9_.-]+\.webp)/);
  if (!match) return null;
  const key = match[1];
  return key.startsWith('img:') ? key : ('img:' + key);
}

async function getInUseMediaMap(env) {
  const map = new Map();
  const add = (rawKey, reason) => {
    const key = extractMediaKey(rawKey);
    if (!key) return;
    const cleanKey = key.replace(/^img:/, '');
    const current = map.get(key) || [];
    if (!current.includes(reason)) current.push(reason);
    map.set(key, current);
    map.set(cleanKey, current);
  };

  // ۱. بررسی جدول پروژه‌ها در D1
  if (env.DB) {
    try {
      const { results: projects } = await env.DB.prepare('SELECT title, cover, images FROM projects').all();
      if (projects) {
        for (const p of projects) {
          if (p.cover) add(p.cover, `پروژه «${p.title}» (کاور)`);
          let imgs = [];
          try { imgs = JSON.parse(p.images || '[]'); } catch {}
          if (Array.isArray(imgs)) {
            for (const img of imgs) {
              add(img, `پروژه «${p.title}» (گالری)`);
            }
          }
        }
      }
    } catch (e) {
      console.warn('getInUseMediaMap DB projects error:', e);
    }

    // ۲. بررسی جدول site_settings در D1
    try {
      const { results: settings } = await env.DB.prepare('SELECT key, value FROM site_settings').all();
      if (settings) {
        for (const s of settings) {
          let val = s.value;
          try { val = JSON.parse(s.value); } catch {}
          if (s.key === 'profile' && val && typeof val === 'object') {
            if (val.image) add(val.image, 'عکس پروفایل');
          }
          if (s.key === 'splash' && val && typeof val === 'object') {
            if (val.logo) add(val.logo, 'لوگوی اسپلش');
            if (val.image) add(val.image, 'تصویر اسپلش');
          }
        }
      }
    } catch (e) {
      console.warn('getInUseMediaMap DB site_settings error:', e);
    }
  }

  return map;
}

async function listMedia(req, env) {
  if (!env.MEDIA) {
    return J({ error: 'نیم‌اسپیس Workers KV تنظیم نشده است.' }, 500);
  }

  const url = new URL(req.url);
  const cursor = url.searchParams.get('cursor') || undefined;
  const limit = Math.min(100, Math.max(1, Number(url.searchParams.get('limit')) || 40));

  const listRes = await env.MEDIA.list({ prefix: 'img:', cursor, limit });
  const inUseMap = await getInUseMediaMap(env);

  const items = (listRes.keys || []).map(k => {
    const meta = k.metadata || {};
    const kvKey = k.name;
    const cleanKey = kvKey.replace(/^img:/, '');
    const usedList = inUseMap.get(kvKey) || inUseMap.get(cleanKey) || [];
    return {
      key: kvKey,
      url: `/api/media/${kvKey}`,
      name: meta.name || cleanKey,
      size: meta.size || 0,
      type: meta.type || 'image/webp',
      createdAt: meta.createdAt || null,
      in_use: usedList.length > 0,
      used_in: usedList
    };
  });

  return J({
    ok: true,
    items,
    cursor: listRes.cursor || null,
    list_complete: listRes.list_complete ?? true
  });
}

async function deleteMedia(rawKey, env, ctx, req) {
  if (!env.MEDIA) return J({ error: 'نیم‌اسپیس Workers KV تنظیم نشده است.' }, 500);

  const kvKey = toKvKey(rawKey);
  const cleanKey = rawKey.replace(/^img:/, '');

  // محافظت در برابر حذف فایلی که در پروژه‌ها یا تنظیمات سایت استفاده شده است
  const inUseMap = await getInUseMediaMap(env);
  const usedList = inUseMap.get(kvKey) || inUseMap.get(cleanKey) || [];
  if (usedList.length > 0) {
    return J({
      error: `این تصویر در حال حاضر در ${usedList.join(' و ')} استفاده شده است و حذف آن مجاز نیست.`
    }, 400);
  }

  await env.MEDIA.delete(kvKey);

  // پاکسازی از Cache API
  if (typeof caches !== 'undefined' && caches.default && req) {
    const cache = caches.default;
    const mediaUrl = new URL(`/api/media/${rawKey}`, req.url);
    mediaUrl.search = '';
    const altKey = rawKey.startsWith('img:') ? rawKey.slice(4) : ('img:' + rawKey);
    const altUrl = new URL(`/api/media/${altKey}`, req.url);
    altUrl.search = '';
    if (ctx && ctx.waitUntil) {
      ctx.waitUntil(Promise.all([
        cache.delete(new Request(mediaUrl)),
        cache.delete(new Request(altUrl))
      ]).catch(() => {}));
    }
  }

  return J({ ok: true });
}

// ══════════════════════════════════════════════
// سفارش‌ها (Orders)
// ══════════════════════════════════════════════

async function createOrder(req, env, ctx) {
  let b;
  try { b = await req.json(); } catch { return J({ error: 'درخواست نامعتبر است.' }, 400); }
  if (b.website) return J({ ok: true, code: newCode() });
  const cfg = await getCfg(env, req.url);
  const ok = (list) => new Set(list.map(o => o.id));
  const one = (v, list) => ok(list).has(v) ? v : '';
  const many = (arr, list, max) => (Array.isArray(arr) ? arr : []).filter(v => ok(list).has(v)).slice(0, max);
  const o = {
    services: many(b.services, cfg.services, 6),
    propertyType: one(b.propertyType, cfg.propertyTypes),
    propertyState: one(b.propertyState, cfg.propertyStates),
    city: clean(b.city, 60),
    area: parseNumber(b.area),
    rooms: one(b.rooms, cfg.rooms),
    styles: many(b.styles, cfg.styles, 2),
    budget: one(b.budget, cfg.budgets),
    timeline: one(b.timeline, cfg.timelines),
    notes: clean(b.notes, 1000),
    refs: clean(b.refs, 300),
    name: clean(b.name, 60),
    phone: toEn(clean(b.phone, 20)).replace(/[\s-]/g, ''),
    contactMethod: one(b.contactMethod, cfg.contactMethods),
    contactTime: one(b.contactTime, cfg.contactTimes),
    telegramId: clean(b.telegramId, 40).replace(/^@/, ''),
  };
  if (!o.services.length || !o.propertyType || !(o.area >= 5 && o.area <= 10000) || !o.styles.length || !o.budget || !o.timeline
      || o.name.length < 2 || !/^(\+98|0098|98|0)?9\d{9}$/.test(o.phone) || !o.contactMethod) {
    return J({ error: 'اطلاعات ناقص یا نامعتبر است. لطفاً فرم را بررسی کنید.' }, 400);
  }
  o.phone = '0' + o.phone.slice(-10);

  const ipHash = await clientHash(req, env);
  const { n } = await env.DB.prepare("SELECT COUNT(*) AS n FROM orders WHERE ip_hash = ? AND created_at > datetime('now','-1 hour')").bind(ipHash).first();
  if (n >= 5) return J({ error: 'تعداد درخواست‌ها زیاد است. کمی بعد دوباره تلاش کنید.' }, 429);

  let code;
  for (let i = 0; i < 4; i++) {
    code = newCode();
    try {
      await env.DB.prepare(`INSERT INTO orders (code,name,phone,contact_method,contact_time,telegram_id,services,property_type,property_state,city,area,rooms,styles,budget,timeline,notes,refs,ip_hash)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)
        .bind(code, o.name, o.phone, o.contactMethod, o.contactTime, o.telegramId, JSON.stringify(o.services), o.propertyType, o.propertyState, o.city, o.area, o.rooms, JSON.stringify(o.styles), o.budget, o.timeline, o.notes, o.refs, ipHash).run();
      break;
    } catch (e) { if (i === 3 || !String(e).includes('UNIQUE')) throw e; }
  }
  ctx.waitUntil(notify(env, cfg, o, code, new URL(req.url).origin));
  return J({ ok: true, code });
}

async function notify(env, cfg, o, code, origin) {
  if (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_CHAT_ID) return;
  const L = (list, ids) => [].concat(ids).map(i => lab(list, i)).join('، ');
  const lines = [
    `🆕 <b>سفارش جدید</b>  <code>${code}</code>`,
    `👤 ${esc(o.name)} — <code>${o.phone}</code>`,
    `📞 ${L(cfg.contactMethods, o.contactMethod)} | ${L(cfg.contactTimes, o.contactTime || 'any')}${o.telegramId ? ` | @${esc(o.telegramId)}` : ''}`,
    `🛠 ${L(cfg.services, o.services)}`,
    `🏠 ${[lab(cfg.propertyTypes, o.propertyType), o.propertyState && lab(cfg.propertyStates, o.propertyState), o.city, o.area + ' متر'].filter(Boolean).map(esc).join('، ')}`,
    `🎨 ${L(cfg.styles, o.styles)}`,
    `💰 ${lab(cfg.budgets, o.budget)} | ⏱ ${lab(cfg.timelines, o.timeline)}`,
    o.notes && `📝 ${esc(o.notes)}`,
    o.refs && `🔗 ${esc(o.refs)}`,
    `<a href="${origin}/admin/">پنل سفارش‌ها</a>`,
  ].filter(Boolean);
  try {
    await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ chat_id: env.TELEGRAM_CHAT_ID, text: lines.join('\n'), parse_mode: 'HTML', disable_web_page_preview: true }),
    });
  } catch (e) { console.error('telegram', e); }
}

async function listOrders(req, env) {
  const u = new URL(req.url), status = u.searchParams.get('status'), q = clean(u.searchParams.get('q'), 40);
  const w = [], p = [];
  if (STATUSES.includes(status)) { w.push('status = ?'); p.push(status); }
  if (q) { w.push('(name LIKE ? OR phone LIKE ? OR code LIKE ?)'); const l = `%${q}%`; p.push(l, l, l.toUpperCase()); }
  const { results } = await env.DB.prepare(`SELECT * FROM orders ${w.length ? 'WHERE ' + w.join(' AND ') : ''} ORDER BY id DESC LIMIT 300`).bind(...p).all();
  return J({ orders: results.map(r => ({ ...r, ip_hash: undefined, services: JSON.parse(r.services || '[]'), styles: JSON.parse(r.styles || '[]') })) });
}

async function updateOrder(req, env, id) {
  const b = await req.json().catch(() => ({}));
  const sets = [], p = [];
  if (b.status !== undefined) { if (!STATUSES.includes(b.status)) return J({ error: 'وضعیت نامعتبر' }, 400); sets.push('status = ?'); p.push(b.status); }
  if (b.admin_note !== undefined) { sets.push('admin_note = ?'); p.push(clean(b.admin_note, 1000)); }
  if (!sets.length) return J({ error: 'چیزی برای ذخیره نیست' }, 400);
  await env.DB.prepare(`UPDATE orders SET ${sets.join(', ')} WHERE id = ?`).bind(...p, id).run();
  return J({ ok: true });
}

// ══════════════════════════════════════════════
// پروژه‌ها و تنظیمات سایت (عمومی و ادمین)
// ══════════════════════════════════════════════

function formatProject(r) {
  let images = [];
  let facts = {};
  try { images = JSON.parse(r.images || '[]'); } catch {}
  try { facts = JSON.parse(r.facts || '{}'); } catch {}
  return {
    id: r.id,
    slug: r.slug,
    title: r.title,
    category: r.category,
    summary: r.summary || '',
    description: r.description || '',
    cover: r.cover || images[0] || '',
    images,
    facts,
    info: facts, // سازگاری کامل با تمپلیت‌های فرانت‌اند
    sort_order: r.sort_order ?? 0,
    is_active: r.is_active ?? 1,
    created_at: r.created_at,
    updated_at: r.updated_at
  };
}

async function getPublicProjects(req, env) {
  if (env.DB) {
    try {
      const { results } = await env.DB.prepare(
        'SELECT * FROM projects WHERE is_active = 1 ORDER BY sort_order ASC, id DESC'
      ).all();
      if (Array.isArray(results)) {
        return J(results.map(formatProject));
      }
    } catch (e) {
      console.warn('DB public projects fallback:', e);
    }
  }
  return env.ASSETS.fetch(new URL('/data/projects.json', req.url));
}

const DEFAULT_BUBBLES = ['محمد فهیمی', 'طراح داخلی', 'نقشه‌کش', 'از ایده تا اجرا'];

function normalizeProfile(prof) {
  if (!prof || typeof prof !== 'object') {
    return {
      name: 'محمد فهیمی',
      roles: ['طراح داخلی', 'نقشه‌کش'],
      bubbles: DEFAULT_BUBBLES,
      image: ''
    };
  }
  let bubbles = Array.isArray(prof.bubbles) ? prof.bubbles.map(b => clean(b, 60)).filter(Boolean) : [];
  for (let i = bubbles.length; i < 4; i++) {
    bubbles.push(DEFAULT_BUBBLES[i]);
  }
  bubbles = bubbles.slice(0, 4);
  const image = cleanImageUrl(prof.image) || '';
  return {
    name: clean(prof.name, 60) || 'محمد فهیمی',
    roles: Array.isArray(prof.roles) ? prof.roles.map(r => clean(r, 40)) : ['طراح داخلی', 'نقشه‌کش'],
    bubbles,
    image
  };
}

async function getPublicSite(req, env) {
  let site = {};
  try {
    site = await (await env.ASSETS.fetch(new URL('/data/site.json', req.url))).json();
  } catch {}

  if (env.DB) {
    try {
      const { results } = await env.DB.prepare('SELECT key, value FROM site_settings').all();
      if (results) {
        for (const row of results) {
          try {
            site[row.key] = JSON.parse(row.value);
          } catch {
            site[row.key] = row.value;
          }
        }
      }
    } catch (e) {
      console.warn('DB site_settings fallback:', e);
    }
  }

  site.profile = normalizeProfile(site.profile);

  return J(site);
}

async function listAdminProjects(req, env) {
  if (env.DB) {
    try {
      const { results } = await env.DB.prepare('SELECT * FROM projects ORDER BY sort_order ASC, id DESC').all();
      if (Array.isArray(results)) {
        return J({ projects: results.map(formatProject) });
      }
    } catch (e) {
      console.warn('DB admin projects fallback:', e);
    }
  }
  const fallback = await (await env.ASSETS.fetch(new URL('/data/projects.json', req.url))).json();
  return J({ projects: fallback.map((p, i) => ({ ...p, id: i + 1, sort_order: i + 1, is_active: 1 })), fallback: true });
}

async function createAdminProject(req, env) {
  if (!env.DB) return J({ error: 'دیتابیس D1 تنظیم نشده است.' }, 500);

  const b = await req.json().catch(() => ({}));
  const slug = clean(b.slug, 60).toLowerCase();
  if (!/^[a-z0-9-]+$/.test(slug)) {
    return J({ error: 'شناسه انگلیسی (slug) باید فقط شامل حروف کوچک لاتین، اعداد و خط تیره (-) باشد.' }, 400);
  }
  const title = clean(b.title, 100);
  if (!title) return J({ error: 'عنوان پروژه الزامی است.' }, 400);

  const category = clean(b.category, 60) || 'عمومی';
  const summary = clean(b.summary, 200);
  const description = clean(b.description, 2000);

  const cover = cleanImageUrl(b.cover);
  if (cover === null) {
    return J({ error: 'آدرس تصویر کاور نامعتبر است.' }, 400);
  }

  let imagesList = [];
  if (b.images !== undefined) {
    const imgCheck = cleanImages(b.images);
    if (imgCheck.error) return J({ error: imgCheck.error }, 400);
    imagesList = imgCheck.images;
  }
  const images = JSON.stringify(imagesList);

  const factsObj = cleanFacts(b.facts || b.info || {});
  const facts = JSON.stringify(factsObj);
  const sortOrder = Number(b.sort_order) || 0;
  const isActive = b.is_active !== undefined ? (b.is_active ? 1 : 0) : 1;

  try {
    const res = await env.DB.prepare(
      `INSERT INTO projects (slug, title, category, summary, description, cover, images, facts, sort_order, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(slug, title, category, summary, description, cover, images, facts, sortOrder, isActive).run();

    return J({ ok: true, id: res.meta?.last_row_id, slug });
  } catch (e) {
    if (String(e).includes('UNIQUE')) {
      return J({ error: 'این شناسه (slug) قبلاً استفاده شده است.' }, 400);
    }
    throw e;
  }
}

async function updateAdminProject(req, env, id) {
  if (!env.DB) return J({ error: 'دیتابیس D1 تنظیم نشده است.' }, 500);

  const b = await req.json().catch(() => ({}));
  const sets = [], p = [];

  if (b.slug !== undefined) {
    const slug = clean(b.slug, 60).toLowerCase();
    if (!/^[a-z0-9-]+$/.test(slug)) return J({ error: 'شناسه انگلیسی (slug) نامعتبر است.' }, 400);
    sets.push('slug = ?'); p.push(slug);
  }
  if (b.title !== undefined) {
    const title = clean(b.title, 100);
    if (!title) return J({ error: 'عنوان پروژه الزامی است.' }, 400);
    sets.push('title = ?'); p.push(title);
  }
  if (b.category !== undefined) { sets.push('category = ?'); p.push(clean(b.category, 60)); }
  if (b.summary !== undefined) { sets.push('summary = ?'); p.push(clean(b.summary, 200)); }
  if (b.description !== undefined) { sets.push('description = ?'); p.push(clean(b.description, 2000)); }
  if (b.cover !== undefined) {
    const cover = cleanImageUrl(b.cover);
    if (cover === null) return J({ error: 'آدرس تصویر کاور نامعتبر است.' }, 400);
    sets.push('cover = ?'); p.push(cover);
  }
  if (b.images !== undefined) {
    const imgCheck = cleanImages(b.images);
    if (imgCheck.error) return J({ error: imgCheck.error }, 400);
    sets.push('images = ?'); p.push(JSON.stringify(imgCheck.images));
  }
  if (b.facts !== undefined || b.info !== undefined) {
    const factsObj = cleanFacts(b.facts || b.info || {});
    sets.push('facts = ?'); p.push(JSON.stringify(factsObj));
  }
  if (b.sort_order !== undefined) { sets.push('sort_order = ?'); p.push(Number(b.sort_order) || 0); }
  if (b.is_active !== undefined) { sets.push('is_active = ?'); p.push(b.is_active ? 1 : 0); }

  if (!sets.length) return J({ error: 'چیزی برای ذخیره ارسال نشده است.' }, 400);

  sets.push("updated_at = CURRENT_TIMESTAMP");
  try {
    const res = await env.DB.prepare(`UPDATE projects SET ${sets.join(', ')} WHERE id = ?`).bind(...p, id).run();
    if (!res.meta?.changes) {
      return J({ error: 'پروژه پیدا نشد.' }, 404);
    }
    return J({ ok: true });
  } catch (e) {
    if (String(e).includes('UNIQUE')) {
      return J({ error: 'این شناسه (slug) قبلاً استفاده شده است.' }, 400);
    }
    throw e;
  }
}

async function deleteAdminProject(req, env, id) {
  if (!env.DB) return J({ error: 'دیتابیس D1 تنظیم نشده است.' }, 500);
  const res = await env.DB.prepare('DELETE FROM projects WHERE id = ?').bind(id).run();
  if (!res.meta?.changes) {
    return J({ error: 'پروژه پیدا نشد.' }, 404);
  }
  return J({ ok: true });
}

async function updateAdminSite(req, env) {
  if (!env.DB) return J({ error: 'دیتابیس D1 تنظیم نشده است.' }, 500);

  const b = await req.json().catch(() => ({}));

  const saveSetting = async (key, val) => {
    await env.DB.prepare(
      `INSERT INTO site_settings (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP`
    ).bind(key, JSON.stringify(val)).run();
  };

  if (b.profile) {
    if (typeof b.profile !== 'object') return J({ error: 'اطلاعات پروفایل نامعتبر است.' }, 400);
    if (b.profile.image !== undefined) {
      const img = cleanImageUrl(b.profile.image);
      if (img === null) return J({ error: 'آدرس تصویر پروفایل نامعتبر است.' }, 400);
    }
    const profile = normalizeProfile(b.profile);
    await saveSetting('profile', profile);
  }

  if (b.name !== undefined) {
    await saveSetting('name', clean(b.name, 100));
  }

  if (b.tagline !== undefined) {
    await saveSetting('tagline', clean(b.tagline, 200));
  }

  if (b.about !== undefined) {
    await saveSetting('about', clean(b.about, 1000));
  }

  if (b.splash !== undefined && typeof b.splash === 'object' && b.splash !== null) {
    let logo = '';
    // لوگوی اسپلش: آپلود مدیا فقط WebP است، اما مسیرهای استاتیک موجود (مانند images/logo.svg) معتبر می‌مانند
    if (b.splash.logo !== undefined) {
      const l = cleanImageUrl(b.splash.logo);
      if (l === null) return J({ error: 'آدرس لوگوی اسپلش نامعتبر است.' }, 400);
      logo = l;
    }
    let image = '';
    if (b.splash.image !== undefined) {
      const im = cleanImageUrl(b.splash.image);
      if (im === null) return J({ error: 'آدرس تصویر اسپلش نامعتبر است.' }, 400);
      image = im;
    }
    const splash = {
      logo,
      image,
      lines: Array.isArray(b.splash.lines) ? b.splash.lines.map(l => clean(l, 80)) : []
    };
    await saveSetting('splash', splash);
  }

  return J({ ok: true });
}

// ══════════════════════════════════════════════
// مسیریابی اصلی Worker
// ══════════════════════════════════════════════

export default {
  async fetch(req, env, ctx) {
    const { pathname } = new URL(req.url);
    try {
      // ۱. مسیرهای عمومی سفارش و اطلاعات
      if (pathname === '/api/order' && req.method === 'POST') return await createOrder(req, env, ctx);
      if (pathname === '/api/projects' && req.method === 'GET') return await getPublicProjects(req, env);
      if (pathname === '/api/site' && req.method === 'GET') return await getPublicSite(req, env);

      // ۲. سرو فایل‌های رسانه‌ای ذخیره‌شده در Workers KV
      const mediaMatch = pathname.match(/^\/api\/media\/(.+)$/);
      if (mediaMatch && req.method === 'GET') return await serveMedia(decodeURIComponent(mediaMatch[1]), env, ctx, req);

      // ۳. مسیرهای ادمین (نیازمند احراز هویت و مهار حملات حدس رمز)
      if (pathname.startsWith('/api/admin/')) {
        let ipHash = null;
        if (env.DB) {
          try {
            ipHash = await clientHash(req, env);
            const row = await env.DB.prepare(
              "SELECT COUNT(*) AS c FROM admin_attempts WHERE ip_hash = ? AND created_at > datetime('now', '-15 minutes')"
            ).bind(ipHash).first();
            if (row && Number(row.c) >= 10) {
              return new Response(JSON.stringify({ error: 'تعداد تلاش‌های ناموفق بیش از حد مجاز است. لطفاً ۱۵ دقیقه دیگر تلاش کنید.' }), {
                status: 429,
                headers: {
                  'content-type': 'application/json; charset=utf-8',
                  'retry-after': '900',
                  'cache-control': 'no-store',
                  'x-content-type-options': 'nosniff'
                }
              });
            }
          } catch (e) {
            console.warn('Admin rate limiter check error:', e);
          }
        }

        if (!(await isAdmin(req, env))) {
          if (env.DB && ipHash) {
            const insP = env.DB.prepare('INSERT INTO admin_attempts (ip_hash) VALUES (?)').bind(ipHash).run();
            const cleanP = env.DB.prepare("DELETE FROM admin_attempts WHERE created_at < datetime('now', '-1 day')").run();
            if (ctx && ctx.waitUntil) {
              ctx.waitUntil(Promise.all([insP, cleanP]));
            } else {
              await Promise.all([insP, cleanP]).catch(() => {});
            }
          }
          return J({ error: 'رمز اشتباه است' }, 401);
        }

        // سفارش‌ها
        if (pathname === '/api/admin/orders' && req.method === 'GET') return await listOrders(req, env);
        const orderMatch = pathname.match(/^\/api\/admin\/orders\/(\d+)$/);
        if (orderMatch && req.method === 'PATCH') return await updateOrder(req, env, Number(orderMatch[1]));

        // رسانه (لیست، آپلود و حذف)
        if (pathname === '/api/admin/media' && req.method === 'GET') return await listMedia(req, env);
        if (pathname === '/api/admin/upload' && req.method === 'POST') return await uploadMedia(req, env);
        const deleteMediaMatch = pathname.match(/^\/api\/admin\/media\/(.+)$/);
        if (deleteMediaMatch && req.method === 'DELETE') return await deleteMedia(decodeURIComponent(deleteMediaMatch[1]), env, ctx, req);

        // پروژه‌ها
        if (pathname === '/api/admin/projects' && req.method === 'GET') return await listAdminProjects(req, env);
        if (pathname === '/api/admin/projects' && req.method === 'POST') return await createAdminProject(req, env);
        const projectMatch = pathname.match(/^\/api\/admin\/projects\/(\d+)$/);
        if (projectMatch && req.method === 'PATCH') return await updateAdminProject(req, env, Number(projectMatch[1]));
        if (projectMatch && req.method === 'DELETE') return await deleteAdminProject(req, env, Number(projectMatch[1]));

        // تنظیمات سایت (پروفایل و ...)
        if (pathname === '/api/admin/site' && req.method === 'PATCH') return await updateAdminSite(req, env);
      }

      if (pathname.startsWith('/api/')) return J({ error: 'not found' }, 404);
    } catch (e) {
      console.error(e);
      return J({ error: 'خطای سرور. کمی بعد دوباره تلاش کنید.' }, 500);
    }

    return env.ASSETS.fetch(req);
  },
};
