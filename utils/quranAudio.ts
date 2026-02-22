import { Audio } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import * as Network from 'expo-network';
import TrackPlayer, { State as TrackPlayerState } from 'react-native-track-player';

export type ReciterKey = 'ghamidi' | 'muaiqly';

export const RECITERS = {
  ghamidi: {
    key: 'ghamidi' as ReciterKey,
    name: 'سعد الغامدی',
    baseUrl: 'https://everyayah.com/data/Ghamadi_40kbps',
  },
  muaiqly: {
    key: 'muaiqly' as ReciterKey,
    name: 'ماهر المعیقلی',
    baseUrl: 'https://everyayah.com/data/Maher_AlMuaiqly_64kbps',
  },
};

export function getAyahUrl(surah: number, ayah: number, reciter: ReciterKey = 'ghamidi'): string {
  const s = String(surah).padStart(3, '0');
  const a = String(ayah).padStart(3, '0');
  return `${RECITERS[reciter].baseUrl}/${s}${a}.mp3`;
}

export function getQuranPlaybackErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  if (message.startsWith('offline_cache_miss')) {
    return 'این آیه هنوز ذخیره نشده است. برای بار اول اینترنت را وصل کنید.';
  }
  if (message.startsWith('cache_write_failed')) {
    return 'ذخیره فایل صوتی انجام نشد. لطفاً دوباره تلاش کنید.';
  }
  return 'پخش آیه ممکن نیست. لطفاً دوباره تلاش کنید.';
}

const MIN_VALID_CACHE_FILE_BYTES = 1024;
const MAX_SYNC_CACHE_ATTEMPTS = 3;
const MAX_BACKGROUND_CACHE_ATTEMPTS = 2;
const CACHE_RETRY_BASE_DELAY_MS = 350;

function getDocumentDirectory(): string | null {
  const documentDirectory = (FileSystem as any).documentDirectory as string | null | undefined;
  return typeof documentDirectory === 'string' ? documentDirectory : null;
}

// Returns the permanent local path for a cached ayah
function getAyahCachePath(surah: number, ayah: number, reciter: ReciterKey): string | null {
  const documentDirectory = getDocumentDirectory();
  if (!documentDirectory) return null;

  const s = String(surah).padStart(3, '0');
  const a = String(ayah).padStart(3, '0');
  return `${documentDirectory}quran_audio/${reciter}/${s}${a}.mp3`;
}

// Creates cache directory if it does not exist
async function ensureCacheDir(reciter: ReciterKey): Promise<void> {
  const documentDirectory = getDocumentDirectory();
  if (!documentDirectory) return;

  const dir = `${documentDirectory}quran_audio/${reciter}/`;
  const info = await FileSystem.getInfoAsync(dir);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
  }
}

const RECITER_KEY = 'quran_selected_reciter';
const LAST_POSITION_KEY = 'quran_last_position';
type CacheResolution = {
  uri: string;
  usedStreamingFallback: boolean;
};

class QuranAudioManager {
  private sound: Audio.Sound | null = null;
  private currentReciter: ReciterKey = 'ghamidi';
  private currentSurah = 0;
  private currentAyah = 0;
  private isPlaying = false;
  private isContinuous = false;
  private totalAyahs = 0;
  private playbackSessionId = 0;
  private hasHandledCompletion = false;
  private backgroundCacheInFlight = new Set<string>();
  private onAyahChangeCb: ((surah: number, ayah: number) => void) | null = null;
  private onPlaybackEndCb: (() => void) | null = null;

