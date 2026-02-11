/**
 * Islamic Calendar Screen
 * Shows Hijri Qamari (lunar) and Hijri Shamsi (solar) calendars with distinct themes
 */

import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Pressable, Switch } from 'react-native';
import { Stack } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useApp } from '@/context/AppContext';
import { usePrayer } from '@/context/PrayerContext';
import {
  gregorianToHijri,
  formatHijriDate,
  HIJRI_MONTHS,
  SPECIAL_DAYS,
} from '@/utils/islamicCalendar';
import {
  gregorianToAfghanSolarHijri,
  formatAfghanSolarHijriDate,
  AFGHAN_SOLAR_MONTHS,
  getShamsiMonthLength,
} from '@/utils/afghanSolarHijri';
import {
  loadCalendarNotificationPreferences,
  saveCalendarNotificationPreferences,
  scheduleCalendarNotifications,
} from '@/utils/calendarNotifications';
import { Typography, Spacing, BorderRadius } from '@/constants/theme';
import CenteredText from '@/components/CenteredText';

// Theme colors for each calendar type
const QAMARI_COLOR = '#16a34a';
const SHAMSI_COLOR = '#D4AF37';

// Arabic number conversion
const toArabicNumber = (num: number): string => {
  const arabicNumerals = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  return num.toString().split('').map(d => arabicNumerals[parseInt(d)]).join('');
};

type CalendarMode = 'qamari' | 'shamsi';

