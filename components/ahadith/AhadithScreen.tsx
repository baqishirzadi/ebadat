import React, { useRef, useState } from 'react';

import { ActivityIndicator, Modal, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { LocalizedTextInput } from '@/components/ui/LocalizedText';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useAhadith } from '@/context/AhadithContext';
import { useApp } from '@/context/AppContext';
import { Hadith } from '@/types/hadith';
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
import { getHadithTranslation } from '@/utils/ahadith/translation';
import CenteredText from '@/components/CenteredText';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { verifyHadithAdminPin } from '@/utils/hadithAdminService';
import { useI18n } from '@/utils/i18n/useI18n';

export function AhadithScreen() {
  const params = useLocalSearchParams<{ section?: string }>();
  const router = useRouter();
  const { theme } = useApp();
  const { t, language } = useI18n();
  const {
    hadiths,
    dailySelection,
    dayOffset,
    section,
    setSection,
    goToNextDay,
    goToPreviousDay,
    goToToday,
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

  const activeSelection = dailySelection;

  const handleShare = async () => {
    if (!activeSelection) return;

    await shareHadithCard({
      captureRef: shareCanvasRef,
      fallbackMessage: `${activeSelection.hadith.arabic_text}\n\n${getHadithTranslation(activeSelection.hadith, language) || t('ahadith.translation.unavailable')}\n\n${formatSourceLabel(activeSelection.hadith.source_book, activeSelection.hadith.source_number, language)}`,
    });
  };

  const handleOpenHadith = (hadith: Hadith) => {
    router.push({ pathname: '/ahadith/[id]', params: { id: String(hadith.id) } } as never);
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
      setAdminPinError(t('ahadith.admin.pinRequired'));
      return;
    }

    try {
      setSubmittingAdminPin(true);
      setAdminPinError(null);
      const valid = await verifyHadithAdminPin(normalizedPin);
      if (!valid) {
        setAdminPinError(t('ahadith.admin.pinInvalid'));
        return;
      }

      closeAdminPinModal();
      router.push('/ahadith/admin' as any);
    } catch (error) {
      setAdminPinError(t('ahadith.admin.pinCheckFailed'));
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
        <CenteredText style={[styles.loadingText, { color: theme.textSecondary }]}>{t('hadith.loading')}</CenteredText>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Pressable onLongPress={openAdminPinModal} delayLongPress={650}>
        <ScreenHeader
          title={t('hadith.title')}
          subtitle={t('hadith.subtitle')}
          icon="format-quote"
        />
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
              isToday={dayOffset === 0}
              isBookmarked={isBookmarked(activeSelection.hadith.id)}
              onToggleBookmark={(id) => void toggleBookmark(id)}
              onShare={handleShare}
              onSwipeNext={goToNextDay}
              onSwipePrevious={goToPreviousDay}
              onToday={goToToday}
            />
          ) : null}

          <HadithNotificationTimePicker
            prefs={notificationPrefs}
            onSaveTime={setNotificationTime}
            onToggleEnabled={setNotificationsEnabled}
          />
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
              {t('hadith.admin.title')}
            </CenteredText>

            <LocalizedTextInput
              value={adminPin}
              onChangeText={(value) => {
                setAdminPin(value);
                if (adminPinError) setAdminPinError(null);
              }}
              placeholder={t('hadith.pin')}
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
                    {t('hadith.confirm')}
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
                  {t('common.cancel')}
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
  headerWrap: {
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 10,
  },
  content: {
    flex: 1,
  },
  sectionContent: {
    flex: 1,
    paddingHorizontal: 12,
  },
  dailyContent: {
    paddingHorizontal: 12,
    paddingBottom: 28,
    gap: 14,
  },
  hiddenShareCanvas: {
    position: 'absolute',
    left: -9999,
    top: -9999,
    opacity: 0,
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
