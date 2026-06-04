/**
 * Adhan Audio Manager
 * Handles playback of Adhan audio files
 * Uses expo-av for audio management
 */

import { Audio, AVPlaybackStatus } from 'expo-av';
import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system/legacy';
import { AdhanVoice, PrayerName } from './adhanManager';

const UNIFIED_ADHAN_FILE = require('../assets/audio/adhan/barakatullah_salim_18sec.mp3');

// Singleton audio manager instance
let adhanSound: Audio.Sound | null = null;
let isPlaying = false;
let cachedAdhanSource: { uri: string } | number | null = null;
let adhanSourcePromise: Promise<{ uri: string } | number> | null = null;

function describeError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error ?? 'unknown-error');
}

async function fileExists(uri: string): Promise<boolean> {
  if (!uri || !uri.startsWith('file://')) {
    return false;
  }

  try {
    const info = await FileSystem.getInfoAsync(uri);
    return info.exists;
  } catch {
    return false;
  }
}

async function resolveAdhanAudioSource(): Promise<{ uri: string } | number> {
  if (cachedAdhanSource) {
    return cachedAdhanSource;
  }

  if (adhanSourcePromise) {
    return adhanSourcePromise;
  }

  adhanSourcePromise = (async () => {
    const asset = Asset.fromModule(UNIFIED_ADHAN_FILE);

    if (asset.localUri && (await fileExists(asset.localUri))) {
      const source = { uri: asset.localUri };
      cachedAdhanSource = source;
      return source;
    }

    try {
      await asset.downloadAsync();
      const localUri = asset.localUri;
      if (localUri && (await fileExists(localUri))) {
        const source = { uri: localUri };
        cachedAdhanSource = source;
        return source;
      }
    } catch (error) {
      if (__DEV__) {
        console.log('[AdhanAudio] Bundled asset cache unavailable; using module source.', describeError(error));
      }
    }

    // In a release build this module id resolves to the bundled asset. In a dev
    // client it still depends on Metro, so callers handle failures softly.
    const fallbackSource = UNIFIED_ADHAN_FILE as number;
    cachedAdhanSource = fallbackSource;
    return fallbackSource;
  })().finally(() => {
    adhanSourcePromise = null;
  });

  return adhanSourcePromise;
}

/**
 * Configure audio session for Adhan playback
 * Sets up the audio to play even when phone is in silent mode (for iOS)
 */
export async function configureAdhanAudio(): Promise<void> {
  try {
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      staysActiveInBackground: true, // Critical for background playback
      playsInSilentModeIOS: true, // Important for audible Adhan notifications
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
    });
  } catch (error) {
    if (__DEV__) {
      console.log('[AdhanAudio] Failed to configure audio mode:', describeError(error));
    }
    throw error;
  }
}

/**
 * Play Adhan audio
 * @param voice - Voice key (kept for compatibility; unified sound is used)
 * @param prayer - Prayer type (optional, for logging)
 * @param onComplete - Callback when playback finishes
 */
export async function playAdhan(
  voice: AdhanVoice = 'barakatullah',
  prayer?: PrayerName,
  onComplete?: () => void
): Promise<boolean> {
  try {
    // Stop any currently playing Adhan
    await stopAdhan();
    
    // Configure audio mode (critical for background playback)
    await configureAdhanAudio();
    
    const audioSource = await resolveAdhanAudioSource();
    
    // Create and play sound
    const { sound } = await Audio.Sound.createAsync(
      audioSource,
      { 
        shouldPlay: true,
        volume: 1.0,
        isLooping: false,
      },
      (status: AVPlaybackStatus) => {
        if (!status.isLoaded) {
          if (status.error) {
            if (__DEV__) {
              console.log('[AdhanAudio] Playback status error:', status.error);
            }
            isPlaying = false;
            onComplete?.();
          }
          return;
        }

        if (status.didJustFinish) {
          isPlaying = false;
          onComplete?.();
        }
      }
    );
    
    adhanSound = sound;
    isPlaying = true;
    return true;
    
  } catch (error) {
    if (__DEV__) {
      console.log('[AdhanAudio] Playback unavailable:', {
        voice,
        prayer,
        reason: describeError(error),
      });
    }
    isPlaying = false;
    onComplete?.();
    return false;
  }
}

/**
 * Stop Adhan playback
 */
export async function stopAdhan(): Promise<void> {
  try {
    if (adhanSound) {
      await adhanSound.stopAsync();
      await adhanSound.unloadAsync();
      adhanSound = null;
    }
    isPlaying = false;
  } catch (error) {
    if (__DEV__) {
      console.log('[AdhanAudio] Failed to stop playback:', describeError(error));
    }
  }
}

/**
 * Check if Adhan is currently playing
 */
export function isAdhanPlaying(): boolean {
  return isPlaying;
}

/**
 * Test Adhan playback (for settings screen)
 * Plays a short preview of the unified adhan sound
 * @param voice - Which voice to test
 * @param prayer - Optional prayer type for log context
 * @param durationMs - How long to play (default 10 seconds)
 */
export async function testAdhanVoice(
  voice: AdhanVoice,
  prayer?: PrayerName,
  durationMs: number = 10000
): Promise<void> {
  return new Promise(async (resolve) => {
    await playAdhan(voice, prayer, () => {
      resolve();
    });
    
    // Auto-stop after duration
    setTimeout(async () => {
      await stopAdhan();
      resolve();
    }, durationMs);
  });
}

/**
 * Get audio file path for a voice
 * Used for notification sound attachment
 */
export function getAdhanAudioPath(voice: AdhanVoice): string | null {
  if (!voice) {
    return null;
  }
  return './assets/audio/adhan/barakatullah_salim_18sec.mp3';
}

/**
 * Preload Adhan audio for faster playback
 * Call this on app start
 */
export async function preloadAdhanAudio(): Promise<void> {
  await resolveAdhanAudioSource().catch((error) => {
    if (__DEV__) {
      console.log('[AdhanAudio] Preload unavailable:', describeError(error));
    }
  });
}

/**
 * Cleanup audio resources
 * Call this when app is closing
 */
export async function cleanupAdhanAudio(): Promise<void> {
  await stopAdhan();
}
