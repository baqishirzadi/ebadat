# راهنمای تنظیم Supabase برای بخش دعای خیر و مقالات

## مراحل تنظیم

### 1. ایجاد پروژه Supabase

1. به [Supabase Dashboard](https://supabase.com/dashboard) بروید
2. Sign up یا Log in کنید
3. روی "New Project" کلیک کنید
4. نام پروژه را وارد کنید (مثلاً "Ebadat")
5. Database Password را تنظیم کنید (ذخیره کنید!)
6. Region را انتخاب کنید (نزدیک‌ترین به کاربران)
7. روی "Create new project" کلیک کنید
8. منتظر بمانید تا پروژه آماده شود (2-3 دقیقه)

### 2. اجرای Database Migration

1. در Supabase Dashboard، به **SQL Editor** بروید
2. فایل `supabase/migrations/001_initial_schema.sql` را باز کنید
3. محتوای کامل فایل را در SQL Editor کپی کنید
4. روی **Run** کلیک کنید
5. مطمئن شوید که همه جداول ایجاد شده‌اند:
   - `scholars`
   - `articles`
   - `dua_requests`
   - `user_metadata`
   - `admin_users`
   - `article_analytics`

### 3. تنظیم Row Level Security (RLS) Policies

1. در Supabase Dashboard، به **Authentication** > **Policies** بروید
2. برای هر table، policies زیر را اضافه کنید:

**برای `articles`:**
```sql
-- همه می‌توانند مقالات منتشر شده را بخوانند
CREATE POLICY "Public can read published articles"
  ON articles FOR SELECT
  USING (published = true);
```

**برای `scholars`:**
```sql
-- همه می‌توانند نویسندگان تایید شده را بخوانند
CREATE POLICY "Public can read verified scholars"
  ON scholars FOR SELECT
  USING (verified = true);
```

**برای `dua_requests`:**
```sql
-- کاربران می‌توانند درخواست‌های خود را ببینند
CREATE POLICY "Users can view own dua requests"
  ON dua_requests FOR SELECT
  USING (true); -- Application logic filters by user_id

-- کاربران می‌توانند درخواست‌های خود را ایجاد کنند
CREATE POLICY "Users can insert own dua requests"
  ON dua_requests FOR INSERT
  WITH CHECK (true); -- Application logic validates user_id

-- کاربران می‌توانند درخواست‌های pending خود را به‌روزرسانی کنند
CREATE POLICY "Users can update own pending requests"
  ON dua_requests FOR UPDATE
  USING (status = 'pending'); -- Application logic validates user_id
```

**برای `user_metadata`:**
```sql
-- کاربران می‌توانند metadata خود را مدیریت کنند
CREATE POLICY "Users can manage own metadata"
  ON user_metadata FOR ALL
  USING (true); -- Application logic filters by user_id
```

**نکته**: برای production، باید policies را بر اساس authentication تنظیم کنید.

### 4. دریافت Supabase Config

1. در Supabase Dashboard، به **Project Settings** (⚙️) بروید
2. به بخش **API** بروید
3. مقادیر زیر را کپی کنید:
   - **Project URL** → `EXPO_PUBLIC_SUPABASE_URL`
   - **anon public** key → `EXPO_PUBLIC_SUPABASE_ANON_KEY`

### 5. تنظیم Environment Variables

1. فایل `.env.example` را به `.env` کپی کنید:
   ```bash
   cp .env.example .env
   ```

2. فایل `.env` را باز کنید و مقادیر را وارد کنید:
   ```env
   EXPO_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
   ```

3. Expo را restart کنید:
   ```bash
   npx expo start --clear
   ```

### 6. ایجاد حساب Admin

1. در Supabase Dashboard، به **Authentication** > **Users** بروید
2. روی **Add user** > **Create new user** کلیک کنید
3. Email و Password را وارد کنید
4. User را ایجاد کنید
5. User ID را کپی کنید

6. در **Table Editor**، table `admin_users` را باز کنید
7. یک row جدید اضافه کنید:
   ```json
   {
     "email": "admin@example.com",
     "name": "سیدعبدالباقی شیرزادی",
     "role": "admin",
     "is_active": true
   }
   ```

7. در **Table Editor**، table `scholars` را باز کنید
8. یک row جدید اضافه کنید (با User ID از Authentication):
   ```json
   {
     "id": "user-id-from-authentication",
     "email": "admin@example.com",
     "full_name": "سیدعبدالباقی شیرزادی",
     "bio": "بیوگرافی...",
     "verified": true,
     "role": "scholar"
   }
   ```

### 7. Import مقالات (اختیاری)

برای اضافه کردن مقالات نمونه:

```bash
node scripts/seedArticlesWeb.js
```

این اسکریپت:
- 7 نویسنده را اضافه می‌کند
- 14 مقاله (7 دری + 7 پشتو) را اضافه می‌کند

## تنظیمات پیشرفته

### Push Notifications

برای push notifications، می‌توانید:

1. **Expo Push Notifications** استفاده کنید (ساده‌تر)
2. یا **Supabase Edge Functions** deploy کنید

برای Edge Functions:
1. در Supabase Dashboard، به **Edge Functions** بروید
2. یک function جدید ایجاد کنید
3. کد notification را در function قرار دهید

### Real-time Updates

Supabase Realtime را می‌توانید برای real-time updates استفاده کنید:

```typescript
const subscription = supabase
  .channel('dua_requests')
  .on('postgres_changes', 
    { event: 'UPDATE', schema: 'public', table: 'dua_requests' },
    (payload) => {
      // Handle update
    }
  )
  .subscribe();
```

## عیب‌یابی

### خطای "Permission denied"
- RLS Policies را بررسی کنید
- مطمئن شوید که policies برای خواندن/نوشتن تنظیم شده‌اند

### خطای "Table does not exist"
- Migration را اجرا کنید
- مطمئن شوید که همه جداول ایجاد شده‌اند

### خطای "Connection failed"
- Supabase URL را بررسی کنید
- اتصال اینترنت را بررسی کنید
- Supabase project status را در Dashboard بررسی کنید

## امنیت

1. **RLS Policies**: همیشه RLS را فعال نگه دارید
2. **Anon Key**: فقط anon key را در client استفاده کنید
3. **Service Role Key**: هرگز در client استفاده نکنید
4. **Admin Accounts**: فقط برای افراد مورد اعتماد ایجاد کنید

## نکات Production

1. RLS Policies را محدود کنید (فقط authenticated users)
2. Rate limiting اضافه کنید
3. Monitoring را فعال کنید
4. Backups را تنظیم کنید
5. Edge Functions را برای notifications deploy کنید

---

**برای اطلاعات بیشتر**: [Supabase Documentation](https://supabase.com/docs)
