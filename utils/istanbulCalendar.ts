export const ISTANBUL_TIME_ZONE = 'Europe/Istanbul';
const ISTANBUL_UTC_OFFSET_MINUTES = 180;
const ISTANBUL_OFFSET_SUFFIX = '+03:00';

export interface IstanbulDateParts {
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

function fallbackIstanbulDateParts(date: Date): IstanbulDateParts {
  const shifted = new Date(date.getTime() + ISTANBUL_UTC_OFFSET_MINUTES * 60 * 1000);
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

/** Civil calendar parts for Europe/Istanbul. Turkey has used UTC+3 year-round since 2016. */
export function getIstanbulDateParts(date: Date = new Date()): IstanbulDateParts {
  try {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: ISTANBUL_TIME_ZONE,
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
    // Fall back to Turkey's fixed UTC+3 offset below.
  }

  return fallbackIstanbulDateParts(date);
}

export function istanbulNoon(year: number, month: number, day: number): Date {
  return new Date(`${buildDateKey(year, month, day)}T12:00:00${ISTANBUL_OFFSET_SUFFIX}`);
}

export function addIstanbulCivilDays(
  year: number,
  month: number,
  day: number,
  delta: number,
): { year: number; month: number; day: number } {
  const shifted = new Date(Date.UTC(year, month - 1, day + delta));
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
  };
}

export function daysInGregorianMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}
