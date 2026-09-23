import { AhadithCalendarContext, DailyHadithSelection, DailySelectionReason, Hadith } from '@/types/hadith';
import { getAhadithCalendarContext } from '@/utils/ahadith/calendarContext';
import { getHadithsSortedByDailyIndex } from '@/utils/ahadith/repository';
import { getKabulEpochDay } from '@/utils/afghanistanCalendar';

const SPECIAL_PRIORITY: ReadonlyArray<NonNullable<Hadith['special_days']>[number]> = [
  'laylat_al_qadr',
  'eid_al_fitr',
  'eid_al_adha',
  'arafah',
  'tashreeq',
  'first_10_dhul_hijjah',
  'hijri_new_year',
  'ashura',
  'ramadan',
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

function getPrioritySpecialDayPool(
  hadiths: Hadith[],
  context: AhadithCalendarContext
): Hadith[] {
  for (const key of SPECIAL_PRIORITY) {
    if (!context.specialDayKeys.includes(key)) continue;
    const pool = hadiths.filter((item) => item.special_days?.includes(key));
    if (pool.length > 0) {
      return pool;
    }
  }

  return hadiths.filter((item) => matchesSpecialDays(item, context));
}

function getContextualPool(
  hadiths: Hadith[],
  context: AhadithCalendarContext
): { pool: Hadith[]; reason: DailySelectionReason } | null {
  const specialPool = getPrioritySpecialDayPool(hadiths, context);
  if (specialPool.length > 0) {
    return { pool: specialPool, reason: 'special_days' };
  }

  const hijriRangePool = context.hijriVerified
    ? hadiths.filter((item) => matchesHijriRange(item, context))
    : [];
  if (hijriRangePool.length > 0) {
    return { pool: hijriRangePool, reason: 'hijri_range' };
  }

  const weekdayPool = hadiths.filter((item) => matchesWeekday(item, context));
  if (weekdayPool.length > 0) {
    return { pool: weekdayPool, reason: 'weekday_only' };
  }

  return null;
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
  const contextual = getContextualPool(hadiths, context);
  if (contextual) {
    return buildSelection(pickFromPool(contextual.pool, context), contextual.reason, context);
  }

  const generalPool = hadiths.filter(
    (item) => !item.special_days?.length && !item.hijri_range && !item.weekday_only,
  );
  const fallbackPool = sortDeterministic(generalPool.length > 0 ? generalPool : hadiths);
  const fallbackIndex = Math.abs(context.epochDay) % fallbackPool.length;
  return buildSelection(fallbackPool[fallbackIndex], 'daily_index', context);
}
