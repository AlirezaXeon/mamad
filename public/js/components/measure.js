import { h, fa, num } from '../utils.js';

// ماشین‌حساب متراژ: طول × عرض چند فضا، جمع خودکار
export function measureTool(onUse) {
  const rows = h('div', { class: 'm-rows' });
  const total = h('output', { class: 'm-total' }, fa(0));
  const sum = () => [...rows.children].reduce((t, r) => {
    const [a, b] = [...r.querySelectorAll('input')].map(i => num(i.value));
    return t + a * b;
  }, 0);
  const calc = () => { total.textContent = fa(Math.round(sum() * 10) / 10); };
  const inp = ph => h('input', { class: 'in', inputmode: 'decimal', placeholder: ph, 'aria-label': ph, oninput: calc });
  const add = () => {
    const r = h('div', { class: 'm-row' }, inp('طول (متر)'), h('span', {}, '×'), inp('عرض (متر)'),
      h('button', { class: 'help', type: 'button', 'aria-label': 'حذف', onclick: () => { r.remove(); calc(); } }, '×'));
    rows.append(r);
  };
  add(); add();
  return h('div', { class: 'measure' },
    h('h3', {}, 'ماشین‌حساب متراژ'),
    h('p', { class: 'hint' }, 'طول و عرض هر فضا را وارد کنید؛ جمع خودکار حساب می‌شود.'),
    rows,
    h('button', { class: 'btn', type: 'button', onclick: add }, '+ افزودن فضای دیگر'),
    h('p', { class: 'm-sum' }, h('span', {}, 'جمع:'), total, h('span', {}, 'متر مربع')),
    h('button', { class: 'btn primary', type: 'button', onclick: () => { const t = Math.round(sum()); if (t > 0) onUse(t); } }, 'استفاده از این عدد'));
}
