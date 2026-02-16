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
import { useRouter, Stack } from 'expo-router';
import { usePrayer } from '@/context/PrayerContext';
import {
  AdhanVoice,
  ADHAN_VOICES,
  PrayerName,
  PRAYER_NAMES,
  PrayerAdhanSettings,
} from '@/utils/adhanManager';
import { testAdhanVoice, isAdhanPlaying, stopAdhan } from '@/utils/adhanAudio';
import { Typography, Spacing, BorderRadius } from '@/constants/theme';
import { useApp } from '@/context/AppContext';

// Prayer order for display
const PRAYER_ORDER: PrayerName[] = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];

export default function AdhanSettingsScreen() {
  const { theme } = useApp();
  const { state, updateAdhanPreferences, openNotificationSettings } = usePrayer();
  const router = useRouter();
  
  const [isTestingVoice, setIsTestingVoice] = useState<AdhanVoice | null>(null);
  const [expandedPrayer, setExpandedPrayer] = useState<PrayerName | null>(null);
  const [showVoiceSelector, setShowVoiceSelector] = useState(false);
  const [selectingVoiceFor, setSelectingVoiceFor] = useState<PrayerName | 'global' | null>(null);

  const { adhanPreferences } = state;

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

  // Toggle prayer sound
  const handlePrayerSoundToggle = useCallback(async (prayer: PrayerName, value: boolean) => {
    const currentSettings = adhanPreferences[prayer];
    await updateAdhanPreferences({
      [prayer]: { ...currentSettings, playSound: value },
    });
  }, [adhanPreferences, updateAdhanPreferences]);

  // Change voice for a prayer
  const handleVoiceChange = useCallback(async (prayer: PrayerName | 'global', voice: AdhanVoice) => {
    if (prayer === 'global') {
      // Update all prayers to use this voice
      const updates: Partial<typeof adhanPreferences> = {
        globalVoice: voice,
      };
      for (const p of PRAYER_ORDER) {
        updates[p] = { ...adhanPreferences[p], selectedVoice: voice };
      }
      await updateAdhanPreferences(updates);
    } else {
      const currentSettings = adhanPreferences[prayer];
      await updateAdhanPreferences({
        [prayer]: { ...currentSettings, selectedVoice: voice },
      });
    }
    setShowVoiceSelector(false);
    setSelectingVoiceFor(null);
  }, [adhanPreferences, updateAdhanPreferences]);

  // Toggle early reminder
  const handleEarlyReminderToggle = useCallback(async (value: boolean) => {
    await updateAdhanPreferences({ earlyReminder: value });
  }, [updateAdhanPreferences]);

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
    } catch (error) {
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
    const isFajr = prayer === 'fajr';
    
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
                name={settings.playSound ? 'volume-up' : 'notifications'}
                size={20}
                color={settings.playSound ? '#D4AF37' : theme.icon}
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

            {/* Play Sound (only if notification enabled) */}
            {settings.enabled && (
              <View style={styles.settingRow}>
                <View style={styles.settingLabelContainer}>
                  <Text style={[styles.settingLabel, { color: theme.text }]}>
                    پخش اذان
                  </Text>
                  {isFajr && (
                    <Text style={[styles.settingHint, { color: '#D4AF37' }]}>
                      (پیشنهاد برای صبح)
                    </Text>
                  )}
                </View>
                <Switch
                  value={settings.playSound}
                  onValueChange={(v) => handlePrayerSoundToggle(prayer, v)}
                  trackColor={{ false: theme.divider, true: '#1a4d3e' }}
                  thumbColor={settings.playSound ? '#D4AF37' : '#f4f3f4'}
                />
              </View>
            )}

            {/* Voice Selection (only if sound enabled) */}
            {settings.enabled && settings.playSound && (
              <Pressable
                onPress={() => {
                  setSelectingVoiceFor(prayer);
                  setShowVoiceSelector(true);
                }}
                style={[styles.voiceSelector, { backgroundColor: theme.backgroundSecondary }]}
              >
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
                <MaterialIcons name="chevron-left" size={24} color={theme.icon} />
              </Pressable>
            )}

            {/* Test Button */}
            {settings.enabled && settings.playSound && (
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

  // Render voice selector modal
  const renderVoiceSelector = () => {
    if (!showVoiceSelector || !selectingVoiceFor) return null;

    const currentVoice = selectingVoiceFor === 'global'
      ? adhanPreferences.globalVoice
      : adhanPreferences[selectingVoiceFor].selectedVoice;

    return (
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>
              انتخاب مؤذن
            </Text>
            <Pressable onPress={() => setShowVoiceSelector(false)}>
              <MaterialIcons name="close" size={24} color={theme.icon} />
            </Pressable>
          </View>

          {Object.values(ADHAN_VOICES).map((voice) => (
            <Pressable
              key={voice.id}
              onPress={() => handleVoiceChange(selectingVoiceFor, voice.id)}
              style={[
                styles.voiceOption,
                { borderBottomColor: theme.divider },
                currentVoice === voice.id && { backgroundColor: theme.backgroundSecondary },
              ]}
            >
              <View style={styles.voiceOptionInfo}>
                <Text style={[styles.voiceOptionName, { color: theme.text }]}>
                  {voice.nameDari}
                </Text>
                <Text style={[styles.voiceOptionDesc, { color: theme.textSecondary }]}>
                  {voice.description}
                </Text>
              </View>
              
              <View style={styles.voiceOptionActions}>
                {/* Test button */}
                <Pressable
                  onPress={() => handleTestVoice(voice.id, selectingVoiceFor !== 'global' ? selectingVoiceFor : undefined)}
                  style={styles.voiceTestBtn}
                >
                  {isTestingVoice === voice.id ? (
                    <ActivityIndicator size="small" color="#D4AF37" />
                  ) : (
                    <MaterialIcons name="play-circle" size={28} color="#D4AF37" />
                  )}
                </Pressable>
                
                {/* Selected indicator */}
                {currentVoice === voice.id && (
                  <MaterialIcons name="check-circle" size={24} color="#1a4d3e" />
                )}
              </View>
            </Pressable>
          ))}

          {/* Note about availability */}
          <Text style={[styles.voiceNote, { color: theme.textSecondary }]}>
            توجه: برخی صداها ممکن است هنوز در دسترس نباشند
          </Text>
        </View>
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
          <Pressable
            onPress={() => {
              setSelectingVoiceFor('global');
              setShowVoiceSelector(true);
            }}
            style={[styles.globalVoice, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}
          >
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
            <MaterialIcons name="chevron-left" size={24} color={theme.icon} />
          </Pressable>
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
            یادآوری نماز صبح به طور پیش‌فرض با صدای اذان فعال است.
            برای سایر نمازها می‌توانید صدا را فعال کنید.
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

      {/* Voice Selector Modal */}
      {renderVoiceSelector()}
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
  settingLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  settingLabel: {
    fontSize: Typography.ui.body,
    fontFamily: 'Vazirmatn',
  },
  settingHint: {
    fontSize: Typography.ui.caption,
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
    flexDirection: 'row',
    alignItems: 'flex-start',
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
    textAlign: 'right',
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
