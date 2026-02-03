/**
 * Articles Feed Screen
 * Shows featured scholars and latest articles
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useApp } from '@/context/AppContext';
import { useArticles } from '@/context/ArticlesContext';
import { Article, Scholar } from '@/types/articles';
import { Spacing } from '@/constants/theme';
import { ScholarCarousel } from '@/components/articles/ScholarCarousel';
import { ArticleCard } from '@/components/articles/ArticleCard';
import { CategoryFilter } from '@/components/articles/CategoryFilter';
import CenteredText from '@/components/CenteredText';
import { isFirebaseConfigured } from '@/utils/firebase';

export default function ArticlesFeed() {
  const { theme } = useApp();
  const { state, refreshArticles, syncArticles, isBookmarked } = useArticles();
  const router = useRouter();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState<'dari' | 'pashto'>('dari');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    console.log('[ArticlesFeed] Component mounted, refreshing articles...');
    console.log('[ArticlesFeed] Current state:', {
      articlesCount: state.articles.length,
      isLoading: state.isLoading,
      isOffline: state.isOffline,
      scholarsCount: state.scholars.length,
    });
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

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.surahHeader }]}>
        <CenteredText style={styles.headerTitle}>مقالات</CenteredText>
        <CenteredText style={styles.headerSubtitle}>
          مقالات و نوشته‌های علما
        </CenteredText>
      </View>

      {/* Featured Scholars Carousel */}
      {state.scholars.length > 0 && (
        <ScholarCarousel scholars={state.scholars} />
      )}

      {/* Category Filter */}
      <CategoryFilter
        selectedCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
        selectedLanguage={selectedLanguage}
        onSelectLanguage={setSelectedLanguage}
      />

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
          {!isFirebaseConfigured() ? (
            <>
              <CenteredText style={[styles.emptyText, { color: theme.textSecondary }]}>
                Firebase تنظیم نشده است
              </CenteredText>
              <CenteredText style={[styles.emptySubtext, { color: theme.textSecondary }]}>
                لطفاً تنظیمات Firebase را بررسی کنید
              </CenteredText>
            </>
          ) : state.articles.length === 0 && !state.isLoading ? (
            <>
              <CenteredText style={[styles.emptyText, { color: theme.textSecondary }]}>
                مقاله‌ای یافت نشد
              </CenteredText>
              <CenteredText style={[styles.emptySubtext, { color: theme.textSecondary }]}>
                برای اضافه کردن مقالات، اسکریپت seedArticles.js را اجرا کنید
              </CenteredText>
            </>
          ) : (
            <CenteredText style={[styles.emptyText, { color: theme.textSecondary }]}>
              مقاله‌ای با فیلتر انتخابی یافت نشد
            </CenteredText>
          )}
        </View>
      ) : (
        <FlatList
          data={filteredArticles}
          keyExtractor={(item) => item.id}
          renderItem={renderArticle}
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
          ListFooterComponent={<View style={styles.footer} />}
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
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: '#fff',
    fontFamily: 'Vazirmatn',
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginTop: Spacing.xs,
    fontFamily: 'Vazirmatn',
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
  },
  emptySubtext: {
    fontSize: 14,
    fontFamily: 'Vazirmatn',
    marginTop: Spacing.xs,
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
  },
});
