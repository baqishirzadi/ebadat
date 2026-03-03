import { NativeModules, Platform } from 'react-native';

export type AdhanScheduleMode = 'exact' | 'fallback_inexact';

export interface NativeAdhanAlarmInput {
  id: string;
  triggerAtMs: number;
  title: string;
  body: string;
  channelId: string;
  scheduleMode?: AdhanScheduleMode;
  type: 'adhan';
  prayer?: string;
  expectedFireAtMs: number;
  dayKey?: string;
  isJummah?: boolean;
  voice?: string;
}

interface NativeAdhanSchedulerModule {
  scheduleAdhanAlarms?: (alarms: NativeAdhanAlarmInput[], mode: AdhanScheduleMode) => Promise<string[]>;
  scheduleExactAdhanAlarms?: (alarms: NativeAdhanAlarmInput[]) => Promise<string[]>;
  cancelAdhanAlarms?: (ids: string[]) => Promise<boolean>;
  getScheduledAdhanAlarms?: () => Promise<NativeAdhanAlarmInput[]>;
}

function getNativeModule(): NativeAdhanSchedulerModule | null {
  if (Platform.OS !== 'android') return null;
  const module = (NativeModules as { AdhanAlarmSchedulerModule?: NativeAdhanSchedulerModule })
    .AdhanAlarmSchedulerModule;
  return module || null;
}

export function canUseNativeAdhanScheduler(): boolean {
  const module = getNativeModule();
  return Boolean(
    (module?.scheduleAdhanAlarms || module?.scheduleExactAdhanAlarms) &&
    module?.cancelAdhanAlarms &&
    module?.getScheduledAdhanAlarms
  );
}

export async function scheduleNativeAdhanAlarms(
  alarms: NativeAdhanAlarmInput[],
  mode: AdhanScheduleMode
): Promise<string[]> {
  const module = getNativeModule();
  if (!module) {
    throw new Error('Native Adhan scheduler is unavailable');
  }
  if (alarms.length === 0) return [];
  const normalizedAlarms = alarms.map((alarm) => ({
    ...alarm,
    scheduleMode: mode,
  }));

  if (module.scheduleAdhanAlarms) {
    return module.scheduleAdhanAlarms(normalizedAlarms, mode);
  }
  if (mode === 'exact' && module.scheduleExactAdhanAlarms) {
    return module.scheduleExactAdhanAlarms(normalizedAlarms);
  }

  throw new Error('Native Adhan scheduler is unavailable');
}

export async function scheduleNativeExactAdhanAlarms(
  alarms: NativeAdhanAlarmInput[]
): Promise<string[]> {
  return scheduleNativeAdhanAlarms(alarms, 'exact');
}

export async function cancelNativeExactAdhanAlarms(ids: string[]): Promise<void> {
  const module = getNativeModule();
  if (!module?.cancelAdhanAlarms) {
    throw new Error('Native exact Adhan scheduler is unavailable');
  }
  if (ids.length === 0) return;
  await module.cancelAdhanAlarms(ids);
}

export async function getNativeExactAdhanAlarms(): Promise<NativeAdhanAlarmInput[]> {
  const module = getNativeModule();
  if (!module?.getScheduledAdhanAlarms) {
    return [];
  }
  const alarms = await module.getScheduledAdhanAlarms();
  if (!Array.isArray(alarms)) return [];
  return alarms
    .map((alarm) => {
      const scheduleMode: AdhanScheduleMode =
        alarm.scheduleMode === 'fallback_inexact' ? 'fallback_inexact' : 'exact';
      return {
        ...alarm,
        triggerAtMs: Number(alarm.triggerAtMs),
        expectedFireAtMs: Number(alarm.expectedFireAtMs),
        scheduleMode,
        isJummah: Boolean(alarm.isJummah),
      };
    })
    .filter((alarm) => alarm.id && Number.isFinite(alarm.triggerAtMs));
}
