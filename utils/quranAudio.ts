import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import * as Network from 'expo-network';
import TrackPlayer, { Event, State as TrackPlayerState, type AddTrack } from 'react-native-track-player';
import { getSurah as getSurahName, toArabicNumerals } from '@/data/surahNames';
import { ensureSharedTrackPlayerReady, isSharedTrackPlayerReady } from '@/utils/sharedTrackPlayer';

export type ReciterKey =
  | 'yasser_ad_dussary'
  | 'ghamidi'
  | 'muaiqly'
  | 'minshawy_mujawwad'
  | 'minshawy_murattal'
  | 'abdul_basit';

export type QuranPlaybackScopeType = 'surah' | 'juz';

export type QuranPlaybackScopeOptions = {
  type?: QuranPlaybackScopeType;
  startAyah?: number;
  endAyah?: number;
  juzNumber?: number | null;
};

export type QuranPlaybackSnapshot = {
  isActive: boolean;
  isPlaying: boolean;
  surah: number;
  ayah: number;
  reciter: ReciterKey;
  scopeType: QuranPlaybackScopeType | null;
  scopeStartAyah: number;
  scopeEndAyah: number;
  totalAyahs: number;
  juzNumber: number | null;
};

type ReciterInfo = {
  key: ReciterKey;
  name: string;
  baseUrl: string;
  quality: string;
};

type CacheResolution = {
  uri: string;
  usedStreamingFallback: boolean;
};

type QueueBuildResult = {
  tracks: AddTrack[];
  selectedIndex: number;
  scopeStartAyah: number;
  scopeEndAyah: number;
};

type QuranTrack = AddTrack & {
  mediaType: 'quran';
  reciterKey: ReciterKey;
  surah: number;
  ayah: number;
  scopeType: QuranPlaybackScopeType;
  scopeStartAyah: number;
  scopeEndAyah: number;
  totalAyahs: number;
  juzNumber?: number | null;
};

export const RECITERS: Record<ReciterKey, ReciterInfo> = {
  yasser_ad_dussary: {
    key: 'yasser_ad_dussary',
    name: 'قاری یاسر الدوسری',
    baseUrl: 'https://everyayah.com/data/Yasser_Ad-Dussary_128kbps',
    quality: '128 kbps',
  },
  ghamidi: {
    key: 'ghamidi',
    name: 'قاری سعد الغامدی',
    baseUrl: 'https://everyayah.com/data/Ghamadi_40kbps',
    quality: '40 kbps',
  },
  muaiqly: {
    key: 'muaiqly',
    name: 'قاری ماهر المعیقلی',
    baseUrl: 'https://everyayah.com/data/Maher_AlMuaiqly_64kbps',
    quality: '64 kbps',
  },
  minshawy_mujawwad: {
    key: 'minshawy_mujawwad',
    name: 'قاری منشاوی (تجوید)',
    baseUrl: 'https://everyayah.com/data/Minshawy_Mujawwad_192kbps',
    quality: '192 kbps',
  },
  minshawy_murattal: {
    key: 'minshawy_murattal',
    name: 'قاری منشاوی (مرتل)',
    baseUrl: 'https://everyayah.com/data/Minshawy_Murattal_128kbps',
    quality: '128 kbps',
  },
  abdul_basit: {
    key: 'abdul_basit',
    name: 'قاری عبدالباسط (تجوید)',
    baseUrl: 'https://everyayah.com/data/Abdul_Basit_Mujawwad_128kbps',
    quality: '128 kbps',
  },
};

function isReciterKey(value: string): value is ReciterKey {
  return value in RECITERS;
}

export function getAyahUrl(
  surah: number,
  ayah: number,
  reciter: ReciterKey = 'yasser_ad_dussary'
): string {
  return getAyahUrlCandidates(surah, ayah, reciter)[0];
}

function getAyahUrlCandidates(
  surah: number,
  ayah: number,
  reciter: ReciterKey = 'yasser_ad_dussary'
): string[] {
  const s = String(surah).padStart(3, '0');
  const a = String(ayah).padStart(3, '0');
  const primaryBaseUrl = RECITERS[reciter].baseUrl;
  const fallbackBaseUrl = primaryBaseUrl.replace('https://everyayah.com/', 'https://www.everyayah.com/');

  return [primaryBaseUrl, fallbackBaseUrl].map((baseUrl) => `${baseUrl}/${s}${a}.mp3`);
}

