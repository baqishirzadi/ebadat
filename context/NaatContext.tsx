import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, AppState, InteractionManager, Platform } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import * as FileSystem from 'expo-file-system/legacy';
import TrackPlayer, { Event, State, type AddTrack } from 'react-native-track-player';
import { useStartupPhase } from '@/context/StartupPhaseContext';
import { useApp } from '@/context/AppContext';
import { Naat, NaatDraft } from '@/types/naat';
import {
  createDraftPayload,
  ensureNaatDirectory,
  getNaatDirectory,
  loadCatalog,
  loadLocalMeta,
  mergeCatalogWithLocal,
  saveCatalog,
  upsertLocalMeta,
  deleteLocalMeta,
  verifyDownloads,
} from '@/utils/naatStorage';
import { getSupabaseClient, isSupabaseConfigured } from '@/utils/supabase';
import fallbackNaatsData from '@/data/naats.fallback.json';
import { ensureSharedTrackPlayerReady } from '@/utils/sharedTrackPlayer';
import { shouldAutoDownloadCompletedNaat } from '@/utils/naatCompletion';

type PlayerState = {
  current: Naat | null;
  isPlaying: boolean;
  positionMillis: number;
  durationMillis: number;
};

export type NaatQueueSource = 'catalog' | 'filtered' | 'downloads' | 'single';

type NaatSessionState = {
  queueIds: string[];
  currentIndex: number;
  source: NaatQueueSource;
  totalCount: number;
  canSkipNext: boolean;
  canSkipPrevious: boolean;
};

type NaatCatalogContextValue = {
  naats: Naat[];
  loading: boolean;
  syncError: string | null;
  syncSource: 'supabase' | 'cache' | 'fallback';
  refresh: () => Promise<void>;
  createItem: (draft: NaatDraft) => Promise<void>;
  updateItem: (id: string, patch: Partial<Naat>) => Promise<void>;
  removeItem: (id: string) => Promise<void>;
  download: (naat: Naat) => Promise<void>;
};

type NaatPlaybackContextValue = {
  player: PlayerState;
  session: NaatSessionState;
  ensurePlayerReady: (reason?: string) => Promise<void>;
  play: (naat: Naat) => Promise<void>;
  playFromQueue: (items: Naat[], selectedId: string, source: NaatQueueSource) => Promise<void>;
  togglePlayPause: () => Promise<void>;
  skipNext: () => Promise<void>;
  skipPrevious: () => Promise<void>;
  pause: () => Promise<void>;
  resume: () => Promise<void>;
  stop: () => Promise<void>;
  seek: (millis: number) => void;
};

export type NaatContextValue = NaatCatalogContextValue & NaatPlaybackContextValue;
const NaatCatalogContext = createContext<NaatCatalogContextValue | null>(null);
const NaatPlaybackContext = createContext<NaatPlaybackContextValue | null>(null);

export function useNaatCatalog() {
  const ctx = useContext(NaatCatalogContext);
  if (!ctx) {
    throw new Error('useNaatCatalog must be used within NaatProvider');
  }
  return ctx;
}

export function useNaatPlayer() {
  const ctx = useContext(NaatPlaybackContext);
  if (!ctx) {
    throw new Error('useNaatPlayer must be used within NaatProvider');
  }
  return ctx;
}

export function useNaat() {
  const catalog = useNaatCatalog();
  const playback = useNaatPlayer();
  return useMemo(() => ({ ...catalog, ...playback }), [catalog, playback]);
}

const TRACK_POLL_INTERVAL_MS = Platform.OS === 'android' ? 400 : 250;
const PLAYER_PROGRESS_QUANTIZE_MS = Platform.OS === 'android' ? 250 : 100;
const PROGRESS_EVENT_STALE_MS = 350;
const RESUME_TAIL_RESET_MS = 3000;
const DOWNLOAD_PROGRESS_THROTTLE_MS = 350;
const SUPABASE_FETCH_TIMEOUT_MS = 8000;
const PLAYBACK_START_TIMEOUT_MS = 12000;
const PLAYBACK_START_POLL_MS = 300;
const REMOTE_AUDIO_PROBE_TIMEOUT_MS = 6000;
const EMPTY_SESSION: NaatSessionState = {
  queueIds: [],
  currentIndex: -1,
  source: 'single',
  totalCount: 0,
  canSkipNext: false,
  canSkipPrevious: false,
};

type StoredCatalog = Awaited<ReturnType<typeof loadCatalog>>;
type ResolvedAudioSource = {
  uri: string;
  isOffline: boolean;
  isLocal: boolean;
  probeOk: boolean;
};
const FALLBACK_NAATS = fallbackNaatsData as StoredCatalog;

function normalizeAudioUrl(url: string): string {
  const trimmed = url.trim();
  return trimmed.includes(' ') ? encodeURI(trimmed) : trimmed;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error ?? 'unknown-error');
}

function isRemoteAudioUrl(uri: string): boolean {
  return /^https?:\/\//i.test(uri);
}

function getAudioContentType(uri: string): string {
  const cleanUri = uri.split('?')[0].toLowerCase();
  if (cleanUri.endsWith('.m4a') || cleanUri.endsWith('.mp4')) {
    return 'audio/mp4';
  }
  return 'audio/mpeg';
}

function getNaatAudioExtension(uri: string): 'm4a' | 'mp3' {
  const cleanUri = uri.split('?')[0].toLowerCase();
  return cleanUri.endsWith('.m4a') || cleanUri.endsWith('.mp4') ? 'm4a' : 'mp3';
}

async function probeRemoteAudio(uri: string): Promise<void> {
  if (!isRemoteAudioUrl(uri)) return;

  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timeout = setTimeout(() => {
    controller?.abort();
  }, REMOTE_AUDIO_PROBE_TIMEOUT_MS);

  try {
    const response = await fetch(uri, {
      method: 'GET',
      headers: {
        Range: 'bytes=0-1023',
      },
      signal: controller?.signal,
    });

    if (!(response.ok || response.status === 206)) {
      throw new Error(`probe-status-${response.status}`);
    }
  } finally {
    clearTimeout(timeout);
  }
}

async function loadAndStartTrackQueue(
  queueTracks: AddTrack[],
  selectedIndex: number,
  initialPosition: number,
  selectedId: string,
): Promise<void> {
  await TrackPlayer.reset();
  await TrackPlayer.add(queueTracks);
  await TrackPlayer.skip(selectedIndex, initialPosition);
  await TrackPlayer.play();

  await waitForPlaybackStart(selectedId);
}

