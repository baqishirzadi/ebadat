/**
 * Adhan Audio Manager
 * Handles playback of Adhan audio files
 * Uses expo-av for audio management
 */

import { Audio, AVPlaybackStatus } from 'expo-av';
import { AdhanVoice, PrayerName } from './adhanManager';

const UNIFIED_ADHAN_FILE = require('../assets/audio/adhan/barakatullah_salim_18sec.mp3');

// Singleton audio manager instance
let adhanSound: Audio.Sound | null = null;
let isPlaying = false;

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
    console.log('✅ Adhan audio configured for background playback');
  } catch (error) {
    console.error('❌ Failed to configure Adhan audio:', error);
    throw error; // Re-throw to allow caller to handle
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
): Promise<void> {
  try {
    console.log(`🎵 Starting Adhan playback: voice=${voice}, prayer=${prayer || 'none'}`);
    
    // Stop any currently playing Adhan
    await stopAdhan();
    
    // Configure audio mode (critical for background playback)
    await configureAdhanAudio();
    
    const audioSource = UNIFIED_ADHAN_FILE;
    console.log(`📿 Playing unified Adhan sound for prayer: ${prayer || 'unknown'}`);
    
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
            console.error('❌ Adhan playback error:', status.error);
            isPlaying = false;
            onComplete?.();
          }
          return;
        }

        if (status.didJustFinish) {
          console.log('✅ Adhan playback completed');
          isPlaying = false;
          onComplete?.();
        }
      }
    );
    
    adhanSound = sound;
    isPlaying = true;
    console.log('✅ Adhan playback started successfully');
    
  } catch (error) {
    console.error('❌ Failed to play Adhan:', error);
    isPlaying = false;
    onComplete?.();
    throw error; // Re-throw to allow caller to handle
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
    console.error('Failed to stop Adhan:', error);
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
  // TODO: Implement preloading when audio files are available
  // This helps reduce latency when Adhan needs to play
  console.log('Adhan audio preload: Files not yet available');
}

/**
 * Cleanup audio resources
 * Call this when app is closing
 */
export async function cleanupAdhanAudio(): Promise<void> {
  await stopAdhan();
}
