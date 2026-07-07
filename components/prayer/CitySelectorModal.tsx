/**
 * City Selector Modal
 * Full-screen modal for selecting cities with categories, search, and GPS
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  StyleSheet,
  Modal,
  Pressable,
  TextInput,
  FlatList,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
  StatusBar as RNStatusBar,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '@/context/AppContext';
import { Typography, Spacing, BorderRadius } from '@/constants/theme';
import { CITIES, CATEGORIES, getCity, searchCities, CityKey } from '@/utils/cities';
import { detectLocationAndFindCity } from '@/utils/gpsLocation';
import { RtlText } from '@/components/ui/RtlText';
import { RtlView } from '@/components/ui/RtlView';

interface CitySelectorModalProps {
  visible: boolean;
  selectedCity: CityKey | null;
  onSelectCity: (cityKey: CityKey) => void;
  onClose: () => void;
  allowClose?: boolean;
  title?: string;
  testID?: string;
}

export function CitySelectorModal({
  visible,
  selectedCity,
  onSelectCity,
  onClose,
  allowClose = true,
  title = 'انتخاب شهر',
  testID,
}: CitySelectorModalProps) {
  const { theme } = useApp();
  const insets = useSafeAreaInsets();
  const [selectedCategory, setSelectedCategory] = useState<string>('afghanistan');
  const [searchQuery, setSearchQuery] = useState('');
  const [gpsLoading, setGpsLoading] = useState(false);

  const handleGpsPress = useCallback(async () => {
    setGpsLoading(true);
    try {
      const result = await detectLocationAndFindCity();
      if (result.success && result.cityKey) {
        const city = getCity(result.cityKey);
        Alert.alert(
          'موقعیت یافت شد',
          `شهر نزدیک: ${city?.name || 'نامشخص'}\nآیا می‌خواهید این شهر را انتخاب کنید؟`,
          [
            { text: 'لغو', style: 'cancel' },
            {
              text: 'انتخاب',
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
          ]
        );
      } else {
        Alert.alert('خطا', result.error || 'امکان تشخیص موقعیت وجود ندارد');
      }
    } catch (error) {
      Alert.alert('خطا', 'خطا در تشخیص موقعیت');
    } finally {
      setGpsLoading(false);
    }
  }, [onSelectCity]);

  const categoryCities = useMemo(() => {
    if (searchQuery.trim()) {
      const results = searchCities(searchQuery);
      return results.map(r => ({ key: r.key, city: r.city }));
    }
    return Object.entries(CITIES[selectedCategory]?.cities || {}).map(([key, city]) => ({
      key: `${selectedCategory}_${key}`,
      city,
    }));
  }, [selectedCategory, searchQuery]);

  const renderCity = useCallback(
    ({ item }: { item: { key: string; city: any } }) => {
      const isSelected = selectedCity === item.key;
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
          <RtlText style={[styles.cityItemText, { color: isSelected ? '#fff' : theme.text }]}>
            {item.city.name}
          </RtlText>
          {isSelected && <MaterialIcons name="check-circle" size={20} color="#fff" />}
        </Pressable>
      );
    },
    [selectedCity, theme, onSelectCity, onClose]
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={allowClose ? onClose : undefined}
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
            <RtlText align="center" style={styles.headerTitle}>{title}</RtlText>
            <Pressable
              onPress={handleGpsPress}
              style={({ pressed }) => [
                styles.gpsButton,
                pressed && styles.buttonPressed,
              ]}
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
          <TextInput
            style={[styles.searchInput, { color: theme.text }]}
            placeholder="جستجوی شهر..."
            placeholderTextColor={theme.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            textAlign="right"
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
              {CATEGORIES.map((category) => (
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
                        color: selectedCategory === category.id ? '#fff' : theme.text,
                        fontWeight: selectedCategory === category.id ? '700' : '600',
                      },
                    ]}
                  >
                    {category.name}
                  </RtlText>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        )}

        {/* City List */}
        <FlatList
          testID="city-selector-list"
          data={categoryCities}
          keyExtractor={(item) => item.key}
          renderItem={renderCity}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <RtlView style={styles.emptyContainer}>
              <MaterialIcons name="location-off" size={48} color={theme.textSecondary} />
              <RtlText align="center" style={[styles.emptyText, { color: theme.textSecondary }]}>
                {searchQuery.trim() ? 'شهری یافت نشد' : 'شهری در این دسته وجود ندارد'}
              </RtlText>
            </RtlView>
          }
        />
      </RtlView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
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
  closeButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: Typography.ui.title,
    fontWeight: '700',
    color: '#fff',
    fontFamily: 'Vazirmatn',
  },
  gpsButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
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
  searchInput: {
    flex: 1,
    fontSize: Typography.ui.body,
    fontFamily: 'Vazirmatn',
  },
  categoryTabsContainer: {
    paddingVertical: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  categoryTabs: {
    maxHeight: 60,
  },
  categoryTabsContent: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
  },
  categoryTab: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    minWidth: 100,
  },
  categoryTabText: {
    fontSize: Typography.ui.body,
    fontWeight: '600',
    fontFamily: 'Vazirmatn',
  },
  listContent: {
    padding: Spacing.md,
    paddingBottom: Spacing.xxl,
  },
  cityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    gap: Spacing.sm,
  },
  cityItemText: {
    flex: 1,
    fontSize: Typography.ui.body,
    fontWeight: '500',
    fontFamily: 'Vazirmatn',
  },
  itemPressed: {
    opacity: 0.8,
  },
  buttonPressed: {
    opacity: 0.8,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xxl,
  },
  emptyText: {
    fontSize: Typography.ui.body,
    marginTop: Spacing.md,
    fontFamily: 'Vazirmatn',
  },
});
