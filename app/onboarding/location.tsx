import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
import { getAllCategories, getCitiesForRegion, loadCityRegion } from '@/utils/cityDatabase';
import { detectLocationAndFindCity } from '@/utils/gpsLocation';
import {
  markFirstOpenAdhanSetupDone,
  SELECTED_CITY_STORAGE_KEY,
} from '@/utils/prayerOnboarding';
import AsyncStorage from '@react-native-async-storage/async-storage';

const FEATURED_CATEGORIES = [
  'afghanistan',
  'iran',
  'turkey',
  'uk',
  'france',
  'netherlands',
  'germany',
  'europe',
  'pakistan',
  'americas',
  'oceania',
] as const;

export default function OnboardingLocationScreen() {
  const { theme } = useApp();
  const { setCustomLocation } = usePrayer();
  const [pickerVisible, setPickerVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('afghanistan');
  const [pendingCityKey, setPendingCityKey] = useState<CityKey | null>(null);
  const [regionReady, setRegionReady] = useState(false);

  const categoryOptions = useMemo(
    () => getAllCategories().filter((c) => FEATURED_CATEGORIES.includes(c.id as typeof FEATURED_CATEGORIES[number])),
    [],
  );

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      await Promise.all([
        loadCityRegion('iran'),
        loadCityRegion('uk'),
        loadCityRegion('france'),
        loadCityRegion('netherlands'),
        loadCityRegion('turkey'),
      ]);
      if (!cancelled) setRegionReady(true);
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (selectedCategory === 'afghanistan') return;
    void loadCityRegion(selectedCategory);
  }, [selectedCategory]);

  const citiesInCategory = useMemo(() => {
    const cities = getCitiesForRegion(selectedCategory);
    return cities.sort((a, b) => {
      if (a.city.isImportant && !b.city.isImportant) return -1;
      if (!a.city.isImportant && b.city.isImportant) return 1;
      return a.city.name.localeCompare(b.city.name, 'fa');
    });
  }, [selectedCategory, regionReady]);

  const finalizeCity = useCallback(
    async (cityKey: CityKey) => {
      const city = getCity(cityKey);
      if (!city) {
        Alert.alert('خطا', 'شهر انتخاب‌شده پیدا نشد.');
        return;
      }

      setBusy(true);
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
        await markFirstOpenAdhanSetupDone();
        router.push('/onboarding/notifications' as never);
      } catch {
        Alert.alert('خطا', 'تنظیم شهر انجام نشد. لطفاً دوباره تلاش کنید.');
      } finally {
        setBusy(false);
      }
    },
    [setCustomLocation],
  );

  const handleGps = async () => {
    setBusy(true);
    try {
      const result = await detectLocationAndFindCity();
      if (result.success && result.cityKey) {
        const detected = getCity(result.cityKey);
        if (detected) {
          setSelectedCategory(detected.category);
          setPendingCityKey(result.cityKey as CityKey);
        }
        await finalizeCity(result.cityKey as CityKey);
        return;
      }
      Alert.alert('موقعیت پیدا نشد', result.error || 'لطفاً کشور و شهر را دستی انتخاب کنید.');
    } finally {
      setBusy(false);
    }
  };

  const selectedPreview = pendingCityKey ? getCity(pendingCityKey) : null;
  const selectedCategoryName = categoryOptions.find((c) => c.id === selectedCategory)?.name;

  return (
    <OnboardingShell
      step={3}
      totalSteps={5}
      title="انتخاب کشور و شهر"
      subtitle="کشور خود را انتخاب کنید، سپس شهر نزدیک‌ترین محل زندگی‌تان را برگزینید — داخل یا خارج افغانستان."
      primaryLabel={selectedPreview ? `ادامه با ${selectedPreview.name}` : 'جستجوی همه شهرها'}
      onPrimary={() => {
        if (pendingCityKey) {
          finalizeCity(pendingCityKey);
          return;
        }
        setPickerVisible(true);
      }}
      primaryDisabled={busy}
      secondaryLabel="تشخیص خودکار موقعیت"
      onSecondary={handleGps}
      showBack
      onBack={() => router.back()}
    >
      {busy ? (
        <RtlView style={styles.loading}>
          <ActivityIndicator color={theme.tint} />
          <RtlText align="center" style={[styles.loadingText, { color: theme.textSecondary }]}>
            در حال آماده‌سازی...
          </RtlText>
        </RtlView>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={[styles.iconCircle, { backgroundColor: `${theme.tint}18` }]}>
            <MaterialIcons name="public" size={40} color={theme.tint} />
          </View>

          <RtlText align="center" style={[styles.sectionTitle, { color: theme.text }]}>
            کشور / منطقه
          </RtlText>
          <RtlView style={styles.countryGrid}>
            {categoryOptions.map((cat) => {
              const active = selectedCategory === cat.id;
              return (
                <Pressable
                  key={cat.id}
                  onPress={() => {
                    setSelectedCategory(cat.id);
                    setPendingCityKey(null);
                  }}
                  style={[
                    styles.countryChip,
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

          {selectedPreview ? (
            <RtlView style={[styles.selectedCard, { backgroundColor: `${theme.tint}15`, borderColor: theme.tint }]}>
              <MaterialIcons name="check-circle" size={22} color={theme.tint} />
              <RtlText align="center" style={[styles.selectedText, { color: theme.text }]}>
                {selectedCategoryName} — {selectedPreview.name}
              </RtlText>
            </RtlView>
          ) : null}

          <RtlText align="center" style={[styles.sectionTitle, { color: theme.textSecondary }]}>
            شهرهای {selectedCategoryName}
          </RtlText>

          <RtlView style={styles.cityGrid}>
            {citiesInCategory.map(({ key, city }) => {
              const active = pendingCityKey === key;
              return (
                <Pressable
                  key={key}
                  onPress={() => setPendingCityKey(key)}
                  style={[
                    styles.cityChip,
                    {
                      backgroundColor: active ? theme.tint : theme.card,
                      borderColor: active ? theme.tint : theme.cardBorder,
                    },
                  ]}
                >
                  <RtlText align="center" style={[styles.cityName, { color: active ? '#fff' : theme.text }]}>
                    {city.name}
                  </RtlText>
                </Pressable>
              );
            })}
          </RtlView>

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
      )}

      <CitySelectorModal
        visible={pickerVisible}
        selectedCity={pendingCityKey}
        initialCategory={selectedCategory}
        onClose={() => setPickerVisible(false)}
        onSelectCity={(key) => {
          setPickerVisible(false);
          const city = getCity(key);
          if (city) setSelectedCategory(city.category);
          setPendingCityKey(key as CityKey);
        }}
        title="انتخاب شهر"
      />
    </OnboardingShell>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
  },
  loadingText: {
    fontFamily: 'Vazirmatn',
    fontSize: Typography.ui.caption,
  },
  scroll: {
    gap: Spacing.sm,
    paddingBottom: Spacing.lg,
    alignItems: 'center',
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: Spacing.xs,
  },
  sectionTitle: {
    fontFamily: 'Vazirmatn-Bold',
    fontSize: Typography.ui.caption,
    width: '100%',
    marginTop: Spacing.xs,
  },
  countryGrid: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: Spacing.xs,
  },
  countryChip: {
    borderWidth: 1,
    borderRadius: BorderRadius.full,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    width: '31%',
    minWidth: 100,
    alignItems: 'center',
  },
  countryText: {
    fontFamily: 'Vazirmatn-Bold',
    fontSize: Typography.ui.caption,
  },
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
  selectedText: {
    fontFamily: 'Vazirmatn-Bold',
    fontSize: Typography.ui.body,
    textAlign: 'center',
  },
  cityGrid: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    justifyContent: 'center',
  },
  cityChip: {
    width: '47%',
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
    alignItems: 'center',
    gap: 2,
  },
  cityName: {
    fontFamily: 'Vazirmatn-Bold',
    fontSize: Typography.ui.body,
  },
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
  searchAllText: {
    fontFamily: 'Vazirmatn-Bold',
    fontSize: Typography.ui.caption,
  },
});
