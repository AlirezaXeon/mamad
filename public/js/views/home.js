import { h, app } from '../utils.js';
import { load } from '../store.js';
import { initReveals, initParallax, initFadeScroll } from '../components/scroll-animator.js';

const card = p => h('a', { class: 'card', href: '#/p/' + p.slug, 'data-reveal': 'scale' },
  h('div', { class: 'pic' },
    h('img', { src: p.cover || p.images[0], alt: p.title, loading: 'lazy', decoding: 'async' })),
  h('div', { class: 'tb' },
    h('div', { class: 'tb-main' },
      h('h2', {}, p.title),
      h('p', {}, p.summary || p.category))));

export async function home() {
  const { site, projects } = await load();
  document.title = site.name + ' | معماری و طراحی داخلی';
  const featured = projects[0];

  const heroCopy = h('div', { class: 'hero-copy', 'data-reveal': '' },
    h('p', { class: 'eyebrow' }, 'ARCHITECTURE  /  INTERIOR DESIGN'),
    h('h1', {}, site.tagline),
    h('p', { class: 'hero-desc' }, site.about),
    h('div', { class: 'hero-actions' },
      h('a', {
        class: 'action action-primary',
        href: '#projects',
        onclick: e => {
          e.preventDefault();
          document.getElementById('projects')?.scrollIntoView({ behavior: 'smooth' });
        }
      }, 'مشاهده پروژه‌ها')));

  const hero = h('section', { class: 'hero' },
    h('img', {
      class: 'hero-bg',
      src: featured.cover || featured.images[0],
      alt: '',
      fetchpriority: 'high',
      decoding: 'async',
      'data-parallax': '',
      'data-parallax-speed': '0.28'
    }),
    h('div', { class: 'hero-overlay' }),
    heroCopy,
    h('div', { class: 'scroll-indicator' }, h('span', {})));

  const principles = h('div', { class: 'principles', 'data-reveal': 'stagger' },
    h('span', {}, 'از ایده تا فضا'),
    h('span', {}, 'جزئیات با معنا'),
    h('span', {}, 'سادگی ماندگار'));

  const heading = h('div', { class: 'section-heading', 'data-reveal': '' },
    h('div', {},
      h('p', { class: 'eyebrow' }, 'PORTFOLIO  /  2024—2026'),
      h('h2', {}, 'پروژه‌ها')),
    h('p', { class: 'section-note' }, 'نگاهی نزدیک به فضاهایی که با دقت طراحی شده‌اند.'));

  const list = h('div', { class: 'grid', id: 'project-grid' });
  const cats = ['همه', ...new Set(projects.map(p => p.category).filter(Boolean))];
  const chips = h('div', { class: 'chips', 'aria-label': 'فیلتر پروژه‌ها' }, cats.map(c =>
    h('button', { class: 'chip', type: 'button', 'aria-pressed': c === 'همه', onclick: e => {
      chips.querySelectorAll('.chip').forEach(b => b.setAttribute('aria-pressed', String(b === e.currentTarget)));
      draw(c);
    } }, c)));

  function draw(category) {
    list.replaceChildren(...projects.filter(p => category === 'همه' || p.category === category).map(card));
    initReveals(list);
  }

  const statement = h('section', { class: 'studio-statement', 'data-reveal': '' },
    h('p', { class: 'eyebrow' }, 'THE STUDIO'),
    h('p', { class: 'statement-text' }, 'طراحی خوب، فقط دیده نمی‌شود؛ در آن زندگی جریان پیدا می‌کند.'),
    h('a', { href: '#/order', class: 'statement-link' }, 'درباره پروژه‌تان صحبت کنیم  ↗'));

  app.replaceChildren(hero, principles, h('section', { class: 'projects-section', id: 'projects' }, heading, chips, list), statement);
  draw('همه');
  initReveals(app);
  initParallax();
  initFadeScroll(heroCopy);
}
