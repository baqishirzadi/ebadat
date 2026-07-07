import { MaterialIcons } from '@expo/vector-icons';
import React, { memo, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, InteractionManager, Pressable, StyleSheet, Text, View } from 'react-native';

import { RtlText } from '@/components/ui/RtlText';
import { RtlView } from '@/components/ui/RtlView';
import { BorderRadius, Spacing, Typography } from '@/constants/theme';
import { useApp } from '@/context/AppContext';
import { useTodayCalendar } from '@/hooks/useTodayCalendar';
import { AFGHAN_SOLAR_MONTHS } from '@/utils/afghanSolarHijri';
import { addDaysToKabulDate, getKabulDateParts, getKabulNoon } from '@/utils/afghanistanCalendar';
import { getCalendarMonthGridMeta, type CalendarGridMode } from '@/utils/calendarMonthGrid';
import { gregorianToAfghanSolarHijri } from '@/utils/afghanSolarHijri';
import { gregorianToHijri, hijriToGregorian, HIJRI_MONTHS, SPECIAL_DAYS } from '@/utils/islamicCalendar';
import { shamsiToGregorian } from '@/utils/afghanSolarHijri';
import { toArabicNumerals } from '@/utils/numbers';

const WEEKDAY_HEADERS = ['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج'];
const FRIDAY_COLUMN = 6;
const EVENT_COLOR = '#DC2626';

const GREG_MONTHS_FA = [
  'جنوری', 'فبروری', 'مارچ', 'اپریل', 'می', 'جون',
  'جولای', 'اگست', 'سپتمبر', 'اکتوبر', 'نومبر', 'دسمبر',
];

type DayCellData = { day: number; secondary?: string; isToday: boolean; isEvent: boolean; gregorianDate: Date } | null;

const CELL_CACHE = new Map<string, DayCellData[]>();

function addMonths(year: number, month: number, offset: number): { year: number; month: number } {
  const total = year * 12 + (month - 1) + offset;
  return { year: Math.floor(total / 12), month: (total % 12) + 1 };
}

function monthStartGreg(mode: CalendarGridMode, year: number, month: number): Date | null {
  if (mode === 'qamari') return hijriToGregorian(year, month, 1);
  if (mode === 'shamsi') return shamsiToGregorian(year, month, 1);
  return getKabulNoon(new Date(Date.UTC(year, month - 1, 1, 12, 0, 0)));
}

function isSpecialHijri(month: number, day: number): boolean {
  return SPECIAL_DAYS.some((d) => d.month === month && d.day === day);
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
      items.push({ day, isToday: false, isEvent: false, gregorianDate: getKabulNoon(new Date()) });
    }
    CELL_CACHE.set(cacheKey, items);
    return items;
  }

  for (let day = 1; day <= meta.daysInMonth; day++) {
    const greg = addDaysToKabulDate(startGreg, day - 1);
    let isToday = false;
    let secondary: string | undefined;
    let isEvent = false;

    if (mode === 'shamsi') {
      const shamsi = gregorianToAfghanSolarHijri(greg);
      isToday = `${shamsi.year}-${shamsi.month}-${shamsi.day}` === todayKey.shamsi;
      const hijri = gregorianToHijri(greg);
      secondary = toArabicNumerals(hijri.day);
      isEvent = isSpecialHijri(hijri.month, hijri.day);
    } else if (mode === 'qamari') {
      const hijri = gregorianToHijri(greg);
      isToday = `${hijri.year}-${hijri.month}-${hijri.day}` === todayKey.hijri;
      const shamsi = gregorianToAfghanSolarHijri(greg);
      secondary = toArabicNumerals(shamsi.day);
      isEvent = isSpecialHijri(hijri.month, hijri.day);
    } else {
      const parts = getKabulDateParts(greg);
      isToday = parts.dateKey === todayKey.greg;
      const hijri = gregorianToHijri(greg);
      secondary = toArabicNumerals(hijri.day);
      isEvent = isSpecialHijri(hijri.month, hijri.day);
    }

    items.push({ day, secondary, isToday, isEvent, gregorianDate: greg });
  }

  CELL_CACHE.set(cacheKey, items);
  return items;
}

interface GridDayCellProps {
  cell: DayCellData;
  column: number;
  onPress?: (date: Date) => void;
}

