/**
 * Adhan Settings Screen
 * Configure prayer notifications and Adhan sounds
 * Designed with mosque-style calm aesthetic
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Switch,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
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
import { Typography, Spacing, BorderRadius } from '@/constants/theme';
import { useApp } from '@/context/AppContext';

// Prayer order for display
const PRAYER_ORDER: PrayerName[] = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];
const BLOCKER_LABELS: Record<string, string> = {
  notifications_module_unavailable: 'هسته اعلان در دسترس نیست',
  prayer_times_unavailable: 'اوقات شرعی آماده نیست',
  city_unresolved: 'شهر انتخاب نشده',
  notification_blocked: 'اعلان‌های دستگاه بلاک است',
  notification_denied: 'اجازه اعلان داده نشده',
  master_disabled: 'یادآوری اذان غیرفعال است',
  native_module_unavailable: 'هسته بومی اذان در دسترس نیست',
};
const WARNING_LABELS: Record<string, string> = {
  exact_alarm_missing: 'آلارم دقیق غیرفعال است (حالت عادی)',
  exact_alarm_unknown: 'وضعیت آلارم دقیق نامشخص است (حالت عادی)',
};

export default function AdhanSettingsScreen() {
  const { theme } = useApp();
  const {
    state,
    updateAdhanPreferences,
    openNotificationSettings,
    scheduleAdhanSystemTest,
    requestPrayerSchedule,
  } = usePrayer();
  
  const [isTestingVoice, setIsTestingVoice] = useState<AdhanVoice | null>(null);
  const [expandedPrayer, setExpandedPrayer] = useState<PrayerName | null>(null);

  const { adhanPreferences } = state;
  const exactAlarmStatusLabel = state.exactAlarmStatus === 'granted'
    ? 'فعال'
    : state.exactAlarmStatus === 'missing'
      ? 'غیرفعال'
      : state.exactAlarmStatus === 'unknown'
        ? 'نامشخص'
        : 'نیاز نیست';
  const scheduleModeLabel =
    state.scheduleAudit?.scheduleMode === 'fallback'
      ? 'عادی (ممکن است کمی تأخیر داشته باشد)'
      : 'دقیق';
  const schedulerBackendLabel = state.scheduleAudit?.schedulerBackend === 'native_exact_android'
    ? 'هسته بومی دقیق (اندروید)'
    : 'هسته اکسپو';
  const blockerCodes = state.scheduleAudit?.blockers || [];
  const warningCodes = state.scheduleAudit?.warnings || [];
  const blockerLabel =
    blockerCodes.length > 0
      ? blockerCodes.map((code) => BLOCKER_LABELS[code] || code).join('، ')
      : 'ندارد';
  const warningLabel =
    warningCodes.length > 0
      ? warningCodes.map((code) => WARNING_LABELS[code] || code).join('، ')
      : 'ندارد';
  const exactDebugState = state.scheduleAudit?.exactDebugState;

  useFocusEffect(
    useCallback(() => {
      requestPrayerSchedule('adhan-settings-focus').catch((error) => {
        console.warn('Failed to refresh schedule on settings focus:', error);
      });
    }, [requestPrayerSchedule])
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
      Alert.alert('تست برنامه‌ریزی شد', 'تا ۲۵ ثانیه دیگر اعلان تست اذان ارسال می‌شود.');
      return;
    }
    Alert.alert('خطا', 'فعلاً امکان زمان‌بندی تست سیستمی اذان وجود ندارد.');
  }, [scheduleAdhanSystemTest]);

  const handleScheduleAudit = useCallback(async () => {
    await requestPrayerSchedule('manual-audit');
  }, [requestPrayerSchedule]);

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
      await testAdhanVoice(voice, prayer, 10000);
    } catch {
      Alert.alert('خطا', 'امکان پخش صدا وجود ندارد');
    } finally {
      setIsTestingVoice(null);
    }
  }, [isTestingVoice]);

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
            <Text style={[styles.prayerName, { color: theme.text }]}>
              {prayerInfo.dari}
            </Text>
            <Text style={[styles.prayerNameArabic, { color: theme.textSecondary }]}>
              {prayerInfo.arabic}
            </Text>
          </View>
          
          <View style={styles.prayerStatus}>
            {settings.enabled && (
              <MaterialIcons
                name="volume-up"
                size={20}
                color="#D4AF37"
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
              <Text style={[styles.settingLabel, { color: theme.text }]}>
                فعال‌سازی یادآوری
              </Text>
              <Switch
                value={settings.enabled}
                onValueChange={(v) => handlePrayerNotificationToggle(prayer, v)}
                trackColor={{ false: theme.divider, true: '#1a4d3e' }}
                thumbColor={settings.enabled ? '#D4AF37' : '#f4f3f4'}
              />
            </View>

            {/* Voice Selection */}
            {settings.enabled && (
              <View style={[styles.voiceSelector, { backgroundColor: theme.backgroundSecondary }]}>
                <View style={styles.voiceSelectorContent}>
                  <MaterialIcons name="record-voice-over" size={20} color={theme.tint} />
                  <View style={styles.voiceSelectorText}>
                    <Text style={[styles.voiceSelectorLabel, { color: theme.textSecondary }]}>
                      انتخاب مؤذن
                    </Text>
                    <Text style={[styles.voiceSelectorValue, { color: theme.text }]}>
                      {ADHAN_VOICES[settings.selectedVoice]?.nameDari || 'برکت‌الله سلیم (رح)'}
                    </Text>
                  </View>
                </View>
              </View>
            )}

            {/* Test Button */}
            {settings.enabled && (
              <Pressable
                onPress={() => handleTestVoice(settings.selectedVoice, prayer)}
                style={[
                  styles.testButton,
                  { backgroundColor: isTestingVoice === settings.selectedVoice ? '#D4AF37' : '#1a4d3e' }
                ]}
              >
                {isTestingVoice === settings.selectedVoice ? (
                  <>
                    <ActivityIndicator size="small" color="#fff" />
                    <Text style={styles.testButtonText}>در حال پخش...</Text>
                  </>
                ) : (
                  <>
                    <MaterialIcons name="play-arrow" size={20} color="#fff" />
                    <Text style={styles.testButtonText}>آزمون صدا</Text>
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
      <Stack.Screen
        options={{
          title: 'تنظیمات اذان',
          headerStyle: { backgroundColor: '#0F1F14' },
          headerTintColor: '#fff',
          headerTitleStyle: { fontFamily: 'Vazirmatn', fontSize: 18 },
          headerBackTitle: 'برگشت',
        }}
      />
      
      <ScrollView style={[styles.container, { backgroundColor: theme.background }]}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: '#0F1F14' }]}>
          <MaterialIcons name="notifications-active" size={40} color="#D4AF37" />
          <Text style={styles.headerTitle}>یادآوری نماز و اذان</Text>
          <Text style={styles.headerSubtitle}>
            تنظیمات صدا و یادآوری برای هر نماز
          </Text>
        </View>

        {/* Master Toggle */}
        <View style={[styles.masterToggle, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
          <View style={styles.masterToggleInfo}>
            <MaterialIcons name="notifications" size={24} color={adhanPreferences.masterEnabled ? '#D4AF37' : theme.icon} />
            <Text style={[styles.masterToggleLabel, { color: theme.text }]}>
              فعال‌سازی همه یادآوری‌ها
            </Text>
          </View>
          <Switch
            value={adhanPreferences.masterEnabled}
            onValueChange={handleMasterToggle}
            trackColor={{ false: theme.divider, true: '#1a4d3e' }}
            thumbColor={adhanPreferences.masterEnabled ? '#D4AF37' : '#f4f3f4'}
          />
        </View>

        {/* Global Voice Selector */}
        {adhanPreferences.masterEnabled && (
          <View style={[styles.globalVoice, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
            <View style={styles.globalVoiceContent}>
              <MaterialIcons name="record-voice-over" size={24} color="#D4AF37" />
              <View style={styles.globalVoiceText}>
                <Text style={[styles.globalVoiceLabel, { color: theme.textSecondary }]}>
                  مؤذن پیش‌فرض
                </Text>
                <Text style={[styles.globalVoiceValue, { color: theme.text }]}>
                  {ADHAN_VOICES[adhanPreferences.globalVoice]?.nameDari || 'برکت‌الله سلیم (رح)'}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Prayer Cards */}
        {adhanPreferences.masterEnabled && (
          <View style={styles.prayerCards}>
            <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>
              تنظیمات هر نماز
            </Text>
            {PRAYER_ORDER.map(renderPrayerCard)}
          </View>
        )}

        {/* Exact Alarm Settings - Android: ensure adhan fires on time when app is in background */}
        {Platform.OS === 'android' && adhanPreferences.masterEnabled && (
          <View style={[styles.exactAlarmCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
            <View style={styles.exactAlarmContent}>
              <MaterialIcons name="schedule" size={24} color="#D4AF37" />
              <View style={styles.exactAlarmText}>
                <Text style={[styles.exactAlarmLabel, { color: theme.text }]}>
                  تنظیمات دقیق اذان
                </Text>
                <Text style={[styles.exactAlarmDesc, { color: theme.textSecondary }]}>
                  برای اذان به موقع، لطفاً دسترسی «ساعت و یادآوری» را در تنظیمات فعال کنید
                </Text>
              </View>
            </View>
            <Pressable
              onPress={openNotificationSettings}
              style={[styles.exactAlarmButton, { backgroundColor: '#1a4d3e' }]}
            >
              <MaterialIcons name="settings" size={20} color="#fff" />
              <Text style={styles.exactAlarmButtonText}>باز کردن تنظیمات</Text>
            </Pressable>
            <Pressable
              onPress={handleSystemAdhanTest}
              style={[styles.exactAlarmButton, { backgroundColor: '#0b6e4f' }]}
            >
              <MaterialIcons name="notifications-active" size={20} color="#fff" />
              <Text style={styles.exactAlarmButtonText}>تست اذان سیستمی (۲۵ ثانیه)</Text>
            </Pressable>
            <Text style={[styles.exactAlarmHint, { color: theme.textSecondary }]}>
              این تست فقط رسیدن اعلان و صدا را می‌سنجد؛ دقت زمانی روزانه را تضمین نمی‌کند.
            </Text>
            {state.scheduleAudit?.scheduleMode === 'fallback' && (
              <View style={[styles.exactAlarmWarning, { backgroundColor: '#fff8e1', borderColor: '#f5c16c' }]}>
                <MaterialIcons name="warning-amber" size={18} color="#b26a00" />
                <Text style={[styles.exactAlarmWarningText, { color: '#8d4f00' }]}>
                  حالت عادی فعال است؛ اذان‌ها پخش می‌شود اما ممکن است کمی تأخیر داشته باشد.
                </Text>
                <Pressable
                  onPress={handleRecheckAndSchedule}
                  style={[styles.exactAlarmRetryButton, { backgroundColor: '#1a4d3e' }]}
                >
                  <MaterialIcons name="refresh" size={18} color="#fff" />
                  <Text style={styles.exactAlarmRetryButtonText}>بررسی دوباره و زمان‌بندی</Text>
                </Pressable>
              </View>
            )}
          </View>
        )}

        {/* Scheduling Audit */}
        {adhanPreferences.masterEnabled && (
          <View style={[styles.auditCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
            <View style={styles.auditHeader}>
              <MaterialIcons name="fact-check" size={22} color="#D4AF37" />
              <Text style={[styles.auditTitle, { color: theme.text }]}>وضعیت زمان‌بندی اعلان‌ها</Text>
            </View>

            <View style={styles.auditRow}>
              <Text style={[styles.auditLabel, { color: theme.textSecondary }]}>آلارم دقیق:</Text>
              <Text
                style={[
                  styles.auditValue,
                  { color: state.exactAlarmStatus === 'missing' ? '#d32f2f' : theme.text },
                ]}
              >
                {exactAlarmStatusLabel}
              </Text>
            </View>

            <View style={styles.auditRow}>
              <Text style={[styles.auditLabel, { color: theme.textSecondary }]}>حالت زمان‌بندی:</Text>
              <Text style={[styles.auditValue, { color: theme.text }]}>
                {state.scheduleAudit ? scheduleModeLabel : '---'}
              </Text>
            </View>

            <View style={styles.auditRow}>
              <Text style={[styles.auditLabel, { color: theme.textSecondary }]}>هسته زمان‌بندی:</Text>
              <Text style={[styles.auditValue, { color: theme.text }]}>
                {state.scheduleAudit ? schedulerBackendLabel : '---'}
              </Text>
            </View>

            <View style={styles.auditRow}>
              <Text style={[styles.auditLabel, { color: theme.textSecondary }]}>انتظار / زمان‌بندی (همه):</Text>
              <Text style={[styles.auditValue, { color: theme.text }]}>
                {state.scheduleAudit ? `${state.scheduleAudit.expectedCount} / ${state.scheduleAudit.scheduledCount}` : '---'}
              </Text>
            </View>

            <View style={styles.auditRow}>
              <Text style={[styles.auditLabel, { color: theme.textSecondary }]}>انتظار / زمان‌بندی (اذان):</Text>
              <Text style={[styles.auditValue, { color: theme.text }]}>
                {state.scheduleAudit ? `${state.scheduleAudit.expectedAdhanCount} / ${state.scheduleAudit.scheduledAdhanCount}` : '---'}
              </Text>
            </View>

            <View style={styles.auditRow}>
              <Text style={[styles.auditLabel, { color: theme.textSecondary }]}>تکراری:</Text>
              <Text style={[styles.auditValue, { color: theme.text }]}>
                {state.scheduleAudit ? String(state.scheduleAudit.duplicateCount) : '---'}
              </Text>
            </View>

            <View style={styles.auditRow}>
              <Text style={[styles.auditLabel, { color: theme.textSecondary }]}>بومی دقیق (اذان):</Text>
              <Text style={[styles.auditValue, { color: theme.text }]}>
                {state.scheduleAudit
                  ? `${state.scheduleAudit.nativeExactScheduledCount} (اختلاف: ${state.scheduleAudit.nativeExactMismatchCount})`
                  : '---'}
              </Text>
            </View>

            <View style={styles.auditRow}>
              <Text style={[styles.auditLabel, { color: theme.textSecondary }]}>اذان بومی / یادآوری اکسپو:</Text>
              <Text style={[styles.auditValue, { color: theme.text }]}>
                {state.scheduleAudit
                  ? `${state.scheduleAudit.scheduledAdhanNativeCount} / ${state.scheduleAudit.scheduledReminderExpoCount}`
                  : '---'}
              </Text>
            </View>

            <View style={styles.auditRow}>
              <Text style={[styles.auditLabel, { color: theme.textSecondary }]}>مانع زمان‌بندی:</Text>
              <Text style={[styles.auditValue, { color: blockerCodes.length ? '#d32f2f' : theme.text }]}>
                {state.scheduleAudit ? blockerLabel : '---'}
              </Text>
            </View>

            <View style={styles.auditRow}>
              <Text style={[styles.auditLabel, { color: theme.textSecondary }]}>هشدار زمان‌بندی:</Text>
              <Text style={[styles.auditValue, { color: warningCodes.length ? '#8d4f00' : theme.text }]}>
                {state.scheduleAudit ? warningLabel : '---'}
              </Text>
            </View>

            {exactDebugState && (
              <>
                <View style={styles.auditRow}>
                  <Text style={[styles.auditLabel, { color: theme.textSecondary }]}>هسته بومی اذان:</Text>
                  <Text style={[styles.auditValue, { color: exactDebugState.nativeModuleAvailable ? theme.text : '#d32f2f' }]}>
                    {exactDebugState.nativeModuleAvailable ? 'فعال' : 'غیرفعال'}
                  </Text>
                </View>
                <View style={styles.auditRow}>
                  <Text style={[styles.auditLabel, { color: theme.textSecondary }]}>اعلان دستگاه:</Text>
                  <Text style={[styles.auditValue, { color: exactDebugState.notificationsEnabled ? theme.text : '#d32f2f' }]}>
                    {exactDebugState.notificationsEnabled ? 'فعال' : 'غیرفعال'}
                  </Text>
                </View>
              </>
            )}

            <View style={styles.auditRow}>
              <Text style={[styles.auditLabel, { color: theme.textSecondary }]}>بیشترین Drift:</Text>
              <Text style={[styles.auditValue, { color: theme.text }]}>
                {state.scheduleAudit ? `${state.scheduleAudit.maxDriftSeconds} ثانیه` : '---'}
              </Text>
            </View>

            <View style={styles.auditRow}>
              <Text style={[styles.auditLabel, { color: theme.textSecondary }]}>تاخیر آخرین اذان:</Text>
              <Text style={[styles.auditValue, { color: theme.text }]}>
                {state.lastAdhanDelaySeconds !== null ? `${state.lastAdhanDelaySeconds} ثانیه` : '---'}
              </Text>
            </View>

            <Pressable
              onPress={handleScheduleAudit}
              disabled={state.isScheduling}
              style={[
                styles.auditButton,
                { backgroundColor: state.isScheduling ? '#8ca69b' : '#1a4d3e' },
              ]}
            >
              {state.isScheduling ? (
                <>
                  <ActivityIndicator size="small" color="#fff" />
                  <Text style={styles.auditButtonText}>در حال بازبینی...</Text>
                </>
              ) : (
                <>
                  <MaterialIcons name="refresh" size={20} color="#fff" />
                  <Text style={styles.auditButtonText}>بازبینی مجدد</Text>
                </>
              )}
            </Pressable>
          </View>
        )}

        {/* Early Reminder */}
        {adhanPreferences.masterEnabled && (
          <View style={[styles.earlyReminder, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
            <View style={styles.earlyReminderInfo}>
              <MaterialIcons name="alarm" size={24} color={theme.tint} />
              <View style={styles.earlyReminderText}>
                <Text style={[styles.earlyReminderLabel, { color: theme.text }]}>
                  یادآوری قبل از نماز
                </Text>
                <Text style={[styles.earlyReminderDesc, { color: theme.textSecondary }]}>
                  ۱ دقیقه قبل از وقت نماز
                </Text>
              </View>
            </View>
            <Switch
              value={adhanPreferences.earlyReminder}
              onValueChange={handleEarlyReminderToggle}
              trackColor={{ false: theme.divider, true: '#1a4d3e' }}
              thumbColor={adhanPreferences.earlyReminder ? '#D4AF37' : '#f4f3f4'}
            />
          </View>
        )}

        {/* Error Message with Open Settings Button */}
        {state.error && (
          <View style={[styles.errorCard, { backgroundColor: '#ffebee', borderColor: '#f44336' }]}>
            <View style={styles.errorContent}>
              <MaterialIcons name="error-outline" size={24} color="#f44336" />
              <Text style={[styles.errorText, { color: '#c62828' }]}>
                {state.error}
              </Text>
            </View>
            {(state.notificationPermission === 'blocked' || state.notificationPermission === 'denied') && (
              <Pressable
                onPress={openNotificationSettings}
                style={[styles.openSettingsButton, { backgroundColor: '#1a4d3e' }]}
              >
                <MaterialIcons name="settings" size={20} color="#fff" />
                <Text style={styles.openSettingsButtonText}>
                  باز کردن تنظیمات
                </Text>
              </Pressable>
            )}
          </View>
        )}

        {/* Info Note */}
        <View style={[styles.infoNote, { backgroundColor: theme.backgroundSecondary }]}>
          <MaterialIcons name="info" size={20} color="#D4AF37" />
          <Text style={[styles.infoNoteText, { color: theme.textSecondary }]}>
            برای نمازهای فعال، اعلان وقت نماز همیشه با صدای مؤذن پخش می‌شود.
          </Text>
        </View>

        {/* Battery optimization tip for Android - critical for sound when app is closed */}
        {Platform.OS === 'android' && (
          <View style={[styles.infoNote, { backgroundColor: theme.backgroundSecondary, marginTop: Spacing.sm }]}>
            <MaterialIcons name="battery-charging-full" size={20} color="#D4AF37" />
            <Text style={[styles.infoNoteText, { color: theme.textSecondary }]}>
              اگر صدای اذان هنگام بسته بودن اپ پخش نمی‌شود، در تنظیمات دستگاه «بهینه‌سازی باتری» را برای این اپ غیرفعال کنید.
            </Text>
          </View>
        )}

        <View style={styles.bottomPadding} />
      </ScrollView>

    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  auditCard: {
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.md,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    gap: Spacing.xs,
  },
  auditHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  auditTitle: {
    fontSize: Typography.ui.body,
    fontFamily: 'Vazirmatn',
    fontWeight: '700',
  },
  auditRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  auditLabel: {
    fontSize: Typography.ui.caption,
    fontFamily: 'Vazirmatn',
  },
  auditValue: {
    fontSize: Typography.ui.body,
    fontFamily: 'Vazirmatn',
    fontWeight: '600',
  },
  auditButton: {
    marginTop: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  auditButtonText: {
    color: '#fff',
    fontSize: Typography.ui.body,
    fontFamily: 'Vazirmatn',
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
  
  // Modal styles
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
    backgroundColor: '#0F1F14',
  },
  modalTitle: {
    fontSize: Typography.ui.subtitle,
    fontWeight: 'bold',
    color: '#fff',
    fontFamily: 'Vazirmatn',
  },
  voiceOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
    borderBottomWidth: 1,
  },
  voiceOptionInfo: {
    flex: 1,
  },
  voiceOptionName: {
    fontSize: Typography.ui.body,
    fontWeight: '600',
    fontFamily: 'Vazirmatn',
  },
  voiceOptionDesc: {
    fontSize: Typography.ui.caption,
    fontFamily: 'Vazirmatn',
    marginTop: 2,
  },
  voiceOptionActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  voiceTestBtn: {
    padding: Spacing.xs,
  },
  voiceNote: {
    padding: Spacing.md,
    fontSize: Typography.ui.caption,
    fontFamily: 'Vazirmatn',
    textAlign: 'center',
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
