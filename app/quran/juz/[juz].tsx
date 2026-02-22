import AppCenteredText from '@/components/CenteredText';
import { AudioPlayer, AyahRow, SurahDecoratedCard } from '@/components/quran';
import { Spacing, Typography } from '@/constants/theme';
import { useApp, useReadingPosition } from '@/context/AppContext';
import { getJuzRange } from '@/data/juzRanges';
import { getSurah as getSurahName, toArabicNumerals } from '@/data/surahNames';
import { useQuranData } from '@/hooks/useQuranData';
import { Ayah, TranslationLanguage } from '@/types/quran';
import { audioManager, getQuranPlaybackErrorMessage } from '@/utils/quranAudio';
import { MaterialIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  Alert,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  View,
  ViewToken,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type JuzAyahItem = {
  surahNumber: number;
  ayah: Ayah;
  dariTranslation?: string;
  pashtoTranslation?: string;
  surahAyahCount: number;
};

type JuzSection = {
  surahNumber: number;
  surahName: string;
  startAyah: number;
  endAyah: number;
  data: JuzAyahItem[];
};

type JuzListItem =
  | {
      type: 'surahHeader';
      key: string;
      section: JuzSection;
      ayahCount: number;
    }
  | {
      type: 'bismillah';
      key: string;
      surahNumber: number;
    }
  | {
      type: 'ayah';
      key: string;
      ayahItem: JuzAyahItem;
    };

const AYAH_FOLLOW_VIEW_POSITION = 0;
const JUZ_TOP_BAR_HEIGHT = 60;
const AYAH_FOLLOW_EXTRA_TOP_OFFSET = 8;
const FOLLOW_HARD_SNAP_DELAY = 120;

export default function JuzReaderScreen() {
  const { juz: juzParam } = useLocalSearchParams<{ juz: string }>();
  const navigation = useNavigation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme, state, setTranslationLanguage } = useApp();
  const { updatePosition } = useReadingPosition();
  const { getAyahsByJuz, getTranslation } = useQuranData();

  const juzNumber = Math.min(30, Math.max(1, parseInt(juzParam || '1', 10) || 1));
  const [juzRange, setJuzRange] = useState(() => getJuzRange(juzNumber));
  const [currentVisibleSurahNumber, setCurrentVisibleSurahNumber] = useState<number>(
    () => getJuzRange(juzNumber)?.startSurah ?? juzNumber
  );

  const [currentlyPlaying, setCurrentlyPlaying] = useState<{ surah: number; ayah: number } | null>(null);
  const [showAudioPlayer, setShowAudioPlayer] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const flatListRef = useRef<FlatList<JuzListItem>>(null);
  const pendingScrollTargetRef = useRef<{ surah: number; ayah: number } | null>(null);
  const activeFollowRequestIdRef = useRef(0);
  const followRetryTimeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const lastFirstVisibleAyahRef = useRef<string | null>(null);
  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 50, minimumViewTime: 500 });
  const ayahFollowViewOffset = insets.top + JUZ_TOP_BAR_HEIGHT + AYAH_FOLLOW_EXTRA_TOP_OFFSET;
  const currentTranslation = state.preferences.showTranslation;
  const translationOptions: { key: TranslationLanguage; label: string }[] = useMemo(
    () => [
      { key: 'dari', label: 'دری' },
      { key: 'pashto', label: 'پښتو' },
      { key: 'both', label: 'هردو' },
      { key: 'none', label: 'بدون ترجمه' },
    ],
    []
  );

  const sections = useMemo<JuzSection[]>(() => {
    const bySurah = new Map<number, JuzSection>();
    const items = getAyahsByJuz(juzNumber);

    for (const entry of items) {
      const surahNumber = entry.surah.number;
      const existing = bySurah.get(surahNumber);
      const row: JuzAyahItem = {
        surahNumber,
        ayah: entry.ayah,
        dariTranslation: getTranslation(surahNumber, entry.ayah.number, 'dari'),
        pashtoTranslation: getTranslation(surahNumber, entry.ayah.number, 'pashto'),
        surahAyahCount: entry.surah.ayahCount,
      };

      if (!existing) {
        bySurah.set(surahNumber, {
          surahNumber,
          surahName: getSurahName(surahNumber)?.arabic || entry.surah.name,
          startAyah: entry.ayah.number,
          endAyah: entry.ayah.number,
          data: [row],
        });
      } else {
        existing.data.push(row);
        existing.endAyah = entry.ayah.number;
      }
    }

    return Array.from(bySurah.values()).sort((a, b) => a.surahNumber - b.surahNumber);
  }, [getAyahsByJuz, getTranslation, juzNumber]);

  const { flatItems, ayahFlatIndexMap } = useMemo(() => {
    const nextFlatItems: JuzListItem[] = [];
    const nextAyahIndexMap = new Map<string, number>();

    for (const section of sections) {
      const ayahCount = section.endAyah - section.startAyah + 1;
      nextFlatItems.push({
        type: 'surahHeader',
        key: `surah-header-${section.surahNumber}`,
        section,
        ayahCount,
      });

      const shouldShowBismillah = section.startAyah === 1 && section.surahNumber !== 1 && section.surahNumber !== 9;
      if (shouldShowBismillah) {
        nextFlatItems.push({
          type: 'bismillah',
          key: `bismillah-${section.surahNumber}`,
          surahNumber: section.surahNumber,
        });
      }

      for (const ayahItem of section.data) {
        const ayahKey = `${ayahItem.surahNumber}:${ayahItem.ayah.number}`;
        nextAyahIndexMap.set(ayahKey, nextFlatItems.length);
        nextFlatItems.push({
          type: 'ayah',
          key: `ayah-${ayahKey}`,
          ayahItem,
        });
      }
    }

    return { flatItems: nextFlatItems, ayahFlatIndexMap: nextAyahIndexMap };
  }, [sections]);

  const getAyahKey = useCallback((surah: number, ayah: number) => `${surah}:${ayah}`, []);

  const clearFollowRetryTimeouts = useCallback(() => {
    if (followRetryTimeoutsRef.current.length === 0) return;
    followRetryTimeoutsRef.current.forEach((timeoutId) => clearTimeout(timeoutId));
    followRetryTimeoutsRef.current = [];
  }, []);

  const followAyahToTop = useCallback(
    (surah: number, ayah: number, animated = true) => {
      const ayahKey = getAyahKey(surah, ayah);
      const targetIndex = ayahFlatIndexMap.get(ayahKey);
      if (targetIndex == null) return;

      pendingScrollTargetRef.current = { surah, ayah };
      activeFollowRequestIdRef.current += 1;
      const requestId = activeFollowRequestIdRef.current;
      clearFollowRetryTimeouts();

      const scrollToTarget = (shouldAnimate: boolean) => {
        flatListRef.current?.scrollToIndex({
          index: targetIndex,
          viewPosition: AYAH_FOLLOW_VIEW_POSITION,
          viewOffset: ayahFollowViewOffset,
          animated: shouldAnimate,
        });
      };

      scrollToTarget(animated);

      const hardSnapTimeout = setTimeout(() => {
        if (activeFollowRequestIdRef.current !== requestId) return;
        if (lastFirstVisibleAyahRef.current === ayahKey) return;
        scrollToTarget(false);
      }, FOLLOW_HARD_SNAP_DELAY);

      followRetryTimeoutsRef.current.push(hardSnapTimeout);
    },
    [ayahFlatIndexMap, ayahFollowViewOffset, clearFollowRetryTimeouts, getAyahKey]
  );

  const handleScrollToIndexFailed = useCallback(
    (info: { index: number; highestMeasuredFrameIndex: number; averageItemLength: number }) => {
      const pending = pendingScrollTargetRef.current;
      if (!pending) return;

      const nearIndex = Math.max(0, Math.min(info.index, info.highestMeasuredFrameIndex));
      flatListRef.current?.scrollToIndex({
        index: nearIndex,
        viewPosition: AYAH_FOLLOW_VIEW_POSITION,
        viewOffset: ayahFollowViewOffset,
        animated: false,
      });

      const retryTimeout = setTimeout(() => {
        const latestPending = pendingScrollTargetRef.current;
        if (!latestPending) return;
        followAyahToTop(latestPending.surah, latestPending.ayah, true);
      }, FOLLOW_HARD_SNAP_DELAY);

      followRetryTimeoutsRef.current.push(retryTimeout);
    },
    [ayahFollowViewOffset, followAyahToTop]
  );

  const handleHeaderBack = useCallback(() => {
    if (navigation.canGoBack()) {
      router.back();
      return;
    }

    router.replace('/(tabs)');
  }, [navigation, router]);

  useEffect(() => {
    const range = getJuzRange(juzNumber);
    setJuzRange(range);
    setCurrentVisibleSurahNumber(range?.startSurah ?? juzNumber);
    activeFollowRequestIdRef.current += 1;
    clearFollowRetryTimeouts();
    pendingScrollTargetRef.current = null;
    lastFirstVisibleAyahRef.current = null;
  }, [clearFollowRetryTimeouts, juzNumber]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: false,
    });
  }, [navigation]);

  const followAyahToTopRef = useRef(followAyahToTop);
  useEffect(() => {
    followAyahToTopRef.current = followAyahToTop;
  }, [followAyahToTop]);

  useEffect(() => {
    audioManager.setOnAyahChange((surah, ayah) => {
      setCurrentlyPlaying({ surah, ayah });
      setShowAudioPlayer(true);
      setIsPlaying(true);
      followAyahToTopRef.current(surah, ayah, true);
    });

    audioManager.setOnPlaybackEnd(() => {
      setIsPlaying(false);
      setCurrentlyPlaying(null);
      setShowAudioPlayer(false);
    });

    void audioManager.initialize();

    return () => {
      activeFollowRequestIdRef.current += 1;
      clearFollowRetryTimeouts();
      void audioManager.stop();
    };
  }, [clearFollowRetryTimeouts]);

  const handlePlayAyah = useCallback(
    (item: JuzAyahItem) => {
      const isSameAyah = currentlyPlaying?.surah === item.surahNumber && currentlyPlaying?.ayah === item.ayah.number;

      if (isSameAyah && audioManager.getIsPlaying()) {
        setIsPlaying(false);
        setCurrentlyPlaying(null);
        setShowAudioPlayer(false);
        void audioManager.stop();
        return;
      }

      if (
        isSameAyah &&
        !audioManager.getIsPlaying() &&
        audioManager.getCurrentSurah() === item.surahNumber &&
        audioManager.getCurrentAyah() === item.ayah.number
      ) {
        setIsPlaying(true);
        setShowAudioPlayer(true);
        void audioManager.resume();
        return;
      }

      setIsPlaying(true);
      setShowAudioPlayer(true);
      void audioManager
        .playAyah(item.surahNumber, item.ayah.number, item.surahAyahCount, true)
        .catch((error) => {
          Alert.alert('پخش آیه', getQuranPlaybackErrorMessage(error));
        });
    },
    [currentlyPlaying]
  );

  const surahAyahCountBySurah = useMemo(() => {
    const map = new Map<number, number>();
    for (const section of sections) {
      const ayahCount = section.data[0]?.surahAyahCount;
      if (ayahCount) {
        map.set(section.surahNumber, ayahCount);
      }
    }
    return map;
  }, [sections]);

  const handlePlayContinuous = useCallback(() => {
    if (!currentlyPlaying) return;
    const totalAyahs = surahAyahCountBySurah.get(currentlyPlaying.surah);
    if (!totalAyahs) return;

    setIsPlaying(true);
    void audioManager
      .playAyah(currentlyPlaying.surah, currentlyPlaying.ayah, totalAyahs, true)
      .catch((error) => {
        Alert.alert('پخش آیه', getQuranPlaybackErrorMessage(error));
      });
  }, [currentlyPlaying, surahAyahCountBySurah]);

  const handlePause = useCallback(() => {
    setIsPlaying(false);
    void audioManager.pause();
  }, []);

  const handleResume = useCallback(() => {
    setIsPlaying(true);
    void audioManager.resume();
  }, []);

  const handleStop = useCallback(() => {
    setIsPlaying(false);
    setCurrentlyPlaying(null);
    setShowAudioPlayer(false);
    void audioManager.stop();
  }, []);

  const handleAudioClose = useCallback(() => {
    handleStop();
  }, [handleStop]);

  const handleOpenFullSurah = useCallback(
    (section: JuzSection) => {
      router.push(`/quran/${section.surahNumber}?ayah=${section.startAyah}`);
    },
    [router]
  );

  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken<JuzListItem>[] }) => {
      const firstVisibleAyah = viewableItems.find(
        (token) => token.isViewable && token.item?.type === 'ayah'
      );
      if (!firstVisibleAyah?.item || firstVisibleAyah.item.type !== 'ayah') return;

      const { surahNumber, ayah } = firstVisibleAyah.item.ayahItem;
      lastFirstVisibleAyahRef.current = getAyahKey(surahNumber, ayah.number);
      setCurrentVisibleSurahNumber((prev) => (prev === surahNumber ? prev : surahNumber));
      updatePosition({
        surahNumber,
        ayahNumber: ayah.number,
        page: ayah.page,
      });
    },
    [getAyahKey, updatePosition]
  );

  const renderSurahHeader = useCallback(
    (section: JuzSection, ayahCount: number) => {
      return (
        <SurahDecoratedCard
          surahNumber={section.surahNumber}
          title={`سوره ${section.surahName}`}
          subtitle={`از آیه ${toArabicNumerals(section.startAyah)} تا آیه ${toArabicNumerals(section.endAyah)}`}
          metaIcon="menu-book"
          metaTop={`داخل جزء ${toArabicNumerals(juzNumber)}`}
          metaBottom={`${toArabicNumerals(ayahCount)} آیه`}
          actionIcon="open-in-new"
          onPress={() => handleOpenFullSurah(section)}
          style={styles.sectionHeaderCard}
        />
      );
    },
    [handleOpenFullSurah, juzNumber]
  );

  const renderBismillah = useCallback(() => {
    const bismillahColor = theme.bismillah || theme.playing;

    return (
      <View
        style={[
          styles.bismillahContainer,
          {
            backgroundColor: theme.backgroundSecondary,
            borderColor: `${theme.playing}59`,
          },
        ]}
      >
        <View style={[styles.bismillahTopLine, { backgroundColor: `${theme.playing}40` }]} />
        <View style={[styles.bismillahBottomLine, { backgroundColor: `${theme.playing}40` }]} />
        <View style={[styles.bismillahOrnamentLeft, { backgroundColor: `${theme.playing}6B` }]} />
        <View style={[styles.bismillahOrnamentRight, { backgroundColor: `${theme.playing}6B` }]} />

        <Text style={[styles.bismillahText, { color: bismillahColor }]}>بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ</Text>
      </View>
    );
  }, [theme.backgroundSecondary, theme.bismillah, theme.playing]);

  const renderItem = useCallback(
    ({ item }: { item: JuzListItem }) => {
      if (item.type === 'surahHeader') {
        return renderSurahHeader(item.section, item.ayahCount);
      }

      if (item.type === 'bismillah') {
        return renderBismillah();
      }

      const ayahItem = item.ayahItem;
      const isAyahPlaying =
        currentlyPlaying?.surah === ayahItem.surahNumber && currentlyPlaying?.ayah === ayahItem.ayah.number;

      return (
        <AyahRow
          ayah={ayahItem.ayah}
          surahNumber={ayahItem.surahNumber}
          dariTranslation={ayahItem.dariTranslation}
          pashtoTranslation={ayahItem.pashtoTranslation}
          isPlaying={isAyahPlaying}
          onPlayPress={() => handlePlayAyah(ayahItem)}
        />
      );
    },
    [currentlyPlaying, handlePlayAyah, renderBismillah, renderSurahHeader]
  );

  if (!juzRange || sections.length === 0) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: theme.background }]}>
        <AppCenteredText style={[styles.errorText, { color: theme.textSecondary }]}>جزء یافت نشد</AppCenteredText>
      </View>
    );
  }

  const currentSurahArabic = getSurahName(currentVisibleSurahNumber)?.arabic ?? '';

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar
        barStyle="light-content"
        backgroundColor={theme.surahHeader}
      />

      <View
        style={[
          styles.topBar,
          {
            paddingTop: insets.top,
            height: insets.top + JUZ_TOP_BAR_HEIGHT,
            backgroundColor: theme.surahHeader,
          },
        ]}
      >
        <Pressable
          onPress={handleHeaderBack}
          hitSlop={8}
          style={styles.topBarBackButton}
        >
          <MaterialIcons name="arrow-forward" size={24} color="#fff" />
        </Pressable>
        <Text style={styles.topBarTitle} numberOfLines={1} ellipsizeMode="tail">
          جزء {toArabicNumerals(juzNumber)} • سوره {currentSurahArabic}
        </Text>
        <View style={styles.topBarSpacer} />
      </View>

      <FlatList
        ref={flatListRef}
        ListHeaderComponent={
          <View style={[styles.translationToggle, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
            <Text style={[styles.toggleLabel, { color: theme.textSecondary }]}>ترجمه:</Text>
            <View style={styles.toggleButtons}>
              {translationOptions.map((option) => (
                <Pressable
                  key={option.key}
                  onPress={() => setTranslationLanguage(option.key)}
                  style={[
                    styles.toggleButton,
                    {
                      backgroundColor: currentTranslation === option.key ? theme.tint : theme.backgroundSecondary,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.toggleButtonText,
                      { color: currentTranslation === option.key ? '#fff' : theme.text },
                    ]}
                  >
                    {option.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        }
        data={flatItems}
        keyExtractor={(item) => item.key}
        renderItem={renderItem}
        onScrollToIndexFailed={handleScrollToIndexFailed}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig.current}
        contentContainerStyle={[
          styles.listContent,
          { paddingTop: insets.top + JUZ_TOP_BAR_HEIGHT + Spacing.sm },
          showAudioPlayer && styles.listContentWithPlayer,
        ]}
        initialNumToRender={10}
        maxToRenderPerBatch={8}
        windowSize={7}
        removeClippedSubviews
        showsVerticalScrollIndicator={false}
      />

      {showAudioPlayer && currentlyPlaying && (
        <AudioPlayer
          surahNumber={currentlyPlaying.surah}
          ayahNumber={currentlyPlaying.ayah}
          totalAyahs={surahAyahCountBySurah.get(currentlyPlaying.surah) ?? 0}
          isVisible={showAudioPlayer}
          isPlaying={isPlaying}
          onPlayContinuous={handlePlayContinuous}
          onPause={handlePause}
          onResume={handleResume}
          onStop={handleStop}
          onClose={handleAudioClose}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontFamily: 'Vazirmatn',
    fontSize: Typography.ui.subtitle,
  },
  topBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    zIndex: 80,
    elevation: 80,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
  },
  topBarBackButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBarTitle: {
    flex: 1,
    marginHorizontal: Spacing.sm,
    color: '#fff',
    fontFamily: 'Vazirmatn',
    fontSize: 17,
    fontWeight: '700',
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  topBarSpacer: {
    width: 36,
    height: 36,
  },
  listContent: {
    paddingBottom: Spacing.xxl,
  },
  listContentWithPlayer: {
    paddingBottom: 180,
  },
  sectionHeaderCard: {
    marginHorizontal: Spacing.md,
    marginTop: Spacing.md,
    marginBottom: Spacing.xs,
  },
  bismillahContainer: {
    marginHorizontal: Spacing.md,
    marginTop: Spacing.xs,
    marginBottom: Spacing.sm,
    borderRadius: 16,
    borderWidth: 1,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.lg,
    paddingHorizontal: Spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    position: 'relative',
  },
  bismillahTopLine: {
    position: 'absolute',
    top: 8,
    left: 36,
    right: 36,
    height: 1.5,
    borderRadius: 1,
  },
  bismillahBottomLine: {
    position: 'absolute',
    bottom: 6,
    left: 36,
    right: 36,
    height: 1.5,
    borderRadius: 1,
  },
  bismillahOrnamentLeft: {
    position: 'absolute',
    top: 6,
    left: 14,
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  bismillahOrnamentRight: {
    position: 'absolute',
    top: 6,
    right: 14,
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  bismillahText: {
    fontFamily: 'ScheherazadeNew',
    fontSize: 30,
    lineHeight: 64,
    textAlign: 'center',
    writingDirection: 'rtl',
    includeFontPadding: false,
    paddingBottom: 8,
  },
  translationToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: Spacing.md,
    marginTop: Spacing.sm,
    padding: Spacing.sm,
    borderRadius: 12,
    borderWidth: 1,
    gap: Spacing.sm,
  },
  toggleLabel: {
    fontSize: Typography.ui.caption,
    fontFamily: 'Vazirmatn',
    marginRight: Spacing.xs,
  },
  toggleButtons: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  toggleButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: 8,
  },
  toggleButtonText: {
    fontSize: Typography.ui.caption,
    fontFamily: 'Vazirmatn',
    fontWeight: '500',
  },
});
