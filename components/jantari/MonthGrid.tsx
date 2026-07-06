import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { BorderRadius, Spacing, Typography } from '@/constants/theme';
import { useApp } from '@/context/AppContext';
import { AFGHAN_SOLAR_MONTHS } from '@/utils/afghanSolarHijri';
import { shamsiToGregorian } from '@/utils/afghanSolarHijri';
import { getCalendarMonthGridMeta, type CalendarGridMode } from '@/utils/calendarMonthGrid';
import { getCalendarTruth } from '@/utils/calendarTruth';
import { gregorianToAfghanSolarHijri } from '@/utils/afghanSolarHijri';
import { gregorianToHijri, hijriToGregorian, HIJRI_MONTHS } from '@/utils/islamicCalendar';
import { toArabicNumerals } from '@/utils/numbers';

const WEEKDAY_HEADERS = ['ش', 'ج', 'پ', 'چ', 'س', 'د', 'ی'];

interface MonthGridProps {
  mode: CalendarGridMode;
  year: number;
  month: number;
  onModeChange: (mode: CalendarGridMode) => void;
  onMonthChange: (year: number, month: number) => void;
}

export function MonthGrid({ mode, year, month, onModeChange, onMonthChange }: MonthGridProps) {
  const { theme } = useApp();
  const today = getCalendarTruth();
  const meta = getCalendarMonthGridMeta(mode, year, month);

  const monthTitle = useMemo(() => {
    if (mode === 'qamari') return `${HIJRI_MONTHS[month - 1]?.dari ?? ''} ${toArabicNumerals(year)}`;
    if (mode === 'shamsi') return `${AFGHAN_SOLAR_MONTHS[month - 1]?.dari ?? ''} ${toArabicNumerals(year)}`;
    const months = ['جنوری', 'فبروری', 'مارچ', 'اپریل', 'می', 'جون', 'جولای', 'اگست', 'سپتمبر', 'اکتوبر', 'نومبر', 'دسمبر'];
    return `${months[month - 1]} ${toArabicNumerals(year)}`;
  }, [mode, month, year]);

  const cells = useMemo(() => {
    const items: Array<{ day: number; secondary?: string; isToday: boolean } | null> = [];
    for (let i = 0; i < meta.firstDayOffset; i++) items.push(null);
    for (let day = 1; day <= meta.daysInMonth; day++) {
      let isToday = false;
      let secondary: string | undefined;

      if (mode === 'shamsi') {
        isToday = today.shamsi.year === year && today.shamsi.month === month && today.shamsi.day === day;
        const greg = shamsiToGregorian(year, month, day);
        if (greg) {
          const hijri = gregorianToHijri(greg);
          secondary = toArabicNumerals(hijri.day);
        }
      } else if (mode === 'qamari') {
        isToday = today.hijri.year === year && today.hijri.month === month && today.hijri.day === day;
        const greg = hijriToGregorian(year, month, day);
        if (greg) {
          const shamsi = gregorianToAfghanSolarHijri(greg);
          secondary = toArabicNumerals(shamsi.day);
        }
      } else {
        const greg = new Date(year, month - 1, day);
        isToday =
          today.gregorianDate.getFullYear() === year &&
          today.gregorianDate.getMonth() + 1 === month &&
          today.gregorianDate.getDate() === day;
        const hijri = gregorianToHijri(greg);
        secondary = toArabicNumerals(hijri.day);
      }

      items.push({ day, secondary, isToday });
    }
    return items;
  }, [meta.daysInMonth, meta.firstDayOffset, mode, month, today, year]);

  return (
    <View style={[styles.wrapper, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
      <View style={styles.segment}>
        {(['qamari', 'shamsi', 'gregorian'] as CalendarGridMode[]).map((m) => (
          <Pressable
            key={m}
            onPress={() => onModeChange(m)}
            style={[styles.segmentBtn, { backgroundColor: mode === m ? theme.tint : 'transparent' }]}
          >
            <Text style={{ color: mode === m ? '#fff' : theme.textSecondary, fontFamily: 'Vazirmatn-Bold', fontSize: 12 }}>
              {m === 'qamari' ? 'قمری' : m === 'shamsi' ? 'شمسی' : 'میلادی'}
            </Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.monthNav}>
        <Pressable onPress={() => onMonthChange(month === 1 ? year - 1 : year, month === 1 ? 12 : month - 1)}>
          <Text style={{ color: theme.tint, fontFamily: 'Vazirmatn-Bold' }}>قبلی</Text>
        </Pressable>
        <Text style={[styles.monthTitle, { color: theme.text }]}>{monthTitle}</Text>
        <Pressable onPress={() => onMonthChange(month === 12 ? year + 1 : year, month === 12 ? 1 : month + 1)}>
          <Text style={{ color: theme.tint, fontFamily: 'Vazirmatn-Bold' }}>بعدی</Text>
        </Pressable>
      </View>

      <View style={styles.weekHeader}>
        {WEEKDAY_HEADERS.map((d) => (
          <Text key={d} style={[styles.weekday, { color: theme.textSecondary }]}>
            {d}
          </Text>
        ))}
      </View>

      <View style={styles.grid}>
        {cells.map((cell, index) => (
          <View key={index} style={styles.cell}>
            {cell ? (
              <View style={[styles.dayCell, cell.isToday && { backgroundColor: theme.tint }]}>
                <Text style={{ color: cell.isToday ? '#fff' : theme.text, fontFamily: 'Vazirmatn-Bold' }}>
                  {toArabicNumerals(cell.day)}
                </Text>
                {cell.secondary ? (
                  <Text style={{ color: cell.isToday ? '#fff' : theme.textSecondary, fontSize: 10 }}>
                    {cell.secondary}
                  </Text>
                ) : null}
              </View>
            ) : null}
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    padding: Spacing.sm,
  },
  segment: {
    flexDirection: 'row-reverse',
    backgroundColor: 'rgba(0,0,0,0.04)',
    borderRadius: BorderRadius.md,
    padding: 4,
    marginBottom: Spacing.sm,
  },
  segmentBtn: {
    flex: 1,
    borderRadius: BorderRadius.sm,
    paddingVertical: 8,
    alignItems: 'center',
  },
  monthNav: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
    paddingHorizontal: Spacing.xs,
  },
  monthTitle: {
    fontFamily: 'Vazirmatn-Bold',
    fontSize: Typography.ui.body,
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  weekHeader: {
    flexDirection: 'row-reverse',
    marginBottom: 4,
  },
  weekday: {
    width: `${100 / 7}%`,
    textAlign: 'center',
    fontFamily: 'Vazirmatn-Bold',
    fontSize: 11,
  },
  grid: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
  },
  cell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    padding: 2,
  },
  dayCell: {
    flex: 1,
    borderRadius: BorderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
