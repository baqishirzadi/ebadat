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
} from 'react-native';
import { useRouter } from 'expo-router';
import { useApp } from '@/context/AppContext';
import { useArticles } from '@/context/ArticlesContext';
import { Article, Scholar } from '@/types/articles';
import { Spacing, BorderRadius } from '@/constants/theme';
import { ArticleCard } from '@/components/articles/ArticleCard';
import { CategoryFilter } from '@/components/articles/CategoryFilter';
import CenteredText from '@/components/CenteredText';
import { isArticlesRemoteEnabled } from '@/utils/articleService';

export default function ArticlesFeed() {
  const { theme } = useApp();
  const { state, refreshArticles, syncArticles, isBookmarked } = useArticles();
  const router = useRouter();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState<'dari' | 'pashto'>('dari');
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

  const filteredArticles = state.articles.filter((article) => {
    if (selectedCategory && article.category !== selectedCategory) return false;
    if (article.language !== selectedLanguage) return false;
    return article.published;
  });

  const handleArticlePress = useCallback(
    (articleId: string) => {
      router.push(`/articles/${articleId}`);
    },
    [router]
  );

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
      <View style={[styles.scholarCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
        <CenteredText style={[styles.scholarName, { color: theme.text }]} numberOfLines={2}>
          {item.fullName}
        </CenteredText>
      </View>
    ),
    [theme]
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
      <View style={[styles.header, { backgroundColor: theme.surahHeader }]}>
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
      </View>

      <CategoryFilter
        selectedCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
        selectedLanguage={selectedLanguage}
        onSelectLanguage={setSelectedLanguage}
      />
    </Animated.View>
  );

  const renderListFooter = () => (
    <View>
      {state.scholars.length > 0 && (
        <View style={styles.scholarsSectionFooter}>
          <CenteredText style={[styles.scholarsTitle, { color: theme.text }]}>
            علما و نویسندگان
          </CenteredText>
          <FlatList
            data={state.scholars}
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
              <CenteredText style={[styles.emptyText, { color: theme.error || '#F44336' }]}>
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
  },
  headerWrapper: {
    width: '100%',
    overflow: 'hidden',
    alignSelf: 'stretch',
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
