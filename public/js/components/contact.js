import { h } from '../utils.js';
import { openLightbox } from './lightbox.js';

// نوار پایین: «تعرفه» (سمت راست) + «ثبت سفارش» (وسط) + «ارتباط با ما» (سمت چپ)
export function contactBar(url, tariff) {
  const t = tariff && tariff.image ? tariff : null;
  const tariffBtn = t ? h('button', {
    class: 'contact-btn', type: 'button',
    // persistZoom: عکس تعرفه باید با زوم ماندگار قابل خواندن باشد (نه زوم فنری)
    onclick: () => openLightbox([t.image], 0, t.title || 'تعرفه ۱۴۰۵', '', { persistZoom: true })
  }, 'تعرفه') : null;

  const orderBtn = h('a', { class: 'contact-btn primary cta-order', href: '#/order' },
    'ثبت سفارش', h('span', { class: 'cta-arrow', 'aria-hidden': 'true' }, '←'));

  const contactBtn = url ? h('a', { class: 'contact-btn', href: url }, 'ارتباط با ما') : null;

  document.getElementById('contact').replaceChildren(
    ...[tariffBtn, orderBtn, contactBtn].filter(Boolean)
  );
}
