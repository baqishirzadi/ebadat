import { AppState } from 'react-native';
import TrackPlayer, { AppKilledPlaybackBehavior, Capability } from 'react-native-track-player';

const PLAYER_SETUP_DEFER_MS = 400;

let playerReady = false;
let setupPromise: Promise<void> | null = null;
let currentAppState = AppState.currentState;
let pendingSetup = false;
let appStateSubscriptionInstalled = false;

function installAppStateWatcher(): void {
  if (appStateSubscriptionInstalled) return;
  appStateSubscriptionInstalled = true;

  AppState.addEventListener('change', (nextState) => {
    currentAppState = nextState;
    if (nextState === 'active' && pendingSetup && !playerReady) {
      pendingSetup = false;
      void ensureSharedTrackPlayerReady('app-active');
    }
  });
}

export async function ensureSharedTrackPlayerReady(_reason: string = 'unknown'): Promise<void> {
  if (playerReady) return;
  if (setupPromise) {
    await setupPromise;
    return;
  }

  installAppStateWatcher();

  if (currentAppState !== 'active') {
    pendingSetup = true;
    return;
  }

  setupPromise = (async () => {
    await new Promise((resolve) => setTimeout(resolve, PLAYER_SETUP_DEFER_MS));

    if (playerReady) return;
    if (currentAppState !== 'active') {
      pendingSetup = true;
      return;
    }

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
        Capability.SkipToNext,
        Capability.SkipToPrevious,
      ],
      compactCapabilities: [
        Capability.Play,
        Capability.Pause,
        Capability.SkipToNext,
      ],
      progressUpdateEventInterval: 1,
      android: {
        appKilledPlaybackBehavior: AppKilledPlaybackBehavior.StopPlaybackAndRemoveNotification,
      },
    });

    playerReady = true;
    pendingSetup = false;
  })();

  try {
    await setupPromise;
  } finally {
    setupPromise = null;
  }
}

export function isSharedTrackPlayerReady(): boolean {
  return playerReady;
}
