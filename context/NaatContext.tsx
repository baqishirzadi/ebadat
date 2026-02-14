import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Alert } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import * as FileSystem from 'expo-file-system/legacy';
import { Audio } from 'expo-av';
import TrackPlayer, { AppKilledPlaybackBehavior, Capability } from 'react-native-track-player';
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

type PlayerState = {
  current: Naat | null;
  isPlaying: boolean;
  positionMillis: number;
  durationMillis: number;
};

type NaatContextValue = {
  naats: Naat[];
  loading: boolean;
  player: PlayerState;
  refresh: () => Promise<void>;
  createItem: (draft: NaatDraft) => Promise<void>;
  updateItem: (id: string, patch: Partial<Naat>) => Promise<void>;
  removeItem: (id: string) => Promise<void>;
  play: (naat: Naat) => Promise<void>;
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

let playerSetup = false;

export function NaatProvider({ children }: { children: React.ReactNode }) {
  const [naats, setNaats] = useState<Naat[]>([]);
  const [loading, setLoading] = useState(true);
  const [player, setPlayer] = useState<PlayerState>({
    current: null,
    isPlaying: false,
    positionMillis: 0,
    durationMillis: 0,
  });

  const currentNaatRef = useRef<Naat | null>(null);
  const lastSavedPosition = useRef<number>(0);
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    await ensureNaatDirectory();
    await verifyDownloads();
    const cachedCatalog = await loadCatalog();
    const localMeta = await loadLocalMeta();
    let catalog = cachedCatalog;
    if (isSupabaseConfigured()) {
      try {
        const supabase = getSupabaseClient();
        const { data, error } = await supabase
          .from('naats')
          .select('*')
          .order('created_at', { ascending: false });
        if (!error && data) {
          catalog = data as Naat[];
          await saveCatalog(catalog);
        }
      } catch {
        // keep cached
      }
    }
    const merged = mergeCatalogWithLocal(catalog, localMeta);
    setNaats(merged);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh().catch(() => setLoading(false));
  }, [refresh]);

  // Setup TrackPlayer once
  useEffect(() => {
    if (playerSetup) return;
    playerSetup = true;
    (async () => {
      try {
        await TrackPlayer.setupPlayer({
          autoHandleInterruptions: true,
          autoUpdateMetadata: true,
        });
        await TrackPlayer.updateOptions({
          capabilities: [
            Capability.Play,
            Capability.Pause,
            Capability.Stop,
            Capability.SeekTo,
            Capability.JumpForward,
            Capability.JumpBackward,
          ],
          compactCapabilities: [
            Capability.Play,
            Capability.Pause,
            Capability.SeekTo,
          ],
          progressUpdateEventInterval: 1,
          forwardJumpInterval: 15,
          backwardJumpInterval: 15,
          android: {
            appKilledPlaybackBehavior: AppKilledPlaybackBehavior.StopPlaybackAndRemoveNotification,
          },
        });
      } catch (err) {
        if (__DEV__) console.warn('TrackPlayer setup:', err);
        playerSetup = false;
      }
    })();
    return () => {
      // Don't destroy - playback service keeps running
    };
  }, []);

  // Poll progress when playing
  useEffect(() => {
    const poll = async () => {
      try {
        const progress = await TrackPlayer.getProgress();
        const state = await TrackPlayer.getPlaybackState();
        const activeTrack = await TrackPlayer.getActiveTrack();
        const naat = currentNaatRef.current;
        if (!naat || activeTrack?.id !== naat.id) return;

        const positionMillis = Math.floor(progress.position * 1000);
        const durationMillis = progress.duration > 0 ? Math.floor(progress.duration * 1000) : 0;

        if (positionMillis - lastSavedPosition.current > 5000) {
          lastSavedPosition.current = positionMillis;
          upsertLocalMeta(naat.id, { lastPositionMillis: positionMillis }).catch(() => {});
        }

        setPlayer((prev) => ({
          ...prev,
          current: naat,
          isPlaying: state.state === 'playing',
          positionMillis,
          durationMillis: durationMillis || prev.durationMillis,
        }));

        if (durationMillis > 0 && !naat.duration_seconds) {
          const seconds = Math.floor(durationMillis / 1000);
          await upsertLocalMeta(naat.id, { duration_seconds: seconds });
          setNaats((prev) =>
            prev.map((item) => (item.id === naat.id ? { ...item, duration_seconds: seconds } : item)),
          );
        }
      } catch {
        // Player may not be ready
      }
    };

    if (currentNaatRef.current) {
      progressIntervalRef.current = setInterval(poll, 250);
      poll();
    }
    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
    };
  }, [player.current?.id]);

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

  const resolveAudioSource = useCallback(async (naat: Naat): Promise<{ uri: string }> => {
    if (naat.localFileUri) {
      const info = await FileSystem.getInfoAsync(naat.localFileUri);
      if (info.exists) {
        return { uri: naat.localFileUri };
      }
    }

    const netInfo = await NetInfo.fetch();
    const isOffline = !netInfo.isConnected || netInfo.isInternetReachable === false;
    if (isOffline) {
      throw new Error('offline');
    }

    if (!naat.audio_url) {
      throw new Error('no-audio');
    }
    const trimmed = naat.audio_url.trim();
    const safeUrl = trimmed.includes(' ') ? encodeURI(trimmed) : trimmed;
    return { uri: safeUrl };
  }, []);

  const play = useCallback(async (naat: Naat) => {
    try {
      const source = await resolveAudioSource(naat);
      const currentId = currentNaatRef.current?.id;

      if (currentId && currentId !== naat.id) {
        await TrackPlayer.reset();
      }

      const initialPosition = (naat.lastPositionMillis ?? 0) / 1000;
      const track = {
        id: naat.id,
        url: source.uri,
        title: naat.title_fa,
        artist: naat.reciter_name,
        duration: naat.duration_seconds ?? 0,
      };

      await TrackPlayer.load(track);
      if (initialPosition > 0) {
        await TrackPlayer.seekTo(initialPosition);
      }
      await TrackPlayer.play();

      currentNaatRef.current = naat;
      lastSavedPosition.current = naat.lastPositionMillis ?? 0;
      setPlayer((prev) => ({
        ...prev,
        current: naat,
        isPlaying: true,
        positionMillis: naat.lastPositionMillis ?? 0,
        durationMillis: (naat.duration_seconds ?? 0) * 1000,
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
      Alert.alert('خطا', 'پخش نعت ممکن نیست');
    }
  }, [resolveAudioSource]);

  const pause = useCallback(async () => {
    try {
      await TrackPlayer.pause();
      setPlayer((prev) => ({ ...prev, isPlaying: false }));
    } catch (err) {
      if (__DEV__) console.warn('TrackPlayer pause:', err);
      setPlayer((prev) => ({ ...prev, isPlaying: false }));
    }
  }, []);

  const resume = useCallback(async () => {
    try {
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
  }, []);

  const stop = useCallback(async () => {
    try {
      await TrackPlayer.reset();
    } catch (err) {
      if (__DEV__) console.warn('TrackPlayer reset:', err);
    }
    currentNaatRef.current = null;
    setPlayer({ current: null, isPlaying: false, positionMillis: 0, durationMillis: 0 });
  }, []);

  const seek = useCallback((millis: number) => {
    const dur = player.durationMillis || 0;
    const clamped = dur > 0 ? Math.max(0, Math.min(millis, dur)) : Math.max(0, millis);
    setPlayer((prev) => ({ ...prev, positionMillis: clamped }));
    TrackPlayer.seekTo(clamped / 1000).catch(() => {});
  }, [player.durationMillis]);

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
      let durationSeconds: number | undefined;
      try {
        const { sound, status } = await Audio.Sound.createAsync(
          { uri: result?.uri ?? target },
          { shouldPlay: false },
        );
        if (status.isLoaded && status.durationMillis) {
          durationSeconds = Math.floor(status.durationMillis / 1000);
        }
        await sound.unloadAsync();
      } catch {
        // ignore duration probe failure
      }
      await upsertLocalMeta(naat.id, {
        localFileUri: result?.uri ?? target,
        isDownloaded: true,
        downloadProgress: undefined,
        file_size_mb: sizeMb,
        duration_seconds: durationSeconds,
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
                duration_seconds: durationSeconds ?? item.duration_seconds,
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
    player,
    refresh,
    createItem,
    updateItem,
    removeItem,
    play,
    pause,
    resume,
    stop,
    seek,
    download,
  }), [naats, loading, player, refresh, createItem, updateItem, removeItem, play, pause, resume, stop, seek, download]);

  return <NaatContext.Provider value={value}>{children}</NaatContext.Provider>;
}
