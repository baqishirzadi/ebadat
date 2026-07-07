import React, { memo, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, InteractionManager, StyleSheet, View } from 'react-native';

import { RtlText } from '@/components/ui/RtlText';
import { RtlView } from '@/components/ui/RtlView';
import { BorderRadius, Spacing, Typography } from '@/constants/theme';
import { useApp } from '@/context/AppContext';
import { useTodayCalendar } from '@/hooks/useTodayCalendar';
import { AFGHAN_SOLAR_MONTHS } from '@/utils/afghanSolarHijri';
import { addDaysToKabulDate, getKabulDateParts, getKabulNoon } from '@/utils/afghanistanCalendar';
import { getCalendarMonthGridMeta, type CalendarGridMode } from '@/utils/calendarMonthGrid';
import { gregorianToAfghanSolarHijri } from '@/utils/afghanSolarHijri';
import { gregorianToHijri, hijriToGregorian, HIJRI_MONTHS } from '@/utils/islamicCalendar';
import { shamsiToGregorian } from '@/utils/afghanSolarHijri';
import { toArabicNumerals } from '@/utils/numbers';

const WEEKDAY_HEADERS = ['ش', 'ج', 'پ', 'چ', 'س', 'د', 'ی'];
const GREG_MONTHS_FA = [
  'جنوری', 'فبروری', 'مارچ', 'اپریل', 'می', 'جون',
  'جولای', 'اگست', 'سپتمبر', 'اکتوبر', 'نومبر', 'دسمبر',
];

type DayCellData = { day: number; secondary?: string; isToday: boolean } | null;

const CELL_CACHE = new Map<string, DayCellData[]>();

function monthStartGreg(mode: CalendarGridMode, year: number, month: number): Date | null {
  if (mode === 'qamari') return hijriToGregorian(year, month, 1);
  if (mode === 'shamsi') return shamsiToGregorian(year, month, 1);
  return getKabulNoon(new Date(Date.UTC(year, month - 1, 1, 12, 0, 0)));
}

function buildCells(
  mode: CalendarGridMode,
  year: number,
  month: number,
  todayKey: { shamsi: string; hijri: string; greg: string },
): DayCellData[] {
  const cacheKey = `${mode}:${year}:${month}:${todayKey.shamsi}:${todayKey.hijri}:${todayKey.greg}`;
  const cached = CELL_CACHE.get(cacheKey);
  if (cached) return cached;

  const meta = getCalendarMonthGridMeta(mode, year, month);
  const startGreg = monthStartGreg(mode, year, month);
  const items: DayCellData[] = [];

  for (let i = 0; i < meta.firstDayOffset; i++) items.push(null);

  if (!startGreg) {
    for (let day = 1; day <= meta.daysInMonth; day++) {
      items.push({ day, isToday: false });
    }
    CELL_CACHE.set(cacheKey, items);
    return items;
  }

  for (let day = 1; day <= meta.daysInMonth; day++) {
    const greg = addDaysToKabulDate(startGreg, day - 1);
    let isToday = false;
    let secondary: string | undefined;

    if (mode === 'shamsi') {
      const shamsi = gregorianToAfghanSolarHijri(greg);
      isToday = `${shamsi.year}-${shamsi.month}-${shamsi.day}` === todayKey.shamsi;
      const hijri = gregorianToHijri(greg);
      secondary = toArabicNumerals(hijri.day);
    } else if (mode === 'qamari') {
      const hijri = gregorianToHijri(greg);
      isToday = `${hijri.year}-${hijri.month}-${hijri.day}` === todayKey.hijri;
      const shamsi = gregorianToAfghanSolarHijri(greg);
      secondary = toArabicNumerals(shamsi.day);
    } else {
      const parts = getKabulDateParts(greg);
      isToday = parts.dateKey === todayKey.greg;
      const hijri = gregorianToHijri(greg);
      secondary = toArabicNumerals(hijri.day);
    }

    items.push({ day, secondary, isToday });
  }

  CELL_CACHE.set(cacheKey, items);
  return items;
}

interface GridDayCellProps {
  cell: DayCellData;
  mode: CalendarGridMode;
  year: number;
  month: number;
  index: number;
}

