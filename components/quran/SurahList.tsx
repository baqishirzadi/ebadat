/**
 * SurahList Component
 * Displays the list of all 114 surahs with search functionality
 * All text in Dari/Arabic - No English
 */

import React, { useState, useMemo, useCallback } from 'react';
import { View, StyleSheet, TextInput, Pressable, Text } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, useAnimatedScrollHandler, interpolate } from 'react-native-reanimated';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useApp, useReadingPosition } from '@/context/AppContext';
import { Typography, Spacing, BorderRadius } from '@/constants/theme';
import { SearchButton } from './SearchButton';
import { SURAH_NAMES, toArabicNumerals, SurahNameData } from '@/data/surahNames';
import { DuaFeatureTile } from '@/components/dua/FeatureTile';

interface SurahItemProps {
  surah: SurahNameData;
  isLastRead?: boolean;
  onPress: () => void;
}

const SurahItem = React.memo(function SurahItem({
  surah,
  isLastRead,
  onPress,
}: SurahItemProps) {
  const { theme } = useApp();

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.surahItem,
        {
          backgroundColor: isLastRead ? `${theme.playing}15` : theme.card,
          borderColor: isLastRead ? theme.playing : theme.cardBorder,
        },
        pressed && styles.surahItemPressed,
      ]}
    >
      {/* Meta Info - Left side before number */}
      <View style={styles.metaContainer}>
        <View style={styles.metaRow}>
          <MaterialIcons
            name={surah.revelationType === 'مکی' ? 'brightness-5' : 'brightness-2'}
            size={12}
            color={theme.textSecondary}
          />
          <Text style={[styles.metaText, { color: theme.textSecondary }]}>
            {surah.revelationType}
          </Text>
        </View>
        <Text style={[styles.ayahCount, { color: theme.textSecondary }]}>
          {toArabicNumerals(surah.ayahCount)} آیات
        </Text>
      </View>

      {/* Surah Number */}
      <View style={[styles.numberContainer, { backgroundColor: theme.surahHeader }]}>
        <Text style={styles.numberText}>{toArabicNumerals(surah.number)}</Text>
      </View>

      {/* Surah Info - Right aligned */}
      <View style={styles.infoContainer}>
        <Text style={[styles.arabicName, { color: theme.text }]}>
          سورة {surah.arabic}
        </Text>
        <Text style={[styles.dariName, { color: theme.textSecondary }]}>
          {surah.dari} ({surah.meaning})
        </Text>
      </View>

      {/* Continue Reading Badge */}
      {isLastRead && (
        <View style={[styles.continueReading, { backgroundColor: theme.playing }]}>
          <MaterialIcons name="play-arrow" size={14} color="#fff" />
        </View>
      )}

      {/* Chevron */}
      <MaterialIcons name="chevron-left" size={24} color={theme.icon} />
    </Pressable>
  );
});

