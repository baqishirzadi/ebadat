# راهنمای کامل Reload کردن اپ بعد از تغییرات

## مشکل
بعد از پاک کردن cache، اپ باز شد اما تغییرات جدید (دعای خیر، مقالات، انیمیشن‌های هدر) نشان داده نمی‌شوند.

## علت
Expo Go در گوشی شما bundle قدیمی را در cache نگه داشته است.

## راه‌حل کامل

### مرحله 1: پاک کردن Cache در کامپیوتر

**روش 1: استفاده از اسکریپت (سریع‌تر)**
```bash
chmod +x scripts/clear-all-caches.sh
./scripts/clear-all-caches.sh
```

**روش 2: دستی**
```bash
# متوقف کردن سرور Expo (Ctrl+C در ترمینال)

# پاک کردن همه cache ها
rm -rf .expo
rm -rf node_modules/.cache
rm -rf $TMPDIR/metro-*
rm -rf $TMPDIR/haste-*

# شروع مجدد
npx expo start --clear
```

### مرحله 2: پاک کردن Cache در Expo Go (گوشی)

**Android:**
1. Settings (تنظیمات) → Apps (اپلیکیشن‌ها)
2. Expo Go را پیدا کنید
3. Storage (ذخیره‌سازی) → Clear Cache (پاک کردن Cache)
4. Expo Go را کاملاً ببندید (از Recent Apps حذف کنید)
5. دوباره باز کنید و QR code را اسکن کنید

**iOS:**
1. Expo Go را از گوشی حذف کنید (Uninstall)
2. دوباره از App Store نصب کنید
3. QR code را اسکن کنید

### مرحله 3: Reload کردن اپ

**در ترمینال:**
- دکمه `r` را بزنید برای reload

**در Expo Go:**
- گوشی را تکان دهید (Shake)
- "Reload" را انتخاب کنید

**یا:**
- Expo Go را کاملاً ببندید و دوباره باز کنید

### مرحله 4: بررسی تغییرات

بعد از reload، باید این موارد را ببینید:

1. **تب مقالات** در navigation پایین
2. **کارت دعای خیر** در صفحه "آموزش نماز"
3. **انیمیشن fade** در صفحه قرآن (هدر، کارت ادامه تلاوت، و search bar هنگام scroll)

## اگر هنوز کار نکرد

### گزینه 1: Development Build (بهترین راه)

```bash
# برای Android
npx expo run:android

# برای iOS
npx expo run:ios
```

این روش کندتر است اما مطمئن‌تر است و cache مشکل ندارد.

### گزینه 2: بررسی فایل‌ها

مطمئن شوید که این فایل‌ها وجود دارند:

- ✅ `app/(tabs)/articles.tsx`
- ✅ `app/articles/index.tsx`
- ✅ `app/(tabs)/prayer-learning.tsx` (با `DuaFeatureTile`)
- ✅ `components/quran/SurahList.tsx` (با `Animated.FlatList`)
- ✅ `babel.config.js` (با `react-native-reanimated/plugin`)

### گزینه 3: بررسی Dependencies

```bash
npm list react-native-reanimated
```

باید نسخه `4.1.6` یا بالاتر را نشان دهد.

## نکات مهم

1. **بعد از هر تغییر در `babel.config.js`**، حتماً cache را پاک کنید
2. **بعد از نصب dependencies جدید**، cache را پاک کنید
3. **اگر انیمیشن‌ها کار نمی‌کنند**، مطمئن شوید `react-native-reanimated/plugin` در `babel.config.js` است
4. **Expo Go گاهی cache قدیمی نگه می‌دارد** - حتماً cache آن را پاک کنید

## دستورات سریع

```bash
# پاک کردن cache و restart
rm -rf .expo node_modules/.cache && npx expo start --clear

# یا استفاده از اسکریپت
./scripts/clear-all-caches.sh && npx expo start --clear
```

## اگر مشکل ادامه داشت

1. Development Build استفاده کنید (بهترین راه)
2. یا Expo Go را کاملاً uninstall و reinstall کنید
3. یا از `expo start --tunnel` استفاده کنید
