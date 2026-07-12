import { MaterialIcons } from '@expo/vector-icons';
import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  InteractionManager,
  LayoutChangeEvent,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { RtlText } from '@/components/ui/RtlText';
import { RtlView } from '@/components/ui/RtlView';
import { BorderRadius, Spacing, Typography } from '@/constants/theme';
import { useApp } from '@/context/AppContext';
import { useTodayCalendar } from '@/hooks/useTodayCalendar';
import { AFGHAN_SOLAR_MONTHS } from '@/utils/afghanSolarHijri';
import { addDaysToKabulDate, getKabulDateParts, getKabulNoon } from '@/utils/afghanistanCalendar';
import { getCalendarMonthGridMeta, type CalendarGridMode } from '@/utils/calendarMonthGrid';
import { gregorianToAfghanSolarHijri } from '@/utils/afghanSolarHijri';
import { getDayEventTypeFromParts, type DayEventType } from '@/utils/calendarEvents';
import { debugLog } from '@/utils/debugLog';
import { gregorianToHijri, hijriToGregorian, HIJRI_MONTHS } from '@/utils/islamicCalendar';
import { shamsiToGregorian } from '@/utils/afghanSolarHijri';
import { toArabicNumerals } from '@/utils/numbers';

const WEEKDAY_HEADERS = ['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج'];
const FRIDAY_COLUMN = 6;

const GREG_MONTHS_FA = [
  'جنوری', 'فبروری', 'مارچ', 'اپریل', 'می', 'جون',
  'جولای', 'اگست', 'سپتمبر', 'اکتوبر', 'نومبر', 'دسمبر',
];

type DayCellData = {
  day: number;
  secondary?: string;
  isToday: boolean;
  eventType: DayEventType | null;
  gregorianDate: Date;
} | null;

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
function appendDayCell(
  items: DayCellData[],
  mode: CalendarGridMode,
  day: number,
  startGreg: Date,
  todayKey: { shamsi: string; hijri: string; greg: string },
): void {
  const greg = addDaysToKabulDate(startGreg, day - 1);
  const hijri = gregorianToHijri(greg);
  const shamsi = gregorianToAfghanSolarHijri(greg);
  let isToday = false;
  let secondary: string | undefined;
  const eventType = getDayEventTypeFromParts(hijri.month, hijri.day, shamsi.month, shamsi.day);

  if (mode === 'shamsi') {
    isToday = `${shamsi.year}-${shamsi.month}-${shamsi.day}` === todayKey.shamsi;
    secondary = toArabicNumerals(hijri.day);
  } else if (mode === 'qamari') {
    isToday = `${hijri.year}-${hijri.month}-${hijri.day}` === todayKey.hijri;
    secondary = toArabicNumerals(shamsi.day);
  } else {
    const parts = getKabulDateParts(greg);
    isToday = parts.dateKey === todayKey.greg;
    secondary = toArabicNumerals(hijri.day);
  }

  items.push({ day, secondary, isToday, eventType, gregorianDate: greg });
}

function scheduleBuildCells(
  mode: CalendarGridMode,
  year: number,
  month: number,
  todayKey: { shamsi: string; hijri: string; greg: string },
  onComplete: (cells: DayCellData[]) => void,
): () => void {
  const cacheKey = `${mode}:${year}:${month}:${todayKey.shamsi}:${todayKey.hijri}:${todayKey.greg}`;
  const cached = CELL_CACHE.get(cacheKey);
  if (cached) {
    onComplete(cached);
    return () => {};
  }

  const meta = getCalendarMonthGridMeta(mode, year, month);
  const startGreg = monthStartGreg(mode, year, month);
  const items: DayCellData[] = [];
  for (let i = 0; i < meta.firstDayOffset; i++) items.push(null);

  let cancelled = false;
  let day = 1;
  let timer: ReturnType<typeof setTimeout> | null = null;

  const finish = () => {
    CELL_CACHE.set(cacheKey, items);
    if (!cancelled) onComplete(items);
  };

  const processChunk = () => {
    if (cancelled) return;

    if (!startGreg) {
      for (; day <= meta.daysInMonth; day++) {
        items.push({ day, isToday: false, eventType: null, gregorianDate: getKabulNoon(new Date()) });
      }
      finish();
      return;
    }

    const chunkEnd = Math.min(day + 6, meta.daysInMonth);
    for (; day <= chunkEnd; day++) {
      appendDayCell(items, mode, day, startGreg, todayKey);
    }

    if (day <= meta.daysInMonth) {
      timer = setTimeout(processChunk, 0);
    } else {
      finish();
    }
  };

  timer = setTimeout(processChunk, 0);

  return () => {
    cancelled = true;
    if (timer) clearTimeout(timer);
  };
}

