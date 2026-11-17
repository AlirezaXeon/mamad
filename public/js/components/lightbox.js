import { h, fa } from '../utils.js';

const box = document.getElementById('lightbox');

/**
 * پاپ‌آپ گالری تمام‌صفحه با قابلیت زوم لمسی فنری (Pinch-to-Zoom Spring-Back)
 * هنگام زوم دو انگشتی تصویر بزرگ می‌شود و با برداشتن انگشتان نرم به حالت عادی بازمی‌گردد.
 */
export function openLightbox(imgs, start = 0, title = '', projectSlug = '') {
  if (!imgs || !imgs.length) return;

  const total = imgs.length;
  let currentIndex = Math.max(0, Math.min(start, total - 1));

  // عنوان پروژه
  const titleEl = h('h3', { class: 'lb-title' }, title || 'گالری پروژه');

  // شمارنده تصاویر به فارسی
  const countEl = h('span', { class: 'lb-count' }, `${fa(currentIndex + 1)} / ${fa(total)}`);

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
    h('div', { class: 'lb-title-group' }, titleEl, countEl),
    h('div', { class: 'lb-actions' }, projectLinkEl, closeBtn)
  );

  // اسلایدر و تصاویر
  const track = h('div', { class: 'lb-track' });

  imgs.forEach((src, idx) => {
    const img = h('img', {
      src,
      alt: `${title || 'پروژه'} - تصویر ${fa(idx + 1)}`,
      decoding: 'async',
      loading: Math.abs(idx - currentIndex) <= 1 ? 'eager' : 'lazy'
    });

    // اتصال موتور زوم فنری به تک‌تک تصاویر
    attachSpringBackPinchZoom(img, track, () => history.back());

    const slide = h('div', { class: 'lb-slide' }, img);
    track.appendChild(slide);
  });

  // راهنمای زوم با دو انگشت برای کاربران موبایل
  const hint = h('div', { class: 'lb-hint' }, 'با دو انگشت زوم کنید');
  setTimeout(() => {
    hint.classList.add('hide');
  }, 2600);

  // دکمه‌های چپ و راست (در دسکتاپ و تبلت)
  const prevBtn = h('button', {
    class: 'lb-nav-btn lb-prev',
    type: 'button',
    'aria-label': 'تصویر قبلی',
    onclick: () => step(1) // در RTL حرکت به راست یعنی قبلی
  });
  prevBtn.innerHTML = '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg>';

  const nextBtn = h('button', {
    class: 'lb-nav-btn lb-next',
    type: 'button',
    'aria-label': 'تصویر بعدی',
    onclick: () => step(-1) // در RTL حرکت به چپ یعنی بعدی
  });
  nextBtn.innerHTML = '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>';

  // به‌روزرسانی شمارنده صفحه
  const updateCounter = () => {
    const w = track.clientWidth || 1;
    const idx = Math.round(Math.abs(track.scrollLeft) / w);
    currentIndex = Math.max(0, Math.min(idx, total - 1));
    countEl.textContent = `${fa(currentIndex + 1)} / ${fa(total)}`;
  };

  const step = dir => {
    track.scrollBy({ left: dir * track.clientWidth, behavior: 'smooth' });
  };

  const onKey = e => {
    if (e.key === 'Escape') history.back();
    if (e.key === 'ArrowLeft') step(-1);
    if (e.key === 'ArrowRight') step(1);
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

  box.replaceChildren(topBar, track, prevBtn, nextBtn, hint);
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
 * پیاده‌سازی زوم فنری دو انگشتی (Spring-Back Pinch to Zoom)
 * تصویر هنگام زوم تا ۴.۵ برابر بزرگ می‌شود و با رها کردن انگشتان با انیمیشن فنری به حالت ۱x برمی‌گردد.
 * همچنین کشیدن تصویر به سمت پایین پاپ‌آپ را می‌بندد.
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

    // کشیدن با یک انگشت (برای درگ عمودی بستن)
    if (e.touches.length === 1 && currentScale <= 1.05) {
      singleStartY = e.touches[0].clientY;
      singleStartX = e.touches[0].clientX;
      isPullingDown = false;
    }
  }, { passive: false });

  img.addEventListener('touchmove', e => {
    // رفتار زوم دو انگشتی
    if (isPinching && e.touches.length === 2) {
      e.preventDefault();
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

    // رفتار کشیدن تصویر به سمت پایین با یک انگشت
    if (!isPinching && e.touches.length === 1 && currentScale <= 1.05) {
      const diffY = e.touches[0].clientY - singleStartY;
      const diffX = Math.abs(e.touches[0].clientX - singleStartX);

      if (diffY > 16 && diffY > diffX * 1.5) {
        isPullingDown = true;
        e.preventDefault();
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
