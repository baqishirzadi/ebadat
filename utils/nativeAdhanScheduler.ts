import { NativeModules, Platform } from 'react-native';

export interface NativeAdhanAlarmInput {
  id: string;
  triggerAtMs: number;
  title: string;
  body: string;
  channelId: string;
  type: 'adhan';
  prayer?: string;
  expectedFireAtMs: number;
  dayKey?: string;
  isJummah?: boolean;
  voice?: string;
}

interface NativeAdhanSchedulerModule {
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
    module?.scheduleExactAdhanAlarms &&
    module?.cancelAdhanAlarms &&
    module?.getScheduledAdhanAlarms
  );
}

export async function scheduleNativeExactAdhanAlarms(
  alarms: NativeAdhanAlarmInput[]
): Promise<string[]> {
  const module = getNativeModule();
  if (!module?.scheduleExactAdhanAlarms) {
    throw new Error('Native exact Adhan scheduler is unavailable');
  }
  if (alarms.length === 0) return [];
  return module.scheduleExactAdhanAlarms(alarms);
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
    .map((alarm) => ({
      ...alarm,
      triggerAtMs: Number(alarm.triggerAtMs),
      expectedFireAtMs: Number(alarm.expectedFireAtMs),
      isJummah: Boolean(alarm.isJummah),
    }))
    .filter((alarm) => alarm.id && Number.isFinite(alarm.triggerAtMs));
}
