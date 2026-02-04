/**
 * Article Reading Screen
 * Immersive reading experience with bookmark and share
 */

import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Animated,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useApp } from '@/context/AppContext';
import { useArticles } from '@/context/ArticlesContext';
import { getArticleById } from '@/utils/articleService';
import { trackArticleView, trackReadingProgress, trackBookmark } from '@/utils/analyticsService';
import { Spacing, Typography } from '@/constants/theme';
import { ArticleReader } from '@/components/articles/ArticleReader';
import { BookmarkButton } from '@/components/articles/BookmarkButton';
import { ShareButton } from '@/components/articles/ShareButton';
import CenteredText from '@/components/CenteredText';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function ArticleReadingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { theme } = useApp();
  const { toggleBookmark, isBookmarked } = useArticles();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [article, setArticle] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const scrollY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadArticle();
  }, [id]);

  useEffect(() => {
    if (article && article.published) {
      trackArticleView(article.id);
    }
  }, [article]);

  async function loadArticle() {
    try {
      setLoading(true);
      const loadedArticle = await getArticleById(id);
      if (loadedArticle) {
        setArticle(loadedArticle);
      }
    } catch (error) {
      console.error('Error loading article:', error);
    } finally {
      setLoading(false);
    }
  }

  const handleScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
    { useNativeDriver: true }
  );

  const handleScrollEnd = (event: any) => {
    if (!article) return;
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    const scrollPercentage =
      (contentOffset.y / (contentSize.height - layoutMeasurement.height)) * 100;
    trackReadingProgress(article.id, Math.min(100, Math.max(0, scrollPercentage)));
  };

  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 60],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.tint} />
          <CenteredText style={[styles.loadingText, { color: theme.textSecondary }]}>
            در حال بارگذاری...
          </CenteredText>
        </View>
      </View>
    );
  }

  if (!article) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <CenteredText style={[styles.errorText, { color: theme.text }]}>
          مقاله یافت نشد
        </CenteredText>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />

      <Animated.View
        style={[
          styles.backButtonContainer,
          {
            top: insets.top + Spacing.sm,
            opacity: headerOpacity,
          },
        ]}
      >
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [
            styles.backButton,
            { backgroundColor: 'rgba(0,0,0,0.25)' },
            pressed && styles.backButtonPressed,
          ]}
        >
          <MaterialIcons name="arrow-forward" size={22} color="#fff" />
        </Pressable>
      </Animated.View>

      <Animated.ScrollView
        style={styles.scrollView}
        onScroll={handleScroll}
        onScrollEndDrag={handleScrollEnd}
        onMomentumScrollEnd={handleScrollEnd}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
      >
        <ArticleReader article={article} />
      </Animated.ScrollView>

      {/* Floating Actions */}
      <View style={styles.floatingActions}>
        <BookmarkButton
          isBookmarked={isBookmarked(article.id)}
          onToggle={async () => {
            const wasBookmarked = isBookmarked(article.id);
            await toggleBookmark(article.id);
            await trackBookmark(article.id, !wasBookmarked);
          }}
        />
        <ShareButton article={article} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
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
  errorText: {
    fontSize: 16,
    fontFamily: 'Vazirmatn',
  },
  floatingActions: {
    position: 'absolute',
    bottom: 100,
    left: Spacing.lg,
    gap: Spacing.md,
  },
  backButtonContainer: {
    position: 'absolute',
    right: Spacing.lg,
    zIndex: 20,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  backButtonPressed: {
    opacity: 0.85,
  },
});
