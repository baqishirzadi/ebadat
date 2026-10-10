/**
 * Category Filter
 * Horizontal pill chips; categories without articles in the current view are
 * hidden.
 */

import React from 'react';
import { Pressable, ScrollView, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

import { categoryName, categoryPalette } from '@/components/articles/articleTheme';
import { LocalizedText } from '@/components/ui/LocalizedText';
import { useApp } from '@/context/AppContext';
import { ARTICLE_CATEGORIES, type ArticleCategory } from '@/types/articles';
import { directionStyle } from '@/utils/i18n/direction';
import { useI18n } from '@/utils/i18n/useI18n';

interface CategoryFilterProps {
  selectedCategory: string | null;
  onSelectCategory: (category: string | null) => void;
  counts: Partial<Record<ArticleCategory, number>>;
}

export function CategoryFilter({ selectedCategory, onSelectCategory, counts }: CategoryFilterProps) {
  const { theme, themeMode } = useApp();
  const { t, language } = useI18n();
  const isDark = themeMode === 'night';

  const categories = Object.values(ARTICLE_CATEGORIES).filter(
    (category) => (counts[category.id] ?? 0) > 0 || selectedCategory === category.id,
  );

  const chip = (selected: boolean) => [
    styles.chip,
    selected
      ? { backgroundColor: theme.tint, borderColor: theme.tint }
      : { backgroundColor: theme.card, borderColor: theme.cardBorder },
  ];

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={directionStyle(language)}
      contentContainerStyle={styles.row}
    >
      <Pressable
        testID="articles-category-all"
        onPress={() => onSelectCategory(null)}
        style={({ pressed }) => [chip(selectedCategory === null), pressed && styles.pressed]}
      >
        <LocalizedText style={[styles.chipText, { color: selectedCategory === null ? theme.onTint : theme.text }]}>
          {t('articles.all')}
        </LocalizedText>
      </Pressable>

      {categories.map((category) => {
        const selected = selectedCategory === category.id;
        const palette = categoryPalette(category.id);
        return (
          <Pressable
            key={category.id}
            onPress={() => onSelectCategory(selected ? null : category.id)}
            style={({ pressed }) => [chip(selected), pressed && styles.pressed]}
          >
            <MaterialIcons
              name={category.icon as any}
              size={15}
              color={selected ? theme.onTint : isDark ? palette.accent : palette.primary}
            />
            <LocalizedText style={[styles.chipText, { color: selected ? theme.onTint : theme.text }]}>
              {categoryName(category.id, language)}
            </LocalizedText>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    minHeight: 36,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
  },
  chipText: {
    fontSize: 13,
    lineHeight: 21,
    fontWeight: '600',
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.8,
  },
});
