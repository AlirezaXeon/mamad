/**
 * ماژول حفاظت از تصاویر و تعاملات ناخواسته (بدون محدود کردن انتخاب و کپی متن‌های سایت)
 */
export function initProtection() {
  // جلوگیری از drag کردن تصاویر
  document.addEventListener('dragstart', e => {
    if (e.target.tagName === 'IMG') e.preventDefault();
  });
}
