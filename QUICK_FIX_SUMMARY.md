# خلاصه سریع رفع مشکل

## مشکل
بعد از پاک کردن cache، تغییرات جدید (دعای خیر، مقالات، انیمیشن‌ها) نشان داده نمی‌شوند.

## راه‌حل سریع (3 مرحله)

### 1. پاک کردن Cache در کامپیوتر
```bash
npm run clear-cache
# یا
./scripts/clear-all-caches.sh
```

### 2. شروع مجدد با Cache پاک
```bash
npm run start:clear
# یا
npx expo start --clear
```

### 3. پاک کردن Cache در Expo Go (گوشی)

**Android:**
- Settings → Apps → Expo Go → Storage → Clear Cache
- Expo Go را ببندید و دوباره باز کنید

**iOS:**
- Expo Go را uninstall و reinstall کنید

### 4. Reload در Expo Go
- گوشی را تکان دهید (Shake)
- "Reload" را انتخاب کنید

## بررسی تغییرات

بعد از reload باید ببینید:

✅ **تب مقالات** در navigation پایین  
✅ **کارت دعای خیر** در صفحه "آموزش نماز"  
✅ **انیمیشن fade** در صفحه قرآن (هدر، کارت ادامه، search bar)

## اگر کار نکرد

از Development Build استفاده کنید:
```bash
npm run android
# یا
npm run ios
```

## فایل‌های ایجاد شده

- `scripts/clear-all-caches.sh` - اسکریپت پاک کردن cache
- `RELOAD_GUIDE.md` - راهنمای کامل
- `package.json` - اسکریپت‌های جدید (`clear-cache`, `start:clear`)

## دستورات جدید در package.json

```bash
npm run clear-cache    # پاک کردن همه cache ها
npm run start:clear    # شروع با cache پاک
```
