/**
 * Islamic Calendar Screen
 * Shows Hijri Qamari (lunar) and Hijri Shamsi (solar) calendars with distinct themes
 */

import CenteredText from '@/components/CenteredText';
import { BorderRadius, Spacing, Typography } from '@/constants/theme';
import { useApp } from '@/context/AppContext';
import { usePrayer } from '@/context/PrayerContext';
import {
  AFGHAN_SOLAR_MONTHS,
  formatAfghanSolarHijriDate,
} from '@/utils/afghanSolarHijri';
import {
  loadCalendarNotificationPreferences,
  saveCalendarNotificationPreferences,
  scheduleCalendarNotifications,
} from '@/utils/calendarNotifications';
import {
  formatHijriDate,
  getNextSpecialDay,
  HIJRI_MONTHS,
  SPECIAL_DAYS,
} from '@/utils/islamicCalendar';
import { getCalendarMonthGridMeta } from '@/utils/calendarMonthGrid';
import { getCalendarTruth } from '@/utils/calendarTruth';
import { toArabicNumerals } from '@/utils/numbers';
import { MaterialIcons } from '@expo/vector-icons';
import { Stack } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

// Theme colors for each calendar type
const QAMARI_COLOR = '#16a34a';
const SHAMSI_COLOR = '#D4AF37';

type CalendarMode = 'qamari' | 'shamsi';

interface CalendarCell {
  dayNum: number | null;
  isTodayCell: boolean;
  showSpecialHighlight: boolean;
}

