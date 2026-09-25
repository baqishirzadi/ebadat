/**
 * Book cover: title, Hanafi attribution, and single-column table of contents.
 */

import { MaterialIcons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { BookFrame } from '@/components/prayer/BookFrame';
import { BookOrnament } from '@/components/prayer/BookOrnament';
import { LocalizedText } from '@/components/ui/LocalizedText';
import type { PashtoFontFamily } from '@/constants/theme';
import { PashtoFonts, Spacing, Typography } from '@/constants/theme';
import { useApp } from '@/context/AppContext';
import { forwardChevronName, rowStyle } from '@/utils/i18n/direction';
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
  const chevron = forwardChevronName(language);
  const directionalRow = rowStyle(language);
  const isRtl = language !== 'english';
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
        <BookOrnament />
        <LocalizedText
          style={[
            styles.subtitle,
            {
              color: theme.textSecondary,
              fontFamily: bodyFont,
              textAlign: isRtl ? 'right' : 'left',
              writingDirection: isRtl ? 'rtl' : 'ltr',
            },
          ]}
        >
          {t('prayerLearning.subtitle')}
        </LocalizedText>
      </View>

      <LocalizedText
        style={[
          styles.tocHeading,
          { color: theme.accent, fontFamily: titleFont, textAlign: isRtl ? 'right' : 'left' },
        ]}
      >
        {t('prayerLearning.contents')}
      </LocalizedText>

      <View style={styles.toc}>
        {categories.map((category, index) => (
          <Pressable
            key={category.id}
            onPress={() => onSelectCategory(category.id)}
            style={({ pressed }) => [
              styles.tocRow,
              directionalRow,
              { borderBottomColor: theme.divider },
              pressed && styles.pressed,
            ]}
          >
            <View style={[styles.tocNumber, { borderColor: theme.accent }]}>
              <LocalizedText style={[styles.tocNumberText, { color: theme.accent }]}>
                {index + 1}
              </LocalizedText>
            </View>
            <View style={styles.tocInfo}>
              <LocalizedText
                style={[
                  styles.tocTitle,
                  {
                    color: theme.text,
                    fontFamily: titleFont,
                    textAlign: isRtl ? 'right' : 'left',
                    writingDirection: isRtl ? 'rtl' : 'ltr',
                  },
                ]}
              >
                {content(category, 'title')}
              </LocalizedText>
              <LocalizedText
                style={[
                  styles.tocMeta,
                  {
                    color: theme.textSecondary,
                    textAlign: isRtl ? 'right' : 'left',
                  },
                ]}
              >
                {t('prayerLearning.sectionsCount', { n: category.sections.length })}
              </LocalizedText>
            </View>
            <MaterialIcons name={chevron} size={20} color={theme.icon} />
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
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.md,
  },
  bookTitle: {
    fontSize: Typography.ui.heading,
    fontWeight: '700',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: Typography.ui.body,
    lineHeight: 24,
    marginTop: Spacing.xs,
    paddingHorizontal: Spacing.sm,
  },
  tocHeading: {
    fontSize: Typography.ui.subtitle,
    fontWeight: '600',
    marginBottom: Spacing.sm,
    writingDirection: 'rtl',
  },
  toc: {
    marginBottom: Spacing.md,
  },
  tocRow: {
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: Spacing.sm,
  },
  pressed: {
    opacity: 0.75,
  },
  tocNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tocNumberText: {
    fontSize: Typography.ui.body,
    fontWeight: '700',
  },
  tocInfo: {
    flex: 1,
  },
  tocTitle: {
    fontSize: Typography.ui.subtitle,
    fontWeight: '600',
  },
  tocMeta: {
    fontSize: Typography.ui.caption,
    marginTop: 2,
  },
  footer: {
    alignItems: 'center',
    paddingTop: Spacing.md,
    gap: 4,
  },
  footerText: {
    fontSize: Typography.ui.caption,
    textAlign: 'center',
  },
});

export default BookCover;
