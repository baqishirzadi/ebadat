/**
 * More Screen / Dashboard
 * Dashboard-first hub for secondary features and personal progress
 */

import React, { useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, Pressable, InteractionManager, SectionList } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';

import CenteredText from '@/components/CenteredText';
import {
  ABOUT_CREATOR_DARI_CREATOR_LABEL,
  ABOUT_CREATOR_DARI_CREATOR_NAME,
  ABOUT_CREATOR_DARI_PARAGRAPHS,
  ABOUT_CREATOR_DARI_TITLE,
  ABOUT_CREATOR_PASHTO_CREATOR_LABEL,
  ABOUT_CREATOR_PASHTO_CREATOR_NAME,
  ABOUT_CREATOR_PASHTO_PARAGRAPHS,
  ABOUT_CREATOR_PASHTO_TITLE,
} from '@/constants/aboutCreatorContent';
import { BorderRadius, NAAT_GRADIENT, Spacing, Typography } from '@/constants/theme';
import { useApp } from '@/context/AppContext';
import { usePrayer } from '@/context/PrayerContext';
import { useStats } from '@/context/StatsContext';
import { gregorianToAfghanSolarHijri, formatAfghanSolarHijriDateWithPersianNumerals } from '@/utils/afghanSolarHijri';
import { getKabulDateParts, getKabulWeekdayIndex } from '@/utils/afghanistanCalendar';
import { getCalendarTruth } from '@/utils/calendarTruth';
import { formatHijriDate, getUpcomingSpecialDays, hijriToGregorian, HIJRI_MONTHS } from '@/utils/islamicCalendar';
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

type DeferredSectionKey = 'summary' | 'today' | 'upcoming' | 'support' | 'khatm' | 'creator';

function formatGregorianDateDari(date: Date): string {
  const { day, month, year } = getKabulDateParts(date);
  return `${toArabicNumerals(day)} ${GREGORIAN_MONTHS_DARI[month - 1]} ${toArabicNumerals(year)}`;
}

function getShamsiAndWeekday(hijriYear: number, hijriMonth: number, hijriDay: number): string | null {
  const greg = hijriToGregorian(hijriYear, hijriMonth, hijriDay);
  if (!greg) return null;
  const shamsi = gregorianToAfghanSolarHijri(greg);
  const weekday = WEEKDAY_DARI[getKabulWeekdayIndex(greg)];
  return `${formatAfghanSolarHijriDateWithPersianNumerals(shamsi, 'dari')} • ${weekday}`;
}

