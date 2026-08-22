# Doctors Directory — بک‌اند (Cloudflare Workers + D1 + KV)

این پروژه هسته‌ی API سایت معرفی و نمایش اطلاعات پزشکان است. فرانت‌اند در مرحله‌ی بعد اضافه می‌شود.

## پیش‌نیازها
- اکانت Cloudflare (داری ✅)
- اکانت ملی‌پیامک با یک سرشماره (داری ✅)
- Node.js نسخه ۱۸ به بالا روی سیستم خودت
- دسترسی به ترمینال (خط فرمان)

## مراحل راه‌اندازی

### ۱. نصب وابستگی‌ها
```bash
npm install
```

### ۲. ورود به Cloudflare
```bash
npx wrangler login
```
این دستور یک تب مرورگر باز می‌کنه تا با اکانت Cloudflare‌ات وارد بشی.

### ۳. ساخت دیتابیس D1
```bash
npx wrangler d1 create doctors-directory
```
خروجی این دستور یک `database_id` می‌ده. اون رو داخل فایل `wrangler.toml` جایگزین `REPLACE_WITH_YOUR_D1_DATABASE_ID` کن.

### ۴. ساخت KV Namespace (برای کدهای OTP)
```bash
npx wrangler kv namespace create OTP_KV
```
مقدار `id` خروجی رو داخل `wrangler.toml` جایگزین `REPLACE_WITH_YOUR_KV_NAMESPACE_ID` کن.

### ۵. ساخت KV Namespace برای تصاویر
تصاویر آپلودی مثل آواتار در KV نگه‌داری می‌شوند و این پروژه از R2 استفاده نمی‌کند:
```bash
npx wrangler kv namespace create ASSETS_KV
```
مقدار `id` خروجی رو داخل `wrangler.toml` جایگزین `REPLACE_WITH_YOUR_ASSETS_KV_NAMESPACE_ID` کن.

> خودِ کارت ویزیت (SVG) نیازی به این storage نداره — هر بار از روی اطلاعات پروفایل تولید می‌شه. این بخش فقط برای عکس‌های آپلودی مثل آواتار لازمه.

### ۶. اجرای اسکیمای دیتابیس
```bash
npm run db:migrate:remote
```

### ۷. تنظیم Secret ها

برای توسعه‌ی محلی، مقادیر حساس را فقط در فایل `.dev.vars` نگه‌داری کن. این فایل عمداً در `.gitignore` قرار گرفته و نباید commit یا منتشر شود. می‌توانی از `.dev.vars.example` به‌عنوان الگو استفاده کنی.

> ⚠️ یادآوری مهم قبل از `npm run deploy`: فایل `.dev.vars` نباید منتشر شود. برای محیط واقعی، Secretها را با `wrangler secret put` یا پنل Cloudflare تنظیم کن و مقدار `DEBUG_MODE` را از `"true"` به `"false"` تغییر بده.

```bash
npx wrangler secret put MELIPAYAMAK_USERNAME
npx wrangler secret put MELIPAYAMAK_PASSWORD
npx wrangler secret put MELIPAYAMAK_SENDER
npx wrangler secret put JWT_SECRET
```
- سه‌تای اول از پنل ملی‌پیامک‌ات می‌گیری (نام کاربری، رمز، شماره خط ارسال پیامک).
- `JWT_SECRET` یک رشته‌ی تصادفی و طولانی خودت انتخاب کن (مثلاً با `openssl rand -hex 32`).

> ✅ آدرس و روش صحیح متد `SendOtp` ملی‌پیامک (`https://rest.payamak-panel.com/api/SendSMS/SendOtp` با POST و بدنه‌ی form-encoded) داخل `src/lib/sms.ts` پیاده‌سازی و تایید شده. اگه باز هم پیامک نرسید، این‌ها رو چک کن:
> - اعتبار (شارژ) پنل ملی‌پیامک کافیه؟
> - شماره‌ی `MELIPAYAMAK_SENDER` که به‌عنوان secret گذاشتی، دقیقاً همون سرشماره‌ی فعال حسابته؟
> - پاسخ خام سرویس رو می‌تونی توی ترمینال `wrangler dev` (با `console.log`) یا مستقیم در جواب API (فیلد `debug`) ببینی — کد `RetStatus` غیر از `1` یعنی خطا، و `StrRetStatus` معمولاً توضیح فارسی/انگلیسی خطا رو می‌ده.