const GridDayCell = memo(function GridDayCell({ cell, column, onPress }: GridDayCellProps) {
  const { theme } = useApp();
  const isFriday = column === FRIDAY_COLUMN;

  const primaryColor = cell?.isToday
    ? '#fff'
    : isFriday
      ? EVENT_COLOR
      : theme.text;
  const secondaryColor = cell?.isToday
    ? 'rgba(255,255,255,0.85)'
    : isFriday
      ? EVENT_COLOR
      : theme.textSecondary;

  return (
    <View style={styles.cell}>
      {cell ? (
        <Pressable
          onPress={() => onPress?.(cell.gregorianDate)}
          style={({ pressed }) => [
            styles.dayCell,
            cell.isToday && styles.todayCell,
            cell.isToday && { backgroundColor: theme.tint },
            !cell.isToday && isFriday && { backgroundColor: `${EVENT_COLOR}14` },
            pressed && { opacity: 0.85 },
          ]}
        >
          <RtlText align="center" style={[styles.dayPrimary, { color: primaryColor }]}>
            {toArabicNumerals(cell.day)}
          </RtlText>
          {cell.secondary ? (
            <RtlText align="center" style={[styles.daySecondary, { color: secondaryColor }]}>
              {cell.secondary}
            </RtlText>
          ) : null}
          {cell.isEvent ? (
            <View
              style={[
                styles.eventDot,
                { backgroundColor: cell.isToday ? '#fff' : EVENT_COLOR },
              ]}
            />
          ) : null}
        </Pressable>
      ) : null}
    </View>
  );
});

interface MonthGridProps {
  mode: CalendarGridMode;
  onDayPress?: (date: Date) => void;
}

export function MonthGrid({ mode, onDayPress }: MonthGridProps) {
  const { theme } = useApp();
  const truth = useTodayCalendar();
  const [deferredMode, setDeferredMode] = useState(mode);
  const [isBuilding, setIsBuilding] = useState(false);
  const [monthOffset, setMonthOffset] = useState(0);

  useEffect(() => {
    if (mode === deferredMode) return;
    setIsBuilding(true);
    setMonthOffset(0);
    const task = InteractionManager.runAfterInteractions(() => {
      setDeferredMode(mode);
      setIsBuilding(false);
    });
    return () => task.cancel();
  }, [mode, deferredMode]);

  const { year, month, monthTitle, cells } = useMemo(() => {
    let baseYear = truth.hijri.year;
    let baseMonth = truth.hijri.month;
    if (deferredMode === 'shamsi') {
      baseYear = truth.shamsi.year;
      baseMonth = truth.shamsi.month;
    } else if (deferredMode === 'gregorian') {
      const parts = getKabulDateParts(truth.gregorianDate);
      baseYear = parts.year;
      baseMonth = parts.month;
    }

    const { year: y, month: m } = addMonths(baseYear, baseMonth, monthOffset);

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
  }, [deferredMode, monthOffset, truth]);

  return (
    <RtlView style={[styles.wrapper, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
      <RtlView style={styles.navRow}>
        <Pressable
          onPress={() => setMonthOffset((o) => o - 1)}
          hitSlop={8}
          style={[styles.navBtn, { backgroundColor: theme.backgroundSecondary }]}
        >
          <MaterialIcons name="chevron-right" size={22} color={theme.text} />
        </Pressable>
        <RtlText align="center" style={[styles.monthTitle, { color: theme.text }]}>
          {monthTitle}
        </RtlText>
        <Pressable
          onPress={() => setMonthOffset((o) => o + 1)}
          hitSlop={8}
          style={[styles.navBtn, { backgroundColor: theme.backgroundSecondary }]}
        >
          <MaterialIcons name="chevron-left" size={22} color={theme.text} />
        </Pressable>
      </RtlView>

      <RtlView style={styles.legendRow}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: EVENT_COLOR }]} />
          <RtlText align="center" style={[styles.legendText, { color: theme.textSecondary }]}>مناسبت اسلامی</RtlText>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: theme.tint }]} />
          <RtlText align="center" style={[styles.legendText, { color: theme.textSecondary }]}>امروز</RtlText>
        </View>
      </RtlView>

      <RtlView style={styles.weekHeader}>
        {WEEKDAY_HEADERS.map((d, i) => (
          <RtlText
            key={d}
            align="center"
            style={[
              styles.weekday,
              { color: i === FRIDAY_COLUMN ? EVENT_COLOR : theme.textSecondary },
            ]}
          >
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
              column={index % 7}
              onPress={onDayPress}
            />
          ))}
        </RtlView>
      )}

      {monthOffset !== 0 ? (
        <Pressable onPress={() => setMonthOffset(0)} style={styles.todayLink}>
          <RtlText align="center" style={{ color: theme.tint, fontFamily: 'Vazirmatn-Bold', fontSize: Typography.ui.caption }}>
            برو به امروز
          </RtlText>
        </Pressable>
      ) : null}
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
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  navBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthTitle: {
    flex: 1,
    fontFamily: 'Vazirmatn-Bold',
    fontSize: Typography.ui.body,
  },
  legendRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.sm,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontFamily: 'Vazirmatn',
    fontSize: 10,
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
    width: '100%',
    aspectRatio: 1,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 2,
  },
  todayCell: {
    borderWidth: 2,
    borderColor: '#D4AF37',
  },
  dayPrimary: {
    fontFamily: 'Vazirmatn-Bold',
    fontSize: 15,
  },
  daySecondary: {
    fontFamily: 'Vazirmatn',
    fontSize: 10,
    marginTop: 1,
  },
  eventDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    marginTop: 2,
  },
  loading: {
    minHeight: 200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  todayLink: {
    marginTop: Spacing.sm,
    alignItems: 'center',
  },
});
