/**
 * Chapter table of contents — list of sections inside one book category.
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
import { backIconName, forwardChevronName, rowStyle } from '@/utils/i18n/direction';
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
  onBack: () => void;
  onSelectSection: (sectionId: string) => void;
}

export function BookChapter({
  categoryTitle,
  chapterIndex,
  sections,
  onBack,
  onSelectSection,
}: BookChapterProps) {
  const { theme, state } = useApp();
  const { t, content, language, fontFamily } = useI18n();
  const chevron = forwardChevronName(language);
  const backIcon = backIconName(language);
  const directionalRow = rowStyle(language);
  const isRtl = language !== 'english';
  const pashtoFontFamily = PashtoFonts[state.preferences.pashtoFont as PashtoFontFamily]?.name || 'Amiri';
  const titleFont = language === 'pashto' ? pashtoFontFamily : 'Vazirmatn-Bold';
  const bodyFont = language === 'pashto' ? pashtoFontFamily : fontFamily || 'Vazirmatn';

  return (
    <BookFrame>
      <Pressable
        onPress={onBack}
        hitSlop={10}
        style={[styles.backRow, directionalRow]}
      >
        <MaterialIcons name={backIcon} size={22} color={theme.tint} />
        <LocalizedText style={[styles.backLabel, { color: theme.tint, fontFamily: bodyFont }]}>
          {t('prayerLearning.contents')}
        </LocalizedText>
      </Pressable>

      <View style={styles.header}>
        <LocalizedText style={[styles.chapterLabel, { color: theme.accent }]}>
          {t('prayerLearning.chapter')} {chapterIndex + 1}
        </LocalizedText>
        <LocalizedText
          preserveFontFamily
          style={[
            styles.chapterTitle,
            {
              color: theme.text,
              fontFamily: titleFont,
              textAlign: 'center',
            },
          ]}
        >
          {categoryTitle}
        </LocalizedText>
        <BookOrnament />
      </View>

      <View>
        {sections.map((section, index) => (
          <Pressable
            key={section.id}
            onPress={() => onSelectSection(section.id)}
            style={({ pressed }) => [
              styles.row,
              directionalRow,
              { borderBottomColor: theme.divider },
              pressed && styles.pressed,
            ]}
          >
            <LocalizedText style={[styles.number, { color: theme.accent }]}>
              {index + 1}
            </LocalizedText>
            <LocalizedText
              style={[
                styles.sectionTitle,
                {
                  color: theme.text,
                  fontFamily: bodyFont,
                  textAlign: isRtl ? 'right' : 'left',
                  writingDirection: isRtl ? 'rtl' : 'ltr',
                },
              ]}
            >
              {content(section, 'title')}
            </LocalizedText>
            <MaterialIcons name={chevron} size={18} color={theme.icon} />
          </Pressable>
        ))}
      </View>
    </BookFrame>
  );
}

const styles = StyleSheet.create({
  backRow: {
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.md,
  },
  backLabel: {
    fontSize: Typography.ui.body,
    fontWeight: '600',
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  chapterLabel: {
    fontSize: Typography.ui.caption,
    fontWeight: '600',
    letterSpacing: 1,
    marginBottom: Spacing.xs,
  },
  chapterTitle: {
    fontSize: Typography.ui.title,
    fontWeight: '700',
  },
  row: {
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: Spacing.sm,
  },
  pressed: {
    opacity: 0.75,
  },
  number: {
    fontSize: Typography.ui.subtitle,
    fontWeight: '700',
    minWidth: 28,
    textAlign: 'center',
  },
  sectionTitle: {
    flex: 1,
    fontSize: Typography.ui.body,
    fontWeight: '500',
    lineHeight: 26,
  },
});

export default BookChapter;
