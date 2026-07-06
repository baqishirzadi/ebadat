import {
  consumeIOSBackgroundRefreshPending,
  markIOSBackgroundRefreshPending,
} from '@/utils/iosScheduleHealth';

type ScheduleCallback = (reason: string) => Promise<void>;

let scheduleCallback: ScheduleCallback | null = null;

export function registerPrayerScheduleCallback(callback: ScheduleCallback): void {
  scheduleCallback = callback;
}

export function unregisterPrayerScheduleCallback(): void {
  scheduleCallback = null;
}

export async function triggerPrayerScheduleFromBackground(reason: string): Promise<boolean> {
  if (scheduleCallback) {
    await scheduleCallback(reason);
    return true;
  }

  await markIOSBackgroundRefreshPending(reason);
  return false;
}

export async function runPendingBackgroundPrayerSchedule(
  schedule: (reason: string) => Promise<void>,
): Promise<void> {
  const pendingReason = await consumeIOSBackgroundRefreshPending();
  if (pendingReason) {
    await schedule(pendingReason);
  }
}
