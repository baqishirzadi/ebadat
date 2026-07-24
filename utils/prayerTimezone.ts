/**
 * Timezone-aware date/time helpers for prayer schedules.
 * Intl.DateTimeFormat instances are cached per timezone — creating them on Hermes
 * (especially low-end Android) is extremely expensive.
 */

const FALLBACK_TZ_OFFSETS: Record<string, number> = {
  'Asia/Kabul': 270,
  'Europe/Istanbul': 180,
  'Asia/Tehran': 210,
};

type FormatterCache = {
  dateKey?: Intl.DateTimeFormat;
  offset?: Intl.DateTimeFormat;
  hour12?: Intl.DateTimeFormat;
  hour24?: Intl.DateTimeFormat;
  weekday?: Intl.DateTimeFormat;
};

const FORMATTER_CACHE = new Map<string, FormatterCache>();

function cacheFor(timeZone: string): FormatterCache {
  let entry = FORMATTER_CACHE.get(timeZone);
  if (!entry) {
    entry = {};
    FORMATTER_CACHE.set(timeZone, entry);
  }
  return entry;
}

function getDateKeyFormatter(timeZone: string): Intl.DateTimeFormat | null {
  const entry = cacheFor(timeZone);
  if (entry.dateKey) return entry.dateKey;
  try {
    entry.dateKey = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    return entry.dateKey;
  } catch {
    return null;
  }
}

function getOffsetFormatter(timeZone: string): Intl.DateTimeFormat | null {
  const entry = cacheFor(timeZone);
  if (entry.offset) return entry.offset;
  try {
    entry.offset = new Intl.DateTimeFormat('en-US', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
    return entry.offset;
  } catch {
    return null;
  }
}

function getHour12Formatter(timeZone: string): Intl.DateTimeFormat | null {
  const entry = cacheFor(timeZone);
  if (entry.hour12) return entry.hour12;
  try {
    entry.hour12 = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
    return entry.hour12;
  } catch {
    return null;
  }
}

function getHour24Formatter(timeZone: string): Intl.DateTimeFormat | null {
  const entry = cacheFor(timeZone);
  if (entry.hour24) return entry.hour24;
  try {
    entry.hour24 = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hour: 'numeric',
      minute: '2-digit',
      hour12: false,
    });
    return entry.hour24;
  } catch {
    return null;
  }
}

function getWeekdayFormatter(timeZone?: string): Intl.DateTimeFormat | null {
  const key = timeZone || '__device__';
  const entry = cacheFor(key);
  if (entry.weekday) return entry.weekday;
  try {
    entry.weekday = new Intl.DateTimeFormat('en-US', {
      timeZone: timeZone || undefined,
      weekday: 'short',
    });
    return entry.weekday;
  } catch {
    return null;
  }
}

export function getDateKeyInTimezone(date: Date, timeZone?: string): string {
  if (!timeZone) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  try {
    const dtf = getDateKeyFormatter(timeZone);
    if (!dtf) throw new Error('no-formatter');
    const parts = dtf.formatToParts(date);
    const lookup = (type: string) => parts.find((p) => p.type === type)?.value || '00';
    return `${lookup('year')}-${lookup('month')}-${lookup('day')}`;
  } catch {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
}

export function parseDateKey(dateKey: string): { year: number; month: number; day: number } {
  const [y, m, d] = dateKey.split('-').map((v) => parseInt(v, 10));
  return { year: y, month: m, day: d };
}

export function getTimezoneOffsetMinutes(timeZone: string | undefined, date: Date): number {
  if (!timeZone) return date.getTimezoneOffset() * -1;
  try {
    const dtf = getOffsetFormatter(timeZone);
    if (!dtf) throw new Error('no-formatter');
    const parts = dtf.formatToParts(date);
    const lookup = (type: string) => parts.find((p) => p.type === type)?.value || '00';
    const asUTC = new Date(
      `${lookup('year')}-${lookup('month')}-${lookup('day')}T${lookup('hour')}:${lookup('minute')}:${lookup('second')}Z`,
    );
    return Math.round((asUTC.getTime() - date.getTime()) / 60000);
  } catch {
    return FALLBACK_TZ_OFFSETS[timeZone] ?? date.getTimezoneOffset() * -1;
  }
}

/**
 * Build an absolute Date for a civil local clock time on dateKey in timeZone.
 * Prefer dateKey (YYYY-MM-DD) over the device calendar of `anchorDate`.
 */
export function buildDateFromLocalTimeInTimezone(
  dateKeyOrDate: string | Date,
  time: string,
  timeZone?: string,
): Date {
  const dateKey =
    typeof dateKeyOrDate === 'string'
      ? dateKeyOrDate
      : getDateKeyInTimezone(dateKeyOrDate, timeZone);
  const { year, month, day } = parseDateKey(dateKey);
  const [hh, mm] = time.split(':').map((v) => parseInt(v, 10));
  const anchor = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  const tzOffset = getTimezoneOffsetMinutes(timeZone, anchor);
  const utcMillis = Date.UTC(year, month - 1, day, hh, mm, 0) - tzOffset * 60 * 1000;
  return new Date(utcMillis);
}

export function addDaysToDateKey(dateKey: string, days: number): string {
  const { year, month, day } = parseDateKey(dateKey);
  const utc = new Date(Date.UTC(year, month - 1, day + days));
  const y = utc.getUTCFullYear();
  const m = String(utc.getUTCMonth() + 1).padStart(2, '0');
  const d = String(utc.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function format12HourInTimeZone(date: Date, timeZone?: string): string {
  if (!timeZone) {
    let hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    const minutesStr = minutes < 10 ? `0${minutes}` : String(minutes);
    return `${hours}:${minutesStr} ${ampm}`;
  }

  try {
    const dtf = getHour12Formatter(timeZone);
    if (!dtf) throw new Error('no-formatter');
    return dtf.format(date);
  } catch {
    return format12HourInTimeZone(date);
  }
}

export function getHoursMinutesInTimeZone(
  date: Date,
  timeZone?: string,
): { hours: number; minutes: number } {
  if (!timeZone) {
    return { hours: date.getHours(), minutes: date.getMinutes() };
  }
  try {
    const dtf = getHour24Formatter(timeZone);
    if (!dtf) throw new Error('no-formatter');
    const parts = dtf.formatToParts(date);
    const hours = parseInt(parts.find((p) => p.type === 'hour')?.value || '0', 10);
    const minutes = parseInt(parts.find((p) => p.type === 'minute')?.value || '0', 10);
    return { hours: hours === 24 ? 0 : hours, minutes };
  } catch {
    return { hours: date.getHours(), minutes: date.getMinutes() };
  }
}

export function nextLocalMidnightMs(now: Date, timeZone?: string): number {
  const todayKey = getDateKeyInTimezone(now, timeZone);
  const tomorrowKey = addDaysToDateKey(todayKey, 1);
  return buildDateFromLocalTimeInTimezone(tomorrowKey, '00:00', timeZone).getTime();
}

export function weekdayInTimezone(date: Date, timeZone?: string): number {
  // 0 = Sunday ... 5 = Friday
  try {
    const dtf = getWeekdayFormatter(timeZone);
    if (!dtf) throw new Error('no-formatter');
    const weekday = dtf.format(date);
    const map: Record<string, number> = {
      Sun: 0,
      Mon: 1,
      Tue: 2,
      Wed: 3,
      Thu: 4,
      Fri: 5,
      Sat: 6,
    };
    return map[weekday] ?? date.getDay();
  } catch {
    return date.getDay();
  }
}
