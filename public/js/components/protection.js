// جلوگیری از کپی متن، راست‌کلیک، کشیدن تصاویر و زوم ناخواسته در کل سایت
export function initProtection() {
  // ۱. جلوگیری از منوی راست‌کلیک و منوی نگه‌داشتن انگشت (به جز در فیلدهای متنی فرم‌ها)
  document.addEventListener('contextmenu', e => {
    if (e.target.closest('input, textarea')) return;
    e.preventDefault();
  }, { capture: true });

  // ۲. جلوگیری از رویداد کپی و کات (به جز در فیلدهای متنی فرم‌ها)
  document.addEventListener('copy', e => {
    if (e.target.closest('input, textarea')) return;
    e.preventDefault();
  }, { capture: true });

  document.addEventListener('cut', e => {
    if (e.target.closest('input, textarea')) return;
    e.preventDefault();
  }, { capture: true });

  // ۳. جلوگیری از کشیدن (drag) تصاویر
  document.addEventListener('dragstart', e => {
    if (e.target.tagName === 'IMG') e.preventDefault();
  });

  // ۴. جلوگیری از زوم با دو انگشت روی کل صفحه در سافاری iOS و کروم (به‌جز پاپ‌آپ لایت‌باکس که زوم فنری دارد)
  document.addEventListener('gesturestart', e => {
    e.preventDefault();
  }, { passive: false });

  document.addEventListener('gesturechange', e => {
    e.preventDefault();
  }, { passive: false });

  document.addEventListener('gestureend', e => {
    e.preventDefault();
  }, { passive: false });

  document.addEventListener('touchstart', e => {
    if (e.touches && e.touches.length > 1 && !e.target.closest('#lightbox')) {
      e.preventDefault();
    }
  }, { passive: false });

  document.addEventListener('touchmove', e => {
    if (e.touches && e.touches.length > 1 && !e.target.closest('#lightbox')) {
      e.preventDefault();
    }
  }, { passive: false });

  // ۵. جلوگیری از زوم ناخواسته ناشی از دابل‌تپ در مرورگرهای موبایل
  let lastTap = 0;
  document.addEventListener('touchend', e => {
    const now = Date.now();
    if (now - lastTap <= 300) {
      if (!e.target.closest('input, textarea, button, a')) {
        e.preventDefault();
      }
    }
    lastTap = now;
  }, { passive: false });

  // ۶. جلوگیری از زوم دسکتاپ با کلیدهای Ctrl + چرخ ماوس یا کلیدهای +/-
  document.addEventListener('wheel', e => {
    if (e.ctrlKey) e.preventDefault();
  }, { passive: false });

  document.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && (e.key === '+' || e.key === '-' || e.key === '=' || e.key === '0')) {
      e.preventDefault();
    }
  });
}