export function SurahList() {
  const { theme } = useApp();
  const { position } = useReadingPosition();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const scrollY = useSharedValue(0);

  // Filter surahs based on search
  const filteredSurahs = useMemo(() => {
    if (!searchQuery.trim()) return SURAH_NAMES;
    
    const query = searchQuery.trim();
    return SURAH_NAMES.filter(
      (surah) =>
        surah.arabic.includes(query) ||
        surah.dari.includes(query) ||
        surah.meaning.includes(query) ||
        surah.number.toString() === query ||
        toArabicNumerals(surah.number).includes(query)
    );
  }, [searchQuery]);

  const handleSurahPress = useCallback((surahNumber: number) => {
    router.push(`/quran/${surahNumber}`);
  }, [router]);

  const handleContinueReading = useCallback(() => {
    router.push(`/quran/${position.surahNumber}?ayah=${position.ayahNumber}`);
  }, [router, position]);

  const renderSurah = useCallback(
    ({ item }: { item: SurahNameData }) => (
      <SurahItem
        surah={item}
        isLastRead={item.number === position.surahNumber}
        onPress={() => handleSurahPress(item.number)}
      />
    ),
    [position.surahNumber, handleSurahPress]
  );

  // Animated header styles - fade out and collapse height on scroll
  const headerAnimatedStyle = useAnimatedStyle(() => {
    const opacity = Math.max(0, Math.min(1, 1 - scrollY.value / 50));
    const translateY = Math.min(0, -scrollY.value / 2.5);
    const maxHeight = interpolate(scrollY.value, [0, 50], [200, 0], 'clamp');
    const isHidden = opacity < 0.01;
    
    return {
      opacity,
      transform: [{ translateY }],
      maxHeight,
      overflow: 'hidden' as const,
      pointerEvents: isHidden ? ('none' as const) : ('auto' as const),
    };
  });

  // Continue card animated style - fade out and collapse height
  const continueCardAnimatedStyle = useAnimatedStyle(() => {
    const opacity = Math.max(0, Math.min(1, 1 - scrollY.value / 50));
    const translateY = Math.min(0, -scrollY.value / 2.5);
    const maxHeight = interpolate(scrollY.value, [0, 80], [150, 0], 'clamp');
    const isHidden = opacity < 0.01;
    
    return {
      opacity,
      transform: [{ translateY }],
      maxHeight,
      overflow: 'hidden' as const,
      pointerEvents: isHidden ? ('none' as const) : ('auto' as const),
    };
  });

  // Search bar animated style - fade out and collapse height
  const searchBarAnimatedStyle = useAnimatedStyle(() => {
    const opacity = Math.max(0, Math.min(1, 1 - scrollY.value / 50));
    const translateY = Math.min(0, -scrollY.value / 2.5);
    const maxHeight = interpolate(scrollY.value, [0, 100], [60, 0], 'clamp');
    const isHidden = opacity < 0.01;
    
    return {
      opacity,
      transform: [{ translateY }],
      maxHeight,
      overflow: 'hidden' as const,
      pointerEvents: isHidden ? ('none' as const) : ('auto' as const),
    };
  });

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  // Debug: Log when scroll handler is initialized
  React.useEffect(() => {
    console.log('[SurahList] Scroll handler initialized, animations should work');
    console.log('[SurahList] scrollY shared value:', scrollY.value);
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header - Animated */}
      <Animated.View style={[styles.header, { backgroundColor: theme.surahHeader }, headerAnimatedStyle]}>
        <Text style={styles.headerTitle}>القرآن الکریم</Text>
        <Text style={styles.headerSubtitle}>
          {toArabicNumerals(114)} سوره • {toArabicNumerals(6236)} آیات
        </Text>
      </Animated.View>

      {/* Continue Reading Card - Animated */}
      {position.surahNumber > 0 && (
        <Animated.View style={continueCardAnimatedStyle}>
          <Pressable
            onPress={handleContinueReading}
            style={({ pressed }) => [
              styles.continueCard,
              { backgroundColor: theme.card, borderColor: theme.playing },
              pressed && styles.continueCardPressed,
            ]}
          >
            <View style={styles.continueContent}>
              <MaterialIcons name="bookmark" size={24} color={theme.playing} />
              <View style={styles.continueInfo}>
                <Text style={[styles.continueTitle, { color: theme.text }]}>
                  ادامه تلاوت
                </Text>
                <Text style={[styles.continueDetails, { color: theme.textSecondary }]}>
                  سوره {toArabicNumerals(position.surahNumber)} • آیه {toArabicNumerals(position.ayahNumber)}
                </Text>
              </View>
            </View>
            <MaterialIcons name="play-circle-filled" size={40} color={theme.playing} />
          </Pressable>
        </Animated.View>
      )}

      {/* Dua Request Feature Tile */}
      <View style={styles.featureTileContainer}>
        <DuaFeatureTile />
      </View>

      {/* Search Bar - Animated */}
      <Animated.View style={searchBarAnimatedStyle}>
        <View style={[styles.searchContainer, { backgroundColor: theme.backgroundSecondary }]}>
          <MaterialIcons name="search" size={20} color={theme.icon} />
          <TextInput
            style={[styles.searchInput, { color: theme.text }]}
            placeholder="جستجوی سوره..."
            placeholderTextColor={theme.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            textAlign="center"
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery('')}>
              <MaterialIcons name="close" size={20} color={theme.icon} />
            </Pressable>
          )}
        </View>
      </Animated.View>

      {/* Surah List */}
      <Animated.FlatList
        data={filteredSurahs}
        keyExtractor={(item) => `surah-${item.number}`}
        renderItem={renderSurah}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        removeClippedSubviews={false}
        maintainVisibleContentPosition={null}
      />

      {/* Search FAB */}
      <SearchButton />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 60,
    paddingBottom: Spacing.lg,
    paddingHorizontal: Spacing.lg,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 36,
    fontWeight: '700',
    color: '#fff',
    fontFamily: 'QuranFont',
    writingDirection: 'rtl',
  },
  headerSubtitle: {
    fontSize: Typography.ui.body,
    color: 'rgba(255,255,255,0.8)',
    marginTop: Spacing.xs,
    fontFamily: 'Vazirmatn',
  },
  continueCard: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: Spacing.md,
    marginTop: Spacing.md,
    marginBottom: Spacing.md,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 2,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  continueCardPressed: {
    opacity: 0.9,
  },
  featureTileContainer: {
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
  },
  continueContent: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  continueInfo: {
    alignItems: 'center',
  },
  continueTitle: {
    fontSize: Typography.ui.subtitle,
    fontWeight: '600',
    fontFamily: 'Vazirmatn',
},
  continueDetails: {
    fontSize: Typography.ui.caption,
    fontFamily: 'Vazirmatn',
},
  searchContainer: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
    gap: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: Typography.ui.body,
    paddingVertical: Spacing.xs,
    fontFamily: 'Vazirmatn',
    textAlign: 'center',
  },
  listContent: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.xxl,
  },
  separator: {
    height: Spacing.sm,
  },
  surahItem: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    gap: Spacing.md,
  },
  surahItemPressed: {
    opacity: 0.9,
  },
  numberContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  numberText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  infoContainer: {
    flex: 1,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  arabicName: {
    fontSize: Typography.ui.title,
    fontWeight: '600',
    fontFamily: 'QuranFont',
    textAlign: 'right',
    width: '100%',
  },
  dariName: {
    fontSize: Typography.ui.caption,
    marginTop: 2,
    fontFamily: 'Vazirmatn',
    textAlign: 'right',
    width: '100%',
  },
  metaContainer: {
    alignItems: 'flex-start',
    justifyContent: 'center',
    minWidth: 80,
  },
  metaRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: Typography.ui.caption,
    fontFamily: 'Vazirmatn',
  },
  ayahCount: {
    fontSize: Typography.ui.caption,
    marginTop: 2,
    fontFamily: 'Vazirmatn',
  },
  continueReading: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
