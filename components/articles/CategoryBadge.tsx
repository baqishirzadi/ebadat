/**
 * Category Badge Component
 * Displays article category with icon and color
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { ArticleCategory, ARTICLE_CATEGORIES } from '@/types/articles';
import { Spacing, BorderRadius } from '@/constants/theme';
import CenteredText from '@/components/CenteredText';

interface CategoryBadgeProps {
  category: ArticleCategory;
}

export function CategoryBadge({ category }: CategoryBadgeProps) {
  const categoryInfo = ARTICLE_CATEGORIES[category];

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: `${categoryInfo.color}20`,
          borderColor: categoryInfo.color,
        },
      ]}
    >
      <MaterialIcons name={categoryInfo.icon as any} size={14} color={categoryInfo.color} />
      <CenteredText style={[styles.badgeText, { color: categoryInfo.color }]}>
        {categoryInfo.nameDari}
      </CenteredText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
    fontFamily: 'Vazirmatn',
  },
});