### ۸. اضافه کردن شماره‌های از پیش تایید‌شده (اختیاری ولی توصیه‌شده)
لیست شماره موبایل اعضایی که داری رو مستقیم به جدول `preapproved_phones` اضافه کن تا موقع اولین ورود، بدون نیاز به تایید ادمین وارد بشن:
```bash
npx wrangler d1 execute doctors-directory --remote --command \
  "INSERT INTO preapproved_phones (phone, note) VALUES ('989121234567', 'همکلاسی');"
```

### ۹. اجرای محلی برای تست
```bash
npm run dev
```

در اجرای عادی بالا، D1 و KV به‌صورت محلی استفاده می‌شوند و نیازی به `--remote` نیست. داده‌های محلی در `.wrangler/` نگه‌داری می‌شوند و این پوشه نباید commit شود.

برای ساخت دیتابیس محلی از ابتدا و افزودن دو کاربر آزمایشی:

```bash
npm run db:setup:local
```

کاربرهای seed محلی:

- `09356471349` با نقش `admin` و وضعیت `approved`
- `09902803693` با نقش `member` و وضعیت `approved`

### مدیریت تغییرات ساختار دیتابیس

از این مرحله به بعد هر تغییر ساختاری باید در یک فایل شماره‌دار جدید داخل `migrations/` ثبت شود؛ مثلاً `0002_add_x.sql`. ابتدا روی local اجرا کن:

```bash
npm run db:migrate:local
```

بعد از بررسی، همان migration را روی دیتابیس Cloudflare اجرا کن:

```bash
npm run db:migrate:remote
```

`schema.sql` برای مرجع اولیه باقی مانده، اما منبع اجرای migrationها پوشه‌ی `migrations/` است. Seed محلی در `seed.local.sql` قرار دارد و عمداً برای remote اجرا نمی‌شود.

### ۱۰. انتشار نهایی
```bash
npm run deploy
```

## آدرس‌های زیبا (ساب‌دامین/مسیر) برای پروفایل هر پزشک

جدول `specialties` رو با تخصص‌های واقعی گروه پر کن، مثلاً:
```bash
npx wrangler d1 execute doctors-directory --remote --command \
  "INSERT INTO specialties (slug, name_fa) VALUES
   ('radio','رادیولوژی'), ('cardio','قلب و عروق'), ('derma','پوست'), ('ortho','ارتوپدی');"
```
بعد به هر پزشک یک `slug` انگلیسی و `specialty_id` بده (فعلاً دستی، بعداً از فرم پروفایل).

آدرس‌دهی به این شکل کار می‌کنه، مستقل از این‌که کدوم دامنه به این Worker وصل باشه:
- `radio.logist.ir/ghasemi` — وقتی ساب‌دامین شناخته‌شده باشه
- `mysite.com/radio/ghasemi` — روی هر دامنه‌ی دیگه، همون نتیجه
- `mysite.com/d/{id}` یا `mysite.com/doctors/{id}` — لینک ثابت و همیشه‌کارکن، مناسب QR کد
- هر آدرس ناشناخته → پاسخ ۴۰۴ تمیز، نه خطای خام

برای این‌که ساب‌دامین‌ها به همین Worker برسن، در پنل Cloudflare یک رکورد `*.logist.ir` (Wildcard) بساز و آن را به همین Worker متصل کن (از بخش Workers Routes یا Custom Domains).

## حالت دیباگ OTP (بدون نیاز به سرویس پیامک واقعی)

