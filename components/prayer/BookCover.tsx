/**
 * Book cover — centered vertical blocks, no chevrons or icons.
 */

import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { BookFrame } from '@/components/prayer/BookFrame';
import { BookOrnament } from '@/components/prayer/BookOrnament';
import { LocalizedText } from '@/components/ui/LocalizedText';
import type { PashtoFontFamily } from '@/constants/theme';
import { PashtoFonts, Spacing, Typography } from '@/constants/theme';
import { useApp } from '@/context/AppContext';
import { useI18n } from '@/utils/i18n/useI18n';

export interface BookCategory {
  id: string;
  title_dari: string;
  title_pashto: string;
  title_english?: string;
  sections: unknown[];
}

interface BookCoverProps {
  categories: BookCategory[];
  onSelectCategory: (categoryId: string) => void;
}

export function BookCover({ categories, onSelectCategory }: BookCoverProps) {
  const { theme, state } = useApp();
  const { t, content, language, fontFamily } = useI18n();
  const pashtoFontFamily = PashtoFonts[state.preferences.pashtoFont as PashtoFontFamily]?.name || 'Amiri';
  const titleFont = language === 'pashto' ? pashtoFontFamily : 'Vazirmatn-Bold';
  const bodyFont = language === 'pashto' ? pashtoFontFamily : fontFamily || 'Vazirmatn';

  return (
    <BookFrame>
      <View style={styles.masthead}>
        <LocalizedText
          preserveFontFamily
          style={[styles.bookTitle, { color: theme.text, fontFamily: titleFont }]}
        >
          {t('prayerLearning.title')}
        </LocalizedText>
        <BookOrnament width={140} />
        <LocalizedText
          style={[styles.subtitle, { color: theme.textSecondary, fontFamily: bodyFont }]}
        >
          {t('prayerLearning.subtitle')}
        </LocalizedText>
      </View>

      <LocalizedText style={[styles.tocHeading, { color: theme.accent, fontFamily: titleFont }]}>
        {t('prayerLearning.contents')}
      </LocalizedText>

      <View style={styles.toc}>
        {categories.map((category, index) => (
          <Pressable
            key={category.id}
            onPress={() => onSelectCategory(category.id)}
            style={({ pressed }) => [
              styles.tocBlock,
              { borderBottomColor: theme.divider },
              pressed && styles.pressed,
            ]}
          >
            <LocalizedText style={[styles.tocNumber, { color: theme.accent }]}>
              {index + 1}
            </LocalizedText>
            <LocalizedText
              style={[styles.tocTitle, { color: theme.text, fontFamily: titleFont }]}
            >
              {content(category, 'title')}
            </LocalizedText>
            <LocalizedText style={[styles.tocMeta, { color: theme.textSecondary }]}>
              {t('prayerLearning.sectionsCount', { n: category.sections.length })}
            </LocalizedText>
          </Pressable>
        ))}
      </View>

      <View style={styles.footer}>
        <LocalizedText style={[styles.footerText, { color: theme.textSecondary }]}>
          {t('prayerLearning.attribution')}
        </LocalizedText>
        <LocalizedText style={[styles.footerText, { color: theme.textSecondary }]}>
          {t('prayerLearning.source')}
        </LocalizedText>
      </View>
    </BookFrame>
  );
}

const styles = StyleSheet.create({
  masthead: {
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  bookTitle: {
    fontSize: Typography.ui.display,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  subtitle: {
    fontSize: Typography.ui.body,
    lineHeight: 28,
    marginTop: Spacing.sm,
    textAlign: 'center',
  },
  tocHeading: {
    fontSize: Typography.ui.subtitle,
    fontWeight: '700',
    marginBottom: Spacing.md,
    textAlign: 'center',
  },
  toc: {
    marginBottom: Spacing.sm,
  },
  tocBlock: {
    alignItems: 'center',
    paddingVertical: Spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: Spacing.xs,
  },
  pressed: {
    opacity: 0.75,
  },
  tocNumber: {
    fontSize: Typography.ui.title,
    fontWeight: '700',
    textAlign: 'center',
  },
  tocTitle: {
    fontSize: Typography.ui.subtitle,
    fontWeight: '600',
    textAlign: 'center',
  },
  tocMeta: {
    fontSize: Typography.ui.caption,
    textAlign: 'center',
  },
  footer: {
    alignItems: 'center',
    paddingTop: Spacing.lg,
    gap: 6,
  },
  footerText: {
    fontSize: Typography.ui.caption,
    lineHeight: 20,
    textAlign: 'center',
  },
});

export default BookCover;
