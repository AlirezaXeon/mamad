import { h, en } from '../utils.js';

const box = document.getElementById('lightbox');

/**
 * پاپ‌آپ گالری تمام‌صفحه.
 * opts.persistZoom = false (پیش‌فرض): زوم فنری؛ با برداشتن انگشتان تصویر به حالت عادی برمی‌گردد (گالری پروژه‌ها).
 * opts.persistZoom = true: زوم ماندگار با پن، دابل‌تپ و چرخ ماوس (مثلاً عکس تعرفه که باید خوانده شود).
 */
export function openLightbox(imgs, start = 0, title = '', projectSlug = '', opts = {}) {
  if (!imgs || !imgs.length) return;

  const persist = Boolean(opts.persistZoom);
  const total = imgs.length;
  let currentIndex = Math.max(0, Math.min(start, total - 1));

  // عنوان پروژه
  const titleEl = h('h3', { class: 'lb-title' }, title || 'گالری پروژه');

  // شمارنده تصاویر به فارسی
  const countEl = h('span', { class: 'lb-count' }, `${en(currentIndex + 1)} / ${en(total)}`);

  // لینک مشاهده صفحه پروژه (در صورت باز شدن از صفحه اصلی)
  const isProjectPage = window.location.hash.startsWith('#/p/');
  let navigating = false;
  const projectLinkEl = (projectSlug && !isProjectPage)
    ? h('a', {
        class: 'lb-project-link',
        href: `#/p/${projectSlug}`,
        onclick: e => {
          e.preventDefault();
          if (navigating) return;
          navigating = true;
          window.addEventListener('popstate', () => {
            location.hash = `#/p/${projectSlug}`;
          }, { once: true });
          history.back();
        }
      }, 'مشاهده جزئیات پروژه ↗')
    : null;

  // دکمه بستن
  const closeBtn = h('button', {
    class: 'lb-close',
    type: 'button',
    'aria-label': 'بستن پاپ‌آپ',
    onclick: () => history.back()
  }, '✕ بستن');

  const topBar = h('div', { class: 'lb-top' },
    h('div', { class: 'lb-title-group' }, titleEl, total > 1 ? countEl : null),
    h('div', { class: 'lb-actions' }, projectLinkEl, closeBtn)
  );

  // اسلایدر و تصاویر
  const track = h('div', { class: 'lb-track' });

  imgs.forEach((src, idx) => {
    const img = h('img', {
      src,
      alt: `${title || 'پروژه'} - تصویر ${en(idx + 1)}`,
      decoding: 'async',
      loading: Math.abs(idx - currentIndex) <= 1 ? 'eager' : 'lazy'
    });

    // اتصال موتور زوم به تک‌تک تصاویر
    if (persist) attachPersistentZoom(img, track, () => history.back());
    else attachSpringBackPinchZoom(img, track, () => history.back());

    const slide = h('div', { class: 'lb-slide' }, img);
    track.appendChild(slide);
  });

  // راهنمای زوم با دو انگشت برای کاربران موبایل
  const hint = h('div', { class: 'lb-hint' },
    persist ? 'با دو انگشت زوم کنید؛ دوبار لمس هم بزرگ‌نمایی می‌کند' : 'با دو انگشت زوم کنید');
  setTimeout(() => {
    hint.classList.add('hide');
  }, persist ? 3800 : 2600);

  // دکمه‌های چپ و راست (در دسکتاپ و تبلت)
  // فرض محیط راست‌به‌چپ (RTL): اسلایدها از راست به چپ چیده شده‌اند.
  // تصویر بعدی در سمت چپ (left: -1) و تصویر قبلی در سمت راست (left: +1) قرار دارد.
  const prevBtn = h('button', {
    class: 'lb-nav-btn lb-prev',
    type: 'button',
    'aria-label': 'تصویر قبلی',
    onclick: () => step(1) // در RTL حرکت به سمت راست به تصویر قبلی می‌رود
  });
  prevBtn.innerHTML = '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg>';

  const nextBtn = h('button', {
    class: 'lb-nav-btn lb-next',
    type: 'button',
    'aria-label': 'تصویر بعدی',
    onclick: () => step(-1) // در RTL حرکت به سمت چپ به تصویر بعدی می‌رود
  });
  nextBtn.innerHTML = '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>';

  // به‌روزرسانی شمارنده صفحه با در نظر گرفتن رفتار RTL
  // در مرورگرهای منطبق با استاندارد (Chrome, Firefox, Safari)، scrollLeft در حالت RTL مقداری منفی یا صفر است؛
  // لذا از Math.abs(scrollLeft) برای محاسبه دقیق شاخص اسلاید جاری استفاده می‌شود.
  const updateCounter = () => {
    const w = track.clientWidth || 1;
    const idx = Math.round(Math.abs(track.scrollLeft) / w);
    currentIndex = Math.max(0, Math.min(idx, total - 1));
    countEl.textContent = `${en(currentIndex + 1)} / ${en(total)}`;
  };

  const step = dir => {
    track.scrollBy({ left: dir * track.clientWidth, behavior: 'smooth' });
  };

  const onKey = e => {
    if (e.key === 'Escape') history.back();
    if (e.key === 'ArrowLeft') step(-1); // در RTL کلید جهت‌نمای چپ به اسلاید بعدی می‌رود
    if (e.key === 'ArrowRight') step(1); // در RTL کلید جهت‌نمای راست به اسلاید قبلی می‌رود
  };

  let closed = false;
  const hide = () => {
    if (closed) return;
    closed = true;
    box.hidden = true;
    box.replaceChildren();
    document.body.classList.remove('lock');
    window.removeEventListener('keydown', onKey);
    window.removeEventListener('popstate', hide);
  };

  box.replaceChildren(topBar, track, ...(total > 1 ? [prevBtn, nextBtn] : []), hint);
  box.hidden = false;
  document.body.classList.add('lock');

  // ذخیره وضعیت در تاریخچه تا دکمه Back مرورگر پاپ‌آپ را ببندد
  history.pushState({ lb: 1 }, '');
  window.addEventListener('popstate', hide);
  window.addEventListener('keydown', onKey);

  track.addEventListener('scroll', updateCounter, { passive: true });

  // اسکرول به اسلاید آغازین
  requestAnimationFrame(() => {
    if (track.children[currentIndex]) {
      track.children[currentIndex].scrollIntoView({ inline: 'center', block: 'nearest' });
      updateCounter();
    }
  });
}

