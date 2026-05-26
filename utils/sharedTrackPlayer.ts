import { AppState } from 'react-native';
import TrackPlayer, { AppKilledPlaybackBehavior, Capability } from 'react-native-track-player';

const PLAYER_SETUP_DEFER_MS = 400;
const ACTIVE_SETUP_WAIT_MS = 2500;

let playerReady = false;
let setupPromise: Promise<void> | null = null;
let currentAppState = AppState.currentState;
let pendingSetup = false;
let appStateSubscriptionInstalled = false;

function refreshCurrentAppState(): string {
  const nextState = AppState.currentState;
  if (nextState) {
    currentAppState = nextState;
  }
  return currentAppState;
}

function getTrackPlayerErrorCode(error: unknown): string {
  if (typeof error === 'object' && error && 'code' in error) {
    return String((error as { code?: unknown }).code ?? '');
  }
  return '';
}

function getTrackPlayerErrorMessage(error: unknown): string {
  if (typeof error === 'object' && error && 'message' in error) {
    return String((error as { message?: unknown }).message ?? '');
  }
  return String(error ?? '');
}

function isAlreadyInitializedError(error: unknown): boolean {
  const code = getTrackPlayerErrorCode(error);
  const message = getTrackPlayerErrorMessage(error);
  return code === 'player_already_initialized' || /already been initialized/i.test(message);
}

function isNotInitializedError(error: unknown): boolean {
  const code = getTrackPlayerErrorCode(error);
  const message = getTrackPlayerErrorMessage(error);
  return code === 'player_not_initialized' || /not initialized|setupPlayer first/i.test(message);
}

async function isNativePlayerReady(): Promise<boolean> {
  try {
    await TrackPlayer.getPlaybackState();
    return true;
  } catch (error) {
    if (isNotInitializedError(error)) {
      playerReady = false;
      return false;
    }

    return false;
  }
}

async function waitForActiveAppState(): Promise<boolean> {
  if (refreshCurrentAppState() === 'active') {
    return true;
  }

  return new Promise((resolve) => {
    let resolved = false;
    const finish = (isActive: boolean) => {
      if (resolved) return;
      resolved = true;
      subscription.remove();
      clearTimeout(timeout);
      resolve(isActive);
    };

    const subscription = AppState.addEventListener('change', (nextState) => {
      currentAppState = nextState;
      if (nextState === 'active') {
        finish(true);
      }
    });

    const timeout = setTimeout(() => {
      finish(refreshCurrentAppState() === 'active');
    }, ACTIVE_SETUP_WAIT_MS);
  });
}

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
  installAppStateWatcher();
  refreshCurrentAppState();

  if (playerReady) {
    if (await isNativePlayerReady()) return;
    setupPromise = null;
  }

  if (setupPromise) {
    await setupPromise;
    if (playerReady && await isNativePlayerReady()) return;
  }

  if (currentAppState !== 'active') {
    pendingSetup = true;
    const becameActive = await waitForActiveAppState();
    if (!becameActive) {
      throw new Error('TrackPlayer setup deferred until app is active');
    }
    pendingSetup = false;
  }

  setupPromise = (async () => {
    await new Promise((resolve) => setTimeout(resolve, PLAYER_SETUP_DEFER_MS));

    if (playerReady && await isNativePlayerReady()) return;
    if (refreshCurrentAppState() !== 'active') {
      pendingSetup = true;
      throw new Error('TrackPlayer setup deferred until app is active');
    }

    try {
      await TrackPlayer.setupPlayer({
        autoHandleInterruptions: true,
        autoUpdateMetadata: true,
      });
    } catch (error) {
      if (!isAlreadyInitializedError(error)) {
        throw error;
      }
    }

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

    const nativeReady = await isNativePlayerReady();
    if (!nativeReady) {
      throw new Error('TrackPlayer native setup did not complete');
    }

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
