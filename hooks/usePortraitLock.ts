import { useFocusEffect } from 'expo-router';
import * as ScreenOrientation from 'expo-screen-orientation';
import { useCallback } from 'react';
import { Dimensions } from 'react-native';

/**
 * Window size of a portrait-locked screen, correct even when read while the
 * device is still landscape (app launched sideways, or mid-rotation).
 */
export function getPortraitWindowSize() {
  const { width, height } = Dimensions.get('window');
  return { width: Math.min(width, height), height: Math.max(width, height) };
}

// Counts focused screens that need portrait. Unlocking waits a moment so moving
// between two locked screens (Quran tab -> reader) never briefly allows rotation.
let lockCount = 0;
let unlockTimer: ReturnType<typeof setTimeout> | null = null;
const UNLOCK_DELAY_MS = 400;

function acquire() {
  lockCount += 1;
  if (unlockTimer) {
    clearTimeout(unlockTimer);
    unlockTimer = null;
  }
  ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP).catch(() => undefined);
}

function release() {
  lockCount = Math.max(0, lockCount - 1);
  if (lockCount > 0 || unlockTimer) return;
  unlockTimer = setTimeout(() => {
    unlockTimer = null;
    if (lockCount === 0) ScreenOrientation.unlockAsync().catch(() => undefined);
  }, UNLOCK_DELAY_MS);
}

export function usePortraitLock() {
  useFocusEffect(
    useCallback(() => {
      acquire();
      return release;
    }, []),
  );
}