async function waitForPlaybackStart(selectedId: string): Promise<void> {
  const startedAt = Date.now();
  let lastState: State | null = null;
  let lastPosition = 0;

  while (Date.now() - startedAt < PLAYBACK_START_TIMEOUT_MS) {
    const [activeTrack, playbackState, progress] = await Promise.all([
      TrackPlayer.getActiveTrack(),
      TrackPlayer.getPlaybackState(),
      TrackPlayer.getProgress(),
    ]);
    const activeTrackId = getTrackId(activeTrack);
    const state = playbackState.state;
    lastState = state;

    if (activeTrackId !== selectedId) {
      throw new Error(`naat-active-track-mismatch:${activeTrackId ?? 'none'}`);
    }

    if (state === State.Error) {
      const reason = 'error' in playbackState ? playbackState.error?.message : 'unknown-playback-error';
      throw new Error(`naat-playback-error:${reason || 'unknown-playback-error'}`);
    }

    if (state === State.Playing && progress.position > lastPosition + 0.15) {
      return;
    }

    if (state === State.Playing) {
      lastPosition = Math.max(lastPosition, progress.position);
    }

    if (state === State.Ready || state === State.Paused) {
      await TrackPlayer.play();
    }

    await sleep(PLAYBACK_START_POLL_MS);
  }

  throw new Error(`naat-playback-timeout:${lastState ?? 'unknown'}`);
}

