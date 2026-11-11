import { route, start } from './router.js';
import { load } from './store.js';
import { h, app } from './utils.js';
import { home } from './views/home.js';
import { project } from './views/project.js';
import { order } from './views/order.js';
import { splash } from './components/splash.js';
import { contactBar } from './components/contact.js';

try {
  const { site } = await load();
  splash(site.splash, site.name);
  document.getElementById('top').replaceChildren(h('a', { href: '#/' }, site.name));
  contactBar(site.contactUrl);
  route(/^\/$/, home);
  route(/^\/p\/([^/]+)$/, project);
  route(/^\/order$/, order);
  start();
} catch (e) {
  document.getElementById('splash')?.remove();
  app.textContent = 'بارگذاری سایت انجام نشد. صفحه را دوباره باز کنید.';
  console.error(e);
}
