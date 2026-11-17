/**
 * ماژول حفاظت از محتوا با رعایت اصول دسترس‌پذیری (Accessibility Tradeoff):
 * جلوگیری فراگیر از راست‌کلیک و کپی راهکار امنیتی معتبری نیست و به دسترس‌پذیری آسیب می‌زند؛
 * لذا محدودیت‌ها باریک‌تر شده‌اند: فیلدهای فرم، پاراگراف‌های متنی محتوا (.desc, .hero-desc, .pr-desc)،
 * خلاصه سفارش (.sum) و کد پیگیری (.code) آزادند تا کاربر بتواند متن‌ها را انتخاب و کپی کند.
 */
export function initProtection() {
  const isAllowed = el => {
    return Boolean(el?.closest('input, textarea, [contenteditable="true"], .desc, .hero-desc, .pr-desc, .sum, .code'));
  };

  // ۱. جلوگیری از منوی راست‌کلیک فقط در المان‌های محافظت‌شده (کروم تعاملی و تصاویر)
  document.addEventListener('contextmenu', e => {
    if (isAllowed(e.target)) return;
    e.preventDefault();
  }, { capture: true });

  // ۲. جلوگیری از رویداد کپی و کات در خارج از محتوای متنی و کد پیگیری
  document.addEventListener('copy', e => {
    if (isAllowed(e.target)) return;
    e.preventDefault();
  }, { capture: true });

  document.addEventListener('cut', e => {
    if (isAllowed(e.target)) return;
    e.preventDefault();
  }, { capture: true });

  // ۳. جلوگیری از کشیدن (drag) تصاویر
  document.addEventListener('dragstart', e => {
    if (e.target.tagName === 'IMG') e.preventDefault();
  });
}
