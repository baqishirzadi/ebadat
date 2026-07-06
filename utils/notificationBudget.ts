/**
 * iOS caps pending local notifications at 64 per app; excess slots are silently dropped.
 *
 * Budget allocation (60 slots used, 4 headroom):
 * - Azan: 8 days x 5 prayers = 40 (4 days x 5 x 2 with early reminders = 40)
 * - Ahadith daily: 14 days = 14
 * - Calendar Qamari: next 6 occasions = 6
 */

export const IOS_PENDING_NOTIFICATION_LIMIT = 64;
export const IOS_NOTIFICATION_BUDGET_HEADROOM = 4;

export const IOS_AZAN_ROLLING_DAYS = 8;
export const IOS_AZAN_ROLLING_DAYS_WITH_REMINDER = 4;

export const IOS_AHADITH_DAYS_AHEAD = 14;
export const IOS_CALENDAR_MAX_EVENTS = 6;

export const IOS_ADHAN_SOUND_FILENAME = 'barakatullah_salim_18sec.caf';
export const ANDROID_ADHAN_SOUND_FILENAME = 'barakatullah_salim_18sec.mp3';

export function getAdhanSoundFilename(platform: string): string {
  return platform === 'ios' ? IOS_ADHAN_SOUND_FILENAME : ANDROID_ADHAN_SOUND_FILENAME;
}

export function getIosAzanRollingDays(earlyReminder: boolean): number {
  return earlyReminder ? IOS_AZAN_ROLLING_DAYS_WITH_REMINDER : IOS_AZAN_ROLLING_DAYS;
}
