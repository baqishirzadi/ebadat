import React, { useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
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
import { formatSourceLabel } from '@/utils/ahadith/labels';
import CenteredText from '@/components/CenteredText';
import { verifyHadithAdminPin } from '@/utils/hadithAdminService';
import { NAAT_GRADIENT } from '@/constants/theme';

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
  const router = useRouter();
  const { theme, themeMode } = useApp();
  const insets = useSafeAreaInsets();
  const {
    hadiths,
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
    syncRemoteHadiths,
  } = useAhadith();

  React.useEffect(() => {
    if (params.section === 'daily') {
      setSection('daily');
    }
  }, [params.section, setSection]);

  const [focusedHadith, setFocusedHadith] = useState<Hadith | null>(null);
  const [showAdminPinModal, setShowAdminPinModal] = useState(false);
  const [adminPin, setAdminPin] = useState('');
  const [adminPinError, setAdminPinError] = useState<string | null>(null);
  const [submittingAdminPin, setSubmittingAdminPin] = useState(false);
  const shareCanvasRef = useRef<View | null>(null);

  useFocusEffect(
    React.useCallback(() => {
      void syncRemoteHadiths(false);
      return undefined;
    }, [syncRemoteHadiths])
  );

  const activeSelection = useMemo(
    () => (focusedHadith ? buildFocusedSelection(focusedHadith) : dailySelection),
    [dailySelection, focusedHadith]
  );

  const handleShare = async () => {
    if (!activeSelection) return;

    await shareHadithCard({
      captureRef: shareCanvasRef,
      fallbackMessage: `${activeSelection.hadith.arabic_text}\n\n${activeSelection.hadith.dari_translation}\n\n${formatSourceLabel(activeSelection.hadith.source_book, activeSelection.hadith.source_number)}`,
    });
  };

  const handleOpenHadith = (hadith: Hadith) => {
    setFocusedHadith(hadith);
  };

  const openAdminPinModal = () => {
    setAdminPin('');
    setAdminPinError(null);
    setShowAdminPinModal(true);
  };

  const closeAdminPinModal = () => {
    setShowAdminPinModal(false);
    setAdminPin('');
    setAdminPinError(null);
  };

  const handleAdminPinSubmit = async () => {
    const normalizedPin = adminPin.trim();
    if (!normalizedPin) {
      setAdminPinError('رمز را وارد کنید.');
      return;
    }

    try {
      setSubmittingAdminPin(true);
      setAdminPinError(null);
      const valid = await verifyHadithAdminPin(normalizedPin);
      if (!valid) {
        setAdminPinError('رمز نادرست است.');
        return;
      }

      closeAdminPinModal();
      router.push('/ahadith/admin' as any);
    } catch (error) {
      setAdminPinError('بررسی رمز ممکن نشد. دوباره تلاش کنید.');
      if (__DEV__) {
        console.warn('[AhadithAdmin] verify pin failed', error);
      }
    } finally {
      setSubmittingAdminPin(false);
    }
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
      <Pressable onLongPress={openAdminPinModal} delayLongPress={650}>
        <LinearGradient
          colors={NAAT_GRADIENT[themeMode] ?? NAAT_GRADIENT.light}
          style={[styles.topHeader, { paddingTop: insets.top + 12 }]}
        >
          <CenteredText style={styles.topHeaderTitle}>احادیث</CenteredText>
          <CenteredText style={styles.topHeaderSubtitle}>حدیث روز، متفق‌علیه، موضوعات و جستجو</CenteredText>
        </LinearGradient>
      </Pressable>

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
            allHadiths={hadiths}
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
                  {formatSourceLabel(focusedHadith.source_book, focusedHadith.source_number)}
                </CenteredText>
              </ScrollView>
            ) : null}
          </View>
        </View>
      </Modal>

      <Modal
        visible={showAdminPinModal}
        transparent
        animationType="fade"
        onRequestClose={closeAdminPinModal}
      >
        <View style={styles.pinModalOverlay}>
          <View
            style={[
              styles.pinModalContent,
              { backgroundColor: theme.surface, borderColor: alphaColor(theme.primary, 0.26) },
            ]}
          >
            <CenteredText style={[styles.pinModalTitle, { color: theme.textPrimary }]}>
              ورود به مدیریت احادیث
            </CenteredText>

            <TextInput
              value={adminPin}
              onChangeText={(value) => {
                setAdminPin(value);
                if (adminPinError) setAdminPinError(null);
              }}
              placeholder="رمز"
              placeholderTextColor={theme.textSecondary}
              secureTextEntry
              keyboardType="number-pad"
              maxLength={8}
              style={[
                styles.pinInput,
                {
                  borderColor: alphaColor(theme.primary, 0.24),
                  color: theme.textPrimary,
                  backgroundColor: alphaColor(theme.primary, 0.06),
                },
              ]}
              textAlign="center"
            />

            {adminPinError ? (
              <CenteredText style={styles.pinErrorText}>{adminPinError}</CenteredText>
            ) : null}

            <View style={styles.pinActions}>
              <Pressable
                onPress={handleAdminPinSubmit}
                disabled={submittingAdminPin}
                style={[styles.pinConfirmButton, { backgroundColor: theme.primary }]}
              >
                {submittingAdminPin ? (
                  <ActivityIndicator size="small" color={theme.surface} />
                ) : (
                  <CenteredText style={[styles.pinConfirmText, { color: theme.surface }]}>
                    تأیید
                  </CenteredText>
                )}
              </Pressable>
              <Pressable
                onPress={closeAdminPinModal}
                disabled={submittingAdminPin}
                style={[
                  styles.pinCancelButton,
                  {
                    borderColor: alphaColor(theme.primary, 0.24),
                    backgroundColor: theme.surface,
                  },
                ]}
              >
                <CenteredText style={[styles.pinCancelText, { color: theme.textPrimary }]}>
                  انصراف
                </CenteredText>
              </Pressable>
            </View>
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
  topHeader: {
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    paddingHorizontal: 16,
    paddingBottom: 14,
    alignItems: 'center',
    gap: 4,
  },
  topHeaderTitle: {
    color: '#ffffff',
    fontFamily: 'Vazirmatn-Bold',
    fontSize: 24,
    textAlign: 'center',
  },
  topHeaderSubtitle: {
    color: 'rgba(255,255,255,0.92)',
    fontFamily: 'Vazirmatn',
    fontSize: 12,
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  headerWrap: {
    paddingHorizontal: 12,
    paddingTop: 10,
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
    textAlign: 'center',
    writingDirection: 'rtl',
    fontFamily: 'ScheherazadeNew',
  },
  modalDari: {
    marginTop: 14,
    fontSize: 18,
    lineHeight: 30,
    textAlign: 'center',
    writingDirection: 'rtl',
    fontFamily: 'Vazirmatn',
  },
  modalPashto: {
    marginTop: 12,
    fontSize: 16,
    lineHeight: 28,
    textAlign: 'center',
    writingDirection: 'rtl',
    fontFamily: 'Amiri',
  },
  modalSource: {
    marginTop: 14,
    textAlign: 'center',
    fontSize: 13,
    fontFamily: 'Vazirmatn-Bold',
  },
  pinModalOverlay: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  pinModalContent: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  pinModalTitle: {
    fontFamily: 'Vazirmatn-Bold',
    fontSize: 16,
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  pinInput: {
    borderWidth: 1,
    borderRadius: 12,
    minHeight: 44,
    fontFamily: 'Vazirmatn',
    fontSize: 16,
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  pinErrorText: {
    fontFamily: 'Vazirmatn',
    fontSize: 12,
    color: '#D32F2F',
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  pinActions: {
    flexDirection: 'row',
    gap: 10,
  },
  pinConfirmButton: {
    flex: 1,
    minHeight: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinConfirmText: {
    fontFamily: 'Vazirmatn-Bold',
    fontSize: 14,
  },
  pinCancelButton: {
    flex: 1,
    minHeight: 42,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinCancelText: {
    fontFamily: 'Vazirmatn',
    fontSize: 14,
  },
});
