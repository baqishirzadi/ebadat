export const KABUL_TIME_ZONE = 'Asia/Kabul';
const KABUL_UTC_OFFSET_MINUTES = 270;
const KABUL_OFFSET_SUFFIX = '+04:30';

export interface KabulDateParts {
  year: number;
  month: number;
  day: number;
  weekday: number;
  dateKey: string;
}

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

function buildDateKey(year: number, month: number, day: number): string {
  return `${year}-${pad(month)}-${pad(day)}`;
}

function fallbackKabulDateParts(date: Date): KabulDateParts {
  const shifted = new Date(date.getTime() + KABUL_UTC_OFFSET_MINUTES * 60 * 1000);
  const year = shifted.getUTCFullYear();
  const month = shifted.getUTCMonth() + 1;
  const day = shifted.getUTCDate();

  return {
    year,
    month,
    day,
    weekday: shifted.getUTCDay(),
    dateKey: buildDateKey(year, month, day),
  };
}

export function getKabulDateParts(date: Date = new Date()): KabulDateParts {
  try {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: KABUL_TIME_ZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      weekday: 'short',
    });
    const parts = formatter.formatToParts(date);
    const lookup = (type: string) => parts.find((part) => part.type === type)?.value;
    const year = Number.parseInt(lookup('year') || '', 10);
    const month = Number.parseInt(lookup('month') || '', 10);
    const day = Number.parseInt(lookup('day') || '', 10);
    const weekdayLabel = lookup('weekday');

    const weekdayMap: Record<string, number> = {
      Sun: 0,
      Mon: 1,
      Tue: 2,
      Wed: 3,
      Thu: 4,
      Fri: 5,
      Sat: 6,
    };
    const weekday = weekdayLabel ? weekdayMap[weekdayLabel] : undefined;

    if (
      Number.isFinite(year) &&
      Number.isFinite(month) &&
      Number.isFinite(day) &&
      weekday !== undefined
    ) {
      return {
        year,
        month,
        day,
        weekday,
        dateKey: buildDateKey(year, month, day),
      };
    }
  } catch {
    // Fall back to Kabul's fixed UTC offset below.
  }

  return fallbackKabulDateParts(date);
}

export function getKabulDateKey(date: Date = new Date()): string {
  return getKabulDateParts(date).dateKey;
}

export function getKabulWeekdayIndex(date: Date = new Date()): number {
  return getKabulDateParts(date).weekday;
}

export function getKabulEpochDay(date: Date = new Date()): number {
  const { year, month, day } = getKabulDateParts(date);
  return Math.floor(Date.UTC(year, month - 1, day) / 86400000);
}

export function getKabulNoon(date: Date = new Date()): Date {
  const { year, month, day } = getKabulDateParts(date);
  return new Date(`${buildDateKey(year, month, day)}T12:00:00${KABUL_OFFSET_SUFFIX}`);
}

export function addDaysToKabulDate(date: Date, days: number): Date {
  const shifted = new Date(getKabulNoon(date));
  shifted.setUTCDate(shifted.getUTCDate() + days);
  return shifted;
}
