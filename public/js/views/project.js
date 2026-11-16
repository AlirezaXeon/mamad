import { h, app, toEn } from '../utils.js';
import { load } from '../store.js';
import { openLightbox } from '../components/lightbox.js';
import { initReveals, initParallax, initFadeScroll } from '../components/scroll-animator.js';

export async function project(slug) {
  const { projects } = await load();
  const i = projects.findIndex(p => p.slug === slug);
  if (i < 0) { location.hash = '/'; return; }
  const p = projects[i], next = projects[(i + 1) % projects.length];
  document.title = p.title + ' | پروژه';

  const backBtn = h('a', { class: 'back-fixed', href: '#/', 'aria-label': 'بازگشت' });
  backBtn.innerHTML = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 19l-7-7 7-7"/></svg>';

  const openHeroLightbox = e => {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    openLightbox(p.images, 0, p.title, p.slug);
  };

  app.replaceChildren(h('article', { class: 'view' },
    h('section', {
      class: 'project-hero project-hero-clickable',
      role: 'button',
      tabindex: '0',
      'aria-label': 'مشاهده تمام‌صفحه تصویر شاخص ' + p.title,
      onclick: openHeroLightbox,
      onkeydown: e => {
        if (e.key === 'Enter' || e.key === ' ') openHeroLightbox(e);
      }
    },
      h('img', { class: 'project-hero-img', src: p.images[0], alt: p.title, fetchpriority: 'high', decoding: 'async', 'data-parallax': '', 'data-parallax-speed': '0.3' }),
      h('div', { class: 'project-hero-overlay' }),
      h('div', { class: 'project-hero-content' },
        h('p', { class: 'eyebrow' }, (p.category || 'پروژه') + '  /  SELECTED WORK'),
        h('h1', {}, p.title))),
    backBtn,
    h('a', { class: 'back', href: '#/' }, '← بازگشت به پروژه‌ها'),
    h('dl', { class: 'facts', 'data-reveal': 'stagger' },
      Object.entries(p.info || {}).map(([k, v]) => h('div', {}, h('dt', {}, k), h('dd', {}, toEn(v))))),
    p.description && h('p', { class: 'desc', 'data-reveal': '' }, p.description),
    h('div', { class: 'gallery' }, p.images.map((src, n) =>
      h('button', { class: 'shot', type: 'button', 'data-reveal': 'scale', 'aria-label': 'نمایش تصویر ' + (n + 1), onclick: () => openLightbox(p.images, n, p.title, p.slug) },
        h('img', { src, alt: p.title + ' - تصویر ' + (n + 1), loading: n ? 'lazy' : 'eager', decoding: 'async' })))),
    next.slug !== p.slug && h('a', { class: 'next-project', href: '#/p/' + next.slug },
      h('img', { class: 'next-project-img', src: next.cover || next.images[0], alt: next.title, loading: 'lazy', decoding: 'async' }),
      h('div', { class: 'next-project-overlay' }),
      h('div', { class: 'next-project-content' },
        h('span', {}, 'پروژه بعدی'),
        h('b', {}, next.title)))
  ));

  initReveals(app);
  initParallax();
  const heroContent = app.querySelector('.project-hero-content');
  if (heroContent) initFadeScroll(heroContent);
}
