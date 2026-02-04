/**
 * Article Card Component
 * Displays article preview in list
 */

import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useApp } from '@/context/AppContext';
import { Article, ARTICLE_CATEGORIES } from '@/types/articles';
import { Typography, Spacing, BorderRadius } from '@/constants/theme';
import CenteredText from '@/components/CenteredText';
import { CategoryBadge } from './CategoryBadge';

interface ArticleCardProps {
  article: Article;
  isBookmarked: boolean;
  onPress: () => void;
}

export function ArticleCard({ article, isBookmarked, onPress }: ArticleCardProps) {
  const { theme } = useApp();
  const category = ARTICLE_CATEGORIES[article.category];

  return (
    <View
      style={[
        styles.cardFrame,
        {
          borderColor: `${theme.text}12`,
        },
      ]}
    >
      <View
        style={[
          styles.cardFrameInner,
          {
            borderColor: `${theme.text}22`,
          },
        ]}
      >
        <Pressable
          onPress={onPress}
          style={({ pressed }) => [
            styles.card,
            {
              backgroundColor: theme.card,
            },
            pressed && styles.cardPressed,
          ]}
        >
          {/* Header */}
          <View style={styles.header}>
            <CategoryBadge category={article.category} />
            {isBookmarked && (
              <MaterialIcons name="bookmark" size={20} color={theme.tint} />
            )}
          </View>

          {/* Title */}
          <CenteredText style={[styles.title, { color: theme.text }]} numberOfLines={2}>
            {article.title}
          </CenteredText>

          {/* Meta Info */}
          <View style={styles.meta}>
            <View style={styles.metaRow}>
              <MaterialIcons name="person" size={14} color={theme.textSecondary} />
              <CenteredText style={[styles.metaText, { color: theme.textSecondary }]}>
                {article.authorName}
              </CenteredText>
            </View>
            <View style={styles.metaRow}>
              <MaterialIcons name="access-time" size={14} color={theme.textSecondary} />
              <CenteredText style={[styles.metaText, { color: theme.textSecondary }]}>
                {article.readingTimeEstimate} دقیقه
              </CenteredText>
            </View>
            <View style={styles.metaRow}>
              <MaterialIcons name="visibility" size={14} color={theme.textSecondary} />
              <CenteredText style={[styles.metaText, { color: theme.textSecondary }]}>
                {article.viewCount}
              </CenteredText>
            </View>
          </View>

          {/* Date */}
          {article.publishedAt && (
            <CenteredText style={[styles.date, { color: theme.textSecondary }]}>
              {formatDate(article.publishedAt)}
            </CenteredText>
          )}
        </Pressable>
      </View>
    </View>
  );
}

function formatDate(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days === 0) return 'امروز';
  if (days === 1) return 'دیروز';
  if (days < 7) return `${days} روز پیش`;
  if (days < 30) return `${Math.floor(days / 7)} هفته پیش`;
  if (days < 365) return `${Math.floor(days / 30)} ماه پیش`;
  return `${Math.floor(days / 365)} سال پیش`;
}

const styles = StyleSheet.create({
  cardFrame: {
    marginBottom: Spacing.md,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: 6,
    alignSelf: 'center',
    width: '100%',
  },
  cardFrameInner: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: 4,
  },
  card: {
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    alignSelf: 'center',
    width: '100%',
  },
  cardPressed: {
    opacity: 0.9,
  },
  header: {
    flexDirection: 'row-reverse',
    justifyContent: 'center',
    alignSelf: 'stretch',
    alignItems: 'center',
    marginBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  title: {
    fontSize: Typography.ui.subtitle,
    fontWeight: '700',
    marginBottom: Spacing.sm,
    fontFamily: 'Vazirmatn',
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  meta: {
    flexDirection: 'row-reverse',
    justifyContent: 'center',
    alignSelf: 'stretch',
    gap: Spacing.md,
    marginBottom: Spacing.xs,
  },
  metaRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: Typography.ui.caption,
    fontFamily: 'Vazirmatn',
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  date: {
    fontSize: Typography.ui.caption,
    marginTop: Spacing.xs,
    fontFamily: 'Vazirmatn',
    textAlign: 'center',
    writingDirection: 'rtl',
  },
});
