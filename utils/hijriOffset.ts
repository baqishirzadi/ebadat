/**
 * User-visible Hijri date offset (−2…+2 days).
 * Applied on top of the official Afghan Hijri calendar: the civil day stays
 * put, and the displayed lunar date moves forward or back.
 */

import { addDaysToKabulDate } from '@/utils/afghanistanCalendar';
import {
  gregorianToHijri,
  hijriToGregorian,
  type HijriDate,
} from '@/utils/islamicCalendar';

let userHijriOffsetDays = 0;
const offsetListeners = new Set<() => void>();

export function getUserHijriOffsetDays(): number {
  return userHijriOffsetDays;
}

export function subscribeHijriOffset(listener: () => void): () => void {
  offsetListeners.add(listener);
  return () => {
    offsetListeners.delete(listener);
  };
}

export function setUserHijriOffsetDays(offset: number): void {
  const next = clampHijriOffsetDays(offset);
  if (next === userHijriOffsetDays) return;
  userHijriOffsetDays = next;
  offsetListeners.forEach((listener) => listener());
}

export function clampHijriOffsetDays(offset: number): number {
  if (!Number.isFinite(offset)) return 0;
  return Math.max(-2, Math.min(2, Math.round(offset)));
}

/** Official Hijri date shifted by the user's moon-sighting correction. */
export function gregorianToDisplayHijri(
  date: Date,
  offsetDays: number = getUserHijriOffsetDays(),
): HijriDate {
  const offset = clampHijriOffsetDays(offsetDays);
  const source = offset === 0 ? date : addDaysToKabulDate(date, offset);
  return gregorianToHijri(source);
}

/**
 * Gregorian day whose displayed Hijri date is the given lunar day.
 * Inverse of gregorianToDisplayHijri.
 */
export function displayHijriToGregorian(
  hijriYear: number,
  hijriMonth: number,
  hijriDay: number,
  offsetDays: number = getUserHijriOffsetDays(),
): Date | null {
  const official = hijriToGregorian(hijriYear, hijriMonth, hijriDay);
  if (!official) return null;
  const offset = clampHijriOffsetDays(offsetDays);
  if (offset === 0) return official;
  return addDaysToKabulDate(official, -offset);
}
