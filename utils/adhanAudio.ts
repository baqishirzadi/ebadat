/**
 * Adhan Audio Manager
 * Handles playback of Adhan audio files
 * Uses expo-av for audio management
 */

import { Audio, AVPlaybackStatus } from 'expo-av';
import { AdhanVoice, ADHAN_VOICES, PrayerName } from './adhanManager';

// Audio file mapping
// These files should be placed in /assets/audio/adhan/
// NOTE: Using require() for bundled assets
const ADHAN_AUDIO_FILES: Record<AdhanVoice, any> = {
  barakatullah: require('../assets/audio/adhan/barakatullah_salim.mp3'),
  sheikh_ali_ahmed_mulla: require('../assets/audio/adhan/fajr_adhan.mp3'), // fajr_adhan.mp3 contains Sheikh Ali Ahmed Mulla's Adhan
};

// Special Fajr Adhan file (always uses Sheikh Ali Ahmed Mulla's Adhan)
const FAJR_ADHAN_FILE = require('../assets/audio/adhan/fajr_adhan.mp3');

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
      playsInSilentModeIOS: true, // Important for Fajr Adhan
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
 * @param voice - Which Adhan voice to play (ignored if prayer is 'fajr')
 * @param prayer - Prayer type (optional). If 'fajr', uses special Fajr Adhan
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
    
    // For Fajr, always use the special Fajr Adhan file
    // For other prayers, use the selected voice (defaults to barakatullah)
    let audioSource;
    if (prayer === 'fajr') {
      audioSource = FAJR_ADHAN_FILE;
      console.log('📿 Playing Fajr Adhan (Sheikh Ali Ahmed Mulla)');
    } else {
      audioSource = ADHAN_AUDIO_FILES[voice] || ADHAN_AUDIO_FILES.barakatullah;
      console.log(`📿 Playing Adhan with voice: ${voice} for prayer: ${prayer || 'unknown'}`);
    }
    
    if (!audioSource) {
      console.warn(`⚠️ Adhan audio file not found for voice: ${voice}, prayer: ${prayer}`);
      onComplete?.();
      return;
    }
    
    // Create and play sound
    const { sound } = await Audio.Sound.createAsync(
      audioSource,
      { 
        shouldPlay: true,
        volume: 1.0,
        isLooping: false,
      },
      (status: AVPlaybackStatus) => {
        if (status.isLoaded) {
          if (status.didJustFinish) {
            console.log('✅ Adhan playback completed');
            isPlaying = false;
            onComplete?.();
          } else if (status.error) {
            console.error('❌ Adhan playback error:', status.error);
            isPlaying = false;
            onComplete?.();
          }
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
 * Plays a short preview of the selected voice
 * @param voice - Which voice to test
 * @param prayer - Optional prayer type (if 'fajr', plays Fajr Adhan)
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
  const voiceInfo = ADHAN_VOICES[voice];
  if (!voiceInfo || !voiceInfo.available) {
    return null;
  }
  
  // Return relative path for expo-notifications
  return `./assets/audio/adhan/${voiceInfo.filename}`;
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
