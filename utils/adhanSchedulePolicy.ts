/** Shared identity and rolling-window policy for Adhan scheduling. */

export const ADHAN_SCHEDULE_POLICY_VERSION = 3;
export const ANDROID_ADHAN_ROLLING_DAYS = 7;
export const MAGHRIB_OFFSET_MINUTES = 5;
export const MAGHRIB_OFFSET_MS = MAGHRIB_OFFSET_MINUTES * 60 * 1000;

export interface AdhanScheduleFingerprintInput {
  policyVersion: number;
  cityKey: string;
  countryCode: string;
  timezoneId: string;
  scheduleJson: string;
}

function stableHash(value: string): string {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

export function buildAdhanScheduleFingerprint(input: AdhanScheduleFingerprintInput): string {
  return [
    `v${ADHAN_SCHEDULE_POLICY_VERSION}`,
    `p${input.policyVersion}`,
    input.countryCode.trim().toUpperCase(),
    input.cityKey.trim().toLowerCase(),
    input.timezoneId.trim(),
    input.scheduleJson,
    `h${stableHash(input.scheduleJson)}`,
  ].join('|');
}
