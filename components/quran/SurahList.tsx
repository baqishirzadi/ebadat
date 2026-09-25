/**
 * SurahList Component
 * Displays the list of all 114 surahs with search functionality
 * All text in Dari/Arabic - No English
 */

import { BorderRadius, Spacing, Typography, NAAT_GRADIENT } from '@/constants/theme';
import { useApp, useReadingPosition } from '@/context/AppContext';
import { JUZ_RANGES } from '@/data/juzRanges';
import { SURAH_NAMES, SurahNameData, toArabicNumerals } from '@/data/surahNames';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useCallback, useMemo, useState } from 'react';

import { Pressable, StyleSheet, View, Platform } from 'react-native';
import { LocalizedTextInput } from '@/components/ui/LocalizedText';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import CenteredText from '@/components/CenteredText';
import { NumericText } from '@/components/ui/NumericText';
import { getUthmaniFont } from '@/hooks/useFonts';
import { RtlView } from '@/components/ui/RtlView';
import { normalizeArabicForSearch, normalizeDariForSearch, normalizePashtoForSearch } from '@/utils/quranSearchNormalize';
import { findHifzJuzStartAyah } from '@/utils/hifz16';
import { SearchButton } from './SearchButton';
import { JuzList } from './JuzList';
import { forwardChevronName, rowStyle } from '@/utils/i18n/direction';
import { useI18n } from '@/utils/i18n/useI18n';

const ITEM_HEIGHT = 108;
const SEPARATOR_HEIGHT = Spacing.md;
const TOTAL_ROW_HEIGHT = ITEM_HEIGHT + SEPARATOR_HEIGHT;

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
  const { t, n, content, language } = useI18n();
  const directionalRow = rowStyle(language);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.surahItem,
        directionalRow,
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
      {/* Meta + badge sit on the reading-start side; chevron on the end. */}
      <View style={[styles.metaContainer, { flexShrink: 0 }]}>
        <View style={[styles.metaRow, directionalRow]}>
          <MaterialIcons
            name={surah.revelation === 'meccan' ? 'brightness-5' : 'brightness-2'}
            size={12}
            color={theme.textSecondary}
          />
          <CenteredText style={[styles.metaText, { color: theme.textSecondary }]}>
            {surah.revelation === 'meccan' ? t('quran.meccan') : t('quran.medinan')}
          </CenteredText>
        </View>
        <CenteredText style={[styles.ayahCount, { color: theme.textSecondary }]}>
          {t('quran.ayahs', { count: n(surah.ayahCount) })}
        </CenteredText>
      </View>

      <View style={[styles.islamicBadgeContainer, { flexShrink: 0 }]}>
        <View style={[styles.decorativeRing, { borderColor: theme.surahHeader }]} />
        <View style={[styles.decorativeRingMiddle, { borderColor: `${theme.surahHeader}80` }]} />
        <View style={[styles.numberContainer, { backgroundColor: theme.surahHeader }]}>
          <NumericText style={styles.numberText}>{toArabicNumerals(surah.number)}</NumericText>
        </View>
        <View style={[styles.cornerDeco, styles.cornerTopLeft, { borderColor: theme.surahHeader }]} />
        <View style={[styles.cornerDeco, styles.cornerTopRight, { borderColor: theme.surahHeader }]} />
        <View style={[styles.cornerDeco, styles.cornerBottomLeft, { borderColor: theme.surahHeader }]} />
        <View style={[styles.cornerDeco, styles.cornerBottomRight, { borderColor: theme.surahHeader }]} />
      </View>

      <View style={styles.infoContainer}>
        <CenteredText style={[styles.arabicName, { color: theme.text }]} numberOfLines={1} ellipsizeMode="tail">
          {t('quran.mode.surah')} {surah.arabic}
        </CenteredText>
        <CenteredText
          style={[styles.dariName, { color: theme.textSecondary }]}
          numberOfLines={2}
          ellipsizeMode="tail"
        >
          {content(surah, null)} ({content(surah, 'meaning')})
        </CenteredText>
      </View>

      <View style={{ flexShrink: 0 }}>
        <MaterialIcons name={forwardChevronName(language)} size={24} color={theme.icon} />
      </View>

      {/* Continue Reading Badge - absolute */}
      {isLastRead && (
        <View style={[styles.continueReading, { backgroundColor: theme.playing }]}>
          <MaterialIcons name="play-arrow" size={14} color="#fff" />
        </View>
      )}
    </Pressable>
  );
});

