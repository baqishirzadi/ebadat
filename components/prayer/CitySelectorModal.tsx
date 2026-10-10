/**
 * City Selector Modal
 * Provinces/states + major cities with search and GPS
 */

import React, { useState, useCallback, useMemo, useEffect } from 'react';

import { View, StyleSheet, Modal, Pressable, SectionList, ScrollView, ActivityIndicator, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { LocalizedTextInput } from '@/components/ui/LocalizedText';
import { StatusBar } from 'expo-status-bar';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '@/context/AppContext';
import { Typography, Spacing, BorderRadius } from '@/constants/theme';
import { AFGHANISTAN_FEATURED_PROVINCE_KEYS, getCity, CityKey } from '@/utils/cities';
import {
  getAllCategories,
  getCityDisplaySubtitle,
  getFeaturedCitiesForRegion,
  getMajorCitiesForRegion,
  getProvincesForRegion,
  loadAllCityRegions,
  loadCriticalCityRegions,
  loadCityRegion,
  searchWorldCities,
} from '@/utils/cityDatabase';
import { detectLocationAndFindCity } from '@/utils/gpsLocation';
import { RtlText } from '@/components/ui/RtlText';
import { RtlView } from '@/components/ui/RtlView';
import { useI18n } from '@/utils/i18n/useI18n';
import { regionDisplayName } from '@/utils/regionNames';
import { displayCityLabel } from '@/utils/turkishPlaces';

interface CitySelectorModalProps {
  visible: boolean;
  selectedCity: CityKey | null;
  onSelectCity: (cityKey: CityKey) => void;
  onClose: () => void;
  allowClose?: boolean;
  title?: string;
  testID?: string;
  initialCategory?: string;
}

type CityRow = { key: string; city: { name: string; category: string } };

export function CitySelectorModal({
  visible,
  selectedCity,
  onSelectCity,
  onClose,
  allowClose = true,
  title,
  testID,
  initialCategory = 'afghanistan',
}: CitySelectorModalProps) {
  const { theme } = useApp();
  const { t, language, isLatin } = useI18n();
  const modalTitle = title || t('qibla.chooseCity');
  const insets = useSafeAreaInsets();
  const [selectedCategory, setSelectedCategory] = useState<string>(initialCategory);
  const [searchQuery, setSearchQuery] = useState('');
  const [gpsLoading, setGpsLoading] = useState(false);
  const [regionReady, setRegionReady] = useState(false);
  const categories = useMemo(() => getAllCategories(), []);

  useEffect(() => {
    if (!visible) {
      setRegionReady(false);
      return;
    }

    let cancelled = false;
    const load = async () => {
      await loadCriticalCityRegions();
      if (!cancelled) setRegionReady(true);
    };
    void load();

    return () => {
      cancelled = true;
    };
  }, [visible]);

  useEffect(() => {
    if (!visible || selectedCategory === 'afghanistan') return;
    void loadCityRegion(selectedCategory);
  }, [visible, selectedCategory]);

  useEffect(() => {
    if (!visible || !searchQuery.trim()) return;
    void loadAllCityRegions();
  }, [visible, searchQuery]);

  useEffect(() => {
    if (visible) {
      setSelectedCategory(initialCategory);
    }
  }, [visible, initialCategory]);

  const handleGpsPress = useCallback(async () => {
    setGpsLoading(true);
    try {
      const result = await detectLocationAndFindCity();
      if (result.success && result.cityKey) {
        const city = getCity(result.cityKey);
        const cityName = city
          ? displayCityLabel(city, language)
          : (result.cityName || t('onboarding.location.unknownCity'));
        const warning = result.warning ? `\n\n${result.error}` : '';
        Alert.alert(
          t('onboarding.location.gpsFound'),
          `${t('onboarding.location.gpsFoundBody', { city: cityName })}${warning}`,
          [
            { text: t('common.cancel'), style: 'cancel' },
            {
              text: t('onboarding.location.select'),
              onPress: () => {
                if (result.cityKey) {
                  onSelectCity(result.cityKey);
                  const detectedCity = getCity(result.cityKey);
                  if (detectedCity) {
                    setSelectedCategory(detectedCity.category);
                  }
                }
              },
            },
          ],
        );
      } else {
        Alert.alert(t('common.error'), result.error || t('onboarding.location.gpsNotFound'));
      }
    } catch {
      Alert.alert(t('common.error'), t('onboarding.location.gpsFailed'));
    } finally {
      setGpsLoading(false);
    }
  }, [language, onSelectCity, t]);

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    return searchWorldCities(searchQuery);
  }, [searchQuery, regionReady]);

  const browseSections = useMemo(() => {
    if (searchQuery.trim()) return [];

    if (selectedCategory === 'afghanistan') {
      const featured = getFeaturedCitiesForRegion('afghanistan');
      const featuredProvinceKeys = new Set<string>(AFGHANISTAN_FEATURED_PROVINCE_KEYS);
      const provinces = getProvincesForRegion('afghanistan').filter(
        ({ key }) => !featuredProvinceKeys.has(key),
      );
      return [
        ...(featured.length > 0 ? [{ title: t('onboarding.location.featuredCities'), data: featured }] : []),
        ...(provinces.length > 0 ? [{ title: t('onboarding.location.provinces'), data: provinces }] : []),
      ];
    }

    const provinces = getProvincesForRegion(selectedCategory);
    const majors = getMajorCitiesForRegion(selectedCategory);
    const sections: Array<{ title: string; data: CityRow[] }> = [];
    if (provinces.length > 0) sections.push({ title: t('onboarding.location.states'), data: provinces });
    if (majors.length > 0) sections.push({ title: t('onboarding.location.majorCities'), data: majors });
    return sections;
  }, [selectedCategory, searchQuery, regionReady, t]);

  const renderCity = useCallback(
    ({ item }: { item: CityRow }) => {
      const isSelected = selectedCity === item.key;
      const subtitle = getCityDisplaySubtitle(item.key, language);
      return (
        <Pressable
          onPress={() => {
            onSelectCity(item.key);
            onClose();
          }}
          style={({ pressed }) => [
            styles.cityItem,
            {
              backgroundColor: isSelected ? theme.tint : theme.card,
              borderColor: isSelected ? theme.tint : theme.cardBorder,
            },
            pressed && styles.itemPressed,
          ]}
        >
          <RtlView style={styles.cityTextWrap}>
            <RtlText align="center" style={[styles.cityItemText, { color: isSelected ? theme.onTint : theme.text }]}>
              {displayCityLabel(item.city, language)}
            </RtlText>
            {subtitle ? (
              <RtlText
                align="center"
                style={[styles.citySubtitle, { color: isSelected ? theme.onTint : theme.textSecondary }]}
                numberOfLines={1}
              >
                {subtitle}
              </RtlText>
            ) : null}
          </RtlView>
          {isSelected && <MaterialIcons name="check-circle" size={20} color={theme.onTint} />}
        </Pressable>
      );
    },
    [language, selectedCity, theme, onSelectCity, onClose],
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={allowClose ? onClose : undefined}
    >
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 10 : 0}
      >
      <RtlView testID={testID} style={[styles.container, { backgroundColor: theme.background }]}>
        <StatusBar style="light" />
        <RtlView style={[styles.headerWrapper, { backgroundColor: theme.surahHeader, paddingTop: insets.top }]}>
          <RtlView style={styles.header}>
            {allowClose ? (
              <Pressable onPress={onClose} style={styles.closeButton}>
                <MaterialIcons name="close" size={24} color="#fff" />
              </Pressable>
            ) : (
              <RtlView style={styles.closeButton} />
            )}
            <RtlText align="center" style={styles.headerTitle}>{modalTitle}</RtlText>
            <Pressable
              onPress={handleGpsPress}
              style={({ pressed }) => [styles.gpsButton, pressed && styles.buttonPressed]}
              disabled={gpsLoading}
            >
              {gpsLoading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <MaterialIcons name="my-location" size={20} color="#fff" />
              )}
            </Pressable>
          </RtlView>
        </RtlView>

        <RtlView style={[styles.searchContainer, { backgroundColor: theme.backgroundSecondary }]}>
          <MaterialIcons name="search" size={20} color={theme.icon} />
          <LocalizedTextInput
            style={[styles.searchInput, { color: theme.text }]}
            placeholder={t('onboarding.location.searchPlaceholder')}
            placeholderTextColor={theme.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            textAlign={isLatin ? 'left' : 'right'}
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery('')}>
              <MaterialIcons name="close" size={20} color={theme.icon} />
            </Pressable>
          )}
        </RtlView>

        {!searchQuery.trim() && (
          <View style={[styles.categoryTabsContainer, { backgroundColor: theme.backgroundSecondary }]}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.categoryTabs}
              contentContainerStyle={styles.categoryTabsContent}
            >
              {categories.map((category) => (
                <Pressable
                  key={category.id}
                  onPress={() => setSelectedCategory(category.id)}
                  style={({ pressed }) => [
                    styles.categoryTab,
                    {
                      backgroundColor: selectedCategory === category.id ? theme.tint : theme.background,
                      borderColor: selectedCategory === category.id ? theme.tint : theme.cardBorder,
                    },
                    pressed && styles.buttonPressed,
                  ]}
                >
                  <RtlText
                    align="center"
                    style={[
                      styles.categoryTabText,
                      {
                        color: selectedCategory === category.id ? theme.onTint : theme.text,
                        fontWeight: selectedCategory === category.id ? '700' : '600',
                      },
                    ]}
                  >
                    {regionDisplayName(category.id, language, category)}
                  </RtlText>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        )}

        <SectionList
          testID="city-selector-list"
          sections={searchQuery.trim() ? [{ title: t('onboarding.location.searchResults'), data: searchResults }] : browseSections}
          keyExtractor={(item) => item.key}
          renderItem={renderCity}
          renderSectionHeader={({ section: { title } }) => (
            <RtlText align="center" style={[styles.sectionHeader, { color: theme.textSecondary, backgroundColor: theme.background }]}>
              {title}
            </RtlText>
          )}
          contentContainerStyle={styles.listContent}
          stickySectionHeadersEnabled={false}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            <RtlView style={styles.emptyContainer}>
              <MaterialIcons name="location-off" size={48} color={theme.textSecondary} />
              <RtlText align="center" style={[styles.emptyText, { color: theme.textSecondary }]}>
                {searchQuery.trim() ? t('onboarding.location.emptySearch') : t('onboarding.location.emptyCategory')}
              </RtlText>
            </RtlView>
          }
        />
      </RtlView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerWrapper: {},
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Spacing.md,
    paddingBottom: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    overflow: 'hidden',
  },
  closeButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: Typography.ui.title, fontWeight: '700', color: '#fff', fontFamily: 'Vazirmatn' },
  gpsButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: Spacing.md,
    marginVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
  },
  searchInput: { flex: 1, fontSize: Typography.ui.body, fontFamily: 'Vazirmatn' },
  categoryTabsContainer: { paddingVertical: Spacing.xs, marginBottom: Spacing.xs },
  categoryTabs: { maxHeight: 60 },
  categoryTabsContent: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, gap: Spacing.sm },
  categoryTab: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    minWidth: 100,
  },
  categoryTabText: { fontSize: Typography.ui.body, fontWeight: '600', fontFamily: 'Vazirmatn' },
  listContent: { padding: Spacing.md, paddingBottom: Spacing.xxl },
  sectionHeader: {
    fontFamily: 'Vazirmatn-Bold',
    fontSize: Typography.ui.caption,
    paddingVertical: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  cityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    gap: Spacing.sm,
  },
  cityTextWrap: { flex: 1, gap: 2, alignItems: 'center' },
  cityItemText: { fontSize: Typography.ui.body, fontWeight: '500', fontFamily: 'Vazirmatn', textAlign: 'center' },
  citySubtitle: { fontSize: Typography.ui.caption, fontFamily: 'Vazirmatn', textAlign: 'center' },
  itemPressed: { opacity: 0.8 },
  buttonPressed: { opacity: 0.8 },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: Spacing.xxl },
  emptyText: { fontSize: Typography.ui.body, marginTop: Spacing.md, fontFamily: 'Vazirmatn' },
});