function getTrackId(track: unknown): string | null {
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

function shouldRetryPlaybackStart(error: unknown): boolean {
  const message = getErrorMessage(error);
  return /not initialized|setupPlayer first|active-track-mismatch/i.test(message);
}

function uniqueNaats(items: Naat[]): Naat[] {
  const seen = new Set<string>();
  const next: Naat[] = [];
  for (const item of items) {
    if (!item.id || seen.has(item.id)) continue;
    seen.add(item.id);
    next.push(item);
  }
  return next;
}

function makeSession(queueIds: string[], currentId: string | null, source: NaatQueueSource): NaatSessionState {
  const currentIndex = currentId ? queueIds.findIndex((id) => id === currentId) : -1;
  const totalCount = queueIds.length;
  return {
    queueIds,
    currentIndex,
    source,
    totalCount,
    canSkipPrevious: currentIndex > 0,
    canSkipNext: currentIndex >= 0 && currentIndex < totalCount - 1,
  };
}

function quantizeMillis(value: number): number {
  if (value <= 0) return 0;
  return Math.floor(value / PLAYER_PROGRESS_QUANTIZE_MS) * PLAYER_PROGRESS_QUANTIZE_MS;
}

export function NaatProvider({ children }: { children: React.ReactNode }) {
  const { isInteractiveReady, isAdhanSettled } = useStartupPhase();
  const { state: appState } = useApp();
  const isPashto = appState.preferences.appLanguage === 'pashto';
  const [naats, setNaats] = useState<Naat[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [syncSource, setSyncSource] = useState<'supabase' | 'cache' | 'fallback'>('cache');
  const [playerReady, setPlayerReady] = useState(false);
  const [player, setPlayer] = useState<PlayerState>({
    current: null,
    isPlaying: false,
    positionMillis: 0,
    durationMillis: 0,
  });
  const [session, setSession] = useState<NaatSessionState>(EMPTY_SESSION);
  const activeTrackId = player.current?.id;

  const currentNaatRef = useRef<Naat | null>(null);
  const naatsRef = useRef<Naat[]>([]);
  const sessionRef = useRef<NaatSessionState>(EMPTY_SESSION);
  const lastSavedPosition = useRef<number>(0);
  const completedNaatIdRef = useRef<string | null>(null);
  const completionEligibleByNaatRef = useRef<Record<string, boolean>>({});
  const completionDurationByNaatRef = useRef<Record<string, number>>({});
  const autoDownloadTriggeredRef = useRef<Set<string>>(new Set());
  const downloadTasksRef = useRef<Map<string, Promise<void>>>(new Map());
  const autoDownloadByIdRef = useRef<(id: string) => void>(() => {});
  const lastProgressEventAtRef = useRef(0);
  const progressGenerationRef = useRef(0);
  const lastPlaybackErrorAt = useRef<number>(0);
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const downloadProgressTickRef = useRef<Record<string, number>>({});

  const refresh = useCallback(async (options?: { skipVerify?: boolean }) => {
    setLoading(true);
    setSyncError(null);

    try {
      await ensureNaatDirectory();
      if (!options?.skipVerify) {
        await verifyDownloads();
      }

      const [cachedCatalog, localMeta] = await Promise.all([
        loadCatalog(),
        loadLocalMeta(),
      ]);

      if (cachedCatalog.length > 0) {
        setNaats(mergeCatalogWithLocal(cachedCatalog, localMeta));
        setSyncSource('cache');
      }

      let catalog: StoredCatalog = cachedCatalog;
      let source: 'supabase' | 'cache' | 'fallback' = cachedCatalog.length > 0 ? 'cache' : 'fallback';
      let errorMessage: string | null = null;

      if (isSupabaseConfigured()) {
        try {
          const supabase = getSupabaseClient();
          const fetchPromise = supabase
            .from('naats')
            .select('*')
            .order('created_at', { ascending: false });
          const timeoutPromise = new Promise<never>((_, reject) => {
            setTimeout(
              () => reject(new Error(`supabase-timeout-${SUPABASE_FETCH_TIMEOUT_MS}`)),
              SUPABASE_FETCH_TIMEOUT_MS
            );
          });

          const { data, error } = (await Promise.race([
            fetchPromise,
            timeoutPromise,
          ])) as { data: Naat[] | null; error: { message?: string } | null };

          if (error) {
            throw new Error(error.message || 'supabase-fetch-failed');
          }
          if (!data || data.length === 0) {
            throw new Error('supabase-empty-catalog');
          }

          catalog = data as StoredCatalog;
          source = 'supabase';
          await saveCatalog(catalog);
        } catch (remoteError) {
          // A provider error can contain an internal URL or database detail.
          // The catalogue has already fallen back safely, so give the listener
          // a useful recovery message instead of leaking a technical error.
          errorMessage = 'همگام‌سازی نعت فعلاً انجام نشد؛ فهرست ذخیره‌شده نمایش داده می‌شود.';
        }
      } else {
        errorMessage = 'اتصال آنلاین نعت تنظیم نشده است.';
      }

      if (source !== 'supabase') {
        if (cachedCatalog.length > 0) {
          catalog = cachedCatalog;
          source = 'cache';
        } else {
          catalog = FALLBACK_NAATS;
          source = 'fallback';
          if (!errorMessage) {
            errorMessage = 'در حال نمایش فهرست داخلی نعت‌ها (بدون همگام‌سازی آنلاین).';
          }
        }
      }

      setNaats(mergeCatalogWithLocal(catalog, localMeta));
      setSyncSource(source);
      setSyncError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isAdhanSettled) {
      return;
    }

    let cancelled = false;
    let interactionTask: { cancel: () => void } | null = null;
    const timer = setTimeout(() => {
      interactionTask = InteractionManager.runAfterInteractions(() => {
        if (!cancelled) {
          refresh({ skipVerify: true }).catch(() => setLoading(false));
        }
      });
    }, 20_000);

    return () => {
      cancelled = true;
      clearTimeout(timer);
      interactionTask?.cancel();
    };
  }, [isAdhanSettled, refresh]);

  useEffect(() => {
    naatsRef.current = naats;
  }, [naats]);

  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  const findNaatByTrack = useCallback((track: unknown): Naat | null => {
    const trackId = getTrackId(track);
    if (!trackId) return null;
    return naatsRef.current.find((item) => item.id === trackId) ?? null;
  }, []);

  const syncPlayerSnapshot = useCallback(async (activeTrackOverride?: unknown) => {
    try {
      const activeTrack = activeTrackOverride ?? (await TrackPlayer.getActiveTrack());
      const activeNaat = findNaatByTrack(activeTrack);
      const playbackState = await TrackPlayer.getPlaybackState();

      if (!activeNaat) {
        currentNaatRef.current = null;
        setPlayer((prev) => {
          if (prev.current === null && !prev.isPlaying && prev.positionMillis === 0 && prev.durationMillis === 0) {
            return prev;
          }
          return { ...prev, current: null, isPlaying: false, positionMillis: 0, durationMillis: 0 };
        });
        setSession(EMPTY_SESSION);
        return;
      }

      currentNaatRef.current = activeNaat;
      if (completedNaatIdRef.current === activeNaat.id) {
        setPlayer((prev) => ({
          ...prev,
          current: activeNaat,
          isPlaying: false,
          positionMillis: 0,
          durationMillis: prev.durationMillis || (activeNaat.duration_seconds ?? 0) * 1000,
        }));
        return;
      }
      const progress = await TrackPlayer.getProgress();
      let queueIds = sessionRef.current.queueIds;
      if (!queueIds.includes(activeNaat.id)) {
        const queue = await TrackPlayer.getQueue();
        queueIds = queue.map((track) => getTrackId(track)).filter((id): id is string => Boolean(id));
      }
      if (queueIds.length > 0) {
        const source = sessionRef.current.queueIds.length > 0 ? sessionRef.current.source : 'catalog';
        setSession(makeSession(queueIds, activeNaat.id, source));
      }

      const positionMillis = quantizeMillis(Math.floor(progress.position * 1000));
      const durationMillis = progress.duration > 0
        ? Math.floor(progress.duration * 1000)
        : (activeNaat.duration_seconds ?? 0) * 1000;

      setPlayer((prev) => {
        const nextDuration = durationMillis || prev.durationMillis;
        const nextPlaying = playbackState.state === State.Playing;
        if (
          prev.current?.id === activeNaat.id &&
          prev.isPlaying === nextPlaying &&
          prev.positionMillis === positionMillis &&
          prev.durationMillis === nextDuration
        ) {
          return prev;
        }
        return {
          ...prev,
          current: activeNaat,
          isPlaying: nextPlaying,
          positionMillis,
          durationMillis: nextDuration,
        };
      });
    } catch {
      // ignore if player is not ready yet
    }
  }, [findNaatByTrack]);

  const ensurePlayerReady = useCallback(async (reason: string = 'unknown') => {
    try {
      await ensureSharedTrackPlayerReady(reason);
      setPlayerReady(true);
      await syncPlayerSnapshot();
    } catch (err) {
      setPlayerReady(false);
      if (__DEV__) console.log('TrackPlayer setup:', err);
      throw err;
    }
  }, [syncPlayerSnapshot]);

  const getLocalUriIfExists = useCallback(async (naat: Naat): Promise<string | null> => {
    if (!naat.localFileUri) return null;
    try {
      const info = await FileSystem.getInfoAsync(naat.localFileUri);
      return info.exists ? naat.localFileUri : null;
    } catch {
      return null;
    }
  }, []);

  const cacheNaatForPlayback = useCallback(async (naat: Naat, sourceUri: string): Promise<string> => {
    await ensureNaatDirectory();
    const dir = getNaatDirectory();
    const target = `${dir}${naat.id}.${getNaatAudioExtension(sourceUri)}`;

    try {
      const existing = await FileSystem.getInfoAsync(target);
      if (existing.exists && existing.size && existing.size > 0) {
        await upsertLocalMeta(naat.id, {
          localFileUri: target,
          isDownloaded: true,
          file_size_mb: Number((existing.size / (1024 * 1024)).toFixed(2)),
        });
        return target;
      }
    } catch {
      // Continue with a fresh download.
    }

    const result = await FileSystem.downloadAsync(sourceUri, target);
    if (!result?.uri) {
      throw new Error('cache-download-empty');
    }
    if (result.status && result.status >= 400) {
      throw new Error(`cache-download-status-${result.status}`);
    }

    const info = await FileSystem.getInfoAsync(result.uri);
    if (!info.exists || !info.size) {
      throw new Error('cache-download-missing');
    }

    const sizeMb = Number((info.size / (1024 * 1024)).toFixed(2));
    await upsertLocalMeta(naat.id, {
      localFileUri: result.uri,
      isDownloaded: true,
      downloadProgress: undefined,
      file_size_mb: sizeMb,
    });
    setNaats((prev) =>
      prev.map((item) =>
        item.id === naat.id
          ? {
              ...item,
              localFileUri: result.uri,
              isDownloaded: true,
              downloadProgress: undefined,
              file_size_mb: sizeMb,
            }
          : item,
      ),
    );

    return result.uri;
  }, []);

  const resolveAudioSource = useCallback(async (naat: Naat): Promise<ResolvedAudioSource> => {
    const localUri = await getLocalUriIfExists(naat);
    const netInfo = await NetInfo.fetch();
    const isOffline = !netInfo.isConnected || netInfo.isInternetReachable === false;

    if (localUri) {
      return { uri: localUri, isOffline, isLocal: true, probeOk: true };
    }

    if (isOffline) {
      throw new Error('offline');
    }

    if (!naat.audio_url?.trim()) {
      throw new Error('no-audio');
    }

    const uri = normalizeAudioUrl(naat.audio_url);
    if (!isRemoteAudioUrl(uri)) {
      throw new Error('no-audio');
    }

    let probeOk = true;
    try {
      await probeRemoteAudio(uri);
    } catch (error) {
      probeOk = false;
      if (__DEV__) {
        console.log('[NaatPlayer] Remote audio probe failed:', getErrorMessage(error));
      }
    }

    return { uri, isOffline, isLocal: false, probeOk };
  }, [getLocalUriIfExists]);

  const buildQueueTracks = useCallback(async (
    selectedNaat: Naat,
    queueItems: Naat[],
    selectedUri: string,
    isOffline: boolean,
  ): Promise<AddTrack[]> => {
    const sourceList = uniqueNaats(queueItems.length > 0 ? queueItems : [selectedNaat]);
    const tracks: AddTrack[] = [];
    const seen = new Set<string>();

    for (const item of sourceList) {
      if (!item.id || seen.has(item.id)) {
        continue;
      }

      let uri: string | null = null;

      if (item.id === selectedNaat.id) {
        uri = selectedUri;
      } else {
        const localUri = await getLocalUriIfExists(item);
        if (localUri) {
          uri = localUri;
        } else if (!isOffline && item.audio_url?.trim()) {
          uri = normalizeAudioUrl(item.audio_url);
        }
      }

      if (!uri) {
        continue;
      }

      tracks.push({
        id: item.id,
        url: uri,
        title: item.title_fa || item.title_ps || 'نعت',
        artist: item.reciter_name || undefined,
        duration: item.duration_seconds && item.duration_seconds > 0 ? item.duration_seconds : undefined,
        contentType: getAudioContentType(uri),
        mediaType: 'naat',
      });

      seen.add(item.id);
    }

    if (!seen.has(selectedNaat.id)) {
      tracks.unshift({
        id: selectedNaat.id,
        url: selectedUri,
        title: selectedNaat.title_fa || selectedNaat.title_ps || 'نعت',
        artist: selectedNaat.reciter_name || undefined,
        duration: selectedNaat.duration_seconds && selectedNaat.duration_seconds > 0
          ? selectedNaat.duration_seconds
          : undefined,
        contentType: getAudioContentType(selectedUri),
        mediaType: 'naat',
      });
    }

    return tracks;
  }, [getLocalUriIfExists]);

  const maybeAutoDownloadCompletedNaat = useCallback((
    naat: Naat | null,
    positionSeconds: number,
    durationSeconds: number,
  ) => {
    if (!naat) return false;

    const eligible = completionEligibleByNaatRef.current[naat.id] === true;
    completionEligibleByNaatRef.current[naat.id] = false;
    const knownDuration = Math.max(
      durationSeconds || 0,
      completionDurationByNaatRef.current[naat.id] || 0,
      naat.duration_seconds || 0,
    );
    if (!shouldAutoDownloadCompletedNaat({
      eligible,
      positionSeconds,
      durationSeconds: knownDuration,
    })) {
      return false;
    }

    if (!autoDownloadTriggeredRef.current.has(naat.id)) {
      autoDownloadTriggeredRef.current.add(naat.id);
      autoDownloadByIdRef.current(naat.id);
    }
    return true;
  }, []);

  useEffect(() => {
    if (!playerReady) return;
    syncPlayerSnapshot().catch(() => {});
  }, [playerReady, naats, syncPlayerSnapshot]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (status) => {
      if (status === 'active') {
        if (!playerReady) {
          ensurePlayerReady('app-active').catch(() => {});
          return;
        }
        syncPlayerSnapshot().catch(() => {});
      }
    });
    return () => subscription.remove();
  }, [ensurePlayerReady, playerReady, syncPlayerSnapshot]);

  // Keep context state synced when track changes from notification / lockscreen
  useEffect(() => {
    if (!playerReady) return;

    const activeTrackSub = TrackPlayer.addEventListener(Event.PlaybackActiveTrackChanged, async (event) => {
      const previousNaat = findNaatByTrack(event.lastTrack);
      const previousTrackDuration = Number((event.lastTrack as { duration?: number } | undefined)?.duration) || 0;
      if (previousNaat) {
        completionDurationByNaatRef.current[previousNaat.id] = Math.max(
          completionDurationByNaatRef.current[previousNaat.id] || 0,
          previousTrackDuration,
          previousNaat.duration_seconds || 0,
        );
        maybeAutoDownloadCompletedNaat(
          previousNaat,
          event.lastPosition,
          completionDurationByNaatRef.current[previousNaat.id],
        );
      }

      const nextNaat = findNaatByTrack(event.track);
      if (nextNaat && completedNaatIdRef.current !== nextNaat.id) {
        completedNaatIdRef.current = null;
      }
      currentNaatRef.current = nextNaat;
      lastSavedPosition.current = 0;
      lastProgressEventAtRef.current = 0;
      progressGenerationRef.current += 1;
      await syncPlayerSnapshot(event.track);
    });

    const playbackStateSub = TrackPlayer.addEventListener(Event.PlaybackState, (event) => {
      setPlayer((prev) => {
        const isPlaying = event.state === State.Playing;
        if (prev.isPlaying === isPlaying) return prev;
        return { ...prev, isPlaying };
      });
    });

    const playbackErrorSub = TrackPlayer.addEventListener(Event.PlaybackError, (event) => {
      if (currentNaatRef.current) {
        completionEligibleByNaatRef.current[currentNaatRef.current.id] = false;
      }
      if (__DEV__) {
        console.log('[NaatPlayer] Native playback error:', event);
      }
      setPlayer((prev) => (prev.isPlaying ? { ...prev, isPlaying: false } : prev));

      const now = Date.now();
      if (now - lastPlaybackErrorAt.current > 5000) {
        lastPlaybackErrorAt.current = now;
        Alert.alert(
          isPashto ? 'تېروتنه' : 'خطا',
          isPashto
            ? 'د نعت غږول ودرېدل. انټرنېټ یا غږیزه فایل وګورئ.'
            : 'پخش نعت قطع شد. لطفاً اتصال اینترنت یا فایل صوتی را بررسی کنید.',
        );
      }
    });

    const queueEndedSub = TrackPlayer.addEventListener(Event.PlaybackQueueEnded, (event) => {
      const finished = currentNaatRef.current;
      if (finished) {
        const activeTrackDuration = completionDurationByNaatRef.current[finished.id] || finished.duration_seconds || 0;
        maybeAutoDownloadCompletedNaat(finished, event.position, activeTrackDuration);
        completedNaatIdRef.current = finished.id;
        lastSavedPosition.current = 0;
        upsertLocalMeta(finished.id, { lastPositionMillis: 0 }).catch(() => {});
      }
      progressGenerationRef.current += 1;
      setPlayer((prev) => ({
        ...prev,
        isPlaying: false,
        positionMillis: 0,
      }));
    });

    return () => {
      activeTrackSub.remove();
      playbackStateSub.remove();
      playbackErrorSub.remove();
      queueEndedSub.remove();
    };
  }, [playerReady, findNaatByTrack, maybeAutoDownloadCompletedNaat, syncPlayerSnapshot]);

  // Remote notification / lock-screen controls (main app context)
  useEffect(() => {
    if (!playerReady) return;

    const subs = [
      TrackPlayer.addEventListener(Event.RemotePlay, () => {
        TrackPlayer.play().catch(() => {});
      }),
      TrackPlayer.addEventListener(Event.RemotePause, () => {
        TrackPlayer.pause().catch(() => {});
      }),
      TrackPlayer.addEventListener(Event.RemoteStop, () => {
        if (currentNaatRef.current) {
          completionEligibleByNaatRef.current[currentNaatRef.current.id] = false;
        }
        TrackPlayer.reset().catch(() => {});
      }),
      TrackPlayer.addEventListener(Event.RemoteSeek, (e) => {
        if (currentNaatRef.current) {
          completionEligibleByNaatRef.current[currentNaatRef.current.id] = false;
        }
        TrackPlayer.seekTo(e.position).catch(() => {});
      }),
      TrackPlayer.addEventListener(Event.RemoteNext, () => {
        if (currentNaatRef.current) {
          completionEligibleByNaatRef.current[currentNaatRef.current.id] = false;
        }
        TrackPlayer.skipToNext().catch(() => {});
      }),
      TrackPlayer.addEventListener(Event.RemoteJumpForward, () => {
        if (currentNaatRef.current) {
          completionEligibleByNaatRef.current[currentNaatRef.current.id] = false;
        }
      }),
      TrackPlayer.addEventListener(Event.RemoteJumpBackward, () => {
        if (currentNaatRef.current) {
          completionEligibleByNaatRef.current[currentNaatRef.current.id] = false;
        }
      }),
      TrackPlayer.addEventListener(Event.RemotePrevious, async () => {
        if (currentNaatRef.current) {
          completionEligibleByNaatRef.current[currentNaatRef.current.id] = false;
        }
        try {
          const progress = await TrackPlayer.getProgress();
          if (progress.position > 3) {
            await TrackPlayer.seekTo(0);
            return;
          }
          await TrackPlayer.skipToPrevious();
        } catch {
          TrackPlayer.seekTo(0).catch(() => {});
        }
      }),
    ];

    return () => {
      subs.forEach((sub) => sub.remove());
    };
  }, [playerReady, isPashto]);

  // Progress updates from native player (works in background too)
  useEffect(() => {
    if (!playerReady) return;

    const progressSub = TrackPlayer.addEventListener(Event.PlaybackProgressUpdated, (event) => {
      const resolvedNaat = currentNaatRef.current;
      if (!resolvedNaat) return;
      if (completedNaatIdRef.current === resolvedNaat.id) return;

      lastProgressEventAtRef.current = Date.now();
      progressGenerationRef.current += 1;
      const positionMillis = quantizeMillis(Math.floor(event.position * 1000));
      const durationMillis = event.duration > 0
        ? Math.floor(event.duration * 1000)
        : (resolvedNaat.duration_seconds ?? 0) * 1000;
      if (durationMillis > 0) {
        completionDurationByNaatRef.current[resolvedNaat.id] = Math.max(
          completionDurationByNaatRef.current[resolvedNaat.id] || 0,
          durationMillis / 1000,
        );
      }

      if (positionMillis - lastSavedPosition.current > 5000) {
        lastSavedPosition.current = positionMillis;
        upsertLocalMeta(resolvedNaat.id, { lastPositionMillis: positionMillis }).catch(() => {});
      }

      setPlayer((prev) => {
        const nextDuration = durationMillis || prev.durationMillis;
        if (
          prev.current?.id === resolvedNaat.id &&
          prev.positionMillis === positionMillis &&
          prev.durationMillis === nextDuration
        ) {
          return prev;
        }
        return {
          ...prev,
          current: resolvedNaat,
          positionMillis,
          durationMillis: nextDuration,
        };
      });
    });

    return () => {
      progressSub.remove();
    };
  }, [playerReady]);

  // Poll progress while a track is active
  useEffect(() => {
    if (!playerReady || !activeTrackId) {
      return;
    }

    const poll = async () => {
      try {
        if (AppState.currentState !== 'active') return;
        if (Date.now() - lastProgressEventAtRef.current < PROGRESS_EVENT_STALE_MS) return;
        const generationAtStart = progressGenerationRef.current;
        const activeTrack = await TrackPlayer.getActiveTrack();
        const resolvedNaat = findNaatByTrack(activeTrack) ?? currentNaatRef.current;
        if (!resolvedNaat) return;
        if (completedNaatIdRef.current === resolvedNaat.id) return;

        currentNaatRef.current = resolvedNaat;

        const [progress, state] = await Promise.all([
          TrackPlayer.getProgress(),
          TrackPlayer.getPlaybackState(),
        ]);

        // A native progress event or track change may have arrived while the
        // asynchronous snapshot was in flight. Never let that older poll
        // overwrite the newer position.
        if (generationAtStart !== progressGenerationRef.current ||
          Date.now() - lastProgressEventAtRef.current < PROGRESS_EVENT_STALE_MS) {
          return;
        }

        const positionMillis = quantizeMillis(Math.floor(progress.position * 1000));
        const durationMillis = progress.duration > 0
          ? Math.floor(progress.duration * 1000)
          : (resolvedNaat.duration_seconds ?? 0) * 1000;
        if (durationMillis > 0) {
          completionDurationByNaatRef.current[resolvedNaat.id] = Math.max(
            completionDurationByNaatRef.current[resolvedNaat.id] || 0,
            durationMillis / 1000,
          );
        }

        if (positionMillis - lastSavedPosition.current > 5000) {
          lastSavedPosition.current = positionMillis;
          upsertLocalMeta(resolvedNaat.id, { lastPositionMillis: positionMillis }).catch(() => {});
        }

        setPlayer((prev) => {
          const nextDuration = durationMillis || prev.durationMillis;
          const nextPlaying = state.state === State.Playing;
          if (
            prev.current?.id === resolvedNaat.id &&
            prev.isPlaying === nextPlaying &&
            prev.positionMillis === positionMillis &&
            prev.durationMillis === nextDuration
          ) {
            return prev;
          }
          return {
            ...prev,
            current: resolvedNaat,
            isPlaying: nextPlaying,
            positionMillis,
            durationMillis: nextDuration,
          };
        });

        if (durationMillis > 0 && !resolvedNaat.duration_seconds) {
          const seconds = Math.floor(durationMillis / 1000);
          await upsertLocalMeta(resolvedNaat.id, { duration_seconds: seconds });
          setNaats((prev) =>
            prev.map((item) => (item.id === resolvedNaat.id ? { ...item, duration_seconds: seconds } : item)),
          );
        }
      } catch {
        // Player may not be ready
      }
    };

    progressIntervalRef.current = setInterval(poll, TRACK_POLL_INTERVAL_MS);
    poll();

    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
    };
  }, [playerReady, activeTrackId, findNaatByTrack]);

  const createItem = useCallback(async (draft: NaatDraft) => {
    if (!isSupabaseConfigured()) {
      throw new Error('supabase-not-configured');
    }
    const supabase = getSupabaseClient();
    const payload = createDraftPayload(draft);
    const { error } = await supabase.from('naats').insert(payload);
    if (error) throw error;
    await refresh();
  }, [refresh]);

  const updateItem = useCallback(async (id: string, patch: Partial<Naat>) => {
    if (!isSupabaseConfigured()) {
      throw new Error('supabase-not-configured');
    }
    const supabase = getSupabaseClient();
    const { error } = await supabase.from('naats').update(patch).eq('id', id);
    if (error) throw error;
    await refresh();
  }, [refresh]);

  const removeItem = useCallback(async (id: string) => {
    if (!isSupabaseConfigured()) {
      throw new Error('supabase-not-configured');
    }
    const supabase = getSupabaseClient();
    const { error } = await supabase.from('naats').delete().eq('id', id);
    if (error) throw error;
    await deleteLocalMeta(id);
    await refresh();
  }, [refresh]);

  const playFromQueue = useCallback(async (
    items: Naat[],
    selectedId: string,
    source: NaatQueueSource,
  ) => {
    try {
      await ensurePlayerReady('play');

      const queueItems = uniqueNaats(items.length > 0 ? items : naatsRef.current);
      const selectedNaat =
        queueItems.find((item) => item.id === selectedId) ??
        naatsRef.current.find((item) => item.id === selectedId);

      if (!selectedNaat) {
        throw new Error('no-audio');
      }

      let audioSource = await resolveAudioSource(selectedNaat);

      if (!audioSource.isLocal && !audioSource.probeOk) {
        const cachedUri = await cacheNaatForPlayback(selectedNaat, audioSource.uri);
        audioSource = {
          uri: cachedUri,
          isOffline: audioSource.isOffline,
          isLocal: true,
          probeOk: true,
        };
      }

      let queueTracks = await buildQueueTracks(
        selectedNaat,
        queueItems,
        audioSource.uri,
        audioSource.isOffline,
      );
      let selectedIndex = queueTracks.findIndex((track) => String(track.id) === selectedNaat.id);

      if (!queueTracks.length || selectedIndex < 0) {
        throw new Error('no-audio');
      }

      // TrackPlayer owns one global rate. Quran changes it intentionally, but
      // Naat must always play at natural speed and must not inherit Quran's
      // persisted 1.25x/1.5x/2x setting.
      await TrackPlayer.setRate(1);

      // Selecting a Naat is an explicit replay action: always start at zero.
      // Pause/Resume uses the separate resume() path and keeps its position.
      completedNaatIdRef.current = null;
      currentNaatRef.current = null;
      lastSavedPosition.current = 0;
      progressGenerationRef.current += 1;
      await upsertLocalMeta(selectedNaat.id, { lastPositionMillis: 0 });
      const initialPositionMillis = 0;
      const initialPosition = 0;
      const queueIds = queueTracks.map((track) => String(track.id));
      completionEligibleByNaatRef.current = Object.fromEntries(queueIds.map((id) => [id, false]));
      completionDurationByNaatRef.current = {};
      for (const track of queueTracks) {
        const id = String(track.id);
        const matchingNaat = queueItems.find((item) => item.id === id) ?? selectedNaat;
        const trackDuration = Number((track as { duration?: number }).duration) || matchingNaat.duration_seconds || 0;
        if (trackDuration > 0) completionDurationByNaatRef.current[id] = trackDuration;
        autoDownloadTriggeredRef.current.delete(id);
      }

      try {
        await loadAndStartTrackQueue(queueTracks, selectedIndex, initialPosition, selectedNaat.id);
      } catch (firstError) {
        if (shouldRetryPlaybackStart(firstError)) {
          if (__DEV__) {
            console.log('[NaatPlayer] First playback start failed, retrying once:', getErrorMessage(firstError));
          }
          await ensurePlayerReady('play-retry');
          await loadAndStartTrackQueue(queueTracks, selectedIndex, initialPosition, selectedNaat.id);
        } else if (!audioSource.isLocal) {
          if (__DEV__) {
            console.log('[NaatPlayer] Stream did not start, caching selected track:', getErrorMessage(firstError));
          }
          const cachedUri = await cacheNaatForPlayback(selectedNaat, audioSource.uri);
          queueTracks = await buildQueueTracks(selectedNaat, queueItems, cachedUri, false);
          selectedIndex = queueTracks.findIndex((track) => String(track.id) === selectedNaat.id);
          if (!queueTracks.length || selectedIndex < 0) {
            throw new Error('no-audio');
          }
          await ensurePlayerReady('play-cache-retry');
          await loadAndStartTrackQueue(queueTracks, selectedIndex, initialPosition, selectedNaat.id);
          audioSource = {
            uri: cachedUri,
            isOffline: false,
            isLocal: true,
            probeOk: true,
          };
        } else {
          throw firstError;
        }
      }

      // Enable completion downloads only after the new queue has started. This
      // prevents the reset of a previously active track from looking like a
      // completed listen in the newly selected queue.
      for (const id of queueIds) completionEligibleByNaatRef.current[id] = true;
      currentNaatRef.current = selectedNaat;
      lastSavedPosition.current = initialPositionMillis;
      setSession(makeSession(queueIds, selectedNaat.id, source));
      setPlayer((prev) => {
        const nextPosition = quantizeMillis(initialPositionMillis);
        const nextDuration = (selectedNaat.duration_seconds ?? 0) * 1000;
        if (
          prev.current?.id === selectedNaat.id &&
          prev.isPlaying &&
          prev.positionMillis === nextPosition &&
          prev.durationMillis === nextDuration
        ) {
          return prev;
        }
        return {
          ...prev,
          current: selectedNaat,
          isPlaying: true,
          positionMillis: nextPosition,
          durationMillis: nextDuration,
        };
      });
    } catch (error: any) {
      if (error?.message === 'offline') {
        Alert.alert(isPashto ? 'بې‌انټرنېټه' : 'آفلاین', isPashto ? 'لومړی نعت ښکته کړئ.' : 'ابتدا دانلود نمایید');
        return;
      }
      if (error?.message === 'no-audio') {
        Alert.alert(isPashto ? 'تېروتنه' : 'خطا', isPashto ? 'د غږیز فایل لینک ونه موندل شو.' : 'لینک صوتی یافت نشد. لطفاً در مدیریت اضافه کنید.');
        return;
      }
      if (__DEV__) {
        console.log('[NaatPlayer] Playback unavailable:', getErrorMessage(error));
      }
      Alert.alert(
        isPashto ? 'تېروتنه' : 'خطا',
        isPashto
          ? 'د نعت غږول پیل نه شول. انټرنېټ یا غږیزه فایل وګورئ.'
          : 'پخش نعت شروع نشد. لطفاً اتصال اینترنت یا فایل صوتی را بررسی کنید.',
      );
    }
  }, [ensurePlayerReady, resolveAudioSource, cacheNaatForPlayback, buildQueueTracks, isPashto]);

  const play = useCallback(async (naat: Naat) => {
    const sourceList = naatsRef.current.length > 0 ? naatsRef.current : [naat];
    await playFromQueue(sourceList, naat.id, 'catalog');
  }, [playFromQueue]);

  const pause = useCallback(async () => {
    try {
      await ensurePlayerReady('pause');
      await TrackPlayer.pause();
      setPlayer((prev) => (prev.isPlaying ? { ...prev, isPlaying: false } : prev));
    } catch (err) {
      if (__DEV__) console.log('TrackPlayer pause:', err);
      setPlayer((prev) => (prev.isPlaying ? { ...prev, isPlaying: false } : prev));
    }
  }, [ensurePlayerReady]);

  const resume = useCallback(async () => {
    try {
      await ensurePlayerReady('resume');
      const progress = await TrackPlayer.getProgress();
      const duration = (currentNaatRef.current?.duration_seconds ?? 0) * 1000;
      const isCompleted = completedNaatIdRef.current === currentNaatRef.current?.id;
      if (isCompleted || (duration > 0 && progress.position * 1000 >= duration - RESUME_TAIL_RESET_MS)) {
        await TrackPlayer.seekTo(0);
        if (currentNaatRef.current) {
          completedNaatIdRef.current = null;
          lastSavedPosition.current = 0;
          await upsertLocalMeta(currentNaatRef.current.id, { lastPositionMillis: 0 });
        }
      }
      await TrackPlayer.play();
      setPlayer((prev) => (prev.isPlaying ? prev : { ...prev, isPlaying: true }));
    } catch {
      // Ignore
    }
  }, [ensurePlayerReady]);

  const togglePlayPause = useCallback(async () => {
    if (player.isPlaying) {
      await pause();
      return;
    }
    await resume();
  }, [pause, player.isPlaying, resume]);

  const skipNext = useCallback(async () => {
    try {
      if (!sessionRef.current.canSkipNext) return;
      if (currentNaatRef.current) {
        completionEligibleByNaatRef.current[currentNaatRef.current.id] = false;
      }
      await ensurePlayerReady('skip-next');
      await TrackPlayer.skipToNext();
      await TrackPlayer.play();
      await syncPlayerSnapshot();
    } catch (err) {
      if (__DEV__) console.log('TrackPlayer skip next:', err);
    }
  }, [ensurePlayerReady, syncPlayerSnapshot]);

  const skipPrevious = useCallback(async () => {
    try {
      await ensurePlayerReady('skip-previous');
      if (currentNaatRef.current) {
        completionEligibleByNaatRef.current[currentNaatRef.current.id] = false;
      }
      const progress = await TrackPlayer.getProgress();
      if (progress.position > 3 || !sessionRef.current.canSkipPrevious) {
        await TrackPlayer.seekTo(0);
      } else {
        await TrackPlayer.skipToPrevious();
      }
      await TrackPlayer.play();
      await syncPlayerSnapshot();
    } catch (err) {
      try {
        await TrackPlayer.seekTo(0);
      } catch {
        // ignore fallback failure
      }
      if (__DEV__) console.log('TrackPlayer skip previous:', err);
    }
  }, [ensurePlayerReady, syncPlayerSnapshot]);

  const stop = useCallback(async () => {
    if (currentNaatRef.current) {
      completionEligibleByNaatRef.current[currentNaatRef.current.id] = false;
    }
    try {
      await ensurePlayerReady('stop');
      await TrackPlayer.reset();
    } catch (err) {
      if (__DEV__) console.log('TrackPlayer reset:', err);
    }
    currentNaatRef.current = null;
    setSession(EMPTY_SESSION);
    setPlayer({ current: null, isPlaying: false, positionMillis: 0, durationMillis: 0 });
  }, [ensurePlayerReady]);

  const seek = useCallback((millis: number) => {
    if (currentNaatRef.current) {
      completionEligibleByNaatRef.current[currentNaatRef.current.id] = false;
    }
    const dur = player.durationMillis || 0;
    const clamped = dur > 0 ? Math.max(0, Math.min(millis, dur)) : Math.max(0, millis);
    const quantized = quantizeMillis(clamped);
    setPlayer((prev) => (prev.positionMillis === quantized ? prev : { ...prev, positionMillis: quantized }));
    ensurePlayerReady('seek')
      .then(() => TrackPlayer.seekTo(clamped / 1000))
      .catch(() => {});
  }, [ensurePlayerReady, player.durationMillis]);

  const download = useCallback(async (naat: Naat, options?: { silent?: boolean }) => {
    const silent = options?.silent === true;
    const existingTask = downloadTasksRef.current.get(naat.id);
    if (existingTask) {
      await existingTask;
      return;
    }

    let releaseTask!: () => void;
    const task = new Promise<void>((resolve) => {
      releaseTask = resolve;
    });
    downloadTasksRef.current.set(naat.id, task);

    try {
      const existingUri = await getLocalUriIfExists(naat);
      if (existingUri) {
        const info = await FileSystem.getInfoAsync(existingUri);
        const sizeMb = info.exists && info.size ? Number((info.size / (1024 * 1024)).toFixed(2)) : undefined;
        await upsertLocalMeta(naat.id, {
          localFileUri: existingUri,
          isDownloaded: true,
          downloadProgress: undefined,
          file_size_mb: sizeMb,
        });
        setNaats((prev) => prev.map((item) => item.id === naat.id
          ? { ...item, localFileUri: existingUri, isDownloaded: true, downloadProgress: undefined, file_size_mb: sizeMb }
          : item));
        if (!silent) {
          Alert.alert(isPashto ? 'خبرتیا' : 'اطلاع', isPashto ? 'دا نعت مخکې ښکته شوی دی.' : 'این نعت قبلاً دانلود شده است');
        }
        return;
      }

      await ensureNaatDirectory();
      const source = await resolveAudioSource(naat);
      const dir = getNaatDirectory();
      const cleanUrl = naat.audio_url.trim().split('?')[0];
      const extension = cleanUrl.endsWith('.m4a') ? 'm4a' : 'mp3';
      const target = `${dir}${naat.id}.${extension}`;
      await upsertLocalMeta(naat.id, { downloadProgress: 0 });
      setNaats((prev) => prev.map((item) => item.id === naat.id ? { ...item, downloadProgress: 0 } : item));

      const resumable = FileSystem.createDownloadResumable(
        source.uri,
        target,
        {},
        (progress) => {
          const pct = progress.totalBytesExpectedToWrite
            ? progress.totalBytesWritten / progress.totalBytesExpectedToWrite
            : 0;
          const now = Date.now();
          const lastTick = downloadProgressTickRef.current[naat.id] ?? 0;
          if (now - lastTick < DOWNLOAD_PROGRESS_THROTTLE_MS && pct < 0.99) return;
          downloadProgressTickRef.current[naat.id] = now;
          upsertLocalMeta(naat.id, { downloadProgress: pct }).catch(() => {});
          setNaats((prev) => prev.map((item) => item.id === naat.id ? { ...item, downloadProgress: pct } : item));
        },
      );

      let result;
      try {
        result = await resumable.downloadAsync();
      } catch {
        result = await FileSystem.downloadAsync(source.uri, target);
      }
      if (!result?.uri) throw new Error('download-empty');
      if (result.status && result.status >= 400) throw new Error(`download-status-${result.status}`);

      const info = await FileSystem.getInfoAsync(result.uri);
      if (!info.exists || !info.size) throw new Error('download-empty-file');
      const sizeMb = Number((info.size / (1024 * 1024)).toFixed(2));
      await upsertLocalMeta(naat.id, {
        localFileUri: result.uri,
        isDownloaded: true,
        downloadProgress: undefined,
        file_size_mb: sizeMb,
      });
      setNaats((prev) => prev.map((item) => item.id === naat.id
        ? { ...item, localFileUri: result.uri, isDownloaded: true, downloadProgress: undefined, file_size_mb: sizeMb }
        : item));
      delete downloadProgressTickRef.current[naat.id];
      if (!silent) {
        Alert.alert(isPashto ? 'بریالی' : 'موفق', isPashto ? 'نعت وساتل شو او بې‌انټرنېټه غږېدای شي.' : 'نعت ذخیره شد و آفلاین قابل پخش است');
      }
    } catch (error: any) {
      if (__DEV__) console.log('Naat download failed', error);
      delete downloadProgressTickRef.current[naat.id];
      await upsertLocalMeta(naat.id, { downloadProgress: undefined }).catch(() => {});
      setNaats((prev) => prev.map((item) => item.id === naat.id ? { ...item, downloadProgress: undefined } : item));
      if (silent) return;
      if (error?.message === 'offline') {
        Alert.alert(isPashto ? 'بې‌انټرنېټه' : 'آفلاین', isPashto ? 'لومړی نعت ښکته کړئ.' : 'ابتدا دانلود نمایید');
        return;
      }
      if (error?.message === 'no-audio') {
        Alert.alert(isPashto ? 'تېروتنه' : 'خطا', isPashto ? 'د غږیز فایل لینک ونه موندل شو.' : 'لینک صوتی یافت نشد. لطفاً در مدیریت اضافه کنید.');
        return;
      }
      Alert.alert(
        isPashto ? 'تېروتنه' : 'خطا',
        isPashto
          ? 'ښکته کول بریالي نه شول. د عام فایل لینک وګورئ.'
          : 'دانلود ناموفق است. لطفاً مطمئن شوید لینک فایل عمومی است.',
      );
    } finally {
      if (downloadTasksRef.current.get(naat.id) === task) downloadTasksRef.current.delete(naat.id);
      releaseTask();
    }
  }, [getLocalUriIfExists, resolveAudioSource, isPashto]);

  autoDownloadByIdRef.current = (id) => {
    const naat = naatsRef.current.find((item) => item.id === id);
    if (!naat) return;
    // `download` verifies that the local file still exists before skipping.
    // Do not trust stale catalogue metadata here: it can outlive a removed file.
    void download(naat, { silent: true });
  };

  const catalogValue = useMemo<NaatCatalogContextValue>(() => ({
    naats,
    loading,
    syncError,
    syncSource,
    refresh,
    createItem,
    updateItem,
    removeItem,
    download,
  }), [naats, loading, syncError, syncSource, refresh, createItem, updateItem, removeItem, download]);

  const playbackValue = useMemo<NaatPlaybackContextValue>(() => ({
    player,
    session,
    ensurePlayerReady,
    play,
    playFromQueue,
    togglePlayPause,
    skipNext,
    skipPrevious,
    pause,
    resume,
    stop,
    seek,
  }), [player, session, ensurePlayerReady, play, playFromQueue, togglePlayPause, skipNext, skipPrevious, pause, resume, stop, seek]);

  return (
    <NaatCatalogContext.Provider value={catalogValue}>
      <NaatPlaybackContext.Provider value={playbackValue}>{children}</NaatPlaybackContext.Provider>
    </NaatCatalogContext.Provider>
  );
}
