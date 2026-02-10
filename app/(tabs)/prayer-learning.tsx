/**
 * Prayer Learning Screen
 * آموزش نماز طبق مذهب حنفی
 */

import React, { useState, useCallback, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Pressable, Text, Modal, BackHandler } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useApp } from '@/context/AppContext';
import { Typography, Spacing, BorderRadius } from '@/constants/theme';
import { PrayerTextBlock, PrayerStepGuide } from '@/components/prayer';
import { DuaFeatureTile } from '@/components/dua/FeatureTile';
import CenteredText from '@/components/CenteredText';
import { useFocusEffect } from 'expo-router';

// Import prayer learning data
import prayerData from '@/data/prayerLearning.json';

// Type definitions for prayer data
interface PrayerSection {
  id: string;
  title_dari: string;
  title_pashto: string;
  content_dari?: string;
  content_pashto?: string;
  items?: any[];
  steps?: any[];
  steps_dari?: string[];
  steps_pashto?: string[];
  examples_dari?: string[];
  examples_pashto?: string[];
  arabic?: string;
  translation_dari?: string;
  translation_pashto?: string;
  instruction_dari?: string;
  instruction_pashto?: string;
  prayers?: any[];
  qunoot_arabic?: string;
  qunoot_dari?: string;
  qunoot_pashto?: string;
  for_adult?: any;
  for_child?: any;
  response_arabic?: string;
  response_dari?: string;
  response_pashto?: string;
}

type IconName = 'water-drop' | 'shower' | 'mosque' | 'menu-book' | 'view-list' | 'replay' | 'person-outline' | 'favorite';

const iconMap: Record<string, IconName> = {
  'water-drop': 'water-drop',
  'shower': 'shower',
  'mosque': 'mosque',
  'menu-book': 'menu-book',
  'view-list': 'view-list',
  'replay': 'replay',
  'person-outline': 'person-outline',
  'favorite': 'favorite',
};

