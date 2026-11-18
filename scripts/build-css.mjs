// الحاق فایل‌های CSS سایت اصلی در یک فایل (کاهش ۱۱ درخواست بلاک‌کننده به ۱)
// ترتیب باید با ترتیب قبلی لینک‌ها در index.html یکی باشد.
import { readFileSync, writeFileSync } from 'node:fs';

const files = ['tokens', 'base', 'background', 'cards', 'project', 'lightbox', 'contact', 'modal', 'order', 'splash', 'editorial'];
const css = files.map(f => `/* ${f}.css */\n` + readFileSync(`public/css/${f}.css`, 'utf8')).join('\n');
writeFileSync('public/css/app.css', css);
console.log(`app.css: ${(css.length / 1024).toFixed(1)} KB`);
