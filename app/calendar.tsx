/**
 * Islamic Calendar Screen
 * Shows Hijri calendar with special days
 */

import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Pressable } from 'react-native';
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
import { Typography, Spacing, BorderRadius } from '@/constants/theme';
import CenteredText from '@/components/CenteredText';

// Arabic number conversion
const toArabicNumber = (num: number): string => {
  const arabicNumerals = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  return num.toString().split('').map(d => arabicNumerals[parseInt(d)]).join('');
};

export default function CalendarScreen() {
  const { theme } = useApp();
  const { state } = usePrayer();
  const today = new Date();
  const todayHijri = state.hijriDate || gregorianToHijri(today);
  const [selectedMonth, setSelectedMonth] = useState(todayHijri.month - 1);

  const monthInfo = HIJRI_MONTHS[selectedMonth];
  const specialDaysInMonth = SPECIAL_DAYS.filter(day => day.month === selectedMonth + 1);

  // Generate days for the month (simplified - just show 30 days)
  const daysInMonth = 30;
  const weekDays = ['شن', 'جم', 'پن', 'چه', 'سه', 'دو', 'یک'];

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]}>
      <Stack.Screen
        options={{
          title: 'تقویم اسلامی',
          headerStyle: { backgroundColor: theme.surahHeader },
          headerTintColor: '#fff',
        }}
      />

      {/* Current Date */}
      <View style={[styles.todayCard, { backgroundColor: theme.tint }]}>
        <CenteredText style={styles.todayLabel}>امروز</CenteredText>
        <CenteredText style={styles.todayDate}>
          {formatHijriDate(todayHijri, 'dari')}
        </CenteredText>
        <CenteredText style={styles.todayYear}>{toArabicNumber(todayHijri.year)} هجری قمری</CenteredText>
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
          <CenteredText style={[styles.monthNameArabic, { color: theme.textSecondary }]}>
            {monthInfo.arabic}
          </CenteredText>
        </View>
        <Pressable
          onPress={() => setSelectedMonth(prev => (prev + 1) % 12)}
          style={[styles.monthArrow, { backgroundColor: theme.card }]}
        >
          <MaterialIcons name="chevron-left" size={28} color={theme.icon} />
        </Pressable>
      </View>

      {/* Calendar Grid */}
      <View style={[styles.calendarCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
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
            const isToday = todayHijri.month === selectedMonth + 1 && todayHijri.day === dayNum;
            const specialDay = SPECIAL_DAYS.find(
              d => d.month === selectedMonth + 1 && d.day === dayNum
            );

            return (
              <View
                key={i}
                style={[
                  styles.dayCell,
                  isToday && { backgroundColor: theme.tint },
                  specialDay && !isToday && { backgroundColor: `${theme.tint}15` },
                ]}
              >
                <CenteredText
                  style={[
                    styles.dayNumber,
                    { color: isToday ? '#fff' : theme.text },
                    specialDay && !isToday && { color: theme.tint },
                  ]}
                >
                  {toArabicNumber(dayNum)}
                </CenteredText>
                {specialDay && (
                  <View style={[styles.dayDot, { backgroundColor: isToday ? '#fff' : theme.tint }]} />
                )}
              </View>
            );
          })}
        </View>
      </View>

      {/* Special Days in Month */}
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
              <View style={[styles.specialDayDate, { backgroundColor: theme.tint }]}>
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
                    <MaterialIcons name="check-circle" size={16} color={theme.tint} />
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
  todayCard: {
    marginHorizontal: Spacing.md,
    marginTop: Spacing.md,
    padding: Spacing.lg,
    borderRadius: BorderRadius.xl,
    alignItems: 'center',
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
