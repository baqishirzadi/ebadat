# راهنمای اضافه کردن مقالات به Supabase

این راهنما به شما کمک می‌کند مقالات را با اسامی نویسندگان به Supabase PostgreSQL اضافه کنید.

## پیش‌نیازها

1. ✅ Supabase پروژه ایجاد شده باشد
2. ✅ Supabase در اپلیکیشن پیکربندی شده باشد (فایل `.env` با اطلاعات Supabase)
3. ✅ Database Migration اجرا شده باشد (`supabase/migrations/001_initial_schema.sql`)
4. ✅ دسترسی به Supabase Dashboard داشته باشید

## روش 1: استفاده از Script خودکار (پیشنهادی) ⚡

این روش سریع‌ترین و آسان‌ترین راه برای اضافه کردن مقالات است.

### پیش‌نیازها:
1. ✅ فایل `.env` با اطلاعات Supabase ایجاد شده باشد
2. ✅ Supabase JS SDK نصب باشد (`@supabase/supabase-js` package)
3. ✅ Database Tables ایجاد شده باشند (Migration اجرا شده باشد)

### مراحل:

1. **اطمینان از وجود فایل `.env`:**
   ```bash
   # اگر فایل .env ندارید، از .env.example کپی کنید:
   cp .env.example .env
   # سپس اطلاعات Supabase را در .env وارد کنید
   ```

2. **اجرای Migration (اگر هنوز اجرا نشده):**
   - به Supabase Dashboard > SQL Editor بروید
   - فایل `supabase/migrations/001_initial_schema.sql` را باز کنید
   - محتوای آن را در SQL Editor کپی و اجرا کنید

3. **اجرای Script:**
   ```bash
   node scripts/seedArticlesWeb.js
   ```

4. **نتیجه:**
   - Script به صورت خودکار:
     - 7 نویسنده (Scholars) را اضافه می‌کند
     - 14 مقاله (7 دری + 7 پشتو) را اضافه می‌کند
   - مقالات از فایل `data/articles-seed.json` خوانده می‌شوند
   - اگر مقاله یا نویسنده از قبل وجود داشته باشد، از اضافه کردن مجدد جلوگیری می‌کند

### مقالات موجود در Seed Data:

**نویسندگان:**
- مفتی فیض محمد عثمانی
- مفتی عبدالسلام عابد
- مفتی فضل الله نوری
- مولانا سیدمحمد شیرزادی
- مولانا فضل الرحمن انصاری
- سیدعبدالاله شیرزادی
- سیدعبدالله شیرزادی

**مقالات (هر کدام در دو زبان دری و پشتو):**
- ایمان؛ ریشهٔ استقامت و آرامش
- اخلاق؛ آیینهٔ شخصیت مسلمان
- نماز؛ زیور عبادت و نورِ دل
- اضطراب؛ راهکارهای آرامش در قرآن و سنت
- دعا؛ زبانِ روح با خالق
- تزکیه؛ پالایش نفس و رشد روح
- رزق؛ حکمت الهی و تلاش انسانی

### عیب‌یابی Script:

**خطا: "Missing Supabase configuration"**
- مطمئن شوید فایل `.env` وجود دارد
- بررسی کنید که تمام متغیرهای `EXPO_PUBLIC_SUPABASE_*` پر شده باشند

**خطا: "Permission denied" یا "RLS policy violation"**
- Supabase Row Level Security (RLS) Policies را بررسی کنید
- برای اولین بار، ممکن است نیاز باشد Policies را موقتاً باز کنید
- در Supabase Dashboard > Authentication > Policies، مطمئن شوید که policies برای خواندن/نوشتن تنظیم شده‌اند

**خطا: "Article already exists"**
- این خطا نیست! Script از اضافه کردن مقالات تکراری جلوگیری می‌کند
- اگر می‌خواهید دوباره اضافه کنید، ابتدا مقالات قدیمی را از Supabase حذف کنید

---

## روش 2: اضافه کردن مقالات از طریق Supabase Dashboard

### مرحله 1: ایجاد Scholar (نویسنده)