  async initialize(): Promise<void> {
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
        shouldDuckAndroid: true,
      });
      const saved = await AsyncStorage.getItem(RECITER_KEY);
      if (saved === 'ghamidi' || saved === 'muaiqly') {
        this.currentReciter = saved;
      }
    } catch (e) {
      console.error('QuranAudio init error:', e);
    }
  }

  async setReciter(reciter: ReciterKey): Promise<void> {
    if (this.isPlaying) await this.stop();
    this.currentReciter = reciter;
    await AsyncStorage.setItem(RECITER_KEY, reciter);
  }

  getReciter(): ReciterKey {
    return this.currentReciter;
  }

  setOnAyahChange(cb: (surah: number, ayah: number) => void): void {
    this.onAyahChangeCb = cb;
  }

  setOnPlaybackEnd(cb: () => void): void {
    this.onPlaybackEndCb = cb;
  }

  private isValidCachedAudioFile(info: unknown): boolean {
    const fileInfo = info as { exists?: boolean; isDirectory?: boolean; size?: number };
    return Boolean(
      fileInfo?.exists &&
      !fileInfo?.isDirectory &&
      typeof fileInfo?.size === 'number' &&
      fileInfo.size >= MIN_VALID_CACHE_FILE_BYTES
    );
  }

  private async removeFileIfExists(path: string): Promise<void> {
    try {
      const info = await FileSystem.getInfoAsync(path);
      if (info.exists && !info.isDirectory) {
        await FileSystem.deleteAsync(path, { idempotent: true });
      }
    } catch {
      // no-op
    }
  }

  private getCacheKey(surah: number, ayah: number, reciter: ReciterKey): string {
    return `${reciter}:${surah}:${ayah}`;
  }

  private logCacheOutcome(
    status: 'cache_hit' | 'cache_write_ok' | 'cache_write_failed' | 'cache_retry_ok' | 'cache_retry_failed',
    surah: number,
    ayah: number,
    reciter: ReciterKey
  ): void {
    console.log(`[QuranCache] ${status} reciter=${reciter} surah=${surah} ayah=${ayah}`);
  }

  private async wait(ms: number): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, ms));
  }

  private async isNetworkAvailable(): Promise<boolean> {
    try {
      const state = await Network.getNetworkStateAsync();
      if (typeof state.isInternetReachable === 'boolean') {
        return state.isInternetReachable;
      }
      return Boolean(state.isConnected);
    } catch {
      // If network status cannot be resolved, keep playback path permissive.
      return true;
    }
  }

  private async downloadAyahToCache(surah: number, ayah: number, reciter: ReciterKey): Promise<boolean> {
    const cachePath = getAyahCachePath(surah, ayah, reciter);
    if (!cachePath) return false;

    const tempPath = `${cachePath}.tmp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const url = getAyahUrl(surah, ayah, reciter);

    try {
      await ensureCacheDir(reciter);
      await this.removeFileIfExists(tempPath);

      const result = await FileSystem.downloadAsync(url, tempPath);
      if (result.status !== 200) {
        await this.removeFileIfExists(tempPath);
        return false;
      }

      const tempInfo = await FileSystem.getInfoAsync(tempPath);
      if (!this.isValidCachedAudioFile(tempInfo)) {
        await this.removeFileIfExists(tempPath);
        return false;
      }

      await this.removeFileIfExists(cachePath);
      await FileSystem.moveAsync({ from: tempPath, to: cachePath });

      const finalInfo = await FileSystem.getInfoAsync(cachePath);
      if (!this.isValidCachedAudioFile(finalInfo)) {
        await this.removeFileIfExists(cachePath);
        return false;
      }

      return true;
    } catch {
      await this.removeFileIfExists(tempPath);
      return false;
    }
  }

  private async downloadAyahToCacheWithRetries(
    surah: number,
    ayah: number,
    reciter: ReciterKey,
    attempts: number
  ): Promise<boolean> {
    for (let attempt = 1; attempt <= attempts; attempt++) {
      const ok = await this.downloadAyahToCache(surah, ayah, reciter);
      if (ok) return true;
      if (attempt < attempts) {
        await this.wait(CACHE_RETRY_BASE_DELAY_MS * attempt);
      }
    }
    return false;
  }

  private async ensureCachedInBackground(surah: number, ayah: number, reciter: ReciterKey): Promise<void> {
    const cacheKey = this.getCacheKey(surah, ayah, reciter);
    if (this.backgroundCacheInFlight.has(cacheKey)) return;

    this.backgroundCacheInFlight.add(cacheKey);
    try {
      const cached = await this.isAyahCached(surah, ayah, reciter);
      if (cached) return;

      const ok = await this.downloadAyahToCacheWithRetries(
        surah,
        ayah,
        reciter,
        MAX_BACKGROUND_CACHE_ATTEMPTS
      );
      this.logCacheOutcome(ok ? 'cache_retry_ok' : 'cache_retry_failed', surah, ayah, reciter);
    } finally {
      this.backgroundCacheInFlight.delete(cacheKey);
    }
  }

  private prefetchNextAyahInBackground(
    surah: number,
    ayah: number,
    totalAyahsInSurah: number,
    reciter: ReciterKey
  ): void {
    if (!this.isContinuous) return;
    const nextAyah = ayah + 1;
    if (nextAyah > totalAyahsInSurah) return;
    void this.ensureCachedInBackground(surah, nextAyah, reciter);
  }

  private async stopCompetingNaatPlayback(): Promise<void> {
    try {
      const playbackState = await TrackPlayer.getPlaybackState();
      if (
        playbackState.state === TrackPlayerState.Playing ||
        playbackState.state === TrackPlayerState.Paused ||
        playbackState.state === TrackPlayerState.Buffering ||
        playbackState.state === TrackPlayerState.Loading ||
        playbackState.state === TrackPlayerState.Ready
      ) {
        await TrackPlayer.reset();
      }
    } catch {
      // TrackPlayer may be unavailable or not initialized; Quran playback should continue
    }
  }

  // Cache-first URI resolver
  // First play: downloads from everyayah.com -> saves to documentDirectory -> plays local
  // After that: plays from local file forever (no internet needed)
  private async getAudioUri(
    surah: number,
    ayah: number,
    reciter: ReciterKey
  ): Promise<CacheResolution> {
    const cachePath = getAyahCachePath(surah, ayah, reciter);
    if (!cachePath) {
      return { uri: getAyahUrl(surah, ayah, reciter), usedStreamingFallback: true };
    }

    try {
      const cached = await this.isAyahCached(surah, ayah, reciter);
      if (cached) {
        this.logCacheOutcome('cache_hit', surah, ayah, reciter);
        return { uri: cachePath, usedStreamingFallback: false };
      }

      const info = await FileSystem.getInfoAsync(cachePath);
      // Corrupt or partial cache should not be reused
      if (info.exists) {
        await this.removeFileIfExists(cachePath);
      }
    } catch {
      // Cache check failed - fall through to download
    }

    const wroteToCache = await this.downloadAyahToCacheWithRetries(
      surah,
      ayah,
      reciter,
      MAX_SYNC_CACHE_ATTEMPTS
    );
    if (wroteToCache) {
      this.logCacheOutcome('cache_write_ok', surah, ayah, reciter);
      return { uri: cachePath, usedStreamingFallback: false };
    }
    this.logCacheOutcome('cache_write_failed', surah, ayah, reciter);

    const isOnline = await this.isNetworkAvailable();
    if (!isOnline) {
      throw new Error(`offline_cache_miss reciter=${reciter} surah=${surah} ayah=${ayah}`);
    }
    throw new Error(`cache_write_failed reciter=${reciter} surah=${surah} ayah=${ayah}`);
  }

  async playAyah(
    surah: number,
    ayah: number,
    totalAyahsInSurah: number,
    continuous = false,
    interruptCompetingAudio = true
  ): Promise<void> {
    try {
      const sessionId = ++this.playbackSessionId;
      this.hasHandledCompletion = false;
      if (interruptCompetingAudio) {
        await this.stopCompetingNaatPlayback();
      }
      if (sessionId !== this.playbackSessionId) return;
      await this._unloadCurrent();
      if (sessionId !== this.playbackSessionId) return;

      this.currentSurah = surah;
      this.currentAyah = ayah;
      this.isContinuous = continuous;
      this.totalAyahs = totalAyahsInSurah;
      this.isPlaying = true;

      this.onAyahChangeCb?.(surah, ayah);
      await AsyncStorage.setItem(LAST_POSITION_KEY, JSON.stringify({ surah, ayah }));

      const audioSource = await this.getAudioUri(surah, ayah, this.currentReciter);
      if (sessionId !== this.playbackSessionId) return;

      const { sound } = await this._loadWithRetry(audioSource.uri);
      if (sessionId !== this.playbackSessionId) {
        try {
          await sound.unloadAsync();
        } catch {}
        return;
      }

      this.sound = sound;

      sound.setOnPlaybackStatusUpdate((status) => {
        if (!status.isLoaded) return;
        if (sessionId !== this.playbackSessionId || !this.isPlaying) return;
        if (this.hasHandledCompletion) return;

        if (status.didJustFinish) {
          this.hasHandledCompletion = true;
          void this._handleComplete();
          return;
        }

        if (
          status.isPlaying &&
          status.durationMillis &&
          status.durationMillis > 0 &&
          status.positionMillis
        ) {
          const progress = status.positionMillis / status.durationMillis;
          if (progress >= 0.97) {
            this.hasHandledCompletion = true;
            void this._handleComplete();
          }
        }
      });

      if (sessionId !== this.playbackSessionId) {
        try {
          await sound.unloadAsync();
        } catch {}
        return;
      }

      await sound.playAsync();

      if (audioSource.usedStreamingFallback) {
        void this.ensureCachedInBackground(surah, ayah, this.currentReciter);
      }

      this.prefetchNextAyahInBackground(surah, ayah, totalAyahsInSurah, this.currentReciter);
    } catch (e) {
      const resolvedError = e instanceof Error ? e : new Error(String(e));
      const message = resolvedError.message;
      if (message.startsWith('offline_cache_miss')) {
        console.error(`[QuranCache] offline_cache_miss ${message}`);
      } else if (message.startsWith('cache_write_failed')) {
        console.error(`[QuranCache] cache_write_failed ${message}`);
      } else {
        console.error('playAyah error:', resolvedError);
      }
      this.isPlaying = false;
      this.onPlaybackEndCb?.();
      throw resolvedError;
    }
  }

  private async _handleComplete(): Promise<void> {
    if (!this.isContinuous || !this.isPlaying) {
      this.isPlaying = false;
      this.onPlaybackEndCb?.();
      return;
    }
    const next = this.currentAyah + 1;
    if (next > this.totalAyahs) {
      this.isPlaying = false;
      this.isContinuous = false;
      this.onPlaybackEndCb?.();
      return;
    }
    // 300ms gap prevents first-letter repeat bug and jamming
    await new Promise((r) => setTimeout(r, 300));
    try {
      await this.playAyah(this.currentSurah, next, this.totalAyahs, true, false);
    } catch {
      // Error already logged and playback-end callback has been invoked inside playAyah.
    }
  }

  private async _loadWithRetry(url: string, retries = 3): Promise<{ sound: Audio.Sound }> {
    let lastErr: unknown;
    for (let i = 1; i <= retries; i++) {
      try {
        return await Audio.Sound.createAsync(
          { uri: url },
          { shouldPlay: false, progressUpdateIntervalMillis: 100 }
        );
      } catch (e) {
        lastErr = e;
        if (i < retries) await new Promise((r) => setTimeout(r, 500 * i));
      }
    }
    throw lastErr;
  }

  private async _unloadCurrent(): Promise<void> {
    if (this.sound) {
      try {
        await this.sound.stopAsync();
      } catch {}
      try {
        await this.sound.unloadAsync();
      } catch {}
      this.sound = null;
    }
  }

  async pause(): Promise<void> {
    try {
      if (this.sound) {
        await this.sound.pauseAsync();
        this.isPlaying = false;
      }
    } catch {}
  }

  async resume(): Promise<void> {
    try {
      if (this.sound) {
        await this.stopCompetingNaatPlayback();
        await this.sound.playAsync();
        this.isPlaying = true;
      }
    } catch {}
  }

  async stop(): Promise<void> {
    this.playbackSessionId += 1;
    this.isPlaying = false;
    this.isContinuous = false;
    await this._unloadCurrent();
    this.onPlaybackEndCb?.();
  }

  getIsPlaying(): boolean {
    return this.isPlaying;
  }

  getCurrentSurah(): number {
    return this.currentSurah;
  }

  getCurrentAyah(): number {
    return this.currentAyah;
  }

  async isAyahCached(
    surah: number,
    ayah: number,
    reciter: ReciterKey = this.currentReciter
  ): Promise<boolean> {
    const cachePath = getAyahCachePath(surah, ayah, reciter);
    if (!cachePath) return false;

    try {
      const info = await FileSystem.getInfoAsync(cachePath);
      return this.isValidCachedAudioFile(info);
    } catch {
      return false;
    }
  }

  async getCacheStats(): Promise<{ files: number; bytes: number }> {
    const documentDirectory = getDocumentDirectory();
    if (!documentDirectory) return { files: 0, bytes: 0 };

    const root = `${documentDirectory}quran_audio/`;
    try {
      const rootInfo = await FileSystem.getInfoAsync(root);
      if (!rootInfo.exists || rootInfo.isDirectory === false) {
        return { files: 0, bytes: 0 };
      }

      let files = 0;
      let bytes = 0;
      const reciterDirs = await FileSystem.readDirectoryAsync(root);
      for (const reciterDir of reciterDirs) {
        const dirPath = `${root}${reciterDir}/`;
        const dirInfo = await FileSystem.getInfoAsync(dirPath);
        if (!dirInfo.exists || !dirInfo.isDirectory) continue;

        const entries = await FileSystem.readDirectoryAsync(dirPath);
        for (const fileName of entries) {
          if (!fileName.endsWith('.mp3')) continue;
          const filePath = `${dirPath}${fileName}`;
          const info = await FileSystem.getInfoAsync(filePath);
          if (this.isValidCachedAudioFile(info)) {
            const fileInfo = info as { size?: number };
            files += 1;
            bytes += typeof fileInfo.size === 'number' ? fileInfo.size : 0;
          }
        }
      }

      return { files, bytes };
    } catch {
      return { files: 0, bytes: 0 };
    }
  }

  async getLastAudioPosition(): Promise<{ surah: number; ayah: number } | null> {
    try {
      const s = await AsyncStorage.getItem(LAST_POSITION_KEY);
      return s ? JSON.parse(s) : null;
    } catch {
      return null;
    }
  }
}

export const audioManager = new QuranAudioManager();
export default audioManager;
