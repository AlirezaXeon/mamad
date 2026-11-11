import { h } from '../utils.js';

// گروه گزینه‌ها: variant = 'pill' | 'cards'
// multi: چندانتخابی | max: حداکثر انتخاب | exclusive: گزینه‌ای که با بقیه جمع نمی‌شود | optional: انتخاب تک‌گزینه‌ای قابل لغو
export function choices({ options, value, multi = false, max = 0, exclusive = '', optional = false, variant = 'pill', render, onchange }) {
  const sel = new Set(multi ? value : value ? [value] : []);
  const root = h('div', { class: `choices ${variant}`, role: 'group' });
  const paint = () => root.querySelectorAll('.opt').forEach(b => {
    const on = sel.has(b.dataset.id);
    b.classList.toggle('on', on);
    b.setAttribute('aria-pressed', String(on));
  });
  const pick = id => {
    if (multi) {
      if (sel.has(id)) sel.delete(id);
      else {
        if (id === exclusive) sel.clear(); else sel.delete(exclusive);
        if (max && sel.size >= max) sel.delete(sel.values().next().value);
        sel.add(id);
      }
    } else if (sel.has(id) && optional) sel.clear();
    else { sel.clear(); sel.add(id); }
    paint();
    onchange(multi ? [...sel] : [...sel][0] || '');
  };
  options.forEach(o => root.append(h('button', { type: 'button', class: 'opt', 'data-id': o.id, onclick: () => pick(o.id) }, render ? render(o) : o.label)));
  paint();
  return root;
}
