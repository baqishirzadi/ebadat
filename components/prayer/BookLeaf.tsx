/**
 * Book leaf — centered lesson page, text-only navigation, no icons.
 */

import React, { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { BookFrame } from '@/components/prayer/BookFrame';
import { BookOrnament } from '@/components/prayer/BookOrnament';
import { PrayerStepGuide } from '@/components/prayer/PrayerStepGuide';
import { PrayerTextBlock } from '@/components/prayer/PrayerTextBlock';
import { LocalizedText } from '@/components/ui/LocalizedText';
import { BorderRadius, Spacing, Typography } from '@/constants/theme';
import { useApp } from '@/context/AppContext';
import { getPashtoBoldFontFamily, getPashtoFontFamily } from '@/hooks/useFonts';
import { useI18n } from '@/utils/i18n/useI18n';
import { resolveContent } from '@/utils/i18n/content';
import { APP_LANGUAGES } from '@/utils/i18n/languages';

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
    turkish?: string;
    meaningArabic?: string;
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
  stepIndex: number;
  onJumpSection?: (sectionId: string) => void;
}

/** Structured `steps` win; otherwise the localized string-step list. */
export function lessonStepCount(section: PrayerSection, stringStepCount: number): number {
  if (section.steps && section.steps.length > 0) return section.steps.length;
  return stringStepCount;
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
  stepIndex,
  onJumpSection,
}: BookLeafProps) {
  const { theme, state } = useApp();
  const { t, content, contentList, language, fontFamily, isLatin } = useI18n();
  const pashtoFont = state.preferences.pashtoFont;
  const titleFont = language === 'pashto' ? getPashtoBoldFontFamily(pashtoFont) : isLatin ? undefined : 'Vazirmatn-Bold';
  const bodyFont = language === 'pashto' ? getPashtoFontFamily(pashtoFont) : isLatin ? undefined : fontFamily || 'Vazirmatn';
  const bodyLineHeight = language === 'pashto' ? 42 : 32;
  const itemLineHeight = language === 'pashto' ? 38 : 28;

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

  const renderStatChip = (label: string, value: number | undefined) => {
    if (value == null || value <= 0) return null;
    return (
      <View style={[styles.statChip, { borderColor: theme.accent, backgroundColor: `${theme.accent}12` }]}>
        <LocalizedText style={[styles.statValue, { color: theme.tint }]}>{value}</LocalizedText>
        <LocalizedText style={[styles.statLabel, { color: theme.textSecondary }]}>{label}</LocalizedText>
      </View>
    );
  };

  const renderNumberedList = (lines: string[]) =>
    lines.map((line, index) => (
      <View key={index} style={[styles.listBlock, { borderBottomColor: theme.divider }]}>
        <LocalizedText style={[styles.listNumber, { color: theme.accent }]}>
          {index + 1}
        </LocalizedText>
        <LocalizedText
          style={[
            styles.listText,
            { color: theme.text, fontFamily: bodyFont, lineHeight: itemLineHeight },
          ]}
        >
          {line}
        </LocalizedText>
      </View>
    ));

  return (
    <BookFrame>
      <View style={styles.header}>
        <LocalizedText
          preserveFontFamily
          style={[styles.leafTitle, { color: theme.text, fontFamily: titleFont }]}
        >
          {content(section, 'title')}
        </LocalizedText>
        <BookOrnament width={120} />
      </View>

      {bodyText ? (
        <LocalizedText
          style={[
            styles.body,
            { color: theme.text, fontFamily: bodyFont, lineHeight: bodyLineHeight },
          ]}
        >
          {bodyText}
        </LocalizedText>
      ) : null}

      {section.items && section.items.length > 0 ? (
        <View style={styles.listSection}>
          {section.items.map((item, index) => (
            <View key={index} style={[styles.listBlock, { borderBottomColor: theme.divider }]}>
              <LocalizedText style={[styles.listNumber, { color: theme.accent }]}>
                {item.number ?? index + 1}
              </LocalizedText>
              <LocalizedText
                style={[
                  styles.listText,
                  { color: theme.text, fontFamily: bodyFont, lineHeight: itemLineHeight },
                ]}
              >
                {(() => {
                  const resolved = language === 'arabic' && item.meaningArabic
                    ? { text: item.meaningArabic, language: 'arabic' as const }
                    : resolveContent(item, null, language);
                  if (!resolved) return null;
                  return (
                    <>
                      {resolved.language !== language ? (
                        <LocalizedText style={{ color: theme.accent, fontSize: 12 }}>
                          {APP_LANGUAGES[resolved.language].nativeLabel}
                        </LocalizedText>
                      ) : null}
                      {resolved.text}
                    </>
                  );
                })()}
              </LocalizedText>
            </View>
          ))}
        </View>
      ) : null}

      {conditions.length > 0 ? (
        <View style={styles.listSection}>
          <LocalizedText style={[styles.subheading, { color: theme.accent, fontFamily: titleFont }]}>
            {t('prayerLearning.conditions')}
          </LocalizedText>
          {renderNumberedList(conditions)}
        </View>
      ) : null}

      {examples.length > 0 ? (
        <View style={styles.listSection}>{renderNumberedList(examples)}</View>
      ) : null}

      {structuredSteps.length > 0 ? (
        <PrayerStepGuide steps={structuredSteps as never} index={stepIndex} />
      ) : null}

      {categoryId === 'janazah' && section.id === 'janazah_method' && onJumpSection ? (
        <Pressable
          onPress={() => onJumpSection('janazah_dua')}
          style={({ pressed }) => [
            styles.refLink,
            { borderColor: theme.accent },
            pressed && styles.pressed,
          ]}
        >
          <LocalizedText style={[styles.refLinkText, { color: theme.tint, fontFamily: bodyFont }]}>
            {t('prayerLearning.janazahDua')}
          </LocalizedText>
        </Pressable>
      ) : null}

      {section.arabic ? <PrayerTextBlock arabic={section.arabic} source={section} /> : null}

      {section.prayers && section.prayers.length > 0 ? (
        <View style={styles.prayerList}>
          {section.prayers.map((prayer, index) => (
            <View
              key={index}
              style={[
                styles.prayerCard,
                { borderColor: `${theme.accent}66`, backgroundColor: theme.card },
              ]}
            >
              <LocalizedText
                style={[styles.prayerName, { color: theme.text, fontFamily: titleFont }]}
              >
                {content(prayer, 'name')}
              </LocalizedText>
              <View style={styles.statRow}>
                {renderStatChip(t('prayerLearning.fardhShort'), prayer.fardh)}
                {renderStatChip(t('prayerLearning.sunnahBeforeShort'), prayer.sunnah_before)}
                {renderStatChip(t('prayerLearning.sunnahAfterShort'), prayer.sunnah_after)}
                {renderStatChip(t('prayerLearning.witrShort'), prayer.witr)}
                {renderStatChip(t('prayerLearning.totalShort'), prayer.total)}
              </View>
              {content(prayer, 'notes') ? (
                <LocalizedText
                  style={[
                    styles.prayerNotes,
                    { color: theme.textSecondary, fontFamily: bodyFont },
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
          <LocalizedText style={[styles.subheading, { color: theme.accent, fontFamily: titleFont }]}>
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
          <LocalizedText style={[styles.subheading, { color: theme.accent, fontFamily: titleFont }]}>
            {t('prayerLearning.adultDua')}
          </LocalizedText>
          <PrayerTextBlock arabic={section.for_adult.arabic} source={section.for_adult} />

          {section.for_child ? (
            <>
              <LocalizedText
                style={[
                  styles.subheading,
                  { color: theme.accent, fontFamily: titleFont, marginTop: Spacing.md },
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
            style={[styles.subheading, { color: theme.textSecondary, fontFamily: bodyFont }]}
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

    </BookFrame>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  leafTitle: {
    fontSize: Typography.ui.heading,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  body: {
    fontSize: Typography.ui.body,
    marginBottom: Spacing.lg,
    textAlign: 'center',
    includeFontPadding: false,
  },
  listSection: {
    marginBottom: Spacing.lg,
  },
  listBlock: {
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: Spacing.xs,
  },
  listNumber: {
    fontSize: Typography.ui.subtitle,
    fontWeight: '700',
    textAlign: 'center',
  },
  listText: {
    fontSize: Typography.ui.body,
    textAlign: 'center',
    includeFontPadding: false,
  },
  subheading: {
    fontSize: Typography.ui.subtitle,
    fontWeight: '700',
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  refLink: {
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    borderStyle: 'dashed',
    marginBottom: Spacing.md,
  },
  refLinkText: {
    fontSize: Typography.ui.body,
    fontWeight: '600',
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.75,
  },
  prayerList: {
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  prayerCard: {
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    alignItems: 'center',
  },
  prayerName: {
    fontSize: Typography.ui.subtitle,
    fontWeight: '700',
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  statRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  statChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
  },
  statValue: {
    fontSize: Typography.ui.subtitle,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: Typography.ui.caption,
    textAlign: 'center',
  },
  prayerNotes: {
    fontSize: Typography.ui.caption,
    fontStyle: 'italic',
    marginTop: Spacing.sm,
    lineHeight: 22,
    textAlign: 'center',
  },
  block: {
    marginBottom: Spacing.sm,
    alignItems: 'stretch',
  },
});

export default BookLeaf;
