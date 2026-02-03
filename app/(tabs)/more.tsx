/**
 * More Screen / Dashboard
 * Shows stats, Islamic calendar, Ramadan, and additional features
 * All text in Dari - No English
 */

import React from 'react';
import { View, StyleSheet, ScrollView, Pressable } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useApp } from '@/context/AppContext';
import { useStats } from '@/context/StatsContext';
import { usePrayer } from '@/context/PrayerContext';
import { formatHijriDate, getUpcomingSpecialDays } from '@/utils/islamicCalendar';
import { Typography, Spacing, BorderRadius } from '@/constants/theme';
import CenteredText from '@/components/CenteredText';

// Arabic number conversion
const toArabicNumber = (num: number): string => {
  const arabicNumerals = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  return num.toString().split('').map(d => arabicNumerals[parseInt(d)]).join('');
};

export default function MoreScreen() {
  const { theme } = useApp();
  const { state: stats } = useStats();
  const { state: prayer } = usePrayer();
  const router = useRouter();

  const upcomingDays = prayer.hijriDate ? getUpcomingSpecialDays(prayer.hijriDate, 3) : [];

  // Stats cards
  const statsCards = [
    { icon: 'menu-book', label: 'آیات خوانده شده', value: stats.overall.totalAyahsRead, color: '#22C55E' },
    { icon: 'headphones', label: 'آیات شنیده شده', value: stats.overall.totalAyahsListened, color: '#3B82F6' },
    { icon: 'auto-awesome', label: 'اذکار', value: stats.overall.totalDhikrCount, color: '#F59E0B' },
    { icon: 'local-fire-department', label: 'روزهای متوالی', value: stats.overall.currentStreak, color: '#EF4444' },
  ];

  // Menu items
  const menuItems = [
    { icon: 'bookmark', label: 'نشانه‌های من', route: '/(tabs)/bookmarks', color: '#10B981' },
    { icon: 'school', label: 'آموزش نماز', route: '/(tabs)/prayer-learning', color: '#9C27B0' },
    { icon: 'favorite', label: 'دعای خیر و مشورت شرعی', route: '/dua-request', color: '#D4AF37' },
    { icon: 'article', label: 'مقالات', route: '/(tabs)/articles', color: '#2196F3' },
    { icon: 'calendar-today', label: 'تقویم اسلامی', route: '/calendar', color: '#6366F1' },
    { icon: 'nights-stay', label: 'برنامه رمضان', route: '/ramadan', color: '#8B5CF6' },
    { icon: 'explore', label: 'قبله‌نما', route: '/qibla', color: '#F59E0B' },
    { icon: 'settings', label: 'تنظیمات', route: '/(tabs)/settings', color: '#64748B' },
  ];

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.surahHeader }]}>
        <CenteredText style={styles.headerTitle}>بیشتر</CenteredText>
        {prayer.hijriDate && (
          <CenteredText style={styles.headerDate}>
            {formatHijriDate(prayer.hijriDate, 'dari')}
          </CenteredText>
        )}
      </View>

      {/* Stats Grid */}
      <View style={styles.section}>
        <CenteredText style={[styles.sectionTitle, { color: theme.textSecondary }]}>
          آمار شما
        </CenteredText>
        <View style={styles.statsGrid}>
          {statsCards.map((stat, index) => (
            <View
              key={index}
              style={[styles.statCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}
            >
              <View style={[styles.statIcon, { backgroundColor: `${stat.color}20` }]}>
                <MaterialIcons name={stat.icon as any} size={24} color={stat.color} />
              </View>
              <CenteredText style={[styles.statValue, { color: theme.text }]}>
                {toArabicNumber(stat.value)}
              </CenteredText>
              <CenteredText style={[styles.statLabel, { color: theme.textSecondary }]}>
                {stat.label}
              </CenteredText>
            </View>
          ))}
        </View>
      </View>

      {/* Today's Progress */}
      <View style={styles.section}>
        <CenteredText style={[styles.sectionTitle, { color: theme.textSecondary }]}>
          امروز
        </CenteredText>
        <View style={[styles.todayCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
          <View style={styles.todayRow}>
            <CenteredText style={[styles.todayLabel, { color: theme.text }]}>آیات خوانده شده</CenteredText>
            <CenteredText style={[styles.todayValue, { color: theme.tint }]}>
              {toArabicNumber(stats.daily.ayahsRead)}
            </CenteredText>
          </View>
          <View style={[styles.todayDivider, { backgroundColor: theme.divider }]} />
          <View style={styles.todayRow}>
            <CenteredText style={[styles.todayLabel, { color: theme.text }]}>اذکار</CenteredText>
            <CenteredText style={[styles.todayValue, { color: theme.tint }]}>
              {toArabicNumber(stats.daily.dhikrCount)}
            </CenteredText>
          </View>
          <View style={[styles.todayDivider, { backgroundColor: theme.divider }]} />
          <View style={styles.todayRow}>
            <CenteredText style={[styles.todayLabel, { color: theme.text }]}>دقیقه قرآن</CenteredText>
            <CenteredText style={[styles.todayValue, { color: theme.tint }]}>
              {toArabicNumber(stats.daily.quranMinutes)}
            </CenteredText>
          </View>
        </View>
      </View>

      {/* Upcoming Islamic Days */}
      {upcomingDays.length > 0 && (
        <View style={styles.section}>
          <CenteredText style={[styles.sectionTitle, { color: theme.textSecondary }]}>
            مناسبت‌های آینده
          </CenteredText>
          <View style={styles.upcomingList}>
            {upcomingDays.map((day, index) => (
              <View
                key={index}
                style={[styles.upcomingCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}
              >
                <View style={[styles.upcomingDate, { backgroundColor: theme.tint }]}>
                  <CenteredText style={styles.upcomingDay}>{toArabicNumber(day.day)}</CenteredText>
                </View>
                <View style={styles.upcomingInfo}>
                  <CenteredText style={[styles.upcomingName, { color: theme.text }]}>
                    {day.nameDari}
                  </CenteredText>
                  <CenteredText style={[styles.upcomingDesc, { color: theme.textSecondary }]} numberOfLines={1}>
                    {day.descriptionDari}
                  </CenteredText>
                </View>
                {day.isFasting && (
                  <MaterialIcons name="restaurant" size={20} color={theme.bookmark} />
                )}
                {day.isEid && (
                  <MaterialIcons name="celebration" size={20} color="#F59E0B" />
                )}
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Menu */}
      <View style={styles.section}>
        <CenteredText style={[styles.sectionTitle, { color: theme.textSecondary }]}>
          منو
        </CenteredText>
        <View style={styles.menuList}>
          {menuItems.map((item, index) => (
            <Pressable
              key={index}
              onPress={() => router.push(item.route as any)}
              style={({ pressed }) => [
                styles.menuItem,
                { backgroundColor: theme.card, borderColor: theme.cardBorder },
                pressed && styles.menuItemPressed,
              ]}
            >
              <View style={[styles.menuIcon, { backgroundColor: `${item.color}20` }]}>
                <MaterialIcons name={item.icon as any} size={24} color={item.color} />
              </View>
              <CenteredText style={[styles.menuLabel, { color: theme.text }]}>
                {item.label}
              </CenteredText>
              <MaterialIcons name="chevron-left" size={24} color={theme.icon} />
            </Pressable>
          ))}
        </View>
      </View>

      {/* Khatm Counter */}
      <View style={[styles.khatmCard, { backgroundColor: theme.card, borderColor: theme.tint }]}>
        <MaterialIcons name="auto-stories" size={32} color={theme.tint} />
        <View style={styles.khatmInfo}>
          <CenteredText style={[styles.khatmLabel, { color: theme.textSecondary }]}>ختم قرآن</CenteredText>
          <CenteredText style={[styles.khatmValue, { color: theme.text }]}>
            {toArabicNumber(stats.overall.khatmCount)} بار
          </CenteredText>
        </View>
      </View>

      <View style={styles.bottomPadding} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 60,
    paddingBottom: Spacing.lg,
    paddingHorizontal: Spacing.lg,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
  },
  headerDate: {
    fontSize: Typography.ui.body,
    color: 'rgba(255,255,255,0.8)',
    marginTop: Spacing.xs,
  },
  section: {
    marginTop: Spacing.lg,
    paddingHorizontal: Spacing.md,
  },
  sectionTitle: {
    fontSize: Typography.ui.caption,
    fontWeight: '600',
    marginBottom: Spacing.md,
paddingRight: Spacing.sm,
    textTransform: 'uppercase',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  statCard: {
    width: '48%',
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    alignItems: 'center',
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  statValue: {
    fontSize: Typography.ui.heading,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: Typography.ui.caption,
    marginTop: Spacing.xs,
    textAlign: 'center',
  },
  todayCard: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  todayRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.md,
  },
  todayLabel: {
    fontSize: Typography.ui.body,
  },
  todayValue: {
    fontSize: Typography.ui.subtitle,
    fontWeight: '700',
  },
  todayDivider: {
    height: 1,
    marginHorizontal: Spacing.md,
  },
  upcomingList: {
    gap: Spacing.sm,
  },
  upcomingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    gap: Spacing.md,
  },
  upcomingDate: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  upcomingDay: {
    fontSize: Typography.ui.subtitle,
    fontWeight: '700',
    color: '#fff',
  },
  upcomingInfo: {
    flex: 1,
    alignItems: 'flex-end',
  },
  upcomingName: {
    fontSize: Typography.ui.body,
    fontWeight: '600',
  },
  upcomingDesc: {
    fontSize: Typography.ui.caption,
    marginTop: 2,
  },
  menuList: {
    gap: Spacing.sm,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    gap: Spacing.md,
  },
  menuItemPressed: {
    opacity: 0.9,
  },
  menuIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuLabel: {
    flex: 1,
    fontSize: Typography.ui.body,
    fontWeight: '500',
},
  khatmCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: Spacing.md,
    marginTop: Spacing.xl,
    padding: Spacing.lg,
    borderRadius: BorderRadius.xl,
    borderWidth: 2,
    gap: Spacing.md,
  },
  khatmInfo: {
    flex: 1,
    alignItems: 'flex-end',
  },
  khatmLabel: {
    fontSize: Typography.ui.caption,
  },
  khatmValue: {
    fontSize: Typography.ui.title,
    fontWeight: '700',
  },
  bottomPadding: {
    height: 120,
  },
});
