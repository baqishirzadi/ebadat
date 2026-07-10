import { NativeModules, Platform } from 'react-native';

export type AdhanScheduleMode = 'exact' | 'fallback_inexact';

export interface NativeAdhanConfigInput {
  latitude: number;
  longitude: number;
  timezoneId: string;
  cityKey: string;
  masterEnabled: boolean;
  fajrEnabled: boolean;
  dhuhrEnabled: boolean;
  asrEnabled: boolean;
  maghribEnabled: boolean;
  ishaEnabled: boolean;
  voice: string;
  fajrTitle: string;
  fajrBody: string;
  dhuhrTitle: string;
  dhuhrBody: string;
  asrTitle: string;
  asrBody: string;
  maghribTitle: string;
  maghribBody: string;
  ishaTitle: string;
  ishaBody: string;
  jummahTitle: string;
  jummahBody: string;
  fajrChannelId: string;
  regularChannelId: string;
  configVersion: number;
}

export interface NativeAdhanScheduleResult {
  reason: string;
  scheduledCount: number;
  cancelledCount: number;
  expectedCount: number;
  nextAlarmAtMs: number | null;
}

export interface NativeAdhanHealth {
  notificationsEnabled: boolean;
  canScheduleExactAlarms: boolean;
  scheduledAlarmCount: number;
  nextAlarmAtMs: number | null;
  configPresent: boolean;
  masterEnabled: boolean;
  isIgnoringBatteryOptimizations: boolean;
  manufacturer: string;
  issues: string[];
}

/** @deprecated Legacy payload shape kept for audit compatibility */
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
  setAdhanConfig?: (config: NativeAdhanConfigInput) => Promise<NativeAdhanScheduleResult>;
  getAdhanHealth?: () => Promise<NativeAdhanHealth>;
  runMaintenanceNow?: () => Promise<NativeAdhanScheduleResult>;
  scheduleSystemTestAlarm?: (delayMs: number) => Promise<boolean>;
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
  return Boolean(module?.setAdhanConfig && module?.getAdhanHealth);
}

const SKIPPED_NATIVE_SYNC_RESULT: NativeAdhanScheduleResult = {
  reason: 'config-sync-unchanged',
  scheduledCount: 0,
  cancelledCount: 0,
  expectedCount: 0,
  nextAlarmAtMs: null,
};

let lastSyncedConfigFingerprint: string | null = null;

/** Stable fingerprint for native adhan config (excludes volatile configVersion). */
export function getNativeAdhanConfigFingerprint(config: NativeAdhanConfigInput): string {
  const { configVersion: _version, ...rest } = config;
  return JSON.stringify(rest);
}

export function clearNativeAdhanConfigCache(): void {
  lastSyncedConfigFingerprint = null;
}

export function stableNativeAdhanConfigVersion(
  config: Omit<NativeAdhanConfigInput, 'configVersion'>,
): number {
  const fingerprint = JSON.stringify(config);
  let hash = 0;
  for (let index = 0; index < fingerprint.length; index += 1) {
    hash = (hash * 31 + fingerprint.charCodeAt(index)) | 0;
  }
  return hash >>> 0;
}

function normalizeScheduleResult(raw: NativeAdhanScheduleResult): NativeAdhanScheduleResult {
  return {
    reason: raw.reason,
    scheduledCount: Number(raw.scheduledCount) || 0,
    cancelledCount: Number(raw.cancelledCount) || 0,
    expectedCount: Number(raw.expectedCount) || 0,
    nextAlarmAtMs:
      raw.nextAlarmAtMs == null || Number.isNaN(Number(raw.nextAlarmAtMs))
        ? null
        : Number(raw.nextAlarmAtMs),
  };
}

function normalizeHealth(raw: NativeAdhanHealth): NativeAdhanHealth {
  return {
    notificationsEnabled: Boolean(raw.notificationsEnabled),
    canScheduleExactAlarms: Boolean(raw.canScheduleExactAlarms),
    scheduledAlarmCount: Number(raw.scheduledAlarmCount) || 0,
    nextAlarmAtMs:
      raw.nextAlarmAtMs == null || Number.isNaN(Number(raw.nextAlarmAtMs))
        ? null
        : Number(raw.nextAlarmAtMs),
    configPresent: Boolean(raw.configPresent),
    masterEnabled: Boolean(raw.masterEnabled),
    isIgnoringBatteryOptimizations: Boolean(raw.isIgnoringBatteryOptimizations),
    manufacturer: String(raw.manufacturer || ''),
    issues: Array.isArray(raw.issues) ? raw.issues.map(String) : [],
  };
}

export async function syncNativeAdhanConfig(
  config: NativeAdhanConfigInput,
): Promise<NativeAdhanScheduleResult> {
  const module = getNativeModule();
  if (!module?.setAdhanConfig) {
    throw new Error('Native Adhan config sync is unavailable');
  }

  const fingerprint = getNativeAdhanConfigFingerprint(config);
  if (fingerprint === lastSyncedConfigFingerprint) {
    return SKIPPED_NATIVE_SYNC_RESULT;
  }

  const result = await module.setAdhanConfig(config);
  lastSyncedConfigFingerprint = fingerprint;
  return normalizeScheduleResult(result);
}

export async function getNativeAdhanHealth(): Promise<NativeAdhanHealth> {
  const module = getNativeModule();
  if (!module?.getAdhanHealth) {
    return {
      notificationsEnabled: false,
      canScheduleExactAlarms: false,
      scheduledAlarmCount: 0,
      nextAlarmAtMs: null,
      configPresent: false,
      masterEnabled: false,
      isIgnoringBatteryOptimizations: true,
      manufacturer: '',
      issues: ['native_module_unavailable'],
    };
  }
  const health = await module.getAdhanHealth();
  return normalizeHealth(health);
}

export async function runNativeAdhanMaintenance(): Promise<NativeAdhanScheduleResult> {
  const module = getNativeModule();
  if (!module?.runMaintenanceNow) {
    throw new Error('Native Adhan maintenance is unavailable');
  }
  const result = await module.runMaintenanceNow();
  return normalizeScheduleResult(result);
}

export async function scheduleNativeSystemTestAlarm(delayMs = 25000): Promise<void> {
  const module = getNativeModule();
  if (!module?.scheduleSystemTestAlarm) {
    throw new Error('Native system test alarm is unavailable');
  }
  await module.scheduleSystemTestAlarm(delayMs);
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
    .filter((alarm) => alarm.id && Number.isFinite(alarm.triggerAtMs) && alarm.type === 'adhan');
}

export async function cancelNativeExactAdhanAlarms(ids: string[]): Promise<void> {
  const module = getNativeModule();
  if (!module?.cancelAdhanAlarms) {
    throw new Error('Native Adhan scheduler is unavailable');
  }
  if (ids.length === 0) return;
  await module.cancelAdhanAlarms(ids);
}
