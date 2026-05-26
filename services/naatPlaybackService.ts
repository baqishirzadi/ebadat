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
      if (__DEV__) console.log('RemotePlay:', err);
    }
  });
  TrackPlayer.addEventListener(Event.RemotePause, async () => {
    try {
      await TrackPlayer.pause();
    } catch (err) {
      if (__DEV__) console.log('RemotePause:', err);
    }
  });
  TrackPlayer.addEventListener(Event.RemoteStop, async () => {
    try {
      await TrackPlayer.reset();
    } catch (err) {
      if (__DEV__) console.log('RemoteStop:', err);
    }
  });
  TrackPlayer.addEventListener(Event.RemoteSeek, async (e) => {
    try {
      await TrackPlayer.seekTo(e.position);
    } catch (err) {
      if (__DEV__) console.log('RemoteSeek:', err);
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
      if (__DEV__) console.log('RemoteJumpForward:', err);
    }
  });
  TrackPlayer.addEventListener(Event.RemoteJumpBackward, async (e) => {
    try {
      const progress = await TrackPlayer.getProgress();
      const interval = e.interval ?? 15;
      const nextPosition = Math.max(0, progress.position - interval);
      await TrackPlayer.seekTo(nextPosition);
    } catch (err) {
      if (__DEV__) console.log('RemoteJumpBackward:', err);
    }
  });
  TrackPlayer.addEventListener(Event.RemoteNext, async () => {
    try {
      await TrackPlayer.skipToNext();
    } catch (err) {
      if (__DEV__) console.log('RemoteNext:', err);
    }
  });
  TrackPlayer.addEventListener(Event.RemotePrevious, async () => {
    try {
      const progress = await TrackPlayer.getProgress();
      if (progress.position > 3) {
        await TrackPlayer.seekTo(0);
        return;
      }
      await TrackPlayer.skipToPrevious();
    } catch (err) {
      try {
        await TrackPlayer.seekTo(0);
      } catch {
        // ignore fallback failure
      }
      if (__DEV__) console.log('RemotePrevious:', err);
    }
  });
}
