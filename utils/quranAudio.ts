/**
 * Quran Audio Manager
 * Hybrid playback engine:
 * - Method A: full-surah audio + timestamp map (gapless seek transitions)
 * - Legacy: ayah-by-ayah audio files (fallback)
 */

import { Audio, AVPlaybackStatus } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  documentDirectory,
  makeDirectoryAsync,
  getInfoAsync,
  downloadAsync,
} from 'expo-file-system/legacy';
import metadata from '@/data/metadata.json';
import surahManifest from '@/data/quran-audio/surah-manifest.json';
import timestampIndex from '@/data/quran-timestamps/index.json';

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

export interface SurahAudioManifestEntry {
  reciter: ReciterId;
  surah: number;
  uri: string;
  checksum?: string;
  durationMs?: number;
}

export interface AyahSegment {
  ayah: number;
  start: number;
  end: number;
}

export interface SurahTimestampMap {
  surah: number;
  reciter: ReciterId;
  segments: AyahSegment[];
}

interface SurahManifestFile {
  version?: number;
  entries?: SurahAudioManifestEntry[];
}

interface TimestampIndexFile {
  version?: number;
  reciters?: Partial<Record<ReciterId, Record<string, AyahSegment[]>>>;
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

const RECITER_STORAGE_KEY = '@ebadat/selected_reciter';
const AUDIO_DIRECTORY = `${documentDirectory}quran_audio/`;
const FULL_SURAH_DIRECTORY = `${AUDIO_DIRECTORY}full_surah/`;

const SMALL_SURAHS = [1, 103, 104, 105, 106, 107, 108, 109, 110, 111, 112, 113, 114];

const SURAH_AYAH_COUNTS: Record<number, number> = (
  metadata as { surahs: { number: number; numberOfAyahs: number }[] }
).surahs.reduce((acc, surahItem) => {
  acc[surahItem.number] = surahItem.numberOfAyahs;
  return acc;
}, {} as Record<number, number>);

const METHOD_A_STATUS_INTERVAL_MS = 50;
const METHOD_A_END_TOLERANCE_MS = 35;

type EngineMode = 'none' | 'legacy' | 'methodA';

type MethodASegmentState = {
  surah: number;
  ayah: number;
  startMs: number;
  endMs: number;
  boundaryToken: number;
};

const manifestFile = surahManifest as SurahManifestFile;
const timestampFile = timestampIndex as TimestampIndexFile;

const SURAH_MANIFEST_ENTRIES: SurahAudioManifestEntry[] = Array.isArray(manifestFile.entries)
  ? manifestFile.entries.filter(isValidManifestEntry)
  : [];

const TIMESTAMP_RECITER_INDEX: Partial<Record<ReciterId, Record<string, AyahSegment[]>>> =
  timestampFile.reciters ?? {};

function isValidManifestEntry(entry: unknown): entry is SurahAudioManifestEntry {
  if (!entry || typeof entry !== 'object') return false;
  const candidate = entry as SurahAudioManifestEntry;

  return (
    (candidate.reciter === 'ghamidi' || candidate.reciter === 'muaiqly') &&
    Number.isInteger(candidate.surah) &&
    candidate.surah >= 1 &&
    candidate.surah <= 114 &&
    typeof candidate.uri === 'string' &&
    candidate.uri.trim().length > 0
  );
}

function padSurah(value: number): string {
  return String(value).padStart(3, '0');
}

function isHttpUri(uri: string): boolean {
  return /^https?:\/\//i.test(uri);
}

function validateSegments(segments: AyahSegment[], expectedAyahCount?: number): boolean {
  if (!Array.isArray(segments) || segments.length === 0) {
    return false;
  }

  let previousEnd = -1;
  let previousAyah = 0;

  for (const segment of segments) {
    if (
      !segment ||
      !Number.isFinite(segment.ayah) ||
      !Number.isFinite(segment.start) ||
      !Number.isFinite(segment.end)
    ) {
      return false;
    }

    if (segment.ayah <= 0 || segment.start < 0 || segment.end <= segment.start) {
      return false;
    }

    if (segment.start < previousEnd) {
      return false;
    }

    if (previousAyah > 0 && segment.ayah !== previousAyah + 1) {
      return false;
    }

    previousEnd = segment.end;
    previousAyah = segment.ayah;
  }

  if (expectedAyahCount && segments[segments.length - 1].ayah > expectedAyahCount) {
    return false;
  }

  return true;
}

function getTimestampSegments(reciter: ReciterId, surah: number): AyahSegment[] | null {
  const reciterIndex = TIMESTAMP_RECITER_INDEX[reciter];
  if (!reciterIndex) return null;

  const segments = reciterIndex[String(surah)];
  if (!segments) return null;

  const sortedSegments = [...segments].sort((a, b) => a.ayah - b.ayah);
  const expectedAyahCount = SURAH_AYAH_COUNTS[surah];

  if (!validateSegments(sortedSegments, expectedAyahCount)) {
    return null;
  }

  return sortedSegments;
}

// ═══════════════════════════════════════════════════
// AUDIO MANAGER CLASS
// ═══════════════════════════════════════════════════

export class QuranAudioManager {
  private sound: Audio.Sound | null = null;
  private preloadedSound: Audio.Sound | null = null;
  private preloadedSurah: number | null = null;
  private preloadedAyah: number | null = null;

