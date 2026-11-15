const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
let rafId = null;
let scrollHandler = null;
let dirty = false;
let lastY = -1;

export function initDynamicBg() {
  const container = document.getElementById('dynamic-bg');
  if (!container) return;
  const orbs = Array.from({ length: 3 }, () => {
    const d = document.createElement('div');
    d.className = 'orb';
    container.appendChild(d);
    return d;
  });
  if (reduced) return;
  dirty = true;
  const tick = () => {
    if (dirty) {
      const sy = window.scrollY;
      if (sy !== lastY) {
        lastY = sy;
        orbs[0].style.transform = 'translateY(' + (sy * 0.06) + 'px)';
        orbs[1].style.transform = 'translateY(' + (sy * -0.04) + 'px) translateX(' + (Math.sin(sy * 0.002) * 20) + 'px)';
        orbs[2].style.transform = 'translateY(' + (sy * 0.03) + 'px)';
      }
      dirty = false;
    }
    rafId = requestAnimationFrame(tick);
  };
  rafId = requestAnimationFrame(tick);
  scrollHandler = () => { dirty = true; };
  window.addEventListener('scroll', scrollHandler, { passive: true });
}

export function cleanupBg() {
  if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
  if (scrollHandler) { window.removeEventListener('scroll', scrollHandler); scrollHandler = null; }
  lastY = -1;
}
