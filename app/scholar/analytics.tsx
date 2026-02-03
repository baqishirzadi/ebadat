/**
 * Scholar Analytics Screen
 * View analytics and statistics
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useApp } from '@/context/AppContext';
import { useScholar } from '@/context/ScholarContext';
import { getScholarStats, getScholarArticleStats } from '@/utils/scholarAnalytics';
import { ScholarStats, ArticleStats } from '@/types/analytics';
import { Typography, Spacing, BorderRadius } from '@/constants/theme';
import CenteredText from '@/components/CenteredText';

export default function ScholarAnalyticsScreen() {
  const { theme } = useApp();
  const { state: scholarState } = useScholar();
  const router = useRouter();
  const [stats, setStats] = useState<ScholarStats | null>(null);
  const [articleStats, setArticleStats] = useState<ArticleStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (!scholarState.isAuthenticated || !scholarState.scholar) {
      router.replace('/scholar/login');
      return;
    }
    loadAnalytics();
  }, [scholarState.isAuthenticated]);

  async function loadAnalytics() {
    if (!scholarState.scholar) return;

    try {
      setLoading(true);
      const [statsData, articleStatsData] = await Promise.all([
        getScholarStats(scholarState.scholar.id),
        getScholarArticleStats(scholarState.scholar.id),
      ]);
      setStats(statsData);
      setArticleStats(articleStatsData);
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadAnalytics();
    setRefreshing(false);
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.tint} />
        </View>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.background }]}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          tintColor={theme.tint}
          colors={[theme.tint]}
        />
      }
    >
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.surahHeader }]}>
        <CenteredText style={styles.headerTitle}>آمار و تحلیل</CenteredText>
      </View>

      {/* Overall Stats */}
      {stats && (
        <View style={styles.statsSection}>
          <View style={[styles.statCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
            <MaterialIcons name="article" size={32} color={theme.tint} />
            <CenteredText style={[styles.statValue, { color: theme.text }]}>
              {stats.totalArticles}
            </CenteredText>
            <CenteredText style={[styles.statLabel, { color: theme.textSecondary }]}>
              مقالات منتشر شده
            </CenteredText>
          </View>

          <View style={[styles.statCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
            <MaterialIcons name="visibility" size={32} color={theme.tint} />
            <CenteredText style={[styles.statValue, { color: theme.text }]}>
              {stats.totalViews}
            </CenteredText>
            <CenteredText style={[styles.statLabel, { color: theme.textSecondary }]}>
              بازدید کل
            </CenteredText>
          </View>

          <View style={[styles.statCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
            <MaterialIcons name="bookmark" size={32} color={theme.tint} />
            <CenteredText style={[styles.statValue, { color: theme.text }]}>
              {stats.totalBookmarks}
            </CenteredText>
            <CenteredText style={[styles.statLabel, { color: theme.textSecondary }]}>
              نشانه‌گذاری
            </CenteredText>
          </View>

          <View style={[styles.statCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
            <MaterialIcons name="trending-up" size={32} color={theme.tint} />
            <CenteredText style={[styles.statValue, { color: theme.text }]}>
              {stats.averageReadingCompletion}%
            </CenteredText>
            <CenteredText style={[styles.statLabel, { color: theme.textSecondary }]}>
              میانگین تکمیل مطالعه
            </CenteredText>
          </View>
        </View>
      )}

      {/* Per-Article Stats */}
      {articleStats.length > 0 && (
        <View style={styles.section}>
          <CenteredText style={[styles.sectionTitle, { color: theme.text }]}>
            آمار هر مقاله
          </CenteredText>
          {articleStats.map((stat) => (
            <View
              key={stat.articleId}
              style={[styles.articleStatCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}
            >
              <CenteredText style={[styles.articleTitle, { color: theme.text }]} numberOfLines={2}>
                {stat.articleTitle}
              </CenteredText>
              <View style={styles.articleStatsRow}>
                <View style={styles.articleStatItem}>
                  <MaterialIcons name="visibility" size={16} color={theme.textSecondary} />
                  <CenteredText style={[styles.articleStatText, { color: theme.textSecondary }]}>
                    {stat.views}
                  </CenteredText>
                </View>
                <View style={styles.articleStatItem}>
                  <MaterialIcons name="bookmark" size={16} color={theme.textSecondary} />
                  <CenteredText style={[styles.articleStatText, { color: theme.textSecondary }]}>
                    {stat.bookmarks}
                  </CenteredText>
                </View>
                <View style={styles.articleStatItem}>
                  <MaterialIcons name="check-circle" size={16} color={theme.textSecondary} />
                  <CenteredText style={[styles.articleStatText, { color: theme.textSecondary }]}>
                    {stat.readingCompletion}%
                  </CenteredText>
                </View>
              </View>
            </View>
          ))}
        </View>
      )}

      <View style={styles.footer} />
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
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    fontFamily: 'Vazirmatn',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsSection: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    padding: Spacing.md,
  },
  statCard: {
    width: '48%',
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    marginTop: Spacing.sm,
    fontFamily: 'Vazirmatn',
  },
  statLabel: {
    fontSize: 12,
    marginTop: Spacing.xs,
    textAlign: 'center',
    fontFamily: 'Vazirmatn',
  },
  section: {
    padding: Spacing.md,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: Spacing.md,
    fontFamily: 'Vazirmatn',
  },
  articleStatCard: {
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginBottom: Spacing.sm,
  },
  articleTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: Spacing.sm,
    fontFamily: 'Vazirmatn',
  },
  articleStatsRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  articleStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  articleStatText: {
    fontSize: 14,
    fontFamily: 'Vazirmatn',
  },
  footer: {
    height: 100,
  },
});