  private currentReciter: ReciterId = 'ghamidi';
  private isPlaying = false;
  private playbackSpeed = 1.0;
  private repeatMode: 'none' | 'ayah' | 'surah' = 'none';

  private onStatusUpdate: ((status: AudioStatus) => void) | null = null;
  private onAyahComplete: (() => void) | null = null;

  private activeEngine: EngineMode = 'none';
  private loadedSurah: number | null = null;
  private loadedReciter: ReciterId | null = null;

  private activeMethodASegment: MethodASegmentState | null = null;
  private methodABoundaryToken = 0;
  private methodAHandledBoundaryToken = 0;

  private playbackContext: { autoPlayAudio: boolean } = {
    autoPlayAudio: true,
  };

  constructor() {
    this.initialize();
  }

  async initialize() {
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        staysActiveInBackground: true,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });

      await makeDirectoryAsync(AUDIO_DIRECTORY, { intermediates: true });
      await makeDirectoryAsync(FULL_SURAH_DIRECTORY, { intermediates: true });

      const savedReciter = await AsyncStorage.getItem(RECITER_STORAGE_KEY);
      if (savedReciter && (savedReciter === 'ghamidi' || savedReciter === 'muaiqly')) {
        this.currentReciter = savedReciter;
      }
    } catch (error) {
      if (__DEV__) {
        console.log('[QuranAudio] init error:', error);
      }
    }
  }

  private getLegacyAudioUrl(surah: number, ayah: number): string {
    const filename = `${String(surah).padStart(3, '0')}${String(ayah).padStart(3, '0')}.mp3`;
    return `${RECITERS[this.currentReciter].baseUrl}/${filename}`;
  }

  private getLegacyLocalPath(surah: number, ayah: number): string {
    const filename = `${this.currentReciter}_${String(surah).padStart(3, '0')}${String(ayah).padStart(3, '0')}.mp3`;
    return `${AUDIO_DIRECTORY}${filename}`;
  }

  private getMethodALocalPath(surah: number): string {
    return `${FULL_SURAH_DIRECTORY}${this.currentReciter}_${padSurah(surah)}.mp3`;
  }

  private getManifestEntry(surah: number, reciter: ReciterId): SurahAudioManifestEntry | null {
    return (
      SURAH_MANIFEST_ENTRIES.find((entry) => entry.surah === surah && entry.reciter === reciter) ?? null
    );
  }

  private getMethodASegments(surah: number, reciter: ReciterId): AyahSegment[] | null {
    return getTimestampSegments(reciter, surah);
  }

  setPlaybackContext(context: Partial<{ autoPlayAudio: boolean }>): void {
    this.playbackContext = {
      ...this.playbackContext,
      ...context,
    };
  }

  isMethodAAvailable(surah: number, reciter: ReciterId = this.currentReciter): boolean {
    return !!this.getManifestEntry(surah, reciter) && !!this.getMethodASegments(surah, reciter);
  }

  getActiveEngineMode(): EngineMode {
    return this.activeEngine;
  }

  private logMethodA(message: string, extra?: Record<string, unknown>): void {
    if (!__DEV__) return;
    console.log('[QuranAudio][MethodA]', message, extra ?? {});
  }

  async isAudioCached(surah: number, ayah: number): Promise<boolean> {
    const localPath = this.getLegacyLocalPath(surah, ayah);
    try {
      const fileInfo = await getInfoAsync(localPath);
      return fileInfo.exists;
    } catch {
      return false;
    }
  }

  async downloadAudio(surah: number, ayah: number): Promise<string | null> {
    const localPath = this.getLegacyLocalPath(surah, ayah);
    const audioUrl = this.getLegacyAudioUrl(surah, ayah);

    try {
      const downloadResult = await downloadAsync(audioUrl, localPath);
      if (downloadResult.status === 200) {
        return localPath;
      }
    } catch (error) {
      if (__DEV__) {
        console.log('[QuranAudio] legacy download error:', error);
      }
    }
    return null;
  }

  private async getLegacyAudioSource(surah: number, ayah: number): Promise<string> {
    const localPath = this.getLegacyLocalPath(surah, ayah);
    const isCached = await this.isAudioCached(surah, ayah);

    if (isCached) {
      return localPath;
    }

    if (SMALL_SURAHS.includes(surah)) {
      const downloaded = await this.downloadAudio(surah, ayah);
      if (downloaded) {
        return downloaded;
      }
    }

    return this.getLegacyAudioUrl(surah, ayah);
  }

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

    if (this.activeEngine === 'methodA') {
      this.handleMethodAStatus(status);
      return;
    }

    if (status.didJustFinish) {
      if (this.repeatMode === 'ayah') {
        this.sound?.replayAsync();
      } else {
        this.onAyahComplete?.();
      }
    }
  };

  private handleMethodAStatus(status: Extract<AVPlaybackStatus, { isLoaded: true }>): void {
    if (!this.activeMethodASegment) return;

    if (status.positionMillis + METHOD_A_END_TOLERANCE_MS < this.activeMethodASegment.endMs) {
      return;
    }

    if (this.activeMethodASegment.boundaryToken <= this.methodAHandledBoundaryToken) {
      return;
    }

    this.methodAHandledBoundaryToken = this.activeMethodASegment.boundaryToken;
    void this.handleMethodASegmentEnd();
  }

  private async handleMethodASegmentEnd(): Promise<void> {
    const segmentState = this.activeMethodASegment;
    if (!segmentState || !this.sound) {
      return;
    }

    if (this.repeatMode === 'ayah') {
      const loopSegment: AyahSegment = {
        ayah: segmentState.ayah,
        start: segmentState.startMs / 1000,
        end: segmentState.endMs / 1000,
      };
      await this.startMethodASegment(segmentState.surah, loopSegment);
      return;
    }

    await this.sound.pauseAsync();
    await this.sound.setPositionAsync(segmentState.endMs);

    // Keep external contract unchanged: app drives next ayah progression.
    if (this.playbackContext.autoPlayAudio) {
      this.onAyahComplete?.();
      return;
    }

    this.onAyahComplete?.();
  }

  private async getMethodAAudioSource(surah: number, manifestUri: string): Promise<string> {
    const localPath = this.getMethodALocalPath(surah);

    try {
      const localInfo = await getInfoAsync(localPath);
      if (localInfo.exists) {
        return localPath;
      }
    } catch {
      // ignore local stat errors
    }

    if (manifestUri.startsWith('file://')) {
      return manifestUri;
    }

    if (isHttpUri(manifestUri)) {
      this.cacheMethodASurahInBackground(manifestUri, localPath);
    }

    return manifestUri;
  }

  private cacheMethodASurahInBackground(uri: string, localPath: string): void {
    void (async () => {
      try {
        const existing = await getInfoAsync(localPath);
        if (existing.exists) return;

        const result = await downloadAsync(uri, localPath);
        if (result.status === 200) {
          this.logMethodA('cached_full_surah', { localPath });
        }
      } catch (error) {
        this.logMethodA('cache_failed', {
          uri,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    })();
  }

  private async ensureMethodASurahLoaded(surah: number, manifestUri: string): Promise<void> {
    if (
      this.sound &&
      this.activeEngine === 'methodA' &&
      this.loadedSurah === surah &&
      this.loadedReciter === this.currentReciter
    ) {
      return;
    }

    await this.unload();

    this.onStatusUpdate?.({
      isPlaying: false,
      isLoading: true,
      position: 0,
      duration: 0,
      isBuffering: true,
    });

    const audioSource = await this.getMethodAAudioSource(surah, manifestUri);
    const { sound } = await Audio.Sound.createAsync(
      { uri: audioSource },
      {
        shouldPlay: false,
        rate: this.playbackSpeed,
        shouldCorrectPitch: true,
        progressUpdateIntervalMillis: METHOD_A_STATUS_INTERVAL_MS,
      },
      this.handlePlaybackStatus
    );

    this.sound = sound;
    this.activeEngine = 'methodA';
    this.loadedSurah = surah;
    this.loadedReciter = this.currentReciter;

    this.logMethodA('loaded_surah', {
      surah,
      reciter: this.currentReciter,
      source: audioSource,
    });
  }

  private async startMethodASegment(surah: number, segment: AyahSegment): Promise<void> {
    if (!this.sound) {
      throw new Error('Method A sound is not loaded');
    }

    const startMs = Math.max(0, Math.floor(segment.start * 1000));
    const endMs = Math.max(startMs + 1, Math.floor(segment.end * 1000));

    const boundaryToken = ++this.methodABoundaryToken;
    this.activeMethodASegment = {
      surah,
      ayah: segment.ayah,
      startMs,
      endMs,
      boundaryToken,
    };

    await this.sound.setPositionAsync(startMs);
    await this.sound.playAsync();
  }

  private async playAyahWithMethodA(surah: number, ayah: number): Promise<boolean> {
    const manifestEntry = this.getManifestEntry(surah, this.currentReciter);
    if (!manifestEntry) {
      return false;
    }

    const segments = this.getMethodASegments(surah, this.currentReciter);
    if (!segments) {
      this.logMethodA('missing_or_invalid_timestamps', { surah, reciter: this.currentReciter });
      return false;
    }

    const targetSegment = segments.find((segment) => segment.ayah === ayah);
    if (!targetSegment) {
      this.logMethodA('missing_ayah_segment', { surah, ayah, reciter: this.currentReciter });
      return false;
    }

    try {
      await this.ensureMethodASurahLoaded(surah, manifestEntry.uri);
      await this.startMethodASegment(surah, targetSegment);
      return true;
    } catch (error) {
      this.logMethodA('play_failed', {
        surah,
        ayah,
        reciter: this.currentReciter,
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }

  private async playAyahLegacy(surah: number, ayah: number): Promise<void> {
    this.activeEngine = 'legacy';
    this.loadedSurah = surah;
    this.loadedReciter = this.currentReciter;
    this.activeMethodASegment = null;

    if (this.preloadedSurah === surah && this.preloadedAyah === ayah && this.preloadedSound) {
      try {
        if (this.sound) {
          await this.sound.unloadAsync();
          this.sound = null;
        }

        this.sound = this.preloadedSound;
        this.preloadedSound = null;
        this.preloadedSurah = null;
        this.preloadedAyah = null;

        this.onStatusUpdate?.({
          isPlaying: false,
          isLoading: false,
          position: 0,
          duration: 0,
          isBuffering: false,
        });

        await this.sound.setRateAsync(this.playbackSpeed, true);
        await this.sound.playAsync();

        this.preloadAyah(surah, ayah);
      } catch (error) {
        if (__DEV__) {
          console.log('[QuranAudio] play preloaded error:', error);
        }
        this.sound = null;
        await this.playAyahLegacy(surah, ayah);
      }
      return;
    }

    await this.unload();

    this.onStatusUpdate?.({
      isPlaying: false,
      isLoading: true,
      position: 0,
      duration: 0,
      isBuffering: true,
    });

    try {
      const localPath = this.getLegacyLocalPath(surah, ayah);
      const audioSource = await this.getLegacyAudioSource(surah, ayah);

      const { sound } = await Audio.Sound.createAsync(
        { uri: audioSource },
        { shouldPlay: true, rate: this.playbackSpeed, shouldCorrectPitch: true },
        this.handlePlaybackStatus
      );

      this.sound = sound;

      if (audioSource !== localPath) {
        this.downloadAudio(surah, ayah).catch(() => {
          // optional cache path
        });
      }

      this.preloadAyah(surah, ayah);
    } catch (error) {
      if (__DEV__) {
        console.log('[QuranAudio] legacy play error:', error);
      }
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

  async playAyah(surah: number, ayah: number): Promise<void> {
    if (this.isMethodAAvailable(surah, this.currentReciter)) {
      const playedWithMethodA = await this.playAyahWithMethodA(surah, ayah);
      if (playedWithMethodA) {
        return;
      }

      this.logMethodA('fallback_to_legacy', { surah, ayah, reciter: this.currentReciter });
    }

    await this.playAyahLegacy(surah, ayah);
  }

  async playContinuous(
    surah: number,
    startAyah: number,
    totalAyahs: number,
    onAyahChange: (ayah: number) => void
  ): Promise<void> {
    for (let ayah = startAyah; ayah <= totalAyahs; ayah++) {
      onAyahChange(ayah);
      await this.playAyah(surah, ayah);

      await new Promise<void>((resolve) => {
        this.onAyahComplete = () => {
          if (this.repeatMode === 'surah' && ayah === totalAyahs) {
            ayah = startAyah - 1;
          }
          resolve();
        };
      });
    }
  }

  async pause(): Promise<void> {
    if (this.sound) {
      await this.sound.pauseAsync();
    }
  }

  async resume(): Promise<void> {
    if (this.sound) {
      await this.sound.playAsync();
    }
  }

  async togglePlayPause(): Promise<void> {
    if (this.isPlaying) {
      await this.pause();
    } else {
      await this.resume();
    }
  }

  async stop(): Promise<void> {
    if (this.sound) {
      await this.sound.stopAsync();
    }
  }

  async unload(): Promise<void> {
    if (this.sound) {
      await this.sound.unloadAsync();
      this.sound = null;
    }

    if (this.preloadedSound) {
      await this.preloadedSound.unloadAsync();
      this.preloadedSound = null;
      this.preloadedSurah = null;
      this.preloadedAyah = null;
    }

    this.activeEngine = 'none';
    this.loadedSurah = null;
    this.loadedReciter = null;
    this.activeMethodASegment = null;
    this.methodABoundaryToken = 0;
    this.methodAHandledBoundaryToken = 0;
    this.isPlaying = false;
  }

  private async clearPreloaded(): Promise<void> {
    if (this.preloadedSound) {
      await this.preloadedSound.unloadAsync();
      this.preloadedSound = null;
      this.preloadedSurah = null;
      this.preloadedAyah = null;
    }
  }

  private preloadAyah(surah: number, ayah: number): void {
    const totalAyahs = SURAH_AYAH_COUNTS[surah];
    if (!totalAyahs || ayah >= totalAyahs) return;

    const nextAyah = ayah + 1;
    if (this.preloadedSurah === surah && this.preloadedAyah === nextAyah) return;

    this.clearPreloaded().then(() => {
      this.getLegacyAudioSource(surah, nextAyah)
        .then((audioSource) =>
          Audio.Sound.createAsync(
            { uri: audioSource },
            { shouldPlay: false, rate: this.playbackSpeed, shouldCorrectPitch: true },
            this.handlePlaybackStatus
          )
        )
        .then(({ sound }) => {
          this.preloadedSound = sound;
          this.preloadedSurah = surah;
          this.preloadedAyah = nextAyah;
        })
        .catch(() => {
          // optional preload path
        });
    });
  }

  async seek(positionMillis: number): Promise<void> {
    if (this.sound) {
      await this.sound.setPositionAsync(positionMillis);
    }
  }

  async seekBackward(): Promise<void> {
    if (this.sound) {
      const status = await this.sound.getStatusAsync();
      if (status.isLoaded) {
        const newPosition = Math.max(0, status.positionMillis - 5000);
        await this.sound.setPositionAsync(newPosition);
      }
    }
  }

  async seekForward(): Promise<void> {
    if (this.sound) {
      const status = await this.sound.getStatusAsync();
      if (status.isLoaded) {
        const newPosition = Math.min(status.durationMillis || 0, status.positionMillis + 5000);
        await this.sound.setPositionAsync(newPosition);
      }
    }
  }

  async setSpeed(speed: number): Promise<void> {
    this.playbackSpeed = speed;
    if (this.sound) {
      await this.sound.setRateAsync(speed, true);
    }
  }

  setRepeatMode(mode: 'none' | 'ayah' | 'surah'): void {
    this.repeatMode = mode;
  }

  getRepeatMode(): 'none' | 'ayah' | 'surah' {
    return this.repeatMode;
  }

  async setReciter(reciter: ReciterId): Promise<void> {
    this.currentReciter = reciter;
    await AsyncStorage.setItem(RECITER_STORAGE_KEY, reciter);
    await this.clearPreloaded();
  }

  getReciter(): ReciterId {
    return this.currentReciter;
  }

  getReciterInfo(): ReciterInfo {
    return RECITERS[this.currentReciter];
  }

  setOnStatusUpdate(callback: (status: AudioStatus) => void): void {
    this.onStatusUpdate = callback;
  }

  setOnAyahComplete(callback: () => void): void {
    this.onAyahComplete = callback;
  }

  async cacheSmallSurahs(onProgress?: (progress: number) => void): Promise<void> {
    const totalAyahs = SMALL_SURAHS.reduce((sum, surah) => {
      const counts: Record<number, number> = {
        1: 7,
        103: 3,
        104: 9,
        105: 5,
        106: 4,
        107: 7,
        108: 3,
        109: 6,
        110: 3,
        111: 5,
        112: 4,
        113: 5,
        114: 6,
      };
      return sum + (counts[surah] || 7);
    }, 0);

    let completed = 0;

    for (const surah of SMALL_SURAHS) {
      const counts: Record<number, number> = {
        1: 7,
        103: 3,
        104: 9,
        105: 5,
        106: 4,
        107: 7,
        108: 3,
        109: 6,
        110: 3,
        111: 5,
        112: 4,
        113: 5,
        114: 6,
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

export interface AudioStatus {
  isPlaying: boolean;
  isLoading: boolean;
  position: number;
  duration: number;
  isBuffering: boolean;
  error?: string;
}

let audioManagerInstance: QuranAudioManager | null = null;

export function getQuranAudioManager(): QuranAudioManager {
  if (!audioManagerInstance) {
    audioManagerInstance = new QuranAudioManager();
  }
  return audioManagerInstance;
}

export const PLAYBACK_SPEEDS = [
  { value: 0.75, label: '۰.۷۵×', labelDari: 'آهسته' },
  { value: 1.0, label: '۱×', labelDari: 'عادی' },
  { value: 1.25, label: '۱.۲۵×', labelDari: 'تند' },
];

export const REPEAT_MODES = [
  { value: 'none', label: 'بدون تکرار', icon: 'repeat' },
  { value: 'ayah', label: 'تکرار آیه', icon: 'repeat-one' },
  { value: 'surah', label: 'تکرار سوره', icon: 'repeat' },
] as const;
