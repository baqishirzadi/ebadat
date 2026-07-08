import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  useWindowDimensions,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';

import { OnboardingShell } from '@/components/onboarding/OnboardingShell';
import { CitySelectorModal } from '@/components/prayer/CitySelectorModal';
import { RtlText } from '@/components/ui/RtlText';
import { RtlView } from '@/components/ui/RtlView';
import { BorderRadius, Spacing, Typography } from '@/constants/theme';
import { useApp } from '@/context/AppContext';
import { usePrayer } from '@/context/PrayerContext';
import { CityKey, getCity } from '@/utils/cities';
import {
  getAllCategories,
  getCityDisplaySubtitle,
  getMajorCitiesForRegion,
  getProvincesForRegion,
  getWorldCity,
  loadCityRegion,
} from '@/utils/cityDatabase';
import { detectLocationAndFindCity } from '@/utils/gpsLocation';
import { SELECTED_CITY_STORAGE_KEY } from '@/utils/prayerOnboarding';
import AsyncStorage from '@react-native-async-storage/async-storage';

const FEATURED_CATEGORIES = [
  'afghanistan',
  'iran',
  'turkey',
  'pakistan',
  'gulf',
  'germany',
  'uk',
  'france',
  'netherlands',
  'central-asia',
  'russia',
  'europe',
  'americas',
  'oceania',
] as const;

