/**
 * Prayer Learning Screen — Hanafi fiqh presented as a readable RTL book.
 */

import { BookChapter } from '@/components/prayer/BookChapter';
import { BookCover } from '@/components/prayer/BookCover';
import { BookLeaf, lessonStepCount, type PrayerSection } from '@/components/prayer/BookLeaf';
import { LocalizedText } from '@/components/ui/LocalizedText';
import { RtlView } from '@/components/ui/RtlView';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { BorderRadius, Spacing, Typography } from '@/constants/theme';
import { useApp } from '@/context/AppContext';
import prayerData from '@/data/prayerLearning.json';
import { useI18n } from '@/utils/i18n/useI18n';
import { useFocusEffect } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BackHandler, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function PrayerLearningScreen() {
  const { theme } = useApp();
  const { t, content, contentList } = useI18n();
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedSection, setSelectedSection] = useState<string | null>(null);
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  }, [selectedCategory, selectedSection, stepIndex]);

  const currentCategory = useMemo(
    () => prayerData.categories.find((c) => c.id === selectedCategory),
    [selectedCategory],
  );

  const sectionIndex = useMemo(() => {
    if (!currentCategory || !selectedSection) return -1;
    return currentCategory.sections.findIndex((s) => s.id === selectedSection);
  }, [currentCategory, selectedSection]);

  const currentSection =
    sectionIndex >= 0 && currentCategory
      ? (currentCategory.sections[sectionIndex] as PrayerSection)
      : undefined;

  const stepCount = currentSection
    ? lessonStepCount(currentSection, contentList(currentSection, 'steps').length)
    : 0;
  const safeStepIndex = stepCount > 0 ? Math.min(stepIndex, stepCount - 1) : 0;

  const chapterIndex = useMemo(() => {
    if (!selectedCategory) return 0;
    return Math.max(
      0,
      prayerData.categories.findIndex((c) => c.id === selectedCategory),
    );
  }, [selectedCategory]);

  const handleCategoryPress = useCallback((categoryId: string) => {
    setSelectedCategory(categoryId);
    setSelectedSection(null);
    setStepIndex(0);
  }, []);

  const handleSectionPress = useCallback((sectionId: string) => {
    setSelectedSection(sectionId);
    setStepIndex(0);
  }, []);

  const handleBack = useCallback(() => {
    if (selectedSection) {
      setSelectedSection(null);
      setStepIndex(0);
      return true;
    }
    if (selectedCategory) {
      setSelectedCategory(null);
      return true;
    }
    return false;
  }, [selectedCategory, selectedSection]);

  const goPrev = useCallback(() => {
    if (!currentCategory || sectionIndex < 0) return;
    if (safeStepIndex > 0) {
      setStepIndex(safeStepIndex - 1);
      return;
    }
    if (sectionIndex <= 0) return;
    const previous = currentCategory.sections[sectionIndex - 1] as PrayerSection;
    const previousCount = lessonStepCount(previous, contentList(previous, 'steps').length);
    setStepIndex(previousCount > 0 ? previousCount - 1 : 0);
    setSelectedSection(previous.id);
  }, [contentList, currentCategory, safeStepIndex, sectionIndex]);

  const goNext = useCallback(() => {
    if (!currentCategory || sectionIndex < 0) return;
    if (stepCount > 0 && safeStepIndex < stepCount - 1) {
      setStepIndex(safeStepIndex + 1);
      return;
    }
    if (sectionIndex >= currentCategory.sections.length - 1) return;
    setStepIndex(0);
    setSelectedSection(currentCategory.sections[sectionIndex + 1].id);
  }, [currentCategory, safeStepIndex, sectionIndex, stepCount]);

  const canGoPrev = sectionIndex > 0 || safeStepIndex > 0;
  const canGoNext =
    (stepCount > 0 && safeStepIndex < stepCount - 1) ||
    (currentCategory != null && sectionIndex >= 0 && sectionIndex < currentCategory.sections.length - 1);

  const progressLabel =
    stepCount > 0
      ? t('prayerLearning.stepOf', { current: safeStepIndex + 1, total: stepCount })
      : t('prayerLearning.sectionOf', {
          current: sectionIndex + 1,
          total: currentCategory?.sections.length ?? 0,
        });

  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        if (selectedSection || selectedCategory) {
          handleBack();
          return true;
        }
        return false;
      };

      const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => subscription.remove();
    }, [selectedCategory, selectedSection, handleBack]),
  );

  return (
    <RtlView style={[styles.container, { backgroundColor: theme.background }]}>
      <ScreenHeader
        title={t('prayerLearning.title')}
        subtitle={
          selectedSection
            ? content(currentSection, 'title')
            : selectedCategory
              ? content(currentCategory, 'title')
              : t('prayerLearning.subtitle')
        }
        onBack={
          selectedCategory || selectedSection
            ? () => {
                handleBack();
              }
            : undefined
        }
      />

      <ScrollView
        ref={scrollRef}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {selectedSection && currentCategory && currentSection ? (
          <BookLeaf
            categoryId={currentCategory.id}
            section={currentSection}
            stepIndex={safeStepIndex}
            onJumpSection={handleSectionPress}
          />
        ) : selectedCategory && currentCategory ? (
          <BookChapter
            categoryTitle={content(currentCategory, 'title')}
            chapterIndex={chapterIndex}
            sections={currentCategory.sections}
            onSelectSection={handleSectionPress}
          />
        ) : (
          <BookCover
            categories={prayerData.categories}
            onSelectCategory={handleCategoryPress}
          />
        )}
      </ScrollView>

      {selectedSection && currentSection ? (
        <View
          style={[
            styles.navBar,
            {
              backgroundColor: theme.background,
              borderTopColor: theme.divider,
              paddingBottom: Math.max(insets.bottom, Spacing.sm),
            },
          ]}
        >
          {canGoPrev ? (
            <Pressable
              onPress={goPrev}
              style={({ pressed }) => [
                styles.navButton,
                { borderColor: theme.cardBorder, opacity: pressed ? 0.7 : 1 },
              ]}
            >
              <LocalizedText style={[styles.navLabel, { color: theme.tint }]}>
                {t('prayerLearning.previous')}
              </LocalizedText>
            </Pressable>
          ) : (
            <View style={styles.navSpacer} />
          )}

          <LocalizedText style={[styles.progressLabel, { color: theme.textSecondary }]}>
            {progressLabel}
          </LocalizedText>

          {canGoNext ? (
            <Pressable
              onPress={goNext}
              style={({ pressed }) => [
                styles.navButton,
                { borderColor: theme.cardBorder, opacity: pressed ? 0.7 : 1 },
              ]}
            >
              <LocalizedText style={[styles.navLabel, { color: theme.tint }]}>
                {t('prayerLearning.next')}
              </LocalizedText>
            </Pressable>
          ) : (
            <View style={styles.navSpacer} />
          )}
        </View>
      ) : null}
    </RtlView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: Spacing.lg,
    paddingTop: Spacing.sm,
  },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  navButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm,
    borderWidth: 1,
    borderRadius: BorderRadius.md,
  },
  navSpacer: {
    flex: 1,
  },
  navLabel: {
    fontSize: Typography.ui.body,
    fontWeight: '600',
    textAlign: 'center',
  },
  progressLabel: {
    fontSize: Typography.ui.caption,
    fontWeight: '600',
    minWidth: 72,
    textAlign: 'center',
  },
});
