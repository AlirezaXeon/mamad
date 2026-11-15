const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
let observers = [];
let rafId = null;
let scrollDirty = false;
let parallaxEls = [];
let scrollHandler = null;
let fadeHandlers = [];

export function initReveals(root) {
  const nodes = root.querySelectorAll('[data-reveal], .card, .shot');
  if (reduced) {
    nodes.forEach(el => el.classList.add('in'));
    return;
  }
  const io = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      if (el.dataset.reveal === 'stagger') {
        [...el.children].forEach((c, i) => c.style.setProperty('--d', (i * 70) + 'ms'));
      }
      el.classList.add('in');
      observer.unobserve(el);
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -6% 0px' });

  nodes.forEach((el, i) => {
    if (el.classList.contains('card')) {
      el.style.setProperty('--d', (i % 3) * 80 + 'ms');
    }
    io.observe(el);
  });
  observers.push(io);
}

export function initParallax() {
  if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
  if (scrollHandler) { window.removeEventListener('scroll', scrollHandler); scrollHandler = null; }

  parallaxEls = [...document.querySelectorAll('[data-parallax]')];
  if (reduced || !parallaxEls.length) return;

  scrollDirty = true;
  const tick = () => {
    if (scrollDirty) {
      const sy = window.scrollY;
      parallaxEls.forEach(el => {
        const speed = parseFloat(el.dataset.parallaxSpeed || '0.25');
        const parentTop = el.parentElement ? (el.parentElement.offsetTop || 0) : 0;
        const relativeY = sy - parentTop;
        const offset = Math.max(-120, Math.min(120, relativeY * speed));
        el.style.transform = `translate3d(0, ${offset.toFixed(1)}px, 0)`;
      });
      scrollDirty = false;
    }
    rafId = requestAnimationFrame(tick);
  };
  rafId = requestAnimationFrame(tick);
  scrollHandler = () => { scrollDirty = true; };
  window.addEventListener('scroll', scrollHandler, { passive: true });
}

export function initFadeScroll(element) {
  if (reduced || !element) return;
  element.style.willChange = 'opacity, transform';
  const fn = () => {
    const sy = window.scrollY;
    const threshold = Math.max(element.offsetHeight * 1.2, 220);
    const ratio = Math.min(sy / threshold, 1);
    element.style.opacity = Math.max(0, (1 - ratio * 1.3)).toFixed(2);
    element.style.transform = `translate3d(0, -${(ratio * 32).toFixed(1)}px, 0)`;
  };
  window.addEventListener('scroll', fn, { passive: true });
  fadeHandlers.push(fn);
  fn();
}

export function cleanup() {
  observers.forEach(io => io.disconnect());
  observers = [];
  if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
  if (scrollHandler) { window.removeEventListener('scroll', scrollHandler); scrollHandler = null; }
  fadeHandlers.forEach(fn => window.removeEventListener('scroll', fn));
  fadeHandlers = [];
  parallaxEls = [];
}
