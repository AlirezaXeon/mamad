import { h } from '../utils.js';
// نوار پایین: «ثبت سفارش» (داخل همین سایت) + «ارتباط با ما» (صفحه contact/ طبق contactUrl در site.json)
export function contactBar(url) {
  document.getElementById('contact').replaceChildren(
    h('a', { class: 'contact-btn primary', href: '#/order' }, 'ثبت سفارش'),
    url && h('a', { class: 'contact-btn', href: url }, 'ارتباط با ما'));
}
