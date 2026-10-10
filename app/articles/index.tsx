/**
 * Articles Feed Screen
 * Language switch, category chips, scholar strip, a featured article and the
 * latest articles.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Modal, Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ArticleCard } from '@/components/articles/ArticleCard';
import { ArticleText } from '@/components/articles/ArticleText';
import { CategoryFilter } from '@/components/articles/CategoryFilter';
import { ScholarCarousel } from '@/components/articles/ScholarCarousel';
import { categoryName, shortScholarName } from '@/components/articles/articleTheme';
import { contentFallbackChain } from '@/utils/i18n/languages';
import type { AppLanguage } from '@/types/quran';
import { CenteredText } from '@/components/CenteredText';
import { LocalizedText, LocalizedTextInput } from '@/components/ui/LocalizedText';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { useApp } from '@/context/AppContext';
import { useArticles } from '@/context/ArticlesContext';
import type { Article, ArticleCategory, ArticleLanguage, Scholar } from '@/types/articles';
import { verifyPin } from '@/utils/articleAdminService';
import { isArticlesRemoteEnabled } from '@/utils/articleService';
import { directionStyle, writingDirectionFor } from '@/utils/i18n/direction';
import { useI18n } from '@/utils/i18n/useI18n';

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
    id: 'pinned_amir_ali_shir_navai',
    fullName: 'امیرعلی‌شیر نوایی (رح)',
    email: 'amir.ali.shir.navai@local',
    bio: 'ادیب و شاعر بزرگ هراتی با تأکید بر ادب، خدمت و کرامت انسان',
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
    fullName: 'مولانا عبدالرحمن جامی (رح)',
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
  pinned_amir_ali_shir_navai: { authorIds: ['amir_ali_shir_navai'] },
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

function scholarFilterFor(scholar: Scholar): ScholarFilter {
  const pinned = PINNED_SCHOLAR_FILTERS[scholar.id];
  return {
    scholarId: scholar.id,
    scholarName: scholar.fullName,
    authorIds: pinned?.authorIds ?? [scholar.id],
    authorNames: pinned?.authorNames ?? [scholar.fullName],
  };
}

function matchesScholar(article: Article, filter: ScholarFilter): boolean {
  return (
    filter.authorIds.includes(article.authorId) ||
    filter.authorNames.some((name) => normalizeName(name) === normalizeName(article.authorName))
  );
}

const LANGUAGE_OPTIONS: { id: ArticleLanguage; label: string }[] = [
  { id: 'dari', label: 'دری' },
  { id: 'pashto', label: 'پښتو' },
  { id: 'arabic', label: 'العربية' },
  { id: 'turkish', label: 'Türkçe' },
  { id: 'english', label: 'English' },
];

function articleLanguageForApp(appLanguage: string): ArticleLanguage {
  if (appLanguage === 'pashto' || appLanguage === 'arabic' || appLanguage === 'turkish' || appLanguage === 'english') {
    return appLanguage;
  }
  return 'dari';
}

export default function ArticlesFeed() {
  const { theme } = useApp();
  const { t, n, language: appLanguage } = useI18n();
  const { state, refreshArticles, syncArticles, isBookmarked } = useArticles();
  const router = useRouter();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState<ArticleLanguage>(
    articleLanguageForApp(appLanguage),
  );
  const [selectedScholar, setSelectedScholar] = useState<ScholarFilter | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [showAdminPinModal, setShowAdminPinModal] = useState(false);
  const [adminPin, setAdminPin] = useState('');
  const [submittingAdminPin, setSubmittingAdminPin] = useState(false);
  const [adminPinError, setAdminPinError] = useState<string | null>(null);
  const insets = useSafeAreaInsets();
  const scrollY = useRef(new Animated.Value(0)).current;
  const statusBackdropOpacity = scrollY.interpolate({ inputRange: [140, 200], outputRange: [0, 1], extrapolate: 'clamp' });

  useEffect(() => {
    refreshArticles();
  }, [refreshArticles]);

  useEffect(() => {
    setSelectedLanguage(articleLanguageForApp(appLanguage));
  }, [appLanguage]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await syncArticles();
    setRefreshing(false);
  }, [syncArticles]);

  const languageArticles = useMemo(() => {
    const published = state.articles.filter((article) => article.published);
    const exact = published.filter((article) => article.language === selectedLanguage);
    if (exact.length > 0) return exact;
    for (const language of contentFallbackChain(selectedLanguage as AppLanguage)) {
      const next = published.filter((article) => article.language === language);
      if (next.length > 0) return next;
    }
    return published;
  }, [selectedLanguage, state.articles]);

  const scholarArticles = useMemo(
    () => (selectedScholar ? languageArticles.filter((article) => matchesScholar(article, selectedScholar)) : languageArticles),
    [languageArticles, selectedScholar],
  );

  const filteredArticles = useMemo(
    () => (selectedCategory ? scholarArticles.filter((article) => article.category === selectedCategory) : scholarArticles),
    [scholarArticles, selectedCategory],
  );

  const isShowingScholarFallback = !!selectedScholar && !!selectedCategory && filteredArticles.length === 0 && scholarArticles.length > 0;
  const displayArticles = isShowingScholarFallback ? scholarArticles : filteredArticles;

  const categoryCounts = useMemo(() => {
    const counts: Partial<Record<ArticleCategory, number>> = {};
    for (const article of scholarArticles) counts[article.category] = (counts[article.category] ?? 0) + 1;
    return counts;
  }, [scholarArticles]);

  const displayScholars = useMemo(() => {
    const seen = new Set<string>();
    return [...PINNED_SCHOLARS, ...state.scholars].filter((scholar) => {
      const key = normalizeName(scholar.fullName);
      if (seen.has(key)) return false;
      seen.add(key);
      const filter = scholarFilterFor(scholar);
      return languageArticles.some((article) => matchesScholar(article, filter));
    });
  }, [languageArticles, state.scholars]);

  const showFeatured = !selectedCategory && !selectedScholar && displayArticles.length > 2;
  const featuredArticle = showFeatured ? displayArticles[0] : null;
  const listArticles = featuredArticle ? displayArticles.slice(1) : displayArticles;

  const handleArticlePress = useCallback((articleId: string) => router.push(`/articles/${articleId}`), [router]);

  const handleScholarPress = useCallback((scholar: Scholar) => {
    setSelectedScholar((previous) => (previous?.scholarId === scholar.id ? null : scholarFilterFor(scholar)));
  }, []);

  const openAdminPinModal = useCallback(() => {
    setAdminPin('');
    setAdminPinError(null);
    setShowAdminPinModal(true);
  }, []);

  const closeAdminPinModal = useCallback(() => {
    setShowAdminPinModal(false);
    setAdminPin('');
    setAdminPinError(null);
  }, []);

  const handleAdminPinSubmit = useCallback(async () => {
    const normalizedPin = adminPin.trim();
    if (!normalizedPin) {
      setAdminPinError(t('articles.admin.pinRequired'));
      return;
    }
    try {
      setSubmittingAdminPin(true);
      setAdminPinError(null);
      const valid = await verifyPin(normalizedPin);
      if (!valid) {
        setAdminPinError(t('articles.admin.pinWrong'));
        return;
      }
      closeAdminPinModal();
      router.push('/articles/admin');
    } catch (error) {
      setAdminPinError(t('articles.admin.pinFailed'));
      if (__DEV__) console.warn('[ArticlesAdmin] verifyPin failed', error);
    } finally {
      setSubmittingAdminPin(false);
    }
  }, [adminPin, closeAdminPinModal, router, t]);

  const chromeText = { textAlign: 'auto' as const, writingDirection: writingDirectionFor(appLanguage) };

  const renderArticle = useCallback(
    ({ item }: { item: Article }) => (
      <ArticleCard article={item} isBookmarked={isBookmarked(item.id)} onPress={() => handleArticlePress(item.id)} />
    ),
    [handleArticlePress, isBookmarked],
  );

  const listHeader = (
    <View>
      <Pressable onLongPress={openAdminPinModal} delayLongPress={650}>
        <ScreenHeader title={t('articles.title')} subtitle={t('articles.subtitle')} icon="article" />
      </Pressable>

      <View style={styles.controls}>
        <View
          style={[styles.languageTrack, directionStyle(appLanguage), { backgroundColor: theme.backgroundSecondary, borderColor: theme.cardBorder }]}
          accessibilityRole="tablist"
          accessibilityLabel={t('articles.languageLabel')}
        >
          {LANGUAGE_OPTIONS.map((option) => {
            const selected = selectedLanguage === option.id;
            return (
              <Pressable
                key={option.id}
                testID={`articles-language-${option.id}`}
                accessibilityRole="tab"
                accessibilityState={{ selected }}
                onPress={() => {
                  setSelectedLanguage(option.id);
                  setSelectedScholar(null);
                  setSelectedCategory(null);
                }}
                style={[styles.languageOption, selected && [styles.languageOptionSelected, { backgroundColor: theme.card }]]}
              >
                <ArticleText
                  language={option.id}
                  align="center"
                  style={[styles.languageText, { color: selected ? theme.tint : theme.textSecondary }, selected && styles.languageTextSelected]}
                >
                  {option.label}
                </ArticleText>
              </Pressable>
            );
          })}
        </View>

        <CategoryFilter selectedCategory={selectedCategory} onSelectCategory={setSelectedCategory} counts={categoryCounts} />

        {displayScholars.length > 0 ? (
          <View style={styles.scholarsBlock}>
            <LocalizedText style={[styles.sectionLabel, chromeText, { color: theme.textSecondary }]}>
              {t('articles.scholars')}
            </LocalizedText>
            <ScholarCarousel scholars={displayScholars} selectedId={selectedScholar?.scholarId} onSelect={handleScholarPress} />
          </View>
        ) : null}

        {selectedScholar ? (
          <View style={[styles.filterRow, directionStyle(appLanguage)]}>
            <Pressable
              onPress={() => setSelectedScholar(null)}
              style={[styles.filterChip, { backgroundColor: `${theme.tint}14`, borderColor: `${theme.tint}55` }]}
              accessibilityRole="button"
              accessibilityLabel={t('articles.clearFilter')}
            >
              <LocalizedText numberOfLines={1} style={[styles.filterChipText, { color: theme.tint }]}>
                {t('articles.byScholar', { name: shortScholarName(selectedScholar.scholarName) })}
              </LocalizedText>
              <MaterialIcons name="close" size={16} color={theme.tint} />
            </Pressable>
          </View>
        ) : null}

        {isShowingScholarFallback && selectedCategory ? (
          <View style={[styles.notice, { backgroundColor: theme.backgroundSecondary, borderColor: theme.cardBorder }]}>
            <LocalizedText style={[styles.noticeText, chromeText, { color: theme.textSecondary }]}>
              {t('articles.scholarFallback', { category: categoryName(selectedCategory, appLanguage) })}
            </LocalizedText>
          </View>
        ) : null}
      </View>

      <View style={styles.listPadding}>
        {featuredArticle ? (
          <ArticleCard
            variant="featured"
            article={featuredArticle}
            isBookmarked={isBookmarked(featuredArticle.id)}
            onPress={() => handleArticlePress(featuredArticle.id)}
          />
        ) : null}

        {displayArticles.length > 0 ? (
          <View style={[styles.sectionHeader, directionStyle(appLanguage)]}>
            <LocalizedText style={[styles.sectionTitle, chromeText, { color: theme.text }]}>
              {selectedScholar ? shortScholarName(selectedScholar.scholarName) : selectedCategory ? categoryName(selectedCategory, appLanguage) : t('articles.latest')}
            </LocalizedText>
            <LocalizedText style={[styles.sectionCount, { color: theme.textSecondary }]}>
              {t('articles.count', { count: n(displayArticles.length) })}
            </LocalizedText>
          </View>
        ) : null}
      </View>
    </View>
  );

  const emptyState = (
    <View style={styles.emptyContainer}>
      <View style={[styles.emptyIcon, { backgroundColor: theme.backgroundSecondary }]}>
        <MaterialIcons name="menu-book" size={30} color={theme.textSecondary} />
      </View>
      {!isArticlesRemoteEnabled() && state.articles.length === 0 ? (
        <>
          <CenteredText style={[styles.emptyText, { color: theme.text }]}>{t('articles.empty.demo')}</CenteredText>
          <CenteredText style={[styles.emptySubtext, { color: theme.textSecondary }]}>{t('articles.empty.demoHint')}</CenteredText>
        </>
      ) : state.error && state.articles.length === 0 ? (
        <CenteredText style={[styles.emptyText, { color: '#C62828' }]}>{state.error}</CenteredText>
      ) : state.articles.length === 0 ? (
        <>
          <CenteredText style={[styles.emptyText, { color: theme.text }]}>{t('articles.empty.none')}</CenteredText>
          <CenteredText style={[styles.emptySubtext, { color: theme.textSecondary }]}>{t('articles.empty.noneHint')}</CenteredText>
        </>
      ) : (
        <>
          <CenteredText style={[styles.emptyText, { color: theme.text }]}>{t('articles.empty.filter')}</CenteredText>
          {selectedScholar || selectedCategory ? (
            <Pressable
              onPress={() => {
                setSelectedScholar(null);
                setSelectedCategory(null);
              }}
              style={[styles.emptyButton, { backgroundColor: theme.tint }]}
            >
              <LocalizedText style={[styles.emptyButtonText, { color: theme.onTint }]}>{t('articles.clearFilter')}</LocalizedText>
            </Pressable>
          ) : null}
        </>
      )}
    </View>
  );

  return (
    <View testID="ios-articles-ready" style={[styles.container, { backgroundColor: theme.background }]}>
      {state.isLoading && state.articles.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.tint} />
          <CenteredText style={[styles.loadingText, { color: theme.textSecondary }]}>{t('common.loading')}</CenteredText>
        </View>
      ) : (
        <Animated.FlatList
          testID="ios-articles-list"
          data={listArticles}
          keyExtractor={(item) => item.id}
          renderItem={renderArticle}
          ListHeaderComponent={listHeader}
          ListEmptyComponent={featuredArticle ? null : emptyState}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={theme.tint} colors={[theme.tint]} />
          }
          showsVerticalScrollIndicator={false}
          onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: true })}
          scrollEventThrottle={16}
        />
      )}

      <Animated.View
        pointerEvents="none"
        style={[
          styles.statusBackdrop,
          { height: insets.top, backgroundColor: theme.background, borderBottomColor: theme.cardBorder, opacity: statusBackdropOpacity },
        ]}
      />

      {state.isOffline ? (
        <View style={[styles.offlineIndicator, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
          <MaterialIcons name="cloud-off" size={15} color={theme.textSecondary} />
          <LocalizedText style={[styles.offlineText, { color: theme.textSecondary }]}>{t('articles.offline')}</LocalizedText>
        </View>
      ) : null}

      <Modal visible={showAdminPinModal} transparent animationType="fade" onRequestClose={closeAdminPinModal}>
        <View style={styles.pinModalOverlay}>
          <View style={[styles.pinModalContent, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
            <CenteredText style={[styles.pinModalTitle, { color: theme.text }]}>{t('articles.admin.title')}</CenteredText>
            <LocalizedTextInput
              value={adminPin}
              onChangeText={(value) => {
                setAdminPin(value);
                if (adminPinError) setAdminPinError(null);
              }}
              placeholder="PIN"
              placeholderTextColor={theme.textSecondary}
              secureTextEntry
              keyboardType="number-pad"
              maxLength={8}
              style={[styles.pinInput, { borderColor: theme.cardBorder, color: theme.text, backgroundColor: theme.backgroundSecondary }]}
              textAlign="center"
            />
            {adminPinError ? <CenteredText style={styles.pinErrorText}>{adminPinError}</CenteredText> : null}
            <View style={[styles.pinActions, directionStyle(appLanguage)]}>
              <Pressable
                onPress={handleAdminPinSubmit}
                disabled={submittingAdminPin}
                style={[styles.pinConfirmButton, { backgroundColor: theme.tint }]}
              >
                {submittingAdminPin ? (
                  <ActivityIndicator size="small" color={theme.onTint} />
                ) : (
                  <CenteredText style={[styles.pinConfirmText, { color: theme.onTint }]}>{t('articles.admin.confirm')}</CenteredText>
                )}
              </Pressable>
              <Pressable
                onPress={closeAdminPinModal}
                disabled={submittingAdminPin}
                style={[styles.pinCancelButton, { borderColor: theme.cardBorder, backgroundColor: theme.backgroundSecondary }]}
              >
                <CenteredText style={[styles.pinCancelText, { color: theme.text }]}>{t('common.cancel')}</CenteredText>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  statusBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  controls: {
    paddingTop: 16,
    gap: 14,
  },
  languageTrack: {
    flexDirection: 'row',
    marginHorizontal: 16,
    padding: 4,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
  },
  languageOption: {
    flex: 1,
    minHeight: 40,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  languageOptionSelected: {
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  languageText: {
    fontSize: 15,
    lineHeight: 24,
  },
  languageTextSelected: {
    fontWeight: '700',
  },
  scholarsBlock: {
    gap: 8,
  },
  sectionLabel: {
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '700',
    paddingHorizontal: 18,
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    maxWidth: '100%',
    paddingHorizontal: 14,
    minHeight: 34,
    borderRadius: 999,
    borderWidth: 1,
  },
  filterChipText: {
    flexShrink: 1,
    fontSize: 13,
    lineHeight: 21,
    fontWeight: '700',
  },
  notice: {
    marginHorizontal: 16,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  noticeText: {
    fontSize: 13,
    lineHeight: 22,
  },
  listPadding: {
    paddingHorizontal: 16,
    paddingTop: 18,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    gap: 12,
  },
  sectionTitle: {
    flex: 1,
    fontSize: 17,
    lineHeight: 28,
    fontWeight: '700',
  },
  sectionCount: {
    fontSize: 12.5,
    lineHeight: 20,
  },
  listContent: {
    paddingBottom: 110,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 40,
    gap: 10,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyText: {
    fontSize: 16,
    lineHeight: 26,
    fontWeight: '700',
  },
  emptySubtext: {
    fontSize: 13.5,
    lineHeight: 22,
  },
  emptyButton: {
    marginTop: 6,
    paddingHorizontal: 20,
    paddingVertical: 9,
    borderRadius: 999,
  },
  emptyButtonText: {
    color: '#fff',
    fontSize: 13.5,
    lineHeight: 21,
    fontWeight: '700',
    textAlign: 'center',
  },
  offlineIndicator: {
    position: 'absolute',
    bottom: 96,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
  },
  offlineText: {
    fontSize: 12,
    lineHeight: 19,
  },
  pinModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  pinModalContent: {
    width: '100%',
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    gap: 10,
  },
  pinModalTitle: {
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  pinInput: {
    borderWidth: 1,
    borderRadius: 10,
    minHeight: 44,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  pinErrorText: {
    color: '#C62828',
    fontSize: 12,
    textAlign: 'center',
  },
  pinActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  pinConfirmButton: {
    flex: 1,
    minHeight: 42,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pinConfirmText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  pinCancelButton: {
    flex: 1,
    minHeight: 42,
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pinCancelText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
