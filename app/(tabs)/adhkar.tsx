/**
 * Adhkar Hub Screen
 * Central place for all Islamic remembrances
 */

import React from 'react';

import { View, StyleSheet, ScrollView, Pressable } from 'react-native';
import { LocalizedText } from '@/components/ui/LocalizedText';
import { RtlView } from '@/components/ui/RtlView';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useApp } from '@/context/AppContext';
import { useDua } from '@/context/DuaContext';
import { Typography, Spacing, BorderRadius } from '@/constants/theme';
import adhkarData from '@/data/adhkar.json';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { RtlText } from '@/components/ui/RtlText';
import { forwardChevronName } from '@/utils/i18n/direction';
import { useI18n } from '@/utils/i18n/useI18n';

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
  const { t, n, content, fontFamily, language } = useI18n();
  const { unreadCount } = useDua();
  const router = useRouter();
  const categories = adhkarData.categories as AdhkarCategory[];
  const chevron = forwardChevronName(language);

  const handleCategoryPress = (categoryId: string) => {
    router.push(`/adhkar/${categoryId}`);
  };

  // Featured adhkar - four in one row
  const featuredCategories = ['morning', 'evening', 'afterPrayer', 'beginner'];

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]}>
      <ScreenHeader
        icon="auto-awesome"
        title={t('adhkar.title')}
        subtitle={t('adhkar.subtitle')}
      />

      {/* Featured Adhkar Section */}
      <View style={styles.section}>
        <RtlText align="center" style={[styles.sectionTitle, { color: theme.textSecondary, fontFamily }]}>
          {t('adhkar.featured')}
        </RtlText>
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
                <MaterialIcons name={category.icon as any} size={28} color="#fff" />
                <RtlText align="center" style={styles.featuredTitle} numberOfLines={2}>{content(category, 'name')}</RtlText>
                <LocalizedText style={styles.featuredCount}>
                  {t('adhkar.count', {
                    count: n((adhkarData.adhkar as Record<string, unknown[]>)[category.id]?.length || 0),
                  })}
                </LocalizedText>
              </Pressable>
            ))}
        </View>
      </View>

      {/* All Categories */}
      <View style={styles.section}>
        <RtlText align="center" style={[styles.sectionTitle, { color: theme.textSecondary, fontFamily }]}>
          {t('adhkar.allCategories')}
        </RtlText>
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
              <RtlView style={styles.categoryCardContent}>
                <View style={[styles.categoryIcon, { backgroundColor: `${category.color}20` }]}>
                  <MaterialIcons name={category.icon as any} size={24} color={category.color} />
                </View>
                <View style={styles.categoryInfo}>
                  <RtlText align="center" style={[styles.categoryName, { color: theme.text }]} numberOfLines={2}>
                    {content(category, 'name')}
                  </RtlText>
                  <LocalizedText style={[styles.categoryNameArabic, { color: theme.textSecondary }]}>
                    {category.nameArabic}
                  </LocalizedText>
                  <LocalizedText style={[styles.categoryCount, { color: theme.textSecondary }]}>
                    {t('adhkar.count', {
                      count: n((adhkarData.adhkar as Record<string, unknown[]>)[category.id]?.length || 0),
                    })}
                  </LocalizedText>
                </View>
                <View style={styles.categoryActionSlot}>
                  <MaterialIcons name={chevron} size={24} color={theme.icon} />
                </View>
              </RtlView>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Dhikr Counter — outlined card, distinct from dua CTA */}
      <Pressable
        onPress={() => router.push('/counter')}
        style={({ pressed }) => [
          styles.counterCard,
          {
            backgroundColor: theme.card,
            borderColor: theme.tint,
          },
          pressed && styles.cardPressed,
        ]}
      >
        <RtlView style={styles.counterRow}>
          <View style={[styles.counterSideSlot, styles.counterIconWrap, { backgroundColor: `${theme.tint}18` }]}>
            <MaterialIcons name="touch-app" size={28} color={theme.tint} />
          </View>
          <View style={styles.counterInfo}>
            <RtlText align="center" style={[styles.counterTitle, { color: theme.text, fontFamily }]}>
              {t('adhkar.counter')}
            </RtlText>
            <RtlText align="center" style={[styles.counterSubtitle, { color: theme.textSecondary, fontFamily }]}>
              {t('adhkar.counter.subtitle')}
            </RtlText>
          </View>
          <View style={styles.counterSideSlot}>
            <MaterialIcons name={chevron} size={28} color={theme.tint} />
          </View>
        </RtlView>
      </Pressable>

      {/* Dua Request Section - filled accent CTA */}
      <Pressable
        onPress={() => router.push('/dua-request')}
        style={({ pressed }) => [
          styles.duaCard,
          { backgroundColor: theme.tint, shadowColor: theme.tint, marginTop: Spacing.md },
          pressed && styles.duaCardPressed,
        ]}
      >
        <RtlView style={styles.duaCardRow}>
          <View style={styles.duaIconContainer}>
            <LocalizedText style={styles.duaEmoji}>🤲</LocalizedText>
            {unreadCount > 0 ? (
              <View style={styles.duaUnreadBadge}>
                <LocalizedText style={styles.duaUnreadText}>{unreadCount > 9 ? `${n(9)}+` : n(unreadCount)}</LocalizedText>
              </View>
            ) : null}
          </View>
          <View style={styles.duaCardInfo}>
            <RtlText align="center" style={[styles.duaCardTitle, { fontFamily }]}>{t('adhkar.dua.title')}</RtlText>
            <RtlText align="center" style={[styles.duaCardSubtitle, { fontFamily }]}>
              {t('adhkar.dua.body')}
            </RtlText>
          </View>
          <View style={styles.duaActionSlot}>
            <MaterialIcons name={chevron} size={24} color="rgba(255,255,255,0.85)" />
          </View>
        </RtlView>
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
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    overflow: 'hidden',
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
  headerBackButton: {
    position: 'absolute',
    right: Spacing.md,
    top: 54,
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  section: {
    marginTop: Spacing.lg,
    paddingHorizontal: Spacing.md,
  },
  sectionTitle: {
    fontSize: Typography.ui.body,
    fontWeight: '600',
    marginBottom: Spacing.md,
    alignSelf: 'stretch',
    textAlign: 'center',
    paddingHorizontal: Spacing.sm,
  },
  featuredGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  featuredCard: {
    width: '48%',
    flexGrow: 1,
    minWidth: '46%',
    minHeight: 100,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.xl,
    alignItems: 'center',
    gap: Spacing.xs,
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
    textAlign: 'center',
    includeFontPadding: false,
  },
  cardPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  categoriesList: {
    gap: Spacing.sm,
  },
  categoryCard: {
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
  },
  categoryCardContent: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
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
    minWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryName: {
    fontSize: Typography.ui.body,
    fontWeight: '600',
    textAlign: 'center',
    writingDirection: 'rtl',
    includeFontPadding: false,
    alignSelf: 'stretch',
  },
  categoryNameArabic: {
    fontSize: Typography.ui.caption,
    marginTop: 2,
    textAlign: 'center',
    writingDirection: 'rtl',
    includeFontPadding: false,
    alignSelf: 'stretch',
  },
  categoryCount: {
    fontSize: Typography.ui.caption,
    marginTop: 3,
    textAlign: 'center',
    includeFontPadding: false,
  },
  categoryActionSlot: {
    width: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  counterCard: {
    marginHorizontal: Spacing.md,
    marginTop: Spacing.xl,
    padding: Spacing.lg,
    borderRadius: BorderRadius.xl,
    borderWidth: 1.5,
  },
  counterRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  counterSideSlot: {
    width: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  counterIconWrap: {
    height: 44,
    borderRadius: 22,
  },
  counterInfo: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  counterTitle: {
    fontSize: Typography.ui.subtitle,
    fontWeight: '700',
  },
  counterSubtitle: {
    fontSize: Typography.ui.caption,
  },
  duaCard: {
    marginHorizontal: Spacing.md,
    marginTop: Spacing.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.lg,
    elevation: 3,
    shadowColor: '#D4AF37',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  duaCardPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  duaCardRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  duaIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.22)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  duaUnreadBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E11D48',
  },
  duaUnreadText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
    lineHeight: 14,
  },
  duaEmoji: {
    fontSize: 22,
    lineHeight: 24,
    color: '#fff',
    textAlign: 'center',
    includeFontPadding: false,
  },
  duaCardInfo: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
  },
  duaActionSlot: {
    width: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  duaCardTitle: {
    fontSize: Typography.ui.body,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 2,
    textAlign: 'center',
  },
  duaCardSubtitle: {
    fontSize: Typography.ui.caption,
    color: 'rgba(255,255,255,0.85)',
    textAlign: 'center',
  },
  duaCardSource: {
    fontSize: Typography.ui.caption,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  bottomPadding: {
    height: 120,
  },
});
