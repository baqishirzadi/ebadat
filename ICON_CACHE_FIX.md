# راهنمای رفع مشکل کش آیکون در Expo Go

## مشکل
آیکون قدیمی هنوز در Expo Go نمایش داده می‌شود حتی بعد از جایگزینی فایل‌های آیکون.

## راه حل‌ها

### 1. پاک کردن کش Expo و Metro

```bash
# پاک کردن کش Expo
npx expo start --clear

# پاک کردن کش Metro
rm -rf node_modules/.cache
rm -rf .expo
```

### 2. پاک کردن کش Expo Go در دستگاه

#### iOS:
1. Settings > Expo Go > Clear Cache
2. یا حذف و نصب مجدد Expo Go

#### Android:
1. Settings > Apps > Expo Go > Storage > Clear Cache
2. یا حذف و نصب مجدد Expo Go

### 3. راه‌اندازی مجدد

```bash
# بستن کامل Expo Go
# راه‌اندازی مجدد Expo Go
# اجرای مجدد پروژه
npx expo start --clear
```

### 4. بررسی فایل‌های آیکون

اطمینان حاصل کنید که تمام فایل‌های آیکون به‌روز شده‌اند:

```bash
ls -lh assets/images/*.png
```

فایل‌های مورد نیاز:
- `icon.png` (1024x1024)
- `splash-icon.png` (200x200)
- `android-icon-foreground.png` (1024x1024)
- `android-icon-background.png` (1024x1024)
- `android-icon-monochrome.png` (1024x1024)
- `favicon.png` (32x32)

### 5. برای Build نهایی

در build نهایی (APK/IPA)، آیکون‌ها به‌صورت خودکار از فایل‌های `assets/images/` استفاده می‌شوند و مشکل کش وجود ندارد.

### نکته مهم

Expo Go از کش استفاده می‌کند و ممکن است آیکون قدیمی را نمایش دهد. برای دیدن آیکون جدید:
- کش را پاک کنید
- Expo Go را restart کنید
- یا از build نهایی استفاده کنید
