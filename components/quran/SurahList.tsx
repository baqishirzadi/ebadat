/**
 * SurahList Component
 * Displays the list of all 114 surahs with search functionality
 * All text in Dari/Arabic - No English
 */

import { BorderRadius, Spacing, Typography } from '@/constants/theme';
import { useApp, useReadingPosition } from '@/context/AppContext';
import { SURAH_NAMES, SurahNameData, toArabicNumerals } from '@/data/surahNames';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useMemo, useRef, useState, useEffect } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SearchButton } from './SearchButton';

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
          backgroundColor: theme.card,
          borderColor: isLastRead ? theme.playing : theme.cardBorder,
        },
        pressed && {
          ...styles.surahItemPressed,
          backgroundColor: theme.card, // Keep background visible when pressed
        },
      ]}
    >
      {/* Surah Number - Right side with Islamic decorative pattern */}
      <View style={styles.islamicBadgeContainer}>
        {/* Outer decorative ring */}
        <View style={[styles.decorativeRing, { borderColor: theme.surahHeader }]} />
        {/* Middle decorative ring */}
        <View style={[styles.decorativeRingMiddle, { borderColor: `${theme.surahHeader}80` }]} />
        {/* Central circle with number */}
        <View style={[styles.numberContainer, { backgroundColor: theme.surahHeader }]}>
          <Text style={styles.numberText}>{toArabicNumerals(surah.number)}</Text>
        </View>
        {/* Corner decorations */}
        <View style={[styles.cornerDeco, styles.cornerTopLeft, { borderColor: theme.surahHeader }]} />
        <View style={[styles.cornerDeco, styles.cornerTopRight, { borderColor: theme.surahHeader }]} />
        <View style={[styles.cornerDeco, styles.cornerBottomLeft, { borderColor: theme.surahHeader }]} />
        <View style={[styles.cornerDeco, styles.cornerBottomRight, { borderColor: theme.surahHeader }]} />
      </View>

      {/* Surah Info - Center */}
      <View style={styles.infoContainer}>
        <Text style={[styles.arabicName, { color: theme.text }]}>
          سوره {surah.arabic}
        </Text>
        <Text style={[styles.dariName, { color: theme.textSecondary }]}>
          {surah.dari} ({surah.meaning})
        </Text>
      </View>

      {/* Metadata - Left side (۷ آیت مکی) */}
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
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState('');
  // Header is now part of the list (no absolute overlay)

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

  // Track which surah is currently visible in view
  const handleViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: { item: SurahNameData; index: number }[] }) => {
      // No-op for now; header is static
    },
    []
  );

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 50,
    minimumViewTime: 300,
  });

  const headerPaddingTop = insets.top;

  return (
    <View style={[styles.container, { backgroundColor: theme.surahHeader }]}>
      <StatusBar style="light" backgroundColor={theme.surahHeader} />
      {/* Header is part of the list now */}

      {/* FlatList with measured paddingTop - reserves exact space for header */}
      <Animated.FlatList
        data={filteredSurahs}
        keyExtractor={(item) => `surah-${item.number}`}
        renderItem={renderSurah}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={[styles.headerWrapper, { backgroundColor: theme.surahHeader }]}>
            <View style={[styles.header, { backgroundColor: theme.surahHeader, paddingTop: headerPaddingTop }]}>
              <Text style={styles.headerTitle}>القرآن الکریم</Text>
              <Text style={styles.headerSubtitle}>
                {toArabicNumerals(114)} سوره • {toArabicNumerals(6236)} آیات
              </Text>
            </View>

            {position.surahNumber > 0 && (
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
            )}

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
          </View>
        }
        contentContainerStyle={[
          styles.listContent,
        ]}
        style={[styles.list, { backgroundColor: theme.background }]}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        scrollEventThrottle={16}
        onViewableItemsChanged={handleViewableItemsChanged}
        viewabilityConfig={viewabilityConfig.current}
        removeClippedSubviews={false}
        overScrollMode="never"
        bounces={false}
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        windowSize={21}
        updateCellsBatchingPeriod={50}
        maintainVisibleContentPosition={null}
        // Prevent iOS from adjusting content inset automatically
        contentInsetAdjustmentBehavior="never"
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
  headerWrapper: {
    marginHorizontal: -Spacing.md,
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.lg,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    overflow: 'hidden',
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
  list: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: Spacing.md,
    paddingTop: 0,
    paddingBottom: Spacing.xxl,
  },
  separator: {
    height: Spacing.md,
  },
  surahItem: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    padding: Spacing.lg,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    gap: Spacing.md,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    overflow: 'hidden',
  },
  surahItemPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  islamicBadgeContainer: {
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  decorativeRing: {
    position: 'absolute',
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderStyle: 'solid',
  },
  decorativeRingMiddle: {
    position: 'absolute',
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1.5,
    borderStyle: 'solid',
  },
  numberContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    zIndex: 1,
  },
  cornerDeco: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderWidth: 1.5,
    borderStyle: 'solid',
  },
  cornerTopLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 1.5,
    borderLeftWidth: 1.5,
    borderRightWidth: 0,
    borderBottomWidth: 0,
    borderTopLeftRadius: 4,
  },
  cornerTopRight: {
    top: 0,
    right: 0,
    borderTopWidth: 1.5,
    borderRightWidth: 1.5,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
    borderTopRightRadius: 4,
  },
  cornerBottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 1.5,
    borderLeftWidth: 1.5,
    borderTopWidth: 0,
    borderRightWidth: 0,
    borderBottomLeftRadius: 4,
  },
  cornerBottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 1.5,
    borderRightWidth: 1.5,
    borderTopWidth: 0,
    borderLeftWidth: 0,
    borderBottomRightRadius: 4,
  },
  numberText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  infoContainer: {
    flex: 1,
    alignItems: 'center', // Center-aligned for surah names
    justifyContent: 'center',
  },
  arabicName: {
    fontSize: Typography.ui.title,
    fontWeight: '600',
    fontFamily: 'QuranFont',
    textAlign: 'center', // Center-aligned text
    width: '100%',
  },
  dariName: {
    fontSize: Typography.ui.caption,
    marginTop: 2,
    fontFamily: 'Vazirmatn',
    textAlign: 'center', // Center-aligned text
    width: '100%',
  },
  metaContainer: {
    alignItems: 'flex-start', // Left-aligned (metadata is now on left side)
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
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
