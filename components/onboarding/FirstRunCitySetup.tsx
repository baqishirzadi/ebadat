import CenteredText from '@/components/CenteredText';
import { CitySelectorModal } from '@/components/prayer';
import { BorderRadius, NAAT_GRADIENT, Spacing, Typography } from '@/constants/theme';
import { useApp } from '@/context/AppContext';
import { usePrayer } from '@/context/PrayerContext';
import { getCity, getImportantCities } from '@/utils/cities';
import { detectLocationAndFindCity } from '@/utils/gpsLocation';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface FirstRunCitySetupProps {
  onComplete: () => void;
}

export function FirstRunCitySetup({ onComplete }: FirstRunCitySetupProps) {
  const insets = useSafeAreaInsets();
  const { theme, themeMode } = useApp();
  const { setCity } = usePrayer();
  const [showManualSelector, setShowManualSelector] = useState(false);
  const [isResolving, setIsResolving] = useState(false);

  const afghanistanCities = useMemo(
    () => getImportantCities('afghanistan').slice(0, 8),
    []
  );
  const diasporaCities = useMemo(
    () => getImportantCities().filter(({ city }) => city.category !== 'afghanistan').slice(0, 8),
    []
  );

  const commitCitySelection = useCallback(async (cityKey: string) => {
    setIsResolving(true);
    try {
      await setCity(cityKey);
      onComplete();
    } catch {
      Alert.alert('خطا', 'ذخیره‌سازی شهر انجام نشد. لطفاً دوباره تلاش کنید.');
    } finally {
      setIsResolving(false);
      setShowManualSelector(false);
    }
  }, [onComplete, setCity]);

  const handleDetectNearestCity = useCallback(async () => {
    setIsResolving(true);
    try {
      const result = await detectLocationAndFindCity();
      if (!result.success || !result.cityKey) {
        Alert.alert('موقعیت پیدا نشد', result.error || 'لطفاً شهر خود را به‌صورت دستی انتخاب کنید.');
        return;
      }

      const city = getCity(result.cityKey);
      Alert.alert(
        'شهر نزدیک شما پیدا شد',
        `نزدیک‌ترین شهر: ${city?.name || 'نامشخص'}\nآیا همین شهر برای اوقات اذان انتخاب شود؟`,
        [
          { text: 'نه، دستی انتخاب می‌کنم', style: 'cancel' },
          {
            text: 'بله، همین شهر',
            onPress: () => {
              void commitCitySelection(result.cityKey as string);
            },
          },
        ]
      );
    } catch {
      Alert.alert('خطا', 'تشخیص موقعیت با مشکل روبه‌رو شد. می‌توانید شهر را دستی انتخاب کنید.');
    } finally {
      setIsResolving(false);
    }
  }, [commitCitySelection]);

  const renderQuickCity = useCallback((cityKey: string, cityName: string) => (
    <Pressable
      key={cityKey}
      onPress={() => {
        void commitCitySelection(cityKey);
      }}
      style={({ pressed }) => [
        styles.quickCityChip,
        { backgroundColor: theme.card, borderColor: theme.cardBorder },
        pressed && styles.buttonPressed,
      ]}
    >
      <CenteredText style={[styles.quickCityChipText, { color: theme.text }]}>
        {cityName}
      </CenteredText>
    </Pressable>
  ), [commitCitySelection, theme.card, theme.cardBorder, theme.text]);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar style="light" />
      <LinearGradient
        colors={NAAT_GRADIENT[themeMode] || NAAT_GRADIENT.light}
        style={[styles.hero, { paddingTop: Math.max(insets.top + 20, 56) }]}
      >
        <View style={styles.heroBadge}>
          <MaterialIcons name="location-city" size={20} color="#fff" />
          <CenteredText style={styles.heroBadgeText}>تنظیم اولیه اوقات اذان</CenteredText>
        </View>
        <CenteredText style={styles.heroTitle}>برای شروع، شهر خود را انتخاب کنید</CenteredText>
        <CenteredText style={styles.heroSubtitle}>
          تا اوقات اذان، قبله و اعلان‌های عبادی از همان ابتدا دقیق و درست تنظیم شوند.
        </CenteredText>
      </LinearGradient>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(insets.bottom + 24, 32) }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
          <CenteredText style={[styles.cardTitle, { color: theme.text }]}>
            بهترین معماری برای شروع
          </CenteredText>
          <CenteredText style={[styles.cardBody, { color: theme.textSecondary }]}>
            می‌توانید نزدیک‌ترین شهر را با موقعیت پیدا کنید یا از فهرست کامل شهرهای افغانستان و جهان، شهر خود را دستی برگزینید.
          </CenteredText>

          <Pressable
            onPress={() => {
              void handleDetectNearestCity();
            }}
            disabled={isResolving}
            style={({ pressed }) => [
              styles.primaryButton,
              { backgroundColor: theme.tint },
              pressed && styles.buttonPressed,
              isResolving && styles.disabledButton,
            ]}
          >
            {isResolving ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <MaterialIcons name="my-location" size={20} color="#fff" />
            )}
            <CenteredText style={styles.primaryButtonText}>پیدا کردن نزدیک‌ترین شهر</CenteredText>
          </Pressable>

          <Pressable
            onPress={() => setShowManualSelector(true)}
            disabled={isResolving}
            style={({ pressed }) => [
              styles.secondaryButton,
              { borderColor: theme.cardBorder, backgroundColor: theme.backgroundSecondary },
              pressed && styles.buttonPressed,
            ]}
          >
            <MaterialIcons name="search" size={18} color={theme.icon} />
            <CenteredText style={[styles.secondaryButtonText, { color: theme.text }]}>
              انتخاب دستی از فهرست کامل شهرها
            </CenteredText>
          </Pressable>

          <CenteredText style={[styles.helperText, { color: theme.textSecondary }]}>
            اگر اجازه موقعیت را ندهید، انتخاب دستی شهر همچنان در دسترس است.
          </CenteredText>
        </View>

        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
          <CenteredText style={[styles.sectionTitle, { color: theme.text }]}>شهرهای مهم افغانستان</CenteredText>
          <View style={styles.quickCityGrid}>
            {afghanistanCities.map(({ key, city }) => renderQuickCity(key, city.name))}
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
          <CenteredText style={[styles.sectionTitle, { color: theme.text }]}>برای افغان‌های مقیم بیرون از کشور</CenteredText>
          <View style={styles.quickCityGrid}>
            {diasporaCities.map(({ key, city }) => renderQuickCity(key, city.name))}
          </View>
        </View>
      </ScrollView>

      <CitySelectorModal
        visible={showManualSelector}
        selectedCity={null}
        onSelectCity={(cityKey) => {
          void commitCitySelection(cityKey);
        }}
        onClose={() => setShowManualSelector(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  hero: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: 28,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  heroBadge: {
    flexDirection: 'row-reverse',
    alignSelf: 'center',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  heroBadgeText: {
    color: '#fff',
    fontFamily: 'Vazirmatn',
    fontSize: Typography.ui.caption,
  },
  heroTitle: {
    marginTop: Spacing.lg,
    color: '#fff',
    fontSize: Typography.ui.heading,
    fontWeight: '800',
    lineHeight: 38,
  },
  heroSubtitle: {
    marginTop: Spacing.sm,
    color: 'rgba(255,255,255,0.9)',
    fontSize: Typography.ui.body,
    lineHeight: 28,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.lg,
    gap: Spacing.md,
  },
  card: {
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  cardTitle: {
    fontSize: Typography.ui.title,
    fontWeight: '700',
  },
  cardBody: {
    fontSize: Typography.ui.body,
    lineHeight: 28,
  },
  primaryButton: {
    minHeight: 52,
    borderRadius: BorderRadius.lg,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
  primaryButtonText: {
    color: '#fff',
    fontFamily: 'Vazirmatn',
    fontSize: Typography.ui.body,
    fontWeight: '700',
  },
  secondaryButton: {
    minHeight: 50,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
  secondaryButtonText: {
    fontSize: Typography.ui.body,
    fontWeight: '600',
  },
  helperText: {
    fontSize: Typography.ui.caption,
    lineHeight: 22,
  },
  sectionTitle: {
    fontSize: Typography.ui.title,
    fontWeight: '700',
  },
  quickCityGrid: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    justifyContent: 'center',
  },
  quickCityChip: {
    minWidth: '30%',
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  quickCityChipText: {
    fontSize: Typography.ui.body,
    fontWeight: '600',
  },
  buttonPressed: {
    opacity: 0.84,
  },
  disabledButton: {
    opacity: 0.72,
  },
});
