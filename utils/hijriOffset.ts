/**
 * User-visible Hijri date offset (−2…+2 days).
 * Invalidates islamic calendar caches when changed.
 */

import { invalidateIslamicCalendarCaches } from '@/utils/islamicCalendar';

let userHijriOffsetDays = 0;

export function getUserHijriOffsetDays(): number {
  return userHijriOffsetDays;
}

export function setUserHijriOffsetDays(offset: number): void {
  const clamped = Math.max(-2, Math.min(2, Math.round(offset)));
  if (clamped === userHijriOffsetDays) return;
  userHijriOffsetDays = clamped;
  invalidateIslamicCalendarCaches();
}

export function clampHijriOffsetDays(offset: number): number {
  return Math.max(-2, Math.min(2, Math.round(offset)));
}
