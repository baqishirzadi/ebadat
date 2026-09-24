/**
 * Adhan Settings Screen
 * Configure prayer notifications and Adhan sounds
 * Designed with mosque-style calm aesthetic
 */

import React, { useState, useCallback } from 'react';

import { View, StyleSheet, ScrollView, Pressable, Switch, ActivityIndicator, Alert, Platform, InteractionManager } from 'react-native';
import { LocalizedText } from '@/components/ui/LocalizedText';
import { MaterialIcons } from '@expo/vector-icons';
import { Stack, useFocusEffect } from 'expo-router';
import { usePrayer } from '@/context/PrayerContext';
import {
  AdhanVoice,
  ADHAN_VOICES,
  PrayerName,
  PRAYER_NAMES,
} from '@/utils/adhanManager';
import { testAdhanVoice, stopAdhan } from '@/utils/adhanAudio';
import { AdhanNotificationHealthPanel } from '@/components/prayer/AdhanHealthUi';
import { Typography, Spacing, BorderRadius } from '@/constants/theme';
import { useApp } from '@/context/AppContext';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { useI18n } from '@/utils/i18n/useI18n';

// Prayer order for display
const PRAYER_ORDER: PrayerName[] = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];

export default function AdhanSettingsScreen() {
  const { theme } = useApp();
  const { isPashto, t } = useI18n();
  const {
    state,
    updateAdhanPreferences,
    openNotificationSettings,
    scheduleAdhanSystemTest,
    refreshAdhanSettingsSchedule,
    requestPrayerSchedule,
  } = usePrayer();
  
  const [isTestingVoice, setIsTestingVoice] = useState<AdhanVoice | null>(null);
  const [expandedPrayer, setExpandedPrayer] = useState<PrayerName | null>(null);

  const { adhanPreferences } = state;
  const switchTrackColor = { false: theme.divider, true: theme.tint };
  const switchThumbColor = (enabled: boolean) => (enabled ? theme.accent : '#f4f3f4');
  const adhanTestStatusLabel = state.adhanTestStatus.error
    ? t('adhanSettings.status.error', { error: state.adhanTestStatus.error })
    : state.adhanTestStatus.playbackOk === true
      ? t('adhanSettings.status.started')
      : state.adhanTestStatus.playbackAttemptedAt
        ? t('adhanSettings.status.checked')
        : state.adhanTestStatus.receivedAt
          ? t('adhanSettings.status.checking')
          : state.adhanTestStatus.expectedAt
            ? t('adhanSettings.status.scheduled')
            : t('adhanSettings.status.idle');

  useFocusEffect(
    useCallback(() => {
      if (Platform.OS === 'ios') {
        refreshAdhanSettingsSchedule().catch((error) => {
          console.warn('Failed to refresh schedule on settings focus:', error);
        });
        return;
      }

      let cancelled = false;
      let timer: ReturnType<typeof setTimeout> | null = null;
      const task = InteractionManager.runAfterInteractions(() => {
        timer = setTimeout(() => {
          if (cancelled) return;
          refreshAdhanSettingsSchedule().catch((error) => {
            console.warn('Failed to refresh schedule on settings focus:', error);
          });
        }, 500);
      });

      return () => {
        cancelled = true;
        task.cancel();
        if (timer) clearTimeout(timer);
      };
    }, [refreshAdhanSettingsSchedule]),
  );

  // Toggle master notifications
  const handleMasterToggle = useCallback(async (value: boolean) => {
    await updateAdhanPreferences({ masterEnabled: value });
  }, [updateAdhanPreferences]);

  // Toggle prayer notification
  const handlePrayerNotificationToggle = useCallback(async (prayer: PrayerName, value: boolean) => {
    const currentSettings = adhanPreferences[prayer];
    await updateAdhanPreferences({
      [prayer]: { ...currentSettings, enabled: value },
    });
  }, [adhanPreferences, updateAdhanPreferences]);

  // Toggle early reminder
  const handleEarlyReminderToggle = useCallback(async (value: boolean) => {
    await updateAdhanPreferences({ earlyReminder: value });
  }, [updateAdhanPreferences]);

  const handleSystemAdhanTest = useCallback(async () => {
    const ok = await scheduleAdhanSystemTest();
    if (ok) {
      Alert.alert(t('adhanSettings.systemTestScheduledTitle'), t('adhanSettings.systemTestScheduledBody'));
      return;
    }
    Alert.alert(isPashto ? 'تېروتنه' : 'خطا', t('adhanSettings.systemTestFailure'));
  }, [scheduleAdhanSystemTest, isPashto, t]);

  const handleRecheckAndSchedule = useCallback(async () => {
    await requestPrayerSchedule('exact-recheck');
  }, [requestPrayerSchedule]);

  // Test Adhan voice
  const handleTestVoice = useCallback(async (voice: AdhanVoice, prayer?: PrayerName) => {
    if (isTestingVoice) {
      await stopAdhan();
      setIsTestingVoice(null);
      return;
    }
    
    setIsTestingVoice(voice);
    try {
      await testAdhanVoice(voice, prayer);
    } catch {
      Alert.alert(isPashto ? 'تېروتنه' : 'خطا', t('adhanSettings.voiceFailure'));
    } finally {
      setIsTestingVoice(null);
    }
  }, [isTestingVoice, isPashto, t]);

  // Render prayer card
  const renderPrayerCard = (prayer: PrayerName) => {
    const prayerInfo = PRAYER_NAMES[prayer];
    const settings = adhanPreferences[prayer];
    const isExpanded = expandedPrayer === prayer;
    
    return (
      <View key={prayer} style={[styles.prayerCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
        {/* Prayer Header */}
        <Pressable
          onPress={() => setExpandedPrayer(isExpanded ? null : prayer)}
          style={styles.prayerHeader}
        >
          <View style={styles.prayerInfo}>
            <LocalizedText style={[styles.prayerName, { color: theme.text }]}>
              {isPashto ? prayerInfo.pashto : prayerInfo.dari}
            </LocalizedText>
            <LocalizedText style={[styles.prayerNameArabic, { color: theme.textSecondary }]}>
              {prayerInfo.arabic}
            </LocalizedText>
          </View>
          
          <View style={styles.prayerStatus}>
            {settings.enabled && (
              <MaterialIcons
                name="volume-up"
                size={20}
                color={theme.accent}
              />
            )}
            <MaterialIcons
              name={isExpanded ? 'expand-less' : 'expand-more'}
              size={24}
              color={theme.icon}
            />
          </View>
        </Pressable>

        {/* Expanded Settings */}
        {isExpanded && (
          <View style={[styles.prayerSettings, { borderTopColor: theme.divider }]}>
            {/* Enable Notification */}
            <View style={styles.settingRow}>
              <LocalizedText style={[styles.settingLabel, { color: theme.text }]}>
                {t('adhanSettings.enablePrayer')}
              </LocalizedText>
              <Switch
                value={settings.enabled}
                onValueChange={(v) => handlePrayerNotificationToggle(prayer, v)}
                trackColor={switchTrackColor}
                thumbColor={switchThumbColor(settings.enabled)}
              />
            </View>

            {/* Test Button */}
            {settings.enabled && (
              <Pressable
                onPress={() => handleTestVoice(settings.selectedVoice, prayer)}
                style={[
                  styles.testButton,
                  { backgroundColor: isTestingVoice === settings.selectedVoice ? theme.accent : theme.tint }
                ]}
              >
                {isTestingVoice === settings.selectedVoice ? (
                  <>
                    <ActivityIndicator size="small" color="#fff" />
                    <LocalizedText style={styles.testButtonText}>{t('adhanSettings.playing')}</LocalizedText>
                  </>
                ) : (
                  <>
                    <MaterialIcons name="play-arrow" size={20} color="#fff" />
                    <LocalizedText style={styles.testButtonText}>{t('adhanSettings.testSound')}</LocalizedText>
                  </>
                )}
              </Pressable>
            )}
          </View>
        )}
      </View>
    );
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <ScreenHeader
          icon="notifications-active"
          title={t('adhanSettings.title')}
          subtitle={t('adhanSettings.subtitle')}
        />

      <ScrollView
        testID="ios-adhan-settings-ready"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >

        {/* Master Toggle */}
        <View style={[styles.masterToggle, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
          <View style={styles.masterToggleInfo}>
            <MaterialIcons name="notifications" size={24} color={adhanPreferences.masterEnabled ? theme.accent : theme.icon} />
            <LocalizedText style={[styles.masterToggleLabel, { color: theme.text }]}>
              {t('adhanSettings.master')}
            </LocalizedText>
          </View>
          <Switch
            value={adhanPreferences.masterEnabled}
            onValueChange={handleMasterToggle}
            trackColor={switchTrackColor}
            thumbColor={switchThumbColor(adhanPreferences.masterEnabled)}
          />
        </View>

        {/* Global Voice Selector */}
        {adhanPreferences.masterEnabled && (
          <View style={[styles.globalVoice, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
            <View style={styles.globalVoiceContent}>
              <MaterialIcons name="record-voice-over" size={24} color={theme.accent} />
              <View style={styles.globalVoiceText}>
                <LocalizedText style={[styles.globalVoiceLabel, { color: theme.textSecondary }]}>
                  {t('adhanSettings.defaultVoice')}
                </LocalizedText>
                <LocalizedText style={[styles.globalVoiceValue, { color: theme.text }]}>
                  {isPashto
                    ? ADHAN_VOICES[adhanPreferences.globalVoice]?.namePashto || 'برکت‌الله سلیم (رح)'
                    : ADHAN_VOICES[adhanPreferences.globalVoice]?.nameDari || 'برکت‌الله سلیم (رح)'}
                </LocalizedText>
              </View>
            </View>
          </View>
        )}

        {Platform.OS !== 'android' && adhanPreferences.masterEnabled && (
          <View style={[styles.exactAlarmCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
            <View style={styles.exactAlarmContent}>
              <MaterialIcons name="notifications-active" size={24} color={theme.accent} />
              <View style={styles.exactAlarmText}>
                <LocalizedText style={[styles.exactAlarmLabel, { color: theme.text }]}>
                  {t('adhanSettings.systemTest')}
                </LocalizedText>
                <LocalizedText style={[styles.exactAlarmDesc, { color: theme.textSecondary }]}>
                  {t('adhanSettings.systemTestHelp')}
                </LocalizedText>
              </View>
            </View>
            <Pressable
              testID="adhan-system-test-button"
              onPress={handleSystemAdhanTest}
              style={[styles.exactAlarmButton, { backgroundColor: theme.tint }]}
            >
              <MaterialIcons name="notifications-active" size={20} color="#fff" />
              <LocalizedText style={styles.exactAlarmButtonText}>{t('adhanSettings.systemTestButton')}</LocalizedText>
            </Pressable>
            <LocalizedText
              testID="adhan-system-test-status"
              style={[styles.exactAlarmHint, { color: theme.textSecondary }]}
            >
              {adhanTestStatusLabel}
            </LocalizedText>
          </View>
        )}

        {/* Prayer Cards */}
        {adhanPreferences.masterEnabled && (
          <View style={styles.prayerCards}>
            <LocalizedText style={[styles.sectionTitle, { color: theme.textSecondary }]}>
              {t('adhanSettings.perPrayer')}
            </LocalizedText>
            {PRAYER_ORDER.map(renderPrayerCard)}
          </View>
        )}

        {/* Native adhan health */}
        {Platform.OS === 'android' && adhanPreferences.masterEnabled && (
          <AdhanNotificationHealthPanel
            onOpenNotificationSettings={openNotificationSettings}
            onRunSystemTest={() => handleSystemAdhanTest().catch(() => {})}
            testStatusLabel={adhanTestStatusLabel}
            showFallbackWarning={state.scheduleAudit?.scheduleMode === 'fallback'}
            onRecheckSchedule={() => handleRecheckAndSchedule().catch(() => {})}
          />
        )}

        {/* Early Reminder */}
        {adhanPreferences.masterEnabled && (
          <View style={[styles.earlyReminder, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
            <View style={styles.earlyReminderInfo}>
              <MaterialIcons name="alarm" size={24} color={theme.tint} />
              <View style={styles.earlyReminderText}>
                <LocalizedText style={[styles.earlyReminderLabel, { color: theme.text }]}>
                  {t('adhanSettings.earlyReminder')}
                </LocalizedText>
                <LocalizedText style={[styles.earlyReminderDesc, { color: theme.textSecondary }]}>
                  {t('adhanSettings.earlyReminderMinutes', { minutes: '۱' })}
                </LocalizedText>
              </View>
            </View>
            <Switch
              value={adhanPreferences.earlyReminder}
              onValueChange={handleEarlyReminderToggle}
              trackColor={switchTrackColor}
              thumbColor={switchThumbColor(adhanPreferences.earlyReminder)}
            />
          </View>
        )}

        {/* Error Message with Open Settings Button */}
        {state.error && (
          <View style={[styles.errorCard, { backgroundColor: '#ffebee', borderColor: '#f44336' }]}>
            <View style={styles.errorContent}>
              <MaterialIcons name="error-outline" size={24} color="#f44336" />
              <LocalizedText style={[styles.errorText, { color: '#c62828' }]}>
                {state.error}
              </LocalizedText>
            </View>
            {(state.notificationPermission === 'blocked' || state.notificationPermission === 'denied') && (
              <Pressable
                onPress={openNotificationSettings}
                style={[styles.openSettingsButton, { backgroundColor: theme.tint }]}
              >
                <MaterialIcons name="settings" size={20} color="#fff" />
                <LocalizedText style={styles.openSettingsButtonText}>
                  {t('adhanSettings.openSettings')}
                </LocalizedText>
              </Pressable>
            )}
          </View>
        )}

        {/* Info Note */}
        <View style={[styles.infoNote, { backgroundColor: theme.backgroundSecondary }]}>
          <MaterialIcons name="info" size={20} color={theme.accent} />
          <LocalizedText style={[styles.infoNoteText, { color: theme.textSecondary }]}>
            {t('adhanSettings.info')}
          </LocalizedText>
        </View>

        <View style={styles.bottomPadding} />
      </ScrollView>
      </View>

    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: Spacing.xl,
  },
  header: {
    padding: Spacing.lg,
    paddingTop: 20,
    alignItems: 'center',
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    overflow: 'hidden',
  },
  headerTitle: {
    fontSize: Typography.ui.heading,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: Spacing.sm,
    fontFamily: 'Vazirmatn',
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: Typography.ui.body,
    color: 'rgba(255,255,255,0.7)',
    marginTop: Spacing.xs,
    fontFamily: 'Vazirmatn',
    textAlign: 'center',
  },
  masterToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    margin: Spacing.md,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
  },
  masterToggleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  masterToggleLabel: {
    fontSize: Typography.ui.subtitle,
    fontWeight: '600',
    fontFamily: 'Vazirmatn',
  },
  globalVoice: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.md,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
  },
  globalVoiceContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  globalVoiceText: {
    alignItems: 'flex-start',
  },
  globalVoiceLabel: {
    fontSize: Typography.ui.caption,
    fontFamily: 'Vazirmatn',
  },
  globalVoiceValue: {
    fontSize: Typography.ui.body,
    fontWeight: '600',
    fontFamily: 'Vazirmatn',
  },
  sectionTitle: {
    fontSize: Typography.ui.caption,
    fontFamily: 'Vazirmatn',
    marginBottom: Spacing.sm,
    marginLeft: Spacing.md,
    textAlign: 'center',
  },
  prayerCards: {
    marginHorizontal: Spacing.md,
  },
  prayerCard: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginBottom: Spacing.sm,
    overflow: 'hidden',
  },
  prayerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
  },
  prayerInfo: {
    alignItems: 'flex-start',
  },
  prayerName: {
    fontSize: Typography.ui.subtitle,
    fontWeight: '600',
    fontFamily: 'Vazirmatn',
  },
  prayerNameArabic: {
    fontSize: Typography.ui.caption,
    fontFamily: 'AmiriQuran',
    marginTop: 2,
  },
  prayerStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  prayerSettings: {
    padding: Spacing.md,
    borderTopWidth: 1,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
  },
  settingLabel: {
    fontSize: Typography.ui.body,
    fontFamily: 'Vazirmatn',
  },
  voiceSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.sm,
  },
  voiceSelectorContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  voiceSelectorText: {
    alignItems: 'flex-start',
  },
  voiceSelectorLabel: {
    fontSize: Typography.ui.caption,
    fontFamily: 'Vazirmatn',
  },
  voiceSelectorValue: {
    fontSize: Typography.ui.body,
    fontFamily: 'Vazirmatn',
  },
  testButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.sm,
  },
  testButtonText: {
    fontSize: Typography.ui.body,
    color: '#fff',
    fontFamily: 'Vazirmatn',
  },
  exactAlarmCard: {
    margin: Spacing.md,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
  },
  exactAlarmContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
    marginBottom: Spacing.sm,
  },
  exactAlarmText: {
    flex: 1,
  },
  exactAlarmLabel: {
    fontSize: Typography.ui.body,
    fontWeight: '600',
    fontFamily: 'Vazirmatn',
  },
  exactAlarmDesc: {
    fontSize: Typography.ui.caption,
    fontFamily: 'Vazirmatn',
    marginTop: 4,
    lineHeight: 20,
  },
  exactAlarmButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  exactAlarmButtonText: {
    fontSize: Typography.ui.body,
    color: '#fff',
    fontFamily: 'Vazirmatn',
    fontWeight: '600',
  },
  exactAlarmHint: {
    fontSize: Typography.ui.caption,
    fontFamily: 'Vazirmatn',
    textAlign: 'center',
    lineHeight: 20,
    marginTop: Spacing.sm,
  },
  exactAlarmWarning: {
    marginTop: Spacing.sm,
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    gap: Spacing.xs,
  },
  exactAlarmWarningText: {
    fontSize: Typography.ui.caption,
    fontFamily: 'Vazirmatn',
    lineHeight: 20,
  },
  exactAlarmRetryButton: {
    marginTop: Spacing.xs,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: BorderRadius.md,
  },
  exactAlarmRetryButtonText: {
    color: '#fff',
    fontFamily: 'Vazirmatn',
    fontSize: Typography.ui.caption,
    fontWeight: '600',
  },
  earlyReminder: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    margin: Spacing.md,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
  },
  earlyReminderInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    flex: 1,
  },
  earlyReminderText: {
    flex: 1,
  },
  earlyReminderLabel: {
    fontSize: Typography.ui.body,
    fontWeight: '600',
    fontFamily: 'Vazirmatn',
  },
  earlyReminderDesc: {
    fontSize: Typography.ui.caption,
    fontFamily: 'Vazirmatn',
  },
  infoNote: {
    flexDirection: 'column',
    alignItems: 'center',
    gap: Spacing.sm,
    margin: Spacing.md,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  infoNoteText: {
    flex: 1,
    fontSize: Typography.ui.caption,
    fontFamily: 'Vazirmatn',
    lineHeight: 20,
    textAlign: 'center',
    writingDirection: 'rtl',
    alignSelf: 'stretch',
  },
  bottomPadding: {
    height: 100,
  },
  errorCard: {
    margin: Spacing.md,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
  },
  errorContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  errorText: {
    flex: 1,
    fontSize: Typography.ui.body,
    fontFamily: 'Vazirmatn',
    lineHeight: 20,
  },
  openSettingsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.xs,
  },
  openSettingsButtonText: {
    fontSize: Typography.ui.body,
    color: '#fff',
    fontFamily: 'Vazirmatn',
    fontWeight: '600',
  },
});
