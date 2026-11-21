import { h } from '../utils.js';
import { svg } from './icons.js';

// مرتب‌سازی الفبای فارسی (مستقل از locale مرورگر): آ، ا، ب، پ، ت ...
const ABC = 'آابپتثجچحخدذرزژسشصضطظعغفقکگلمنوهی';
const key = s => String(s ?? '').replace(/ي/g, 'ی').replace(/ك/g, 'ک').replace(/[\u200c\s]/g, '');
const rank = c => { const i = ABC.indexOf(c); return i < 0 ? 99 : i; };
const faCmp = (a, b) => {
  const x = key(a), y = key(b);
  for (let i = 0; i < Math.min(x.length, y.length); i++) {
    const d = rank(x[i]) - rank(y[i]);
    if (d) return d;
  }
  return x.length - y.length;
};

// منوی کشویی قابل جستجو: pinned بالای لیست، بقیه الفبایی
export function dropdown({ pinned = [], items = [], value = '', placeholder = 'انتخاب کنید', searchPlaceholder = 'جستجو…', label = '', onchange }) {
  const rest = [...new Set(items)].filter(c => !pinned.includes(c)).sort(faCmp);
  const all = [...pinned, ...rest];
  const uid = 'dd' + Math.random().toString(36).slice(2, 8);
  let cur = value, opts = [], act = -1;

  const text = h('span', { class: 'dd-text' });
  const btn = h('button', {
    class: 'in dd-btn', type: 'button', 'aria-haspopup': 'listbox', 'aria-expanded': 'false', 'aria-controls': uid, 'aria-label': label || null,
    onclick: () => (panel.hidden ? show() : hide())
  }, text, svg('<svg class="dd-ico" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>'));
  const search = h('input', { class: 'in dd-search', type: 'search', placeholder: searchPlaceholder, autocomplete: 'off', 'aria-label': searchPlaceholder, oninput: () => paint() });
  const list = h('ul', { class: 'dd-list', id: uid, role: 'listbox' });
  const panel = h('div', { class: 'dd-panel', hidden: '' }, search, list);
  const root = h('div', { class: 'dd' }, btn, panel);

  const setText = () => { text.textContent = cur || placeholder; text.classList.toggle('ph', !cur); };

  const reveal = el => {
    const t = el.offsetTop, b = t + el.offsetHeight;
    if (t < list.scrollTop) list.scrollTop = t;
    else if (b > list.scrollTop + list.clientHeight) list.scrollTop = b - list.clientHeight;
  };
  const mark = () => {
    opts.forEach((o, i) => o.classList.toggle('act', i === act));
    if (opts[act]) reveal(opts[act]);
  };
  const move = d => { act = Math.max(0, Math.min(opts.length - 1, act + d)); mark(); };

  const pick = v => { cur = v; setText(); hide(); btn.focus(); onchange?.(cur); };

  function paint() {
    const q = key(search.value).toLowerCase();
    const found = q ? all.filter(c => key(c).toLowerCase().includes(q)) : all;
    list.replaceChildren();
    opts = [];
    const add = (v, t = v, cls = '') => {
      const li = h('li', { class: 'dd-opt' + (v === cur ? ' on' : '') + cls, role: 'option', 'aria-selected': String(v === cur), onclick: () => pick(v) }, t);
      opts.push(li);
      list.append(li);
    };
    found.forEach((c, i) => {
      add(c);
      if (!q && i === pinned.length - 1 && rest.length) list.append(h('li', { class: 'dd-sep', role: 'presentation' }));
    });
    const typed = search.value.trim().slice(0, 60);
    if (typed && !all.some(c => key(c).toLowerCase() === q)) add(typed, `استفاده از «${typed}»`, ' dd-custom');
    act = q ? 0 : opts.findIndex(o => o.classList.contains('on'));
    mark();
  }

  const outside = e => { if (!root.contains(e.target)) hide(); };

  function show() {
    panel.hidden = false;
    btn.setAttribute('aria-expanded', 'true');
    search.value = '';
    paint();
    document.addEventListener('pointerdown', outside, true);
    root.scrollIntoView({ block: 'start', behavior: 'smooth' });
    // روی موبایل کیبورد خودکار باز نشود تا لیست پوشانده نشود
    if (matchMedia('(pointer:fine)').matches) search.focus({ preventScroll: true });
  }
  function hide() {
    panel.hidden = true;
    btn.setAttribute('aria-expanded', 'false');
    document.removeEventListener('pointerdown', outside, true);
  }

  root.addEventListener('keydown', e => {
    if (panel.hidden) {
      if (e.key === 'ArrowDown' && e.target === btn) { e.preventDefault(); show(); }
      return;
    }
    if (e.key === 'Escape') { e.preventDefault(); hide(); btn.focus(); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); move(1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); move(-1); }
    else if (e.key === 'Enter' && e.target === search && opts[act]) { e.preventDefault(); opts[act].click(); }
  });

  setText();
  return root;
}
