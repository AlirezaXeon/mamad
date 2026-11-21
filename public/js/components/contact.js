import { h } from '../utils.js';
import { openLightbox } from './lightbox.js';

// نوار پایین: «ثبت سفارش» + «تعرفه» (عکس در لایتباکس) + «ارتباط با ما»
export function contactBar(url, tariff) {
  const t = tariff && tariff.image ? tariff : null;
  document.getElementById('contact').replaceChildren(
    h('a', { class: 'contact-btn primary cta-order', href: '#/order' },
      'ثبت سفارش', h('span', { class: 'cta-arrow', 'aria-hidden': 'true' }, '←')),
    t && h('button', {
      class: 'contact-btn', type: 'button',
      onclick: () => openLightbox([t.image], 0, t.title || 'تعرفه ۱۴۰۵')
    }, 'تعرفه'),
    url && h('a', { class: 'contact-btn', href: url }, 'ارتباط با ما'));
}
