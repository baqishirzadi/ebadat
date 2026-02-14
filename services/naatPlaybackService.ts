/**
 * Naat Playback Service for react-native-track-player
 * Handles remote events (lock screen, notification, Bluetooth) when app is in background
 */

import TrackPlayer, { Event } from 'react-native-track-player';

export async function NaatPlaybackService() {
  TrackPlayer.addEventListener(Event.RemotePlay, () => TrackPlayer.play());
  TrackPlayer.addEventListener(Event.RemotePause, () => TrackPlayer.pause());
  TrackPlayer.addEventListener(Event.RemoteStop, () => TrackPlayer.reset());
  TrackPlayer.addEventListener(Event.RemoteSeek, (e) => TrackPlayer.seekTo(e.position));
  TrackPlayer.addEventListener(Event.RemoteNext, () => {
    // Naat has no queue - no-op or could add "next naat" in future
  });
  TrackPlayer.addEventListener(Event.RemotePrevious, () => {
    // Naat has no queue - seek to start
    TrackPlayer.seekTo(0);
  });
}
