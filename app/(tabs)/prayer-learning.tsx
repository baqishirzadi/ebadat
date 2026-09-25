/**
 * Prayer Learning Screen
 * آموزش نماز طبق مذهب حنفی
 */

import CenteredText from '@/components/CenteredText';
import { DuaFeatureTile } from '@/components/dua/FeatureTile';
import { PrayerStepGuide, PrayerTextBlock } from '@/components/prayer';
import type { PashtoFontFamily } from '@/constants/theme';
import { BorderRadius, PashtoFonts, Spacing, Typography } from '@/constants/theme';
import { useApp } from '@/context/AppContext';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';

import { BackHandler, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { LocalizedText } from '@/components/ui/LocalizedText';

// Import prayer learning data
import prayerData from '@/data/prayerLearning.json';
import { backIconName, forwardChevronName, rowStyle } from '@/utils/i18n/direction';
import { useI18n } from '@/utils/i18n/useI18n';

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
  const { theme, state } = useApp();
  const { t, content, contentList, fontFamily, language } = useI18n();
  const router = useRouter();
  const chevron = forwardChevronName(language);
  const backIcon = backIconName(language);
  const directionalRow = rowStyle(language);
  const pashtoFontFamily = PashtoFonts[state.preferences.pashtoFont as PashtoFontFamily]?.name || 'Amiri';
  const bodyFont = language === 'pashto' ? pashtoFontFamily : fontFamily || 'Vazirmatn';
  const titleFont = language === 'pashto' ? pashtoFontFamily : 'Vazirmatn-Bold';
  const bodyLineHeight = language === 'pashto' ? 42 : 30;
  const itemLineHeight = language === 'pashto' ? 38 : 26;
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
      <ScreenHeader
        icon="school"
        title={t('prayerLearning.title')}
        subtitle={t('prayerLearning.subtitle')}
      />

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
            <LocalizedText style={[styles.categoryTitle, { color: theme.text, fontFamily: titleFont }]}>
              {content(category, 'title')}
            </LocalizedText>
            <View style={[styles.sectionCount, { backgroundColor: category.color }]}>
              <LocalizedText style={styles.sectionCountText}>
                {category.sections.length}
              </LocalizedText>
            </View>
          </Pressable>
        ))}
      </View>

      {/* Attribution */}
      <View style={styles.attribution}>
        <LocalizedText style={[styles.attributionText, { color: theme.textSecondary }]}>
          {t('prayerLearning.attribution')}
        </LocalizedText>
        <LocalizedText style={[styles.attributionText, { color: theme.textSecondary }]}>
          {t('prayerLearning.source')}
        </LocalizedText>
      </View>

      {/* Dua Request Feature Tile */}
      <View style={styles.duaTileContainer}>
        <DuaFeatureTile />
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
            <MaterialIcons name={backIcon} size={24} color="#fff" />
          </Pressable>
          <MaterialIcons
            name={iconMap[currentCategory.icon] || 'book'}
            size={40}
            color="#fff"
          />
          <CenteredText style={[styles.headerTitle, { fontFamily: titleFont }]}>{content(currentCategory, 'title')}</CenteredText>
        </View>

        {/* Sections */}
        <View style={styles.sectionsContainer}>
          {currentCategory.sections.map((section, index) => (
            <Pressable
              key={section.id}
              onPress={() => handleSectionPress(section.id)}
              style={({ pressed }) => [
                styles.sectionCard,
                directionalRow,
                { backgroundColor: theme.card, borderColor: theme.cardBorder },
                pressed && styles.cardPressed,
              ]}
            >
              <View style={[styles.sectionNumber, { backgroundColor: currentCategory.color }]}>
                <LocalizedText style={styles.sectionNumberText}>{index + 1}</LocalizedText>
              </View>
              <View style={styles.sectionInfo}>
                <LocalizedText style={[styles.sectionTitle, { color: theme.text, fontFamily: titleFont }]}>
                  {content(section, 'title')}
                </LocalizedText>
              </View>
              <MaterialIcons name={chevron} size={24} color={theme.icon} />
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
            <MaterialIcons name={backIcon} size={24} color="#fff" />
          </Pressable>
          <CenteredText style={[styles.headerTitle, { fontFamily: titleFont }]}>{content(currentSection, 'title')}</CenteredText>
        </View>

        <View style={styles.detailContent}>
          {/* Content */}
          {content(currentSection, 'content') ? (
            <View style={[styles.contentBlock, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
              <LocalizedText style={[styles.contentText, { color: theme.text, fontFamily: bodyFont, lineHeight: bodyLineHeight }]}>
                {content(currentSection, 'content')}
              </LocalizedText>
            </View>
          ) : null}

          {/* Items list */}
          {currentSection.items && (
            <View style={[styles.itemsBlock, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
              {currentSection.items.map((item: any, index: number) => (
                <View key={index} style={[styles.itemRow, directionalRow, index > 0 && { borderTopWidth: 1, borderTopColor: theme.cardBorder }]}>
                  {item.number && (
                    <View style={[styles.itemNumber, { backgroundColor: currentCategory.color }]}>
                      <LocalizedText style={styles.itemNumberText}>{item.number}</LocalizedText>
                    </View>
                  )}
                  <View style={styles.itemContent}>
                    <LocalizedText style={[styles.itemText, { color: theme.text, fontFamily: bodyFont, lineHeight: itemLineHeight }]}>
                      {content(item, null)}
                    </LocalizedText>
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* Steps */}
          {currentSection.steps && (
            <PrayerStepGuide
              steps={currentSection.steps}
              showBothLanguages={false}
            />
          )}

          {/* Janazah quick jump: Method -> Dua */}
          {currentCategory.id === 'janazah' && currentSection.id === 'janazah_method' && (
            <Pressable
              onPress={() => setSelectedSection('janazah_dua')}
              style={({ pressed }) => [
                styles.janazahJumpCard,
                directionalRow,
                { backgroundColor: theme.card, borderColor: theme.cardBorder },
                pressed && styles.cardPressed,
              ]}
            >
              <View style={styles.janazahJumpContent}>
                <LocalizedText style={[styles.janazahJumpTitle, { color: theme.text }]}>
                  {t('prayerLearning.janazahDua')}
                </LocalizedText>
                <LocalizedText
                  style={[
                    styles.janazahJumpSubtitle,
                    { color: theme.textSecondary, fontFamily: bodyFont },
                  ]}
                >
                  {t('prayerLearning.janazahDua')}
                </LocalizedText>
              </View>
              <MaterialIcons name={chevron} size={22} color={theme.tint} />
            </Pressable>
          )}

          {/* Steps (Dari/Pashto string arrays) */}
          {contentList(currentSection, 'steps').length > 0 && (
            <View style={[styles.stepsBlock, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
              <View style={styles.stepsSection}>
                {contentList(currentSection, 'steps').map((step: string, index: number) => (
                  <View key={index} style={[styles.stepItem, directionalRow]}>
                    <View style={[styles.stepBullet, { backgroundColor: currentCategory?.color || theme.tint }]}>
                      <LocalizedText style={styles.stepBulletText}>{index + 1}</LocalizedText>
                    </View>
                    <LocalizedText style={[styles.stepText, { color: theme.text, fontFamily: bodyFont, lineHeight: itemLineHeight }]}>{step}</LocalizedText>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Arabic text with translations */}
          {currentSection.arabic && (
            <PrayerTextBlock arabic={currentSection.arabic} source={currentSection} />
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
                    <LocalizedText style={[styles.prayerName, { fontFamily: titleFont }]}>{content(prayer, 'name')}</LocalizedText>
                  </View>
                  <View style={styles.prayerDetails}>
                    <View style={styles.prayerRow}>
                      <LocalizedText style={[styles.prayerLabel, { color: theme.textSecondary }]}>{t('prayerLearning.fardh')}</LocalizedText>
                      <LocalizedText style={[styles.prayerValue, { color: theme.text }]}>{prayer.fardh} {t('prayerLearning.rakat')}</LocalizedText>
                    </View>
                    {prayer.sunnah_before > 0 && (
                      <View style={styles.prayerRow}>
                        <LocalizedText style={[styles.prayerLabel, { color: theme.textSecondary }]}>{t('prayerLearning.sunnahBefore')}</LocalizedText>
                        <LocalizedText style={[styles.prayerValue, { color: theme.text }]}>{prayer.sunnah_before} {t('prayerLearning.rakat')}</LocalizedText>
                      </View>
                    )}
                    {prayer.sunnah_after > 0 && (
                      <View style={styles.prayerRow}>
                        <LocalizedText style={[styles.prayerLabel, { color: theme.textSecondary }]}>{t('prayerLearning.sunnahAfter')}</LocalizedText>
                        <LocalizedText style={[styles.prayerValue, { color: theme.text }]}>{prayer.sunnah_after} {t('prayerLearning.rakat')}</LocalizedText>
                      </View>
                    )}
                    {prayer.witr && (
                      <View style={styles.prayerRow}>
                        <LocalizedText style={[styles.prayerLabel, { color: theme.textSecondary }]}>{t('prayerLearning.witr')}</LocalizedText>
                        <LocalizedText style={[styles.prayerValue, { color: theme.text }]}>{prayer.witr} {t('prayerLearning.rakat')}</LocalizedText>
                      </View>
                    )}
                    <View style={[styles.totalRow, { backgroundColor: `${currentCategory.color}20` }]}>
                      <LocalizedText style={[styles.totalLabel, { color: theme.text }]}>{t('prayerLearning.total')}</LocalizedText>
                      <LocalizedText style={[styles.totalValue, { color: currentCategory.color }]}>{prayer.total} {t('prayerLearning.rakat')}</LocalizedText>
                    </View>
                    <LocalizedText style={[styles.prayerNotes, { color: theme.textSecondary }]}>
                      {content(prayer, 'notes')}
                    </LocalizedText>
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* Qunoot for Witr */}
          {currentSection.qunoot_arabic && (
            <View style={styles.qunootSection}>
              <LocalizedText style={[styles.qunootTitle, { color: theme.text, fontFamily: titleFont }]}>{t('prayerLearning.qunootDua')}</LocalizedText>
              <PrayerTextBlock
                arabic={currentSection.qunoot_arabic}
                source={currentSection}
                translationField="qunoot"
              />
            </View>
          )}

          {/* Janazah duas */}
          {currentSection.for_adult && (
            <View style={styles.janazahDuas}>
              <LocalizedText style={[styles.duaTitle, { color: theme.text, fontFamily: titleFont }]}>{t('prayerLearning.adultDua')}</LocalizedText>
              <PrayerTextBlock
                arabic={currentSection.for_adult.arabic}
                source={currentSection.for_adult}
              />

              {currentSection.for_child && (
                <>
                  <LocalizedText style={[styles.duaTitle, { color: theme.text, marginTop: Spacing.lg, fontFamily: titleFont }]}>{t('prayerLearning.childDua')}</LocalizedText>
                  <PrayerTextBlock
                    arabic={currentSection.for_child.arabic}
                    source={currentSection.for_child}
                  />
                </>
              )}
            </View>
          )}

          {/* Response for Qawmah */}
          {currentSection.response_arabic && (
            <View style={[styles.responseBlock, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
              <LocalizedText style={[styles.responseLabel, { color: theme.textSecondary, fontFamily: bodyFont }]}>{t('prayerLearning.respondent')}</LocalizedText>
              <PrayerTextBlock
                arabic={currentSection.response_arabic}
                source={currentSection}
                translationField="response"
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
  rootBackButton: {
    position: 'absolute',
    right: Spacing.md,
    top: 54,
    padding: Spacing.sm,
    zIndex: 2,
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
    lineHeight: 42,
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
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginBottom: Spacing.sm,
  },
  sectionNumber: {
    width: 40,
    height: 40,
    borderRadius: 20,
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
    lineHeight: 42,
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
    includeFontPadding: false,
  },
  itemsBlock: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: Spacing.md,
  },
  itemRow: {
    padding: Spacing.md,
    alignItems: 'center',
  },
  itemNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
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
    alignItems: 'center',
  },
  itemText: {
    fontSize: Typography.ui.body,
    textAlign: 'center',
    writingDirection: 'rtl',
    lineHeight: 26,
    includeFontPadding: false,
  },
  itemTextPashto: {
    fontSize: Typography.ui.caption,
    textAlign: 'center',
    writingDirection: 'rtl',
    marginTop: 4,
    lineHeight: 42,
    includeFontPadding: false,
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
    lineHeight: 42,
  },
  prayerDetails: {
    padding: Spacing.md,
  },
  prayerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingVertical: Spacing.xs,
    gap: Spacing.sm,
  },
  prayerLabel: {
    fontSize: Typography.ui.body,
    textAlign: 'center',
    writingDirection: 'rtl',
    includeFontPadding: false,
  },
  prayerValue: {
    fontSize: Typography.ui.body,
    fontWeight: '600',
    textAlign: 'center',
    writingDirection: 'rtl',
    includeFontPadding: false,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    padding: Spacing.sm,
    marginTop: Spacing.sm,
    borderRadius: BorderRadius.sm,
    gap: Spacing.sm,
  },
  totalLabel: {
    fontSize: Typography.ui.body,
    fontWeight: '600',
    textAlign: 'center',
    writingDirection: 'rtl',
    includeFontPadding: false,
  },
  totalValue: {
    fontSize: Typography.ui.subtitle,
    fontWeight: '700',
    textAlign: 'center',
    writingDirection: 'rtl',
    includeFontPadding: false,
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
    alignItems: 'center',
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.sm,
    justifyContent: 'center',
  },
  stepBullet: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: Spacing.sm,
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
    flex: 1,
    includeFontPadding: false,
  },
  janazahJumpCard: {
    marginBottom: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.md,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  janazahJumpContent: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
  },
  janazahJumpTitle: {
    fontSize: Typography.ui.subtitle,
    fontWeight: '600',
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  janazahJumpSubtitle: {
    marginTop: 4,
    fontSize: Typography.ui.caption,
    textAlign: 'center',
    writingDirection: 'rtl',
    lineHeight: 38,
  },
});
