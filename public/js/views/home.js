import { h, app } from '../utils.js';
import { load } from '../store.js';

// هر کارت یک شیت است: رندر، خط اندازه (متراژ)، جدول مشخصات (کد شیت و مقیاس)
// فیلدهای اختیاری در projects.json: sheet, scale, plan
const card = p => {
  const area = p.info && p.info['متراژ'];
  return h('a', { class: 'card', href: `#/p/${p.slug}` },
    h('div', { class: 'pic' },
      h('img', { src: p.cover || p.images[0], alt: p.title, loading: 'lazy', decoding: 'async' }),
      p.plan && h('img', { class: 'plan', src: p.plan, alt: '', loading: 'lazy', decoding: 'async' })),
    area && h('div', { class: 'dim', 'aria-hidden': 'true' }, h('span', {}, area)),
    h('div', { class: 'tb' },
      h('div', { class: 'tb-main' }, h('h2', {}, p.title), h('p', {}, p.summary)),
      (p.sheet || p.scale) && h('dl', { class: 'tb-meta' },
        p.sheet && h('div', {}, h('dt', {}, 'شیت'), h('dd', {}, p.sheet)),
        p.scale && h('div', {}, h('dt', {}, 'مقیاس'), h('dd', {}, p.scale)))));
};

export async function home() {
  const { site, projects } = await load();
  document.title = site.name;
  const list = h('div', { class: 'grid' });
  // کارت‌هایی که هم‌زمان وارد صفحه می‌شوند با فاصله کوتاه کشیده می‌شوند (متغیر --d در cards.css)
  const io = 'IntersectionObserver' in window ? new IntersectionObserver((entries, o) => {
    entries.filter(e => e.isIntersecting).forEach((e, i) => {
      e.target.style.setProperty('--d', `${i * 90}ms`);
      e.target.classList.add('in');
      o.unobserve(e.target);
    });
  }, { threshold: .1, rootMargin: '0px 0px -6% 0px' }) : null;
  const draw = c => {
    list.replaceChildren(...projects.filter(p => c === 'همه' || p.category === c).map(card));
    [...list.children].forEach(el => io ? io.observe(el) : el.classList.add('in'));
  };
  const cats = ['همه', ...new Set(projects.map(p => p.category))];
  const chips = h('div', { class: 'chips' }, cats.map(c =>
    h('button', { class: 'chip', type: 'button', 'aria-pressed': c === 'همه', onclick: e => {
      chips.querySelectorAll('.chip').forEach(b => b.setAttribute('aria-pressed', b === e.currentTarget));
      draw(c);
    } }, c)));
  app.replaceChildren(h('section', { class: 'intro' }, h('h1', {}, site.tagline), h('p', {}, site.about)), chips, list);
  draw('همه');
}
