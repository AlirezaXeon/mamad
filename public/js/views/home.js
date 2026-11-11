import { h, app } from '../utils.js';
import { load } from '../store.js';

const card = p => h('a', { class: 'card', href: `#/p/${p.slug}` },
  h('img', { src: p.cover || p.images[0], alt: p.title, loading: 'lazy', decoding: 'async' }),
  h('div', { class: 'info' }, h('h2', {}, p.title), h('p', {}, p.summary)));

export async function home() {
  const { site, projects } = await load();
  document.title = site.name;
  const list = h('div', { class: 'grid' });
  // نمایش تدریجی کارت‌ها هنگام اسکرول؛ کارت‌هایی که هم‌زمان وارد می‌شوند با فاصله کوتاه ظاهر می‌شوند
  const io = 'IntersectionObserver' in window ? new IntersectionObserver((entries, o) => {
    entries.filter(e => e.isIntersecting).forEach((e, i) => {
      e.target.style.transitionDelay = `${i * 80}ms`;
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