اگه سرویس پیامک موقتاً مشکل داشت (یا هنوز نمی‌خوای پیامک واقعی بفرستی)، متغیر عمومی `DEBUG_MODE` توی `wrangler.toml` رو `"true"` بذار (پیش‌فرض همینه). در این حالت:
- هیچ پیامکی ارسال نمی‌شه
- کد OTP توی ترمینال `wrangler dev` چاپ می‌شه: `[DEBUG_MODE] code for 989...: 123456`
- همون کد توی خودِ پاسخ API هم برمی‌گرده (فیلد `debugCode`)، پس نیازی نیست حتی ترمینال رو نگاه کنی

وقتی سرویس پیامک درست شد و خواستی SMS واقعی تست کنی، مقدارش رو به `"false"` تغییر بده و دوباره `wrangler dev` (یا `wrangler dev --remote`) رو اجرا کن.

> ⚠️ حتماً قبل از هر deploy واقعی که قراره افراد دیگه هم ازش استفاده کنن، مطمئن شو `DEBUG_MODE="false"` هست — وگرنه کد OTP و جزئیات خطا در پاسخ API فاش می‌شوند.

## اولین ادمین
بعد از این‌که خودت یک بار با شماره‌ات وارد شدی (و در جدول `doctors` یک ردیف برات ساخته شد)، نقشت رو دستی به ادمین تغییر بده:
```bash
npx wrangler d1 execute doctors-directory --remote --command \
  "UPDATE doctors SET role='admin', status='approved' WHERE phone='989121234567';"
```

## ساختار پروژه
```
src/
  index.ts           # اپ اصلی Hono و اتصال مسیرها
  types.ts           # تعریف Env bindings
  lib/
    jwt.ts           # امضا/تایید JWT (بدون وابستگی خارجی)
    phone.ts         # نرمال‌سازی شماره و تولید کد OTP
    sms.ts           # ارسال پیامک از طریق ملی‌پیامک
    middleware.ts     # میدل‌ورهای احراز هویت
  routes/
    auth.ts          # request-otp / verify-otp
    doctors.ts       # لیست/جزئیات/ویرایش پروفایل پزشکان
    referrals.ts     # معرفی‌نامه‌ها (فقط اعضا)
    admin.ts         # تایید/رد اعضای جدید
schema.sql            # اسکیمای کامل دیتابیس D1
```

## گیت‌هاب (اختیاری)
اگر خواستی از GitHub برای دیپلوی خودکار استفاده کنی:
1. یک ریپازیتوری خصوصی بساز و این پوشه رو داخلش push کن.
2. در تنظیمات ریپو، یک Cloudflare API Token به‌عنوان Secret اضافه کن.
3. یک GitHub Action با دستور `npx wrangler deploy` تعریف کن.
این بخش رو اگه خواستی، در مرحله‌ی بعد برات آماده می‌کنم.

## مرحله‌ی بعد
- فرانت‌اند کامل (فرم ورود با OTP، فرم تکمیل پروفایل، صفحه‌ی لیست/جست‌وجوی پزشکان، صفحه‌ی معرفی‌ها، پنل ادمین)؛ نسخه‌ی اولیه‌ی قابل تست در مسیر `/app` قرار دارد.
- تولید خودکار کارت ویزیت (SVG → PNG/PDF)

## فرانت‌اند اولیه برای تست API

پس از اجرای `npm run dev`، آدرس `/app` را باز کن. این صفحه امکان دریافت OTP، ورود، مشاهده‌ی فهرست پزشکان، تکمیل پروفایل، افزودن محل کار/شبکه اجتماعی/فیلد اضافه و بررسی اعضای در انتظار در پنل ادمین را فراهم می‌کند. توکن ورود در `localStorage` مرورگر ذخیره می‌شود تا تست چند endpoint پشت‌سرهم ساده باشد.

## endpointهای تکمیل‌شده‌ی پروفایل و مدیریت

- `PUT /api/doctors/me/profile`
- `POST/DELETE /api/doctors/me/work-locations`
- `POST/DELETE /api/doctors/me/social-links`
- `POST/DELETE /api/doctors/me/extra-fields`
- `GET /api/doctors/me/profile`
- `GET/POST /api/referrals`
- `GET /api/admin/doctors?status=&q=`
- `POST /api/admin/restore/:id`
- `PATCH /api/admin/doctors/:id/role`
