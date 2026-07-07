import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, AppState, InteractionManager } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import * as FileSystem from 'expo-file-system/legacy';
import TrackPlayer, { Event, State, type AddTrack } from 'react-native-track-player';
import { useStartupPhase } from '@/context/StartupPhaseContext';
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

type NaatContextValue = {
  naats: Naat[];
  loading: boolean;
  syncError: string | null;
  syncSource: 'supabase' | 'cache' | 'fallback';
  player: PlayerState;
  session: NaatSessionState;
  ensurePlayerReady: (reason?: string) => Promise<void>;
  refresh: () => Promise<void>;
  createItem: (draft: NaatDraft) => Promise<void>;
  updateItem: (id: string, patch: Partial<Naat>) => Promise<void>;
  removeItem: (id: string) => Promise<void>;
  play: (naat: Naat) => Promise<void>;
  playFromQueue: (items: Naat[], selectedId: string, source: NaatQueueSource) => Promise<void>;
  togglePlayPause: () => Promise<void>;
  skipNext: () => Promise<void>;
  skipPrevious: () => Promise<void>;
  pause: () => Promise<void>;
  resume: () => Promise<void>;
  stop: () => Promise<void>;
  seek: (millis: number) => void;
  download: (naat: Naat) => Promise<void>;
};

const NaatContext = createContext<NaatContextValue | null>(null);

export function useNaat() {
  const ctx = useContext(NaatContext);
  if (!ctx) {
    throw new Error('useNaat must be used within NaatProvider');
  }
  return ctx;
}

const TRACK_POLL_INTERVAL_MS = 250;
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
  await TrackPlayer.skip(selectedIndex, initialPosition > 0 ? initialPosition : undefined);
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

