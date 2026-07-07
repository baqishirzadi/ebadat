import { formatPrayerTime12h } from '@/utils/formatPrayerTime';
import { getNextPrayer, type PrayerTimes } from '@/utils/prayerTimes';

const PRAYER_ORDER = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'] as const;

export function getCurrentPrayerKey(times: PrayerTimes, now: Date = new Date()): string | null {
  let current: string | null = null;
  for (const key of PRAYER_ORDER) {
    if (times[key] <= now) current = key;
  }
  return current;
}

export function getPrayerGradientColors(prayerTimes: PrayerTimes | null): [string, string, string] {
  if (!prayerTimes) return ['#0F1F14', '#1a4d3e', '#0F1F14'];
  const hour = getNextPrayer(prayerTimes).time.getHours();
  if (hour < 6) return ['#0a1628', '#1a3a5c', '#0a1628'];
  if (hour < 12) return ['#0F1F14', '#1a4d3e', '#2d6a4f'];
  if (hour < 17) return ['#1a4d3e', '#2d6a4f', '#1a4d3e'];
  if (hour < 20) return ['#3d2817', '#8b4513', '#3d2817'];
  return ['#0F1F14', '#1a2f4e', '#0F1F14'];
}

export function getPrayerProgress(prayerTimes: PrayerTimes, now: Date = new Date()): number {
  let prevTime = prayerTimes.isha.getTime() - 24 * 60 * 60 * 1000;
  let nextTime = prayerTimes.fajr.getTime();
  let found = false;

  for (const key of PRAYER_ORDER) {
    const t = prayerTimes[key].getTime();
    if (t > now.getTime()) {
      nextTime = t;
      found = true;
      break;
    }
    prevTime = t;
  }

  if (!found) {
    nextTime = prayerTimes.fajr.getTime() + 24 * 60 * 60 * 1000;
  }

  const total = nextTime - prevTime;
  if (total <= 0) return 0;
  const elapsed = now.getTime() - prevTime;
  return Math.min(1, Math.max(0, elapsed / total));
}

export function formatLiveClock(date: Date): string {
  return formatPrayerTime12h(date);
}
