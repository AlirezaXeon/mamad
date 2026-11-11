// Worker: API سفارش‌ها + نمایش فایل‌های ثابت (public/)
// پیش‌نیاز: دیتابیس D1 (binding: DB) و سکرت‌های ADMIN_PASSWORD ، TELEGRAM_BOT_TOKEN ، TELEGRAM_CHAT_ID

const STATUSES = ['new', 'review', 'contacted', 'contract', 'archived'];
const J = (data, status = 200) => new Response(JSON.stringify(data), {
  status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
});
const toEn = s => String(s ?? '').replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d)).replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)).replace(/[٫،]/g, '.');
const clean = (s, n) => String(s ?? '').replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, n);
const esc = s => String(s ?? '').replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));

async function sha(s) {
  const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join('');
}
async function isAdmin(req, env) {
  let t = (req.headers.get('authorization') || '').replace(/^Bearer /, '');
  try { t = decodeURIComponent(t); } catch {}                  // رمز با encodeURIComponent می‌آید تا حروف غیرلاتین هم کار کند
  if (!env.ADMIN_PASSWORD || !t) return false;
  const [a, b] = await Promise.all([sha(t), sha(env.ADMIN_PASSWORD)]);
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

// گزینه‌های مجاز از همان data/order.json خوانده می‌شود (تنها منبع حقیقت)
let cfgCache;
async function getCfg(env, url) {
  if (!cfgCache) cfgCache = await (await env.ASSETS.fetch(new URL('/data/order.json', url))).json();
  return cfgCache;
}
const lab = (list, id) => (list.find(o => o.id === id) || {}).label || id || '—';

function newCode() {
  const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789', r = crypto.getRandomValues(new Uint8Array(6));
  return [...r].map(x => A[x % A.length]).join('');
}

async function createOrder(req, env, ctx) {
  let b;
  try { b = await req.json(); } catch { return J({ error: 'درخواست نامعتبر است.' }, 400); }
  if (b.website) return J({ ok: true, code: newCode() });                // honeypot: ربات‌ها موفقیت ساختگی می‌بینند
  const cfg = await getCfg(env, req.url);
  const ok = (list) => new Set(list.map(o => o.id));
  const one = (v, list) => ok(list).has(v) ? v : '';
  const many = (arr, list, max) => (Array.isArray(arr) ? arr : []).filter(v => ok(list).has(v)).slice(0, max);
  const o = {
    services: many(b.services, cfg.services, 6),
    propertyType: one(b.propertyType, cfg.propertyTypes),
    propertyState: one(b.propertyState, cfg.propertyStates),
    city: clean(b.city, 60),
    area: Number(toEn(b.area)),
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

  const ipHash = (await sha((req.headers.get('cf-connecting-ip') || 'x') + (env.ADMIN_PASSWORD || ''))).slice(0, 16);
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

// اطلاع‌رسانی به تلگرام (اختیاری؛ اگر توکن تنظیم نشده باشد رد می‌شود)
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

export default {
  async fetch(req, env, ctx) {
    const { pathname } = new URL(req.url);
    try {
      if (pathname === '/api/order' && req.method === 'POST') return await createOrder(req, env, ctx);
      if (pathname.startsWith('/api/admin/')) {
        if (!(await isAdmin(req, env))) return J({ error: 'رمز اشتباه است' }, 401);
        if (pathname === '/api/admin/orders' && req.method === 'GET') return await listOrders(req, env);
        const m = pathname.match(/^\/api\/admin\/orders\/(\d+)$/);
        if (m && req.method === 'PATCH') return await updateOrder(req, env, Number(m[1]));
      }
      if (pathname.startsWith('/api/')) return J({ error: 'not found' }, 404);
    } catch (e) {
      console.error(e);
      return J({ error: 'خطای سرور. کمی بعد دوباره تلاش کنید.' }, 500);
    }
    return env.ASSETS.fetch(req);
  },
};
