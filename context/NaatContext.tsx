import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Alert } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import * as FileSystem from 'expo-file-system';
import { Audio } from 'expo-av';
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
import { configureNaatAudioMode } from '@/utils/naatAudio';
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
  seek: (millis: number) => Promise<void>;
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

export function NaatProvider({ children }: { children: React.ReactNode }) {
  const [naats, setNaats] = useState<Naat[]>([]);
  const [loading, setLoading] = useState(true);
  const [player, setPlayer] = useState<PlayerState>({
    current: null,
    isPlaying: false,
    positionMillis: 0,
    durationMillis: 0,
  });

  const soundRef = useRef<Audio.Sound | null>(null);
  const lastSavedPosition = useRef<number>(0);

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
    configureNaatAudioMode().catch(() => {
      // Ignore audio mode errors
    });
  }, [refresh]);

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
      const currentId = player.current?.id;

      if (soundRef.current && currentId && currentId !== naat.id) {
        await soundRef.current.unloadAsync();
        soundRef.current = null;
        setPlayer((prev) => ({ ...prev, positionMillis: 0, durationMillis: 0 }));
      }

      if (!soundRef.current) {
        const { sound, status } = await Audio.Sound.createAsync(
          { uri: source.uri },
          { shouldPlay: true, positionMillis: naat.lastPositionMillis ?? 0 },
        );
        sound.setOnPlaybackStatusUpdate((status) => {
          if (!status.isLoaded) return;
          if (status.positionMillis && status.positionMillis - lastSavedPosition.current > 5000) {
            lastSavedPosition.current = status.positionMillis;
            upsertLocalMeta(naat.id, { lastPositionMillis: status.positionMillis }).catch(() => {});
          }
          setPlayer((prev) => ({
            ...prev,
            isPlaying: status.isPlaying ?? false,
            positionMillis: status.positionMillis ?? 0,
            durationMillis: status.durationMillis ?? prev.durationMillis,
          }));
        });
        soundRef.current = sound;
        if (status?.isLoaded && status.durationMillis && status.durationMillis > 0) {
          const seconds = Math.floor(status.durationMillis / 1000);
          setPlayer((prev) => ({ ...prev, durationMillis: status.durationMillis ?? prev.durationMillis }));
          await upsertLocalMeta(naat.id, { duration_seconds: seconds });
          setNaats((prev) =>
            prev.map((item) => (item.id === naat.id ? { ...item, duration_seconds: seconds } : item)),
          );
        }
      } else {
        await soundRef.current.playAsync();
      }

      if (soundRef.current && player.durationMillis === 0) {
        const currentStatus = await soundRef.current.getStatusAsync();
        if (currentStatus.isLoaded && currentStatus.durationMillis && currentStatus.durationMillis > 0) {
          const seconds = Math.floor(currentStatus.durationMillis / 1000);
          setPlayer((prev) => ({ ...prev, durationMillis: currentStatus.durationMillis ?? prev.durationMillis }));
          await upsertLocalMeta(naat.id, { duration_seconds: seconds });
          setNaats((prev) =>
            prev.map((item) => (item.id === naat.id ? { ...item, duration_seconds: seconds } : item)),
          );
        }
      }

      setPlayer((prev) => ({
        ...prev,
        current: naat,
        isPlaying: true,
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
  }, [player.current?.id, player.durationMillis, resolveAudioSource]);

  const pause = useCallback(async () => {
    if (soundRef.current) {
      await soundRef.current.pauseAsync();
      setPlayer((prev) => ({ ...prev, isPlaying: false }));
    }
  }, []);

  const resume = useCallback(async () => {
    if (soundRef.current) {
      await soundRef.current.playAsync();
      setPlayer((prev) => ({ ...prev, isPlaying: true }));
    }
  }, []);

  const stop = useCallback(async () => {
    if (soundRef.current) {
      await soundRef.current.stopAsync();
      await soundRef.current.unloadAsync();
      soundRef.current = null;
    }
    setPlayer({ current: null, isPlaying: false, positionMillis: 0, durationMillis: 0 });
  }, []);

  const seek = useCallback(async (millis: number) => {
    if (soundRef.current) {
      await soundRef.current.setPositionAsync(millis);
    }
  }, []);

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
      const result = await resumable.downloadAsync();
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
