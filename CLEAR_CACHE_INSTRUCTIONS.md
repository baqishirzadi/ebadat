# دستورالعمل پاک کردن Cache برای رفع خطای Expo Go

## مشکل
خطای "JSBigFileString::fromPath-Could not open file" در Expo Go

## راه‌حل: پاک کردن تمام Cache ها

### مرحله 1: متوقف کردن سرور Expo
```bash
# در ترمینال که Expo در حال اجرا است:
Ctrl + C
```

### مرحله 2: پاک کردن Cache های Metro و Expo
```bash
# پاک کردن Metro cache
npx expo start --clear

# یا اگر می‌خواهید همه چیز را پاک کنید:
rm -rf .expo
rm -rf node_modules/.cache
npx expo start --clear
```

### مرحله 3: پاک کردن node_modules (اگر مشکل ادامه داشت)
```bash
# حذف node_modules
rm -rf node_modules

# نصب مجدد
npm install

# شروع مجدد با cache پاک
npx expo start --clear
```

### مرحله 4: پاک کردن Watchman Cache (اگر نصب است)
```bash
# اگر watchman نصب دارید:
watchman watch-del-all

# سپس:
npx expo start --clear
```

### مرحله 5: پاک کردن Cache در Expo Go
در اپ Expo Go روی گوشی:
1. Settings (تنظیمات)
2. Clear Cache (پاک کردن Cache)
3. یا اپ را Uninstall و دوباره Install کنید

## دستورات سریع (یکجا)

```bash
# متوقف کردن سرور
# Ctrl + C

# پاک کردن همه cache ها
rm -rf .expo
rm -rf node_modules/.cache
rm -rf $TMPDIR/metro-*
rm -rf $TMPDIR/haste-*

# شروع مجدد
npx expo start --clear
```

## اگر مشکل ادامه داشت

1. **بررسی اتصال شبکه:**
   ```bash
   # استفاده از tunnel mode
   npx expo start --tunnel --clear
   ```

2. **بررسی خطاهای syntax:**
   ```bash
   npm run lint
   ```

3. **بررسی bundle size:**
   - اگر bundle خیلی بزرگ است، ممکن است نیاز به بهینه‌سازی باشد

4. **استفاده از Development Build:**
   ```bash
   # به جای Expo Go، از development build استفاده کنید
   npx expo run:android
   # یا
   npx expo run:ios
   ```

## نکات مهم

- بعد از هر تغییر در `babel.config.js` یا `metro.config.js`، حتماً cache را پاک کنید
- اگر `babel.config.js` را تازه ایجاد کردید، حتماً cache را پاک کنید
- بعد از نصب dependencies جدید، cache را پاک کنید
