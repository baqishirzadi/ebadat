import { AhadithCalendarContext, DailyHadithSelection, DailySelectionReason, Hadith } from '@/types/hadith';
import { getAhadithCalendarContext } from '@/utils/ahadith/calendarContext';
import { getHadithsSortedByDailyIndex } from '@/utils/ahadith/repository';
import { addDaysToKabulDate, getKabulEpochDay, getKabulNoon } from '@/utils/afghanistanCalendar';

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
const CAMPAIGN_START = getKabulNoon(new Date('2026-05-23T12:00:00+04:30'));
const CAMPAIGN_LENGTH_DAYS = 60;

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

function getCampaignDayIndex(date: Date): number | null {
  const dayIndex = getKabulEpochDay(date) - getKabulEpochDay(CAMPAIGN_START);
  return dayIndex >= 0 && dayIndex < CAMPAIGN_LENGTH_DAYS ? dayIndex : null;
}

function getContextualPool(
  hadiths: Hadith[],
  context: AhadithCalendarContext
): { pool: Hadith[]; reason: DailySelectionReason } | null {
  const specialPool = getPrioritySpecialDayPool(hadiths, context);
  if (specialPool.length > 0) {
    return { pool: specialPool, reason: 'special_days' };
  }

  const weekdayPool = hadiths.filter((item) => matchesWeekday(item, context));
  if (weekdayPool.length > 0) {
    return { pool: weekdayPool, reason: 'weekday_only' };
  }

  const hijriRangePool = hadiths.filter((item) => matchesHijriRange(item, context));
  if (hijriRangePool.length > 0) {
    return { pool: hijriRangePool, reason: 'hijri_range' };
  }

  return null;
}

function pickFirstUnused(pool: Hadith[], usedIds: Set<number>): Hadith | null {
  const sorted = sortDeterministic(pool);
  return sorted.find((item) => !usedIds.has(item.id)) ?? null;
}

function selectCampaignHadith(hadiths: Hadith[], date: Date): DailyHadithSelection | null {
  const targetIndex = getCampaignDayIndex(date);
  if (targetIndex === null) return null;

  const usedIds = new Set<number>();
  const sortedHadiths = sortDeterministic(hadiths);
  const dailyPool = sortedHadiths.filter(
    (item) => !item.special_days?.length && !item.hijri_range
  );
  let targetSelection: DailyHadithSelection | null = null;

  for (let offset = 0; offset <= targetIndex; offset++) {
    const candidateDate = addDaysToKabulDate(CAMPAIGN_START, offset);
    const context = getAhadithCalendarContext(candidateDate);
    const contextual = getContextualPool(hadiths, context);
    const selected =
      (contextual ? pickFirstUnused(contextual.pool, usedIds) : null) ??
      pickFirstUnused(dailyPool, usedIds) ??
      pickFirstUnused(sortedHadiths, usedIds) ??
      pickFromPool(sortedHadiths, context);
    const reason = contextual && contextual.pool.some((item) => item.id === selected.id)
      ? contextual.reason
      : 'daily_index';

    usedIds.add(selected.id);

    if (offset === targetIndex) {
      targetSelection = buildSelection(selected, reason, context);
    }
  }

  return targetSelection;
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
  const campaignSelection = selectCampaignHadith(hadiths, date);
  if (campaignSelection) {
    return campaignSelection;
  }

  const specialDayPool = getPrioritySpecialDayPool(hadiths, context);
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
