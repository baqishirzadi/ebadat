import React, { useMemo, useRef, useState } from 'react';
import {
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useAhadith } from '@/context/AhadithContext';
import { useApp } from '@/context/AppContext';
import { DailyHadithSelection, Hadith } from '@/types/hadith';
import { HadithSectionTabs } from '@/components/ahadith/HadithSectionTabs';
import { DailyHadithCard } from '@/components/ahadith/DailyHadithCard';
import { MuttafaqList } from '@/components/ahadith/MuttafaqList';
import { TopicBrowser } from '@/components/ahadith/TopicBrowser';
import { HadithSearch } from '@/components/ahadith/HadithSearch';
import { HadithShareCanvas } from '@/components/ahadith/HadithShareCanvas';
import { HadithNotificationTimePicker } from '@/components/ahadith/HadithNotificationTimePicker';
import { shareHadithCard } from '@/utils/ahadith/shareCard';
import { alphaColor } from '@/utils/ahadith/theme';
import CenteredText from '@/components/CenteredText';

function buildFocusedSelection(hadith: Hadith): DailyHadithSelection {
  return {
    hadith,
    reason: 'daily_index',
    context: {
      gregorianDate: new Date(),
      epochDay: 0,
      weekday: new Date().getDay(),
      hijri: { year: 0, month: 0, day: 0 },
      specialDayKeys: [],
      isFriday: false,
    },
  };
}

