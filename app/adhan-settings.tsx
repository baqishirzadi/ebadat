/**
 * Adhan Settings Screen
 * Configure prayer notifications and Adhan sounds
 * Designed with mosque-style calm aesthetic
 */

import React, { useState, useCallback, useEffect } from 'react';
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
  InteractionManager,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Stack, useFocusEffect, useRouter } from 'expo-router';
import { usePrayer } from '@/context/PrayerContext';
import {
  AdhanVoice,
  ADHAN_VOICES,
  PrayerName,
  PRAYER_NAMES,
} from '@/utils/adhanManager';
import { testAdhanVoice, stopAdhan } from '@/utils/adhanAudio';
import { AdhanHealthBanner } from '@/components/prayer/AdhanHealthBanner';
import { fetchAdhanHealth, openBatteryOptimizationSettings, openOemAutostartSettings, snoozeBatteryNudge } from '@/utils/adhanHealth';
import { Typography, Spacing, BorderRadius } from '@/constants/theme';
import { useApp } from '@/context/AppContext';
import { ScreenHeader } from '@/components/ui/ScreenHeader';

// Prayer order for display
const PRAYER_ORDER: PrayerName[] = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];

export default function AdhanSettingsScreen() {
  const { theme } = useApp();
  const router = useRouter();
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
  const [showBatteryNudge, setShowBatteryNudge] = useState(false);

  useEffect(() => {
    if (Platform.OS !== 'android') return;
    fetchAdhanHealth()
      .then((health) => setShowBatteryNudge(health.shouldShowBatteryNudge))
      .catch(() => {});
  }, []);

  const { adhanPreferences } = state;
  const switchTrackColor = { false: theme.divider, true: theme.tint };
  const switchThumbColor = (enabled: boolean) => (enabled ? theme.accent : '#f4f3f4');
  const adhanTestStatusLabel = state.adhanTestStatus.error
    ? `خطا: ${state.adhanTestStatus.error}`
    : state.adhanTestStatus.playbackOk === true
      ? 'اعلان دریافت شد و پخش اذان آغاز شد.'
      : state.adhanTestStatus.playbackAttemptedAt
        ? 'اعلان دریافت شد؛ پخش اذان بررسی شد.'
        : state.adhanTestStatus.receivedAt
          ? 'اعلان دریافت شد؛ در حال بررسی پخش صدا.'
          : state.adhanTestStatus.expectedAt
            ? 'تست زمان‌بندی شد؛ منتظر اعلان باشید.'
            : 'هنوز تستی اجرا نشده است.';

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
      Alert.alert('تست برنامه‌ریزی شد', 'تا ۲۵ ثانیه دیگر اعلان تست اذان ارسال می‌شود.');
      return;
    }
    Alert.alert('خطا', 'فعلاً امکان زمان‌بندی تست سیستمی اذان وجود ندارد.');
  }, [scheduleAdhanSystemTest]);

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
              <Text style={[styles.settingLabel, { color: theme.text }]}>
                فعال‌سازی یادآوری
              </Text>
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
      <Stack.Screen options={{ headerShown: false }} />

      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <ScreenHeader
          icon="notifications-active"
          title="یادآوری نماز و اذان"
          subtitle="تنظیمات صدا و یادآوری برای هر نماز"
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
            <Text style={[styles.masterToggleLabel, { color: theme.text }]}>
              فعال‌سازی همه یادآوری‌ها
            </Text>
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

        {Platform.OS !== 'android' && adhanPreferences.masterEnabled && (
          <View style={[styles.exactAlarmCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
            <View style={styles.exactAlarmContent}>
              <MaterialIcons name="notifications-active" size={24} color={theme.accent} />
              <View style={styles.exactAlarmText}>
                <Text style={[styles.exactAlarmLabel, { color: theme.text }]}>
                  تست اعلان اذان
                </Text>
                <Text style={[styles.exactAlarmDesc, { color: theme.textSecondary }]}>
                  برای شبیه‌ساز iOS، اعلان محلی و پخش اذان در حالت باز بودن اپ بررسی می‌شود.
                </Text>
              </View>
            </View>
            <Pressable
              testID="adhan-system-test-button"
              onPress={handleSystemAdhanTest}
              style={[styles.exactAlarmButton, { backgroundColor: theme.tint }]}
            >
              <MaterialIcons name="notifications-active" size={20} color="#fff" />
              <Text style={styles.exactAlarmButtonText}>تست اذان سیستمی (۲۵ ثانیه)</Text>
            </Pressable>
            <Text
              testID="adhan-system-test-status"
              style={[styles.exactAlarmHint, { color: theme.textSecondary }]}
            >
              {adhanTestStatusLabel}
            </Text>
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

        {/* Native adhan health + system test */}
        {Platform.OS === 'android' && adhanPreferences.masterEnabled && (
          <View style={[styles.exactAlarmCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
            <AdhanHealthBanner />
            <Pressable
              onPress={() => router.push('/adhan-health')}
              style={[styles.exactAlarmButton, { backgroundColor: theme.backgroundSecondary, borderWidth: 1, borderColor: theme.cardBorder }]}
            >
              <MaterialIcons name="health-and-safety" size={20} color={theme.tint} />
              <Text style={[styles.exactAlarmButtonText, { color: theme.text }]}>بررسی سلامت اذان</Text>
            </Pressable>
            <View style={styles.exactAlarmContent}>
              <MaterialIcons name="schedule" size={24} color={theme.accent} />
              <View style={styles.exactAlarmText}>
                <Text style={[styles.exactAlarmLabel, { color: theme.text }]}>
                  وضعیت اذان سیستمی
                </Text>
                <Text style={[styles.exactAlarmDesc, { color: theme.textSecondary }]}>
                  اذان به‌صورت خودکار با موتور بومی اندروید زمان‌بندی می‌شود.
                </Text>
              </View>
            </View>
            <Pressable
              onPress={openNotificationSettings}
              style={[styles.exactAlarmButton, { backgroundColor: theme.tint }]}
            >
              <MaterialIcons name="settings" size={20} color="#fff" />
              <Text style={styles.exactAlarmButtonText}>باز کردن تنظیمات</Text>
            </Pressable>
            <Pressable
              testID="adhan-system-test-button"
              onPress={handleSystemAdhanTest}
              style={[styles.exactAlarmButton, { backgroundColor: theme.tint }]}
            >
              <MaterialIcons name="notifications-active" size={20} color="#fff" />
              <Text style={styles.exactAlarmButtonText}>تست اذان سیستمی (۲۵ ثانیه)</Text>
            </Pressable>
            <Text
              testID="adhan-system-test-status"
              style={[styles.exactAlarmHint, { color: theme.textSecondary }]}
            >
              {adhanTestStatusLabel}
            </Text>
            {state.scheduleAudit?.scheduleMode === 'fallback' && (
              <View style={[styles.exactAlarmWarning, { backgroundColor: '#fff8e1', borderColor: '#f5c16c' }]}>
                <MaterialIcons name="warning-amber" size={18} color="#b26a00" />
                <Text style={[styles.exactAlarmWarningText, { color: '#8d4f00' }]}>
                  حالت عادی فعال است؛ اذان‌ها پخش می‌شود اما ممکن است کمی تأخیر داشته باشد.
                </Text>
                <Pressable
                  onPress={handleRecheckAndSchedule}
                  style={[styles.exactAlarmRetryButton, { backgroundColor: theme.tint }]}
                >
                  <MaterialIcons name="refresh" size={18} color="#fff" />
                  <Text style={styles.exactAlarmRetryButtonText}>بررسی دوباره و زمان‌بندی</Text>
                </Pressable>
              </View>
            )}
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
              <Text style={[styles.errorText, { color: '#c62828' }]}>
                {state.error}
              </Text>
            </View>
            {(state.notificationPermission === 'blocked' || state.notificationPermission === 'denied') && (
              <Pressable
                onPress={openNotificationSettings}
                style={[styles.openSettingsButton, { backgroundColor: theme.tint }]}
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
          <MaterialIcons name="info" size={20} color={theme.accent} />
          <Text style={[styles.infoNoteText, { color: theme.textSecondary }]}>
            برای نمازهای فعال، اعلان وقت نماز همیشه با صدای مؤذن پخش می‌شود.
          </Text>
        </View>

        {Platform.OS === 'android' && showBatteryNudge && (
          <View style={[styles.infoNote, { backgroundColor: theme.backgroundSecondary, marginTop: Spacing.sm }]}>
            <MaterialIcons name="battery-charging-full" size={20} color={theme.accent} />
            <Text style={[styles.infoNoteText, { color: theme.textSecondary }]}>
              اگر اذان گاهی با تأخیر می‌آید، بهینه‌سازی باتری را برای عبادت غیرفعال کنید.
            </Text>
            <Pressable
              onPress={() => openBatteryOptimizationSettings().catch(() => {})}
              style={[styles.openSettingsButton, { backgroundColor: '#1a4d3e', marginTop: Spacing.sm }]}
            >
              <Text style={styles.openSettingsButtonText}>تنظیمات باتری</Text>
            </Pressable>
            <Pressable
              onPress={() => openOemAutostartSettings().catch(() => {})}
              style={[styles.openSettingsButton, { backgroundColor: theme.tint, marginTop: Spacing.xs }]}
            >
              <Text style={styles.openSettingsButtonText}>راهنمای گوشی</Text>
            </Pressable>
            <Pressable
              onPress={() => {
                snoozeBatteryNudge().catch(() => {});
                setShowBatteryNudge(false);
              }}
              style={{ marginTop: Spacing.xs, alignSelf: 'center' }}
            >
              <Text style={[styles.infoNoteText, { color: theme.textSecondary }]}>بعداً</Text>
            </Pressable>
          </View>
        )}

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
