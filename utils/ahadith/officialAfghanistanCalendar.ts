import type { HadithSpecialDay } from '@/types/hadith';
import { getKabulNoon } from '@/utils/afghanistanCalendar';

export interface VerifiedAfghanistanHijriDate {
  hijri: { year: number; month: number; day: number };
  specialDayKeys: HadithSpecialDay[];
}

export const AFGHAN_OFFICIAL_HIJRI_CALENDAR_VERSION = 2;

type VerifiedPeriod = {
  startDateKey: string;
  dayCount: number;
  hijriYear: number;
  hijriMonth: number;
  firstHijriDay: number;
};

/**
 * Kabul civil-date periods derived from dated Ministry of Hajj and Religious
 * Affairs announcements. Add a period only after an official Afghanistan
 * date is published; the app's calculated Hijri date remains the fallback,
 * but is not treated as verified for occasion-specific Hadith selection.
 *
 * 1447 Ramadan: official ministry notices identify 5 Ramadan as 2026-02-22;
 * the 1447 Shawwal notice identifies 18 Shawwal as 2026-04-05. Counting the
 * intervening Hijri dates gives Ramadan 1 on 2026-02-18 and Shawwal 1 on
 * 2026-03-19 (29 Ramadan days).
 * 1447 Dhul Hijjah: the ministry identifies 8 Dhul Hijjah as 2026-05-25;
 * 1448 Muharram 1 is explicitly dated 2026-06-17.
 * Sources: mohia.gov.af/dr/node/2476 (Ramadan date),
 * mohia.gov.af/dr/all-news (1447 Dhul Hijjah / Arafah announcement), and
 * mohia.gov.af/index.php/dr/node/2537 (1448 Muharram 1).
 */
const VERIFIED_PERIODS: readonly VerifiedPeriod[] = [
  { startDateKey: '2026-02-18', dayCount: 29, hijriYear: 1447, hijriMonth: 9, firstHijriDay: 1 },
  { startDateKey: '2026-03-19', dayCount: 30, hijriYear: 1447, hijriMonth: 10, firstHijriDay: 1 },
  { startDateKey: '2026-05-18', dayCount: 30, hijriYear: 1447, hijriMonth: 12, firstHijriDay: 1 },
  { startDateKey: '2026-06-17', dayCount: 10, hijriYear: 1448, hijriMonth: 1, firstHijriDay: 1 },
];

function dateKeyToEpochDay(dateKey: string): number {
  const [year, month, day] = dateKey.split('-').map(Number);
  return Math.floor(Date.UTC(year, month - 1, day) / 86_400_000);
}

function epochDayToKabulNoon(epochDay: number): Date {
  return getKabulNoon(new Date(epochDay * 86_400_000));
}

function keysForHijriDate(month: number, day: number): HadithSpecialDay[] {
  const keys: HadithSpecialDay[] = [];
  if (month === 9) {
    keys.push('ramadan');
    if (day === 27) keys.push('laylat_al_qadr');
  }
  if (month === 10 && day === 1) keys.push('eid_al_fitr');
  if (month === 12) {
    if (day >= 1 && day <= 10) keys.push('first_10_dhul_hijjah');
    if (day === 9) keys.push('arafah');
    if (day === 10) keys.push('eid_al_adha');
    if (day >= 11 && day <= 13) keys.push('tashreeq');
  }
  if (month === 1 && day === 1) keys.push('hijri_new_year');
  if (month === 1 && day === 10) keys.push('ashura');
  return keys;
}

export function getVerifiedAfghanistanHijriDate(dateKey: string): VerifiedAfghanistanHijriDate | null {
  const target = dateKeyToEpochDay(dateKey);
  if (!Number.isFinite(target)) return null;

  for (const period of VERIFIED_PERIODS) {
    const offset = target - dateKeyToEpochDay(period.startDateKey);
    if (offset < 0 || offset >= period.dayCount) continue;
    const day = period.firstHijriDay + offset;
    return {
      hijri: { year: period.hijriYear, month: period.hijriMonth, day },
      specialDayKeys: keysForHijriDate(period.hijriMonth, day),
    };
  }
  return null;
}

/** Resolve a Hijri date to its officially announced Kabul civil date when covered. */
export function getVerifiedAfghanistanGregorianDate(
  hijriYear: number,
  hijriMonth: number,
  hijriDay: number,
): Date | null {
  for (const period of VERIFIED_PERIODS) {
    if (period.hijriYear !== hijriYear || period.hijriMonth !== hijriMonth) continue;
    const offset = hijriDay - period.firstHijriDay;
    if (offset < 0 || offset >= period.dayCount) continue;
    return epochDayToKabulNoon(dateKeyToEpochDay(period.startDateKey) + offset);
  }
  return null;
}
