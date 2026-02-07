/**
 * Adhan Manager
 * Manages Adhan notification settings, voice selection, and scheduling
 * Designed for Afghan Hanafi users with respectful UX
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

// Storage key
export const ADHAN_STORAGE_KEY = '@ebadat/adhan_settings';

// Adhan voice options
export type AdhanVoice = 'barakatullah' | 'sheikh_ali_ahmed_mulla';

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
    filename: 'barakatullah_salim.mp3',
    available: true,
  },
  sheikh_ali_ahmed_mulla: {
    id: 'sheikh_ali_ahmed_mulla',
    nameDari: 'شیخ علی احمد ملا',
    namePashto: 'شیخ علی احمد ملا',
    description: 'مؤذن با صدای زیبا',
    filename: 'fajr_adhan.mp3', // Note: This file contains Sheikh Ali Ahmed Mulla's Adhan
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

// Default settings - Fajr with sound, others silent
export const DEFAULT_ADHAN_PREFERENCES: AdhanPreferences = {
  masterEnabled: true,
  
  // Fajr: Full Adhan with sound (per requirements)
  fajr: {
    enabled: true,
    playSound: true,
    // Use Sheikh Ali Ahmed Mulla voice metadata for consistency,
    // though runtime playback always uses the dedicated Fajr Adhan file.
    selectedVoice: 'sheikh_ali_ahmed_mulla',
  },
  
  // Others: Silent notifications only (per requirements)
  dhuhr: {
    enabled: false,
    playSound: false,
    selectedVoice: 'barakatullah',
  },
  asr: {
    enabled: false,
    playSound: false,
    selectedVoice: 'barakatullah',
  },
  maghrib: {
    enabled: false,
    playSound: false,
    selectedVoice: 'barakatullah',
  },
  isha: {
    enabled: false,
    playSound: false,
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
  // Map old voice values to new ones
  if (oldVoice === 'tarek' || oldVoice === 'default') {
    return 'barakatullah'; // Default to barakatullah for old voices
  }
  // If it's already a valid new voice, return it
  if (oldVoice === 'barakatullah' || oldVoice === 'sheikh_ali_ahmed_mulla') {
    return oldVoice as AdhanVoice;
  }
  // Fallback
  return 'barakatullah';
}

/**
 * Migrate preferences to new format
 */
function migratePreferences(preferences: any): AdhanPreferences {
  const migrated: AdhanPreferences = {
    ...DEFAULT_ADHAN_PREFERENCES,
    ...preferences,
    globalVoice: migrateVoiceValue(preferences.globalVoice || 'barakatullah'),
  };

  // Migrate each prayer's voice
  const prayers: PrayerName[] = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];
  for (const prayer of prayers) {
    if (preferences[prayer]) {
      migrated[prayer] = {
        ...DEFAULT_ADHAN_PREFERENCES[prayer],
        ...preferences[prayer],
        selectedVoice: migrateVoiceValue(preferences[prayer].selectedVoice || 'barakatullah'),
      };
    }
  }

  // Enforce Fajr default on + sound (critical requirement)
  migrated.fajr.enabled = true;
  migrated.fajr.playSound = true;

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
 * Priority: Barakatullah > Sheikh Ali Ahmed Mulla
 */
export function getBestAvailableVoice(): AdhanVoice {
  if (ADHAN_VOICES.barakatullah.available) return 'barakatullah';
  if (ADHAN_VOICES.sheikh_ali_ahmed_mulla.available) return 'sheikh_ali_ahmed_mulla';
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
  const prayerInfo = PRAYER_NAMES[prayer];
  
  return {
    title: 'وقت نماز 🕌',
    body: `حان وقت ${prayerInfo.arabic}\n${prayerInfo.dari}`,
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
