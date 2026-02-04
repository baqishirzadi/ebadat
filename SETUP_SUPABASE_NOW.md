# 🔥 راهنمای سریع تنظیم Supabase (ضروری!)

## ⚠️ مشکل فعلی
Supabase تنظیم نشده است. بدون Supabase، مقالات نمی‌توانند از دیتابیس لود شوند.

## ✅ راه‌حل (5 دقیقه)

### مرحله 1: ایجاد فایل .env
```bash
cp .env.example .env
```

### مرحله 2: دریافت اطلاعات Supabase

1. به [Supabase Dashboard](https://supabase.com/dashboard) بروید
2. Sign up یا Log in کنید
3. یک پروژه جدید ایجاد کنید (یا پروژه موجود را انتخاب کنید)
4. روی **Project Settings** (⚙️) کلیک کنید
5. به بخش **API** بروید
6. مقادیر زیر را کپی کنید:
   - **Project URL** → `EXPO_PUBLIC_SUPABASE_URL`
   - **anon public** key → `EXPO_PUBLIC_SUPABASE_ANON_KEY`

### مرحله 3: پر کردن فایل .env

فایل `.env` را باز کنید و مقادیر را وارد کنید:

```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

**مثال واقعی:**
```env
EXPO_PUBLIC_SUPABASE_URL=https://abcdefghijklmnop.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiY2RlZmdoaWprbG1ub3AiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTYzODk2NzI5MCwiZXhwIjoxOTU0NTQzMjkwfQ.example
```

### مرحله 4: اجرای Migration

1. در Supabase Dashboard، به **SQL Editor** بروید
2. فایل `supabase/migrations/001_initial_schema.sql` را باز کنید
3. محتوای آن را در SQL Editor کپی کنید
4. روی **Run** کلیک کنید
5. مطمئن شوید که همه جداول ایجاد شده‌اند

### مرحله 5: Import کردن مقالات

```bash
node scripts/seedArticlesWeb.js
```

این اسکریپت:
- ✅ 7 نویسنده را اضافه می‌کند
- ✅ 14 مقاله (7 دری + 7 پشتو) را اضافه می‌کند

### مرحله 6: Restart کردن Expo

```bash
# در ترمینال Metro، Ctrl+C بزنید
npx expo start --clear
```

### مرحله 7: بررسی در اپلیکیشن

1. اپلیکیشن را Refresh کنید
2. به تب **"مقالات"** بروید
3. مقالات باید نمایش داده شوند! 🎉

## 🔍 بررسی وضعیت

برای بررسی اینکه Supabase درست تنظیم شده است:

```bash
node scripts/check-firebase-status.js
```

(این اسکریپت باید به‌روزرسانی شود تا Supabase را بررسی کند)

## 🐛 عیب‌یابی

### مشکل: "Supabase still not configured"
- مطمئن شوید فایل `.env` در ریشه پروژه است (کنار `package.json`)
- بعد از ایجاد `.env`، حتماً Expo را restart کنید
- بررسی کنید که هیچ فاصله یا کاراکتر اضافی در `.env` نباشد

### مشکل: "Permission denied" در Supabase
- به Supabase Dashboard > Authentication > Policies بروید
- برای تست اولیه، RLS policies را بررسی کنید
- مطمئن شوید که policies برای خواندن مقالات تنظیم شده‌اند

### مشکل: "Articles not showing"
- بررسی کنید که `node scripts/seedArticlesWeb.js` بدون خطا اجرا شده باشد
- در Supabase Dashboard، Table `articles` را بررسی کنید
- مطمئن شوید که مقالات دارای `published: true` هستند

## 📞 کمک بیشتر

اگر هنوز مشکل دارید:
1. خروجی `node scripts/seedArticlesWeb.js` را بررسی کنید
2. لاگ‌های Metro bundler را بررسی کنید (به دنبال `[DEBUG]` یا `[Articles]` بگردید)
3. مطمئن شوید که Migration اجرا شده است

---

**بعد از تنظیم Supabase، مقالات باید نمایش داده شوند!** 🎯