export default function MoreScreen() {
  const { theme, themeMode } = useApp();
  const { state: stats, dashboardSnapshot } = useStats();
  const { state: prayer } = usePrayer();
  const router = useRouter();
  const [showDeferredSections, setShowDeferredSections] = useState(false);
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
    const task = InteractionManager.runAfterInteractions(() => {
      setShowDeferredSections(true);
    });

    return () => {
      task.cancel();
    };
  }, []);

  const quickActions = useMemo(() => [
    { icon: 'menu-book', label: 'احادیث', subtitle: 'حدیث روز و جستجو', route: '/(tabs)/ahadith', accent: theme.tint },
    { icon: 'article', label: 'مقالات', subtitle: 'مطالعه و مدیریت', route: '/(tabs)/articles', accent: theme.bookmark },
    { icon: 'calendar-today', label: 'تقویم اسلامی', subtitle: 'مناسبت‌های مهم', route: '/calendar', accent: theme.surahHeader },
    { icon: 'explore', label: 'قبله‌نما', subtitle: 'جهت قبله', route: '/qibla', accent: theme.tint },
    { icon: 'school', label: 'آموزش نماز', subtitle: 'فقه و راهنما', route: '/(tabs)/prayer-learning', accent: theme.bookmark },
    { icon: 'bookmark', label: 'نشانه‌های من', subtitle: 'موارد ذخیره‌شده', route: '/(tabs)/bookmarks', accent: theme.surahHeader },
  ], [theme.bookmark, theme.surahHeader, theme.tint]);

  const secondaryActions = useMemo(() => [
    { icon: 'access-alarm', label: 'تنظیمات اذان', subtitle: 'زمان‌بندی و صدا', route: '/adhan-settings' },
    { icon: 'favorite', label: 'دعای خیر و مشورت شرعی', subtitle: 'ارسال درخواست دعا', route: '/dua-request' },
    { icon: 'admin-panel-settings', label: 'پنل مدیریت', subtitle: 'بخش مدیریتی', route: '/admin/login' },
    { icon: 'settings', label: 'تنظیمات', subtitle: 'تم و ترجمه', route: '/(tabs)/settings' },
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

  const upcomingDays = useMemo(() => (
    showDeferredSections ? getUpcomingSpecialDays(activeHijriDate, 3) : []
  ), [activeHijriDate, showDeferredSections]);

  const deferredSections = useMemo(() => {
    if (!showDeferredSections) {
      return [] as { key: string; data: DeferredSectionKey[] }[];
    }

    const items: DeferredSectionKey[] = ['summary', 'today'];
    if (upcomingDays.length > 0) {
      items.push('upcoming');
    }
    items.push('support', 'khatm', 'creator');

    return [{ key: 'dashboard', data: items }];
  }, [showDeferredSections, upcomingDays.length]);

  const listHeader = (
    <>
      <LinearGradient colors={NAAT_GRADIENT[themeMode] || NAAT_GRADIENT.light} style={styles.header}>
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
          <View style={[styles.heroChip, { backgroundColor: theme.backgroundSecondary, borderColor: theme.cardBorder }]}>
            <MaterialIcons name="notifications-active" size={16} color={theme.bookmark} />
            <CenteredText style={[styles.heroChipText, { color: theme.text }]}>{scheduleModeLabel}</CenteredText>
          </View>
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
        <CenteredText style={[styles.sectionTitle, { color: theme.textSecondary }]}>میان‌بُرهای اصلی</CenteredText>
        <View style={styles.quickGrid}>
          {quickActions.map((item) => (
            <Pressable
              key={item.label}
              onPress={() => router.push(item.route as any)}
              style={({ pressed }) => [
                styles.quickCard,
                { backgroundColor: theme.card, borderColor: theme.cardBorder },
                pressed && styles.pressedCard,
              ]}
            >
              <View style={[styles.quickIconWrap, { backgroundColor: theme.backgroundSecondary, borderColor: theme.cardBorder }]}>
                <MaterialIcons name={item.icon as any} size={24} color={item.accent} />
              </View>
              <CenteredText style={[styles.quickLabel, { color: theme.text }]}>{item.label}</CenteredText>
              <CenteredText style={[styles.quickSubtitle, { color: theme.textSecondary }]}>{item.subtitle}</CenteredText>
            </Pressable>
          ))}
        </View>
      </View>
    </>
  );

  const renderDeferredSection = ({ item }: { item: DeferredSectionKey }) => {
    if (item === 'summary') {
      return (
        <View style={styles.section}>
          <CenteredText style={[styles.sectionTitle, { color: theme.textSecondary }]}>خلاصه پیشرفت</CenteredText>
          <View style={styles.summaryGrid}>
            {summaryCards.map((card) => (
              <View
                key={card.label}
                style={[styles.summaryCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}
              >
                <View style={[styles.summaryIconWrap, { backgroundColor: theme.backgroundSecondary, borderColor: theme.cardBorder }]}>
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
          <CenteredText style={[styles.sectionTitle, { color: theme.textSecondary }]}>مرور امروز</CenteredText>
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
          <CenteredText style={[styles.sectionTitle, { color: theme.textSecondary }]}>مناسبت‌های آینده</CenteredText>
          <View style={styles.upcomingList}>
            {upcomingDays.map((day, index) => {
              const baseYear = activeHijriDate.year;
              const hijriYear = day.month >= activeHijriDate.month ? baseYear : baseYear + 1;
              const shamsiWeekday = getShamsiAndWeekday(hijriYear, day.month, day.day);
              return (
                <View
                  key={`${day.month}-${day.day}-${index}`}
                  style={[styles.upcomingCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}
                >
                  <View style={styles.upcomingTextWrap}>
                    <CenteredText style={[styles.upcomingName, { color: theme.text }]}>{day.nameDari}</CenteredText>
                    <CenteredText style={[styles.upcomingDescription, { color: theme.textSecondary }]}>
                      {day.descriptionDari}
                    </CenteredText>
                    {shamsiWeekday && (
                      <CenteredText style={[styles.upcomingMeta, { color: theme.textSecondary }]}>
                        {shamsiWeekday}
                      </CenteredText>
                    )}
                  </View>
                  <View style={styles.upcomingBadgeWrap}>
                    {(day.isFasting || day.isEid) && (
                      <MaterialIcons
                        name={day.isEid ? 'celebration' : 'restaurant'}
                        size={18}
                        color={day.isEid ? theme.bookmark : theme.tint}
                      />
                    )}
                    <View style={[styles.upcomingDateBadge, { backgroundColor: theme.tint }]}>
                      <CenteredText style={styles.upcomingDay}>{toArabicNumerals(day.day)}</CenteredText>
                      <CenteredText style={styles.upcomingMonth}>{HIJRI_MONTHS[day.month - 1]?.dari ?? ''}</CenteredText>
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
          <CenteredText style={[styles.sectionTitle, { color: theme.textSecondary }]}>راهنما و پشتیبانی</CenteredText>
          <View style={styles.secondaryList}>
            {secondaryActions.map((action) => (
              <Pressable
                key={action.label}
                onPress={() => router.push(action.route as any)}
                style={({ pressed }) => [
                  styles.secondaryRow,
                  { backgroundColor: theme.card, borderColor: theme.cardBorder },
                  pressed && styles.pressedCard,
                ]}
              >
                <MaterialIcons name="chevron-left" size={22} color={theme.icon} />
                <View style={styles.secondaryTextWrap}>
                  <CenteredText style={[styles.secondaryLabel, { color: theme.text }]}>{action.label}</CenteredText>
                  <CenteredText style={[styles.secondarySubtitle, { color: theme.textSecondary }]}>{action.subtitle}</CenteredText>
                </View>
                <View style={[styles.secondaryIconWrap, { backgroundColor: theme.backgroundSecondary, borderColor: theme.cardBorder }]}>
                  <MaterialIcons name={action.icon as any} size={22} color={theme.tint} />
                </View>
              </Pressable>
            ))}
          </View>
        </View>
      );
    }

    if (item === 'khatm') {
      return (
        <View style={styles.section}>
          <View style={[styles.khatmCard, { backgroundColor: theme.card, borderColor: theme.bookmark }]}>
            <MaterialIcons name="auto-stories" size={30} color={theme.bookmark} />
            <View style={styles.khatmTextWrap}>
              <CenteredText style={[styles.khatmValue, { color: theme.text }]}>
                {toArabicNumerals(stats.overall.khatmCount)} ختم کامل قرآن
              </CenteredText>
              <CenteredText style={[styles.khatmLabel, { color: theme.textSecondary }]}>این شمار از تمام ختم‌های ثبت‌شده در برنامه است</CenteredText>
            </View>
          </View>
        </View>
      );
    }

    return (
      <View style={styles.section}>
        <View style={[styles.creatorCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}> 
          <View style={styles.creatorHeader}>
            <MaterialIcons name="favorite" size={18} color={theme.bookmark} />
            <CenteredText style={[styles.creatorTitle, { color: theme.bookmark }]}>{ABOUT_CREATOR_DARI_TITLE}</CenteredText>
          </View>

          {ABOUT_CREATOR_DARI_PARAGRAPHS.map((paragraph, index) => (
            <CenteredText key={`dari-${index}`} style={[styles.creatorParagraph, { color: theme.textSecondary }]}>
              {paragraph}
            </CenteredText>
          ))}

          <CenteredText style={[styles.creatorLabel, { color: theme.text }]}>{ABOUT_CREATOR_DARI_CREATOR_LABEL}</CenteredText>
          <CenteredText style={[styles.creatorNameDari, { color: theme.bookmark }]}>{ABOUT_CREATOR_DARI_CREATOR_NAME}</CenteredText>

          <View style={[styles.creatorDivider, { backgroundColor: theme.divider }]} />

          <CenteredText style={[styles.creatorTitle, { color: theme.tint }]}>{ABOUT_CREATOR_PASHTO_TITLE}</CenteredText>
          {ABOUT_CREATOR_PASHTO_PARAGRAPHS.map((paragraph, index) => (
            <CenteredText key={`pashto-${index}`} style={[styles.creatorParagraph, { color: theme.textSecondary }]}>
              {paragraph}
            </CenteredText>
          ))}
          <CenteredText style={[styles.creatorLabel, { color: theme.text }]}>{ABOUT_CREATOR_PASHTO_CREATOR_LABEL}</CenteredText>
          <CenteredText style={[styles.creatorNamePashto, { color: theme.tint }]}>{ABOUT_CREATOR_PASHTO_CREATOR_NAME}</CenteredText>
        </View>
      </View>
    );
  };

  return (
    <SectionList
      style={[styles.container, { backgroundColor: theme.background }]}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
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
  sectionTitle: {
    fontSize: Typography.ui.caption,
    fontWeight: '700',
    marginBottom: Spacing.md,
    textTransform: 'uppercase',
  },
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  quickCard: {
    width: '48%',
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.md,
    alignItems: 'center',
  },
  quickIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  quickLabel: {
    fontSize: Typography.ui.body,
    fontWeight: '700',
  },
  quickSubtitle: {
    fontSize: Typography.ui.caption,
    marginTop: Spacing.xs,
    lineHeight: 22,
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
    width: 64,
    minHeight: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    paddingVertical: 8,
  },
  upcomingDay: {
    fontSize: Typography.ui.subtitle,
    fontWeight: '700',
    color: '#fff',
  },
  upcomingMonth: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.95)',
    marginTop: 2,
  },
  secondaryList: {
    gap: Spacing.sm,
  },
  secondaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.md,
    gap: Spacing.md,
  },
  secondaryTextWrap: {
    flex: 1,
    alignItems: 'center',
  },
  secondaryLabel: {
    fontSize: Typography.ui.body,
    fontWeight: '700',
  },
  secondarySubtitle: {
    fontSize: Typography.ui.caption,
    marginTop: 4,
    lineHeight: 20,
  },
  secondaryIconWrap: {
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  khatmCard: {
    marginTop: Spacing.xl,
    marginHorizontal: Spacing.md,
    borderRadius: BorderRadius.xl,
    borderWidth: 2,
    padding: Spacing.lg,
    alignItems: 'center',
    gap: Spacing.sm,
  },
  khatmTextWrap: {
    alignItems: 'center',
  },
  khatmValue: {
    fontSize: Typography.ui.title,
    fontWeight: '700',
  },
  khatmLabel: {
    marginTop: 4,
    fontSize: Typography.ui.caption,
    lineHeight: 21,
  },
  creatorCard: {
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.lg,
    alignItems: 'center',
  },
  creatorHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.md,
  },
  creatorTitle: {
    fontSize: Typography.ui.subtitle,
    fontWeight: '700',
    fontFamily: 'Vazirmatn',
  },
  creatorParagraph: {
    fontSize: Typography.ui.body,
    fontFamily: 'Vazirmatn',
    lineHeight: 30,
    marginBottom: Spacing.sm,
  },
  creatorLabel: {
    fontSize: Typography.ui.caption,
    fontFamily: 'Vazirmatn',
    fontWeight: '700',
    marginTop: Spacing.xs,
  },
  creatorNameDari: {
    fontSize: Typography.ui.body,
    fontFamily: 'NotoNastaliqUrdu',
    lineHeight: 38,
    marginTop: Spacing.xs,
    includeFontPadding: false,
  },
  creatorNamePashto: {
    fontSize: Typography.ui.body,
    fontFamily: 'NotoNastaliqUrdu',
    lineHeight: 38,
    marginTop: Spacing.xs,
    includeFontPadding: false,
  },
  creatorDivider: {
    width: '70%',
    height: 1,
    marginVertical: Spacing.md,
  },
  pressedCard: {
    opacity: 0.92,
    transform: [{ scale: 0.985 }],
  },
});
