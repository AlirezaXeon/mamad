const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
let timers = [];

// متنها پشت سر هم تایپ میشن؛ متن کامل از اول توی DOM هست (برای دسترسپذیری و جلوگیری از پرش چیدمان)
export function typeLines(els, { speed = 38, startDelay = 500, gap = 250 } = {}) {
  cancelTyping();
  const items = els.filter(Boolean);
  if (reduced) return;

  const texts = items.map(el => el.textContent);
  items.forEach(el => {
    el.setAttribute('aria-label', el.textContent);
    el.textContent = '';
    el.classList.add('typing');
  });

  let i = 0;
  const run = () => {
    if (i >= items.length) return;
    const el = items[i], full = [...texts[i]];   // [...] برای حفظ درست حروف فارسی/اموجی
    let n = 0;
    el.classList.add('caret');
    const tick = () => {
      el.textContent = full.slice(0, ++n).join('');
      if (n < full.length) timers.push(setTimeout(tick, speed));
      else {
        el.classList.remove('caret');
        i++;
        timers.push(setTimeout(run, gap));
      }
    };
    tick();
  };
  timers.push(setTimeout(run, startDelay));
}

export function cancelTyping() {
  timers.forEach(clearTimeout);
  timers = [];
}
