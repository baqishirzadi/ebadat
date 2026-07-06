import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

export const IOS_SCHEDULE_SYNC_KEY = '@ebadat/ios_schedule_sync_metadata_v1';
export const IOS_BACKGROUND_REFRESH_PENDING_KEY = '@ebadat/ios_background_refresh_pending_v1';

const STALE_SYNC_MS = 12 * 60 * 60 * 1000;

export interface IOSScheduleSyncMetadata {
  syncedAtMs: number;
  timezoneId: string;
  timezoneOffsetMinutes: number;
  dateKey: string;
  locationKey: string;
  pendingAdhanCount: number;
}

export function getDeviceTimezoneSnapshot(): {
  timezoneId: string;
  timezoneOffsetMinutes: number;
} {
  return {
    timezoneId: Intl.DateTimeFormat().resolvedOptions().timeZone,
    timezoneOffsetMinutes: -new Date().getTimezoneOffset(),
  };
}

export async function loadIOSScheduleSyncMetadata(): Promise<IOSScheduleSyncMetadata | null> {
  try {
    const raw = await AsyncStorage.getItem(IOS_SCHEDULE_SYNC_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as IOSScheduleSyncMetadata;
  } catch {
    return null;
  }
}

export async function saveIOSScheduleSyncMetadata(meta: IOSScheduleSyncMetadata): Promise<void> {
  await AsyncStorage.setItem(IOS_SCHEDULE_SYNC_KEY, JSON.stringify(meta));
}

export async function markIOSBackgroundRefreshPending(reason: string): Promise<void> {
  await AsyncStorage.setItem(IOS_BACKGROUND_REFRESH_PENDING_KEY, reason);
}

export async function consumeIOSBackgroundRefreshPending(): Promise<string | null> {
  const value = await AsyncStorage.getItem(IOS_BACKGROUND_REFRESH_PENDING_KEY);
  if (!value) return null;
  await AsyncStorage.removeItem(IOS_BACKGROUND_REFRESH_PENDING_KEY);
  return value;
}

export function evaluateIOSActivationReschedule(params: {
  currentDateKey: string;
  currentLocationKey: string;
  pendingAdhanCount: number;
  expectedNext24hAdhanCount: number;
  lastSync: IOSScheduleSyncMetadata | null;
  timezoneSnapshot: { timezoneId: string; timezoneOffsetMinutes: number };
}): { shouldReschedule: boolean; reason: string } {
  const {
    currentDateKey,
    currentLocationKey,
    pendingAdhanCount,
    expectedNext24hAdhanCount,
    lastSync,
    timezoneSnapshot,
  } = params;

  if (!lastSync) {
    return { shouldReschedule: true, reason: 'ios-no-prior-sync' };
  }

  if (lastSync.dateKey !== currentDateKey) {
    return { shouldReschedule: true, reason: 'ios-date-changed' };
  }

  if (lastSync.locationKey !== currentLocationKey) {
    return { shouldReschedule: true, reason: 'ios-location-changed' };
  }

  if (
    lastSync.timezoneId !== timezoneSnapshot.timezoneId ||
    lastSync.timezoneOffsetMinutes !== timezoneSnapshot.timezoneOffsetMinutes
  ) {
    return { shouldReschedule: true, reason: 'ios-timezone-changed' };
  }

  const ageMs = Date.now() - lastSync.syncedAtMs;
  if (ageMs > STALE_SYNC_MS) {
    return { shouldReschedule: true, reason: 'ios-stale-sync' };
  }

  const minExpectedPending = expectedNext24hAdhanCount > 0 ? 1 : 0;
  if (pendingAdhanCount < minExpectedPending) {
    return { shouldReschedule: true, reason: 'ios-pending-low' };
  }

  return { shouldReschedule: false, reason: 'ios-healthy' };
}

export function isIOSScheduleHealthPlatform(): boolean {
  return Platform.OS === 'ios';
}
