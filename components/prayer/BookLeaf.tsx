/**
 * Book leaf — one section of prayer-learning content in manuscript layout.
 */

import { MaterialIcons } from '@expo/vector-icons';
import React, { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { BookFrame } from '@/components/prayer/BookFrame';
import { BookOrnament } from '@/components/prayer/BookOrnament';
import { PrayerStepGuide } from '@/components/prayer/PrayerStepGuide';
import { PrayerTextBlock } from '@/components/prayer/PrayerTextBlock';
import { LocalizedText } from '@/components/ui/LocalizedText';
import type { PashtoFontFamily } from '@/constants/theme';
import { BorderRadius, PashtoFonts, Spacing, Typography } from '@/constants/theme';
import { useApp } from '@/context/AppContext';
import { backIconName, forwardChevronName, rowStyle } from '@/utils/i18n/direction';
import { useI18n } from '@/utils/i18n/useI18n';

export interface PrayerSection {
  id: string;
  title_dari: string;
  title_pashto: string;
  content_dari?: string;
  content_pashto?: string;
  items?: Array<{
    number?: number;
    dari?: string;
    pashto?: string;
    english?: string;
    arabic?: string;
  }>;
  steps?: Array<Record<string, unknown>>;
  steps_dari?: string[];
  steps_pashto?: string[];
  examples_dari?: string[];
  examples_pashto?: string[];
  conditions_dari?: string[];
  conditions_pashto?: string[];
  arabic?: string;
  translation_dari?: string;
  translation_pashto?: string;
  instruction_dari?: string;
  instruction_pashto?: string;
  prayers?: Array<{
    name_dari?: string;
    name_pashto?: string;
    fardh?: number;
    sunnah_before?: number;
    sunnah_after?: number;
    witr?: number;
    total?: number;
    notes_dari?: string;
    notes_pashto?: string;
  }>;
  qunoot_arabic?: string;
  qunoot_dari?: string;
  qunoot_pashto?: string;
  for_adult?: { arabic?: string; translation_dari?: string; translation_pashto?: string };
  for_child?: { arabic?: string; translation_dari?: string; translation_pashto?: string };
  response_arabic?: string;
  response_dari?: string;
  response_pashto?: string;
}

interface BookLeafProps {
  categoryId: string;
  section: PrayerSection;
  sectionIndex: number;
  sectionCount: number;
  onBack: () => void;
  onPrevious: () => void;
  onNext: () => void;
  onJumpSection?: (sectionId: string) => void;
}

function normalizeStringSteps(
  steps: string[],
): Array<{ number: number; dari: string; pashto: string; english: string }> {
  return steps.map((text, index) => ({
    number: index + 1,
    dari: text,
    pashto: text,
    english: text,
  }));
}

export function BookLeaf({
  categoryId,
  section,
  sectionIndex,
  sectionCount,
  onBack,
  onPrevious,
  onNext,
  onJumpSection,
}: BookLeafProps) {
  const { theme, state } = useApp();
  const { t, content, contentList, language, fontFamily } = useI18n();
  const chevron = forwardChevronName(language);
  const backIcon = backIconName(language);
  const directionalRow = rowStyle(language);
  const isRtl = language !== 'english';
  const pashtoFontFamily = PashtoFonts[state.preferences.pashtoFont as PashtoFontFamily]?.name || 'Amiri';
  const titleFont = language === 'pashto' ? pashtoFontFamily : 'Vazirmatn-Bold';
  const bodyFont = language === 'pashto' ? pashtoFontFamily : fontFamily || 'Vazirmatn';
  const bodyLineHeight = language === 'pashto' ? 42 : 30;
  const itemLineHeight = language === 'pashto' ? 38 : 26;
  const textAlign = isRtl ? 'right' : 'left';
  const writingDirection = isRtl ? 'rtl' : 'ltr';

  const bodyText = content(section, 'content');
  const stringSteps = contentList(section, 'steps');
  const conditions = contentList(section, 'conditions');
  const examples = contentList(section, 'examples');

  const structuredSteps = useMemo(() => {
    if (section.steps && section.steps.length > 0) {
      return section.steps as Array<Record<string, unknown>>;
    }
    if (stringSteps.length > 0) {
      return normalizeStringSteps(stringSteps);
    }
    return [];
  }, [section.steps, stringSteps]);

  const hasPrev = sectionIndex > 0;
  const hasNext = sectionIndex < sectionCount - 1;

  return (
    <BookFrame>
      <Pressable onPress={onBack} hitSlop={10} style={[styles.backRow, directionalRow]}>
        <MaterialIcons name={backIcon} size={22} color={theme.tint} />
        <LocalizedText style={[styles.backLabel, { color: theme.tint, fontFamily: bodyFont }]}>
          {t('prayerLearning.backToChapter')}
        </LocalizedText>
      </Pressable>

      <View style={styles.header}>
        <LocalizedText
          preserveFontFamily
          style={[styles.leafTitle, { color: theme.text, fontFamily: titleFont }]}
        >
          {content(section, 'title')}
        </LocalizedText>
        <BookOrnament />
      </View>

      {bodyText ? (
        <LocalizedText
          style={[
            styles.body,
            {
              color: theme.text,
              fontFamily: bodyFont,
              lineHeight: bodyLineHeight,
              textAlign,
              writingDirection,
            },
          ]}
        >
          {bodyText}
        </LocalizedText>
      ) : null}

      {section.items && section.items.length > 0 ? (
        <View style={styles.listBlock}>
          {section.items.map((item, index) => (
            <View
              key={index}
              style={[styles.listRow, directionalRow, { borderBottomColor: theme.divider }]}
            >
              <View style={[styles.listNumber, { borderColor: theme.accent }]}>
                <LocalizedText style={[styles.listNumberText, { color: theme.accent }]}>
                  {item.number ?? index + 1}
                </LocalizedText>
              </View>
              <LocalizedText
                style={[
                  styles.listText,
                  {
                    color: theme.text,
                    fontFamily: bodyFont,
                    lineHeight: itemLineHeight,
                    textAlign,
                    writingDirection,
                  },
                ]}
              >
                {content(item, null)}
              </LocalizedText>
            </View>
          ))}
        </View>
      ) : null}

      {conditions.length > 0 ? (
        <View style={styles.listBlock}>
          <LocalizedText
            style={[styles.subheading, { color: theme.accent, fontFamily: titleFont, textAlign }]}
          >
            {t('prayerLearning.conditions')}
          </LocalizedText>
          {conditions.map((line, index) => (
            <View
              key={index}
              style={[styles.listRow, directionalRow, { borderBottomColor: theme.divider }]}
            >
              <View style={[styles.listNumber, { borderColor: theme.accent }]}>
                <LocalizedText style={[styles.listNumberText, { color: theme.accent }]}>
                  {index + 1}
                </LocalizedText>
              </View>
              <LocalizedText
                style={[
                  styles.listText,
                  {
                    color: theme.text,
                    fontFamily: bodyFont,
                    lineHeight: itemLineHeight,
                    textAlign,
                    writingDirection,
                  },
                ]}
              >
                {line}
              </LocalizedText>
            </View>
          ))}
        </View>
      ) : null}

      {examples.length > 0 ? (
        <View style={styles.listBlock}>
          {examples.map((line, index) => (
            <View
              key={index}
              style={[styles.listRow, directionalRow, { borderBottomColor: theme.divider }]}
            >
              <View style={[styles.listNumber, { borderColor: theme.accent }]}>
                <LocalizedText style={[styles.listNumberText, { color: theme.accent }]}>
                  {index + 1}
                </LocalizedText>
              </View>
              <LocalizedText
                style={[
                  styles.listText,
                  {
                    color: theme.text,
                    fontFamily: bodyFont,
                    lineHeight: itemLineHeight,
                    textAlign,
                    writingDirection,
                  },
                ]}
              >
                {line}
              </LocalizedText>
            </View>
          ))}
        </View>
      ) : null}

      {structuredSteps.length > 0 ? (
        <PrayerStepGuide steps={structuredSteps as never} />
      ) : null}

      {categoryId === 'janazah' && section.id === 'janazah_method' && onJumpSection ? (
        <Pressable
          onPress={() => onJumpSection('janazah_dua')}
          style={({ pressed }) => [
            styles.refLink,
            directionalRow,
            { borderColor: theme.accent },
            pressed && styles.pressed,
          ]}
        >
          <LocalizedText style={[styles.refLinkText, { color: theme.tint, fontFamily: bodyFont }]}>
            {t('prayerLearning.janazahDua')}
          </LocalizedText>
          <MaterialIcons name={chevron} size={18} color={theme.tint} />
        </Pressable>
      ) : null}

      {section.arabic ? <PrayerTextBlock arabic={section.arabic} source={section} /> : null}

      {section.prayers && section.prayers.length > 0 ? (
        <View style={[styles.table, { borderColor: theme.accent }]}>
          <View style={[styles.tableHeader, directionalRow, { backgroundColor: `${theme.accent}18` }]}>
            <LocalizedText style={[styles.tableCellName, styles.tableHead, { color: theme.text }]}>
              {' '}
            </LocalizedText>
            <LocalizedText style={[styles.tableCell, styles.tableHead, { color: theme.accent }]}>
              {t('prayerLearning.fardhShort')}
            </LocalizedText>
            <LocalizedText style={[styles.tableCell, styles.tableHead, { color: theme.accent }]}>
              {t('prayerLearning.sunnahBeforeShort')}
            </LocalizedText>
            <LocalizedText style={[styles.tableCell, styles.tableHead, { color: theme.accent }]}>
              {t('prayerLearning.sunnahAfterShort')}
            </LocalizedText>
            <LocalizedText style={[styles.tableCell, styles.tableHead, { color: theme.accent }]}>
              {t('prayerLearning.witrShort')}
            </LocalizedText>
            <LocalizedText style={[styles.tableCell, styles.tableHead, { color: theme.accent }]}>
              {t('prayerLearning.totalShort')}
            </LocalizedText>
          </View>
          {section.prayers.map((prayer, index) => (
            <View key={index}>
              <View
                style={[
                  styles.tableRow,
                  directionalRow,
                  { borderTopColor: theme.divider },
                ]}
              >
                <LocalizedText
                  style={[
                    styles.tableCellName,
                    {
                      color: theme.text,
                      fontFamily: bodyFont,
                      textAlign,
                      writingDirection,
                    },
                  ]}
                >
                  {content(prayer, 'name')}
                </LocalizedText>
                <LocalizedText style={[styles.tableCell, { color: theme.text }]}>
                  {prayer.fardh ?? '—'}
                </LocalizedText>
                <LocalizedText style={[styles.tableCell, { color: theme.text }]}>
                  {prayer.sunnah_before ? prayer.sunnah_before : '—'}
                </LocalizedText>
                <LocalizedText style={[styles.tableCell, { color: theme.text }]}>
                  {prayer.sunnah_after ? prayer.sunnah_after : '—'}
                </LocalizedText>
                <LocalizedText style={[styles.tableCell, { color: theme.text }]}>
                  {prayer.witr ? prayer.witr : '—'}
                </LocalizedText>
                <LocalizedText style={[styles.tableCell, styles.tableTotal, { color: theme.tint }]}>
                  {prayer.total ?? '—'}
                </LocalizedText>
              </View>
              {content(prayer, 'notes') ? (
                <LocalizedText
                  style={[
                    styles.tableNotes,
                    {
                      color: theme.textSecondary,
                      fontFamily: bodyFont,
                      textAlign,
                      writingDirection,
                    },
                  ]}
                >
                  {content(prayer, 'notes')}
                </LocalizedText>
              ) : null}
            </View>
          ))}
        </View>
      ) : null}

      {section.qunoot_arabic ? (
        <View style={styles.block}>
          <LocalizedText
            style={[styles.subheading, { color: theme.accent, fontFamily: titleFont, textAlign: 'center' }]}
          >
            {t('prayerLearning.qunootDua')}
          </LocalizedText>
          <PrayerTextBlock
            arabic={section.qunoot_arabic}
            source={section}
            translationField="qunoot"
          />
        </View>
      ) : null}

      {section.for_adult ? (
        <View style={styles.block}>
          <LocalizedText
            style={[styles.subheading, { color: theme.accent, fontFamily: titleFont, textAlign: 'center' }]}
          >
            {t('prayerLearning.adultDua')}
          </LocalizedText>
          <PrayerTextBlock arabic={section.for_adult.arabic} source={section.for_adult} />

          {section.for_child ? (
            <>
              <LocalizedText
                style={[
                  styles.subheading,
                  {
                    color: theme.accent,
                    fontFamily: titleFont,
                    textAlign: 'center',
                    marginTop: Spacing.md,
                  },
                ]}
              >
                {t('prayerLearning.childDua')}
              </LocalizedText>
              <PrayerTextBlock arabic={section.for_child.arabic} source={section.for_child} />
            </>
          ) : null}
        </View>
      ) : null}

      {section.response_arabic ? (
        <View style={styles.block}>
          <LocalizedText
            style={[
              styles.subheading,
              {
                color: theme.textSecondary,
                fontFamily: bodyFont,
                textAlign: 'center',
              },
            ]}
          >
            {t('prayerLearning.respondent')}
          </LocalizedText>
          <PrayerTextBlock
            arabic={section.response_arabic}
            source={section}
            translationField="response"
          />
        </View>
      ) : null}

      <View style={[styles.leafNav, directionalRow]}>
        <Pressable
          onPress={onPrevious}
          disabled={!hasPrev}
          style={({ pressed }) => [
            styles.navButton,
            directionalRow,
            {
              borderColor: theme.cardBorder,
              opacity: !hasPrev ? 0.35 : pressed ? 0.7 : 1,
            },
          ]}
        >
          <MaterialIcons name={backIcon} size={18} color={theme.tint} />
          <LocalizedText style={[styles.navLabel, { color: theme.tint }]}>
            {t('prayerLearning.previous')}
          </LocalizedText>
        </Pressable>

        <LocalizedText style={[styles.pageIndicator, { color: theme.textSecondary }]}>
          {sectionIndex + 1} / {sectionCount}
        </LocalizedText>

        <Pressable
          onPress={onNext}
          disabled={!hasNext}
          style={({ pressed }) => [
            styles.navButton,
            directionalRow,
            {
              borderColor: theme.cardBorder,
              opacity: !hasNext ? 0.35 : pressed ? 0.7 : 1,
            },
          ]}
        >
          <LocalizedText style={[styles.navLabel, { color: theme.tint }]}>
            {t('prayerLearning.next')}
          </LocalizedText>
          <MaterialIcons name={chevron} size={18} color={theme.tint} />
        </Pressable>
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
  leafTitle: {
    fontSize: Typography.ui.title,
    fontWeight: '700',
    textAlign: 'center',
  },
  body: {
    fontSize: Typography.ui.body,
    marginBottom: Spacing.md,
    includeFontPadding: false,
  },
  listBlock: {
    marginBottom: Spacing.md,
  },
  listRow: {
    alignItems: 'flex-start',
    paddingVertical: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: Spacing.sm,
  },
  listNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  listNumberText: {
    fontSize: Typography.ui.caption,
    fontWeight: '700',
  },
  listText: {
    flex: 1,
    fontSize: Typography.ui.body,
    includeFontPadding: false,
  },
  subheading: {
    fontSize: Typography.ui.subtitle,
    fontWeight: '600',
    marginBottom: Spacing.sm,
  },
  refLink: {
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    borderStyle: 'dashed',
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  refLinkText: {
    flex: 1,
    fontSize: Typography.ui.body,
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.75,
  },
  table: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
    marginBottom: Spacing.md,
  },
  tableHeader: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.xs,
  },
  tableRow: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.xs,
    borderTopWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
  },
  tableHead: {
    fontWeight: '700',
    fontSize: 10,
  },
  tableCellName: {
    flex: 1.4,
    fontSize: Typography.ui.caption,
    fontWeight: '600',
    paddingHorizontal: 2,
  },
  tableCell: {
    flex: 0.7,
    fontSize: Typography.ui.caption,
    textAlign: 'center',
  },
  tableTotal: {
    fontWeight: '700',
  },
  tableNotes: {
    fontSize: Typography.ui.caption,
    fontStyle: 'italic',
    paddingHorizontal: Spacing.sm,
    paddingBottom: Spacing.sm,
  },
  block: {
    marginBottom: Spacing.sm,
  },
  leafNav: {
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.md,
    gap: Spacing.sm,
  },
  navButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    borderWidth: 1,
    borderRadius: BorderRadius.md,
  },
  navLabel: {
    fontSize: Typography.ui.body,
    fontWeight: '600',
  },
  pageIndicator: {
    fontSize: Typography.ui.caption,
    fontWeight: '600',
    minWidth: 48,
    textAlign: 'center',
  },
});

export default BookLeaf;