interface GridDayCellProps {
  cell: DayCellData;
  column: number;
  colWidth: number;
  theme: ReturnType<typeof useApp>['theme'];
  onPress?: (date: Date) => void;
}

function eventAccentColor(eventType: DayEventType, theme: { tint: string; bookmark: string }): string {
  if (eventType === 'afghan') return theme.bookmark;
  if (eventType === 'islamic' || eventType === 'both') return theme.tint;
  return theme.tint;
}

function eventCellBackground(
  eventType: DayEventType | null,
  theme: { tint: string; bookmark: string },
): string | undefined {
  if (!eventType) return undefined;
  if (eventType === 'afghan') return `${theme.bookmark}22`;
  if (eventType === 'islamic' || eventType === 'both') return `${theme.tint}18`;
  return `${theme.tint}18`;
}

const GridDayCell = memo(function GridDayCell({ cell, column, colWidth, theme, onPress }: GridDayCellProps) {
  const isFriday = column === FRIDAY_COLUMN;

  const eventBg = !cell?.isToday && cell?.eventType ? eventCellBackground(cell.eventType, theme) : undefined;
  const eventColor = cell?.eventType ? eventAccentColor(cell.eventType, theme) : undefined;

  const primaryColor = cell?.isToday
    ? '#fff'
    : cell?.eventType && eventColor
      ? eventColor
      : isFriday
        ? theme.textSecondary
        : theme.text;
  const secondaryColor = cell?.isToday
    ? 'rgba(255,255,255,0.85)'
    : isFriday
      ? theme.textSecondary
      : theme.textSecondary;

  return (
    <View style={[styles.cell, colWidth > 0 ? { width: colWidth } : null]}>
      {cell ? (
        <Pressable
          onPress={() => onPress?.(cell.gregorianDate)}
          style={({ pressed }) => [
            styles.dayCell,
            cell.isToday && styles.todayCell,
            cell.isToday && { backgroundColor: theme.tint, borderColor: theme.bookmark },
            !cell.isToday && eventBg && { backgroundColor: eventBg },
            !cell.isToday && !eventBg && isFriday && { backgroundColor: `${theme.tint}10` },
            pressed && { opacity: 0.85 },
          ]}
        >
          <RtlText
            align="center"
            style={[
              styles.dayPrimary,
              { color: primaryColor },
              cell.eventType && !cell.isToday && styles.eventDayPrimary,
            ]}
          >
            {toArabicNumerals(cell.day)}
          </RtlText>
          {cell.secondary ? (
            <RtlText align="center" style={[styles.daySecondary, { color: secondaryColor }]}>
              {cell.secondary}
            </RtlText>
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
  const [cells, setCells] = useState<DayCellData[]>([]);
  const [gridMeta, setGridMeta] = useState({ year: 0, month: 0, monthTitle: '' });
  const [gridInnerWidth, setGridInnerWidth] = useState(0);

  const colWidth = gridInnerWidth > 0 ? gridInnerWidth / 7 : 0;

  const handleGridLayout = useCallback((event: LayoutChangeEvent) => {
    const nextWidth = Math.floor(event.nativeEvent.layout.width);
    setGridInnerWidth((prev) => (prev === nextWidth ? prev : nextWidth));
  }, []);

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

  const todayKey = useMemo(
    () => ({
      shamsi: `${truth.shamsi.year}-${truth.shamsi.month}-${truth.shamsi.day}`,
      hijri: `${truth.hijri.year}-${truth.hijri.month}-${truth.hijri.day}`,
      greg: getKabulDateParts(truth.gregorianDate).dateKey,
    }),
    [truth],
  );

  useEffect(() => {
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

    setGridMeta({ year: y, month: m, monthTitle: title });
    setIsBuilding(true);

    let cancelled = false;
    const buildStart = Date.now();
    const cancelBuild = scheduleBuildCells(deferredMode, y, m, todayKey, (built) => {
      // #region agent log
      debugLog({
        location: 'MonthGrid.tsx:buildCells',
        message: 'grid built',
        data: {
          mode: deferredMode,
          year: y,
          month: m,
          cellCount: built.length,
          buildMs: Date.now() - buildStart,
        },
        hypothesisId: 'B',
      });
      // #endregion
      if (!cancelled) {
        setCells(built);
        setIsBuilding(false);
      }
    });

    return () => {
      cancelled = true;
      cancelBuild();
    };
  }, [deferredMode, monthOffset, todayKey, truth.gregorianDate, truth.hijri.month, truth.hijri.year, truth.shamsi.month, truth.shamsi.year]);

  const { year, month, monthTitle } = gridMeta;

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

      <View style={styles.gridLayout} onLayout={handleGridLayout}>
        <RtlView style={styles.weekHeader}>
          {WEEKDAY_HEADERS.map((d, i) => (
            <View
              key={i}
              style={[styles.weekdayCell, colWidth > 0 ? { width: colWidth } : styles.weekdayCellFlex]}
            >
              <Text
                style={[
                  styles.weekday,
                  { color: i === FRIDAY_COLUMN ? theme.textSecondary : theme.textSecondary },
                ]}
              >
                {d}
              </Text>
            </View>
          ))}
        </RtlView>

        {isBuilding ? (
          <View style={styles.loading}>
            <ActivityIndicator size="small" color={theme.tint} />
          </View>
        ) : (
          <RtlView style={styles.grid}>
            {cells.map((cell, index) => (
              <GridDayCell
                key={`cell-${deferredMode}-${year}-${month}-${index}`}
                cell={cell}
                column={index % 7}
                colWidth={colWidth}
                theme={theme}
                onPress={onDayPress}
              />
            ))}
          </RtlView>
        )}
      </View>

      <RtlView style={styles.legendRow}>
        <View style={styles.legendItem}>
          <View style={[styles.legendSwatch, { backgroundColor: `${theme.tint}18`, borderColor: theme.tint }]} />
          <RtlText align="center" style={[styles.legendText, { color: theme.textSecondary }]}>مناسبت اسلامی</RtlText>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendSwatch, { backgroundColor: `${theme.bookmark}22`, borderColor: theme.bookmark }]} />
          <RtlText align="center" style={[styles.legendText, { color: theme.textSecondary }]}>تعطیل ملی</RtlText>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendSwatch, { backgroundColor: theme.tint, borderColor: theme.bookmark, borderWidth: 2 }]} />
          <RtlText align="center" style={[styles.legendText, { color: theme.textSecondary }]}>امروز</RtlText>
        </View>
      </RtlView>

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
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
    paddingTop: Spacing.xs,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(0,0,0,0.08)',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendSwatch: {
    width: 14,
    height: 14,
    borderRadius: 4,
    borderWidth: 1,
  },
  legendText: {
    fontFamily: 'Vazirmatn',
    fontSize: 10,
  },
  gridLayout: {
    width: '100%',
    overflow: 'visible',
  },
  weekHeader: {
    flexDirection: 'row',
    width: '100%',
    marginBottom: 4,
  },
  weekdayCell: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekdayCellFlex: {
    flex: 1,
  },
  weekday: {
    fontFamily: 'Vazirmatn-Bold',
    fontSize: 11,
    textAlign: 'center',
    includeFontPadding: false,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: '100%',
  },
  cell: {
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
    position: 'relative',
  },
  todayCell: {
    borderWidth: 2,
  },
  dayPrimary: {
    fontFamily: 'Vazirmatn-Bold',
    fontSize: 15,
  },
  eventDayPrimary: {
    fontFamily: 'Vazirmatn-Bold',
  },
  daySecondary: {
    fontFamily: 'Vazirmatn',
    fontSize: 10,
    marginTop: 1,
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