export function AhadithScreen() {
  const params = useLocalSearchParams<{ section?: string }>();
  const { theme } = useApp();
  const {
    dailySelection,
    section,
    setSection,
    goToNextDay,
    goToPreviousDay,
    refreshDaily,
    isRefreshing,
    isLoading,
    toggleBookmark,
    isBookmarked,
    muttafaqHadiths,
    topics,
    selectedTopic,
    setSelectedTopic,
    topicHadiths,
    searchQuery,
    setSearchQuery,
    searchResults,
    notificationPrefs,
    setNotificationTime,
    setNotificationsEnabled,
  } = useAhadith();

  React.useEffect(() => {
    if (params.section === 'daily') {
      setSection('daily');
    }
  }, [params.section, setSection]);

  const [focusedHadith, setFocusedHadith] = useState<Hadith | null>(null);
  const shareCanvasRef = useRef<View | null>(null);

  const activeSelection = useMemo(
    () => (focusedHadith ? buildFocusedSelection(focusedHadith) : dailySelection),
    [dailySelection, focusedHadith]
  );

  const handleShare = async () => {
    if (!activeSelection) return;

    await shareHadithCard({
      captureRef: shareCanvasRef,
      fallbackMessage: `${activeSelection.hadith.arabic_text}\n\n${activeSelection.hadith.dari_translation}\n\nSahih ${activeSelection.hadith.source_book} ${activeSelection.hadith.source_number}`,
    });
  };

  const handleOpenHadith = (hadith: Hadith) => {
    setFocusedHadith(hadith);
  };

  if (isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: theme.background }]}> 
        <CenteredText style={[styles.loadingText, { color: theme.textSecondary }]}>در حال بارگذاری احادیث...</CenteredText>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}> 
      <Stack.Screen
        options={{
          title: 'احادیث',
          headerStyle: { backgroundColor: theme.primary },
          headerTintColor: theme.surface,
          headerTitleStyle: {
            fontFamily: 'Vazirmatn-Bold',
          },
        }}
      />

      <View style={styles.headerWrap}>
        <HadithSectionTabs activeSection={section} onChange={setSection} />
      </View>

      {section === 'daily' ? (
        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.dailyContent}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={refreshDaily} tintColor={theme.primary} />}
        >
          {activeSelection ? (
            <DailyHadithCard
              selection={activeSelection}
              isBookmarked={isBookmarked(activeSelection.hadith.id)}
              onToggleBookmark={(id) => void toggleBookmark(id)}
              onShare={handleShare}
              onSwipeNext={goToNextDay}
              onSwipePrevious={goToPreviousDay}
            />
          ) : null}

          <HadithNotificationTimePicker
            prefs={notificationPrefs}
            onSaveTime={setNotificationTime}
            onToggleEnabled={setNotificationsEnabled}
          />

          <View style={[styles.tipBox, { backgroundColor: theme.surface, borderColor: alphaColor(theme.primary, 0.2) }]}> 
            <CenteredText style={[styles.tipText, { color: theme.textSecondary }]}> 
              با کشیدن کارت به چپ/راست، حدیث روز بعد و قبل را ببینید.
            </CenteredText>
          </View>
        </ScrollView>
      ) : null}

      {section === 'muttafaq' ? (
        <View style={styles.sectionContent}>
          <MuttafaqList items={muttafaqHadiths} onOpen={handleOpenHadith} />
        </View>
      ) : null}

      {section === 'topics' ? (
        <View style={styles.sectionContent}>
          <TopicBrowser
            topics={topics}
            selectedTopic={selectedTopic}
            topicHadiths={topicHadiths}
            onSelectTopic={setSelectedTopic}
            onOpenHadith={handleOpenHadith}
          />
        </View>
      ) : null}

      {section === 'search' ? (
        <View style={styles.sectionContent}>
          <HadithSearch
            query={searchQuery}
            results={searchResults}
            onChangeQuery={setSearchQuery}
            onOpenHadith={handleOpenHadith}
          />
        </View>
      ) : null}

      {activeSelection ? (
        <View style={styles.hiddenShareCanvas} pointerEvents="none">
          <HadithShareCanvas ref={shareCanvasRef} hadith={activeSelection.hadith} />
        </View>
      ) : null}

      <Modal visible={!!focusedHadith} transparent animationType="fade" onRequestClose={() => setFocusedHadith(null)}>
        <View style={[styles.modalBackdrop, { backgroundColor: alphaColor(theme.textPrimary, 0.45) }]}> 
          <View style={[styles.modalCard, { backgroundColor: theme.background, borderColor: alphaColor(theme.primary, 0.28) }]}> 
            <Pressable onPress={() => setFocusedHadith(null)} style={styles.closeButton}>
              <MaterialIcons name="close" size={22} color={theme.primary} />
            </Pressable>

            {focusedHadith ? (
              <ScrollView>
                <CenteredText style={[styles.modalArabic, { color: theme.textPrimary }]}>{focusedHadith.arabic_text}</CenteredText>
                <CenteredText style={[styles.modalDari, { color: theme.textPrimary }]}>{focusedHadith.dari_translation}</CenteredText>
                <CenteredText style={[styles.modalPashto, { color: theme.textSecondary }]}>{focusedHadith.pashto_translation}</CenteredText>
                <CenteredText style={[styles.modalSource, { color: theme.primary }]}>
                  {`Sahih ${focusedHadith.source_book} ${focusedHadith.source_number}`}
                </CenteredText>
              </ScrollView>
            ) : null}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontFamily: 'Vazirmatn',
    fontSize: 14,
  },
  headerWrap: {
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 8,
  },
  content: {
    flex: 1,
  },
  sectionContent: {
    flex: 1,
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  dailyContent: {
    paddingHorizontal: 12,
    paddingBottom: 18,
    gap: 12,
  },
  tipBox: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
  },
  tipText: {
    fontFamily: 'Vazirmatn',
    fontSize: 12,
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  hiddenShareCanvas: {
    position: 'absolute',
    left: -9999,
    top: -9999,
    opacity: 0,
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'center',
    padding: 16,
  },
  modalCard: {
    maxHeight: '84%',
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
  },
  closeButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignSelf: 'flex-start',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalArabic: {
    marginTop: 6,
    fontSize: 30,
    lineHeight: 58,
    textAlign: 'right',
    writingDirection: 'rtl',
    fontFamily: 'ScheherazadeNew',
  },
  modalDari: {
    marginTop: 14,
    fontSize: 18,
    lineHeight: 30,
    textAlign: 'right',
    writingDirection: 'rtl',
    fontFamily: 'Vazirmatn',
  },
  modalPashto: {
    marginTop: 12,
    fontSize: 16,
    lineHeight: 28,
    textAlign: 'right',
    writingDirection: 'rtl',
    fontFamily: 'Amiri',
  },
  modalSource: {
    marginTop: 14,
    textAlign: 'center',
    fontSize: 13,
    fontFamily: 'Vazirmatn-Bold',
  },
});