export function getQuranPlaybackErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  if (message.startsWith('cache_dir_unavailable')) {
    return 'فضای ذخیره‌سازی برای قرآن در دسترس نیست. لطفاً برنامه را دوباره باز کنید.';
  }
  if (message.startsWith('dns_failure')) {
    return 'اتصال به سرور تلاوت برقرار نشد. لطفاً اینترنت را بررسی کنید.';
  }
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
const RECITER_KEY = 'quran_selected_reciter';
const LAST_POSITION_KEY = 'quran_last_position';

function getDocumentDirectory(): string | null {
  const documentDirectory = FileSystem.documentDirectory as string | null | undefined;
  return typeof documentDirectory === 'string' ? documentDirectory : null;
}

function getAyahCachePath(surah: number, ayah: number, reciter: ReciterKey): string | null {
  const documentDirectory = getDocumentDirectory();
  if (!documentDirectory) return null;

  const s = String(surah).padStart(3, '0');
  const a = String(ayah).padStart(3, '0');
  return `${documentDirectory}quran_audio/${reciter}/${s}${a}.mp3`;
}

async function ensureCacheDir(reciter: ReciterKey): Promise<void> {
  const documentDirectory = getDocumentDirectory();
  if (!documentDirectory) {
    throw new Error('cache_dir_unavailable');
  }

  const dir = `${documentDirectory}quran_audio/${reciter}/`;
  const info = await FileSystem.getInfoAsync(dir);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
  }
}

function createDefaultSnapshot(reciter: ReciterKey): QuranPlaybackSnapshot {
  return {
    isActive: false,
    isPlaying: false,
    surah: 0,
    ayah: 0,
    reciter,
    scopeType: null,
    scopeStartAyah: 0,
    scopeEndAyah: 0,
    totalAyahs: 0,
    juzNumber: null,
  };
}

function isQuranTrack(track: unknown): track is QuranTrack {
  return Boolean(
    track &&
      typeof track === 'object' &&
      (track as { mediaType?: string }).mediaType === 'quran' &&
      typeof (track as { surah?: unknown }).surah === 'number' &&
      typeof (track as { ayah?: unknown }).ayah === 'number'
  );
}

class QuranAudioManager {
  private currentReciter: ReciterKey = 'yasser_ad_dussary';
  private snapshot: QuranPlaybackSnapshot = createDefaultSnapshot('yasser_ad_dussary');
  private initialized = false;
  private listenersRegistered = false;
  private backgroundCacheInFlight = new Set<string>();
  private onAyahChangeCb: ((surah: number, ayah: number) => void) | null = null;
  private onPlaybackEndCb: (() => void) | null = null;
  private subscribers = new Set<(snapshot: QuranPlaybackSnapshot) => void>();
  private lastKnownTrackId: string | null = null;

  async initialize(): Promise<void> {
    try {
      const saved = await AsyncStorage.getItem(RECITER_KEY);
      if (saved && isReciterKey(saved)) {
        this.currentReciter = saved;
        this.snapshot = { ...this.snapshot, reciter: saved };
      }

      await ensureSharedTrackPlayerReady('quran-init');
      this.registerTrackPlayerListeners();
      this.initialized = true;
      await this.syncFromTrackPlayer();
    } catch (e) {
      console.error('QuranAudio init error:', e);
    }
  }

  async setReciter(reciter: ReciterKey): Promise<void> {
    if (this.snapshot.isActive) {
      await this.stop();
    }
    this.currentReciter = reciter;
    this.snapshot = { ...this.snapshot, reciter };
    await AsyncStorage.setItem(RECITER_KEY, reciter);
    this.emitSnapshot();
  }

  getReciter(): ReciterKey {
    return this.currentReciter;
  }

  getPlaybackSnapshot(): QuranPlaybackSnapshot {
    return { ...this.snapshot };
  }

  subscribe(listener: (snapshot: QuranPlaybackSnapshot) => void): () => void {
    this.subscribers.add(listener);
    listener(this.getPlaybackSnapshot());
    return () => {
      this.subscribers.delete(listener);
    };
  }

  setOnAyahChange(cb: ((surah: number, ayah: number) => void) | null): void {
    this.onAyahChangeCb = cb;
  }

