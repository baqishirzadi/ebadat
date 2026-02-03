# راهنمای رفع خطای Expo Go

## مشکل
صفحه آبی در Expo Go با پیام:
- "Something went wrong"
- "Failed to download remote update"

## تغییرات انجام شده

### 1. ایجاد babel.config.js
- فایل `babel.config.js` ایجاد شد
- پلاگین `react-native-reanimated/plugin` اضافه شد (ضروری برای reanimated)

### 2. بهبود metro.config.js
- تنظیمات transformer بهبود یافت
- پشتیبانی از sourceExts اضافه شد

### 3. رفع مشکل در SurahList
- حذف `height: undefined` که باعث مشکل می‌شد
- استفاده از `overflow: 'hidden'` به جای absolute positioning

## مراحل بعدی

### 1. پاک کردن Cache
```bash
# متوقف کردن سرور Expo (Ctrl+C)
# سپس:
npx expo start --clear
```

### 2. اگر مشکل حل نشد
```bash
# پاک کردن node_modules و reinstall
rm -rf node_modules
npm install

# سپس:
npx expo start --clear
```

### 3. بررسی اتصال
- مطمئن شوید گوشی و کامپیوتر در یک WiFi هستند
- یا از tunnel mode استفاده کنید:
```bash
npx expo start --tunnel
```

### 4. بررسی Console
- در ترمینال خطاها را بررسی کنید
- در Expo Go روی گوشی، دکمه "Reload" را بزنید

## نکات مهم

- `babel.config.js` باید وجود داشته باشد برای reanimated
- بعد از ایجاد `babel.config.js`، حتماً cache را پاک کنید
- اگر هنوز مشکل دارید، سرور Expo را کاملاً ببندید و دوباره شروع کنید

## اگر مشکل ادامه داشت

1. بررسی کنید که همه dependencies نصب شده‌اند:
```bash
npm install
```

2. بررسی کنید که Expo Go به‌روز است

3. از development build استفاده کنید (به جای Expo Go):
```bash
npx expo run:android
# یا
npx expo run:ios
```
