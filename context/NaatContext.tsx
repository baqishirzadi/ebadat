import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Alert } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import * as FileSystem from 'expo-file-system';
import { Audio } from 'expo-av';
import { Naat, NaatDraft } from '@/types/naat';
import {
  addNaat,
  deleteNaat,
  ensureNaatDirectory,
  getNaatDirectory,
  incrementPlayCount,
  loadNaats,
  saveNaats,
  updateNaat,
  verifyDownloads,
} from '@/utils/naatStorage';
import { extractAudioUrl } from '@/utils/naatExtract';
import { configureNaatAudioMode } from '@/utils/naatAudio';

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
  addItem: (draft: NaatDraft) => Promise<Naat>;
  editItem: (id: string, patch: Partial<Naat>) => Promise<Naat | null>;
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

  const refresh = useCallback(async () => {
    setLoading(true);
    await ensureNaatDirectory();
    await verifyDownloads();
    const list = await loadNaats();
    setNaats(list);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh().catch(() => setLoading(false));
    configureNaatAudioMode().catch(() => {
      // Ignore audio mode errors
    });
  }, [refresh]);

  const addItem = useCallback(async (draft: NaatDraft) => {
    const created = await addNaat(draft);
    const updated = await loadNaats();
    setNaats(updated);
    return created;
  }, []);

  const editItem = useCallback(async (id: string, patch: Partial<Naat>) => {
    const updated = await updateNaat(id, patch);
    const list = await loadNaats();
    setNaats(list);
    return updated;
  }, []);

  const removeItem = useCallback(async (id: string) => {
    await deleteNaat(id);
    const list = await loadNaats();
    setNaats(list);
  }, []);

  const resolveAudioSource = useCallback(async (naat: Naat): Promise<{ uri: string; updated?: Naat }> => {
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

    let audioUrl = naat.extractedAudioUrl;
    let updated: Naat | undefined;
    if (!audioUrl) {
      audioUrl = await extractAudioUrl(naat.youtubeUrl);
      if (audioUrl) {
        updated = await updateNaat(naat.id, { extractedAudioUrl: audioUrl });
        const list = await loadNaats();
        setNaats(list);
      }
    }

    if (!audioUrl) {
      throw new Error('no-audio');
    }
    return { uri: audioUrl, updated };
  }, []);

  const play = useCallback(async (naat: Naat) => {
    try {
      const source = await resolveAudioSource(naat);
      const currentId = player.current?.id;

      if (soundRef.current && currentId && currentId !== naat.id) {
        await soundRef.current.unloadAsync();
        soundRef.current = null;
      }

      if (!soundRef.current) {
        const { sound, status } = await Audio.Sound.createAsync(
          { uri: source.uri },
          { shouldPlay: true },
        );
        sound.setOnPlaybackStatusUpdate((status) => {
          if (!status.isLoaded) return;
          setPlayer((prev) => ({
            ...prev,
            isPlaying: status.isPlaying ?? false,
            positionMillis: status.positionMillis ?? 0,
            durationMillis: status.durationMillis ?? prev.durationMillis,
          }));
        });
        soundRef.current = sound;
        if (status?.isLoaded && status.durationMillis && status.durationMillis > 0) {
          setPlayer((prev) => ({ ...prev, durationMillis: status.durationMillis ?? prev.durationMillis }));
          await updateNaat(naat.id, { duration: Math.floor(status.durationMillis / 1000) });
        }
      } else {
        await soundRef.current.playAsync();
      }

      if (soundRef.current && player.durationMillis === 0) {
        const currentStatus = await soundRef.current.getStatusAsync();
        if (currentStatus.isLoaded && currentStatus.durationMillis && currentStatus.durationMillis > 0) {
          setPlayer((prev) => ({ ...prev, durationMillis: currentStatus.durationMillis ?? prev.durationMillis }));
          await updateNaat(naat.id, { duration: Math.floor(currentStatus.durationMillis / 1000) });
        }
      }

      setPlayer((prev) => ({
        ...prev,
        current: source.updated || naat,
        isPlaying: true,
      }));
      await incrementPlayCount(naat.id);
    } catch (error: any) {
      if (error?.message === 'offline') {
        Alert.alert('آفلاین', 'ابتدا دانلود نمایید');
        return;
      }
      if (error?.message === 'no-audio') {
        Alert.alert('خطا', 'لینک صوتی پیدا نشد. لطفاً لینک صوتی را در مدیریت اضافه کنید.');
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
      await ensureNaatDirectory();
      const source = await resolveAudioSource(naat);
      const dir = getNaatDirectory();
      const target = `${dir}${naat.id}.mp3`;
      const result = await FileSystem.downloadAsync(source.uri, target);
      await updateNaat(naat.id, {
        localFileUri: result.uri,
        isDownloaded: true,
      });
      const list = await loadNaats();
      setNaats(list);
      Alert.alert('موفق', 'نعت ذخیره شد و آفلاین قابل پخش است');
    } catch (error: any) {
      if (error?.message === 'offline') {
        Alert.alert('آفلاین', 'ابتدا دانلود نمایید');
        return;
      }
      Alert.alert('خطا', 'دانلود موفق نبود');
    }
  }, [resolveAudioSource]);

  const value = useMemo<NaatContextValue>(() => ({
    naats,
    loading,
    player,
    refresh,
    addItem,
    editItem,
    removeItem,
    play,
    pause,
    resume,
    stop,
    seek,
    download,
  }), [naats, loading, player, refresh, addItem, editItem, removeItem, play, pause, resume, stop, seek, download]);

  return <NaatContext.Provider value={value}>{children}</NaatContext.Provider>;
}