  setOnPlaybackEnd(cb: (() => void) | null): void {
    this.onPlaybackEndCb = cb;
  }

  private emitSnapshot(): void {
    const snapshot = this.getPlaybackSnapshot();
    this.subscribers.forEach((listener) => {
      try {
        listener(snapshot);
      } catch {
        // ignore subscriber failure
      }
    });
  }

  private getTrackId(track: unknown): string | null {
    if (!track) return null;
    if (typeof track === 'string' || typeof track === 'number') {
      return String(track);
    }
    if (typeof track === 'object' && 'id' in track) {
      const id = (track as { id?: string | number | null }).id;
      if (id !== undefined && id !== null) {
        return String(id);
      }
    }
    return null;
  }

  private registerTrackPlayerListeners(): void {
    if (this.listenersRegistered) return;
    this.listenersRegistered = true;

    TrackPlayer.addEventListener(Event.PlaybackActiveTrackChanged, async (event) => {
      await this.syncFromTrackPlayer(event.track);
    });

    TrackPlayer.addEventListener(Event.PlaybackState, async (event) => {
      const nextIsPlaying = event.state === TrackPlayerState.Playing;
      if (this.snapshot.isActive) {
        if (this.snapshot.isPlaying !== nextIsPlaying) {
          this.snapshot = { ...this.snapshot, isPlaying: nextIsPlaying };
          this.emitSnapshot();
        }
      } else if (!nextIsPlaying) {
        await this.syncFromTrackPlayer();
      }
    });

    TrackPlayer.addEventListener(Event.PlaybackQueueEnded, async () => {
      if (!this.snapshot.isActive) return;
      try {
        await TrackPlayer.reset();
      } catch {
        // ignore
      }
      this.clearQuranPlayback(true);
    });
  }

  private async syncFromTrackPlayer(activeTrackOverride?: unknown): Promise<void> {
    if (!isSharedTrackPlayerReady()) return;

    try {
      const activeTrack = activeTrackOverride ?? (await TrackPlayer.getActiveTrack());
      const nextTrackId = this.getTrackId(activeTrack);
      const playbackState = await TrackPlayer.getPlaybackState();
      const nextIsPlaying = playbackState.state === TrackPlayerState.Playing;

      if (isQuranTrack(activeTrack)) {
        const trackChanged = nextTrackId !== this.lastKnownTrackId;
        this.lastKnownTrackId = nextTrackId;
        this.currentReciter = activeTrack.reciterKey;
        this.snapshot = {
          isActive: true,
          isPlaying: nextIsPlaying,
          surah: activeTrack.surah,
          ayah: activeTrack.ayah,
          reciter: activeTrack.reciterKey,
          scopeType: activeTrack.scopeType,
          scopeStartAyah: activeTrack.scopeStartAyah,
          scopeEndAyah: activeTrack.scopeEndAyah,
          totalAyahs: activeTrack.totalAyahs,
          juzNumber: activeTrack.juzNumber ?? null,
        };

        await AsyncStorage.setItem(
          LAST_POSITION_KEY,
          JSON.stringify({ surah: activeTrack.surah, ayah: activeTrack.ayah })
        );

        if (trackChanged) {
          this.onAyahChangeCb?.(activeTrack.surah, activeTrack.ayah);
        }
        this.emitSnapshot();
        return;
      }

      this.clearQuranPlayback(this.snapshot.isActive);
    } catch {
      // TrackPlayer may not be ready yet.
    }
  }