1. به [Supabase Dashboard](https://supabase.com/dashboard) بروید
2. پروژه خود را انتخاب کنید
3. به **Table Editor** بروید
4. Table `scholars` را انتخاب کنید
5. روی **Insert** > **Insert row** کلیک کنید
6. فیلدهای زیر را پر کنید:

```json
{
  "id": "scholar-id-here",
  "email": "scholar@example.com",
  "full_name": "نام نویسنده",
  "bio": "بیوگرافی نویسنده",
  "photo_url": "https://example.com/photo.jpg",  // اختیاری
  "verified": true,
  "role": "scholar"
}
```

7. روی **Save** کلیک کنید

### مرحله 2: ایجاد Article

1. در Table Editor، Table `articles` را انتخاب کنید
2. روی **Insert** > **Insert row** کلیک کنید
3. فیلدهای زیر را پر کنید:

```json
{
  "title": "عنوان مقاله",
  "language": "dari",  // یا "pashto"
  "author_id": "scholar-id-here",  // همان ID که در scholars ایجاد کردید
  "author_name": "نام نویسنده",
  "category": "iman",  // یکی از: iman, salah, akhlaq, family, anxiety, rizq, dua, tazkiyah
  "body": "متن کامل مقاله...",
  "published": true,
  "published_at": "2024-01-01T00:00:00Z",
  "reading_time_estimate": 5,  // تخمین زمان خواندن (دقیقه)
  "view_count": 0,
  "bookmark_count": 0,
  "draft": false,
  "notification_sent": false
}
```

### دسته‌بندی‌های مقالات (Category)

- `iman`: ایمان
- `salah`: نماز
- `akhlaq`: اخلاق
- `family`: خانواده
- `anxiety`: اضطراب
- `rizq`: رزق
- `dua`: دعا
- `tazkiyah`: تزکیه

### زبان‌های مقالات (Language)

- `dari`: دری
- `pashto`: پشتو

## روش 3: استفاده از Admin Interface

اگر Admin Interface در اپلیکیشن فعال است:

1. به بخش **Admin** در اپلیکیشن بروید
2. با حساب Admin وارد شوید
3. از منوی Admin، **"Add Article"** را انتخاب کنید
4. فرم را پر کنید:
   - عنوان مقاله
   - زبان (دری یا پشتو)
   - نویسنده (از لیست انتخاب کنید یا جدید اضافه کنید)
   - دسته‌بندی
   - متن مقاله
5. روی **"Publish"** کلیک کنید

## نکات مهم

1. **نویسندگان**: قبل از اضافه کردن مقالات، مطمئن شوید نویسندگان در table `scholars` وجود دارند
2. **Published Status**: فقط مقالاتی که `published: true` دارند در اپلیکیشن نمایش داده می‌شوند
3. **Timestamps**: برای `published_at`، `created_at`، و `updated_at` از نوع **TIMESTAMPTZ** استفاده کنید
4. **Author Name**: همیشه `author_name` را پر کنید تا نام نویسنده در اپلیکیشن نمایش داده شود
5. **Reading Time**: `reading_time_estimate` به صورت خودکار محاسبه می‌شود (200 کلمه در دقیقه)

## بررسی مقالات

پس از اضافه کردن مقالات:

1. اپلیکیشن را Refresh کنید (Pull to refresh در صفحه مقالات)
2. یا اپلیکیشن را دوباره راه‌اندازی کنید
3. مقالات باید در صفحه **مقالات** نمایش داده شوند

## عیب‌یابی

### مقالات نمایش داده نمی‌شوند:

1. ✅ مطمئن شوید `published: true` است
2. ✅ بررسی کنید `published_at` تنظیم شده باشد
3. ✅ Supabase در `.env` پیکربندی شده باشد
4. ✅ اتصال اینترنت برقرار باشد
5. ✅ RLS Policies اجازه خواندن را بدهند

### خطای Permission (RLS):

اگر خطای permission می‌بینید، Supabase RLS Policies را بررسی کنید:

در Supabase Dashboard > Authentication > Policies:

```sql
-- Policy برای خواندن مقالات منتشر شده
CREATE POLICY "Public can read published articles"
  ON articles FOR SELECT
  USING (published = true);

-- Policy برای خواندن نویسندگان تایید شده
CREATE POLICY "Public can read verified scholars"
  ON scholars FOR SELECT
  USING (verified = true);
```

## مثال کامل یک مقاله

```json
{
  "title": "اهمیت نماز در اسلام",
  "language": "dari",
  "author_id": "scholar-123",
  "author_name": "سیدعبدالباقی شیرزادی",
  "category": "salah",
  "body": "<p>نماز یکی از ارکان مهم اسلام است که...</p>",
  "published": true,
  "published_at": "2024-01-01T00:00:00Z",
  "reading_time_estimate": 3,
  "view_count": 0,
  "bookmark_count": 0,
  "draft": false,
  "notification_sent": false
}
```

---

**نکته**: برای اطلاعات بیشتر درباره پیکربندی Supabase، فایل `SUPABASE_SETUP.md` را ببینید.
