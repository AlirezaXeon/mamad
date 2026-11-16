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

  // ۴. جلوگیری از زوم ناخواسته ناشی از دابل‌تپ در مرورگرهای موبایل
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
}
