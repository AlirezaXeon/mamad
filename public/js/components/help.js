import { h, fa } from '../utils.js';
import { openModal } from './modal.js';
import { measureTool } from './measure.js';

// دکمه «؟» که راهنما را در پنجره پایین‌آمده باز می‌کند (برای متراژ، ماشین‌حساب هم دارد)
export function helpButton(help, { onUse } = {}) {
  if (!help) return null;
  return h('button', { class: 'help', type: 'button', 'aria-label': 'راهنما: ' + help.title, onclick: () => {
    let dlg;
    const content = h('div', {},
      (help.body || []).map(t => h('p', { class: 'lead' }, t)),
      help.steps && h('ol', { class: 'guide' }, help.steps.map((t, i) => h('li', {}, h('b', {}, fa(i + 1)), h('span', {}, t)))),
      help.note && h('p', { class: 'hint' }, help.note),
      help.tool === 'measure' && measureTool(v => { onUse?.(v); dlg.close(); }));
    dlg = openModal({ title: help.title, content });
  } }, '؟');
}
