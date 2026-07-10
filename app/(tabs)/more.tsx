/**
 * More Screen / Dashboard
 * Dashboard-first hub for secondary features and personal progress
 */

import React, { useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, Pressable, InteractionManager, SectionList, Platform } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';

import CenteredText from '@/components/CenteredText';
import {
  CreatorCompanyCard,
  CreatorMessageCard,
  MoreHubRow,
  MoreHubTile,
  MoreSectionTitle,
} from '@/components/more';
import { BorderRadius, NAAT_GRADIENT, Spacing, Typography } from '@/constants/theme';
import { useApp } from '@/context/AppContext';
import { usePrayer } from '@/context/PrayerContext';
import { useStats } from '@/context/StatsContext';
import { gregorianToAfghanSolarHijri, formatAfghanSolarHijriDateWithPersianNumerals } from '@/utils/afghanSolarHijri';
import { getKabulDateParts, getKabulWeekdayIndex } from '@/utils/afghanistanCalendar';
import { getCalendarTruth } from '@/utils/calendarTruth';
import {
  formatEventDateLabel,
  formatEventDateParts,
  getEventCategoryColor,
  getUpcomingEvents,
} from '@/utils/calendarEvents';
import { formatHijriDate } from '@/utils/islamicCalendar';
import { toArabicNumerals } from '@/utils/numbers';

const WEEKDAY_DARI = ['یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه', 'شنبه'];
const GREGORIAN_MONTHS_DARI = [
  'جنوری',
  'فبروری',
  'مارچ',
  'اپریل',
  'می',
  'جون',
  'جولای',
  'اگست',
  'سپتمبر',
  'اکتوبر',
  'نومبر',
  'دسمبر',
];

type DeferredSectionKey = 'summary' | 'today' | 'upcoming' | 'support' | 'creatorMessage' | 'creatorCompany';

interface UpcomingDayCard {
  key: string;
  nameDari: string;
  descriptionDari: string;
  isFasting?: boolean;
  isEid?: boolean;
  dateLabel: string;
  dateDay: string;
  dateMonth?: string;
  weekdayLabel: string;
  badgeColor: string;
}

function formatGregorianDateDari(date: Date): string {
  const { day, month, year } = getKabulDateParts(date);
  return `${toArabicNumerals(day)} ${GREGORIAN_MONTHS_DARI[month - 1]} ${toArabicNumerals(year)}`;
}

