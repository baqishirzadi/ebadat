import { AhadithCalendarContext, DailyHadithSelection, DailySelectionReason, Hadith } from '@/types/hadith';
import { getAhadithCalendarContext } from '@/utils/ahadith/calendarContext';
import { getHadithsSortedByDailyIndex } from '@/utils/ahadith/repository';

const SPECIAL_PRIORITY: ReadonlyArray<NonNullable<Hadith['special_days']>[number]> = [
  'ramadan',
  'laylat_al_qadr',
  'eid_al_fitr',
  'eid_al_adha',
  'first_10_dhul_hijjah',
  'ashura',
];

function sortDeterministic(items: Hadith[]): Hadith[] {
  return getHadithsSortedByDailyIndex(items);
}

function pickFromPool(pool: Hadith[], context: AhadithCalendarContext): Hadith {
  const sorted = sortDeterministic(pool);
  const index = Math.abs(context.epochDay) % sorted.length;
  return sorted[index];
}

function matchesSpecialDays(hadith: Hadith, context: AhadithCalendarContext): boolean {
  if (!hadith.special_days || hadith.special_days.length === 0) return false;

  for (const key of SPECIAL_PRIORITY) {
    if (context.specialDayKeys.includes(key) && hadith.special_days.includes(key)) {
      return true;
    }
  }

  return false;
}

function matchesHijriRange(hadith: Hadith, context: AhadithCalendarContext): boolean {
  if (!hadith.hijri_range) return false;
  const range = hadith.hijri_range;
  if (range.month !== context.hijri.month) return false;
  return context.hijri.day >= range.day_start && context.hijri.day <= range.day_end;
}

function matchesWeekday(hadith: Hadith, context: AhadithCalendarContext): boolean {
  if (!hadith.weekday_only) return false;
  return hadith.weekday_only === 'friday' && context.isFriday;
}

function buildSelection(hadith: Hadith, reason: DailySelectionReason, context: AhadithCalendarContext): DailyHadithSelection {
  return {
    hadith,
    reason,
    context,
  };
}

export function selectDailyHadith(hadiths: Hadith[], date: Date = new Date()): DailyHadithSelection {
  if (!hadiths.length) {
    throw new Error('Hadith dataset is empty');
  }

  const context = getAhadithCalendarContext(date);

  const specialDayPool = hadiths.filter((item) => matchesSpecialDays(item, context));
  if (specialDayPool.length > 0) {
    return buildSelection(pickFromPool(specialDayPool, context), 'special_days', context);
  }

  const hijriRangePool = hadiths.filter((item) => matchesHijriRange(item, context));
  if (hijriRangePool.length > 0) {
    return buildSelection(pickFromPool(hijriRangePool, context), 'hijri_range', context);
  }

  const weekdayPool = hadiths.filter((item) => matchesWeekday(item, context));
  if (weekdayPool.length > 0) {
    return buildSelection(pickFromPool(weekdayPool, context), 'weekday_only', context);
  }

  const fallbackPool = sortDeterministic(hadiths);
  const fallbackIndex = Math.abs(context.epochDay) % fallbackPool.length;
  return buildSelection(fallbackPool[fallbackIndex], 'daily_index', context);
}
