import { h, app } from '../utils.js';
import { load } from '../store.js';

const card = p => {
  const meta = [p.sheet && ['شیت', p.sheet], p.scale && ['مقیاس', p.scale]].filter(Boolean);
  return h('a', { class: 'card', href: '#/p/' + p.slug },
    h('div', { class: 'pic' },
      h('img', { src: p.cover || p.images[0], alt: p.title, loading: 'lazy', decoding: 'async' }),
      p.plan && h('img', { class: 'plan', src: p.plan, alt: '', loading: 'lazy', decoding: 'async' })),
    h('div', { class: 'tb' },
      h('div', { class: 'tb-main' }, h('h2', {}, p.title), h('p', {}, p.summary || p.category)),
      meta.length && h('dl', { class: 'tb-meta' }, meta.map(([k, v]) => h('div', {}, h('dt', {}, k), h('dd', {}, v))))));
};

function reveal(root) {
  const nodes = root.querySelectorAll('[data-reveal], .card');
  if (!('IntersectionObserver' in window) || matchMedia('(prefers-reduced-motion: reduce)').matches) {
    nodes.forEach(el => el.classList.add('in'));
    return;
  }
  const io = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('in');
      observer.unobserve(entry.target);
    });
  }, { threshold: .12, rootMargin: '0px 0px -7% 0px' });
  nodes.forEach((el, i) => {
    if (el.classList.contains('card')) el.style.setProperty('--d', (i % 3) * 70 + 'ms');
    io.observe(el);
  });
}

export async function home() {
  const { site, projects } = await load();
  document.title = site.name + ' | معماری و طراحی داخلی';
  const featured = projects[0];
  const hero = h('section', { class: 'hero' },
    h('div', { class: 'hero-copy', 'data-reveal': '' },
      h('p', { class: 'eyebrow' }, 'معماری  /  طراحی داخلی  /  اجرا'),
      h('h1', {}, site.tagline),
      h('p', { class: 'hero-desc' }, site.about),
      h('div', { class: 'hero-actions' },
        h('a', { class: 'action action-primary', href: '#projects' }, 'مشاهده پروژه‌ها'),
        h('a', { class: 'action action-text', href: '#/order' }, 'شروع یک پروژه جدید  ↗'))),
    featured && h('a', { class: 'hero-visual', href: '#/p/' + featured.slug, 'aria-label': 'مشاهده ' + featured.title, 'data-reveal': '' },
      h('img', { src: featured.cover || featured.images[0], alt: featured.title, fetchpriority: 'high', decoding: 'async' }),
      h('span', { class: 'hero-index' }, '01 / ' + String(projects.length).padStart(2, '0')),
      h('span', { class: 'hero-caption' }, h('span', {}, 'پروژه منتخب'), h('b', {}, featured.title))));
  const note = h('div', { class: 'principles', 'data-reveal': '' },
    h('span', {}, 'از ایده تا فضا'),
    h('span', {}, 'جزئیات با معنا'),
    h('span', {}, 'سادگی ماندگار'));
  const heading = h('div', { class: 'section-heading', 'data-reveal': '' },
    h('div', {}, h('p', { class: 'eyebrow' }, 'PORTFOLIO  /  ۱۴۰۳—۱۴۰۴'), h('h2', {}, 'پروژه‌های منتخب')),
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
    reveal(list);
  }
  const statement = h('section', { class: 'studio-statement', 'data-reveal': '' },
    h('p', { class: 'eyebrow' }, 'THE STUDIO'),
    h('p', { class: 'statement-text' }, 'طراحی خوب، فقط دیده نمی‌شود؛ در آن زندگی جریان پیدا می‌کند.'),
    h('a', { href: '#/order', class: 'statement-link' }, 'درباره پروژه‌تان صحبت کنیم  ↗'));
  app.replaceChildren(hero, note, h('section', { class: 'projects-section', id: 'projects' }, heading, chips, list), statement);
  draw('همه');
  reveal(app);
}