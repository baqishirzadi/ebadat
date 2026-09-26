/**
 * Prayer Learning Screen — Hanafi fiqh presented as a readable RTL book.
 */

import { BookChapter } from '@/components/prayer/BookChapter';
import { BookCover } from '@/components/prayer/BookCover';
import { BookLeaf, type PrayerSection } from '@/components/prayer/BookLeaf';
import { RtlView } from '@/components/ui/RtlView';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Spacing } from '@/constants/theme';
import { useApp } from '@/context/AppContext';
import prayerData from '@/data/prayerLearning.json';
import { useI18n } from '@/utils/i18n/useI18n';
import { useFocusEffect } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BackHandler, ScrollView, StyleSheet } from 'react-native';

export default function PrayerLearningScreen() {
  const { theme } = useApp();
  const { t, content } = useI18n();
  const scrollRef = useRef<ScrollView>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedSection, setSelectedSection] = useState<string | null>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  }, [selectedCategory, selectedSection]);

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
  }, []);

  const handleSectionPress = useCallback((sectionId: string) => {
    setSelectedSection(sectionId);
  }, []);

  const handleBack = useCallback(() => {
    if (selectedSection) {
      setSelectedSection(null);
      return true;
    }
    if (selectedCategory) {
      setSelectedCategory(null);
      return true;
    }
    return false;
  }, [selectedCategory, selectedSection]);

  const goPrevSection = useCallback(() => {
    if (!currentCategory || sectionIndex <= 0) return;
    setSelectedSection(currentCategory.sections[sectionIndex - 1].id);
  }, [currentCategory, sectionIndex]);

  const goNextSection = useCallback(() => {
    if (!currentCategory || sectionIndex < 0) return;
    if (sectionIndex >= currentCategory.sections.length - 1) return;
    setSelectedSection(currentCategory.sections[sectionIndex + 1].id);
  }, [currentCategory, sectionIndex]);

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
            sectionIndex={sectionIndex}
            sectionCount={currentCategory.sections.length}
            onBack={handleBack}
            onPrevious={goPrevSection}
            onNext={goNextSection}
            onJumpSection={handleSectionPress}
          />
        ) : selectedCategory && currentCategory ? (
          <BookChapter
            categoryTitle={content(currentCategory, 'title')}
            chapterIndex={chapterIndex}
            sections={currentCategory.sections}
            onBack={handleBack}
            onSelectSection={handleSectionPress}
          />
        ) : (
          <BookCover
            categories={prayerData.categories}
            onSelectCategory={handleCategoryPress}
          />
        )}
      </ScrollView>
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
    paddingBottom: Spacing.xxl,
    paddingTop: Spacing.sm,
  },
});
