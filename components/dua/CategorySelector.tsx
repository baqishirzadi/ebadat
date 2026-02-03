/**
 * Category Selector Component
 * Allows user to select request category
 */

import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { DuaCategory, DUA_CATEGORIES } from '@/types/dua';
import { useApp } from '@/context/AppContext';
import { Typography, Spacing, BorderRadius } from '@/constants/theme';
import CenteredText from '@/components/CenteredText';

interface CategorySelectorProps {
  selectedCategory: DuaCategory | null;
  onSelect: (category: DuaCategory) => void;
}

export function CategorySelector({ selectedCategory, onSelect }: CategorySelectorProps) {
  const { theme } = useApp();

  return (
    <View style={styles.container}>
      {DUA_CATEGORIES.map((category) => {
        const isSelected = selectedCategory === category.id;
        return (
          <Pressable
            key={category.id}
            onPress={() => onSelect(category.id)}
            style={({ pressed }) => [
              styles.categoryCard,
              {
                backgroundColor: isSelected ? `${theme.tint}15` : theme.card,
                borderColor: isSelected ? theme.tint : theme.cardBorder,
              },
              pressed && styles.pressed,
            ]}
          >
            <View style={[styles.iconContainer, { backgroundColor: isSelected ? `${theme.tint}30` : `${theme.tint}15` }]}>
              <MaterialIcons
                name={category.icon as any}
                size={24}
                color={isSelected ? theme.tint : theme.textSecondary}
              />
            </View>
            <CenteredText style={[styles.name, { color: isSelected ? theme.tint : theme.text }]}>
              {category.nameDari}
            </CenteredText>
            <CenteredText style={[styles.description, { color: theme.textSecondary }]} numberOfLines={1}>
              {category.description}
            </CenteredText>
            {isSelected && (
              <View style={[styles.checkmark, { backgroundColor: theme.tint }]}>
                <MaterialIcons name="check" size={16} color="#fff" />
              </View>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  categoryCard: {
    width: '48%',
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 2,
    alignItems: 'center',
    position: 'relative',
  },
  pressed: {
    opacity: 0.8,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  name: {
    fontSize: Typography.ui.body,
    fontWeight: '600',
    marginBottom: Spacing.xs,
    fontFamily: 'Vazirmatn',
  },
  description: {
    fontSize: Typography.ui.caption,
    fontFamily: 'Vazirmatn',
    textAlign: 'center',
  },
  checkmark: {
    position: 'absolute',
    top: Spacing.xs,
    left: Spacing.xs,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