export default function MoreScreen() {
  const { theme, themeMode } = useApp();
  const { dashboardSnapshot } = useStats();
  const { state: prayer } = usePrayer();
  const router = useRouter();
  const [showDeferredSections, setShowDeferredSections] = useState(false);
  const [upcomingCards, setUpcomingCards] = useState<UpcomingDayCard[]>([]);
  const truth = getCalendarTruth(new Date());
  const activeHijriDate = prayer.hijriDate ?? truth.hijri;
  const weekdayLabel = WEEKDAY_DARI[truth.weekday];
  const locationLabel = prayer.locationName?.trim() || 'کابل';
  const scheduleModeLabel =
    prayer.scheduleAudit?.scheduleMode === 'exact'
      ? 'اذان دقیق'
      : prayer.scheduleAudit?.scheduleMode === 'fallback'
        ? 'اذان عادی'
        : 'اذان آماده';

  useEffect(() => {
    if (Platform.OS === 'ios') {
      setShowDeferredSections(true);
      return;
    }

    const task = InteractionManager.runAfterInteractions(() => {
      setShowDeferredSections(true);
    });

    return () => {
      task.cancel();
    };
  }, []);

  useEffect(() => {
    if (!showDeferredSections) {
      setUpcomingCards([]);
      return;
    }

    let cancelled = false;
    const task = InteractionManager.runAfterInteractions(() => {
      const cards = getUpcomingEvents(truth.gregorianDate, 5).map((event) => {
        const dateParts = formatEventDateParts(event);
        return {
          key: event.id,
          nameDari: event.titleDari,
          descriptionDari: event.descriptionDari,
          isFasting: event.isFasting,
          isEid: event.isEid,
          dateLabel: formatEventDateLabel(event),
          dateDay: dateParts.day,
          dateMonth: dateParts.month,
          weekdayLabel: WEEKDAY_DARI[getKabulWeekdayIndex(event.gregorianDate)],
          badgeColor: getEventCategoryColor(event.category, theme),
        };
      });

      if (!cancelled) {
        setUpcomingCards(cards);
      }
    });

    return () => {
      cancelled = true;
      task.cancel();
    };
  }, [showDeferredSections, theme, truth.gregorianDate]);

  const quickActions = useMemo(() => [
    { icon: 'menu-book' as const, label: 'مفتی هوشمند حنفی', subtitle: 'سوال دینی و فقهی', route: '/mufti-chat' },
    { icon: 'auto-awesome' as const, label: 'اذکار', subtitle: 'اذکار روزانه', route: '/(tabs)/adhkar' },
    { icon: 'format-quote' as const, label: 'احادیث', subtitle: 'حدیث روز و جستجو', route: '/(tabs)/ahadith' },
    { icon: 'article' as const, label: 'مقالات', subtitle: 'مطالعه و مدیریت', route: '/(tabs)/articles' },
    { icon: 'calendar-today' as const, label: 'جنتری', subtitle: 'تقویم اسلامی', route: '/(tabs)/jantari' },
    { icon: 'explore' as const, label: 'قبله‌نما', subtitle: 'جهت قبله', route: '/qibla' },
    { icon: 'school' as const, label: 'آموزش نماز', subtitle: 'فقه و راهنما', route: '/(tabs)/prayer-learning' },
    { icon: 'bookmark' as const, label: 'نشانه‌های من', subtitle: 'موارد ذخیره‌شده', route: '/(tabs)/bookmarks' },
  ], []);

  const secondaryActions = useMemo(() => [
    { icon: 'access-alarm' as const, label: 'تنظیمات اذان', subtitle: 'زمان‌بندی و صدا', route: '/adhan-settings' },
    { icon: 'favorite' as const, label: 'دعای خیر و مشورت شرعی', subtitle: 'ارسال درخواست دعا', route: '/dua-request' },
    { icon: 'admin-panel-settings' as const, label: 'پنل مدیریت', subtitle: 'بخش مدیریتی', route: '/admin/login' },
    { icon: 'settings' as const, label: 'تنظیمات', subtitle: 'تم و ترجمه', route: '/settings' },
  ], []);

  const summaryCards = useMemo(() => [
    { icon: 'menu-book', label: 'آیات خوانده‌شده', value: dashboardSnapshot.summary.totalAyahsRead },
    { icon: 'hearing', label: 'آیات شنیده‌شده', value: dashboardSnapshot.summary.totalAyahsListened },
    { icon: 'bolt', label: 'بهترین پیوستگی', value: dashboardSnapshot.summary.longestStreak },
    { icon: 'auto-stories', label: 'ختم قرآن', value: dashboardSnapshot.summary.khatmCount },
  ], [
    dashboardSnapshot.summary.khatmCount,
    dashboardSnapshot.summary.longestStreak,
    dashboardSnapshot.summary.totalAyahsListened,
    dashboardSnapshot.summary.totalAyahsRead,
  ]);

  const todayRows = useMemo(() => [
    { label: 'آیات خوانده‌شده امروز', value: toArabicNumerals(dashboardSnapshot.today.ayahsRead) },
    { label: 'آیات شنیده‌شده امروز', value: toArabicNumerals(dashboardSnapshot.today.ayahsListened) },
    { label: 'صفحه‌های امروز', value: toArabicNumerals(dashboardSnapshot.today.pagesRead) },
    { label: 'اذکار امروز', value: toArabicNumerals(dashboardSnapshot.today.dhikrCount) },
  ], [
    dashboardSnapshot.today.ayahsListened,
    dashboardSnapshot.today.ayahsRead,
    dashboardSnapshot.today.dhikrCount,
    dashboardSnapshot.today.pagesRead,
  ]);

  const heroMetrics = useMemo(() => ([
    { value: toArabicNumerals(dashboardSnapshot.heroMetrics.currentStreak), label: 'روز متوالی', color: theme.surahHeader },
    { value: toArabicNumerals(dashboardSnapshot.heroMetrics.totalQuranMinutes), label: 'دقیقه قرآن', color: theme.bookmark },
    { value: toArabicNumerals(dashboardSnapshot.heroMetrics.totalDhikrCount), label: 'ذکر ثبت‌شده', color: theme.tint },
  ]), [
    dashboardSnapshot.heroMetrics.currentStreak,
    dashboardSnapshot.heroMetrics.totalDhikrCount,
    dashboardSnapshot.heroMetrics.totalQuranMinutes,
    theme.bookmark,
    theme.surahHeader,
    theme.tint,
  ]);

  const deferredSections = useMemo(() => {
    if (!showDeferredSections) {
      return [] as { key: string; data: DeferredSectionKey[] }[];
    }

    const items: DeferredSectionKey[] = ['summary', 'today'];
    if (upcomingCards.length > 0) {
      items.push('upcoming');
    }
    items.push('support', 'creatorMessage', 'creatorCompany');

    return [{ key: 'dashboard', data: items }];
  }, [showDeferredSections, upcomingCards.length]);

  const listHeader = (
    <View pointerEvents="box-none">
      <LinearGradient
        colors={NAAT_GRADIENT[themeMode] || NAAT_GRADIENT.light}
        style={styles.header}
        pointerEvents="none"
      >
        <View style={styles.headerBadge}>
          <MaterialIcons name="dashboard" size={16} color="#fff" />
          <CenteredText style={styles.headerBadgeText}>مرکز امکانات</CenteredText>
        </View>
        <CenteredText style={styles.headerTitle}>بیشتر</CenteredText>
        <CenteredText style={styles.headerSubtitle}>میان‌بُرهای مهم، پیگیری پیشرفت و همراه همیشگی عبادت</CenteredText>
      </LinearGradient>

      <View style={[styles.heroCard, { backgroundColor: theme.card, borderColor: theme.cardBorder, shadowColor: theme.tint }]}> 
        <View style={styles.heroChipRow}>
          <View style={[styles.heroChip, { backgroundColor: theme.backgroundSecondary, borderColor: theme.cardBorder }]}>
            <MaterialIcons name="today" size={16} color={theme.tint} />
            <CenteredText style={[styles.heroChipText, { color: theme.text }]}>{weekdayLabel}</CenteredText>
          </View>
          <View style={[styles.heroChip, { backgroundColor: theme.backgroundSecondary, borderColor: theme.cardBorder }]}>
            <MaterialIcons name="place" size={16} color={theme.tint} />
            <CenteredText style={[styles.heroChipText, { color: theme.text }]}>{locationLabel}</CenteredText>
          </View>
          <Pressable
            testID="ios-open-adhan-settings"
            accessibilityRole="button"
            onPress={() => router.push('/adhan-settings')}
            style={({ pressed }) => [
              styles.heroChip,
              { backgroundColor: theme.backgroundSecondary, borderColor: theme.cardBorder },
              pressed && styles.pressedChip,
            ]}
          >
            <MaterialIcons name="notifications-active" size={16} color={theme.bookmark} />
            <CenteredText style={[styles.heroChipText, { color: theme.text }]}>{scheduleModeLabel}</CenteredText>
          </Pressable>
        </View>

        <CenteredText style={[styles.heroLead, { color: theme.textSecondary }]}>امروز در یک نگاه</CenteredText>
        <CenteredText style={[styles.heroHijri, { color: theme.text }]}>{formatHijriDate(truth.hijri, 'dari')}</CenteredText>
        <CenteredText style={[styles.heroDateLine, { color: theme.textSecondary }]}>
          {formatAfghanSolarHijriDateWithPersianNumerals(truth.shamsi, 'dari')}
        </CenteredText>
        <CenteredText style={[styles.heroDateLine, { color: theme.textSecondary }]}>
          {formatGregorianDateDari(truth.gregorianDate)}
        </CenteredText>

        <View style={styles.heroMetricsRow}>
          {heroMetrics.map((metric) => (
            <View
              key={metric.label}
              style={[styles.heroMetric, { backgroundColor: theme.backgroundSecondary, borderColor: theme.cardBorder }]}
            >
              <CenteredText style={[styles.heroMetricValue, { color: metric.color }]}>
                {metric.value}
              </CenteredText>
              <CenteredText style={[styles.heroMetricLabel, { color: theme.textSecondary }]}>{metric.label}</CenteredText>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <MoreSectionTitle title="میان‌بُرهای اصلی" />
        <View style={styles.quickGrid}>
          {quickActions.map((item) => (
            <MoreHubTile
              key={item.label}
              icon={item.icon}
              label={item.label}
              subtitle={item.subtitle}
              testID={
                item.route === '/(tabs)/ahadith'
                  ? 'ios-open-ahadith'
                  : undefined
              }
              onPress={() => router.push(item.route as any)}
            />
          ))}
        </View>
      </View>
    </View>
  );

  const renderDeferredSection = ({ item }: { item: DeferredSectionKey }) => {
    if (item === 'summary') {
      return (
        <View style={styles.section}>
          <MoreSectionTitle title="خلاصه پیشرفت" />
          <View style={styles.summaryGrid}>
            {summaryCards.map((card) => (
              <View
                key={card.label}
                style={[styles.summaryCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}
              >
                <View style={[styles.summaryIconWrap, { backgroundColor: `${theme.tint}18`, borderColor: `${theme.tint}30` }]}>
                  <MaterialIcons name={card.icon as any} size={22} color={theme.tint} />
                </View>
                <CenteredText style={[styles.summaryValue, { color: theme.text }]}>{toArabicNumerals(card.value)}</CenteredText>
                <CenteredText style={[styles.summaryLabel, { color: theme.textSecondary }]}>{card.label}</CenteredText>
              </View>
            ))}
          </View>
        </View>
      );
    }

    if (item === 'today') {
      return (
        <View style={styles.section}>
          <MoreSectionTitle title="مرور امروز" />
          <View style={[styles.todayCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
            {todayRows.map((row, index) => (
              <View key={row.label}>
                {index > 0 && <View style={[styles.todayDivider, { backgroundColor: theme.divider }]} />}
                <View style={styles.todayRow}>
                  <CenteredText style={[styles.todayValue, { color: theme.tint }]}>{row.value}</CenteredText>
                  <CenteredText style={[styles.todayLabel, { color: theme.text }]}>{row.label}</CenteredText>
                </View>
              </View>
            ))}
          </View>
        </View>
      );
    }

    if (item === 'upcoming') {
      return (
        <View style={styles.section}>
          <MoreSectionTitle title="مناسبت‌های آینده" />
          <View style={styles.upcomingList}>
            {upcomingCards.map((day) => {
              return (
                <View
                  key={day.key}
                  style={[styles.upcomingCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}
                >
                  <View style={styles.upcomingTextWrap}>
                    <CenteredText style={[styles.upcomingName, { color: theme.text }]}>{day.nameDari}</CenteredText>
                    <CenteredText style={[styles.upcomingDescription, { color: theme.textSecondary }]}>
                      {day.descriptionDari}
                    </CenteredText>
                    <CenteredText style={[styles.upcomingMeta, { color: theme.textSecondary }]}>
                      {day.dateLabel} • {day.weekdayLabel}
                    </CenteredText>
                  </View>
                  <View style={styles.upcomingBadgeWrap}>
                    {(day.isFasting || day.isEid) && (
                      <MaterialIcons
                        name={day.isEid ? 'celebration' : 'restaurant'}
                        size={18}
                        color={day.isEid ? theme.bookmark : theme.tint}
                      />
                    )}
                    <View style={[styles.upcomingDateBadge, { backgroundColor: day.badgeColor }]}>
                      <CenteredText style={styles.upcomingDay} numberOfLines={1}>
                        {day.dateDay}
                      </CenteredText>
                      {day.dateMonth ? (
                        <CenteredText style={styles.upcomingMonth} numberOfLines={1}>
                          {day.dateMonth}
                        </CenteredText>
                      ) : null}
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      );
    }

    if (item === 'support') {
      return (
        <View style={styles.section}>
          <MoreSectionTitle title="راهنما و پشتیبانی" />
          <View style={styles.secondaryList}>
            {secondaryActions.map((action) => (
              <MoreHubRow
                key={action.label}
                icon={action.icon}
                label={action.label}
                subtitle={action.subtitle}
                testID={action.route === '/adhan-settings' ? 'ios-open-adhan-settings-secondary' : undefined}
                onPress={() => router.push(action.route as any)}
              />
            ))}
          </View>
        </View>
      );
    }

    if (item === 'creatorMessage') {
      return (
        <View style={styles.section}>
          <CreatorMessageCard />
        </View>
      );
    }

    return (
      <View style={styles.section}>
        <CreatorCompanyCard />
      </View>
    );
  };

  return (
    <SectionList
      testID="ios-more-ready"
      style={[styles.container, { backgroundColor: theme.background }]}
      contentContainerStyle={styles.contentContainer}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      initialNumToRender={2}
      maxToRenderPerBatch={2}
      windowSize={4}
      sections={deferredSections}
      keyExtractor={(item) => item}
      renderItem={renderDeferredSection}
      renderSectionHeader={() => null}
      stickySectionHeadersEnabled={false}
      ListHeaderComponent={listHeader}
      ListFooterComponent={<View style={styles.listFooterSpacing} />}
    >
    </SectionList>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 120,
  },
  listFooterSpacing: {
    height: 48,
  },
  header: {
    paddingTop: 60,
    paddingBottom: 108,
    paddingHorizontal: Spacing.lg,
    alignItems: 'center',
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    overflow: 'hidden',
  },
  headerBadge: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  headerBadgeText: {
    fontSize: Typography.ui.caption,
    color: '#fff',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
    marginTop: Spacing.md,
  },
  headerSubtitle: {
    fontSize: Typography.ui.body,
    color: 'rgba(255,255,255,0.88)',
    marginTop: Spacing.sm,
    lineHeight: 26,
  },
  heroCard: {
    marginTop: -64,
    marginHorizontal: Spacing.md,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.lg,
    elevation: 5,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
  },
  heroChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  heroChip: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
  pressedChip: {
    opacity: 0.82,
  },
  heroChipText: {
    fontSize: Typography.ui.caption,
    fontWeight: '600',
  },
  heroLead: {
    marginTop: Spacing.lg,
    fontSize: Typography.ui.caption,
    fontWeight: '700',
  },
  heroHijri: {
    marginTop: Spacing.xs,
    fontSize: Typography.ui.title,
    fontWeight: '700',
  },
  heroDateLine: {
    marginTop: 4,
    fontSize: Typography.ui.body,
    lineHeight: 25,
  },
  heroMetricsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.lg,
  },
  heroMetric: {
    flex: 1,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xs,
    alignItems: 'center',
  },
  heroMetricValue: {
    fontSize: Typography.ui.heading,
    fontWeight: '700',
  },
  heroMetricLabel: {
    marginTop: 4,
    fontSize: Typography.ui.caption,
  },
  section: {
    marginTop: Spacing.xl,
    paddingHorizontal: Spacing.md,
  },
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  summaryCard: {
    width: '48%',
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.md,
    alignItems: 'center',
  },
  summaryIconWrap: {
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  summaryValue: {
    fontSize: Typography.ui.heading,
    fontWeight: '700',
  },
  summaryLabel: {
    fontSize: Typography.ui.caption,
    marginTop: 4,
    lineHeight: 20,
  },
  todayCard: {
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    overflow: 'hidden',
  },
  todayRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    gap: Spacing.md,
  },
  todayLabel: {
    flex: 1,
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
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.md,
    gap: Spacing.md,
  },
  upcomingTextWrap: {
    flex: 1,
    alignItems: 'center',
  },
  upcomingName: {
    fontSize: Typography.ui.body,
    fontWeight: '700',
  },
  upcomingDescription: {
    fontSize: Typography.ui.caption,
    lineHeight: 22,
    marginTop: 4,
  },
  upcomingMeta: {
    fontSize: 11,
    marginTop: 6,
  },
  upcomingBadgeWrap: {
    alignItems: 'center',
    gap: 6,
  },
  upcomingDateBadge: {
    width: 48,
    minHeight: 52,
    borderRadius: BorderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    paddingVertical: 5,
  },
  upcomingDay: {
    fontSize: 17,
    fontWeight: '700',
    color: '#fff',
    lineHeight: 20,
  },
  upcomingMonth: {
    fontSize: 9,
    color: 'rgba(255,255,255,0.95)',
    marginTop: 1,
    lineHeight: 12,
    textAlign: 'center',
  },
  secondaryList: {
    gap: Spacing.sm,
  },
});
