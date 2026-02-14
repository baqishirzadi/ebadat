/**
 * Articles Feed Screen
 * Shows featured scholars and latest articles
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  Animated,
  useWindowDimensions,
  Pressable,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useApp } from '@/context/AppContext';
import { useArticles } from '@/context/ArticlesContext';
import { Article, Scholar } from '@/types/articles';
import { Spacing, BorderRadius, NAAT_GRADIENT } from '@/constants/theme';
import { ArticleCard } from '@/components/articles/ArticleCard';
import { CategoryFilter } from '@/components/articles/CategoryFilter';
import CenteredText from '@/components/CenteredText';
import { isArticlesRemoteEnabled } from '@/utils/articleService';

const PINNED_SCHOLARS: Scholar[] = [
  {
    id: 'pinned_imam_abu_hanifa',
    fullName: 'امام ابوحنیفه (رح)',
    email: 'imam.abu.hanifa@local',
    bio: 'بنیان‌گذار فقه حنفی و ستون فقهی جهان اسلام شرقی',
    verified: true,
    role: 'scholar',
    createdAt: new Date('2000-01-01T00:00:00.000Z'),
  },
  {
    id: 'pinned_mawlana_jalaluddin_balkhi',
    fullName: 'مولانا جلال‌الدین محمد بلخی (رح)',
    email: 'mawlana.balkhi@local',
    bio: 'صاحب مثنوی معنوی و از بلندترین قله‌های عرفان و ادب اسلامی',
    verified: true,
    role: 'scholar',
    createdAt: new Date('2000-01-01T00:00:00.000Z'),
  },
  {
    id: 'pinned_khwaja_abdullah_ansari',
    fullName: 'خواجه عبدالله انصاری (رح)',
    email: 'khwaja.ansari@local',
    bio: 'از بزرگان مناجات و سلوک در مکتب هرات',
    verified: true,
    role: 'scholar',
    createdAt: new Date('2000-01-01T00:00:00.000Z'),
  },
  {
    id: 'pinned_abdulrahman_jami',
    fullName: 'عبدالرحمن جامی (رح)',
    email: 'abdulrahman.jami@local',
    bio: 'صاحب نفحات الانس و از چهره‌های اثرگذار عرفان خراسان',
    verified: true,
    role: 'scholar',
    createdAt: new Date('2000-01-01T00:00:00.000Z'),
  },
  {
    id: 'pinned_shah_waliullah_dehlawi',
    fullName: 'شاه ولی‌الله دهلوی (رح)',
    email: 'shah.waliullah@local',
    bio: 'از قله‌های اصلاح فقهی و حدیثی در شبه‌قاره',
    verified: true,
    role: 'scholar',
    createdAt: new Date('2000-01-01T00:00:00.000Z'),
  },
  {
    id: 'pinned_sheikh_ahmad_sirhindi',
    fullName: 'شیخ احمد سرهندی (رح)',
    email: 'ahmad.sirhindi@local',
    bio: 'مجدد الف ثانی و اصلاح‌گر نسبت شریعت و طریقت',
    verified: true,
    role: 'scholar',
    createdAt: new Date('2000-01-01T00:00:00.000Z'),
  },
  {
    id: 'pinned_khwaja_baqi_billah',
    fullName: 'خواجه باقی‌بالله (رح)',
    email: 'baqi.billah@local',
    bio: 'از احیاگران نقشبندیه در هند با پیوند ریشه‌دار به کابل',
    verified: true,
    role: 'scholar',
    createdAt: new Date('2000-01-01T00:00:00.000Z'),
  },
  {
    id: 'pinned_sayyid_jamaluddin_afghani',
    fullName: 'سید جمال‌الدین افغانی (رح)',
    email: 'jamaluddin.afghani@local',
    bio: 'پیشگام بیداری فکری امت و اصلاح اجتماعی در عصر جدید',
    verified: true,
    role: 'scholar',
    createdAt: new Date('2000-01-01T00:00:00.000Z'),
  },
  {
    id: 'pinned_ahmad_shah_abdali',
    fullName: 'احمد شاه ابدالی (احمدشاه بابا)',
    email: 'ahmad.shah.abdali@local',
    bio: 'بنیان‌گذار دولت درانی و حامی نهادهای دینی حنفی',
    verified: true,
    role: 'scholar',
    createdAt: new Date('2000-01-01T00:00:00.000Z'),
  },
  {
    id: 'pinned_sheikh_sanai_ghaznavi',
    fullName: 'شیخ سنایی غزنوی (رح)',
    email: 'sanai@local',
    bio: 'پیشگام شعر عرفانی و صاحب حدیقةالحقیقه',
    verified: true,
    role: 'scholar',
    createdAt: new Date('2000-01-01T00:00:00.000Z'),
  },
  {
    id: 'pinned_mirza_abdulqadir_bidel',
    fullName: 'میرزا عبدالقادر بیدل (رح)',
    email: 'bidel@local',
    bio: 'شاعر و عارف برجسته سبک هندی با اثر عمیق در فرهنگ افغانستان',
    verified: true,
    role: 'scholar',
    createdAt: new Date('2000-01-01T00:00:00.000Z'),
  },
  {
    id: 'pinned_abu_saeed_abolkhair',
    fullName: 'ابو سعید ابوالخیر (رح)',
    email: 'abu.saeed.abolkhair@local',
    bio: 'از پیشگامان تصوف خراسان با تأکید بر سماعِ منضبط و عشق الهی',
    verified: true,
    role: 'scholar',
    createdAt: new Date('2000-01-01T00:00:00.000Z'),
  },
  {
    id: 'pinned_abulhasan_kharqani',
    fullName: 'ابوالحسن خرقانی (رح)',
    email: 'abulhasan.kharqani@local',
    bio: 'عارف بزرگ مکتب خراسان با اصل خدمت به خلق و شفقت اجتماعی',
    verified: true,
    role: 'scholar',
    createdAt: new Date('2000-01-01T00:00:00.000Z'),
  },
  {
    id: 'pinned_khwaja_muhammad_parsa',
    fullName: 'خواجه محمد پارسا (رح)',
    email: 'khwaja.muhammad.parsa@local',
    bio: 'از بزرگان نقشبندیه منسوب به بلخ با تأکید بر جمع شریعت و سلوک',
    verified: true,
    role: 'scholar',
    createdAt: new Date('2000-01-01T00:00:00.000Z'),
  },
  {
    id: 'pinned_sheikh_ahmad_jam',
    fullName: 'شیخ احمد جام (رح)',
    email: 'sheikh.ahmad.jam@local',
    bio: 'مشهور به ژنده‌پیل؛ از چهره‌های اثرگذار زهد، توبه و اصلاح اجتماعی',
    verified: true,
    role: 'scholar',
    createdAt: new Date('2000-01-01T00:00:00.000Z'),
  },
  {
    id: 'pinned_nurul_mashayekh_mujaddidi',
    fullName: 'نورالمشایخ مجددی (رح)',
    email: 'nurul.mashayekh.mujaddidi@local',
    bio: 'از رهبران دینی نقشبندی در سده اخیر با محوریت اصلاح تربیتی',
    verified: true,
    role: 'scholar',
    createdAt: new Date('2000-01-01T00:00:00.000Z'),
  },
  {
    id: 'pinned_shah_foulad_kabuli',
    fullName: 'شاه فولاد کابلی (رح)',
    email: 'shah.foulad.kabuli@local',
    bio: 'نامدار در سنت زیارت کابل و الهام‌بخش ادب حضور و احترام به خلق',
    verified: true,
    role: 'scholar',
    createdAt: new Date('2000-01-01T00:00:00.000Z'),
  },
  {
    id: 'pinned_imam_ghazali',
    fullName: 'امام ابوحامد غزالی (رح)',
    email: 'imam.ghazali@local',
    bio: 'از بزرگ‌ترین متفکران اخلاق و تهذیب نفس در جهان اسلام',
    verified: true,
    role: 'scholar',
    createdAt: new Date('2000-01-01T00:00:00.000Z'),
  },
  {
    id: 'pinned_imam_fakhr_razi',
    fullName: 'امام فخرالدین رازی (رح)',
    email: 'imam.fakhr.razi@local',
    bio: 'مفسر و متکلم برجسته با اثر ژرف در عقلانیت دینی',
    verified: true,
    role: 'scholar',
    createdAt: new Date('2000-01-01T00:00:00.000Z'),
  },
];

interface ScholarFilter {
  scholarId: string;
  scholarName: string;
  authorIds: string[];
  authorNames: string[];
}

const PINNED_SCHOLAR_FILTERS: Record<string, { authorIds?: string[]; authorNames?: string[] }> = {
  pinned_imam_abu_hanifa: { authorIds: ['imam_abu_hanifa'] },
  pinned_mawlana_jalaluddin_balkhi: { authorIds: ['mawlana_jalaluddin_balkhi'] },
  pinned_khwaja_abdullah_ansari: { authorIds: ['khwaja_abdullah_ansari'] },
  pinned_abdulrahman_jami: { authorIds: ['abdulrahman_jami'] },
  pinned_shah_waliullah_dehlawi: { authorIds: ['shah_waliullah_dehlawi'] },
  pinned_sheikh_ahmad_sirhindi: { authorIds: ['sheikh_ahmad_sirhindi'] },
  pinned_khwaja_baqi_billah: { authorIds: ['khwaja_baqi_billah'] },
  pinned_sayyid_jamaluddin_afghani: { authorIds: ['sayyid_jamaluddin_afghani'] },
  pinned_ahmad_shah_abdali: { authorIds: ['ahmad_shah_abdali'] },
  pinned_sheikh_sanai_ghaznavi: { authorIds: ['sheikh_sanai_ghaznavi'] },
  pinned_mirza_abdulqadir_bidel: { authorIds: ['mirza_abdulqadir_bidel'] },
  pinned_abu_saeed_abolkhair: { authorIds: ['abu_saeed_abolkhair'] },
  pinned_abulhasan_kharqani: { authorIds: ['abulhasan_kharqani'] },
  pinned_khwaja_muhammad_parsa: { authorIds: ['khwaja_muhammad_parsa'] },
  pinned_sheikh_ahmad_jam: { authorIds: ['sheikh_ahmad_jam'] },
  pinned_nurul_mashayekh_mujaddidi: { authorIds: ['nurul_mashayekh_mujaddidi'] },
  pinned_shah_foulad_kabuli: { authorIds: ['shah_foulad_kabuli'] },
  pinned_imam_ghazali: { authorNames: ['امام ابوحامد غزالی (رح)'] },
  pinned_imam_fakhr_razi: { authorNames: ['امام فخرالدین رازی (رح)'] },
};

const normalizeName = (value?: string) => (value || '').replace(/\s+/g, ' ').trim().toLowerCase();

export default function ArticlesFeed() {
  const { theme, themeMode } = useApp();
  const { state, refreshArticles, syncArticles, isBookmarked } = useArticles();
  const router = useRouter();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState<'dari' | 'pashto'>('dari');
  const [selectedScholar, setSelectedScholar] = useState<ScholarFilter | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const scrollY = useRef(new Animated.Value(0)).current;
  const { width } = useWindowDimensions();

  useEffect(() => {
    refreshArticles();
  }, [refreshArticles]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await syncArticles();
    setRefreshing(false);
  }, [syncArticles]);

  const filteredArticles = useMemo(
    () =>
      state.articles.filter((article) => {
        if (selectedCategory && article.category !== selectedCategory) return false;
        if (article.language !== selectedLanguage) return false;
        if (!article.published) return false;

        if (!selectedScholar) return true;

        const byId = selectedScholar.authorIds.includes(article.authorId);
        const byName = selectedScholar.authorNames.some(
          (name) => normalizeName(name) === normalizeName(article.authorName)
        );
        return byId || byName;
      }),
    [selectedCategory, selectedLanguage, selectedScholar, state.articles]
  );

  const displayScholars = useMemo(() => {
    const seenNames = new Set<string>();
    const normalizedName = (value: string) =>
      value.replace(/\s+/g, ' ').trim().toLowerCase();

    const merged = [...PINNED_SCHOLARS, ...state.scholars].filter((scholar) => {
      const key = normalizedName(scholar.fullName);
      if (seenNames.has(key)) return false;
      seenNames.add(key);
      return true;
    });

    return merged;
  }, [state.scholars]);

  const handleArticlePress = useCallback(
    (articleId: string) => {
      router.push(`/articles/${articleId}`);
    },
    [router]
  );

  const handleScholarPress = useCallback((scholar: Scholar) => {
    setSelectedScholar((prev) => {
      if (prev?.scholarId === scholar.id) return null;

      const pinnedMap = PINNED_SCHOLAR_FILTERS[scholar.id];
      const filter: ScholarFilter = {
        scholarId: scholar.id,
        scholarName: scholar.fullName,
        authorIds: pinnedMap?.authorIds ?? [scholar.id],
        authorNames: pinnedMap?.authorNames ?? [scholar.fullName],
      };
      return filter;
    });
  }, []);

  const renderArticle = useCallback(
    ({ item }: { item: Article }) => (
      <ArticleCard
        article={item}
        isBookmarked={isBookmarked(item.id)}
        onPress={() => handleArticlePress(item.id)}
      />
    ),
    [isBookmarked, handleArticlePress]
  );

  const numColumns = width >= 420 ? 3 : 2;

  const renderScholar = useCallback(
    ({ item }: { item: Scholar }) => (
      <Pressable
        onPress={() => handleScholarPress(item)}
        style={[
          styles.scholarCard,
          {
            backgroundColor: theme.card,
            borderColor: theme.cardBorder,
          },
          selectedScholar?.scholarId === item.id && {
            borderColor: theme.tint,
            backgroundColor: `${theme.tint}14`,
          },
        ]}
      >
        <CenteredText style={[styles.scholarName, { color: theme.text }]} numberOfLines={2}>
          {item.fullName}
        </CenteredText>
      </Pressable>
    ),
    [handleScholarPress, selectedScholar?.scholarId, theme]
  );

  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 120],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  const headerHeight = scrollY.interpolate({
    inputRange: [0, 180],
    outputRange: [1, 0.6],
    extrapolate: 'clamp',
  });

  const renderListHeader = () => (
    <Animated.View
      style={[
        styles.headerWrapper,
        {
          opacity: headerOpacity,
          transform: [{ scaleY: headerHeight }],
        },
      ]}
    >
      <LinearGradient
        colors={NAAT_GRADIENT[themeMode] ?? NAAT_GRADIENT.light}
        style={styles.header}
      >
        <View style={styles.headerPattern} pointerEvents="none">
          <View style={[styles.patternLine, styles.patternLine1]} />
          <View style={[styles.patternLine, styles.patternLine2]} />
          <View style={[styles.patternLine, styles.patternLine3]} />
          <View style={[styles.patternLine, styles.patternLine4]} />
          <View style={[styles.patternCorner, styles.patternTopLeft]} />
          <View style={[styles.patternCorner, styles.patternTopRight]} />
          <View style={[styles.patternCorner, styles.patternBottomLeft]} />
          <View style={[styles.patternCorner, styles.patternBottomRight]} />
        </View>
        <CenteredText style={styles.headerTitle}>مقالات</CenteredText>
        <CenteredText style={styles.headerSubtitle}>مقالات و نوشته‌های علما</CenteredText>
      </LinearGradient>

      <CategoryFilter
        selectedCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
        selectedLanguage={selectedLanguage}
        onSelectLanguage={setSelectedLanguage}
      />

      {selectedScholar && (
        <View style={[styles.scholarFilterBanner, { backgroundColor: theme.card, borderColor: theme.tint }]}>
          <CenteredText style={[styles.scholarFilterText, { color: theme.text }]}>
            فیلتر عالم فعال است: {selectedScholar.scholarName}
          </CenteredText>
          <Pressable
            onPress={() => setSelectedScholar(null)}
            style={[styles.clearScholarFilterButton, { backgroundColor: theme.tint }]}
          >
            <CenteredText style={styles.clearScholarFilterText}>حذف فیلتر</CenteredText>
          </Pressable>
        </View>
      )}
    </Animated.View>
  );

  const renderListFooter = () => (
    <View>
      {displayScholars.length > 0 && (
        <View style={styles.scholarsSectionFooter}>
          <CenteredText style={[styles.scholarsTitle, { color: theme.text }]}>
            علما و نویسندگان
          </CenteredText>
          <FlatList
            data={displayScholars}
            keyExtractor={(item) => item.id}
            renderItem={renderScholar}
            numColumns={numColumns}
            scrollEnabled={false}
            columnWrapperStyle={styles.scholarRow}
            contentContainerStyle={styles.scholarsGrid}
          />
        </View>
      )}
      <View style={styles.footer} />
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Articles List */}
      {state.isLoading && state.articles.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.tint} />
          <CenteredText style={[styles.loadingText, { color: theme.textSecondary }]}>
            در حال بارگذاری...
          </CenteredText>
        </View>
      ) : filteredArticles.length === 0 ? (
        <View style={styles.emptyContainer}>
          {!isArticlesRemoteEnabled() ? (
            <>
              <CenteredText style={[styles.emptyText, { color: theme.textSecondary }]}>
                مقالات به حالت نمایشی فعال است
              </CenteredText>
              <CenteredText style={[styles.emptySubtext, { color: theme.textSecondary }]}>
                فعلاً فقط مقالات محلی نمایش داده می‌شوند
              </CenteredText>
            </>
          ) : state.error ? (
            <>
              <CenteredText style={[styles.emptyText, { color: '#F44336' }]}>
                {state.error}
              </CenteredText>
              {state.articles.length > 0 && (
                <CenteredText style={[styles.emptySubtext, { color: theme.textSecondary, marginTop: 8 }]}>
                  نمایش داده‌های ذخیره شده محلی
                </CenteredText>
              )}
            </>
          ) : state.articles.length === 0 && !state.isLoading ? (
            <>
              <CenteredText style={[styles.emptyText, { color: theme.textSecondary }]}>
                مقاله‌ای یافت نشد
              </CenteredText>
              <CenteredText style={[styles.emptySubtext, { color: theme.textSecondary }]}>
                مقالات در Supabase وجود ندارند
              </CenteredText>
              <CenteredText style={[styles.emptySubtext, { color: theme.textSecondary, marginTop: 8 }]}>
                برای اضافه کردن مقالات، راهنمای ADD_ARTICLES.md را ببینید
              </CenteredText>
            </>
          ) : (
            <CenteredText style={[styles.emptyText, { color: theme.textSecondary }]}>
              مقاله‌ای با فیلتر انتخابی یافت نشد
            </CenteredText>
          )}
        </View>
      ) : (
        <Animated.FlatList
          data={filteredArticles}
          keyExtractor={(item) => item.id}
          renderItem={renderArticle}
          ListHeaderComponent={renderListHeader}
          ListHeaderComponentStyle={styles.listHeader}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={theme.tint}
              colors={[theme.tint]}
            />
          }
          showsVerticalScrollIndicator={false}
          ListFooterComponent={renderListFooter}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { y: scrollY } } }],
            { useNativeDriver: true }
          )}
          scrollEventThrottle={16}
        />
      )}

      {/* Offline Indicator */}
      {state.isOffline && (
        <View style={[styles.offlineIndicator, { backgroundColor: theme.card }]}>
          <CenteredText style={[styles.offlineText, { color: theme.textSecondary }]}>
            حالت آفلاین - نمایش داده‌های ذخیره شده
          </CenteredText>
        </View>
      )}
    </View>
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
    width: '100%',
    overflow: 'hidden',
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  headerWrapper: {
    width: '100%',
    overflow: 'hidden',
    alignSelf: 'stretch',
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  listHeader: {
    marginHorizontal: -Spacing.md,
    marginTop: -Spacing.md,
  },
  headerPattern: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.12,
  },
  patternLine: {
    position: 'absolute',
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.35)',
    width: '120%',
    left: '-10%',
  },
  patternLine1: {
    top: 20,
    transform: [{ rotate: '12deg' }],
  },
  patternLine2: {
    top: 60,
    transform: [{ rotate: '12deg' }],
  },
  patternLine3: {
    top: 100,
    transform: [{ rotate: '12deg' }],
  },
  patternLine4: {
    top: 140,
    transform: [{ rotate: '12deg' }],
  },
  patternCorner: {
    position: 'absolute',
    width: 18,
    height: 18,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  patternTopLeft: {
    top: 12,
    left: 12,
    borderTopWidth: 1,
    borderLeftWidth: 1,
  },
  patternTopRight: {
    top: 12,
    right: 12,
    borderTopWidth: 1,
    borderRightWidth: 1,
  },
  patternBottomLeft: {
    bottom: 12,
    left: 12,
    borderBottomWidth: 1,
    borderLeftWidth: 1,
  },
  patternBottomRight: {
    bottom: 12,
    right: 12,
    borderBottomWidth: 1,
    borderRightWidth: 1,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: '#fff',
    fontFamily: 'Vazirmatn',
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginTop: Spacing.xs,
    fontFamily: 'Vazirmatn',
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  scholarsSection: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  scholarsSectionFooter: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  scholarsTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: Spacing.sm,
    fontFamily: 'Vazirmatn',
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  scholarsGrid: {
    paddingBottom: Spacing.sm,
  },
  scholarRow: {
    justifyContent: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  scholarCard: {
    flex: 1,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    alignItems: 'center',
  },
  scholarName: {
    fontSize: 11,
    fontFamily: 'Vazirmatn',
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  scholarFilterBanner: {
    marginHorizontal: Spacing.md,
    marginTop: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
    gap: Spacing.xs,
  },
  scholarFilterText: {
    fontSize: 12,
    fontFamily: 'Vazirmatn',
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  clearScholarFilterButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
  },
  clearScholarFilterText: {
    fontSize: 12,
    fontFamily: 'Vazirmatn',
    color: '#fff',
    textAlign: 'center',
    writingDirection: 'rtl',
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: Spacing.md,
    fontSize: 14,
    fontFamily: 'Vazirmatn',
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  emptyText: {
    fontSize: 16,
    fontFamily: 'Vazirmatn',
    marginBottom: Spacing.xs,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  emptySubtext: {
    fontSize: 14,
    fontFamily: 'Vazirmatn',
    marginTop: Spacing.xs,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  listContent: {
    padding: Spacing.md,
    paddingBottom: 100,
  },
  footer: {
    height: Spacing.xl,
  },
  offlineIndicator: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: Spacing.sm,
    alignItems: 'center',
  },
  offlineText: {
    fontSize: 12,
    fontFamily: 'Vazirmatn',
    textAlign: 'right',
    writingDirection: 'rtl',
  },
});