const GridDayCell = memo(function GridDayCell({ cell, mode, year, month, index }: GridDayCellProps) {
  const { theme } = useApp();

  return (
    <View style={styles.cell}>
      {cell ? (
        <View style={[styles.dayCell, cell.isToday && { backgroundColor: theme.tint }]}>
          <RtlText
            align="center"
            style={{
              color: cell.isToday ? '#fff' : theme.text,
              fontFamily: 'Vazirmatn-Bold',
              fontSize: 13,
            }}
          >
            {toArabicNumerals(cell.day)}
          </RtlText>
          {cell.secondary ? (
            <RtlText
              align="center"
              style={{ color: cell.isToday ? '#fff' : theme.textSecondary, fontSize: 10 }}
            >
              {cell.secondary}
            </RtlText>
          ) : null}
        </View>
      ) : null}
    </View>
  );
});

interface MonthGridProps {
  mode: CalendarGridMode;
}

export function MonthGrid({ mode }: MonthGridProps) {
  const { theme } = useApp();
  const truth = useTodayCalendar();
  const [deferredMode, setDeferredMode] = useState(mode);
  const [isBuilding, setIsBuilding] = useState(false);

  useEffect(() => {
    if (mode === deferredMode) return;
    setIsBuilding(true);
    const task = InteractionManager.runAfterInteractions(() => {
      setDeferredMode(mode);
      setIsBuilding(false);
    });
    return () => task.cancel();
  }, [mode, deferredMode]);

  const { year, month, monthTitle, cells } = useMemo(() => {
    let y = truth.hijri.year;
    let m = truth.hijri.month;
    if (deferredMode === 'shamsi') {
      y = truth.shamsi.year;
      m = truth.shamsi.month;
    } else if (deferredMode === 'gregorian') {
      const parts = getKabulDateParts(truth.gregorianDate);
      y = parts.year;
      m = parts.month;
    }

    const title =
      deferredMode === 'qamari'
        ? `${HIJRI_MONTHS[m - 1]?.dari ?? ''} ${toArabicNumerals(y)}`
        : deferredMode === 'shamsi'
          ? `${AFGHAN_SOLAR_MONTHS[m - 1]?.dari ?? ''} ${toArabicNumerals(y)}`
          : `${GREG_MONTHS_FA[m - 1]} ${toArabicNumerals(y)}`;

    const todayKey = {
      shamsi: `${truth.shamsi.year}-${truth.shamsi.month}-${truth.shamsi.day}`,
      hijri: `${truth.hijri.year}-${truth.hijri.month}-${truth.hijri.day}`,
      greg: getKabulDateParts(truth.gregorianDate).dateKey,
    };

    return {
      year: y,
      month: m,
      monthTitle: title,
      cells: buildCells(deferredMode, y, m, todayKey),
    };
  }, [deferredMode, truth]);

  return (
    <RtlView style={[styles.wrapper, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
      <RtlText align="center" style={[styles.monthTitle, { color: theme.text }]}>
        {monthTitle}
      </RtlText>

      <RtlView style={styles.weekHeader}>
        {WEEKDAY_HEADERS.map((d) => (
          <RtlText key={d} align="center" style={[styles.weekday, { color: theme.textSecondary }]}>
            {d}
          </RtlText>
        ))}
      </RtlView>

      {isBuilding ? (
        <RtlView style={styles.loading}>
          <ActivityIndicator size="small" color={theme.tint} />
        </RtlView>
      ) : (
        <RtlView style={styles.grid}>
          {cells.map((cell, index) => (
            <GridDayCell
              key={`cell-${deferredMode}-${year}-${month}-${index}`}
              cell={cell}
              mode={deferredMode}
              year={year}
              month={month}
              index={index}
            />
          ))}
        </RtlView>
      )}
    </RtlView>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
  },
  monthTitle: {
    fontFamily: 'Vazirmatn-Bold',
    fontSize: Typography.ui.body,
    marginBottom: Spacing.sm,
  },
  weekHeader: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  weekday: {
    width: `${100 / 7}%` as `${number}%`,
    fontFamily: 'Vazirmatn-Bold',
    fontSize: 11,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  cell: {
    width: `${100 / 7}%` as `${number}%`,
    aspectRatio: 1,
    padding: 2,
  },
  dayCell: {
    flex: 1,
    borderRadius: BorderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loading: {
    minHeight: 200,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
