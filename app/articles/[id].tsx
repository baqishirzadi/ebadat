/**
 * Article Reading Screen
 * Sticky top bar with a reading progress line, the book-like reader, and the
 * reading settings sheet.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Pressable, Share, StyleSheet, View } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ArticleReader } from '@/components/articles/ArticleReader';
import { ArticleText } from '@/components/articles/ArticleText';
import { ReaderSettingsSheet } from '@/components/articles/ReaderSettingsSheet';
import { categoryPalette, withAlpha } from '@/components/articles/articleTheme';
import { CenteredText } from '@/components/CenteredText';
import { LocalizedText } from '@/components/ui/LocalizedText';
import { useApp } from '@/context/AppContext';
import { useArticles } from '@/context/ArticlesContext';
import { useArticleReaderSettings } from '@/hooks/useArticleReaderSettings';
import type { Article } from '@/types/articles';
import { trackArticleView, trackBookmark, trackReadingProgress, trackShare } from '@/utils/analyticsService';
import { getArticleById } from '@/utils/articleService';
import { backIconName, directionStyle } from '@/utils/i18n/direction';
import { useI18n } from '@/utils/i18n/useI18n';

const BAR_HEIGHT = 52;

export default function ArticleReadingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { theme } = useApp();
  const { t, language } = useI18n();
  const { toggleBookmark, isBookmarked } = useArticles();
  const { tokens } = useArticleReaderSettings();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [scrollRange, setScrollRange] = useState(1);
  const scrollY = useRef(new Animated.Value(0)).current;
  const contentHeight = useRef(0);
  const viewportHeight = useRef(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getArticleById(id)
      .then((loaded) => {
        if (!cancelled && loaded) setArticle(loaded);
      })
      .catch((error) => console.error('Error loading article:', error))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    if (article?.published) trackArticleView(article.id);
  }, [article]);

  const updateScrollRange = useCallback(() => {
    setScrollRange(Math.max(1, contentHeight.current - viewportHeight.current));
  }, []);

  const handleScroll = Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
    useNativeDriver: true,
  });

  const handleScrollEnd = (event: any) => {
    if (!article) return;
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    const range = Math.max(1, contentSize.height - layoutMeasurement.height);
    trackReadingProgress(article.id, Math.min(100, Math.max(0, (contentOffset.y / range) * 100)));
  };

  const goBack = () => {
    if (router.canGoBack?.()) router.back();
    else router.replace('/(tabs)/articles');
  };

  const handleShare = async () => {
    if (!article) return;
    try {
      await Share.share({ message: `${article.title}\n\n${article.authorName}`, title: article.title });
      await trackShare(article.id);
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const handleBookmark = async () => {
    if (!article) return;
    const wasBookmarked = isBookmarked(article.id);
    await toggleBookmark(article.id);
    await trackBookmark(article.id, !wasBookmarked);
  };

  if (loading || !article) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: theme.background }]}>
        <Stack.Screen options={{ headerShown: false }} />
        {loading ? (
          <ActivityIndicator size="large" color={theme.tint} />
        ) : (
          <>
            <CenteredText style={[styles.message, { color: theme.text }]}>{t('articles.notFound')}</CenteredText>
            <Pressable onPress={goBack} style={[styles.notFoundBack, { backgroundColor: theme.tint }]}>
              <LocalizedText style={[styles.notFoundBackText, { color: theme.onTint }]}>{t('common.back')}</LocalizedText>
            </Pressable>
          </>
        )}
      </View>
    );
  }

  const palette = categoryPalette(article.category);
  const accent = tokens.isDark ? palette.accent : palette.primary;
  const bookmarked = isBookmarked(article.id);
  const topInset = insets.top + BAR_HEIGHT;

  const barBackgroundOpacity = scrollY.interpolate({ inputRange: [24, 110], outputRange: [0, 1], extrapolate: 'clamp' });
  const barTitleOpacity = scrollY.interpolate({ inputRange: [150, 230], outputRange: [0, 1], extrapolate: 'clamp' });
  const progress = scrollY.interpolate({ inputRange: [0, scrollRange], outputRange: [0, 1], extrapolate: 'clamp' });

  const iconButtonStyle = [styles.iconButton, { backgroundColor: withAlpha(tokens.page, 0.72), borderColor: tokens.border }];

  return (
    <View testID="ios-article-detail-ready" style={[styles.container, { backgroundColor: tokens.page }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar style={tokens.isDark ? 'light' : 'dark'} />

      <Animated.ScrollView
        style={styles.container}
        onScroll={handleScroll}
        onScrollEndDrag={handleScrollEnd}
        onMomentumScrollEnd={handleScrollEnd}
        onLayout={(event) => {
          viewportHeight.current = event.nativeEvent.layout.height;
          updateScrollRange();
        }}
        onContentSizeChange={(_width, height) => {
          contentHeight.current = height;
          updateScrollRange();
        }}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
      >
        <ArticleReader
          article={article}
          topInset={topInset}
          footer={
            <View style={styles.footerActions}>
              <Pressable
                onPress={handleBookmark}
                style={[
                  styles.footerButton,
                  { borderColor: bookmarked ? accent : tokens.border, backgroundColor: bookmarked ? withAlpha(accent, 0.12) : 'transparent' },
                ]}
              >
                <MaterialIcons name={bookmarked ? 'bookmark' : 'bookmark-border'} size={20} color={accent} />
                <LocalizedText style={[styles.footerButtonText, { color: accent }]}>{t('articles.bookmark')}</LocalizedText>
              </Pressable>
              <Pressable onPress={handleShare} style={[styles.footerButton, { borderColor: tokens.border }]}>
                <MaterialIcons name="share" size={19} color={accent} />
                <LocalizedText style={[styles.footerButtonText, { color: accent }]}>{t('articles.share')}</LocalizedText>
              </Pressable>
            </View>
          }
        />
      </Animated.ScrollView>

      <View pointerEvents="box-none" style={[styles.topBar, { height: topInset }]}>
        <Animated.View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: tokens.page, borderBottomColor: tokens.border, opacity: barBackgroundOpacity },
            styles.topBarBackground,
          ]}
        />
        <View style={[styles.topBarRow, directionStyle(language), { marginTop: insets.top }]}>
          <Pressable onPress={goBack} hitSlop={6} style={iconButtonStyle} accessibilityRole="button" accessibilityLabel={t('common.back')}>
            <View style={styles.iconUnmirrored}>
              <MaterialIcons name={backIconName(language)} size={22} color={tokens.text} />
            </View>
          </Pressable>

          <Animated.View style={[styles.barTitle, { opacity: barTitleOpacity }]} pointerEvents="none">
            <ArticleText language={article.language} align="center" numberOfLines={1} style={[styles.barTitleText, { color: tokens.text }]}>
              {article.title}
            </ArticleText>
          </Animated.View>

          <View style={styles.barActions}>
            <Pressable
              testID="article-reader-settings-button"
              onPress={() => setSettingsOpen(true)}
              hitSlop={6}
              style={iconButtonStyle}
              accessibilityRole="button"
              accessibilityLabel={t('articles.reader.settings')}
            >
              <MaterialIcons name="text-fields" size={21} color={tokens.text} />
            </Pressable>
            <Pressable onPress={handleShare} hitSlop={6} style={iconButtonStyle} accessibilityRole="button" accessibilityLabel={t('articles.share')}>
              <MaterialIcons name="share" size={19} color={tokens.text} />
            </Pressable>
            <Pressable onPress={handleBookmark} hitSlop={6} style={iconButtonStyle} accessibilityRole="button" accessibilityLabel={t('articles.bookmark')}>
              <MaterialIcons name={bookmarked ? 'bookmark' : 'bookmark-border'} size={21} color={bookmarked ? accent : tokens.text} />
            </Pressable>
          </View>
        </View>
        <View style={styles.progressTrack}>
          <Animated.View
            style={[
              styles.progressFill,
              { backgroundColor: accent, transform: [{ scaleX: progress }] },
            ]}
          />
        </View>
      </View>

      <ReaderSettingsSheet
        visible={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        articleLanguage={article.language}
        accent={accent}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  message: {
    fontSize: 16,
  },
  notFoundBack: {
    paddingHorizontal: 22,
    paddingVertical: 10,
    borderRadius: 999,
  },
  notFoundBackText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 20,
  },
  topBarBackground: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  topBarRow: {
    height: BAR_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    gap: 10,
  },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconUnmirrored: {
    direction: 'ltr',
  },
  barTitle: {
    flex: 1,
  },
  barTitleText: {
    fontSize: 15,
    lineHeight: 24,
    fontWeight: '700',
  },
  barActions: {
    flexDirection: 'row',
    gap: 8,
  },
  progressTrack: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 2,
    overflow: 'hidden',
    direction: 'rtl',
  },
  progressFill: {
    height: 2,
    width: '100%',
    transformOrigin: 'right',
  },
  footerActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 18,
  },
  footerButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 11,
  },
  footerButtonText: {
    fontSize: 14,
    lineHeight: 22,
    fontWeight: '700',
  },
});