export default function PrayerLearningScreen() {
  const { theme } = useApp();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedSection, setSelectedSection] = useState<string | null>(null);

  const handleCategoryPress = useCallback((categoryId: string) => {
    setSelectedCategory(categoryId);
    setSelectedSection(null);
  }, []);

  const handleSectionPress = useCallback((sectionId: string) => {
    setSelectedSection(sectionId);
  }, []);

  const handleBack = useCallback(() => {
    if (selectedSection) {
      setSelectedSection(null);
      return true; // Handled
    } else if (selectedCategory) {
      setSelectedCategory(null);
      return true; // Handled
    }
    return false; // Not handled, let default behavior
  }, [selectedCategory, selectedSection]);

  // Handle Android back button and swipe gestures
  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        if (selectedSection || selectedCategory) {
          handleBack();
          return true; // Prevent default behavior
        }
        return false; // Allow default behavior (go to main screen)
      };

      const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => subscription.remove();
    }, [selectedCategory, selectedSection, handleBack])
  );

  const currentCategory = prayerData.categories.find(c => c.id === selectedCategory);
  const currentSection = currentCategory?.sections.find(s => s.id === selectedSection) as PrayerSection | undefined;

  // Render category list
  const renderCategoryList = () => (
    <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.surahHeader }]}>
        <MaterialIcons name="mosque" size={40} color="#fff" />
        <CenteredText style={styles.headerTitle}>آموزش نماز</CenteredText>
        <CenteredText style={styles.headerSubtitle}>
          طبق مذهب امام ابو حنیفه رحمه‌الله
        </CenteredText>
      </View>

      {/* Dua Request Feature Tile */}
      <View style={styles.duaTileContainer}>
        {(() => {
          console.log('[PrayerLearning] Rendering DuaFeatureTile');
          return <DuaFeatureTile />;
        })()}
      </View>

      {/* Categories Grid */}
      <View style={styles.categoriesContainer}>
        {prayerData.categories.map((category) => (
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
              <MaterialIcons
                name={iconMap[category.icon] || 'book'}
                size={32}
                color={category.color}
              />
            </View>
            <Text style={[styles.categoryTitle, { color: theme.text }]}>
              {category.title_dari}
            </Text>
            <Text style={[styles.categoryTitlePashto, { color: theme.textSecondary }]}>
              {category.title_pashto}
            </Text>
            <View style={[styles.sectionCount, { backgroundColor: category.color }]}>
              <Text style={styles.sectionCountText}>
                {category.sections.length}
              </Text>
            </View>
          </Pressable>
        ))}
      </View>

      {/* Attribution */}
      <View style={styles.attribution}>
        <Text style={[styles.attributionText, { color: theme.textSecondary }]}>
          محتوا بر اساس فقه حنفی تهیه شده است
        </Text>
        <Text style={[styles.attributionText, { color: theme.textSecondary }]}>
          منبع: کتب معتبر فقه حنفی
        </Text>
      </View>
    </ScrollView>
  );

  // Render sections list for a category
  const renderSectionsList = () => {
    if (!currentCategory) return null;

    return (
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Category Header */}
        <View style={[styles.categoryHeader, { backgroundColor: currentCategory.color }]}>
          <Pressable onPress={handleBack} style={styles.backButton}>
            <MaterialIcons name="arrow-forward" size={24} color="#fff" />
          </Pressable>
          <MaterialIcons
            name={iconMap[currentCategory.icon] || 'book'}
            size={40}
            color="#fff"
          />
          <CenteredText style={styles.headerTitle}>{currentCategory.title_dari}</CenteredText>
          <CenteredText style={styles.headerSubtitle}>{currentCategory.title_pashto}</CenteredText>
        </View>

        {/* Sections */}
        <View style={styles.sectionsContainer}>
          {currentCategory.sections.map((section, index) => (
            <Pressable
              key={section.id}
              onPress={() => handleSectionPress(section.id)}
              style={({ pressed }) => [
                styles.sectionCard,
                { backgroundColor: theme.card, borderColor: theme.cardBorder },
                pressed && styles.cardPressed,
              ]}
            >
              <View style={[styles.sectionNumber, { backgroundColor: currentCategory.color }]}>
                <Text style={styles.sectionNumberText}>{index + 1}</Text>
              </View>
              <View style={styles.sectionInfo}>
                <Text style={[styles.sectionTitle, { color: theme.text }]}>
                  {section.title_dari}
                </Text>
                <Text style={[styles.sectionTitlePashto, { color: theme.textSecondary }]}>
                  {section.title_pashto}
                </Text>
              </View>
              <MaterialIcons name="chevron-left" size={24} color={theme.icon} />
            </Pressable>
          ))}
        </View>
      </ScrollView>
    );
  };

  // Render section detail
  const renderSectionDetail = () => {
    if (!currentCategory || !currentSection) return null;

    return (
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Section Header */}
        <View style={[styles.sectionDetailHeader, { backgroundColor: currentCategory.color }]}>
          <Pressable onPress={handleBack} style={styles.backButton}>
            <MaterialIcons name="arrow-forward" size={24} color="#fff" />
          </Pressable>
          <CenteredText style={styles.headerTitle}>{currentSection.title_dari}</CenteredText>
          <CenteredText style={styles.headerSubtitle}>{currentSection.title_pashto}</CenteredText>
        </View>

        <View style={styles.detailContent}>
          {/* Content */}
          {currentSection.content_dari && (
            <View style={[styles.contentBlock, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
              <View style={styles.langRow}>
                <View style={[styles.langBadge, { backgroundColor: theme.tint }]}>
                  <Text style={styles.langBadgeText}>دری</Text>
                </View>
              </View>
              <Text style={[styles.contentText, { color: theme.text }]}>
                {currentSection.content_dari}
              </Text>
              {currentSection.content_pashto && (
                <>
                  <View style={[styles.langRow, { marginTop: Spacing.md }]}>
                    <View style={[styles.langBadge, { backgroundColor: '#FF7043' }]}>
                      <Text style={styles.langBadgeText}>پښتو</Text>
                    </View>
                  </View>
                  <Text style={[styles.contentText, { color: theme.text, fontFamily: 'NotoNastaliqUrdu', lineHeight: 42 }]}>
                    {currentSection.content_pashto}
                  </Text>
                </>
              )}
            </View>
          )}

          {/* Items list */}
          {currentSection.items && (
            <View style={[styles.itemsBlock, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
              {currentSection.items.map((item: any, index: number) => (
                <View key={index} style={[styles.itemRow, index > 0 && { borderTopWidth: 1, borderTopColor: theme.cardBorder }]}>
                  {item.number && (
                    <View style={[styles.itemNumber, { backgroundColor: currentCategory.color }]}>
                      <Text style={styles.itemNumberText}>{item.number}</Text>
                    </View>
                  )}
                  <View style={styles.itemContent}>
                    <Text style={[styles.itemText, { color: theme.text }]}>
                      {item.dari}
                    </Text>
                    {item.pashto && (
                      <Text style={[styles.itemTextPashto, { color: theme.textSecondary }]}>
                        {item.pashto}
                      </Text>
                    )}
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* Steps */}
          {currentSection.steps && (
            <PrayerStepGuide
              steps={currentSection.steps}
            />
          )}

          {/* Steps (Dari/Pashto string arrays) */}
          {(currentSection.steps_dari || currentSection.steps_pashto) && (
            <View style={[styles.stepsBlock, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
              {currentSection.steps_dari && (
                <View style={styles.stepsSection}>
                  <View style={[styles.langBadge, { backgroundColor: theme.tint }]}>
                    <Text style={styles.langBadgeText}>دری</Text>
                  </View>
                  {currentSection.steps_dari.map((step: string, index: number) => (
                    <View key={index} style={styles.stepItem}>
                      <View style={[styles.stepBullet, { backgroundColor: currentCategory?.color || theme.tint }]}>
                        <Text style={styles.stepBulletText}>{index + 1}</Text>
                      </View>
                      <Text style={[styles.stepText, { color: theme.text }]}>{step}</Text>
                    </View>
                  ))}
                </View>
              )}
              {currentSection.steps_pashto && (
                <View style={[styles.stepsSection, { marginTop: currentSection.steps_dari ? Spacing.md : 0 }]}>
                  <View style={[styles.langBadge, { backgroundColor: '#FF7043' }]}>
                    <Text style={styles.langBadgeText}>پښتو</Text>
                  </View>
                  {currentSection.steps_pashto.map((step: string, index: number) => (
                    <View key={index} style={styles.stepItem}>
                      <View style={[styles.stepBullet, { backgroundColor: currentCategory?.color || theme.tint }]}>
                        <Text style={styles.stepBulletText}>{index + 1}</Text>
                      </View>
                      <Text style={[styles.stepText, { color: theme.text, fontFamily: 'NotoNastaliqUrdu', lineHeight: 38 }]}>{step}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}

          {/* Arabic text with translations */}
          {currentSection.arabic && (
            <PrayerTextBlock
              arabic={currentSection.arabic}
              translationDari={currentSection.translation_dari}
              translationPashto={currentSection.translation_pashto}
              instructionDari={currentSection.instruction_dari}
              instructionPashto={currentSection.instruction_pashto}
            />
          )}

          {/* Prayers list (for five prayers) */}
          {currentSection.prayers && (
            <View style={styles.prayersContainer}>
              {currentSection.prayers.map((prayer: any, index: number) => (
                <View
                  key={index}
                  style={[styles.prayerCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}
                >
                  <View style={[styles.prayerHeader, { backgroundColor: currentCategory.color }]}>
                    <Text style={styles.prayerName}>{prayer.name_dari}</Text>
                    <Text style={styles.prayerNamePashto}>{prayer.name_pashto}</Text>
                  </View>
                  <View style={styles.prayerDetails}>
                    <View style={styles.prayerRow}>
                      <Text style={[styles.prayerLabel, { color: theme.textSecondary }]}>فرض:</Text>
                      <Text style={[styles.prayerValue, { color: theme.text }]}>{prayer.fardh} رکعت</Text>
                    </View>
                    {prayer.sunnah_before > 0 && (
                      <View style={styles.prayerRow}>
                        <Text style={[styles.prayerLabel, { color: theme.textSecondary }]}>سنت قبل:</Text>
                        <Text style={[styles.prayerValue, { color: theme.text }]}>{prayer.sunnah_before} رکعت</Text>
                      </View>
                    )}
                    {prayer.sunnah_after > 0 && (
                      <View style={styles.prayerRow}>
                        <Text style={[styles.prayerLabel, { color: theme.textSecondary }]}>سنت بعد:</Text>
                        <Text style={[styles.prayerValue, { color: theme.text }]}>{prayer.sunnah_after} رکعت</Text>
                      </View>
                    )}
                    {prayer.witr && (
                      <View style={styles.prayerRow}>
                        <Text style={[styles.prayerLabel, { color: theme.textSecondary }]}>وتر:</Text>
                        <Text style={[styles.prayerValue, { color: theme.text }]}>{prayer.witr} رکعت</Text>
                      </View>
                    )}
                    <View style={[styles.totalRow, { backgroundColor: `${currentCategory.color}20` }]}>
                      <Text style={[styles.totalLabel, { color: theme.text }]}>مجموع:</Text>
                      <Text style={[styles.totalValue, { color: currentCategory.color }]}>{prayer.total} رکعت</Text>
                    </View>
                    <Text style={[styles.prayerNotes, { color: theme.textSecondary }]}>
                      {prayer.notes_dari}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* Qunoot for Witr */}
          {currentSection.qunoot_arabic && (
            <View style={styles.qunootSection}>
              <Text style={[styles.qunootTitle, { color: theme.text }]}>دعای قنوت</Text>
              <PrayerTextBlock
                arabic={currentSection.qunoot_arabic}
                translationDari={currentSection.qunoot_dari}
                translationPashto={currentSection.qunoot_pashto}
              />
            </View>
          )}

          {/* Janazah duas */}
          {currentSection.for_adult && (
            <View style={styles.janazahDuas}>
              <Text style={[styles.duaTitle, { color: theme.text }]}>دعای بزرگسال</Text>
              <PrayerTextBlock
                arabic={currentSection.for_adult.arabic}
                translationDari={currentSection.for_adult.translation_dari}
                translationPashto={currentSection.for_adult.translation_pashto}
              />
              
              {currentSection.for_child && (
                <>
                  <Text style={[styles.duaTitle, { color: theme.text, marginTop: Spacing.lg }]}>دعای کودک</Text>
                  <PrayerTextBlock
                    arabic={currentSection.for_child.arabic}
                    translationDari={currentSection.for_child.translation_dari}
                    translationPashto={currentSection.for_child.translation_pashto}
                  />
                </>
              )}
            </View>
          )}

          {/* Response for Qawmah */}
          {currentSection.response_arabic && (
            <View style={[styles.responseBlock, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
              <Text style={[styles.responseLabel, { color: theme.textSecondary }]}>جواب مقتدی:</Text>
              <PrayerTextBlock
                arabic={currentSection.response_arabic}
                translationDari={currentSection.response_dari}
                translationPashto={currentSection.response_pashto}
              />
            </View>
          )}
        </View>
      </ScrollView>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {selectedSection ? renderSectionDetail() : selectedCategory ? renderSectionsList() : renderCategoryList()}
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
  header: {
    paddingTop: 60,
    paddingBottom: Spacing.xl,
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
  duaTileContainer: {
    marginHorizontal: Spacing.md,
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
  },
  backButton: {
    position: 'absolute',
    right: Spacing.md,
    top: 60,
    padding: Spacing.sm,
  },
  categoriesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: Spacing.md,
    gap: Spacing.md,
  },
  categoryCard: {
    width: '47%',
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    alignItems: 'center',
  },
  cardPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  categoryIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  categoryTitle: {
    fontSize: Typography.ui.subtitle,
    fontWeight: '600',
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  categoryTitlePashto: {
    fontSize: Typography.ui.caption,
    textAlign: 'center',
    writingDirection: 'rtl',
    marginTop: 2,
    fontFamily: 'NotoNastaliqUrdu', lineHeight: 42,
  },
  sectionCount: {
    position: 'absolute',
    top: Spacing.sm,
    left: Spacing.sm,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionCountText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  positionsSection: {
    margin: Spacing.md,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
  },
  sectionHeader: {
    fontSize: Typography.ui.subtitle,
    fontWeight: '600',
    textAlign: 'center',
    writingDirection: 'rtl',
    marginBottom: Spacing.md,
  },
  positionsScroll: {
    paddingVertical: Spacing.sm,
    gap: Spacing.md,
  },
  positionItem: {
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  positionIllustration: {
    width: 100,
    height: 100,
    borderRadius: BorderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  positionName: {
    fontSize: Typography.ui.caption,
    marginTop: Spacing.xs,
    textAlign: 'center',
  },
  attribution: {
    padding: Spacing.lg,
    alignItems: 'center',
  },
  attributionText: {
    fontSize: Typography.ui.caption,
    textAlign: 'center',
  },
  categoryHeader: {
    paddingTop: 60,
    paddingBottom: Spacing.xl,
    paddingHorizontal: Spacing.lg,
    alignItems: 'center',
  },
  sectionsContainer: {
    padding: Spacing.md,
  },
  sectionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginBottom: Spacing.sm,
  },
  sectionNumber: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: Spacing.md,
  },
  sectionNumberText: {
    color: '#fff',
    fontSize: Typography.ui.body,
    fontWeight: '600',
  },
  sectionInfo: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: Typography.ui.body,
    fontWeight: '600',
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  sectionTitlePashto: {
    fontSize: Typography.ui.caption,
    textAlign: 'center',
    writingDirection: 'rtl',
    marginTop: 2,
    fontFamily: 'NotoNastaliqUrdu', lineHeight: 42,
  },
  sectionDetailHeader: {
    paddingTop: 60,
    paddingBottom: Spacing.lg,
    paddingHorizontal: Spacing.lg,
    alignItems: 'center',
  },
  detailContent: {
    padding: Spacing.md,
    paddingBottom: Spacing.xxl,
  },
  contentBlock: {
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginBottom: Spacing.md,
  },
  langRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
  },
  langBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  langBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
  contentText: {
    fontSize: Typography.ui.body,
    textAlign: 'center',
    writingDirection: 'rtl',
    lineHeight: 28,
  },
  itemsBlock: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: Spacing.md,
  },
  itemRow: {
    flexDirection: 'row',
    padding: Spacing.md,
    alignItems: 'flex-start',
  },
  itemNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: Spacing.sm,
  },
  itemNumberText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  itemContent: {
    flex: 1,
  },
  itemText: {
    fontSize: Typography.ui.body,
    textAlign: 'center',
    writingDirection: 'rtl',
    lineHeight: 26,
  },
  itemTextPashto: {
    fontSize: Typography.ui.caption,
    textAlign: 'center',
    writingDirection: 'rtl',
    marginTop: 4,
    fontFamily: 'NotoNastaliqUrdu', lineHeight: 42,
  },
  prayersContainer: {
    gap: Spacing.md,
  },
  prayerCard: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  prayerHeader: {
    padding: Spacing.md,
    alignItems: 'center',
  },
  prayerName: {
    color: '#fff',
    fontSize: Typography.ui.subtitle,
    fontWeight: '600',
  },
  prayerNamePashto: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: Typography.ui.caption,
    fontFamily: 'NotoNastaliqUrdu', lineHeight: 42,
  },
  prayerDetails: {
    padding: Spacing.md,
  },
  prayerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: Spacing.xs,
  },
  prayerLabel: {
    fontSize: Typography.ui.body,
  },
  prayerValue: {
    fontSize: Typography.ui.body,
    fontWeight: '600',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: Spacing.sm,
    marginTop: Spacing.sm,
    borderRadius: BorderRadius.sm,
  },
  totalLabel: {
    fontSize: Typography.ui.body,
    fontWeight: '600',
  },
  totalValue: {
    fontSize: Typography.ui.subtitle,
    fontWeight: '700',
  },
  prayerNotes: {
    fontSize: Typography.ui.caption,
    textAlign: 'center',
    writingDirection: 'rtl',
    marginTop: Spacing.sm,
    fontStyle: 'italic',
  },
  qunootSection: {
    marginTop: Spacing.md,
  },
  qunootTitle: {
    fontSize: Typography.ui.subtitle,
    fontWeight: '600',
    textAlign: 'center',
    writingDirection: 'rtl',
    marginBottom: Spacing.sm,
  },
  janazahDuas: {
    marginTop: Spacing.md,
  },
  duaTitle: {
    fontSize: Typography.ui.subtitle,
    fontWeight: '600',
    textAlign: 'center',
    writingDirection: 'rtl',
    marginBottom: Spacing.sm,
  },
  responseBlock: {
    marginTop: Spacing.md,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
  },
  responseLabel: {
    fontSize: Typography.ui.body,
    fontWeight: '600',
    textAlign: 'center',
    writingDirection: 'rtl',
    marginBottom: Spacing.sm,
  },
  // Steps block styles (for steps_dari/steps_pashto)
  stepsBlock: {
    margin: Spacing.md,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
  },
  stepsSection: {
    marginBottom: Spacing.sm,
  },
  stepItem: {
    flexDirection: 'column',
    alignItems: 'center',
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.sm,
  },
  stepBullet: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  stepBulletText: {
    color: '#fff',
    fontSize: Typography.ui.body,
    fontWeight: '700',
  },
  stepText: {
    fontSize: Typography.ui.body,
    textAlign: 'center',
    writingDirection: 'rtl',
    lineHeight: 28,
  },
});
