# بررسی آمادگی برای انتشار در فروشگاه‌ها

## ✅ تغییرات اخیر - بررسی شده

### مقالات Seed Data
- ✅ **seedArticles.js**: اسکریپت درست است (console.log برای اسکریپت Node.js قابل قبول است)
- ✅ **articles-seed.json**: ایمیل‌های example.com برای seed data قابل قبول است (فقط برای import اولیه)
- ✅ **ArticleReader**: به‌روزرسانی شده و آماده است
- ✅ **انیمیشن‌های اسکرول**: همه المان‌ها fade می‌شوند

### مسیریابی
- ✅ Route warnings برطرف شد (dua-request و admin از Stack.Screen حذف شدند)
- ✅ Articles index default export اضافه شد
- ✅ Expo Go notification errors برطرف شدند

### همگام‌سازی شهر
- ✅ تب نماز و PrayerContext: هنگام تغییر شهر در تب اوقات نماز، مکان اذان به‌روز می‌شود

## ✅ مشکلات برطرف شده

### 1. Firebase Configuration
- ✅ **بهبود یافت**: `utils/firebase.ts` حالا از string خالی به جای placeholder استفاده می‌کند
- ✅ **isFirebaseConfigured()**: بهبود یافت تا به درستی چک کند
- ⚠️ **نیازمند**: تنظیم environment variables قبل از build production

### 2. Logger Utility
- ✅ **ایجاد شد**: `utils/logger.ts` برای conditional logging
- ⚠️ **پیشنهاد**: جایگزینی console.log با logger در فایل‌های مهم (اختیاری)

## ✅ بررسی App Store Requirements

### Android
- ✅ Package name: `com.afghandev.ebadat`
- ✅ Version code: 1
- ✅ Icons: همه موجود هستند (foreground, background, monochrome)
- ✅ Permissions: درست تنظیم شده‌اند
- ✅ Adaptive icon: تنظیم شده است

### iOS
- ✅ Bundle identifier: `com.afghandev.ebadat`
- ✅ Build number: 1
- ✅ Icons: موجود است
- ✅ Permissions: درست تنظیم شده‌اند
- ✅ Localizations: fa, ps, ar

### عمومی
- ✅ App name: "عبادت"
- ✅ Version: 1.0.0
- ✅ Description: موجود است
- ✅ Splash screen: تنظیم شده است
- ✅ EAS project ID: موجود است

## ⚠️ نکات مهم قبل از انتشار

### 1. Environment Variables
قبل از build production، باید این متغیرها تنظیم شوند:
```
EXPO_PUBLIC_FIREBASE_API_KEY=...
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=...
EXPO_PUBLIC_FIREBASE_PROJECT_ID=...
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=...
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
EXPO_PUBLIC_FIREBASE_APP_ID=...
```

### 2. Version Management
- برای هر build جدید، `versionCode` (Android) و `buildNumber` (iOS) را افزایش دهید
- Version string (`1.0.0`) را طبق semantic versioning به‌روزرسانی کنید

### 3. Testing Checklist
- [ ] تست در Expo Go (ذکر: اذان/نوتیفیکیشن در Expo Go کار نمی‌کند)
- [ ] تست در **development build** (الزامی برای اذان و نوتیفیکیشن‌ها)
- [ ] تست در production build
- [ ] تست offline functionality
- [ ] تست اذان (صبح/مغرب با صدا، سایر بی‌صدا)
- [ ] تست نوتیفیکیشن تقویم قمری
- [ ] تست location permissions
- [ ] تست در دستگاه‌های مختلف Android
- [ ] تست در iOS (اگر iOS build می‌کنید)

### 4. Firebase Setup
- [ ] Firebase project ایجاد شده
- [ ] Firestore rules تنظیم شده
- [ ] Authentication فعال شده
- [ ] Cloud Messaging تنظیم شده (برای notifications)
- [ ] مقالات seed شده (اجرای `node scripts/seedArticles.js`)

## 📝 فایل‌های ایجاد/بهبود یافته

1. ✅ `utils/logger.ts` - Logger utility برای production
2. ✅ `utils/firebase.ts` - بهبود Firebase config validation
3. ✅ `PRODUCTION_READINESS_CHECK.md` - این فایل

## ✅ وضعیت کلی

**اپ آماده انتشار است** با این شرایط:
- ✅ همه مشکلات فنی برطرف شده‌اند
- ✅ Error handling مناسب است
- ✅ App store requirements برآورده شده‌اند
- ⚠️ نیاز به تنظیم environment variables
- ⚠️ نیاز به تست نهایی در production build

## 🚀 مراحل بعدی برای انتشار

1. تنظیم Firebase environment variables
2. اجرای `node scripts/seedArticles.js` برای import مقالات
3. Build production با EAS: `eas build --platform android --profile production`
4. تست APK/IPA
5. Submit به Google Play / App Store
