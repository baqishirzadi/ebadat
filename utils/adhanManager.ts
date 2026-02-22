/**
 * Adhan Manager
 * Manages Adhan notification settings, voice selection, and scheduling
 * Designed for Afghan Hanafi users with respectful UX
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

// Storage key
export const ADHAN_STORAGE_KEY = '@ebadat/adhan_settings';

// Adhan voice options (single-voice production policy)
export type AdhanVoice = 'barakatullah';

// Voice metadata
export const ADHAN_VOICES: Record<AdhanVoice, {
  id: AdhanVoice;
  nameDari: string;
  namePashto: string;
  description: string;
  filename: string;
  available: boolean;
}> = {
  barakatullah: {
    id: 'barakatullah',
    nameDari: 'برکت‌الله سلیم (رح)',
    namePashto: 'برکت‌الله سلیم (رح)',
    description: 'مؤذن افغان - صدای آرام و سنتی',
    filename: 'barakatullah_salim_18sec.mp3',
    available: true,
  },
};

// Prayer names for reference
export type PrayerName = 'fajr' | 'dhuhr' | 'asr' | 'maghrib' | 'isha';

export const PRAYER_NAMES: Record<PrayerName, {
  dari: string;
  pashto: string;
  arabic: string;
}> = {
  fajr: { dari: 'نماز صبح', pashto: 'د سهار لمونځ', arabic: 'صلاة الفجر' },
  dhuhr: { dari: 'نماز ظهر', pashto: 'د غرمې لمونځ', arabic: 'صلاة الظهر' },
  asr: { dari: 'نماز عصر', pashto: 'د مازدیګر لمونځ', arabic: 'صلاة العصر' },
  maghrib: { dari: 'نماز مغرب', pashto: 'د ماښام لمونځ', arabic: 'صلاة المغرب' },
  isha: { dari: 'نماز عشاء', pashto: 'د ماښام وروستی لمونځ', arabic: 'صلاة العشاء' },
};

// Settings for each prayer
export interface PrayerAdhanSettings {
  enabled: boolean;       // Show notification
  playSound: boolean;     // Play Adhan audio
  selectedVoice: AdhanVoice;
}

// Complete Adhan preferences
export interface AdhanPreferences {
  // Preferences schema version for migration control
  schemaVersion: number;

  // Master toggle
  masterEnabled: boolean;
  
  // Per-prayer settings
  fajr: PrayerAdhanSettings;
  dhuhr: PrayerAdhanSettings;
  asr: PrayerAdhanSettings;
  maghrib: PrayerAdhanSettings;
  isha: PrayerAdhanSettings;
  
  // Additional options
  earlyReminder: boolean;         // 1 minute before notification
  earlyReminderMinutes: number;   // Minutes before prayer time
  
  // Global voice preference (used as default for new settings)
  globalVoice: AdhanVoice;
}

// Default settings - all five prayers audible by default
export const DEFAULT_ADHAN_PREFERENCES: AdhanPreferences = {
  schemaVersion: 3,
  masterEnabled: true,
  
  // Fajr: Full Adhan with sound
  fajr: {
    enabled: true,
    playSound: true,
    selectedVoice: 'barakatullah',
  },
  
  // Dhuhr, Asr, Isha: Adhan with sound (default)
  dhuhr: {
    enabled: true,
    playSound: true,
    selectedVoice: 'barakatullah',
  },
  asr: {
    enabled: true,
    playSound: true,
    selectedVoice: 'barakatullah',
  },
  
  // Maghrib: Adhan with Barakatullah Salim sound
  maghrib: {
    enabled: true,
    playSound: true,
    selectedVoice: 'barakatullah',
  },
  
  isha: {
    enabled: true,
    playSound: true,
    selectedVoice: 'barakatullah',
  },
  
  earlyReminder: false,
  earlyReminderMinutes: 1,
  globalVoice: 'barakatullah',
};

/**
 * Migrate old voice values to new ones
 */
function migrateVoiceValue(oldVoice: string): AdhanVoice {
  // Map all legacy/unknown values to the only supported voice
  if (oldVoice === 'barakatullah') return 'barakatullah';
  return 'barakatullah';
}

