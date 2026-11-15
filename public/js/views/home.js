import { h, app } from '../utils.js';
import { load } from '../store.js';
import { initReveals, initFadeScroll } from '../components/scroll-animator.js';

const card = p => h('a', { class: 'card', href: '#/p/' + p.slug, 'data-reveal': 'scale' },
  h('div', { class: 'pic' },
    h('img', { src: p.cover || p.images[0], alt: p.title, loading: 'lazy', decoding: 'async' }),
    p.category && h('span', { class: 'badge' }, p.category)),
  h('div', { class: 'tb' },
    h('div', { class: 'tb-main' },
      h('h2', {}, p.title),
      h('p', {}, p.summary || p.category))));

export async function home() {
  const { site, projects } = await load();
  document.title = site.name + ' | معماری و طراحی داخلی';

  const profile = site.profile || {};
  const profileName = profile.name || 'محمد فهیمی';
  const profileBubbles = Array.isArray(profile.bubbles) && profile.bubbles.length >= 2
    ? profile.bubbles
    : ['محمد فهیمی', 'طراح داخلی و نقشه‌کش'];

  // حروف اول نام جهت نمایش در صورت عدم بارگذاری تصویر
  const initials = profileName
    .split(/\s+/)
    .filter(Boolean)
    .map(p => p[0])
    .slice(0, 2)
    .join('‌') || 'م‌ف';

  const avatarImg = profile.image
    ? h('img', {
        class: 'hero-avatar-img',
        src: profile.image,
        alt: profileName,
        width: '164',
        height: '164',
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
    class: 'hero-avatar-fallback',
    style: profile.image ? 'display:none;' : 'display:flex;',
    'aria-label': profileName
  }, initials);

  const bubble1 = h('div', { class: 'hero-bubble hero-bubble-1' },
    h('span', { class: 'hero-bubble-text' }, profileBubbles[0]));

  const bubble2 = h('div', { class: 'hero-bubble hero-bubble-2' },
    h('span', { class: 'hero-bubble-text' }, profileBubbles[1]));

  const avatarCluster = h('div', { class: 'hero-avatar-cluster', 'data-reveal': '' },
    h('div', { class: 'hero-avatar-ring' },
      avatarImg,
      avatarFallback
    ),
    bubble1,
    bubble2
  );

  const heroCopy = h('div', { class: 'hero-copy', 'data-reveal': '' },
    h('p', { class: 'eyebrow' }, 'ARCHITECTURE  /  INTERIOR DESIGN'),
    h('h1', {}, 'طراحی داخلی؛ از ', h('em', {}, 'ایده'), ' تا اجرا'),
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
    h('div', { class: 'hero-container' },
      avatarCluster,
      heroCopy
    )
  );

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
  initFadeScroll(heroCopy);
}
