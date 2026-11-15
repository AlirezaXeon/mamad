# سایت نمونه‌کار معماری و طراحی داخلی (Cloudflare Worker + D1 Database)

یک وب‌سایت مدرن با طراحی تحریریه (Editorial Obsidian)، تایپوگرافی بهینه فارسی (Vazirmatn)، آواتار پروفایل همراه با حباب‌های معرفی شناور، پنل مدیریت پروژه‌ها، سفارش‌ها و ذخیره‌سازی نیتیو تصاویر WebP درون دیتابیس لبه‌ای D1 (بدون نیاز به کارت اعتباری یا R2).

---

## قابلیت‌های اصلی

1. **طراحی واکنش‌گرا و مدرن (G1 & G2):**
   - هدر شیشه‌ای چسبان (Sticky Blur Bar).
   - بخش معرفی (Hero) خلاصه و زیبا همراه با آواتار دایره‌ای با قاب طلایی، افکت نور و حباب‌های شیشه‌ای ابر مانند شناور با انیمیشن‌های نرم CSS.
   - اولویت بالای پروژه‌ها در صفحه اول (نمایش پروژه‌ها بلافاصله پس از هیرو بدون نیاز به اسکرول طولانی در موبایل).
   - کارت‌های پروژه با گوشه‌های گرد نرم و لایت‌باکس تمام‌صفحه تصاویر.
   - فرم چندمرحله‌ای سفارش آنلاین با اعتبارسنجی دقیق و اطلاع‌رسانی خودکار به تلگرام.

2. **پنل مدیریت استودیو (Admin Panel):**
   - **سفارش‌ها:** فیلتر بر اساس وضعیت، جستجوی سریع، تغییر وضعیت، ثبت یادداشت داخلی، و خروجی اکسل/CSV.
   - **پروژه‌ها:** ایجاد، ویرایش، حذف، مرتب‌سازی (جابجایی بالا/پایین)، انتخاب تصویر کاور، ثبت مشخصات اختصاصی (متراژ، موقعیت، سال...).
   - **پروفایل و حباب‌ها:** ویرایش نام، عنوان شغلی، متن حباب‌های شناور هیرو و آپلود مستقیم تصویر پروفایل.
   - **ذخیره‌سازی تصاویر در D1 (کاملاً رایگان):** تصاویر با فرمت مجاز `image/webp` (تا ۳ مگابایت) مستقیماً به شکل تکه‌تکه در دیتابیس D1 ذخیره و با هدرهای کش تغییرناپذیر (`immutable, max-age=31536000`) سرو می‌شوند؛ بنابراین نیازی به باکت R2 یا ثبت کارت اعتباری نیست.

---

## ساختار پروژه

- `src/worker.js` : سرور کلودفلر (API سفارش‌ها، پروژه‌ها، سرو تصاویر از D1 و سرو استاتیک فرانت‌اند)
- `public/admin/` : پنل مدیریت (`/admin/`) با تب‌های سفارش‌ها، پروژه‌ها و پروفایل
- `public/js/` : روتینگ SPA بر پایه Hash، بدون فریم‌ورک سنگین (Vanilla ES Modules)
- `public/css/` : لایه‌های استایل مدرن (`editorial.css`، `cards.css`، `tokens.css`)
- `migrations/` : مایگریشن‌های ساختار دیتابیس D1 (`0001_orders.sql` و `0002_projects.sql`)
- `wrangler.jsonc` : پیکربندی کلودفلر برای D1 و استاتیک اَست‌ها

---

## راه‌اندازی و دیپلوی

### ۱. ساخت دیتابیس D1 (کاملاً رایگان، بدون نیاز به کارت)

```bash
npx wrangler d1 create portfolio-orders
```
شناسه دیتابیس خروجی را داخل [wrangler.jsonc](file:///c:/Users/alireza/Desktop/mamad/wrangler.jsonc) در بخش `database_id` قرار دهید.

### ۲. اجرای مایگریشن‌ها در کلادفلر

```bash
npx wrangler d1 execute portfolio-orders --remote --file=migrations/0001_orders.sql
npx wrangler d1 execute portfolio-orders --remote --file=migrations/0002_projects.sql
```

### ۳. تنظیم رمز ورود به پنل مدیریت (`/admin/`)

```bash
npx wrangler secret put ADMIN_PASSWORD        # رمز ورود به پنل /admin/
npx wrangler secret put TELEGRAM_BOT_TOKEN    # اختیاری: توکن ربات تلگرام
npx wrangler secret put TELEGRAM_CHAT_ID      # اختیاری: چت‌آیدی ارسال سفارشات
```

### ۴. انتشار نهایی روی کلادفلر (Deploy)

```bash
npx wrangler deploy
```

---

## تست محلی روی سیستم (اختیاری)

۱. ایجاد فایل `.dev.vars` در ریشه پروژه:
```env
ADMIN_PASSWORD=test
```

۲. اجرای مایگریشن‌های محلی:
```bash
npx wrangler d1 execute portfolio-orders --local --file=migrations/0001_orders.sql
npx wrangler d1 execute portfolio-orders --local --file=migrations/0002_projects.sql
```

۳. اجرای لوکال سرور:
```bash
npx wrangler dev
```
