const routes = [], scrolls = {};
let y = 0, current = null;
addEventListener('scroll', () => { y = scrollY; }, { passive: true });
export const route = (re, fn) => routes.push([re, fn]);
async function go() {
  if (current !== null) scrolls[current] = y;
  const path = location.hash.slice(1) || '/';
  document.body.classList.toggle('in-order', path.startsWith('/order'));
  for (const [re, fn] of routes) {
    const m = path.match(re);
    if (m) {
      current = path;
      await fn(...m.slice(1).map(decodeURIComponent));
      scrollTo(0, scrolls[path] || 0);
      return;
    }
  }
  location.hash = '/';
}
export const start = () => { addEventListener('hashchange', go); return go(); };