export default function CalendarScreen() {
  const { theme } = useApp();
  const { state } = usePrayer();
  const todayTruth = getCalendarTruth();
  const todayHijri = state.hijriDate || todayTruth.hijri;
  const todayShamsi = todayTruth.shamsi;

  const [mode, setMode] = useState<CalendarMode>('qamari');
  const [selectedMonth, setSelectedMonth] = useState(todayHijri.month - 1);
  const [displayYearHijri, setDisplayYearHijri] = useState(todayHijri.year);
  const [displayYearShamsi, setDisplayYearShamsi] = useState(todayShamsi.year);
  const [calendarNotifEnabled, setCalendarNotifEnabled] = useState(false);
  const [notifLoading, setNotifLoading] = useState(false);
  const transitionLockRef = useRef(false);
  const contentOpacity = useSharedValue(1);
  const contentTranslateX = useSharedValue(0);

  // Sync selected month and year when switching modes
  useEffect(() => {
    if (mode === 'qamari') {
      setSelectedMonth(todayHijri.month - 1);
      setDisplayYearHijri(todayHijri.year);
    } else {
      setSelectedMonth(todayShamsi.month - 1);
      setDisplayYearShamsi(todayShamsi.year);
    }
  }, [mode, todayHijri.month, todayHijri.year, todayShamsi.month, todayShamsi.year]);

  useEffect(() => {
    loadCalendarNotificationPreferences().then((p) => setCalendarNotifEnabled(p.enabled));
  }, []);

  const handleCalendarNotifToggle = async (value: boolean) => {
    setNotifLoading(true);
    setCalendarNotifEnabled(value);
    await saveCalendarNotificationPreferences({ enabled: value });
    await scheduleCalendarNotifications(value);
    setNotifLoading(false);
  };

  const finishModeTransition = useCallback(() => {
    transitionLockRef.current = false;
  }, []);

  const applyMode = useCallback((nextMode: CalendarMode, direction: number) => {
    setMode(nextMode);
    contentOpacity.value = 0.35;
    contentTranslateX.value = direction * -18;

    requestAnimationFrame(() => {
      contentOpacity.value = withTiming(1, { duration: 180, easing: Easing.out(Easing.cubic) });
      contentTranslateX.value = withTiming(0, { duration: 220, easing: Easing.out(Easing.cubic) }, (finished) => {
        if (finished) {
          runOnJS(finishModeTransition)();
        }
      });
    });
  }, [contentOpacity, contentTranslateX, finishModeTransition]);

  const handleModeChange = useCallback((nextMode: CalendarMode) => {
    if (nextMode === mode || transitionLockRef.current) {
      return;
    }

    transitionLockRef.current = true;
    const direction = nextMode === 'shamsi' ? -1 : 1;
    contentOpacity.value = withTiming(0.55, { duration: 90, easing: Easing.out(Easing.quad) });
    contentTranslateX.value = withTiming(direction * 18, { duration: 90, easing: Easing.out(Easing.quad) }, (finished) => {
      if (finished) {
        runOnJS(applyMode)(nextMode, direction);
      }
    });
  }, [applyMode, contentOpacity, contentTranslateX, mode]);

  const transitionStyle = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
    transform: [{ translateX: contentTranslateX.value }],
  }));

  const monthInfo = useMemo(() => (
    mode === 'qamari' ? HIJRI_MONTHS[selectedMonth] : AFGHAN_SOLAR_MONTHS[selectedMonth]
  ), [mode, selectedMonth]);
  const { daysInMonth, firstDayOffset } = useMemo(() => getCalendarMonthGridMeta(
    mode,
    mode === 'qamari' ? displayYearHijri : displayYearShamsi,
    selectedMonth + 1,
  ), [displayYearHijri, displayYearShamsi, mode, selectedMonth]);

  const accentColor = mode === 'qamari' ? QAMARI_COLOR : SHAMSI_COLOR;
  // Persian/Afghan week order: شن (Sat), یک (Sun), دو (Mon), سه (Tue), چه (Wed), پن (Thu), جم (Fri)
  // JS getDay: 0=Sun, 1=Mon, ..., 6=Sat → columns: 0=Sat, 1=Sun, 2=Mon, 3=Tue, 4=Wed, 5=Thu, 6=Fri
  const weekDays = ['شن', 'یک', 'دو', 'سه', 'چه', 'پن', 'جم'];

  // Special days to show: future/today in month, or next upcoming if all past
  const specialDaysInMonthRaw = mode === 'qamari'
    ? SPECIAL_DAYS.filter(d => d.month === selectedMonth + 1)
    : [];
  const futureInMonth = specialDaysInMonthRaw.filter(
    d => d.month > todayHijri.month || (d.month === todayHijri.month && d.day >= todayHijri.day)
  );
  const specialDaysToShow = futureInMonth.length > 0
    ? futureInMonth
    : (mode === 'qamari' ? [getNextSpecialDay(todayHijri)].filter(Boolean) : []);
  const calendarRows = useMemo(() => {
    const totalCells = Math.ceil((firstDayOffset + daysInMonth) / 7) * 7;
    const numRows = totalCells / 7;
    const rows: CalendarCell[][] = [];

    for (let rowIndex = 0; rowIndex < numRows; rowIndex++) {
      const cells: CalendarCell[] = [];

      for (let columnIndex = 0; columnIndex < 7; columnIndex++) {
        const absoluteIndex = rowIndex * 7 + columnIndex;
        const dayNum = absoluteIndex >= firstDayOffset && absoluteIndex < firstDayOffset + daysInMonth
          ? absoluteIndex - firstDayOffset + 1
          : null;
        const isTodayCell = dayNum !== null && (mode === 'qamari'
          ? todayHijri.month === selectedMonth + 1 && todayHijri.day === dayNum
          : todayShamsi.month === selectedMonth + 1 && todayShamsi.day === dayNum);
        const specialDay = dayNum !== null && mode === 'qamari'
          ? SPECIAL_DAYS.find(d => d.month === selectedMonth + 1 && d.day === dayNum)
          : null;
        const isPastSpecial = Boolean(specialDay) && (
          selectedMonth + 1 < todayHijri.month ||
          (selectedMonth + 1 === todayHijri.month && dayNum! < todayHijri.day)
        );

        cells.push({
          dayNum,
          isTodayCell,
          showSpecialHighlight: Boolean(specialDay) && !isPastSpecial,
        });
      }

      rows.push(cells);
    }

    return rows;
  }, [daysInMonth, firstDayOffset, mode, selectedMonth, todayHijri.day, todayHijri.month, todayShamsi.day, todayShamsi.month]);

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]}>
      <Stack.Screen
        options={{
          title: 'تقویم اسلامی',
          headerStyle: { backgroundColor: theme.surahHeader },
          headerTintColor: '#fff',
        }}
      />

      {/* Tab: Qamari / Shamsi */}
      <View style={[styles.tabRow, { backgroundColor: theme.backgroundSecondary }]}>
        <Pressable
          onPress={() => handleModeChange('qamari')}
          style={[
            styles.tab,
            mode === 'qamari' && { backgroundColor: QAMARI_COLOR },
            mode === 'qamari' && styles.tabShadow,
          ]}
        >
          <CenteredText style={[styles.tabText, { color: mode === 'qamari' ? '#fff' : theme.text }]}>
            هجری قمری
          </CenteredText>
        </Pressable>
        <Pressable
          onPress={() => handleModeChange('shamsi')}
          style={[
            styles.tab,
            mode === 'shamsi' && { backgroundColor: SHAMSI_COLOR },
            mode === 'shamsi' && styles.tabShadow,
          ]}
        >
          <CenteredText style={[styles.tabText, { color: mode === 'shamsi' ? '#fff' : theme.text }]}>
            هجری شمسی
          </CenteredText>
        </Pressable>
      </View>

      <Animated.View style={transitionStyle}>
        {/* Today Card - both dates, accent by mode */}
        <View style={[
          styles.todayCard,
          { backgroundColor: accentColor },
          mode === 'qamari' ? styles.todayCardQamari : styles.todayCardShamsi,
        ]}>
          <CenteredText style={styles.todayLabel}>امروز</CenteredText>
          <CenteredText style={styles.todayDate}>
            {mode === 'qamari'
              ? formatHijriDate(todayHijri, 'dari')
              : formatAfghanSolarHijriDate(todayShamsi, 'dari')}
          </CenteredText>
          <CenteredText style={styles.todayYear}>
            {mode === 'qamari'
              ? `${toArabicNumerals(todayHijri.year)} هجری قمری`
              : `${toArabicNumerals(todayShamsi.year)} هجری شمسی`}
          </CenteredText>
          <CenteredText style={styles.todaySecondary}>
            {mode === 'qamari'
              ? formatAfghanSolarHijriDate(todayShamsi, 'dari') + ' شمسی'
              : formatHijriDate(todayHijri, 'dari') + ' قمری'}
          </CenteredText>
        </View>

        {/* Month Selector */}
        <View style={styles.monthSelector}>
          <Pressable
            onPress={() => {
              setSelectedMonth(prev => {
                const next = (prev - 1 + 12) % 12;
                if (prev === 0 && next === 11) {
                  if (mode === 'qamari') setDisplayYearHijri(y => y - 1);
                  else setDisplayYearShamsi(y => y - 1);
                }
                return next;
              });
            }}
            style={[styles.monthArrow, { backgroundColor: theme.card }]}
          >
            <MaterialIcons name="chevron-right" size={28} color={theme.icon} />
          </Pressable>
          <View style={styles.monthInfo}>
            <CenteredText style={[styles.monthNameDari, { color: theme.text }]}>
              {monthInfo.dari}
            </CenteredText>
            {mode === 'qamari' ? (
              <CenteredText style={[styles.monthNameArabic, { color: theme.textSecondary }]}>
                {HIJRI_MONTHS[selectedMonth].arabic}
              </CenteredText>
            ) : null}
          </View>
          <Pressable
            onPress={() => {
              setSelectedMonth(prev => {
                const next = (prev + 1) % 12;
                if (prev === 11 && next === 0) {
                  if (mode === 'qamari') setDisplayYearHijri(y => y + 1);
                  else setDisplayYearShamsi(y => y + 1);
                }
                return next;
              });
            }}
            style={[styles.monthArrow, { backgroundColor: theme.card }]}
          >
            <MaterialIcons name="chevron-left" size={28} color={theme.icon} />
          </Pressable>
        </View>

        {/* Calendar Grid - LTR to ensure correct column alignment (Sat-Sun) */}
        <View style={[
          styles.calendarCard,
          styles.calendarCardLTR,
          { backgroundColor: theme.card, borderColor: theme.cardBorder },
          mode === 'qamari' ? styles.calendarCardQamari : styles.calendarCardShamsi,
        ]}>
          {/* Week Header - explicit LTR for correct column alignment */}
          <View style={[styles.weekHeader, styles.gridLTR]}>
            {weekDays.map((day, index) => (
              <View key={index} style={styles.weekDay}>
                <CenteredText style={[styles.weekDayText, { color: theme.textSecondary }]}>
                  {day}
                </CenteredText>
              </View>
            ))}
          </View>

          {/* Days Grid - explicit row-based layout for correct column alignment */}
          <View style={styles.daysGrid}>
            {calendarRows.map((row, rowIndex) => (
              <View key={rowIndex} style={[styles.daysRow, styles.gridLTR]}>
                {row.map((cell, columnIndex) => (
                  <View
                    key={columnIndex}
                    style={[
                      styles.dayCell,
                      cell.isTodayCell && { backgroundColor: accentColor },
                      cell.showSpecialHighlight && !cell.isTodayCell && { backgroundColor: `${accentColor}20` },
                    ]}
                  >
                    {cell.dayNum !== null ? (
                      <>
                        <CenteredText
                          style={[
                            styles.dayNumber,
                            { color: cell.isTodayCell ? '#fff' : theme.text },
                            cell.showSpecialHighlight && !cell.isTodayCell && { color: accentColor },
                          ]}
                        >
                          {toArabicNumerals(cell.dayNum)}
                        </CenteredText>
                        {cell.showSpecialHighlight && (
                          <View style={[styles.dayDot, { backgroundColor: cell.isTodayCell ? '#fff' : accentColor }]} />
                        )}
                      </>
                    ) : null}
                  </View>
                ))}
              </View>
            ))}
          </View>
        </View>

        {/* Notification Toggle - Qamari only */}
        <View style={[styles.section, styles.notifSection]}>
          <View style={[styles.notifCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
            <View style={styles.notifRow}>
              <MaterialIcons name="notifications" size={24} color={calendarNotifEnabled ? QAMARI_COLOR : theme.icon} />
              <View style={styles.notifTextWrap}>
                <CenteredText style={[styles.notifTitle, { color: theme.text }]}>
                  اعلان مناسبت‌های قمری
                </CenteredText>
                <CenteredText style={[styles.notifDesc, { color: theme.textSecondary }]}>
                  نیم روز قبل از هر مناسبت مهم
                </CenteredText>
              </View>
              <Switch
                disabled={notifLoading}
                value={calendarNotifEnabled}
                onValueChange={handleCalendarNotifToggle}
                trackColor={{ false: theme.cardBorder, true: `${QAMARI_COLOR}60` }}
                thumbColor={calendarNotifEnabled ? QAMARI_COLOR : theme.icon}
              />
            </View>
          </View>
        </View>

        {/* Special Days in Month - Qamari only */}
        {specialDaysToShow.length > 0 && (
          <View style={styles.section}>
            <CenteredText style={[styles.sectionTitle, { color: theme.textSecondary }]}>
              {futureInMonth.length > 0 ? `مناسبت‌های ${monthInfo.dari}` : 'مناسبت مهم بعدی'}
            </CenteredText>
            {specialDaysToShow.map((day, index) => {
              if (!day) return null;
              return (
                <View
                  key={index}
                  style={[styles.specialDayCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}
                >
                  <View style={[styles.specialDayDate, { backgroundColor: QAMARI_COLOR }]}>
                    <CenteredText style={styles.specialDayNum}>{toArabicNumerals(day.day)}</CenteredText>
                  </View>
                  <View style={styles.specialDayInfo}>
                    <CenteredText style={[styles.specialDayName, { color: theme.text }]}>
                      {day.nameDari}
                      {day.month !== selectedMonth + 1 && ` (${HIJRI_MONTHS[day.month - 1].dari})`}
                    </CenteredText>
                    <CenteredText style={[styles.specialDayDesc, { color: theme.textSecondary }]} numberOfLines={2}>
                      {day.descriptionDari}
                    </CenteredText>
                    <View style={styles.specialDayTags}>
                      {day.isFasting && (
                        <View style={[styles.tag, { backgroundColor: `${theme.bookmark}20` }]}>
                          <CenteredText style={[styles.tagText, { color: theme.bookmark }]}>روزه</CenteredText>
                        </View>
                      )}
                      {day.isEid && (
                        <View style={[styles.tag, { backgroundColor: '#F59E0B20' }]}>
                          <CenteredText style={[styles.tagText, { color: '#F59E0B' }]}>عید</CenteredText>
                        </View>
                      )}
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* Worship Guide */}
        {specialDaysToShow.length > 0 && (
          <View style={styles.section}>
            <CenteredText style={[styles.sectionTitle, { color: theme.textSecondary }]}>
              راهنمای عبادت
            </CenteredText>
            {specialDaysToShow.slice(0, 3).map((day, index) => {
              if (!day) return null;
              return (
                <View
                  key={index}
                  style={[styles.worshipCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}
                >
                  <CenteredText style={[styles.worshipTitle, { color: theme.text }]}>
                    {day.nameDari}
                  </CenteredText>
                  <View style={styles.worshipList}>
                    {day.worshipDari.map((worship, itemIndex) => (
                      <View key={itemIndex} style={styles.worshipItem}>
                        <MaterialIcons name="check-circle" size={16} color={QAMARI_COLOR} />
                        <CenteredText style={[styles.worshipText, { color: theme.text }]}>
                          {worship}
                        </CenteredText>
                      </View>
                    ))}
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </Animated.View>

      <View style={styles.bottomPadding} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  tabRow: {
    flexDirection: 'row',
    marginHorizontal: Spacing.md,
    marginTop: Spacing.md,
    padding: 4,
    borderRadius: BorderRadius.lg,
    gap: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabShadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  tabText: {
    fontSize: Typography.ui.body,
    fontWeight: '600',
  },
  todayCard: {
    marginHorizontal: Spacing.md,
    marginTop: Spacing.md,
    padding: Spacing.lg,
    borderRadius: BorderRadius.xl,
    alignItems: 'center',
  },
  todayCardQamari: {
    shadowColor: QAMARI_COLOR,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  todayCardShamsi: {
    shadowColor: SHAMSI_COLOR,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  todaySecondary: {
    fontSize: Typography.ui.caption,
    color: 'rgba(255,255,255,0.85)',
    marginTop: Spacing.xs,
  },
  todayLabel: {
    fontSize: Typography.ui.caption,
    color: 'rgba(255,255,255,0.8)',
  },
  todayDate: {
    fontSize: Typography.ui.heading,
    fontWeight: '700',
    color: '#fff',
    marginTop: Spacing.xs,
  },
  todayYear: {
    fontSize: Typography.ui.body,
    color: 'rgba(255,255,255,0.9)',
    marginTop: Spacing.xs,
  },
  monthSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.lg,
    paddingHorizontal: Spacing.md,
    gap: Spacing.lg,
  },
  monthArrow: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  monthInfo: {
    alignItems: 'center',
  },
  monthNameDari: {
    fontSize: Typography.ui.title,
    fontWeight: '700',
  },
  monthNameArabic: {
    fontSize: Typography.ui.body,
    marginTop: 2,
  },
  calendarCard: {
    marginHorizontal: Spacing.md,
    marginTop: Spacing.lg,
    padding: Spacing.md,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
  },
  calendarCardLTR: {
    direction: 'ltr' as const,
  },
  gridLTR: {
    direction: 'ltr' as const,
  },
  daysRow: {
    flexDirection: 'row',
    width: '100%',
  },
  calendarCardQamari: {
    shadowColor: QAMARI_COLOR,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
  },
  calendarCardShamsi: {
    shadowColor: SHAMSI_COLOR,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
  },
  weekHeader: {
    flexDirection: 'row',
    marginBottom: Spacing.sm,
  },
  weekDay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm,
  },
  weekDayText: {
    fontSize: Typography.ui.caption,
    fontWeight: '600',
  },
  daysGrid: {
    gap: 0,
  },
  dayCell: {
    flex: 1,
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  dayNumber: {
    fontSize: Typography.ui.body,
    fontWeight: '500',
  },
  dayDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginTop: 2,
  },
  section: {
    marginTop: Spacing.xl,
    paddingHorizontal: Spacing.md,
  },
  notifSection: {
    marginTop: Spacing.lg,
  },
  notifCard: {
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
  },
  notifRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  notifTextWrap: {
    flex: 1,
    alignItems: 'flex-end',
  },
  notifTitle: {
    fontSize: Typography.ui.body,
    fontWeight: '600',
    textAlign: 'right',
  },
  notifDesc: {
    fontSize: Typography.ui.caption,
    marginTop: 2,
    textAlign: 'right',
  },
  sectionTitle: {
    fontSize: Typography.ui.caption,
    fontWeight: '600',
    marginBottom: Spacing.md,
    paddingRight: Spacing.sm,
    textTransform: 'uppercase',
  },
  specialDayCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginBottom: Spacing.sm,
    gap: Spacing.md,
  },
  specialDayDate: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  specialDayNum: {
    fontSize: Typography.ui.subtitle,
    fontWeight: '700',
    color: '#fff',
  },
  specialDayInfo: {
    flex: 1,
    alignItems: 'flex-end',
  },
  specialDayName: {
    fontSize: Typography.ui.body,
    fontWeight: '600',
  },
  specialDayDesc: {
    fontSize: Typography.ui.caption,
    marginTop: Spacing.xs,
    lineHeight: 20,
  },
  specialDayTags: {
    flexDirection: 'row',
    gap: Spacing.xs,
    marginTop: Spacing.sm,
  },
  tag: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  tagText: {
    fontSize: 11,
    fontWeight: '600',
  },
  worshipCard: {
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginBottom: Spacing.sm,
  },
  worshipTitle: {
    fontSize: Typography.ui.body,
    fontWeight: '600',
    marginBottom: Spacing.sm,
  },
  worshipList: {
    gap: Spacing.xs,
  },
  worshipItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  worshipText: {
    fontSize: Typography.ui.caption,
    flex: 1,
  },
  bottomPadding: {
    height: 40,
  },
});
