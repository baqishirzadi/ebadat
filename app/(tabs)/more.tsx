/**
 * More Screen / Dashboard
 * Dashboard-first hub for secondary features and personal progress
 */

import React, { useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, Pressable, InteractionManager, SectionList, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
import { useDiyanetHijriDate } from '@/hooks/useDiyanetHijri';
import { useDua } from '@/context/DuaContext';
import { usePrayer } from '@/context/PrayerContext';
import { useStats } from '@/context/StatsContext';
import { formatAfghanSolarHijriDateWithPersianNumerals } from '@/utils/afghanSolarHijri';
import { getKabulDateKey, getKabulWeekdayIndex } from '@/utils/afghanistanCalendar';
import { localizeCityName } from '@/utils/cities';
import { getIstanbulDateParts } from '@/utils/istanbulCalendar';
import { formatGregorianDateCompact, formatTurkishMiladiDate, weekdayName } from '@/utils/calendarDisplay';
import { getCalendarTruth } from '@/utils/calendarTruth';
import {
  formatEventDateLabel,
  formatEventDateParts,
  getEventCategoryColor,
  getUpcomingEvents,
} from '@/utils/calendarEvents';
import { pickContent } from '@/utils/i18n/content';
import { rowStyle } from '@/utils/i18n/direction';
import { formatHijriDate } from '@/utils/islamicCalendar';
import { localizeDigits, toArabicNumerals } from '@/utils/numbers';
import type { AppLanguage } from '@/types/quran';

type DeferredSectionKey = 'progress' | 'upcoming' | 'app' | 'creatorMessage' | 'creatorCompany';

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

function formatGregorianDate(date: Date, language: AppLanguage): string {
  return language === 'pashto'
    ? formatGregorianDateCompact(date, toArabicNumerals, 'pashto')
    : formatGregorianDateCompact(date, toArabicNumerals);
}

function chunkPairs<T>(items: readonly T[]): T[][] {
  const rows: T[][] = [];
  for (let i = 0; i < items.length; i += 2) {
    rows.push(items.slice(i, i + 2));
  }
  return rows;
}

export default function MoreScreen() {
  const { theme, themeMode, state } = useApp();
  const language = state.preferences.appLanguage;
  const isTurkish = language === 'turkish';
  const diyanetHijri = useDiyanetHijriDate(isTurkish);
  const directionalRow = rowStyle(language);
  const { dashboardSnapshot } = useStats();
  const { state: prayer } = usePrayer();
  const { unreadCount } = useDua();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [showDeferredSections, setShowDeferredSections] = useState(false);
  const [upcomingCards, setUpcomingCards] = useState<UpcomingDayCard[]>([]);

  const kabulDayKey = getKabulDateKey(new Date());
  const truth = useMemo(
    () => getCalendarTruth(new Date(), prayer.settings.hijriOffsetDays),
    [kabulDayKey, prayer.settings.hijriOffsetDays],
  );
  const weekdayLabel = weekdayName(
    isTurkish ? getIstanbulDateParts().weekday : truth.weekday,
    language,
  );
  const locationLabel = useMemo(
    () => localizeCityName(prayer.locationName?.trim() || (isTurkish ? 'İstanbul' : 'کابل'), language),
    [isTurkish, language, prayer.locationName],
  );
  const scheduleModeLabel = useMemo(() => {
    const mode = prayer.scheduleAudit?.scheduleMode;
    if (mode === 'exact') return 'اذان دقیق';
    if (mode === 'fallback') return 'اذان عادی';
    return 'اذان آماده';
  }, [prayer.scheduleAudit?.scheduleMode]);

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
      const cards = getUpcomingEvents(truth.gregorianDate, 5)
        .filter((event) => language !== 'turkish' || event.category !== 'afghan')
        .map((event) => {
        const dateParts = formatEventDateParts(event, language);
        return {
          key: event.id,
          nameDari: pickContent(event, 'title', language),
          descriptionDari: pickContent(event, 'description', language),
          isFasting: event.isFasting,
          isEid: event.isEid,
          dateLabel: formatEventDateLabel(event, language),
          dateDay: dateParts.day,
          dateMonth: dateParts.month,
          weekdayLabel: weekdayName(
            language === 'turkish'
              ? getIstanbulDateParts(event.gregorianDate).weekday
              : getKabulWeekdayIndex(event.gregorianDate),
            language,
          ),
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
  }, [language, showDeferredSections, truth.gregorianDate, truth.hijri.year, truth.hijri.month, truth.hijri.day, theme.tint, theme.bookmark]);

  const worshipActions = useMemo(() => [
    { icon: 'auto-awesome' as const, label: 'اذکار', subtitle: 'اذکار روزانه', route: '/(tabs)/adhkar' },
    { icon: 'school' as const, label: 'آموزش نماز', subtitle: 'فقه و راهنما', route: '/(tabs)/prayer-learning' },
    { icon: 'explore' as const, label: 'قبله‌نما', subtitle: 'جهت قبله', route: '/qibla' },
    { icon: 'favorite' as const, label: 'دعای خیر', subtitle: 'ارسال درخواست دعا', route: '/dua-request' },
    { icon: 'bookmark' as const, label: 'نشانه‌های من', subtitle: 'موارد ذخیره‌شده', route: '/(tabs)/bookmarks' },
  ], []);

  const studyActions = useMemo(() => [
    { icon: 'format-quote' as const, label: 'احادیث', subtitle: 'حدیث روز و جستجو', route: '/(tabs)/ahadith' },
    { icon: 'article' as const, label: 'مقالات', subtitle: 'مطالعه و مدیریت', route: '/(tabs)/articles' },
    { icon: 'calendar-today' as const, label: 'جنتری', subtitle: 'تقویم اسلامی', route: '/(tabs)/jantari' },
  ], []);

  const questionActions = useMemo(() => [
    { icon: 'menu-book' as const, label: 'مفتی هوشمند حنفی', subtitle: 'سوال دینی و فقهی', route: '/mufti-chat' },
    { icon: 'nights-stay' as const, label: 'تعبیر خواب اسلامی', subtitle: 'بر اساس قرآن و حدیث', route: '/dream-chat' },
  ], []);

  const appActions = useMemo(() => [
    { icon: 'settings' as const, label: 'تنظیمات', subtitle: 'تم و ترجمه', route: '/settings' },
    { icon: 'access-alarm' as const, label: 'تنظیمات اذان', subtitle: 'زمان‌بندی و صدا', route: '/adhan-settings' },
    { icon: 'admin-panel-settings' as const, label: 'پنل مدیریت', subtitle: 'بخش مدیریتی', route: '/admin/login' },
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

    const items: DeferredSectionKey[] = ['progress'];
    if (upcomingCards.length > 0) {
      items.push('upcoming');
    }
    items.push('app', 'creatorMessage', 'creatorCompany');

    return [{ key: 'dashboard', data: items }];
  }, [showDeferredSections, upcomingCards.length]);

  const listHeader = useMemo(
    () => (
      <View pointerEvents="box-none">
        <LinearGradient
          colors={NAAT_GRADIENT[themeMode] || NAAT_GRADIENT.light}
          style={[styles.header, { paddingTop: insets.top + 12 }]}
          pointerEvents="none"
        >
          <CenteredText style={styles.headerTitle}>بیشتر</CenteredText>
          <CenteredText style={styles.headerSubtitle}>میان‌بُرهای مهم، پیگیری پیشرفت و همراه همیشگی عبادت</CenteredText>
        </LinearGradient>

        <View style={[styles.heroCard, { backgroundColor: theme.card, borderColor: theme.cardBorder, shadowColor: theme.tint }]}>
          <View style={styles.heroChipRow}>
            <View style={[styles.heroChip, directionalRow, { backgroundColor: theme.backgroundSecondary, borderColor: theme.cardBorder }]}>
              <MaterialIcons name="today" size={16} color={theme.tint} />
              <CenteredText style={[styles.heroChipText, { color: theme.text }]}>{weekdayLabel}</CenteredText>
            </View>
            <View style={[styles.heroChip, directionalRow, { backgroundColor: theme.backgroundSecondary, borderColor: theme.cardBorder }]}>
              <MaterialIcons name="place" size={16} color={theme.tint} />
              <CenteredText style={[styles.heroChipText, { color: theme.text }]}>{locationLabel}</CenteredText>
            </View>
            <Pressable
              testID="ios-open-adhan-settings"
              accessibilityRole="button"
              onPress={() => router.push('/adhan-settings')}
              style={({ pressed }) => [
                styles.heroChip,
                directionalRow,
                { backgroundColor: theme.backgroundSecondary, borderColor: theme.cardBorder },
                pressed && styles.pressedChip,
              ]}
            >
              <MaterialIcons name="notifications-active" size={16} color={theme.bookmark} />
              <CenteredText style={[styles.heroChipText, { color: theme.text }]}>{scheduleModeLabel}</CenteredText>
            </Pressable>
          </View>

          <CenteredText style={[styles.heroLead, { color: theme.textSecondary }]}>امروز در یک نگاه</CenteredText>
          <CenteredText style={[styles.heroHijri, { color: theme.text }]}>
            {isTurkish
              ? formatTurkishMiladiDate(new Date(), String)
              : language === 'pashto'
                ? localizeDigits(formatHijriDate(truth.hijri, language), language)
                : formatHijriDate(truth.hijri, language)}
          </CenteredText>
          {isTurkish ? (
            <CenteredText style={[styles.heroDateLine, { color: theme.textSecondary }]}>
              {formatHijriDate(diyanetHijri, language)}
            </CenteredText>
          ) : (
            <CenteredText style={[styles.heroDateLine, { color: theme.textSecondary }]}>
              {formatAfghanSolarHijriDateWithPersianNumerals(truth.shamsi, language)}
            </CenteredText>
          )}
          {isTurkish ? null : (
            <CenteredText style={[styles.heroDateLine, { color: theme.textSecondary }]}>
              {formatGregorianDate(truth.gregorianDate, language)}
            </CenteredText>
          )}
        </View>

        {([
          { title: 'عبادت', actions: worshipActions },
          { title: 'مطالعه', actions: studyActions },
          { title: 'پرسش', actions: questionActions },
        ] as const).map((group) => (
          <View key={group.title} style={styles.section}>
            <MoreSectionTitle title={group.title} />
            <View style={styles.quickGrid}>
              {chunkPairs(group.actions).map((row) => (
                <View
                  key={row.map((item) => item.route).join('|')}
                  style={[styles.quickRow, row.length === 1 && styles.quickRowSingle]}
                >
                  {row.map((item) => (
                    <MoreHubTile
                      key={item.route}
                      icon={item.icon}
                      label={item.label}
                      subtitle={item.subtitle}
                      badgeCount={item.route === '/dua-request' ? unreadCount : 0}
                      testID={item.route === '/(tabs)/ahadith' ? 'ios-open-ahadith' : undefined}
                      onPress={() => router.push(item.route as any)}
                    />
                  ))}
                </View>
              ))}
            </View>
          </View>
        ))}
      </View>
    ),
    [
      theme,
      themeMode,
      insets.top,
      weekdayLabel,
      locationLabel,
      scheduleModeLabel,
      truth.hijri,
      truth.shamsi,
      diyanetHijri,
      isTurkish,
      truth.gregorianDate,
      worshipActions,
      studyActions,
      questionActions,
      language,
      directionalRow,
      router,
      unreadCount,
    ],
  );

  const renderDeferredSection = ({ item }: { item: DeferredSectionKey }) => {
    if (item === 'progress') {
      return (
        <View style={styles.section}>
          <MoreSectionTitle title="پیشرفت" />
          <View style={styles.heroMetricsRow}>
            {heroMetrics.map((metric) => (
              <View
                key={metric.label}
                style={[styles.heroMetric, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}
              >
                <CenteredText style={[styles.heroMetricValue, { color: metric.color }]}>
                  {metric.value}
                </CenteredText>
                <CenteredText style={[styles.heroMetricLabel, { color: theme.textSecondary }]}>{metric.label}</CenteredText>
              </View>
            ))}
          </View>
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

    if (item === 'app') {
      return (
        <View style={styles.section}>
          <MoreSectionTitle title="برنامه" />
          <View style={styles.secondaryList}>
            {appActions.map((action) => (
              <MoreHubRow
                key={action.route}
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
      nestedScrollEnabled={Platform.OS === 'android'}
      removeClippedSubviews={Platform.OS === 'android'}
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
    paddingBottom: 72,
    paddingHorizontal: Spacing.lg,
    alignItems: 'center',
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    overflow: 'hidden',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
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
    gap: Spacing.sm,
  },
  quickRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  quickRowSingle: {
    justifyContent: 'center',
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
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
    marginTop: Spacing.sm,
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
