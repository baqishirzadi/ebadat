# اطلاعات دیباگ برای رفع مشکل صفحه قرآن

## پاسخ به سوالات

### 1. فایل‌های مربوطه

**فایل اصلی**: `components/quran/SurahList.tsx`
- این فایل شامل تمام کد صفحه لیست سوره‌ها است
- از React Native + Expo استفاده می‌کند (نه Next.js)
- از `react-native-reanimated` برای انیمیشن استفاده می‌کند

**فایل‌های مرتبط**:
- `app/(tabs)/index.tsx` - صفحه اصلی که SurahList را نمایش می‌دهد
- `constants/theme.ts` - تنظیمات تم و رنگ‌ها
- `data/surahNames.ts` - داده‌های سوره‌ها

### 2. رفتار دقیق مشکل

**قبل از تغییرات اخیر**:
- کارت‌ها (القرآن الکریم، ادامه تلاوت، بار جستجو) با `position: 'absolute'` fixed می‌شدند
- این باعث می‌شد فضای سفید در layout باقی بماند
- سوره‌ها زیر فضای سفید پنهان می‌شدند

**بعد از تغییرات**:
- از `overflow: 'hidden'` و `opacity` استفاده می‌شود
- `position: 'absolute'` حذف شد
- اما هنوز ممکن است مشکل داشته باشد

### 3. ساختار کد

**فریم‌ورک**: React Native + Expo (SDK 54)
**Navigation**: Expo Router (file-based routing)
**Animation**: react-native-reanimated v4.1.1
**Styling**: StyleSheet (React Native) - نه CSS/Tailwind

### 4. جزئیات فنی

**ساختار Layout**:
```
<View container>
  <Animated.View header> // القرآن الکریم
  <Animated.View continueCard> // ادامه تلاوت (conditional)
  <Animated.View searchBar> // بار جستجو
  <Animated.FlatList surahs> // لیست سوره‌ها
</View>
```

**Animation Logic**:
- `scrollY` با `useSharedValue(0)` track می‌شود
- `useAnimatedStyle` برای fade out استفاده می‌شود
- `opacity` از 1 به 0 می‌رود وقتی scroll > 50px

**مشکل احتمالی**:
- `height: undefined` در animated style ممکن است مشکل ایجاد کند
- `overflow: 'hidden'` ممکن است به درستی کار نکند
- نیاز به استفاده از `maxHeight` یا `minHeight` به جای `height`

## راه‌حل پیشنهادی

برای رفع کامل مشکل:
1. استفاده از `maxHeight` به جای `height: undefined`
2. استفاده از `collapsable={false}` روی animated views
3. اضافه کردن `removeClippedSubviews={false}` به FlatList (انجام شد)
4. بررسی اینکه آیا نیاز به `contentInset` یا `contentOffset` است