export default function OnboardingLocationScreen() {
  const { theme } = useApp();
  const { setCustomLocation } = usePrayer();
  const [pickerVisible, setPickerVisible] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('afghanistan');
  const [pendingCityKey, setPendingCityKey] = useState<CityKey | null>(null);
  const [gpsDetected, setGpsDetected] = useState<{ key: CityKey; name: string; warning?: string } | null>(null);
  const { width } = useWindowDimensions();
  const isCompact = width < 380;

  const categoryOptions = useMemo(
    () => getAllCategories().filter((c) => FEATURED_CATEGORIES.includes(c.id as typeof FEATURED_CATEGORIES[number])),
    [],
  );

  useEffect(() => {
    if (selectedCategory === 'afghanistan') return;
    void loadCityRegion(selectedCategory);
  }, [selectedCategory]);

  const browseSections = useMemo(() => {
    if (selectedCategory === 'afghanistan') {
      return [{ title: 'ولایت‌ها', items: getProvincesForRegion('afghanistan') }];
    }
    const provinces = getProvincesForRegion(selectedCategory);
    const majors = getMajorCitiesForRegion(selectedCategory);
    const sections: Array<{ title: string; items: ReturnType<typeof getProvincesForRegion> }> = [];
    if (provinces.length > 0) sections.push({ title: 'استان‌ها / ایالت‌ها', items: provinces });
    if (majors.length > 0) sections.push({ title: 'شهرهای بزرگ', items: majors });
    return sections;
  }, [selectedCategory]);

  const resolveCity = useCallback((cityKey: CityKey) => {
    return getWorldCity(cityKey) ?? getCity(cityKey);
  }, []);

  const finalizeCity = useCallback(
    async (cityKey: CityKey) => {
      const city = resolveCity(cityKey);
      if (!city) {
        Alert.alert('خطا', 'شهر انتخاب‌شده پیدا نشد.');
        return;
      }

      setSaving(true);
      try {
        await AsyncStorage.setItem(SELECTED_CITY_STORAGE_KEY, city.key);
        await setCustomLocation(
          {
            latitude: city.lat,
            longitude: city.lon,
            altitude: city.altitude || 0,
            timezone: city.timezone,
          },
          city.name,
          city.key,
        );
        router.push('/onboarding/notifications' as never);
      } catch {
        Alert.alert('خطا', 'تنظیم شهر انجام نشد. لطفاً دوباره تلاش کنید.');
      } finally {
        setSaving(false);
      }
    },
    [resolveCity, setCustomLocation],
  );

  const handleGps = async () => {
    setGpsLoading(true);
    setGpsDetected(null);
    try {
      const result = await detectLocationAndFindCity();
      if (result.success && result.cityKey) {
        const city = resolveCity(result.cityKey);
        setGpsDetected({
          key: result.cityKey as CityKey,
          name: city?.name ?? result.cityName ?? 'نامشخص',
          warning: result.warning ? result.error : undefined,
        });
        setPendingCityKey(result.cityKey as CityKey);
        if (city) setSelectedCategory(city.category);
        return;
      }
      Alert.alert('موقعیت پیدا نشد', result.error || 'لطفاً کشور و شهر را دستی انتخاب کنید.');
    } finally {
      setGpsLoading(false);
    }
  };

  const selectedPreview = pendingCityKey ? resolveCity(pendingCityKey) : null;
  const selectedCategoryName = categoryOptions.find((c) => c.id === selectedCategory)?.name;

  return (
    <OnboardingShell
      step={3}
      totalSteps={5}
      title="انتخاب کشور و شهر"
      subtitle="استان یا شهر نزدیک‌ترین محل زندگی‌تان را برگزینید — داخل یا خارج افغانستان."
      primaryLabel={selectedPreview ? `ادامه با ${selectedPreview.name}` : 'جستجوی همه شهرها'}
      onPrimary={() => {
        if (pendingCityKey) {
          finalizeCity(pendingCityKey);
          return;
        }
        setPickerVisible(true);
      }}
      primaryDisabled={saving}
      showBack
      scrollable={false}
    >
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Pressable
          onPress={handleGps}
          disabled={gpsLoading}
          style={[styles.gpsCard, { backgroundColor: theme.tint, borderColor: theme.tint }]}
        >
          {gpsLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <MaterialIcons name="my-location" size={28} color="#fff" />
          )}
          <RtlView style={styles.gpsTextWrap}>
            <RtlText align="center" style={styles.gpsTitle}>تشخیص خودکار موقعیت</RtlText>
            <RtlText align="center" style={styles.gpsSubtitle}>
              با GPS نزدیک‌ترین استان یا شهر بزرگ را پیدا کنید
            </RtlText>
          </RtlView>
          <MaterialIcons name="chevron-left" size={24} color="rgba(255,255,255,0.8)" />
        </Pressable>

        {gpsDetected ? (
          <RtlView style={[styles.gpsConfirmCard, { backgroundColor: `${theme.tint}12`, borderColor: theme.tint }]}>
            <MaterialIcons name="place" size={22} color={theme.tint} />
            <RtlView style={styles.gpsConfirmText}>
              <RtlText align="center" style={[styles.gpsConfirmTitle, { color: theme.text }]}>
                {gpsDetected.name}
              </RtlText>
              {gpsDetected.warning ? (
                <RtlText align="center" style={[styles.gpsWarning, { color: theme.textSecondary }]}>
                  {gpsDetected.warning}
                </RtlText>
              ) : null}
            </RtlView>
            <Pressable
              onPress={() => finalizeCity(gpsDetected.key)}
              style={[styles.gpsConfirmBtn, { backgroundColor: theme.tint }]}
            >
              <RtlText align="center" style={styles.gpsConfirmBtnText}>ادامه</RtlText>
            </Pressable>
          </RtlView>
        ) : null}

        <RtlText align="center" style={[styles.sectionTitle, { color: theme.text }]}>کشور / منطقه</RtlText>
        <RtlView style={styles.countryGrid}>
          {categoryOptions.map((cat) => {
            const active = selectedCategory === cat.id;
            return (
              <Pressable
                key={cat.id}
                onPress={() => {
                  setSelectedCategory(cat.id);
                  setPendingCityKey(null);
                  setGpsDetected(null);
                }}
                style={[
                  styles.countryChip,
                  isCompact ? styles.countryChipCompact : styles.countryChipDefault,
                  {
                    backgroundColor: active ? theme.tint : theme.card,
                    borderColor: active ? theme.tint : theme.cardBorder,
                  },
                ]}
              >
                <RtlText align="center" style={[styles.countryText, { color: active ? '#fff' : theme.text }]}>
                  {cat.name}
                </RtlText>
              </Pressable>
            );
          })}
        </RtlView>

        {selectedPreview && !gpsDetected ? (
          <RtlView style={[styles.selectedCard, { backgroundColor: `${theme.tint}15`, borderColor: theme.tint }]}>
            <MaterialIcons name="check-circle" size={22} color={theme.tint} />
            <RtlText align="center" style={[styles.selectedText, { color: theme.text }]}>
              {selectedCategoryName} — {selectedPreview.name}
            </RtlText>
          </RtlView>
        ) : null}

        {browseSections.map((section) => (
          <RtlView key={section.title} style={styles.sectionBlock}>
            <RtlText align="center" style={[styles.sectionTitle, { color: theme.textSecondary }]}>
              {section.title}
            </RtlText>
            <RtlView style={styles.cityGrid}>
              {section.items.map(({ key, city }) => {
                const active = pendingCityKey === key;
                const subtitle = getCityDisplaySubtitle(key);
                return (
                  <Pressable
                    key={key}
                    onPress={() => {
                      setPendingCityKey(key);
                      setGpsDetected(null);
                    }}
                    style={[
                      styles.cityChip,
                      isCompact ? styles.cityChipCompact : styles.cityChipDefault,
                      {
                        backgroundColor: active ? theme.tint : theme.card,
                        borderColor: active ? theme.tint : theme.cardBorder,
                      },
                    ]}
                  >
                    <RtlText align="center" style={[styles.cityName, { color: active ? '#fff' : theme.text }]}>
                      {city.name}
                    </RtlText>
                    {subtitle ? (
                      <RtlText
                        align="center"
                        style={[styles.citySubtitle, { color: active ? 'rgba(255,255,255,0.85)' : theme.textSecondary }]}
                        numberOfLines={1}
                      >
                        {subtitle}
                      </RtlText>
                    ) : null}
                  </Pressable>
                );
              })}
            </RtlView>
          </RtlView>
        ))}

        <Pressable
          onPress={() => setPickerVisible(true)}
          style={[styles.searchAllBtn, { borderColor: theme.cardBorder, backgroundColor: theme.backgroundSecondary }]}
        >
          <MaterialIcons name="search" size={20} color={theme.tint} />
          <RtlText align="center" style={[styles.searchAllText, { color: theme.tint }]}>
            جستجو در همه کشورها و شهرها
          </RtlText>
        </Pressable>
      </ScrollView>

      <CitySelectorModal
        visible={pickerVisible}
        selectedCity={pendingCityKey}
        initialCategory={selectedCategory}
        onClose={() => setPickerVisible(false)}
        onSelectCity={(key) => {
          setPickerVisible(false);
          const city = resolveCity(key);
          if (city) setSelectedCategory(city.category);
          setPendingCityKey(key as CityKey);
          setGpsDetected(null);
        }}
        title="انتخاب شهر"
      />
    </OnboardingShell>
  );
}