/**
 * زوم فنری دو انگشتی (Spring-Back Pinch to Zoom)
 * تصویر هنگام زوم تا ۴.۵ برابر بزرگ می‌شود و با رها کردن انگشتان با انیمیشن فنری به حالت ۱x برمی‌گردد.
 * همچنین کشیدن تصویر به سمت پایین پاپ‌آپ را می‌بندد.
 *
 * نکته: img در CSS باید touch-action: pan-x داشته باشد تا سوایپ افقی به اسکرول اسلایدر برسد
 * (با touch-action: none ورق‌زدن روی عکس غیرفعال می‌شد). پینچ و کشیدن به پایین با JS و preventDefault مدیریت می‌شوند.
 */
function attachSpringBackPinchZoom(img, track, onClose) {
  let isPinching = false;
  let isPullingDown = false;
  let startDist = 0;
  let startMidX = 0;
  let startMidY = 0;
  let currentScale = 1;
  let currentX = 0;
  let currentY = 0;

  let singleStartY = 0;
  let singleStartX = 0;
  let lastTap = 0;
  let tapMoved = false; // اگر انگشت حرکت کرده، لمس «تپ» حساب نمی‌شود (جلوگیری از دابل‌تپ اشتباهی بعد از دو سوایپ پشت‌سرهم)

  // بازگرداندن فنری تصویر به اندازه عادی (Spring-back)
  const springBack = () => {
    img.style.transition = 'transform 0.38s cubic-bezier(0.16, 1, 0.3, 1)';
    img.style.transform = 'translate3d(0, 0, 0) scale(1)';
    currentScale = 1;
    currentX = 0;
    currentY = 0;
    isPinching = false;
    isPullingDown = false;

    setTimeout(() => {
      img.style.transition = '';
      img.style.transform = '';
      img.style.zIndex = '';
      track.style.overflow = '';
      track.style.scrollSnapType = '';
    }, 390);
  };

  img.addEventListener('touchstart', e => {
    // زوم با دو انگشت
    if (e.touches.length === 2) {
      isPinching = true;
      isPullingDown = false;
      tapMoved = true;
      track.style.overflow = 'hidden';
      track.style.scrollSnapType = 'none';

      const t1 = e.touches[0];
      const t2 = e.touches[1];
      startDist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
      startMidX = (t1.clientX + t2.clientX) / 2;
      startMidY = (t1.clientY + t2.clientY) / 2;
      img.style.transition = 'none';
      img.style.zIndex = '30';
      return;
    }

    // لمس با یک انگشت (برای درگ عمودی بستن و تشخیص تپ)
    if (e.touches.length === 1) {
      singleStartY = e.touches[0].clientY;
      singleStartX = e.touches[0].clientX;
      isPullingDown = false;
      tapMoved = false;
    }
  }, { passive: false });

  img.addEventListener('touchmove', e => {
    // رفتار زوم دو انگشتی
    if (isPinching && e.touches.length === 2) {
      if (e.cancelable) e.preventDefault();
      e.stopPropagation();

      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
      const ratio = dist / (startDist || 1);

      // بزرگ‌نمایی تا حداکثر ۴.۵ برابر
      currentScale = Math.max(1, Math.min(ratio, 4.5));

      const midX = (t1.clientX + t2.clientX) / 2;
      const midY = (t1.clientY + t2.clientY) / 2;
      currentX = (midX - startMidX) * 0.85;
      currentY = (midY - startMidY) * 0.85;

      img.style.transform = `translate3d(${currentX.toFixed(1)}px, ${currentY.toFixed(1)}px, 0) scale(${currentScale.toFixed(3)})`;
      return;
    }

    if (isPinching || e.touches.length !== 1) return;

    const dX = e.touches[0].clientX - singleStartX;
    const dY = e.touches[0].clientY - singleStartY;
    if (Math.hypot(dX, dY) > 10) tapMoved = true;

    // رفتار کشیدن تصویر به سمت پایین با یک انگشت
    if (currentScale <= 1.05) {
      const diffY = dY;
      const diffX = Math.abs(dX);

      if (diffY > 16 && diffY > diffX * 1.5) {
        isPullingDown = true;
        if (e.cancelable) e.preventDefault();
        const dragScale = Math.max(0.75, 1 - (diffY / 1000));
        img.style.transform = `translate3d(0, ${diffY.toFixed(1)}px, 0) scale(${dragScale.toFixed(3)})`;
      }
    }
  }, { passive: false });

  const handleTouchEnd = () => {
    // کاربر پس از زوم انگشت خود را برداشت -> بازگشت فنری به حالت عادی
    if (isPinching) {
      springBack();
      return;
    }

    // کاربر در حال کشیدن تصویر به پایین بود
    if (isPullingDown) {
      const currentTransform = img.style.transform || '';
      const match = currentTransform.match(/translate3d\(0(?:px)?,\s*([\d.]+)px/);
      const draggedY = match ? parseFloat(match[1]) : 0;

      if (draggedY > 85 && typeof onClose === 'function') {
        onClose();
      } else {
        springBack();
      }
      return;
    }

    // سوایپ افقی یا حرکت انگشت: تپ نیست
    if (tapMoved) {
      lastTap = 0;
      return;
    }

    // پشتیبانی از دابل‌تپ: زوم موقت و سپس بازگشت فنری
    const now = Date.now();
    if (now - lastTap <= 280) {
      if (currentScale > 1) {
        springBack();
      } else {
        img.style.transition = 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)';
        img.style.transform = 'translate3d(0, 0, 0) scale(2.2)';
        currentScale = 2.2;
        // پس از ۱.۵ ثانیه خودکار به حالت عادی فنر می‌زند
        setTimeout(() => {
          if (currentScale > 1) springBack();
        }, 1600);
      }
    }
    lastTap = now;
  };

  img.addEventListener('touchend', handleTouchEnd);
  img.addEventListener('touchcancel', handleTouchEnd);
}

