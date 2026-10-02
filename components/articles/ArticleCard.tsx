/**
 * Article Card
 * List row with category tile, title, excerpt and byline. The `featured`
 * variant is the large tinted card at the top of the feed.
 */

import React, { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { ArticleText } from '@/components/articles/ArticleText';
import {
  ARTICLE_DIRECTION,
  categoryIcon,
  categoryName,
  categoryPalette,
  scholarInitial,
  scholarTone,
  withAlpha,
} from '@/components/articles/articleTheme';
import { getArticleExcerpt } from '@/components/articles/parseArticleBlocks';
import { LocalizedText } from '@/components/ui/LocalizedText';
import { useApp } from '@/context/AppContext';
import type { Article } from '@/types/articles';
import { translateUi } from '@/utils/i18n/catalog';
import { useI18n } from '@/utils/i18n/useI18n';
import { formatNumber } from '@/utils/numbers';

interface ArticleCardProps {
  article: Article;
  isBookmarked: boolean;
  onPress: () => void;
  variant?: 'default' | 'featured';
}

export function ArticleCard({ article, isBookmarked, onPress, variant = 'default' }: ArticleCardProps) {
  const { theme, themeMode } = useApp();
  const { t } = useI18n();
  const language = article.language;
  const palette = categoryPalette(article.category);
  const isDark = themeMode === 'night';
  const excerpt = useMemo(() => getArticleExcerpt(article.body), [article.body]);
  const minutes = translateUi('articles.minutes', language, {
    count: formatNumber(Math.max(1, article.readingTimeEstimate || 1), language),
  });
  const category = categoryName(article.category, language);

  if (variant === 'featured') {
    return (
      <Pressable
        testID="ios-article-card"
        onPress={onPress}
        accessibilityRole="button"
        style={({ pressed }) => [styles.featuredShell, pressed && styles.pressed]}
      >
        <LinearGradient
          colors={[palette.deep, palette.primary]}
          start={{ x: 1, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={[styles.featured, ARTICLE_DIRECTION]}
        >
          <View style={styles.featuredWatermark} pointerEvents="none">
            <MaterialIcons name={categoryIcon(article.category) as any} size={150} color="rgba(255,255,255,0.07)" />
          </View>

          <View style={styles.featuredTopRow}>
            <View style={[styles.featuredBadge, { borderColor: withAlpha(palette.accent, 0.7) }]}>
              <MaterialIcons name="auto-awesome" size={13} color={palette.accent} />
              <LocalizedText style={[styles.featuredBadgeText, { color: palette.accent }]}>{t('articles.featured')}</LocalizedText>
            </View>
            <ArticleText language={language} style={styles.featuredCategory}>
              {category}
            </ArticleText>
            {isBookmarked ? <MaterialIcons name="bookmark" size={20} color="#FFFFFF" /> : null}
          </View>

          <ArticleText language={language} numberOfLines={3} style={styles.featuredTitle}>
            {article.title}
          </ArticleText>
          {excerpt ? (
            <ArticleText language={language} numberOfLines={3} style={styles.featuredExcerpt}>
              {excerpt}
            </ArticleText>
          ) : null}

          <View style={styles.featuredByline}>
            <View style={[styles.avatar, styles.featuredAvatar, { backgroundColor: 'rgba(255,255,255,0.18)' }]}>
              <ArticleText language="dari" align="center" style={styles.avatarText}>
                {scholarInitial(article.authorName)}
              </ArticleText>
            </View>
            <View style={styles.bylineText}>
              <ArticleText language={language} numberOfLines={1} style={styles.featuredAuthor}>
                {article.authorName}
              </ArticleText>
              <ArticleText language={language} numberOfLines={1} style={styles.featuredMeta}>
                {minutes}
              </ArticleText>
            </View>
            <View style={styles.featuredArrow}>
              <View style={styles.iconUnmirrored}>
                <MaterialIcons name="arrow-back" size={20} color={palette.deep} />
              </View>
            </View>
          </View>
        </LinearGradient>
      </Pressable>
    );
  }

  const tint = isDark ? palette.accent : palette.primary;

  return (
    <Pressable
      testID="ios-article-card"
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.card,
        ARTICLE_DIRECTION,
        { backgroundColor: theme.card, borderColor: theme.cardBorder },
        pressed && styles.pressed,
      ]}
    >
      <View style={[styles.tile, { backgroundColor: withAlpha(tint, isDark ? 0.16 : 0.1) }]}>
        <MaterialIcons name={categoryIcon(article.category) as any} size={22} color={tint} />
      </View>

      <View style={styles.cardBody}>
        <View style={styles.cardTopRow}>
          <ArticleText language={language} numberOfLines={1} style={[styles.cardCategory, { color: tint }]}>
            {category}
          </ArticleText>
          {isBookmarked ? <MaterialIcons name="bookmark" size={18} color={tint} /> : null}
        </View>

        <ArticleText language={language} numberOfLines={2} style={[styles.cardTitle, { color: theme.text }]}>
          {article.title}
        </ArticleText>

        {excerpt ? (
          <ArticleText language={language} numberOfLines={2} style={[styles.cardExcerpt, { color: theme.textSecondary }]}>
            {excerpt}
          </ArticleText>
        ) : null}

        <View style={styles.cardMeta}>
          <View style={[styles.avatar, styles.cardAvatar, { backgroundColor: scholarTone(article.authorName) }]}>
            <ArticleText language="dari" align="center" style={[styles.avatarText, styles.cardAvatarText]}>
              {scholarInitial(article.authorName)}
            </ArticleText>
          </View>
          <ArticleText language={language} numberOfLines={1} style={[styles.cardMetaText, styles.cardAuthor, { color: theme.textSecondary }]}>
            {article.authorName}
          </ArticleText>
          <View style={[styles.metaDot, { backgroundColor: theme.textSecondary }]} />
          <ArticleText language={language} numberOfLines={1} style={[styles.cardMetaText, { color: theme.textSecondary }]}>
            {minutes}
          </ArticleText>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressed: {
    opacity: 0.88,
    transform: [{ scale: 0.99 }],
  },
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    padding: 14,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  tile: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  cardBody: {
    flex: 1,
    gap: 3,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  cardCategory: {
    flexShrink: 1,
    fontSize: 12.5,
    lineHeight: 20,
    fontWeight: '700',
  },
  cardTitle: {
    fontSize: 16.5,
    lineHeight: 28,
    fontWeight: '700',
  },
  cardExcerpt: {
    fontSize: 13.5,
    lineHeight: 23,
  },
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginTop: 6,
  },
  cardAvatar: {
    width: 22,
    height: 22,
    borderRadius: 11,
  },
  cardAvatarText: {
    fontSize: 11,
    lineHeight: 17,
  },
  cardMetaText: {
    fontSize: 12,
    lineHeight: 19,
  },
  cardAuthor: {
    flexShrink: 1,
  },
  metaDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    opacity: 0.6,
  },
  avatar: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '700',
  },
  featuredShell: {
    marginBottom: 18,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOpacity: 0.16,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  featured: {
    borderRadius: 24,
    padding: 20,
    overflow: 'hidden',
  },
  featuredWatermark: {
    position: 'absolute',
    left: -24,
    bottom: -30,
  },
  featuredTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  featuredBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  featuredBadgeText: {
    fontSize: 12,
    lineHeight: 19,
    fontWeight: '700',
  },
  featuredCategory: {
    flex: 1,
    color: 'rgba(255,255,255,0.78)',
    fontSize: 12.5,
    lineHeight: 20,
  },
  featuredTitle: {
    color: '#FFFFFF',
    fontSize: 22,
    lineHeight: 37,
    fontWeight: '700',
    marginBottom: 6,
  },
  featuredExcerpt: {
    color: 'rgba(255,255,255,0.84)',
    fontSize: 14,
    lineHeight: 24,
  },
  featuredByline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 16,
  },
  featuredAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
  },
  bylineText: {
    flex: 1,
  },
  featuredAuthor: {
    color: '#FFFFFF',
    fontSize: 14,
    lineHeight: 22,
    fontWeight: '700',
  },
  featuredMeta: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 12.5,
    lineHeight: 20,
  },
  featuredArrow: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconUnmirrored: {
    direction: 'ltr',
  },
});