  private clearQuranPlayback(notifyEnd: boolean): void {
    const wasActive = this.snapshot.isActive;
    this.lastKnownTrackId = null;
    this.snapshot = createDefaultSnapshot(this.currentReciter);
    this.emitSnapshot();
    if (notifyEnd && wasActive) {
      this.onPlaybackEndCb?.();
    }
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
      return true;
    }
  }

  private isDnsFailureError(error: unknown): boolean {
    const message = error instanceof Error ? error.message : String(error);
    return /UnknownHost|ENOTFOUND|getaddrinfo/i.test(message);
  }

  private async downloadAyahToCache(
    surah: number,
    ayah: number,
    reciter: ReciterKey
  ): Promise<{ ok: boolean; reason?: 'cache_dir_unavailable' | 'dns_failure' | 'cache_write_failed' }> {
    const cachePath = getAyahCachePath(surah, ayah, reciter);
    if (!cachePath) return { ok: false, reason: 'cache_dir_unavailable' };

    const tempPath = `${cachePath}.tmp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const urls = getAyahUrlCandidates(surah, ayah, reciter);
    let sawDnsFailure = false;

    try {
      await ensureCacheDir(reciter);
      await this.removeFileIfExists(tempPath);

      for (const url of urls) {
        try {
          const result = await FileSystem.downloadAsync(url, tempPath);
          if (result.status !== 200) {
            await this.removeFileIfExists(tempPath);
            continue;
          }

          const tempInfo = await FileSystem.getInfoAsync(tempPath);
          if (!this.isValidCachedAudioFile(tempInfo)) {
            await this.removeFileIfExists(tempPath);
            continue;
          }

          await this.removeFileIfExists(cachePath);
          await FileSystem.moveAsync({ from: tempPath, to: cachePath });

          const finalInfo = await FileSystem.getInfoAsync(cachePath);
          if (!this.isValidCachedAudioFile(finalInfo)) {
            await this.removeFileIfExists(cachePath);
            continue;
          }

          return { ok: true };
        } catch (error) {
          if (this.isDnsFailureError(error)) {
            sawDnsFailure = true;
          }
          await this.removeFileIfExists(tempPath);
        }
      }
    } catch (error) {
      if (error instanceof Error && error.message.startsWith('cache_dir_unavailable')) {
        return { ok: false, reason: 'cache_dir_unavailable' };
      }
      await this.removeFileIfExists(tempPath);
      if (this.isDnsFailureError(error)) {
        sawDnsFailure = true;
      }
    }

    return { ok: false, reason: sawDnsFailure ? 'dns_failure' : 'cache_write_failed' };
  }

  private async downloadAyahToCacheWithRetries(
    surah: number,
    ayah: number,
    reciter: ReciterKey,
    attempts: number
  ): Promise<{ ok: boolean; reason?: 'cache_dir_unavailable' | 'dns_failure' | 'cache_write_failed' }> {
    let sawDnsFailure = false;
    for (let attempt = 1; attempt <= attempts; attempt++) {
      const result = await this.downloadAyahToCache(surah, ayah, reciter);
      if (result.ok) return result;
      if (result.reason === 'cache_dir_unavailable') return result;
      if (result.reason === 'dns_failure') {
        sawDnsFailure = true;
      }
      if (attempt < attempts) {
        await this.wait(CACHE_RETRY_BASE_DELAY_MS * attempt);
      }
    }
    return { ok: false, reason: sawDnsFailure ? 'dns_failure' : 'cache_write_failed' };
  }

  private async ensureCachedInBackground(surah: number, ayah: number, reciter: ReciterKey): Promise<void> {
    const cacheKey = this.getCacheKey(surah, ayah, reciter);
    if (this.backgroundCacheInFlight.has(cacheKey)) return;

    this.backgroundCacheInFlight.add(cacheKey);
    try {
      const cached = await this.isAyahCached(surah, ayah, reciter);
      if (cached) return;

      const result = await this.downloadAyahToCacheWithRetries(
        surah,
        ayah,
        reciter,
        MAX_BACKGROUND_CACHE_ATTEMPTS
      );
      this.logCacheOutcome(result.ok ? 'cache_retry_ok' : 'cache_retry_failed', surah, ayah, reciter);
    } finally {
      this.backgroundCacheInFlight.delete(cacheKey);
    }
  }

  private async getAudioUri(
    surah: number,
    ayah: number,
    reciter: ReciterKey
  ): Promise<CacheResolution> {
    const cachePath = getAyahCachePath(surah, ayah, reciter);
    if (!cachePath) {
      throw new Error(`cache_dir_unavailable reciter=${reciter} surah=${surah} ayah=${ayah}`);
    }

    try {
      const cached = await this.isAyahCached(surah, ayah, reciter);
      if (cached) {
        this.logCacheOutcome('cache_hit', surah, ayah, reciter);
        return { uri: cachePath, usedStreamingFallback: false };
      }

      const info = await FileSystem.getInfoAsync(cachePath);
      if (info.exists) {
        await this.removeFileIfExists(cachePath);
      }
    } catch {
      // fall through to download
    }

    const downloadResult = await this.downloadAyahToCacheWithRetries(
      surah,
      ayah,
      reciter,
      MAX_SYNC_CACHE_ATTEMPTS
    );
    if (downloadResult.ok) {
      this.logCacheOutcome('cache_write_ok', surah, ayah, reciter);
      return { uri: cachePath, usedStreamingFallback: false };
    }
    this.logCacheOutcome('cache_write_failed', surah, ayah, reciter);

    const isOnline = await this.isNetworkAvailable();
    if (!isOnline) {
      throw new Error(`offline_cache_miss reciter=${reciter} surah=${surah} ayah=${ayah}`);
    }

    if (downloadResult.reason === 'dns_failure') {
      throw new Error(`dns_failure reciter=${reciter} surah=${surah} ayah=${ayah}`);
    }

    return { uri: getAyahUrl(surah, ayah, reciter), usedStreamingFallback: true };
  }

  private async getQueueTrackUri(surah: number, ayah: number, reciter: ReciterKey): Promise<string | null> {
    const cachePath = getAyahCachePath(surah, ayah, reciter);
    if (cachePath) {
      try {
        const info = await FileSystem.getInfoAsync(cachePath);
        if (this.isValidCachedAudioFile(info)) {
          return cachePath;
        }
      } catch {
        // ignore
      }
    }

    const isOnline = await this.isNetworkAvailable();
    if (!isOnline) {
      return null;
    }

    void this.ensureCachedInBackground(surah, ayah, reciter);
    return getAyahUrl(surah, ayah, reciter);
  }

  private buildTrackTitle(surah: number, ayah: number): string {
    const surahName = getSurahName(surah)?.arabic ?? `سوره ${toArabicNumerals(surah)}`;
    return `${surahName} • آیه ${toArabicNumerals(ayah)}`;
  }

  private buildTrackId(
    reciter: ReciterKey,
    surah: number,
    ayah: number,
    scopeType: QuranPlaybackScopeType,
    scopeStartAyah: number,
    scopeEndAyah: number,
    juzNumber: number | null
  ): string {
    return [
      'quran',
      reciter,
      scopeType,
      String(juzNumber ?? 0),
      String(surah),
      String(scopeStartAyah),
      String(scopeEndAyah),
      String(ayah),
    ].join(':');
  }

  private async buildQueueTracks(
    surah: number,
    ayah: number,
    totalAyahsInSurah: number,
    reciter: ReciterKey,
    scope: Required<QuranPlaybackScopeOptions>
  ): Promise<QueueBuildResult> {
    const scopeStartAyah = Math.max(1, Math.min(scope.startAyah, totalAyahsInSurah));
    const scopeEndAyah = Math.max(scopeStartAyah, Math.min(scope.endAyah, totalAyahsInSurah));
    const selectedIndex = ayah - scopeStartAyah;
    const selectedTrack = await this.getAudioUri(surah, ayah, reciter);
    const tracks: AddTrack[] = [];

    for (let ayahNumber = scopeStartAyah; ayahNumber <= scopeEndAyah; ayahNumber += 1) {
      let uri: string | null;
      if (ayahNumber === ayah) {
        uri = selectedTrack.uri;
      } else {
        uri = await this.getQueueTrackUri(surah, ayahNumber, reciter);
      }

      if (!uri) continue;

      tracks.push({
        id: this.buildTrackId(reciter, surah, ayahNumber, scope.type, scopeStartAyah, scopeEndAyah, scope.juzNumber),
        url: uri,
        title: this.buildTrackTitle(surah, ayahNumber),
        artist: RECITERS[reciter].name,
        album: 'القرآن الكريم',
        mediaType: 'quran',
        reciterKey: reciter,
        surah,
        ayah: ayahNumber,
        scopeType: scope.type,
        scopeStartAyah,
        scopeEndAyah,
        totalAyahs: totalAyahsInSurah,
        juzNumber: scope.juzNumber,
      } as QuranTrack);
    }

    if (!tracks.length) {
      throw new Error(`offline_cache_miss reciter=${reciter} surah=${surah} ayah=${ayah}`);
    }

    const resolvedSelectedIndex = tracks.findIndex((track) => isQuranTrack(track) && track.ayah === ayah);
    if (resolvedSelectedIndex < 0) {
      throw new Error(`offline_cache_miss reciter=${reciter} surah=${surah} ayah=${ayah}`);
    }

    if (selectedTrack.usedStreamingFallback) {
      void this.ensureCachedInBackground(surah, ayah, reciter);
    }
    void this.ensureCachedInBackground(surah, Math.min(scopeEndAyah, ayah + 1), reciter);

    return {
      tracks,
      selectedIndex: resolvedSelectedIndex,
      scopeStartAyah,
      scopeEndAyah,
    };
  }

  async playAyah(
    surah: number,
    ayah: number,
    totalAyahsInSurah: number,
    continuous = false,
    _interruptCompetingAudio = true,
    scope: QuranPlaybackScopeOptions = {}
  ): Promise<void> {
    try {
      await this.initialize();
      await ensureSharedTrackPlayerReady('quran-play');

      const resolvedScope: Required<QuranPlaybackScopeOptions> = {
        type: scope.type ?? 'surah',
        startAyah: scope.startAyah ?? 1,
        endAyah: scope.endAyah ?? totalAyahsInSurah,
        juzNumber: scope.juzNumber ?? null,
      };

      const queue = continuous
        ? await this.buildQueueTracks(surah, ayah, totalAyahsInSurah, this.currentReciter, resolvedScope)
        : await this.buildQueueTracks(surah, ayah, totalAyahsInSurah, this.currentReciter, {
            ...resolvedScope,
            startAyah: ayah,
            endAyah: ayah,
          });

      await TrackPlayer.reset();
      await TrackPlayer.add(queue.tracks);
      await TrackPlayer.skip(queue.selectedIndex);
      await TrackPlayer.play();

      this.lastKnownTrackId = this.getTrackId(queue.tracks[queue.selectedIndex]);
      this.snapshot = {
        isActive: true,
        isPlaying: true,
        surah,
        ayah,
        reciter: this.currentReciter,
        scopeType: resolvedScope.type,
        scopeStartAyah: queue.scopeStartAyah,
        scopeEndAyah: queue.scopeEndAyah,
        totalAyahs: totalAyahsInSurah,
        juzNumber: resolvedScope.juzNumber,
      };
      this.emitSnapshot();
      this.onAyahChangeCb?.(surah, ayah);
      await AsyncStorage.setItem(LAST_POSITION_KEY, JSON.stringify({ surah, ayah }));
    } catch (e) {
      const resolvedError = e instanceof Error ? e : new Error(String(e));
      const message = resolvedError.message;
      if (message.startsWith('offline_cache_miss')) {
        console.error(`[QuranCache] offline_cache_miss ${message}`);
      } else if (message.startsWith('cache_dir_unavailable')) {
        console.error(`[QuranCache] cache_dir_unavailable ${message}`);
      } else if (message.startsWith('dns_failure')) {
        console.error(`[QuranCache] dns_failure ${message}`);
      } else if (message.startsWith('cache_write_failed')) {
        console.error(`[QuranCache] cache_write_failed ${message}`);
      } else {
        console.error('playAyah error:', resolvedError);
      }
      this.clearQuranPlayback(true);
      throw resolvedError;
    }
  }

  async pause(): Promise<void> {
    try {
      if (!this.snapshot.isActive) return;
      await TrackPlayer.pause();
      this.snapshot = { ...this.snapshot, isPlaying: false };
      this.emitSnapshot();
    } catch {
      // ignore
    }
  }

  async resume(): Promise<void> {
    try {
      await ensureSharedTrackPlayerReady('quran-resume');
      if (!this.snapshot.isActive) return;
      await TrackPlayer.play();
      this.snapshot = { ...this.snapshot, isPlaying: true };
      this.emitSnapshot();
    } catch {
      // ignore
    }
  }

  async stop(): Promise<void> {
    try {
      if (!isSharedTrackPlayerReady()) {
        this.clearQuranPlayback(true);
        return;
      }
      const activeTrack = await TrackPlayer.getActiveTrack();
      if (isQuranTrack(activeTrack)) {
        await TrackPlayer.reset();
      }
    } catch {
      // ignore
    }
    this.clearQuranPlayback(true);
  }

  getIsPlaying(): boolean {
    return this.snapshot.isActive && this.snapshot.isPlaying;
  }

  getCurrentSurah(): number {
    return this.snapshot.surah;
  }

  getCurrentAyah(): number {
    return this.snapshot.ayah;
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
