import { useApp } from '@/context/AppContext';
import { getPersistedQuranResumeContext, type PersistedQuranResumeContext } from '@/utils/quranAudio';
import { ensureSharedTrackPlayerReady } from '@/utils/sharedTrackPlayer';
import { useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import TrackPlayer from 'react-native-track-player';

type ActiveMediaTrack = {
  id?: string | number;
  mediaType?: string;
  surah?: unknown;
  ayah?: unknown;
  scopeType?: unknown;
  juzNumber?: unknown;
};

function toPositiveNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = Number.parseInt(value, 10);
    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed;
    }
  }
  return null;
}

function isQuranTrack(track: ActiveMediaTrack | null): track is ActiveMediaTrack & {
  mediaType: 'quran';
  surah: number;
  ayah: number;
} {
  return Boolean(
    track &&
      track.mediaType === 'quran' &&
      toPositiveNumber(track.surah) &&
      toPositiveNumber(track.ayah)
  );
}

function isNaatTrack(track: ActiveMediaTrack | null): track is ActiveMediaTrack & {
  mediaType: 'naat';
} {
  return Boolean(track && track.mediaType === 'naat');
}

async function getActiveTrack(): Promise<ActiveMediaTrack | null> {
  try {
    const activeTrack = await TrackPlayer.getActiveTrack();
    if (typeof activeTrack === 'number') {
      const queue = await TrackPlayer.getQueue();
      return (queue[activeTrack] as ActiveMediaTrack | undefined) ?? null;
    }
  return (activeTrack as ActiveMediaTrack | null) ?? null;
  } catch {
    return null;
  }
}

function getQuranReaderSingularId(
  _name: string,
  params: Record<string, undefined | string | number | (string | number)[]>
): string | undefined {
  if (params.juz !== undefined) {
    return 'quran-juz-reader';
  }
  if (params.surah !== undefined) {
    return 'quran-surah-reader';
  }
  return undefined;
}

function routeToQuranReadingContext(
  router: ReturnType<typeof useRouter>,
  context: {
    surah: number;
    ayah: number;
    scopeType: 'surah' | 'juz';
    juzNumber?: number | null;
  }
): boolean {
  const jumpToken = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

  if (context.scopeType === 'juz' && context.juzNumber) {
    router.dismissTo({
      pathname: '/quran/juz/[juz]',
      params: {
        juz: String(context.juzNumber),
        surah: String(context.surah),
        ayah: String(context.ayah),
        jump: 'continue',
        jumpToken,
        resumeSource: 'notification',
      },
    } as any, {
      dangerouslySingular: getQuranReaderSingularId,
    });
    return true;
  }

  router.dismissTo({
    pathname: '/quran/[surah]',
    params: {
      surah: String(context.surah),
      ayah: String(context.ayah),
      jump: 'continue',
      jumpToken,
      resumeSource: 'notification',
    },
  } as any, {
    dangerouslySingular: getQuranReaderSingularId,
  });
  return true;
}

export default function NotificationClickRoute() {
  const router = useRouter();
  const { theme } = useApp();

  useEffect(() => {
    let isMounted = true;

    const redirectFromActiveMedia = async () => {
      await ensureSharedTrackPlayerReady('notification-click').catch(() => {});

      let activeTrack: ActiveMediaTrack | null = null;
      for (let attempt = 0; attempt < 8; attempt += 1) {
        activeTrack = await getActiveTrack();
        if (activeTrack) {
          break;
        }
        if (attempt < 7) {
          await new Promise((resolve) => setTimeout(resolve, 250));
        }
      }

      const persistedQuranContext: PersistedQuranResumeContext | null =
        !activeTrack || activeTrack.mediaType === 'quran'
          ? await getPersistedQuranResumeContext()
          : null;

      if (!isMounted) return;

      if (isQuranTrack(activeTrack)) {
        const surah = toPositiveNumber(activeTrack.surah);
        const ayah = toPositiveNumber(activeTrack.ayah);
        const juzNumber = toPositiveNumber(activeTrack.juzNumber);
        if (surah && ayah) {
          routeToQuranReadingContext(router, {
            surah,
            ayah,
            scopeType: activeTrack.scopeType === 'juz' && juzNumber ? 'juz' : 'surah',
            juzNumber,
          });
          return;
        }
      }

      if (persistedQuranContext) {
        routeToQuranReadingContext(router, persistedQuranContext);
        return;
      }

      if (isNaatTrack(activeTrack)) {
        router.dismissTo('/naat/now-playing');
        return;
      }

      if (activeTrack?.mediaType === 'quran') {
        router.replace('/(tabs)');
        return;
      }

      router.replace('/(tabs)');
    };

    redirectFromActiveMedia().catch(() => {
      if (!isMounted) return;
      router.replace('/(tabs)');
    });

    return () => {
      isMounted = false;
    };
  }, [router]);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ActivityIndicator size="small" color={theme.tint} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
