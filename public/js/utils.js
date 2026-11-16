export const app = document.getElementById('app');

// تبدیل هر نوع رقم فارسی/عربی به انگلیسی در کل سایت
export const toEn = s => String(s ?? '')
  .replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d))
  .replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d))
  .replace(/[٫،]/g, '.');

// خروجی اعداد همیشه به انگلیسی
export const fa = n => toEn(n);

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

export const num = s => parseFloat(toEn(s)) || 0;

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
