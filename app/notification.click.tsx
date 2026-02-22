import { useApp } from '@/context/AppContext';
import { useNaat } from '@/context/NaatContext';
import { useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import TrackPlayer from 'react-native-track-player';

export default function NotificationClickRoute() {
  const router = useRouter();
  const { theme } = useApp();
  const { player } = useNaat();
  const hasCurrentTrack = !!player.current;

  useEffect(() => {
    let isMounted = true;

    const hasNativeActiveTrack = async () => {
      try {
        const activeTrack = await TrackPlayer.getActiveTrack();
        if (typeof activeTrack === 'number') {
          const queue = await TrackPlayer.getQueue();
          return !!queue[activeTrack];
        }
        return !!activeTrack;
      } catch {
        return false;
      }
    };

    const redirectToNaat = async () => {
      let hasActiveTrack = false;

      for (let attempt = 0; attempt < 3; attempt += 1) {
        hasActiveTrack = (await hasNativeActiveTrack()) || hasCurrentTrack;
        if (hasActiveTrack) {
          break;
        }
        if (attempt < 2) {
          await new Promise((resolve) => setTimeout(resolve, 300));
        }
      }

      if (!isMounted) return;
      router.replace(hasActiveTrack ? '/naat/now-playing' : '/(tabs)/naat');
    };

    redirectToNaat().catch(() => {
      if (!isMounted) return;
      router.replace('/(tabs)/naat');
    });

    return () => {
      isMounted = false;
    };
  }, [hasCurrentTrack, router]);

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
