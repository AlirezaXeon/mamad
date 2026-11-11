import { h } from '../utils.js';
const el = document.getElementById('splash');

// cfg: { logo, image, lines[] } — اگر image پر باشد عکس خود فرد (دایره‌ای) به‌جای لوگو نمایش داده می‌شود
export function splash(cfg = {}, name = '') {
  if (document.documentElement.classList.contains('no-splash')) { el.remove(); return; }
  const lines = cfg.lines || [], src = cfg.image || cfg.logo;
  el.replaceChildren(h('div', {},
    src && h('img', { class: 'sp-logo' + (cfg.image ? ' sp-photo' : ''), src, alt: '' }),
    h('span', { class: 'sp-rule' }),
    h('p', { class: 'sp-name' }, name),
    lines.map((t, i) => h('p', { class: 'sp-text', style: `--i:${i}` }, t))));
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hold = reduce ? 500 : 1900 + lines.length * 400;
  const hide = () => {
    if (el.classList.contains('out')) return;
    el.classList.add('out');
    setTimeout(() => el.remove(), 900);
  };
  Promise.all([new Promise(r => setTimeout(r, hold)), document.fonts.ready]).then(hide);
  el.addEventListener('click', hide);        // با لمس صفحه می‌شود رد کرد
  try { sessionStorage.setItem('splash', '1'); } catch {}  // فقط یک‌بار در هر نشست
}
