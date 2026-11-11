import { h, fa } from '../utils.js';
const box = document.getElementById('lightbox');

export function openLightbox(imgs, start = 0, title = '') {
  const track = h('div', { class: 'lb-track' }, imgs.map((s, i) =>
    h('div', { class: 'lb-slide' }, h('img', { src: s, alt: `${title} ${fa(i + 1)}`, decoding: 'async' }))));
  const count = h('span');
  const upd = () => { count.textContent = `${fa(Math.round(Math.abs(track.scrollLeft) / track.clientWidth) + 1)} / ${fa(imgs.length)}`; };
  const step = d => track.scrollBy({ left: d * track.clientWidth, behavior: 'smooth' });
  // در حالت راست‌به‌چپ، «بعدی» یعنی حرکت به چپ
  const key = e => { if (e.key === 'Escape') history.back(); if (e.key === 'ArrowLeft') step(-1); if (e.key === 'ArrowRight') step(1); };
  const hide = () => {
    box.hidden = true; box.replaceChildren();
    document.body.classList.remove('lock');
    removeEventListener('keydown', key); removeEventListener('popstate', hide);
  };
  box.replaceChildren(
    h('div', { class: 'lb-top' }, count, h('button', { class: 'lb-close', type: 'button', onclick: () => history.back() }, 'بستن')),
    track
  );
  box.hidden = false;
  document.body.classList.add('lock');
  history.pushState({ lb: 1 }, '');          // دکمه برگشت گوشی فقط گالری را می‌بندد
  addEventListener('popstate', hide); addEventListener('keydown', key);
  track.addEventListener('scroll', upd, { passive: true });
  track.children[start].scrollIntoView({ inline: 'center', block: 'nearest' });
  upd();
}
