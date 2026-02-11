/**
 * Quran Audio Manager
 * Handles audio playback with dual reciters: Ghamidi & Muaiqly
 * Uses EveryAyah.com for high-quality audio
 */

import { Audio, AVPlaybackStatus } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  documentDirectory,
  makeDirectoryAsync,
  getInfoAsync,
  downloadAsync,
} from 'expo-file-system/legacy';

// ═══════════════════════════════════════════════════
// RECITER CONFIGURATION
// ═══════════════════════════════════════════════════

export type ReciterId = 'ghamidi' | 'muaiqly';

export interface ReciterInfo {
  id: ReciterId;
  name: string;
  nameArabic: string;
  baseUrl: string;
  quality: string;
}

export const RECITERS: Record<ReciterId, ReciterInfo> = {
  ghamidi: {
    id: 'ghamidi',
    name: 'Saad Al-Ghamidi',
    nameArabic: 'سعد الغامدی',
    baseUrl: 'https://everyayah.com/data/Ghamadi_40kbps',
    quality: '40kbps',
  },
  muaiqly: {
    id: 'muaiqly',
    name: 'Maher Al-Muaiqly',
    nameArabic: 'ماهر المعیقلی',
    baseUrl: 'https://everyayah.com/data/Maher_AlMuaiqly_64kbps',
    quality: '64kbps',
  },
};

// Storage key
const RECITER_STORAGE_KEY = '@ebadat/selected_reciter';

// Audio directory for offline caching
const AUDIO_DIRECTORY = `${documentDirectory}quran_audio/`;

// Small surahs to cache for offline use
const SMALL_SURAHS = [1, 103, 104, 105, 106, 107, 108, 109, 110, 111, 112, 113, 114];

// ═══════════════════════════════════════════════════
// AUDIO MANAGER CLASS
// ═══════════════════════════════════════════════════

export class QuranAudioManager {
  private sound: Audio.Sound | null = null;
  private currentReciter: ReciterId = 'ghamidi';
  private isPlaying: boolean = false;
  private playbackSpeed: number = 1.0;
  private repeatMode: 'none' | 'ayah' | 'surah' = 'none';
  private onStatusUpdate: ((status: AudioStatus) => void) | null = null;
  private onAyahComplete: (() => void) | null = null;

  constructor() {
    this.initialize();
  }

  // Initialize audio manager
  async initialize() {
    try {
      // Set audio mode for background playback
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        staysActiveInBackground: true,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });

      // Ensure audio directory exists
      await makeDirectoryAsync(AUDIO_DIRECTORY, { intermediates: true });

