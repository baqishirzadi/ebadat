/**
 * Scholar Dashboard
 * Main dashboard for scholars to manage articles
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useApp } from '@/context/AppContext';
import { useScholar } from '@/context/ScholarContext';
import { Article } from '@/types/articles';
import { getScholarArticles } from '@/utils/articleService';
import { getScholarStats } from '@/utils/scholarAnalytics';
import { ScholarStats } from '@/types/analytics';
import { Typography, Spacing, BorderRadius } from '@/constants/theme';
import CenteredText from '@/components/CenteredText';

export default function ScholarDashboardScreen() {
  const { theme } = useApp();
  const { state: scholarState, logout } = useScholar();
  const router = useRouter();
  const [articles, setArticles] = useState<Article[]>([]);
  const [stats, setStats] = useState<ScholarStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (!scholarState.isAuthenticated) {
      router.replace('/scholar/login');
      return;
    }
    loadData();
  }, [scholarState.isAuthenticated]);

  async function loadData() {
    if (!scholarState.scholar) return;

    try {
      setLoading(true);
      const [articlesData, statsData] = await Promise.all([
        getScholarArticles(scholarState.scholar.id),
        getScholarStats(scholarState.scholar.id),
      ]);
      setArticles(articlesData);
      setStats(statsData);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleLogout = async () => {
    await logout();
    router.replace('/scholar/login');
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

  const publishedArticles = articles.filter((a) => a.published);
  const drafts = articles.filter((a) => !a.published || a.draft);

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
        <Pressable onPress={handleLogout} style={styles.logoutButton}>
          <MaterialIcons name="logout" size={24} color="#fff" />
        </Pressable>
        <CenteredText style={styles.headerTitle}>پنل عالم</CenteredText>
        <Pressable
          onPress={() => router.push('/scholar/article/new')}
          style={styles.newButton}
        >
          <MaterialIcons name="add" size={24} color="#fff" />
        </Pressable>
      </View>

      {/* Welcome */}
      {scholarState.scholar && (
        <View style={[styles.welcomeCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
          <CenteredText style={[styles.welcomeText, { color: theme.text }]}>
            خوش آمدید، {scholarState.scholar.fullName}
          </CenteredText>
        </View>
      )}

      {/* Stats */}
      {stats && (
        <View style={styles.statsContainer}>
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
        </View>
      )}

      {/* Quick Actions */}
      <View style={styles.section}>
        <CenteredText style={[styles.sectionTitle, { color: theme.text }]}>
          عملیات سریع
        </CenteredText>
        <Pressable
          onPress={() => router.push('/scholar/article/new')}
          style={({ pressed }) => [
            styles.actionButton,
            { backgroundColor: theme.tint },
            pressed && styles.buttonPressed,
          ]}
        >
          <MaterialIcons name="add-circle" size={24} color="#fff" />
          <CenteredText style={styles.actionButtonText}>مقاله جدید</CenteredText>
        </Pressable>
        <Pressable
          onPress={() => router.push('/scholar/analytics')}
          style={({ pressed }) => [
            styles.actionButton,
            { backgroundColor: theme.card, borderColor: theme.cardBorder },
            pressed && styles.buttonPressed,
          ]}
        >
          <MaterialIcons name="analytics" size={24} color={theme.tint} />
          <CenteredText style={[styles.actionButtonText, { color: theme.text }]}>
            آمار و تحلیل
          </CenteredText>
        </Pressable>
      </View>

      {/* Published Articles */}
      {publishedArticles.length > 0 && (
        <View style={styles.section}>
          <CenteredText style={[styles.sectionTitle, { color: theme.text }]}>
            مقالات منتشر شده
          </CenteredText>
          {publishedArticles.slice(0, 5).map((article) => (
            <Pressable
              key={article.id}
              onPress={() => router.push(`/scholar/article/${article.id}`)}
              style={({ pressed }) => [
                styles.articleItem,
                { backgroundColor: theme.card, borderColor: theme.cardBorder },
                pressed && styles.buttonPressed,
              ]}
            >
              <View style={styles.articleInfo}>
                <CenteredText style={[styles.articleTitle, { color: theme.text }]} numberOfLines={1}>
                  {article.title}
                </CenteredText>
                <CenteredText style={[styles.articleMeta, { color: theme.textSecondary }]}>
                  {article.viewCount} بازدید • {article.bookmarkCount} نشانه
                </CenteredText>
              </View>
              <MaterialIcons name="chevron-left" size={24} color={theme.icon} />
            </Pressable>
          ))}
        </View>
      )}

      {/* Drafts */}
      {drafts.length > 0 && (
        <View style={styles.section}>
          <CenteredText style={[styles.sectionTitle, { color: theme.text }]}>
            پیش‌نویس‌ها
          </CenteredText>
          {drafts.map((article) => (
            <Pressable
              key={article.id}
              onPress={() => router.push(`/scholar/article/${article.id}`)}
              style={({ pressed }) => [
                styles.articleItem,
                { backgroundColor: theme.card, borderColor: theme.cardBorder },
                pressed && styles.buttonPressed,
              ]}
            >
              <View style={styles.articleInfo}>
                <CenteredText style={[styles.articleTitle, { color: theme.text }]} numberOfLines={1}>
                  {article.title || 'بدون عنوان'}
                </CenteredText>
                <CenteredText style={[styles.articleMeta, { color: theme.textSecondary }]}>
                  پیش‌نویس
                </CenteredText>
              </View>
              <MaterialIcons name="chevron-left" size={24} color={theme.icon} />
            </Pressable>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingBottom: Spacing.lg,
    paddingHorizontal: Spacing.lg,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    overflow: 'hidden',
  },
  logoutButton: {
    padding: Spacing.xs,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    fontFamily: 'Vazirmatn',
  },
  newButton: {
    padding: Spacing.xs,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  welcomeCard: {
    margin: Spacing.md,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
  },
  welcomeText: {
    fontSize: 18,
    fontWeight: '600',
    fontFamily: 'Vazirmatn',
  },
  statsContainer: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.lg,
  },
  statCard: {
    flex: 1,
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
    fontFamily: 'Vazirmatn',
  },
  section: {
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: Spacing.md,
    fontFamily: 'Vazirmatn',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.sm,
    borderWidth: 1,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    fontFamily: 'Vazirmatn',
  },
  articleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginBottom: Spacing.sm,
  },
  articleInfo: {
    flex: 1,
    alignItems: 'flex-end',
  },
  articleTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: Spacing.xs,
    fontFamily: 'Vazirmatn',
  },
  articleMeta: {
    fontSize: 12,
    fontFamily: 'Vazirmatn',
  },
  buttonPressed: {
    opacity: 0.8,
  },
  footer: {
    height: 100,
  },
});