const styles = StyleSheet.create({
  scroll: { gap: Spacing.sm, paddingBottom: Spacing.lg, alignItems: 'center' },
  gpsCard: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    borderWidth: 1,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    marginBottom: Spacing.xs,
  },
  gpsTextWrap: { flex: 1, gap: 2 },
  gpsTitle: { fontFamily: 'Vazirmatn-Bold', fontSize: Typography.ui.body, color: '#fff' },
  gpsSubtitle: { fontFamily: 'Vazirmatn', fontSize: Typography.ui.caption, color: 'rgba(255,255,255,0.9)' },
  gpsConfirmCard: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
  },
  gpsConfirmText: { flex: 1, gap: 2 },
  gpsConfirmTitle: { fontFamily: 'Vazirmatn-Bold', fontSize: Typography.ui.body },
  gpsWarning: { fontFamily: 'Vazirmatn', fontSize: Typography.ui.caption, lineHeight: 18 },
  gpsConfirmBtn: { borderRadius: BorderRadius.md, paddingVertical: Spacing.sm, paddingHorizontal: Spacing.md },
  gpsConfirmBtnText: { fontFamily: 'Vazirmatn-Bold', fontSize: Typography.ui.caption, color: '#fff' },
  sectionBlock: { width: '100%', gap: Spacing.xs },
  sectionTitle: { fontFamily: 'Vazirmatn-Bold', fontSize: Typography.ui.caption, width: '100%', marginTop: Spacing.xs },
  countryGrid: { width: '100%', flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: Spacing.xs },
  countryChip: {
    borderWidth: 1,
    borderRadius: BorderRadius.full,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    alignItems: 'center',
  },
  countryChipDefault: {
    width: '31%',
    minWidth: 100,
  },
  countryChipCompact: {
    width: '47%',
    minWidth: 120,
  },
  countryText: { fontFamily: 'Vazirmatn-Bold', fontSize: Typography.ui.caption },
  selectedCard: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginVertical: Spacing.xs,
  },
  selectedText: { fontFamily: 'Vazirmatn-Bold', fontSize: Typography.ui.body, textAlign: 'center' },
  cityGrid: { width: '100%', flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, justifyContent: 'center' },
  cityChip: {
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
    alignItems: 'center',
    gap: 2,
  },
  cityChipDefault: {
    width: '47%',
  },
  cityChipCompact: {
    width: '100%',
  },
  cityName: { fontFamily: 'Vazirmatn-Bold', fontSize: Typography.ui.body },
  citySubtitle: { fontFamily: 'Vazirmatn', fontSize: 10, textAlign: 'center' },
  searchAllBtn: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.md,
    marginTop: Spacing.sm,
  },
  searchAllText: { fontFamily: 'Vazirmatn-Bold', fontSize: Typography.ui.caption },
});
