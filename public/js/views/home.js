import { h, app, small, imgSet } from '../utils.js';
import { load } from '../store.js';
import { initReveals } from '../components/scroll-animator.js';
import { typeLines } from '../components/typewriter.js';

const CARD_SIZES = '(min-width:1024px) 600px, (min-width:640px) 50vw, calc(100vw - 40px)';

const card = (p, i) => {
  const images = (p.images && p.images.length) ? p.images : (p.cover ? [p.cover] : []);

  const pic = h('div', { class: 'pic' },
    h('img', { src: small(p.cover || images[0]), ...imgSet(p.cover || images[0]), sizes: CARD_SIZES, alt: p.title, loading: i === 0 ? 'eager' : 'lazy', decoding: 'async' }),
    p.category && h('span', { class: 'badge' }, p.category),
    h('div', { class: 'tb' },
      h('div', { class: 'tb-main' },
        h('h2', {}, p.title),
        h('p', {}, p.summary || p.category))));

  return h('a', { class: 'card', href: '#/p/' + p.slug, 'data-reveal': 'scale' }, pic);
};

export async function home() {
  const { site, projects } = await load();
  document.title = site.name + ' | معماری و طراحی داخلی';

  const profile = site.profile || {};
  const profileName = profile.name || 'محمد فهیمی';
  const roles = (Array.isArray(profile.roles) ? profile.roles : []).filter(Boolean);
  if (!roles.length) roles.push('طراح داخلی', 'نقشه‌کش');

  // حروف اول نام جهت نمایش در صورت نبودن تصویر
  const initials = profileName
    .split(/\s+/)
    .filter(Boolean)
    .map(p => p[0])
    .slice(0, 2)
    .join('‌') || 'م‌ف';

  const avatarImg = profile.image
    ? h('img', {
        class: 'intro-img',
        src: profile.image,
        alt: profileName,
        width: '380',
        height: '475',
        fetchpriority: 'high',
        decoding: 'async',
        onerror: e => {
          e.currentTarget.style.display = 'none';
          const fb = e.currentTarget.nextElementSibling;
          if (fb) fb.style.display = 'flex';
        }
      })
    : null;

  const avatarFallback = h('div', {
    class: 'intro-fb',
    style: profile.image ? 'display:none;' : 'display:flex;',
    'aria-label': profileName
  }, initials);

const hero = h('section', { class: 'intro' },
  h('div', { class: 'intro-in' },
    h('div', { class: 'intro-photo' },
      h('div', { class: 'intro-arch' }, avatarImg, avatarFallback)),
    h('div', { class: 'intro-body' },
      h('h1', { class: 'intro-name' }, profileName),
      h('ul', { class: 'intro-roles' }, roles.map(r => h('li', {}, r))),
      h('p', { class: 'intro-lead' }, site.tagline || 'طراحی داخلی؛ از ایده تا اجرا'),
      site.about && h('p', { class: 'hero-desc intro-desc' }, site.about))));

  const principlesData = [
    { num: '01', title: 'از ایده تا فضا', desc: 'خلق فضاهای معمارانه با هویت مستقل و روایت اختصاصی' },
    { num: '02', title: 'جزئیات با معنا', desc: 'دقت در گزینش متریال ماندگار، بازی نور و تناسبات دقیق' },
    { num: '03', title: 'سادگی ماندگار', desc: 'پرهیز از حواشی زائد و تمرکز بر خلوص، آرامش و کارایی' }
  ];

  const principles = h('section', { class: 'principles-section' },
    h('div', { class: 'principles', 'data-reveal': 'stagger' },
      principlesData.map(item => h('div', { class: 'pr-card' },
        h('span', { class: 'pr-num' }, item.num),
        h('h3', { class: 'pr-title' }, item.title),
        h('p', { class: 'pr-desc' }, item.desc)))));

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

  const projectsSection = h('section', { class: 'projects-section', id: 'projects' }, heading, chips, list);

  const statement = h('section', { class: 'studio-statement', 'data-reveal': '' },
    h('p', { class: 'eyebrow' }, 'THE STUDIO'),
    h('p', { class: 'statement-text' }, 'طراحی خوب، فقط دیده نمی‌شود؛ در آن زندگی جریان پیدا می‌کند.'),
    h('a', { href: '#/order', class: 'statement-link' }, 'درباره پروژه‌تان صحبت کنیم  ↗'));

  app.replaceChildren(hero, projectsSection, principles, statement);
  draw('همه');
  initReveals(app);

  typeLines([
    hero.querySelector('.intro-lead'),
    hero.querySelector('.intro-desc')
  ]);
}
