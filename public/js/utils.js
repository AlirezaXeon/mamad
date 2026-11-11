export const app = document.getElementById('app');
export const fa = n => String(n).replace(/\d/g, d => '۰۱۲۳۴۵۶۷۸۹'[d]);
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
// تبدیل ارقام فارسی/عربی به انگلیسی و خواندن عدد
export const toEn = s => String(s ?? '')
  .replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d))
  .replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d))
  .replace(/[٫،]/g, '.');
export const num = s => parseFloat(toEn(s)) || 0;
