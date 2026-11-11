import { h, app } from '../utils.js';
import { load } from '../store.js';
import { openLightbox } from '../components/lightbox.js';

export async function project(slug) {
  const { projects } = await load();
  const i = projects.findIndex(p => p.slug === slug);
  if (i < 0) { location.hash = '/'; return; }
  const p = projects[i], next = projects[(i + 1) % projects.length];
  document.title = p.title;
  app.replaceChildren(h('article', { class: 'view' },
    h('a', { class: 'back', href: '#/' }, 'بازگشت به نمونه‌کارها'),
    h('h1', {}, p.title),
    h('dl', { class: 'facts' }, Object.entries(p.info || {}).map(([k, v]) => h('div', {}, h('dt', {}, k), h('dd', {}, v)))),
    p.description && h('p', { class: 'desc' }, p.description),
    h('div', { class: 'gallery' }, p.images.map((src, n) =>
      h('button', { class: 'shot', type: 'button', 'aria-label': `نمایش تصویر ${n + 1}`, onclick: () => openLightbox(p.images, n, p.title) },
        h('img', { src, alt: p.title, loading: n ? 'lazy' : 'eager', decoding: 'async' })))),
    next.slug !== p.slug && h('a', { class: 'next', href: `#/p/${next.slug}` }, h('span', {}, 'پروژه بعدی'), h('b', {}, next.title))
  ));
}
