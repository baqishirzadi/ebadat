/**
 * Category Filter Component
 * Filter articles by category and language
 */

import React from 'react';
import { View, StyleSheet, ScrollView, Pressable } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useApp } from '@/context/AppContext';
import { ArticleCategory, ARTICLE_CATEGORIES } from '@/types/articles';
import { Spacing, BorderRadius } from '@/constants/theme';
import CenteredText from '@/components/CenteredText';

interface CategoryFilterProps {
  selectedCategory: string | null;
  onSelectCategory: (category: string | null) => void;
  selectedLanguage: 'dari' | 'pashto';
  onSelectLanguage: (language: 'dari' | 'pashto') => void;
}

export function CategoryFilter({
  selectedCategory,
  onSelectCategory,
  selectedLanguage,
  onSelectLanguage,
}: CategoryFilterProps) {
  const { theme } = useApp();

  const categories = Object.values(ARTICLE_CATEGORIES);

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundSecondary }]}>
      {/* Language Toggle */}
      <View style={styles.languageToggle}>
        <Pressable
          onPress={() => onSelectLanguage('dari')}
          style={({ pressed }) => [
            styles.languageButton,
            {
              backgroundColor: selectedLanguage === 'dari' ? theme.tint : theme.card,
              borderColor: selectedLanguage === 'dari' ? theme.tint : theme.cardBorder,
            },
            pressed && styles.buttonPressed,
          ]}
        >
          <CenteredText
            style={[
              styles.languageText,
              { color: selectedLanguage === 'dari' ? '#fff' : theme.text },
            ]}
          >
            دری
          </CenteredText>
        </Pressable>
        <Pressable
          onPress={() => onSelectLanguage('pashto')}
          style={({ pressed }) => [
            styles.languageButton,
            {
              backgroundColor: selectedLanguage === 'pashto' ? theme.tint : theme.card,
              borderColor: selectedLanguage === 'pashto' ? theme.tint : theme.cardBorder,
            },
            pressed && styles.buttonPressed,
          ]}
        >
          <CenteredText
            style={[
              styles.languageText,
              { color: selectedLanguage === 'pashto' ? '#fff' : theme.text },
            ]}
          >
            پښتو
          </CenteredText>
        </Pressable>
      </View>

      {/* Category Filter */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoriesContainer}
      >
        <Pressable
          onPress={() => onSelectCategory(null)}
          style={({ pressed }) => [
            styles.categoryButton,
            {
              backgroundColor: selectedCategory === null ? theme.tint : theme.card,
              borderColor: selectedCategory === null ? theme.tint : theme.cardBorder,
            },
            pressed && styles.buttonPressed,
          ]}
        >
          <CenteredText
            style={[
              styles.categoryText,
              { color: selectedCategory === null ? '#fff' : theme.text },
            ]}
          >
            همه
          </CenteredText>
        </Pressable>

        {categories.map((category) => (
          <Pressable
            key={category.id}
            onPress={() =>
              onSelectCategory(selectedCategory === category.id ? null : category.id)
            }
            style={({ pressed }) => [
              styles.categoryButton,
              {
                backgroundColor: selectedCategory === category.id ? theme.tint : theme.card,
                borderColor: selectedCategory === category.id ? theme.tint : theme.cardBorder,
              },
              pressed && styles.buttonPressed,
            ]}
          >
            <MaterialIcons
              name={category.icon as any}
              size={16}
              color={selectedCategory === category.id ? '#fff' : category.color}
            />
            <CenteredText
              style={[
                styles.categoryText,
                { color: selectedCategory === category.id ? '#fff' : theme.text },
              ]}
            >
              {category.nameDari}
            </CenteredText>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
  },
  languageToggle: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  languageButton: {
    flex: 1,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    alignItems: 'center',
  },
  languageText: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Vazirmatn',
  },
  categoriesContainer: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  categoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'Vazirmatn',
  },
  buttonPressed: {
    opacity: 0.8,
  },
});