export default function CalendarScreen() {
  const { theme } = useApp();
  const { state } = usePrayer();
  const today = new Date();
  const todayHijri = state.hijriDate || gregorianToHijri(today);
  const todayShamsi = gregorianToAfghanSolarHijri(today);

  const [mode, setMode] = useState<CalendarMode>('qamari');
  const [selectedMonth, setSelectedMonth] = useState(todayHijri.month - 1);
  const [calendarNotifEnabled, setCalendarNotifEnabled] = useState(false);
  const [notifLoading, setNotifLoading] = useState(false);

  // Sync selected month when switching modes
  useEffect(() => {
    if (mode === 'qamari') setSelectedMonth(todayHijri.month - 1);
    else setSelectedMonth(todayShamsi.month - 1);
  }, [mode, todayHijri.month, todayShamsi.month]);

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

  const monthInfo = mode === 'qamari'
    ? HIJRI_MONTHS[selectedMonth]
    : AFGHAN_SOLAR_MONTHS[selectedMonth];
  const specialDaysInMonth = mode === 'qamari'
    ? SPECIAL_DAYS.filter(day => day.month === selectedMonth + 1)
    : [];
  const daysInMonth = mode === 'qamari'
    ? 30
    : getShamsiMonthLength(mode === 'shamsi' ? todayShamsi.year : 1404, selectedMonth + 1);

  const accentColor = mode === 'qamari' ? QAMARI_COLOR : SHAMSI_COLOR;
  const weekDays = ['شن', 'جم', 'پن', 'چه', 'سه', 'دو', 'یک'];

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]}>
      <Stack.Screen
        options={{
          title: 'تقویم اسلامی',
          headerStyle: { backgroundColor: theme.surahHeader, borderBottomLeftRadius: 28, borderBottomRightRadius: 28, overflow: 'hidden' },
          headerTintColor: '#fff',
        }}
      />

      {/* Tab: Qamari / Shamsi */}
      <View style={[styles.tabRow, { backgroundColor: theme.backgroundSecondary }]}>
        <Pressable
          onPress={() => setMode('qamari')}
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
          onPress={() => setMode('shamsi')}
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
            ? `${toArabicNumber(todayHijri.year)} هجری قمری`
            : `${toArabicNumber(todayShamsi.year)} هجری شمسی`}
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
          onPress={() => setSelectedMonth(prev => (prev - 1 + 12) % 12)}
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
          onPress={() => setSelectedMonth(prev => (prev + 1) % 12)}
          style={[styles.monthArrow, { backgroundColor: theme.card }]}
        >
          <MaterialIcons name="chevron-left" size={28} color={theme.icon} />
        </Pressable>
      </View>

      {/* Calendar Grid */}
      <View style={[
        styles.calendarCard,
        { backgroundColor: theme.card, borderColor: theme.cardBorder },
        mode === 'qamari' ? styles.calendarCardQamari : styles.calendarCardShamsi,
      ]}>
        {/* Week Header */}
        <View style={styles.weekHeader}>
          {weekDays.map((day, index) => (
            <View key={index} style={styles.weekDay}>
              <CenteredText style={[styles.weekDayText, { color: theme.textSecondary }]}>
                {day}
              </CenteredText>
            </View>
          ))}
        </View>

        {/* Days Grid */}
        <View style={styles.daysGrid}>
          {[...Array(daysInMonth)].map((_, i) => {
            const dayNum = i + 1;
            const isTodayCell = mode === 'qamari'
              ? todayHijri.month === selectedMonth + 1 && todayHijri.day === dayNum
              : todayShamsi.month === selectedMonth + 1 && todayShamsi.day === dayNum;
            const specialDay = mode === 'qamari'
              ? SPECIAL_DAYS.find(d => d.month === selectedMonth + 1 && d.day === dayNum)
              : null;

            return (
              <View
                key={i}
                style={[
                  styles.dayCell,
                  isTodayCell && { backgroundColor: accentColor },
                  specialDay && !isTodayCell && { backgroundColor: `${accentColor}20` },
                ]}
              >
                <CenteredText
                  style={[
                    styles.dayNumber,
                    { color: isTodayCell ? '#fff' : theme.text },
                    specialDay && !isTodayCell && { color: accentColor },
                  ]}
                >
                  {toArabicNumber(dayNum)}
                </CenteredText>
                {specialDay && (
                  <View style={[styles.dayDot, { backgroundColor: isTodayCell ? '#fff' : accentColor }]} />
                )}
              </View>
            );
          })}
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
      {specialDaysInMonth.length > 0 && (
        <View style={styles.section}>
          <CenteredText style={[styles.sectionTitle, { color: theme.textSecondary }]}>
            مناسبت‌های {monthInfo.dari}
          </CenteredText>
          {specialDaysInMonth.map((day, index) => (
            <View
              key={index}
              style={[styles.specialDayCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}
            >
              <View style={[styles.specialDayDate, { backgroundColor: QAMARI_COLOR }]}>
                <CenteredText style={styles.specialDayNum}>{toArabicNumber(day.day)}</CenteredText>
              </View>
              <View style={styles.specialDayInfo}>
                <CenteredText style={[styles.specialDayName, { color: theme.text }]}>
                  {day.nameDari}
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
          ))}
        </View>
      )}

      {/* Worship Guide */}
      {specialDaysInMonth.length > 0 && (
        <View style={styles.section}>
          <CenteredText style={[styles.sectionTitle, { color: theme.textSecondary }]}>
            راهنمای عبادت
          </CenteredText>
          {specialDaysInMonth.slice(0, 3).map((day, index) => (
            <View
              key={index}
              style={[styles.worshipCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}
            >
              <CenteredText style={[styles.worshipTitle, { color: theme.text }]}>
                {day.nameDari}
              </CenteredText>
              <View style={styles.worshipList}>
                {day.worshipDari.map((worship, i) => (
                  <View key={i} style={styles.worshipItem}>
                    <MaterialIcons name="check-circle" size={16} color={QAMARI_COLOR} />
                    <CenteredText style={[styles.worshipText, { color: theme.text }]}>
                      {worship}
                    </CenteredText>
                  </View>
                ))}
              </View>
            </View>
          ))}
        </View>
      )}

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
    paddingVertical: Spacing.sm,
  },
  weekDayText: {
    fontSize: Typography.ui.caption,
    fontWeight: '600',
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: `${100 / 7}%`,
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
