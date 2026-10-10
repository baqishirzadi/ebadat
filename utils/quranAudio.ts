import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import * as Network from 'expo-network';
import TrackPlayer, { Event, RepeatMode, State as TrackPlayerState, type AddTrack } from 'react-native-track-player';
import { getSurah as getSurahName, toArabicNumerals } from '@/data/surahNames';
import type { AppLanguage } from '@/types/quran';
import { translateUi } from '@/utils/i18n/catalog';
import { ensureSharedTrackPlayerReady, isSharedTrackPlayerReady } from '@/utils/sharedTrackPlayer';

export type ReciterKey =
  | 'yasser_ad_dussary'
  | 'alafasy'
  | 'husary'
  | 'minshawy_mujawwad'
  | 'minshawy_murattal'
  | 'abdul_basit';

/** Default for new installs and unconfigured players; persisted user choices win. */
export const DEFAULT_QURAN_RECITER: ReciterKey = 'alafasy';

export type QuranPlaybackScopeType = 'surah' | 'juz';
export type QuranPlaybackStatus = 'idle' | 'preparing' | 'buffering' | 'playing' | 'paused' | 'error';
export type QuranPlaybackRate = 1 | 1.25 | 1.5 | 2;

export type QuranPlaybackScopeOptions = {
  type?: QuranPlaybackScopeType;
  startAyah?: number;
  endAyah?: number;
  juzNumber?: number | null;
};

export type QuranPlaybackSnapshot = {
  isActive: boolean;
  isPlaying: boolean;
  status: QuranPlaybackStatus;
  statusMessage: string | null;
  errorMessage: string | null;
  surah: number;
  ayah: number;
  reciter: ReciterKey;
  scopeType: QuranPlaybackScopeType | null;
  scopeStartAyah: number;
  scopeEndAyah: number;
  totalAyahs: number;
  juzNumber: number | null;
  playbackRate: QuranPlaybackRate;
  /** Seconds into the current ayah track. */
  position: number;
  /** Duration of the current ayah track, in seconds. */
  duration: number;
};

