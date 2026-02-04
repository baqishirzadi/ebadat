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
import Animated, { interpolate, useAnimatedScrollHandler, useAnimatedStyle, useDerivedValue, useSharedValue } from 'react-native-reanimated';
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
      {/* Surah Number - Right side */}
      <View style={[styles.numberContainer, { backgroundColor: theme.surahHeader }]}>
        <Text style={styles.numberText}>{toArabicNumerals(surah.number)}</Text>
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
  const scrollY = useSharedValue(0);
  const headerPaddingTopSV = useSharedValue(0);
  
  // State for current visible surah (no longer used for header)
  
  // Measure actual header height once - use ref to track if measured, state to trigger update
  const headerHeightRef = useRef<number | null>(null);
  const [headerHeight, setHeaderHeight] = useState<number | null>(null);
  
  const handleHeaderLayout = useCallback((event: any) => {
    const { height } = event.nativeEvent.layout;
    if (height > 0 && headerHeightRef.current === null) {
      headerHeightRef.current = height;
      setHeaderHeight(height); // Update state once to trigger FlatList padding update
    }
  }, []);

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

  const headerCollapseProgress = useDerivedValue(() => {
    return Math.min(scrollY.value / 140, 1);
  });

  // Animated header styles - container collapses to remove empty space
  const headerAnimatedStyle = useAnimatedStyle(() => {
    const opacity = interpolate(scrollY.value, [0, 50], [1, 0], 'clamp');
    const translateY = interpolate(scrollY.value, [0, 50], [0, -20], 'clamp');
    
    return {
      opacity,
      transform: [{ translateY }],
    };
  });

  // Continue card animated style - only opacity and translateY
  const continueCardAnimatedStyle = useAnimatedStyle(() => {
    const opacity = interpolate(scrollY.value, [0, 80], [1, 0], 'clamp');
    const translateY = interpolate(scrollY.value, [0, 80], [0, -20], 'clamp');
    
    return {
      opacity,
      transform: [{ translateY }],
    };
  });

  // Search bar animated style - only opacity and translateY
  const searchBarAnimatedStyle = useAnimatedStyle(() => {
    const opacity = interpolate(scrollY.value, [0, 100], [1, 0], 'clamp');
    const translateY = interpolate(scrollY.value, [0, 100], [0, -20], 'clamp');
    
    return {
      opacity,
      transform: [{ translateY }],
    };
  });

  const headerSpacerAnimatedStyle = useAnimatedStyle(() => {
    const height = headerPaddingTopSV.value * (1 - headerCollapseProgress.value);
    return { height };
  });

  const headerContainerAnimatedStyle = useAnimatedStyle(() => {
    const translateY = -headerPaddingTopSV.value * headerCollapseProgress.value;
    return {
      transform: [{ translateY }],
    };
  });

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  // Use measured header height or fallback until measurement completes
  const headerPaddingTop = headerHeight !== null 
    ? headerHeight 
    : insets.top + 300; // Fallback until measurement completes

  useEffect(() => {
    headerPaddingTopSV.value = headerPaddingTop;
  }, [headerPaddingTop, headerPaddingTopSV]);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar style="light" backgroundColor={theme.surahHeader} />
      {/* Absolutely positioned header container - does NOT affect layout flow */}
      <Animated.View 
        style={[
          styles.headerContainer,
          { 
            backgroundColor: theme.surahHeader, // Green background extends behind status bar
            paddingTop: insets.top, // Extend behind status bar
          },
          headerContainerAnimatedStyle,
        ]}
        onLayout={handleHeaderLayout}
        pointerEvents="box-none" // Allow touches to pass through when hidden
      >
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
      </Animated.View>

      {/* FlatList with measured paddingTop - reserves exact space for header */}
      <Animated.FlatList
        data={filteredSurahs}
        keyExtractor={(item) => `surah-${item.number}`}
        renderItem={renderSurah}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <Animated.View style={[styles.headerSpacer, headerSpacerAnimatedStyle]} />
        }
        contentContainerStyle={[
          styles.listContent,
        ]}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        onViewableItemsChanged={handleViewableItemsChanged}
        viewabilityConfig={viewabilityConfig.current}
        removeClippedSubviews={false}
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
  // Absolutely positioned header container - overlays FlatList
  headerContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10, // Above FlatList content
  },
  headerSpacer: {
    height: 0,
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
    top: -6,
    right: -6,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