      // Load saved reciter preference
      const savedReciter = await AsyncStorage.getItem(RECITER_STORAGE_KEY);
      if (savedReciter && (savedReciter === 'ghamidi' || savedReciter === 'muaiqly')) {
        this.currentReciter = savedReciter;
      }
    } catch (error) {
      console.log('Audio manager init error:', error);
    }
  }

  // Get audio file URL
  private getAudioUrl(surah: number, ayah: number): string {
    const filename = `${String(surah).padStart(3, '0')}${String(ayah).padStart(3, '0')}.mp3`;
    return `${RECITERS[this.currentReciter].baseUrl}/${filename}`;
  }

  // Get local cache path
  private getLocalPath(surah: number, ayah: number): string {
    const filename = `${this.currentReciter}_${String(surah).padStart(3, '0')}${String(ayah).padStart(3, '0')}.mp3`;
    return `${AUDIO_DIRECTORY}${filename}`;
  }

  // Check if audio is cached locally
  async isAudioCached(surah: number, ayah: number): Promise<boolean> {
    const localPath = this.getLocalPath(surah, ayah);
    try {
      const fileInfo = await getInfoAsync(localPath);
      return fileInfo.exists;
    } catch {
      return false;
    }
  }

  // Download audio for offline use
  async downloadAudio(surah: number, ayah: number): Promise<string | null> {
    const localPath = this.getLocalPath(surah, ayah);
    const audioUrl = this.getAudioUrl(surah, ayah);

    try {
      const downloadResult = await downloadAsync(audioUrl, localPath);
      if (downloadResult.status === 200) {
        return localPath;
      }
    } catch (error) {
      console.log('Download error:', error);
    }
    return null;
  }

  // Get audio source (local or remote)
  async getAudioSource(surah: number, ayah: number): Promise<string> {
    const localPath = this.getLocalPath(surah, ayah);
    const isCached = await this.isAudioCached(surah, ayah);
    
    if (isCached) {
      return localPath;
    }
    
    // For small surahs, download and cache
    if (SMALL_SURAHS.includes(surah)) {
      const downloaded = await this.downloadAudio(surah, ayah);
      if (downloaded) {
        return downloaded;
      }
    }
    
    // Stream from URL
    return this.getAudioUrl(surah, ayah);
  }

  // Playback status handler
  private handlePlaybackStatus = (status: AVPlaybackStatus) => {
    if (!status.isLoaded) {
      this.onStatusUpdate?.({
        isPlaying: false,
        isLoading: false,
        position: 0,
        duration: 0,
        isBuffering: false,
      });
      return;
    }

    this.isPlaying = status.isPlaying;
    
    this.onStatusUpdate?.({
      isPlaying: status.isPlaying,
      isLoading: false,
      position: status.positionMillis,
      duration: status.durationMillis || 0,
      isBuffering: status.isBuffering,
    });

    if (status.didJustFinish) {
      if (this.repeatMode === 'ayah') {
        this.sound?.replayAsync();
      } else {
        this.onAyahComplete?.();
      }
    }
  };

  // Play a single ayah
  async playAyah(surah: number, ayah: number): Promise<void> {
    await this.unload();

    this.onStatusUpdate?.({
      isPlaying: false,
      isLoading: true,
      position: 0,
      duration: 0,
      isBuffering: true,
    });

    try {
      const localPath = this.getLocalPath(surah, ayah);
      const audioSource = await this.getAudioSource(surah, ayah);
      
      const { sound } = await Audio.Sound.createAsync(
        { uri: audioSource },
        { shouldPlay: true, rate: this.playbackSpeed, shouldCorrectPitch: true },
        this.handlePlaybackStatus
      );

      this.sound = sound;

      // After first listen, cache this ayah for offline use
      if (audioSource !== localPath) {
        this.downloadAudio(surah, ayah).catch(() => {});
      }
    } catch (error) {
      console.log('Play error:', error);
      this.onStatusUpdate?.({
        isPlaying: false,
        isLoading: false,
        position: 0,
        duration: 0,
        isBuffering: false,
        error: 'خطا در پخش صوت',
      });
    }
  }

  // Play continuous from current ayah to end of surah
  async playContinuous(
    surah: number, 
    startAyah: number, 
    totalAyahs: number,
    onAyahChange: (ayah: number) => void
  ): Promise<void> {
    for (let ayah = startAyah; ayah <= totalAyahs; ayah++) {
      onAyahChange(ayah);
      await this.playAyah(surah, ayah);

      // Wait for completion
      await new Promise<void>((resolve) => {
        this.onAyahComplete = () => {
          if (this.repeatMode === 'surah' && ayah === totalAyahs) {
            ayah = startAyah - 1; // Reset to start (will be incremented)
          }
          resolve();
        };
      });
    }
  }

  // Pause playback
  async pause(): Promise<void> {
    if (this.sound) {
      await this.sound.pauseAsync();
    }
  }

  // Resume playback
  async resume(): Promise<void> {
    if (this.sound) {
      await this.sound.playAsync();
    }
  }

  // Toggle play/pause
  async togglePlayPause(): Promise<void> {
    if (this.isPlaying) {
      await this.pause();
    } else {
      await this.resume();
    }
  }

  // Stop playback
  async stop(): Promise<void> {
    if (this.sound) {
      await this.sound.stopAsync();
    }
  }

  // Unload audio
  async unload(): Promise<void> {
    if (this.sound) {
      await this.sound.unloadAsync();
      this.sound = null;
    }
  }

  // Seek to position
  async seek(positionMillis: number): Promise<void> {
    if (this.sound) {
      await this.sound.setPositionAsync(positionMillis);
    }
  }

  // Seek backward 5 seconds
  async seekBackward(): Promise<void> {
    if (this.sound) {
      const status = await this.sound.getStatusAsync();
      if (status.isLoaded) {
        const newPosition = Math.max(0, status.positionMillis - 5000);
        await this.sound.setPositionAsync(newPosition);
      }
    }
  }

  // Seek forward 5 seconds
  async seekForward(): Promise<void> {
    if (this.sound) {
      const status = await this.sound.getStatusAsync();
      if (status.isLoaded) {
        const newPosition = Math.min(status.durationMillis || 0, status.positionMillis + 5000);
        await this.sound.setPositionAsync(newPosition);
      }
    }
  }

  // Set playback speed (0.75, 1.0, 1.25)
  async setSpeed(speed: number): Promise<void> {
    this.playbackSpeed = speed;
    if (this.sound) {
      await this.sound.setRateAsync(speed, true);
    }
  }

  // Set repeat mode
  setRepeatMode(mode: 'none' | 'ayah' | 'surah'): void {
    this.repeatMode = mode;
  }

  // Get current repeat mode
  getRepeatMode(): 'none' | 'ayah' | 'surah' {
    return this.repeatMode;
  }

  // Set reciter
  async setReciter(reciter: ReciterId): Promise<void> {
    this.currentReciter = reciter;
    await AsyncStorage.setItem(RECITER_STORAGE_KEY, reciter);
  }

  // Get current reciter
  getReciter(): ReciterId {
    return this.currentReciter;
  }

  // Get reciter info
  getReciterInfo(): ReciterInfo {
    return RECITERS[this.currentReciter];
  }

  // Set status update callback
  setOnStatusUpdate(callback: (status: AudioStatus) => void): void {
    this.onStatusUpdate = callback;
  }

  // Set ayah complete callback
  setOnAyahComplete(callback: () => void): void {
    this.onAyahComplete = callback;
  }

  // Cache small surahs for offline
  async cacheSmallSurahs(onProgress?: (progress: number) => void): Promise<void> {
    const totalAyahs = SMALL_SURAHS.reduce((sum, surah) => {
      // Approximate ayah counts for small surahs
      const counts: Record<number, number> = {
        1: 7, 103: 3, 104: 9, 105: 5, 106: 4,
        107: 7, 108: 3, 109: 6, 110: 3, 111: 5,
        112: 4, 113: 5, 114: 6
      };
      return sum + (counts[surah] || 7);
    }, 0);

    let completed = 0;

    for (const surah of SMALL_SURAHS) {
      const counts: Record<number, number> = {
        1: 7, 103: 3, 104: 9, 105: 5, 106: 4,
        107: 7, 108: 3, 109: 6, 110: 3, 111: 5,
        112: 4, 113: 5, 114: 6
      };
      const ayahCount = counts[surah] || 7;

      for (let ayah = 1; ayah <= ayahCount; ayah++) {
        const isCached = await this.isAudioCached(surah, ayah);
        if (!isCached) {
          await this.downloadAudio(surah, ayah);
        }
        completed++;
        onProgress?.(completed / totalAyahs);
      }
    }
  }

  // Get cache status
  async getCacheStatus(): Promise<{
    cachedSurahs: number[];
    totalCached: number;
  }> {
    const cachedSurahs: number[] = [];
    let totalCached = 0;

    for (const surah of SMALL_SURAHS) {
      const isCached = await this.isAudioCached(surah, 1);
      if (isCached) {
        cachedSurahs.push(surah);
        totalCached++;
      }
    }

    return { cachedSurahs, totalCached };
  }
}

// Audio status interface
export interface AudioStatus {
  isPlaying: boolean;
  isLoading: boolean;
  position: number;
  duration: number;
  isBuffering: boolean;
  error?: string;
}

// Singleton instance
let audioManagerInstance: QuranAudioManager | null = null;

export function getQuranAudioManager(): QuranAudioManager {
  if (!audioManagerInstance) {
    audioManagerInstance = new QuranAudioManager();
  }
  return audioManagerInstance;
}

// Speed options
export const PLAYBACK_SPEEDS = [
  { value: 0.75, label: '۰.۷۵×', labelDari: 'آهسته' },
  { value: 1.0, label: '۱×', labelDari: 'عادی' },
  { value: 1.25, label: '۱.۲۵×', labelDari: 'تند' },
];

// Repeat mode options
export const REPEAT_MODES = [
  { value: 'none', label: 'بدون تکرار', icon: 'repeat' },
  { value: 'ayah', label: 'تکرار آیه', icon: 'repeat-one' },
  { value: 'surah', label: 'تکرار سوره', icon: 'repeat' },
] as const;
