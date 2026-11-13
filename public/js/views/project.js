import { h, app } from '../utils.js';
import { load } from '../store.js';
import { openLightbox } from '../components/lightbox.js';

export async function project(slug) {
  const { projects } = await load();
  const i = projects.findIndex(p => p.slug === slug);
  if (i < 0) { location.hash = '/'; return; }
  const p = projects[i], next = projects[(i + 1) % projects.length];
  document.title = p.title + ' | پروژه';
  app.replaceChildren(h('article', { class: 'view' },
    h('a', { class: 'back', href: '#/' }, '← بازگشت به پروژه‌ها'),
    h('p', { class: 'eyebrow', 'data-reveal': '' }, (p.category || 'پروژه') + '  /  SELECTED WORK'),
    h('h1', { 'data-reveal': '' }, p.title),
    h('dl', { class: 'facts', 'data-reveal': '' }, Object.entries(p.info || {}).map(([k, v]) => h('div', {}, h('dt', {}, k), h('dd', {}, v)))),
    p.description && h('p', { class: 'desc', 'data-reveal': '' }, p.description),
    h('div', { class: 'gallery' }, p.images.map((src, n) =>
      h('button', { class: 'shot', type: 'button', 'aria-label': 'نمایش تصویر ' + (n + 1), onclick: () => openLightbox(p.images, n, p.title) },
        h('img', { src, alt: p.title + ' - تصویر ' + (n + 1), loading: n ? 'lazy' : 'eager', decoding: 'async' })))),
    next.slug !== p.slug && h('a', { class: 'next', href: '#/p/' + next.slug }, h('span', {}, 'پروژه بعدی'), h('b', {}, next.title))
  ));
  const nodes = app.querySelectorAll('[data-reveal], .shot');
  if (!('IntersectionObserver' in window) || matchMedia('(prefers-reduced-motion: reduce)').matches) {
    nodes.forEach(el => el.classList.add('in'));
  } else {
    const io = new IntersectionObserver((entries, observer) => entries.forEach(entry => {
      if (entry.isIntersecting) { entry.target.classList.add('in'); observer.unobserve(entry.target); }
    }), { threshold: .12, rootMargin: '0px 0px -6% 0px' });
    nodes.forEach(el => io.observe(el));
  }
}