import { useEffect, useMemo, useState } from 'react';

import {
  ensureDiyanetHijriMonth,
  gregorianToDisplayDiyanetHijri,
  subscribeDiyanetHijri,
} from '@/utils/diyanetHijri';
import { getUserHijriOffsetDays, subscribeHijriOffset } from '@/utils/hijriOffset';
import { addIstanbulCivilDays, getIstanbulDateParts } from '@/utils/istanbulCalendar';
import type { HijriDate } from '@/utils/islamicCalendar';

/** Diyanet Hijri for the Istanbul civil day, shifted by the user's moon-sighting correction. */
export function useDiyanetHijriDate(enabled = true): HijriDate {
  const [offsetDays, setOffsetDays] = useState(getUserHijriOffsetDays);
  const [revision, setRevision] = useState(0);
  const [dateKey, setDateKey] = useState(() => getIstanbulDateParts().dateKey);

  useEffect(() => subscribeHijriOffset(() => setOffsetDays(getUserHijriOffsetDays())), []);

  useEffect(() => subscribeDiyanetHijri(() => setRevision((value) => value + 1)), []);

  useEffect(() => {
    if (!enabled) return;
    const refresh = () => {
      const parts = getIstanbulDateParts();
      setDateKey(parts.dateKey);
      void ensureDiyanetHijriMonth(parts.year, parts.month);
      if (offsetDays !== 0) {
        const shifted = addIstanbulCivilDays(parts.year, parts.month, parts.day, offsetDays);
        if (shifted.year !== parts.year || shifted.month !== parts.month) {
          void ensureDiyanetHijriMonth(shifted.year, shifted.month);
        }
      }
    };
    refresh();
    const id = setInterval(refresh, 60_000);
    return () => clearInterval(id);
  }, [enabled, offsetDays]);

  return useMemo(
    () => gregorianToDisplayDiyanetHijri(new Date(), offsetDays),
    [dateKey, offsetDays, revision],
  );
}
