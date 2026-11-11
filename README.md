# سایت نمونه‌کار (Cloudflare، موبایل‌محور)

## ثبت سفارش و پنل (نیازمند دیتابیس D1)
جریان کاربر: دکمه «ثبت سفارش» ← پنجره راهنما (باید تأیید شود) ← فرم ۵ مرحله‌ای (خدمات، ملک و متراژ با ماشین‌حساب، سبک و بودجه، توضیحات، تماس) ← کد پیگیری.

- `public/data/order.json` : همه گزینه‌ها، متن راهنما و متن‌های «؟» (تنها منبع؛ Worker هم از همین فایل اعتبارسنجی می‌کند)
- `public/js/views/order.js` + `components/` (modal, choice, help, measure, icons) : رابط فرم
- `src/worker.js` : API (`POST /api/order` و API پنل) + سرو فایل‌های ثابت
- `schema.sql` : جدول سفارش‌ها در D1
- `public/admin/` : پنل مدیریت (آدرس `/admin/`)، وضعیت‌دهی، یادداشت داخلی، جستجو و خروجی CSV

### راه‌اندازی (یک‌بار)
    npx wrangler d1 create portfolio-orders        # database_id را در wrangler.jsonc بگذارید
    npx wrangler d1 execute portfolio-orders --remote --file=schema.sql
    npx wrangler secret put ADMIN_PASSWORD          # رمز ورود به /admin/ (طولانی انتخاب کنید)
    npx wrangler secret put TELEGRAM_BOT_TOKEN      # اختیاری: توکن ربات از @BotFather
    npx wrangler secret put TELEGRAM_CHAT_ID        # اختیاری: چت‌آیدی شما یا گروه (ربات باید عضو باشد / /start خورده باشد)
    npx wrangler deploy

تست محلی: `npx wrangler d1 execute portfolio-orders --local --file=schema.sql` سپس `npx wrangler dev` (برای رمز محلی فایل `.dev.vars` بسازید: `ADMIN_PASSWORD=test`).
بدون توکن تلگرام، سفارش‌ها فقط در پنل ذخیره می‌شوند.
پیشنهاد امنیتی: برای `/admin/*` در Cloudflare یک Access یا Rate-limiting rule هم بگذارید.

## اجرا و انتشار
    npx wrangler dev        # تست محلی
    npx wrangler deploy     # انتشار روی Cloudflare
