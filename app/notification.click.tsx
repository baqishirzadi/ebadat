import React, { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import TrackPlayer from 'react-native-track-player';
import { useApp } from '@/context/AppContext';
import { useNaat } from '@/context/NaatContext';

export default function NotificationClickRoute() {
  const router = useRouter();
  const { theme } = useApp();
  const { player } = useNaat();
  const hasCurrentTrack = !!player.current;

  useEffect(() => {
    let isMounted = true;

    const redirectToNaat = async () => {
      let hasActiveTrack = hasCurrentTrack;

      if (!hasActiveTrack) {
        try {
          const activeTrack = await TrackPlayer.getActiveTrack();
          hasActiveTrack = !!activeTrack;
        } catch {
          hasActiveTrack = false;
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
