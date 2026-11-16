import { cleanup } from './components/scroll-animator.js';

const routes = [], scrolls = {};
let y = 0, current = null;
addEventListener('scroll', () => { y = scrollY; }, { passive: true });
export const route = (re, fn) => routes.push([re, fn]);

async function go() {
  const hash = location.hash;
  if (hash === '#projects' || hash === '#/projects') {
    const el = document.getElementById('projects');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
      return;
    }
    if (current !== null) scrolls[current] = y;
    const homeRoute = routes.find(([re]) => re.test('/'));
    if (homeRoute) {
      current = '/';
      cleanup();
      await homeRoute[1]();
      requestAnimationFrame(() => {
        document.getElementById('projects')?.scrollIntoView({ behavior: 'smooth' });
      });
      return;
    }
  }
  if (current !== null) scrolls[current] = y;
  const path = hash.slice(1) || '/';
  document.body.classList.toggle('in-order', path.startsWith('/order'));

  for (const [re, fn] of routes) {
    const m = path.match(re);
    if (m) {
      current = path;
      cleanup();
      await fn(...m.slice(1).map(decodeURIComponent));
      scrollTo(0, scrolls[path] || 0);
      return;
    }
  }
  location.hash = '/';
}

export const start = () => { addEventListener('hashchange', go); return go(); };
