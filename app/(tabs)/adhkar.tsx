/**
 * Adhkar Hub Screen
 * Central place for all Islamic remembrances
 */

import React from 'react';
import { View, StyleSheet, ScrollView, Pressable, Text } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useApp } from '@/context/AppContext';
import { Typography, Spacing, BorderRadius } from '@/constants/theme';
import adhkarData from '@/data/adhkar.json';

// Category type
interface AdhkarCategory {
  id: string;
  nameArabic: string;
  nameDari: string;
  namePashto: string;
  icon: string;
  color: string;
}

export default function AdhkarScreen() {
  const { theme } = useApp();
  const router = useRouter();
  const categories = adhkarData.categories as AdhkarCategory[];

  const handleCategoryPress = (categoryId: string) => {
    router.push(`/adhkar/${categoryId}`);
  };

  // Featured adhkar for quick access
  const featuredCategories = ['morning', 'evening', 'afterPrayer'];

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.surahHeader }]}>
        <MaterialIcons name="auto-awesome" size={36} color="#fff" />
        <Text style={styles.headerTitle}>اذکار</Text>
        <Text style={styles.headerSubtitle}>یادآوری‌های روزانه</Text>
      </View>

      {/* Featured Section */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>
          پرکاربرد
        </Text>
        <View style={styles.featuredGrid}>
          {categories
            .filter(c => featuredCategories.includes(c.id))
            .map((category) => (
              <Pressable
                key={category.id}
                onPress={() => handleCategoryPress(category.id)}
                style={({ pressed }) => [
                  styles.featuredCard,
                  { backgroundColor: category.color },
                  pressed && styles.cardPressed,
                ]}
              >
                <MaterialIcons name={category.icon as any} size={32} color="#fff" />
                <Text style={styles.featuredTitle}>{category.nameDari}</Text>
                <Text style={styles.featuredCount}>
                  {(adhkarData.adhkar as Record<string, unknown[]>)[category.id]?.length || 0} ذکر
                </Text>
              </Pressable>
            ))}
        </View>
      </View>

      {/* All Categories */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>
          همه دسته‌بندی‌ها
        </Text>
        <View style={styles.categoriesList}>
          {categories.map((category) => (
            <Pressable
              key={category.id}
              onPress={() => handleCategoryPress(category.id)}
              style={({ pressed }) => [
                styles.categoryCard,
                { backgroundColor: theme.card, borderColor: theme.cardBorder },
                pressed && styles.cardPressed,
              ]}
            >
              <View style={[styles.categoryIcon, { backgroundColor: `${category.color}20` }]}>
                <MaterialIcons name={category.icon as any} size={24} color={category.color} />
              </View>
              <View style={styles.categoryInfo}>
                <Text style={[styles.categoryName, { color: theme.text }]}>
                  {category.nameDari}
                </Text>
                <Text style={[styles.categoryNameArabic, { color: theme.textSecondary }]}>
                  {category.nameArabic}
                </Text>
              </View>
              <View style={styles.categoryMeta}>
                <Text style={[styles.categoryCount, { color: theme.textSecondary }]}>
                  {(adhkarData.adhkar as Record<string, unknown[]>)[category.id]?.length || 0}
                </Text>
                <MaterialIcons name="chevron-left" size={24} color={theme.icon} />
              </View>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Dhikr Counter */}
      <Pressable
        onPress={() => router.push('/counter')}
        style={[styles.counterCard, { backgroundColor: theme.tint }]}
      >
        <View style={styles.counterContent}>
          <MaterialIcons name="touch-app" size={32} color="#fff" />
          <View style={styles.counterInfo}>
            <Text style={styles.counterTitle}>شمارنده ذکر</Text>
            <Text style={styles.counterSubtitle}>تسبیح دیجیتال</Text>
          </View>
        </View>
        <MaterialIcons name="chevron-left" size={28} color="rgba(255,255,255,0.8)" />
      </Pressable>

      <View style={styles.bottomPadding} />
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
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
    marginTop: Spacing.sm,
  },
  headerSubtitle: {
    fontSize: Typography.ui.body,
    color: 'rgba(255,255,255,0.8)',
    marginTop: Spacing.xs,
  },
  section: {
    marginTop: Spacing.lg,
    paddingHorizontal: Spacing.md,
  },
  sectionTitle: {
    fontSize: Typography.ui.caption,
    fontWeight: '600',
    marginBottom: Spacing.md,
paddingRight: Spacing.sm,
    textTransform: 'uppercase',
  },
  featuredGrid: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  featuredCard: {
    flex: 1,
    padding: Spacing.lg,
    borderRadius: BorderRadius.xl,
    alignItems: 'center',
    gap: Spacing.sm,
  },
  featuredTitle: {
    fontSize: Typography.ui.body,
    fontWeight: '600',
    color: '#fff',
    textAlign: 'center',
  },
  featuredCount: {
    fontSize: Typography.ui.caption,
    color: 'rgba(255,255,255,0.8)',
  },
  cardPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  categoriesList: {
    gap: Spacing.sm,
  },
  categoryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    gap: Spacing.md,
  },
  categoryIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryInfo: {
    flex: 1,
    alignItems: 'flex-end',
  },
  categoryName: {
    fontSize: Typography.ui.body,
    fontWeight: '600',
  },
  categoryNameArabic: {
    fontSize: Typography.ui.caption,
    marginTop: 2,
  },
  categoryMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  categoryCount: {
    fontSize: Typography.ui.caption,
  },
  counterCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: Spacing.md,
    marginTop: Spacing.xl,
    padding: Spacing.lg,
    borderRadius: BorderRadius.xl,
  },
  counterContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  counterInfo: {
    alignItems: 'flex-start',
  },
  counterTitle: {
    fontSize: Typography.ui.subtitle,
    fontWeight: '700',
    color: '#fff',
  },
  counterSubtitle: {
    fontSize: Typography.ui.caption,
    color: 'rgba(255,255,255,0.8)',
  },
  bottomPadding: {
    height: 120,
  },
});
