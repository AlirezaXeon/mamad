import { route, start } from './router.js';
import { load } from './store.js';
import { h, app } from './utils.js';
import { home } from './views/home.js';
import { project } from './views/project.js';
import { order } from './views/order.js';
import { splash } from './components/splash.js';
import { contactBar } from './components/contact.js';
import { initDynamicBg } from './components/dynamic-bg.js';
import { initProtection } from './components/protection.js';

// فعال‌سازی محافظت از کپی و جلوگیری از زوم ناخواسته سایت
initProtection();

// top-level await در iOS قدیمی‌تر از ۱۵ و مرورگرهای قدیمی خطای سینتکس می‌دهد؛
// پس همه‌چیز داخل یک تابع async اجرا می‌شود.
(async () => {
  try {
    const { site } = await load();
    splash(site.splash, site.name);
    initDynamicBg();
    document.getElementById('top').replaceChildren(h('a', { href: '#/' }, site.name));
    contactBar(site.contactUrl, site.tariff);
    route(/^\/$/, home);
    route(/^\/p\/([^/]+)$/, project);
    route(/^\/order$/, order);
    start();
  } catch (e) {
    document.getElementById('splash')?.remove();
    app.textContent = 'بارگذاری سایت انجام نشد. صفحه را دوباره باز کنید.';
    console.error(e);
  }
})();
