/**
 * Chapter TOC — centered vertical section blocks, text-only navigation.
 */

import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { BookFrame } from '@/components/prayer/BookFrame';
import { BookOrnament } from '@/components/prayer/BookOrnament';
import { LocalizedText } from '@/components/ui/LocalizedText';
import { Spacing, Typography } from '@/constants/theme';
import { useApp } from '@/context/AppContext';
import { getPashtoBoldFontFamily, getPashtoFontFamily } from '@/hooks/useFonts';
import { useI18n } from '@/utils/i18n/useI18n';

export interface BookSectionRef {
  id: string;
  title_dari: string;
  title_pashto: string;
  title_english?: string;
}

interface BookChapterProps {
  categoryTitle: string;
  chapterIndex: number;
  sections: BookSectionRef[];
  onSelectSection: (sectionId: string) => void;
}

export function BookChapter({
  categoryTitle,
  chapterIndex,
  sections,
  onSelectSection,
}: BookChapterProps) {
  const { theme, state } = useApp();
  const { t, content, language, fontFamily, isLatin } = useI18n();
  const pashtoFont = state.preferences.pashtoFont;
  const titleFont = language === 'pashto' ? getPashtoBoldFontFamily(pashtoFont) : isLatin ? undefined : 'Vazirmatn-Bold';
  const bodyFont = language === 'pashto' ? getPashtoFontFamily(pashtoFont) : isLatin ? undefined : fontFamily || 'Vazirmatn';

  return (
    <BookFrame>
      <View style={styles.header}>
        <LocalizedText style={[styles.chapterLabel, { color: theme.accent }]}>
          {t('prayerLearning.chapter')} {chapterIndex + 1}
        </LocalizedText>
        <LocalizedText
          preserveFontFamily
          style={[styles.chapterTitle, { color: theme.text, fontFamily: titleFont }]}
        >
          {categoryTitle}
        </LocalizedText>
        <BookOrnament width={120} />
      </View>

      <View>
        {sections.map((section, index) => (
          <Pressable
            key={section.id}
            onPress={() => onSelectSection(section.id)}
            style={({ pressed }) => [
              styles.block,
              { borderBottomColor: theme.divider },
              pressed && styles.pressed,
            ]}
          >
            <LocalizedText style={[styles.number, { color: theme.accent }]}>
              {index + 1}
            </LocalizedText>
            <LocalizedText
              style={[styles.sectionTitle, { color: theme.text, fontFamily: bodyFont }]}
            >
              {content(section, 'title')}
            </LocalizedText>
          </Pressable>
        ))}
      </View>
    </BookFrame>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  chapterLabel: {
    fontSize: Typography.ui.caption,
    fontWeight: '700',
    marginBottom: Spacing.xs,
    textAlign: 'center',
  },
  chapterTitle: {
    fontSize: Typography.ui.heading,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  block: {
    alignItems: 'center',
    paddingVertical: Spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: Spacing.xs,
  },
  pressed: {
    opacity: 0.75,
  },
  number: {
    fontSize: Typography.ui.title,
    fontWeight: '700',
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: Typography.ui.body,
    fontWeight: '500',
    lineHeight: 28,
    textAlign: 'center',
  },
});

export default BookChapter;