export type PersistedQuranResumeContext = {
  mediaType: 'quran';
  surah: number;
  ayah: number;
  scopeType: QuranPlaybackScopeType;
  juzNumber: number | null;
  updatedAt: number;
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
  alafasy: {
    key: 'alafasy',
    name: 'قاری مشاری العفاسی',
    baseUrl: 'https://everyayah.com/data/Alafasy_128kbps',
    quality: '128 kbps',
  },
  husary: {
    key: 'husary',
    name: 'قاری محمود خلیل الحصري',
    baseUrl: 'https://everyayah.com/data/Husary_128kbps',
    quality: '128 kbps',
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

/** Old low-bitrate seats. Their cache folders stay unused so a clipped file cannot play under the new name. */
export function migrateStoredReciterKey(saved: string | null): ReciterKey | null {
  if (saved === 'ghamidi') return 'alafasy';
  if (saved === 'muaiqly') return 'husary';
  if (saved && isReciterKey(saved)) return saved;
  return null;
}

export function getAyahUrl(
  surah: number,
  ayah: number,
  reciter: ReciterKey = DEFAULT_QURAN_RECITER
): string {
  return getAyahUrlCandidates(surah, ayah, reciter)[0];
}

export function getAyahUrlCandidates(
  surah: number,
  ayah: number,
  reciter: ReciterKey = DEFAULT_QURAN_RECITER
): string[] {
  const s = String(surah).padStart(3, '0');
  const a = String(ayah).padStart(3, '0');
  const primaryBaseUrl = RECITERS[reciter].baseUrl;
  const fallbackBaseUrl = primaryBaseUrl.replace('https://everyayah.com/', 'https://www.everyayah.com/');

  return [primaryBaseUrl, fallbackBaseUrl].map((baseUrl) => `${baseUrl}/${s}${a}.mp3`);
}

/**
 * Rejects files that are not MP3 (e.g. an HTML error page saved as an ayah).
 * Unreadable headers are treated as valid so a read failure never blocks playback.
 */
export async function hasMp3Header(path: string): Promise<boolean> {
  try {
    const head = await FileSystem.readAsStringAsync(path, {
      encoding: FileSystem.EncodingType.Base64,
      position: 0,
      length: 3,
    });
    const bytes = globalThis.atob(head);
    if (bytes.startsWith('ID3')) return true;
    return bytes.charCodeAt(0) === 0xff && (bytes.charCodeAt(1) & 0xe0) === 0xe0;
  } catch {
    return true;
  }
}

export function getQuranPlaybackErrorMessage(error: unknown, language: AppLanguage = 'dari'): string {
  const message = error instanceof Error ? error.message : String(error);
  const key = message.startsWith('cache_dir_unavailable')
    ? 'quran.audio.storage'
    : message.startsWith('dns_failure')
      ? 'quran.audio.dns'
      : message.startsWith('offline_cache_miss')
        ? 'quran.audio.offline'
        : message.startsWith('cache_write_failed')
          ? 'quran.audio.cache'
          : 'quran.audio.generic';
  return translateUi(key, language);
}

const MIN_VALID_CACHE_FILE_BYTES = 1024;
const MAX_BACKGROUND_CACHE_ATTEMPTS = 2;
const CACHE_RETRY_BASE_DELAY_MS = 350;
const INITIAL_CONTINUOUS_QUEUE_WINDOW = 8;
const RECITER_KEY = 'quran_selected_reciter';
const PLAYBACK_RATE_KEY = 'quran_playback_rate';
const LAST_POSITION_KEY = 'quran_last_position';
const RESUME_CONTEXT_KEY = 'quran_resume_context_v1';

export const QURAN_PLAYBACK_RATES: QuranPlaybackRate[] = [1, 1.25, 1.5, 2];

function isQuranPlaybackRate(value: unknown): value is QuranPlaybackRate {
  return typeof value === 'number' && QURAN_PLAYBACK_RATES.includes(value as QuranPlaybackRate);
}

async function persistQuranResumeContext(context: PersistedQuranResumeContext): Promise<void> {
  try {
    await AsyncStorage.setItem(RESUME_CONTEXT_KEY, JSON.stringify(context));
  } catch {
    // ignore persistence failures for routing hints
  }
}

export async function getPersistedQuranResumeContext(): Promise<PersistedQuranResumeContext | null> {
  try {
    const raw = await AsyncStorage.getItem(RESUME_CONTEXT_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<PersistedQuranResumeContext> | null;
    if (!parsed || parsed.mediaType !== 'quran') return null;
    if (!Number.isFinite(parsed.surah) || !Number.isFinite(parsed.ayah)) return null;
    if (parsed.scopeType !== 'surah' && parsed.scopeType !== 'juz') return null;

    const updatedAt = Number(parsed.updatedAt);
    if (!Number.isFinite(updatedAt)) return null;
    if (Date.now() - updatedAt > 12 * 60 * 60 * 1000) return null;

    return {
      mediaType: 'quran',
      surah: Number(parsed.surah),
      ayah: Number(parsed.ayah),
      scopeType: parsed.scopeType,
      juzNumber: parsed.scopeType === 'juz' && Number.isFinite(parsed.juzNumber)
        ? Number(parsed.juzNumber)
        : null,
      updatedAt,
    };
  } catch {
    return null;
  }
}

function getDocumentDirectory(): string | null {
  const documentDirectory = FileSystem.documentDirectory as string | null | undefined;
  return typeof documentDirectory === 'string' ? documentDirectory : null;
}

export function getAyahCachePath(surah: number, ayah: number, reciter: ReciterKey): string | null {
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
    status: 'idle',
    statusMessage: null,
    errorMessage: null,
    surah: 0,
    ayah: 0,
    reciter,
    scopeType: null,
    scopeStartAyah: 0,
    scopeEndAyah: 0,
    totalAyahs: 0,
    juzNumber: null,
    playbackRate: 1,
    position: 0,
    duration: 0,
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
  private currentReciter: ReciterKey = DEFAULT_QURAN_RECITER;
  private snapshot: QuranPlaybackSnapshot = createDefaultSnapshot(DEFAULT_QURAN_RECITER);
  private playbackRate: QuranPlaybackRate = 1;
  private initialized = false;
  private listenersRegistered = false;
  private backgroundCacheInFlight = new Set<string>();
  private onAyahChangeCb: ((surah: number, ayah: number) => void) | null = null;
  private onPlaybackEndCb: (() => void) | null = null;
  /** Last ayah actually placed in the current queue. The player can rewind to the first track when the queue ends. */
  private queuedTailAyah = 0;
  private queuedScopeEndAyah = 0;
  private queuedSurah = 0;
  private subscribers = new Set<(snapshot: QuranPlaybackSnapshot) => void>();
  private lastKnownTrackId: string | null = null;
  private playRequestId = 0;
  /** Request whose queue is still being built; TrackPlayer events are ignored meanwhile. */
  private loadingRequestId: number | null = null;
  /** Set when the user pauses before the loading request has started playing. */
  private pauseAfterLoadRequestId: number | null = null;
  private lastErrorRetryTrackId: string | null = null;

  async initialize(): Promise<void> {
    try {
      const saved = await AsyncStorage.getItem(RECITER_KEY);
      const migrated = migrateStoredReciterKey(saved);
      if (migrated) {
        this.currentReciter = migrated;
        this.snapshot = { ...this.snapshot, reciter: migrated };
        if (migrated !== saved) {
          await AsyncStorage.setItem(RECITER_KEY, migrated);
        }
      }
      const savedRate = Number(await AsyncStorage.getItem(PLAYBACK_RATE_KEY));
      if (isQuranPlaybackRate(savedRate)) {
        this.playbackRate = savedRate;
        this.snapshot = { ...this.snapshot, playbackRate: savedRate };
      }

      await ensureSharedTrackPlayerReady('quran-init');
      this.registerTrackPlayerListeners();
      this.initialized = true;
      await this.applyPlaybackRate();
      await this.syncFromTrackPlayer();
    } catch (e) {
      console.error('QuranAudio init error:', e);
    }
  }

  async setReciter(reciter: ReciterKey): Promise<void> {
    if (reciter === this.currentReciter) {
      await AsyncStorage.setItem(RECITER_KEY, reciter);
      return;
    }
    this.playRequestId += 1;
    this.loadingRequestId = null;
    if (this.snapshot.isActive) {
      try {
        if (isSharedTrackPlayerReady()) {
          const activeTrack = await TrackPlayer.getActiveTrack();
          if (isQuranTrack(activeTrack)) {
            await TrackPlayer.reset();
          }
        }
      } catch {
        // Reset failures are surfaced on the next play attempt.
      }
    }
    this.currentReciter = reciter;
    this.snapshot = { ...createDefaultSnapshot(reciter), reciter, playbackRate: this.playbackRate };
    await AsyncStorage.setItem(RECITER_KEY, reciter);
    this.emitSnapshot();
  }

  getReciter(): ReciterKey {
    return this.currentReciter;
  }

  getPlaybackSnapshot(): QuranPlaybackSnapshot {
    return { ...this.snapshot };
  }

  getPlaybackRate(): QuranPlaybackRate {
    return this.playbackRate;
  }

  async setPlaybackRate(rate: QuranPlaybackRate): Promise<void> {
    if (!isQuranPlaybackRate(rate)) return;
    this.playbackRate = rate;
    this.snapshot = { ...this.snapshot, playbackRate: rate };
    await AsyncStorage.setItem(PLAYBACK_RATE_KEY, String(rate));
    await this.applyPlaybackRate();
    this.emitSnapshot();
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

  private async applyPlaybackRate(): Promise<void> {
    if (!isSharedTrackPlayerReady()) return;
    try {
      await TrackPlayer.setRate(this.playbackRate);
    } catch {
      // Some platforms reject rate changes until a queue exists; the next play applies it again.
    }
  }

  private queueLock: Promise<unknown> = Promise.resolve();

  /** Keeps reset/add/skip/play of overlapping play requests from interleaving. */
  private runQueueOperation<T>(operation: () => Promise<T>): Promise<T> {
    const next = this.queueLock.then(operation);
    this.queueLock = next.catch(() => undefined);
    return next;
  }

  private getStatusForTrackPlayerState(state: TrackPlayerState): QuranPlaybackStatus {
    if (state === TrackPlayerState.Playing) return 'playing';
    if (state === TrackPlayerState.Buffering || state === TrackPlayerState.Loading) return 'buffering';
    if (state === TrackPlayerState.Paused) return 'paused';
    // Ready is a transient state between ayahs (or a queue loaded paused); keep what the user sees.
    if (state === TrackPlayerState.Ready && this.snapshot.isActive && this.snapshot.status !== 'error') {
      return this.snapshot.status;
    }
    return this.snapshot.status === 'preparing' ? 'preparing' : 'idle';
  }

  /** Ayah-to-ayah buffering should not flip the play/pause UI. */
  private getIsPlayingForTrackPlayerState(state: TrackPlayerState): boolean {
    if (state === TrackPlayerState.Playing) return true;
    const transient =
      state === TrackPlayerState.Buffering ||
      state === TrackPlayerState.Loading ||
      state === TrackPlayerState.Ready;
    return transient && this.snapshot.isActive && this.snapshot.isPlaying;
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
      if (this.loadingRequestId !== null) return;
      const nextIsPlaying = this.getIsPlayingForTrackPlayerState(event.state);
      if (this.snapshot.isActive) {
        const nextStatus = this.getStatusForTrackPlayerState(event.state);
        if (this.snapshot.isPlaying !== nextIsPlaying || this.snapshot.status !== nextStatus) {
          this.snapshot = {
            ...this.snapshot,
            isPlaying: nextIsPlaying,
            status: nextStatus,
            statusMessage:
              nextStatus === 'buffering'
                ? 'در حال دریافت صدا؛ اگر اینترنت ضعیف است کمی صبر کنید.'
                : null,
          };
          this.emitSnapshot();
        }
      } else if (!nextIsPlaying) {
        await this.syncFromTrackPlayer();
      }
    });

    TrackPlayer.addEventListener(Event.PlaybackProgressUpdated, (event) => {
      if (!this.snapshot.isActive) return;
      const position = event.position;
      const duration = event.duration;
      if (
        Math.abs(position - this.snapshot.position) < 0.05 &&
        Math.abs(duration - this.snapshot.duration) < 0.05
      ) {
        return;
      }
      this.snapshot = { ...this.snapshot, position, duration };
      this.emitSnapshot();
    });

    TrackPlayer.addEventListener(Event.PlaybackQueueEnded, async () => {
      if (!this.snapshot.isActive || this.loadingRequestId !== null) return;
      await this.continueOrStopAfterQueueEnded();
    });

    TrackPlayer.addEventListener(Event.PlaybackError, async (event) => {
      if (this.loadingRequestId !== null) return;
      let activeTrack: unknown = null;
      try {
        activeTrack = await TrackPlayer.getActiveTrack();
      } catch {
        return;
      }
      if (!isQuranTrack(activeTrack)) return;
      await this.recoverFromPlaybackError(activeTrack, event?.message);
    });
  }

  /**
   * The 8-ayah window ending is not the end of the surah. Continue from the
   * next ayah after the last one that was queued. The scope's last ayah stops.
   */
  private async continueOrStopAfterQueueEnded(): Promise<void> {
    const tailAyah = this.queuedTailAyah;
    const scopeEndAyah = this.queuedScopeEndAyah;
    const surah = this.queuedSurah;
    const snapshot = this.getPlaybackSnapshot();
    if (tailAyah <= 0 || surah <= 0 || tailAyah >= scopeEndAyah || snapshot.totalAyahs <= 0) {
      try {
        await TrackPlayer.reset();
      } catch {
        // ignore
      }
      this.clearQuranPlayback(true);
      return;
    }

    this.playAyah(surah, tailAyah + 1, snapshot.totalAyahs, true, true, {
      type: snapshot.scopeType ?? 'surah',
      startAyah: snapshot.scopeStartAyah,
      endAyah: scopeEndAyah,
      juzNumber: snapshot.juzNumber,
    }).catch(() => {
      // playAyah already moved the snapshot to the error state.
    });
  }

  private async recoverFromPlaybackError(track: QuranTrack, reason?: string): Promise<void> {
    const trackId = this.getTrackId(track);
    const url = typeof track.url === 'string' ? track.url : '';
    console.warn(`[QuranAudio] playback_error surah=${track.surah} ayah=${track.ayah} url=${url} reason=${reason ?? ''}`);
    const scope: QuranPlaybackScopeOptions = {
      type: track.scopeType,
      startAyah: track.scopeStartAyah,
      endAyah: track.scopeEndAyah,
      juzNumber: track.juzNumber ?? null,
    };

    // A local file that fails to play is corrupt: drop it so the retry streams it.
    const isLocal = url.startsWith('file:');
    if (isLocal) {
      await this.removeFileIfExists(url);
    }
    if (isLocal || this.lastErrorRetryTrackId !== trackId) {
      this.lastErrorRetryTrackId = trackId;
      try {
        await this.playAyah(track.surah, track.ayah, track.totalAyahs, true, true, scope);
      } catch {
        // playAyah already moved the snapshot to the error state.
      }
      return;
    }

    this.playRequestId += 1;
    this.loadingRequestId = null;
    try {
      await TrackPlayer.reset();
    } catch {
      // ignore
    }
    this.lastKnownTrackId = null;
    this.snapshot = {
      ...this.snapshot,
      isActive: false,
      isPlaying: false,
      status: 'error',
      statusMessage: null,
      errorMessage: getQuranPlaybackErrorMessage(new Error(reason ?? 'playback_error')),
    };
    this.emitSnapshot();
    this.onPlaybackEndCb?.();
  }

  private async syncFromTrackPlayer(activeTrackOverride?: unknown): Promise<void> {
    if (!isSharedTrackPlayerReady()) return;
    if (this.loadingRequestId !== null) return;

    try {
      const activeTrack = activeTrackOverride ?? (await TrackPlayer.getActiveTrack());
      const nextTrackId = this.getTrackId(activeTrack);
      const playbackState = await TrackPlayer.getPlaybackState();
      const nextIsPlaying = this.getIsPlayingForTrackPlayerState(playbackState.state);
      const nextStatus = this.getStatusForTrackPlayerState(playbackState.state);

      if (isQuranTrack(activeTrack)) {
        const trackChanged = nextTrackId !== this.lastKnownTrackId;
        this.lastKnownTrackId = nextTrackId;
        if (trackChanged && nextTrackId !== this.lastErrorRetryTrackId) {
          this.lastErrorRetryTrackId = null;
        }
        this.currentReciter = activeTrack.reciterKey;
        this.snapshot = {
          isActive: true,
          isPlaying: nextIsPlaying,
          status: nextStatus,
          statusMessage:
            nextStatus === 'buffering'
              ? 'در حال دریافت صدا؛ اگر اینترنت ضعیف است کمی صبر کنید.'
              : null,
          errorMessage: null,
          surah: activeTrack.surah,
          ayah: activeTrack.ayah,
          reciter: activeTrack.reciterKey,
          scopeType: activeTrack.scopeType,
          scopeStartAyah: activeTrack.scopeStartAyah,
          scopeEndAyah: activeTrack.scopeEndAyah,
          totalAyahs: activeTrack.totalAyahs,
          juzNumber: activeTrack.juzNumber ?? null,
          playbackRate: this.playbackRate,
          position: trackChanged ? 0 : this.snapshot.position,
          duration: trackChanged ? 0 : this.snapshot.duration,
        };

        await AsyncStorage.setItem(
          LAST_POSITION_KEY,
          JSON.stringify({ surah: activeTrack.surah, ayah: activeTrack.ayah })
        );
        await persistQuranResumeContext({
          mediaType: 'quran',
          surah: activeTrack.surah,
          ayah: activeTrack.ayah,
          scopeType: activeTrack.scopeType,
          juzNumber: activeTrack.juzNumber ?? null,
          updatedAt: Date.now(),
        });

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
    this.queuedTailAyah = 0;
    this.queuedScopeEndAyah = 0;
    this.queuedSurah = 0;
    this.snapshot = { ...createDefaultSnapshot(this.currentReciter), playbackRate: this.playbackRate };
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
          if (!this.isValidCachedAudioFile(tempInfo) || !(await hasMp3Header(tempPath))) {
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

    const isOnline = await this.isNetworkAvailable();
    if (!isOnline) {
      throw new Error(`offline_cache_miss reciter=${reciter} surah=${surah} ayah=${ayah}`);
    }

    void this.ensureCachedInBackground(surah, ayah, reciter);
    return { uri: getAyahUrl(surah, ayah, reciter), usedStreamingFallback: true };
  }

  private async getQueueTrackUri(surah: number, ayah: number, reciter: ReciterKey): Promise<string | null> {
    const cachePath = getAyahCachePath(surah, ayah, reciter);
    if (cachePath) {
      if (await this.isAyahCached(surah, ayah, reciter)) {
        return cachePath;
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
    scope: Required<QuranPlaybackScopeOptions>,
    continuous: boolean
  ): Promise<QueueBuildResult> {
    const scopeStartAyah = Math.max(1, Math.min(scope.startAyah, totalAyahsInSurah));
    const scopeEndAyah = Math.max(scopeStartAyah, Math.min(scope.endAyah, totalAyahsInSurah));
    const queueStartAyah = continuous ? Math.max(scopeStartAyah, ayah) : ayah;
    const queueEndAyah = continuous
      ? Math.min(scopeEndAyah, queueStartAyah + INITIAL_CONTINUOUS_QUEUE_WINDOW - 1)
      : ayah;
    const selectedTrack = await this.getAudioUri(surah, ayah, reciter);
    const tracks: AddTrack[] = [];

    for (let ayahNumber = queueStartAyah; ayahNumber <= queueEndAyah; ayahNumber += 1) {
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
    const requestId = ++this.playRequestId;
    this.loadingRequestId = requestId;
    this.pauseAfterLoadRequestId = null;
    const requestedReciter = this.currentReciter;
    const resolvedScope: Required<QuranPlaybackScopeOptions> = {
      type: scope.type ?? 'surah',
      startAyah: scope.startAyah ?? 1,
      endAyah: scope.endAyah ?? totalAyahsInSurah,
      juzNumber: scope.juzNumber ?? null,
    };

    this.snapshot = {
      ...this.snapshot,
      isActive: true,
      isPlaying: false,
      status: 'preparing',
      statusMessage: `در حال آماده‌سازی صدای ${RECITERS[requestedReciter].name}...`,
      errorMessage: null,
      surah,
      ayah,
      reciter: requestedReciter,
      scopeType: resolvedScope.type,
      scopeStartAyah: Math.max(1, Math.min(resolvedScope.startAyah, totalAyahsInSurah)),
      scopeEndAyah: Math.max(
        Math.max(1, Math.min(resolvedScope.startAyah, totalAyahsInSurah)),
        Math.min(resolvedScope.endAyah, totalAyahsInSurah)
      ),
      totalAyahs: totalAyahsInSurah,
      juzNumber: resolvedScope.juzNumber,
      position: 0,
      duration: 0,
    };
    this.emitSnapshot();

    try {
      if (!this.initialized) {
        await this.initialize();
      }
      await ensureSharedTrackPlayerReady('quran-play');
      this.registerTrackPlayerListeners();
      await TrackPlayer.setRepeatMode(RepeatMode.Off).catch(() => undefined);

      if (requestId !== this.playRequestId) return;

      const queue = continuous
        ? await this.buildQueueTracks(surah, ayah, totalAyahsInSurah, requestedReciter, resolvedScope, true)
        : await this.buildQueueTracks(surah, ayah, totalAyahsInSurah, requestedReciter, {
            ...resolvedScope,
            startAyah: ayah,
            endAyah: ayah,
          }, false);

      if (requestId !== this.playRequestId) return;

      const started = await this.runQueueOperation(async () => {
        if (requestId !== this.playRequestId) return null;
        await TrackPlayer.reset();
        await TrackPlayer.setRepeatMode(RepeatMode.Off);
        await TrackPlayer.add(queue.tracks);
        await TrackPlayer.skip(queue.selectedIndex);
        await this.applyPlaybackRate();

        if (requestId !== this.playRequestId) {
          // Stopped mid-load: leave nothing queued. A newer play waits for this lock.
          await TrackPlayer.reset().catch(() => undefined);
          return null;
        }

        this.loadingRequestId = null;
        const paused = this.pauseAfterLoadRequestId === requestId;
        this.pauseAfterLoadRequestId = null;
        if (!paused) {
          await TrackPlayer.play();
        }
        return { paused };
      });

      if (!started || requestId !== this.playRequestId) return;
      const startPaused = started.paused;

      const tailTrack = [...queue.tracks].reverse().find(isQuranTrack);
      this.queuedTailAyah = tailTrack?.ayah ?? ayah;
      this.queuedScopeEndAyah = queue.scopeEndAyah;
      this.queuedSurah = surah;
      this.lastKnownTrackId = this.getTrackId(queue.tracks[queue.selectedIndex]);
      this.snapshot = {
        isActive: true,
        isPlaying: !startPaused,
        status: startPaused ? 'paused' : 'playing',
        statusMessage: null,
        errorMessage: null,
        surah,
        ayah,
        reciter: requestedReciter,
        scopeType: resolvedScope.type,
        scopeStartAyah: queue.scopeStartAyah,
        scopeEndAyah: queue.scopeEndAyah,
        totalAyahs: totalAyahsInSurah,
        juzNumber: resolvedScope.juzNumber,
        playbackRate: this.playbackRate,
        position: 0,
        duration: 0,
      };
      this.emitSnapshot();
      this.onAyahChangeCb?.(surah, ayah);
      await AsyncStorage.setItem(LAST_POSITION_KEY, JSON.stringify({ surah, ayah }));
      await persistQuranResumeContext({
        mediaType: 'quran',
        surah,
        ayah,
        scopeType: resolvedScope.type,
        juzNumber: resolvedScope.juzNumber ?? null,
        updatedAt: Date.now(),
      });
    } catch (e) {
      if (this.loadingRequestId === requestId) {
        this.loadingRequestId = null;
      }
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
      if (requestId === this.playRequestId) {
        this.snapshot = {
          ...this.snapshot,
          isActive: false,
          isPlaying: false,
          status: 'error',
          statusMessage: null,
          errorMessage: getQuranPlaybackErrorMessage(resolvedError),
        };
        this.emitSnapshot();
        this.onPlaybackEndCb?.();
      }
      throw resolvedError;
    }
  }

  async pause(): Promise<void> {
    try {
      if (!this.snapshot.isActive) return;
      if (this.loadingRequestId !== null && this.loadingRequestId === this.playRequestId) {
        this.pauseAfterLoadRequestId = this.loadingRequestId;
        this.snapshot = { ...this.snapshot, isPlaying: false, status: 'paused', statusMessage: null };
        this.emitSnapshot();
        return;
      }
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
      if (this.loadingRequestId !== null && this.loadingRequestId === this.playRequestId) {
        this.pauseAfterLoadRequestId = null;
        this.snapshot = {
          ...this.snapshot,
          isPlaying: false,
          status: 'preparing',
          statusMessage: `در حال آماده‌سازی صدای ${RECITERS[this.snapshot.reciter].name}...`,
        };
        this.emitSnapshot();
        return;
      }
      await TrackPlayer.play();
      this.snapshot = { ...this.snapshot, isPlaying: true };
      this.emitSnapshot();
    } catch {
      // ignore
    }
  }

  /**
   * Lock-screen next/previous for Quran tracks. Returns false when the active
   * track is not Quran so the caller can apply its default behavior.
   */
  async skipFromRemote(delta: 1 | -1): Promise<boolean> {
    if (!isSharedTrackPlayerReady()) return false;
    const activeTrack = await TrackPlayer.getActiveTrack().catch(() => undefined);
    if (!isQuranTrack(activeTrack)) return false;

    if (delta < 0) {
      const progress = await TrackPlayer.getProgress().catch(() => null);
      if (progress && progress.position > 3) {
        await TrackPlayer.seekTo(0).catch(() => undefined);
        return true;
      }
    }

    const target = activeTrack.ayah + delta;
    if (target < activeTrack.scopeStartAyah || target > activeTrack.scopeEndAyah) {
      if (delta < 0) await TrackPlayer.seekTo(0).catch(() => undefined);
      return true;
    }

    const activeIndex = await TrackPlayer.getActiveTrackIndex().catch(() => undefined);
    const queue = await TrackPlayer.getQueue().catch(() => [] as unknown[]);
    const nextIndex = typeof activeIndex === 'number' ? activeIndex + delta : -1;
    const queued = nextIndex >= 0 ? queue[nextIndex] : undefined;
    if (isQuranTrack(queued) && queued.surah === activeTrack.surah && queued.ayah === target) {
      await TrackPlayer.skip(nextIndex).catch(() => undefined);
      return true;
    }

    await this.playAyah(activeTrack.surah, target, activeTrack.totalAyahs, true, true, {
      type: activeTrack.scopeType,
      startAyah: activeTrack.scopeStartAyah,
      endAyah: activeTrack.scopeEndAyah,
      juzNumber: activeTrack.juzNumber ?? null,
    }).catch(() => undefined);
    return true;
  }

  async stop(): Promise<void> {
    const stopRequestId = ++this.playRequestId;
    this.loadingRequestId = null;
    this.pauseAfterLoadRequestId = null;
    if (!isSharedTrackPlayerReady()) {
      this.clearQuranPlayback(true);
      return;
    }
    await this.runQueueOperation(async () => {
      if (stopRequestId !== this.playRequestId) return;
      const activeTrack = await TrackPlayer.getActiveTrack();
      if (isQuranTrack(activeTrack)) {
        await TrackPlayer.reset();
      }
    }).catch(() => undefined);
    // A play started right after stop() owns the snapshot now.
    if (stopRequestId === this.playRequestId) {
      this.clearQuranPlayback(true);
    }
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
      return this.isValidCachedAudioFile(info) && (await hasMp3Header(cachePath));
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
