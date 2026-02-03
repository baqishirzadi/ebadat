# راهنمای کامل رفع مشکل Expo Go

## مشکل
بعد از پاک کردن cache، بخش‌های جدید (مقالات، دعای خیر، انیمیشن‌ها) در Expo Go نشان داده نمی‌شوند.

## راه‌حل‌های مرحله‌ای

### مرحله 1: استفاده از اسکریپت Force Rebuild (قوی‌ترین روش)

```bash
npm run force-rebuild
```

یا:

```bash
./scripts/force-rebuild.sh
```

این اسکریپت:
- همه cache ها را پاک می‌کند
- از `--reset-cache` استفاده می‌کند (قوی‌تر از `--clear`)
- Expo را با cache پاک شروع می‌کند

### مرحله 2: استفاده از Tunnel Mode

Tunnel mode یک URL جدید ایجاد می‌کند که Expo Go cache ندارد:

```bash
npm run start:tunnel-clear
```

یا:

```bash
npx expo start --tunnel --clear
```

**مزایای Tunnel Mode:**
- URL جدید = Expo Go cache قدیمی کار نمی‌کند
- از طریق اینترنت کار می‌کند (نیازی به WiFi مشترک نیست)
- مطمئن‌تر برای force کردن bundle جدید

### مرحله 3: پاک کردن Cache در Expo Go (گوشی)

**Android:**
1. Settings → Apps → Expo Go
2. Storage → Clear Cache
3. Expo Go را کاملاً ببندید (از Recent Apps حذف کنید)
4. دوباره باز کنید و QR code را اسکن کنید

**iOS:**
1. Expo Go را uninstall کنید
2. از App Store دوباره install کنید
3. QR code را اسکن کنید

### مرحله 4: بررسی Debug Logs

بعد از reload، در Expo Go console باید این logs را ببینید:

```
[ArticlesTab] Component mounted - Articles tab is loading
[PrayerLearning] Rendering DuaFeatureTile
[SurahList] Scroll handler initialized, animations should work
```

اگر این logs را نمی‌بینید، یعنی فایل‌ها load نشده‌اند.

## دستورات جدید در package.json

```bash
# شروع عادی
npm start

# شروع با cache پاک
npm run start:clear

# شروع با reset cache (قوی‌تر)
npm run start:reset

# Tunnel mode
npm run start:tunnel

# Tunnel mode + cache پاک
npm run start:tunnel-clear

# پاک کردن cache
npm run clear-cache

# Force rebuild (قوی‌ترین)
npm run force-rebuild
```

## مراحل کامل (توصیه می‌شود)

### 1. در کامپیوتر:
```bash
# پاک کردن همه cache ها
npm run force-rebuild
```

### 2. در گوشی (Android):
- Settings → Apps → Expo Go → Storage → Clear Cache
- Expo Go را ببندید

### 3. شروع با Tunnel Mode:
```bash
npm run start:tunnel-clear
```

### 4. در Expo Go:
- QR code را دوباره اسکن کنید
- یا URL را دستی وارد کنید

### 5. بررسی:
- تب "مقالات" باید در navigation پایین باشد
- در "آموزش نماز" باید کارت "دعای خیر" باشد
- در صفحه قرآن، هدر باید هنگام scroll fade شود

## اگر هنوز کار نکرد

### گزینه 1: Development Build (بهترین راه)

```bash
npm run android
# یا
npm run ios
```

این روش:
- کندتر است اما مطمئن‌تر
- Cache مشکل ندارد
- برای production هم لازم است

### گزینه 2: بررسی Console Logs

در Expo Go:
1. Shake device
2. "Debug Remote JS" را انتخاب کنید
3. در Chrome DevTools → Console
4. بررسی کنید که logs نشان داده می‌شوند

### گزینه 3: بررسی Network

در Expo Go:
1. Shake device
2. "Show Element Inspector"
3. Network tab را بررسی کنید
4. مطمئن شوید bundle جدید download شده

## فایل‌های ایجاد شده

- ✅ `scripts/force-rebuild.sh` - اسکریپت قوی برای rebuild
- ✅ `app/(tabs)/articles.tsx` - با debug logging
- ✅ `app/(tabs)/prayer-learning.tsx` - با debug logging
- ✅ `components/quran/SurahList.tsx` - با debug logging
- ✅ `package.json` - با اسکریپت‌های جدید

## نکات مهم

1. **بعد از هر تغییر در `babel.config.js`**، حتماً `force-rebuild` استفاده کنید
2. **Tunnel mode** بهترین راه برای force کردن bundle جدید است
3. **Development build** مطمئن‌ترین راه است
4. **Debug logs** کمک می‌کنند بفهمید فایل‌ها load شده‌اند یا نه

## خلاصه سریع

```bash
# 1. Force rebuild
npm run force-rebuild

# 2. یا Tunnel mode
npm run start:tunnel-clear

# 3. در Expo Go: Clear Cache و Reload

# 4. اگر کار نکرد: Development Build
npm run android
```