export function SurahList() {
  const { theme, themeMode, state, setHifz16Line } = useApp();
  const { t, n, language } = useI18n();
  const hifz16Line = state.preferences.hifz16Line;
  const directionalRow = rowStyle(language);
  const { position } = useReadingPosition();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [browseMode, setBrowseMode] = useState<'surah' | 'juz'>('surah');
  const [searchQuery, setSearchQuery] = useState('');
  // Header is now part of the list (no absolute overlay)

  // Filter surahs based on search
  const filteredSurahs = useMemo(() => {
    if (!searchQuery.trim()) return SURAH_NAMES;

    const query = searchQuery.trim();
    const arabicQuery = normalizeArabicForSearch(query);
    const dariQuery = normalizeDariForSearch(query);
    const pashtoQuery = normalizePashtoForSearch(query);

    return SURAH_NAMES.filter((surah) => {
      const arabicName = normalizeArabicForSearch(surah.arabic);
      const dariName = normalizeDariForSearch(surah.dari);
      const meaning = normalizeDariForSearch(surah.meaning);
      const pashtoName = normalizePashtoForSearch(surah.pashto);
      const pashtoMeaning = normalizePashtoForSearch(surah.meaningPashto);

      return (
        (arabicQuery.length >= 1 && arabicName.includes(arabicQuery)) ||
        (dariQuery.length >= 1 && (dariName.includes(dariQuery) || meaning.includes(dariQuery))) ||
        (pashtoQuery.length >= 1 && (pashtoName.includes(pashtoQuery) || pashtoMeaning.includes(pashtoQuery))) ||
        surah.number.toString() === query ||
        toArabicNumerals(surah.number).includes(query)
      );
    });
  }, [searchQuery]);

  const surahByNumber = useMemo(() => {
    return new Map(SURAH_NAMES.map((surah) => [surah.number, surah]));
  }, []);

  const filteredJuzs = useMemo(() => {
    if (!searchQuery.trim()) return JUZ_RANGES;

    const query = searchQuery.trim();
    const arabicQuery = normalizeArabicForSearch(query);
    const dariQuery = normalizeDariForSearch(query);
    const pashtoQuery = normalizePashtoForSearch(query);

    return JUZ_RANGES.filter((juz) => {
      const startSurah = surahByNumber.get(juz.startSurah);
      const endSurah = surahByNumber.get(juz.endSurah);

      return (
        juz.juzNumber.toString() === query ||
        toArabicNumerals(juz.juzNumber).includes(query) ||
        (startSurah &&
          ((arabicQuery && normalizeArabicForSearch(startSurah.arabic).includes(arabicQuery)) ||
            (dariQuery && normalizeDariForSearch(startSurah.dari).includes(dariQuery)) ||
            (pashtoQuery && normalizePashtoForSearch(startSurah.pashto).includes(pashtoQuery)))) ||
        (endSurah &&
          ((arabicQuery && normalizeArabicForSearch(endSurah.arabic).includes(arabicQuery)) ||
            (dariQuery && normalizeDariForSearch(endSurah.dari).includes(dariQuery)) ||
            (pashtoQuery && normalizePashtoForSearch(endSurah.pashto).includes(pashtoQuery))))
      );
    });
  }, [searchQuery, surahByNumber]);

  const handleSurahPress = useCallback((surahNumber: number) => {
    router.push(`/quran/${surahNumber}`);
  }, [router]);

  const handleJuzPress = useCallback((juzNumber: number) => {
    if (hifz16Line) {
      const start = findHifzJuzStartAyah(juzNumber);
      if (start) {
        router.push(`/quran/${start.surah}?ayah=${start.ayah}`);
        return;
      }
    }
    router.push(`/quran/juz/${juzNumber}`);
  }, [hifz16Line, router]);

  const handleContinueReading = useCallback(() => {
    if (position.surahNumber <= 0 || position.ayahNumber <= 0) {
      return;
    }

    const jumpToken = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    router.push({
      pathname: '/quran/[surah]',
      params: {
        surah: String(position.surahNumber),
        ayah: String(position.ayahNumber),
        jump: 'continue',
        jumpToken,
      },
    });
  }, [router, position.ayahNumber, position.surahNumber]);

  const handleBrowseModeChange = useCallback((mode: 'surah' | 'juz') => {
    setBrowseMode(mode);
    setSearchQuery('');
  }, []);

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

  const headerPaddingTop = insets.top;

  const headerContent = (
    <LinearGradient
      colors={NAAT_GRADIENT[themeMode] || NAAT_GRADIENT.light}
      style={styles.headerWrapper}
    >
      <View style={[styles.header, { paddingTop: headerPaddingTop }]}>
        <CenteredText style={styles.headerTitle}>القرآن الکریم</CenteredText>
        <CenteredText style={styles.headerSubtitle}>
          {hifz16Line ? t('quran.reading.subtitle.hifz16') : t('quran.reading.subtitle.translation')}
        </CenteredText>
      </View>

      {position.surahNumber > 0 && (
        <Pressable
          onPress={handleContinueReading}
          testID="quran-continue-reading"
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.continueCard,
            directionalRow,
            { backgroundColor: theme.card, borderColor: theme.playing },
            pressed && styles.continueCardPressed,
          ]}
        >
          <View style={styles.continueIconSlot}>
            <MaterialIcons name="bookmark" size={24} color={theme.playing} />
          </View>
          <View style={styles.continueInfo}>
            <CenteredText
              testID="quran-continue-title"
              numberOfLines={1}
              adjustsFontSizeToFit
              style={[styles.continueTitle, { color: theme.text }]}
            >
              {t('quran.continue')}
            </CenteredText>
            <CenteredText
              numberOfLines={1}
              adjustsFontSizeToFit
              style={[styles.continueDetails, { color: theme.textSecondary }]}
            >
              {t('quran.mode.surah')} {n(position.surahNumber)} • {t('quran.ayah', { number: n(position.ayahNumber) })}
            </CenteredText>
          </View>
          <View style={[styles.continueIconSlot, styles.continuePlaySlot]}>
            <MaterialIcons name="play-circle-filled" size={36} color={theme.playing} />
          </View>
        </Pressable>
      )}

      <View style={[styles.modeToggle, directionalRow, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
        <Pressable
          testID="quran-reading-translation"
          accessibilityLabel={t('quran.reading.translation')}
          onPress={() => setHifz16Line(false)}
          style={[
            styles.modeButton,
            { backgroundColor: !hifz16Line ? theme.tint : 'transparent' },
          ]}
        >
          <CenteredText style={[styles.modeButtonText, { color: !hifz16Line ? '#fff' : theme.textSecondary }]}>
            {t('quran.reading.translation')}
          </CenteredText>
        </Pressable>
        <Pressable
          testID="quran-reading-hifz16"
          accessibilityLabel={t('quran.hifz16.hint')}
          onPress={() => setHifz16Line(true)}
          style={[
            styles.modeButton,
            { backgroundColor: hifz16Line ? theme.tint : 'transparent' },
          ]}
        >
          <CenteredText style={[styles.modeButtonText, { color: hifz16Line ? '#fff' : theme.textSecondary }]}>
            {t('quran.reading.hifz16')}
          </CenteredText>
        </Pressable>
      </View>

      <View style={[styles.modeToggle, directionalRow, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
        <Pressable
          onPress={() => handleBrowseModeChange('surah')}
          style={[
            styles.modeButton,
            { backgroundColor: browseMode === 'surah' ? theme.tint : 'transparent' },
          ]}
        >
          <CenteredText style={[styles.modeButtonText, { color: browseMode === 'surah' ? '#fff' : theme.textSecondary }]}>
            {t('quran.mode.surah')}
          </CenteredText>
        </Pressable>
        <Pressable
          onPress={() => handleBrowseModeChange('juz')}
          style={[
            styles.modeButton,
            { backgroundColor: browseMode === 'juz' ? theme.tint : 'transparent' },
          ]}
        >
          <CenteredText style={[styles.modeButtonText, { color: browseMode === 'juz' ? '#fff' : theme.textSecondary }]}>
            {t('quran.mode.juz')}
          </CenteredText>
        </Pressable>
      </View>

      <View style={[styles.searchContainer, directionalRow, { backgroundColor: theme.backgroundSecondary }]}>
        <MaterialIcons name="search" size={20} color={theme.icon} />
        <LocalizedTextInput
          style={[styles.searchInput, { color: theme.text }]}
          placeholder={
            browseMode === 'juz' ? t('quran.search.juzPlaceholder') : t('quran.search.surahPlaceholder')
          }
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
    </LinearGradient>
  );

  return (
    <View
      testID="ios-home-ready"
      style={[styles.container, { backgroundColor: (NAAT_GRADIENT[themeMode] || NAAT_GRADIENT.light)[0] }]}
    >
      <StatusBar style="light" />
      {browseMode === 'surah' ? (
        <Animated.FlatList
          data={filteredSurahs}
          keyExtractor={(item) => `surah-${item.number}`}
          renderItem={renderSurah}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={headerContent}
          contentContainerStyle={styles.listContent}
          style={[styles.list, { backgroundColor: theme.background }]}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          scrollEventThrottle={16}
          removeClippedSubviews={Platform.OS === 'android'}
          initialNumToRender={8}
          maxToRenderPerBatch={6}
          windowSize={5}
          getItemLayout={(_, index) =>
            index < 0
              ? { index: 0, length: 0, offset: 0 }
              : {
                  length: TOTAL_ROW_HEIGHT,
                  offset: TOTAL_ROW_HEIGHT * index,
                  index,
                }
          }
          updateCellsBatchingPeriod={50}
          maintainVisibleContentPosition={null}
          contentInsetAdjustmentBehavior="never"
        />
      ) : (
        <Animated.ScrollView
          style={[styles.list, { backgroundColor: theme.background }]}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          contentInsetAdjustmentBehavior="never"
        >
          {headerContent}
          <View style={styles.juzListWrapper}>
            <JuzList
              juzItems={filteredJuzs}
              currentPosition={position}
              onPressJuz={(juz) => handleJuzPress(juz.juzNumber)}
            />
          </View>
        </Animated.ScrollView>
      )}

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
    fontFamily: getUthmaniFont(),
    writingDirection: 'rtl',
  },
  headerSubtitle: {
    fontSize: Typography.ui.body,
    color: 'rgba(255,255,255,0.8)',
    marginTop: Spacing.xs,
    fontFamily: 'Vazirmatn',
  },
  continueCard: {
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: Spacing.md,
    marginTop: Spacing.sm,
    marginBottom: Spacing.sm,
    minHeight: 72,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  continueCardPressed: {
    opacity: 0.9,
  },
  continueIconSlot: {
    width: 40,
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  continueInfo: {
    flex: 1,
    minWidth: 0,
    paddingHorizontal: Spacing.xs,
    justifyContent: 'center',
    alignItems: 'center',
  },
  continueTitle: {
    width: '100%',
    fontSize: Typography.ui.body,
    fontWeight: '600',
    fontFamily: 'Vazirmatn',
    lineHeight: 23,
    textAlign: 'center',
  },
  continueDetails: {
    width: '100%',
    fontSize: Typography.ui.caption,
    fontFamily: 'Vazirmatn',
    lineHeight: 18,
    textAlign: 'center',
  },
  continuePlaySlot: {
    alignItems: 'flex-start',
  },
  searchContainer: {
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
  modeToggle: {
    alignItems: 'center',
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
    padding: 4,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    gap: 4,
  },
  modeButton: {
    flex: 1,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeButtonText: {
    fontSize: Typography.ui.subtitle,
    fontFamily: 'Vazirmatn',
    fontWeight: '600',
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
  juzListWrapper: {
    paddingHorizontal: Spacing.md,
  },
  surahItem: {
    alignItems: 'center',
    height: ITEM_HEIGHT,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
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
    lineHeight: 22,
    includeFontPadding: false,
  },
  infoContainer: {
    flex: 1,
    alignItems: 'center', // Center-aligned for surah names
    justifyContent: 'center',
  },
  arabicName: {
    fontSize: Typography.ui.title,
    fontWeight: '600',
    fontFamily: getUthmaniFont(),
    textAlign: 'center',
    writingDirection: 'rtl',
    width: '100%',
  },
  dariName: {
    fontSize: Typography.ui.caption,
    marginTop: 2,
    fontFamily: 'Vazirmatn',
    textAlign: 'center',
    writingDirection: 'rtl',
    width: '100%',
  },
  metaContainer: {
    alignItems: 'flex-start', // Far left in RTL
    justifyContent: 'center',
    minWidth: 70,
  },
  metaRow: {
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