/**
 * زوم ماندگار (برای عکس تعرفه و هر تصویری که باید با جزئیات خوانده شود)
 * - پینچ دو انگشتی تا ۵ برابر حول نقطه بین دو انگشت؛ بعد از رها کردن همان‌جا می‌ماند
 * - کشیدن با یک انگشت (هنگام زوم) برای جابه‌جایی در تصویر، با محدودیت لبه‌ها
 * - دابل‌تپ: بزرگ‌نمایی ۲٫۵ برابر / بازگشت به حالت عادی
 * - دسکتاپ: دابل‌کلیک، چرخ ماوس و درگ با ماوس
 * - در حالت عادی: سوایپ افقی برای ورق‌زدن و کشیدن به پایین برای بستن
 */
function attachPersistentZoom(img, track, onClose) {
  const MAX = 5, DOUBLE = 2.5;
  let s = 1, tx = 0, ty = 0;
  let pinch = null;   // { dist, s, tx, ty, cx, cy }
  let pan = null;     // { x, y, tx, ty }
  let pull = null;    // { x, y, active, dy }
  let drag = null;    // درگ ماوس
  let lastTap = 0, lastTouchEnd = 0, tapMoved = false;

  const slide = () => img.parentElement;

  // مختصات نسبت به مرکز اسلاید (مبدأ transform تصویر مرکز آن است)
  const rel = (x, y) => {
    const r = slide().getBoundingClientRect();
    return [x - (r.left + r.width / 2), y - (r.top + r.height / 2)];
  };

  // جابه‌جایی را طوری محدود می‌کند که لبه‌های تصویر از لبه‌های اسلاید تو نروند
  const clamp = () => {
    const sl = slide();
    const mx = Math.max(0, (img.clientWidth * s - sl.clientWidth) / 2);
    const my = Math.max(0, (img.clientHeight * s - sl.clientHeight) / 2);
    tx = Math.max(-mx, Math.min(mx, tx));
    ty = Math.max(-my, Math.min(my, ty));
  };

  const draw = animate => {
    img.style.transition = animate ? 'transform .28s cubic-bezier(.16, 1, .3, 1)' : 'none';
    img.style.transform = (s === 1 && tx === 0 && ty === 0)
      ? ''
      : `translate3d(${tx.toFixed(1)}px, ${ty.toFixed(1)}px, 0) scale(${s.toFixed(3)})`;
  };

  // وقتی زوم است: اسکرول افقی اسلایدر قفل می‌شود و تصویر همه‌ی لمس‌ها را خودش می‌گیرد
  const sync = () => {
    const z = s > 1.01;
    img.style.touchAction = z ? 'none' : 'pan-x';
    img.style.cursor = z ? 'grab' : '';
    track.style.overflow = z ? 'hidden' : '';
    track.style.scrollSnapType = z ? 'none' : '';
  };

  const zoomTo = (ns, cx, cy, animate) => {
    ns = Math.max(1, Math.min(MAX, ns));
    const k = ns / s;
    tx = cx - (cx - tx) * k;
    ty = cy - (cy - ty) * k;
    s = ns;
    if (s <= 1.01) { s = 1; tx = 0; ty = 0; }
    clamp();
    draw(animate);
    sync();
  };

  img.addEventListener('touchstart', e => {
    if (e.touches.length === 2) {
      const [a, b] = e.touches;
      const [cx, cy] = rel((a.clientX + b.clientX) / 2, (a.clientY + b.clientY) / 2);
      pinch = { dist: Math.hypot(b.clientX - a.clientX, b.clientY - a.clientY) || 1, s, tx, ty, cx, cy };
      pan = null;
      pull = null;
      tapMoved = true;
      track.style.overflow = 'hidden';
      track.style.scrollSnapType = 'none';
      return;
    }
    if (e.touches.length === 1) {
      const t = e.touches[0];
      tapMoved = false;
      pinch = null;
      if (s > 1.01) { pan = { x: t.clientX, y: t.clientY, tx, ty }; pull = null; }
      else { pull = { x: t.clientX, y: t.clientY, active: false, dy: 0 }; pan = null; }
    }
  }, { passive: true });

  img.addEventListener('touchmove', e => {
    if (pinch && e.touches.length === 2) {
      if (e.cancelable) e.preventDefault();
      e.stopPropagation();
      const [a, b] = e.touches;
      const d = Math.hypot(b.clientX - a.clientX, b.clientY - a.clientY);
      const [mx, my] = rel((a.clientX + b.clientX) / 2, (a.clientY + b.clientY) / 2);
      const ns = Math.max(0.85, Math.min(MAX, pinch.s * d / pinch.dist));
      const k = ns / pinch.s;
      s = ns;
      tx = mx - (pinch.cx - pinch.tx) * k;
      ty = my - (pinch.cy - pinch.ty) * k;
      draw(false);
      return;
    }

    if (pan && e.touches.length === 1) {
      if (e.cancelable) e.preventDefault();
      const t = e.touches[0];
      if (Math.hypot(t.clientX - pan.x, t.clientY - pan.y) > 8) tapMoved = true;
      tx = pan.tx + (t.clientX - pan.x);
      ty = pan.ty + (t.clientY - pan.y);
      clamp();
      draw(false);
      return;
    }

    if (pull && e.touches.length === 1 && s <= 1.01) {
      const t = e.touches[0];
      const dy = t.clientY - pull.y, dx = Math.abs(t.clientX - pull.x);
      if (Math.hypot(dx, dy) > 10) tapMoved = true;
      if (!pull.active && dy > 16 && dy > dx * 1.5) pull.active = true;
      if (pull.active) {
        if (e.cancelable) e.preventDefault();
        pull.dy = Math.max(0, dy);
        const dragScale = Math.max(0.75, 1 - (pull.dy / 1000));
        img.style.transition = 'none';
        img.style.transform = `translate3d(0, ${pull.dy.toFixed(1)}px, 0) scale(${dragScale.toFixed(3)})`;
      }
    }
  }, { passive: false });

  const end = e => {
    lastTouchEnd = Date.now();

    if (pinch) {
      if (e.touches.length < 2) {
        pinch = null;
        if (s < 1.05) { s = 1; tx = 0; ty = 0; }
        s = Math.min(s, MAX);
        clamp();
        draw(true);
        sync();
        // اگر یک انگشت روی صفحه مانده، همان‌جا ادامه‌ی جابه‌جایی
        if (e.touches.length === 1 && s > 1.01) {
          const t = e.touches[0];
          pan = { x: t.clientX, y: t.clientY, tx, ty };
        }
      }
      return;
    }

    if (e.touches.length > 0) return;

    if (pull && pull.active) {
      const dy = pull.dy;
      pull = null;
      if (dy > 85 && typeof onClose === 'function') onClose();
      else draw(true);
      return;
    }
    pull = null;
    pan = null;

    if (tapMoved) { lastTap = 0; return; }

    const now = Date.now();
    if (now - lastTap <= 300) {
      lastTap = 0;
      const t = e.changedTouches[0];
      const [cx, cy] = rel(t.clientX, t.clientY);
      zoomTo(s > 1.01 ? 1 : DOUBLE, cx, cy, true);
    } else {
      lastTap = now;
    }
  };
  img.addEventListener('touchend', end);
  img.addEventListener('touchcancel', end);

  // ── دسکتاپ ──
  img.addEventListener('dblclick', e => {
    // بعضی مرورگرهای موبایل بعد از دابل‌تپ، dblclick هم می‌فرستند؛ جلوی دوبار اجرا را بگیر
    if (Date.now() - lastTouchEnd < 600) return;
    const [cx, cy] = rel(e.clientX, e.clientY);
    zoomTo(s > 1.01 ? 1 : DOUBLE, cx, cy, true);
  });

  img.addEventListener('wheel', e => {
    e.preventDefault();
    const [cx, cy] = rel(e.clientX, e.clientY);
    zoomTo(s * Math.exp(-e.deltaY * 0.0015), cx, cy, false);
  }, { passive: false });

  img.addEventListener('pointerdown', e => {
    if (e.pointerType !== 'mouse' || s <= 1.01) return;
    drag = { x: e.clientX, y: e.clientY, tx, ty };
    img.setPointerCapture(e.pointerId);
    img.style.cursor = 'grabbing';
  });
  img.addEventListener('pointermove', e => {
    if (!drag) return;
    tx = drag.tx + (e.clientX - drag.x);
    ty = drag.ty + (e.clientY - drag.y);
    clamp();
    draw(false);
  });
  const dragEnd = () => {
    if (!drag) return;
    drag = null;
    img.style.cursor = s > 1.01 ? 'grab' : '';
  };
  img.addEventListener('pointerup', dragEnd);
  img.addEventListener('pointercancel', dragEnd);
}
