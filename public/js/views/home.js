import { h, app, small, imgSet } from '../utils.js';
import { load } from '../store.js';
import { openLightbox } from '../components/lightbox.js';
import { initReveals } from '../components/scroll-animator.js';
import { attachCloud } from '../components/cloud.js';

const CARD_SIZES = '(min-width:1024px) 600px, (min-width:640px) 50vw, calc(100vw - 40px)';

const card = (p, i) => {
  const images = (p.images && p.images.length) ? p.images : (p.cover ? [p.cover] : []);

  const openGallery = e => {
    e.preventDefault();
    e.stopPropagation();
    openLightbox(images, 0, p.title, p.slug);
  };

  const pic = h('div', {
    class: 'pic',
    role: 'button',
    tabindex: '0',
    'aria-label': 'مشاهده تمام‌صفحه تصویر ' + p.title,
    onclick: openGallery,
    onkeydown: e => {
      if (e.key === 'Enter' || e.key === ' ') openGallery(e);
    }
  },
    // عنصر LCP صفحه آواتار است؛ کارت اول فقط eager است و نباید با آن سر پهنای باند رقابت کند
    h('img', { src: small(p.cover || images[0]), ...imgSet(p.cover || images[0]), sizes: CARD_SIZES, alt: p.title, loading: i === 0 ? 'eager' : 'lazy', decoding: 'async' }),
    p.category && h('span', { class: 'badge' }, p.category),
    h('span', { class: 'pic-zoom-hint', 'aria-hidden': 'true' })
  );
  pic.querySelector('.pic-zoom-hint').innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>';

  return h('a', { class: 'card', href: '#/p/' + p.slug, 'data-reveal': 'scale' },
    pic,
    h('div', { class: 'tb' },
      h('div', { class: 'tb-main' },
        h('h2', {}, p.title),
        h('p', {}, p.summary || p.category))));
};

export async function home() {
  const { site, projects } = await load();
  document.title = site.name + ' | معماری و طراحی داخلی';

  const profile = site.profile || {};
  const profileName = profile.name || 'محمد فهیمی';
  const DEFAULT_BUBBLES = ['محمد فهیمی', 'طراح داخلی', 'نقشه‌کش', 'از ایده تا اجرا'];
  let profileBubbles = Array.isArray(profile.bubbles) ? profile.bubbles.filter(Boolean) : [];
  for (let i = profileBubbles.length; i < 4; i++) {
    profileBubbles.push(DEFAULT_BUBBLES[i]);
  }
  profileBubbles = profileBubbles.slice(0, 4);

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
        width: '280',
        height: '280',
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

  // ساخت حباب ابر ۳۶۰ درجه ارگانیک با برآمدگی‌های کامل دور تا دور و دنباله تفکر
  const createCloudBubble = (text, idx) => {
    const ns = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('class', 'hero-cloud-svg');
    svg.setAttribute('aria-hidden', 'true');
    const path = document.createElementNS(ns, 'path');
    svg.appendChild(path);

    const cloud = h('div', { class: 'hero-cloud' },
      svg,
      h('span', { class: 'hero-cloud-text' }, text)
    );
    attachCloud(cloud, svg, path, idx); // مسیر ابر بر اساس اندازه واقعی حباب رسم می‌شود

    return h('div', { class: `hero-bubble-wrapper hero-bubble-w${idx + 1}` },
      cloud,
      h('div', { class: 'hero-connector', 'aria-hidden': 'true' },
        h('span', { class: 'dot dot-1' }),
        h('span', { class: 'dot dot-2' }),
        h('span', { class: 'dot dot-3' })
      )
    );
  };

  const bubbleEls = profileBubbles.map((txt, i) => createCloudBubble(txt, i));

  const avatarCluster = h('div', { class: 'hero-avatar-cluster' },
    h('div', { class: 'hero-avatar-ring' },
      avatarImg,
      avatarFallback
    ),
    ...bubbleEls
  );

  const heroCopy = h('div', { class: 'hero-copy' },
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

  if (typeof IntersectionObserver !== 'undefined') {
    const heroObserver = new IntersectionObserver(([entry]) => {
      hero.classList.toggle('hero-paused', !entry.isIntersecting);
    }, { threshold: 0.05 });
    heroObserver.observe(hero);
  }
}