export function NaatProvider({ children }: { children: React.ReactNode }) {
  const { isInteractiveReady } = useStartupPhase();
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
  const lastPlaybackErrorAt = useRef<number>(0);
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

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
          const reason =
            remoteError instanceof Error ? remoteError.message : 'remote-unknown-error';
          errorMessage = `همگام‌سازی نعت انجام نشد (${reason}).`;
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
    if (!isInteractiveReady) {
      return;
    }

    let cancelled = false;
    const task = InteractionManager.runAfterInteractions(() => {
      if (!cancelled) {
        refresh({ skipVerify: true }).catch(() => setLoading(false));
      }
    });

    return () => {
      cancelled = true;
      task.cancel();
    };
  }, [isInteractiveReady, refresh]);

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
        setPlayer((prev) => ({
          ...prev,
          current: null,
          isPlaying: false,
          positionMillis: 0,
          durationMillis: 0,
        }));
        setSession(EMPTY_SESSION);
        return;
      }

      currentNaatRef.current = activeNaat;
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

      const positionMillis = Math.floor(progress.position * 1000);
      const durationMillis = progress.duration > 0
        ? Math.floor(progress.duration * 1000)
        : (activeNaat.duration_seconds ?? 0) * 1000;

      setPlayer((prev) => ({
        ...prev,
        current: activeNaat,
        isPlaying: playbackState.state === State.Playing,
        positionMillis,
        durationMillis: durationMillis || prev.durationMillis,
      }));
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
      const nextNaat = findNaatByTrack(event.track);
      currentNaatRef.current = nextNaat;
      lastSavedPosition.current = 0;
      await syncPlayerSnapshot(event.track);
    });

    const playbackStateSub = TrackPlayer.addEventListener(Event.PlaybackState, (event) => {
      setPlayer((prev) => ({
        ...prev,
        isPlaying: event.state === State.Playing,
      }));
    });

    const playbackErrorSub = TrackPlayer.addEventListener(Event.PlaybackError, (event) => {
      if (__DEV__) {
        console.log('[NaatPlayer] Native playback error:', event);
      }
      setPlayer((prev) => ({
        ...prev,
        isPlaying: false,
      }));

      const now = Date.now();
      if (now - lastPlaybackErrorAt.current > 5000) {
        lastPlaybackErrorAt.current = now;
        Alert.alert('خطا', 'پخش نعت قطع شد. لطفاً اتصال اینترنت یا فایل صوتی را بررسی کنید.');
      }
    });

    return () => {
      activeTrackSub.remove();
      playbackStateSub.remove();
      playbackErrorSub.remove();
    };
  }, [playerReady, findNaatByTrack, syncPlayerSnapshot]);

  // Poll progress while a track is active
  useEffect(() => {
    if (!playerReady || !activeTrackId) {
      return;
    }

    const poll = async () => {
      try {
        const activeTrack = await TrackPlayer.getActiveTrack();
        const resolvedNaat = findNaatByTrack(activeTrack) ?? currentNaatRef.current;
        if (!resolvedNaat) return;

        currentNaatRef.current = resolvedNaat;

        const progress = await TrackPlayer.getProgress();
        const state = await TrackPlayer.getPlaybackState();

        const positionMillis = Math.floor(progress.position * 1000);
        const durationMillis = progress.duration > 0
          ? Math.floor(progress.duration * 1000)
          : (resolvedNaat.duration_seconds ?? 0) * 1000;

        if (positionMillis - lastSavedPosition.current > 5000) {
          lastSavedPosition.current = positionMillis;
          upsertLocalMeta(resolvedNaat.id, { lastPositionMillis: positionMillis }).catch(() => {});
        }

        setPlayer((prev) => ({
          ...prev,
          current: resolvedNaat,
          isPlaying: state.state === State.Playing,
          positionMillis,
          durationMillis: durationMillis || prev.durationMillis,
        }));

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

      const initialPosition = Math.max(0, (selectedNaat.lastPositionMillis ?? 0) / 1000);
      const queueIds = queueTracks.map((track) => String(track.id));

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

      currentNaatRef.current = selectedNaat;
      lastSavedPosition.current = selectedNaat.lastPositionMillis ?? 0;
      setSession(makeSession(queueIds, selectedNaat.id, source));
      setPlayer((prev) => ({
        ...prev,
        current: selectedNaat,
        isPlaying: true,
        positionMillis: selectedNaat.lastPositionMillis ?? 0,
        durationMillis: (selectedNaat.duration_seconds ?? 0) * 1000,
      }));
    } catch (error: any) {
      if (error?.message === 'offline') {
        Alert.alert('آفلاین', 'ابتدا دانلود نمایید');
        return;
      }
      if (error?.message === 'no-audio') {
        Alert.alert('خطا', 'لینک صوتی یافت نشد. لطفاً در مدیریت اضافه کنید.');
        return;
      }
      if (__DEV__) {
        console.log('[NaatPlayer] Playback unavailable:', getErrorMessage(error));
      }
      Alert.alert('خطا', 'پخش نعت شروع نشد. لطفاً اتصال اینترنت یا فایل صوتی را بررسی کنید.');
    }
  }, [ensurePlayerReady, resolveAudioSource, cacheNaatForPlayback, buildQueueTracks]);

  const play = useCallback(async (naat: Naat) => {
    const sourceList = naatsRef.current.length > 0 ? naatsRef.current : [naat];
    await playFromQueue(sourceList, naat.id, 'catalog');
  }, [playFromQueue]);

  const pause = useCallback(async () => {
    try {
      await ensurePlayerReady('pause');
      await TrackPlayer.pause();
      setPlayer((prev) => ({ ...prev, isPlaying: false }));
    } catch (err) {
      if (__DEV__) console.log('TrackPlayer pause:', err);
      setPlayer((prev) => ({ ...prev, isPlaying: false }));
    }
  }, [ensurePlayerReady]);

  const resume = useCallback(async () => {
    try {
      await ensurePlayerReady('resume');
      const progress = await TrackPlayer.getProgress();
      const duration = (currentNaatRef.current?.duration_seconds ?? 0) * 1000;
      if (duration > 0 && progress.position * 1000 >= duration - 500) {
        await TrackPlayer.seekTo(0);
      }
      await TrackPlayer.play();
      setPlayer((prev) => ({ ...prev, isPlaying: true }));
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
    const dur = player.durationMillis || 0;
    const clamped = dur > 0 ? Math.max(0, Math.min(millis, dur)) : Math.max(0, millis);
    setPlayer((prev) => ({ ...prev, positionMillis: clamped }));
    ensurePlayerReady('seek')
      .then(() => TrackPlayer.seekTo(clamped / 1000))
      .catch(() => {});
  }, [ensurePlayerReady, player.durationMillis]);

  const download = useCallback(async (naat: Naat) => {
    try {
      if (naat.isDownloaded && naat.localFileUri) {
        Alert.alert('اطلاع', 'این نعت قبلاً دانلود شده است');
        return;
      }
      await ensureNaatDirectory();
      const source = await resolveAudioSource(naat);
      const dir = getNaatDirectory();
      const cleanUrl = naat.audio_url.trim().split('?')[0];
      const extension = cleanUrl.endsWith('.m4a') ? 'm4a' : 'mp3';
      const target = `${dir}${naat.id}.${extension}`;
      await upsertLocalMeta(naat.id, { downloadProgress: 0 });
      setNaats((prev) =>
        prev.map((item) => (item.id === naat.id ? { ...item, downloadProgress: 0 } : item)),
      );
      const resumable = FileSystem.createDownloadResumable(
        source.uri,
        target,
        {},
        (progress) => {
          const pct = progress.totalBytesExpectedToWrite
            ? progress.totalBytesWritten / progress.totalBytesExpectedToWrite
            : 0;
          upsertLocalMeta(naat.id, { downloadProgress: pct }).catch(() => {});
          setNaats((prev) =>
            prev.map((item) => (item.id === naat.id ? { ...item, downloadProgress: pct } : item)),
          );
        },
      );
      let result;
      try {
        result = await resumable.downloadAsync();
      } catch {
        result = await FileSystem.downloadAsync(source.uri, target);
      }
      if (!result?.uri) {
        throw new Error('download-empty');
      }
      if (result?.status && result.status >= 400) {
        throw new Error(`download-status-${result.status}`);
      }
      const info = await FileSystem.getInfoAsync(result?.uri ?? target);
      const sizeMb = info.exists && info.size ? Number((info.size / (1024 * 1024)).toFixed(2)) : undefined;
      await upsertLocalMeta(naat.id, {
        localFileUri: result?.uri ?? target,
        isDownloaded: true,
        downloadProgress: undefined,
        file_size_mb: sizeMb,
      });
      setNaats((prev) =>
        prev.map((item) =>
          item.id === naat.id
            ? {
                ...item,
                localFileUri: result?.uri ?? target,
                isDownloaded: true,
                downloadProgress: undefined,
                file_size_mb: sizeMb,
              }
            : item,
        ),
      );
      Alert.alert('موفق', 'نعت ذخیره شد و آفلاین قابل پخش است');
    } catch (error: any) {
      if (error?.message === 'offline') {
        Alert.alert('آفلاین', 'ابتدا دانلود نمایید');
        return;
      }
      if (error?.message === 'no-audio') {
        Alert.alert('خطا', 'لینک صوتی یافت نشد. لطفاً در مدیریت اضافه کنید.');
        return;
      }
      if (__DEV__) {
        console.log('Naat download failed', error);
      }
      await upsertLocalMeta(naat.id, { downloadProgress: undefined });
      Alert.alert('خطا', 'دانلود ناموفق است. لطفاً مطمئن شوید لینک فایل عمومی است.');
    }
  }, [resolveAudioSource]);

  const value = useMemo<NaatContextValue>(() => ({
    naats,
    loading,
    syncError,
    syncSource,
    player,
    session,
    ensurePlayerReady,
    refresh,
    createItem,
    updateItem,
    removeItem,
    play,
    playFromQueue,
    togglePlayPause,
    skipNext,
    skipPrevious,
    pause,
    resume,
    stop,
    seek,
    download,
  }), [naats, loading, syncError, syncSource, player, session, ensurePlayerReady, refresh, createItem, updateItem, removeItem, play, playFromQueue, togglePlayPause, skipNext, skipPrevious, pause, resume, stop, seek, download]);

  return <NaatContext.Provider value={value}>{children}</NaatContext.Provider>;
}
