/**
 * Naat Playback Service for react-native-track-player
 * Handles remote events (lock screen, notification, Bluetooth) when app is in background
 */

import TrackPlayer, { Event } from 'react-native-track-player';

export async function NaatPlaybackService() {
  TrackPlayer.addEventListener(Event.RemotePlay, async () => {
    try {
      await TrackPlayer.play();
    } catch (err) {
      if (__DEV__) console.warn('RemotePlay:', err);
    }
  });
  TrackPlayer.addEventListener(Event.RemotePause, async () => {
    try {
      await TrackPlayer.pause();
    } catch (err) {
      if (__DEV__) console.warn('RemotePause:', err);
    }
  });
  TrackPlayer.addEventListener(Event.RemoteStop, async () => {
    try {
      await TrackPlayer.reset();
    } catch (err) {
      if (__DEV__) console.warn('RemoteStop:', err);
    }
  });
  TrackPlayer.addEventListener(Event.RemoteSeek, async (e) => {
    try {
      await TrackPlayer.seekTo(e.position);
    } catch (err) {
      if (__DEV__) console.warn('RemoteSeek:', err);
    }
  });
  TrackPlayer.addEventListener(Event.RemoteJumpForward, async (e) => {
    try {
      const progress = await TrackPlayer.getProgress();
      const interval = e.interval ?? 15;
      const duration = progress.duration > 0 ? progress.duration : Number.POSITIVE_INFINITY;
      const nextPosition = Math.min(progress.position + interval, duration);
      await TrackPlayer.seekTo(nextPosition);
    } catch (err) {
      if (__DEV__) console.warn('RemoteJumpForward:', err);
    }
  });
  TrackPlayer.addEventListener(Event.RemoteJumpBackward, async (e) => {
    try {
      const progress = await TrackPlayer.getProgress();
      const interval = e.interval ?? 15;
      const nextPosition = Math.max(0, progress.position - interval);
      await TrackPlayer.seekTo(nextPosition);
    } catch (err) {
      if (__DEV__) console.warn('RemoteJumpBackward:', err);
    }
  });
  TrackPlayer.addEventListener(Event.RemoteNext, () => {
    // Naat has no queue - no-op or could add "next naat" in future
  });
  TrackPlayer.addEventListener(Event.RemotePrevious, async () => {
    try {
      await TrackPlayer.seekTo(0);
    } catch (err) {
      if (__DEV__) console.warn('RemotePrevious:', err);
    }
  });
}
