export const app = document.getElementById('app');

// تبدیل هر نوع رقم فارسی/عربی به انگلیسی در کل سایت
export const toEn = s => String(s ?? '')
  .replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d))
  .replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d));

// خروجی اعداد همیشه به انگلیسی
export const en = n => toEn(n);
export const fa = en; // نام مستعار برای سازگاری عقب‌رو

// ساخت المان: h('a', {href:'#/'}, 'متن', [children])
export const h = (tag, attrs = {}, ...kids) => {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') e.className = v;
    else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else if (v !== false && v != null) e.setAttribute(k, v);
  }
  e.append(...kids.flat().filter(x => x != null && x !== false));
  return e;
};

// پارس اعداد با حذف جداکننده‌های هزارگان و تبدیل ممیز اعشاری
export const parseNumber = s => {
  const clean = toEn(s)
    .replace(/[،,٬]/g, '')
    .replace(/٫/g, '.');
  const n = parseFloat(clean);
  return Number.isFinite(n) ? n : 0;
};

export const num = parseNumber;

// نسخه کوچک (۱۰۸۰px) تصاویر آپلودی در KV؛ برای تصاویر استاتیک و خارجی همان آدرس برمی‌گردد
const KV_IMG = /^\/api\/media\/img:[a-f0-9]{32}\.webp$/;
export const small = u => KV_IMG.test(u || '') ? u.replace('/api/media/img:', '/api/media/imgs:') : u;
export const imgSet = u => KV_IMG.test(u || '') ? { srcset: `${small(u)} 1080w, ${u} 1800w` } : {};

// کپی متن با fallback برای مرورگرهای درون‌برنامه‌ای (WebView، اینستاگرام، تلگرام)
export async function copyText(text) {
  const str = String(text ?? '');
  if (!str) return false;
  if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
    try {
      await navigator.clipboard.writeText(str);
      return true;
    } catch {}
  }
  try {
    const ta = document.createElement('textarea');
    ta.value = str;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    ta.style.pointerEvents = 'none';
    ta.style.left = '-9999px';
    document.body.appendChild(ta);
    ta.select();
    ta.setSelectionRange(0, str.length);
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}
