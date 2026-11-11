import { h } from '../utils.js';

// پنجره پایین‌آمده (bottom sheet) روی موبایل و وسط‌صفحه روی دسکتاپ، بر پایه <dialog>
export function openModal({ title, content, onclose }) {
  const dlg = h('dialog', { class: 'modal', 'aria-label': title },
    h('div', { class: 'modal-body' },
      h('div', { class: 'modal-head' }, h('h2', {}, title),
        h('button', { class: 'x', type: 'button', 'aria-label': 'بستن', onclick: () => dlg.close() }, '×')),
      h('div', { class: 'modal-content' }, content)));
  dlg.addEventListener('click', e => { if (e.target === dlg) dlg.close(); });   // لمس پس‌زمینه
  dlg.addEventListener('close', () => {
    dlg.remove();
    if (!document.querySelector('dialog.modal[open]')) document.body.classList.remove('lock');
    onclose?.();
  });
  document.body.append(dlg);
  document.body.classList.add('lock');
  dlg.showModal();
  return dlg;
}