/**
 * Migrate preferences to new format
 */
function migratePreferences(preferences: any): AdhanPreferences {
  const incomingSchemaVersion =
    typeof preferences?.schemaVersion === 'number' ? preferences.schemaVersion : 0;
  const shouldApplySoundDefaults = incomingSchemaVersion < DEFAULT_ADHAN_PREFERENCES.schemaVersion;

  const migratePrayerSettings = (prayer: PrayerName): PrayerAdhanSettings => {
    const incomingPrayer = preferences?.[prayer] || {};
    return {
      enabled:
        typeof incomingPrayer.enabled === 'boolean'
          ? incomingPrayer.enabled
          : DEFAULT_ADHAN_PREFERENCES[prayer].enabled,
      playSound:
        shouldApplySoundDefaults
          ? DEFAULT_ADHAN_PREFERENCES[prayer].playSound
          : typeof incomingPrayer.playSound === 'boolean'
          ? incomingPrayer.playSound
          : DEFAULT_ADHAN_PREFERENCES[prayer].playSound,
      selectedVoice: migrateVoiceValue(
        incomingPrayer.selectedVoice || DEFAULT_ADHAN_PREFERENCES[prayer].selectedVoice
      ),
    };
  };

  const migrated: AdhanPreferences = {
    ...DEFAULT_ADHAN_PREFERENCES,
    ...preferences,
    schemaVersion: DEFAULT_ADHAN_PREFERENCES.schemaVersion,
    globalVoice: migrateVoiceValue(preferences.globalVoice || 'barakatullah'),
    fajr: migratePrayerSettings('fajr'),
    dhuhr: migratePrayerSettings('dhuhr'),
    asr: migratePrayerSettings('asr'),
    maghrib: migratePrayerSettings('maghrib'),
    isha: migratePrayerSettings('isha'),
  };

  return migrated;
}

/**
 * Load Adhan preferences from storage
 */
export async function loadAdhanPreferences(): Promise<AdhanPreferences> {
  try {
    const stored = await AsyncStorage.getItem(ADHAN_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Migrate old preferences to new format
      const migrated = migratePreferences(parsed);
      // Save migrated preferences back
      await saveAdhanPreferences(migrated);
      return migrated;
    }
  } catch (error) {
    console.error('Failed to load Adhan preferences:', error);
  }
  return DEFAULT_ADHAN_PREFERENCES;
}

/**
 * Save Adhan preferences to storage
 */
export async function saveAdhanPreferences(preferences: AdhanPreferences): Promise<void> {
  try {
    await AsyncStorage.setItem(ADHAN_STORAGE_KEY, JSON.stringify(preferences));
  } catch (error) {
    console.error('Failed to save Adhan preferences:', error);
  }
}

/**
 * Get the best available Adhan voice
 * Single-voice production policy
 */
export function getBestAvailableVoice(): AdhanVoice {
  if (ADHAN_VOICES.barakatullah.available) return 'barakatullah';
  return 'barakatullah'; // Fallback to barakatullah
}

/**
 * Get notification content for a prayer
 */
export function getNotificationContent(prayer: PrayerName, playSound: boolean): {
  title: string;
  body: string;
  sound: boolean;
} {
  const prayerMessages: Record<PrayerName, string> = {
    fajr: 'وقت نماز صبح است، همانا نماز صبح مشهود است.',
    dhuhr: 'وقت نماز ظهر است، نماز را برای یاد خدا برپا دارید.',
    asr: 'وقت نماز عصر است، نماز را پاس بدارید.',
    maghrib: 'وقت نماز شام است، پروردگار خویش را تسبیح گویید.',
    isha: 'وقت نماز خفتن است، دل را با یاد خدا آرام کنید.',
  };
  
  return {
    title: 'وقت نماز 🕌',
    body: prayerMessages[prayer],
    sound: playSound,
  };
}

/**
 * Get early reminder content
 */
export function getEarlyReminderContent(prayer: PrayerName, minutes: number): {
  title: string;
  body: string;
} {
  const prayerInfo = PRAYER_NAMES[prayer];
  
  return {
    title: 'یادآوری نماز',
    body: `${minutes} دقیقه تا ${prayerInfo.dari}`,
  };
}
