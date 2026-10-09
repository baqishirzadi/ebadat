/**
 * Reading settings ("Aa") sheet: text size, line spacing and page colour,
 * with a live preview in the article's language.
 */

import React from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View, type TextStyle } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ArticleText, useArticleUsesNastaliq } from '@/components/articles/ArticleText';
import { withAlpha } from '@/components/articles/articleTheme';
import { LocalizedText } from '@/components/ui/LocalizedText';
import { useApp } from '@/context/AppContext';
import {
  READER_LINE_SPACING,
  READER_TEXT_SIZES,
  useArticleReaderSettings,
  type ReaderAlign,
  type ReaderLineSpacing,
  type ReaderPage,
  type ReaderTextSize,
} from '@/hooks/useArticleReaderSettings';
import type { ArticleLanguage } from '@/types/articles';
import { directionStyle, writingDirectionFor } from '@/utils/i18n/direction';
import { useI18n } from '@/utils/i18n/useI18n';

interface ReaderSettingsSheetProps {
  visible: boolean;
  onClose: () => void;
  articleLanguage: ArticleLanguage;
  accent: string;
}

const PREVIEW: Record<ArticleLanguage, string> = {
  dari: 'ایمان حیات قلب و آرامش روح است؛ وقتی در دل زنده باشد، زندگی معنا می‌گیرد.',
  pashto: 'ایمان د زړه ژوند او د روح ډاډ دی؛ کله چې په زړه کې ژوندی وي، ژوند مانا پیدا کوي.',
  english: 'Faith is the life of the heart; when it is alive, life takes on meaning.',
  turkish: 'İman kalbin hayatıdır; gönülde diri olduğunda hayat anlam kazanır.',
  arabic: 'الإيمان حياة القلب وطمأنينة الروح؛ إذا حيي في القلب صار للحياة معنى.',
};

const TEXT_SIZES: ReaderTextSize[] = ['s', 'm', 'l', 'xl'];
const SPACINGS: ReaderLineSpacing[] = ['compact', 'normal', 'relaxed'];
const ALIGNS: { id: ReaderAlign; icon: 'format-align-justify' | 'format-align-right' }[] = [
  { id: 'justify', icon: 'format-align-justify' },
  { id: 'start', icon: 'format-align-right' },
];
const PAGES: { id: ReaderPage; swatch: string[]; icon?: 'brightness-auto' }[] = [
  { id: 'auto', swatch: ['#FFFFFF', '#0E1311'], icon: 'brightness-auto' },
  { id: 'light', swatch: ['#FFFFFF'] },
  { id: 'sepia', swatch: ['#F6EFE1'] },
  { id: 'dark', swatch: ['#0E1311'] },
];

export function ReaderSettingsSheet({ visible, onClose, articleLanguage, accent }: ReaderSettingsSheetProps) {
  const insets = useSafeAreaInsets();
  const { theme } = useApp();
  const { t, language } = useI18n();
  const { settings, update, tokens } = useArticleReaderSettings();
  const isNastaliq = useArticleUsesNastaliq(articleLanguage);

  const chromeText: TextStyle = { textAlign: 'auto', writingDirection: writingDirectionFor(language) };
  const ratio = tokens.lineHeightRatio * (isNastaliq ? 1.25 : 1);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.root}>
        <Pressable style={styles.backdrop} onPress={onClose} accessibilityRole="button" accessibilityLabel={t('articles.reader.done')} />
        <View
          testID="article-reader-settings"
          style={[
            styles.sheet,
            directionStyle(language),
            { backgroundColor: theme.card, borderColor: theme.cardBorder, paddingBottom: insets.bottom + 18 },
          ]}
        >
          <View style={[styles.grabber, { backgroundColor: theme.divider }]} />

          <View style={styles.headerRow}>
            <LocalizedText style={[styles.title, chromeText, { color: theme.text }]}>
              {t('articles.reader.settings')}
            </LocalizedText>
            <Pressable testID="article-reader-settings-done" onPress={onClose} hitSlop={10} style={[styles.doneButton, { backgroundColor: withAlpha(accent, 0.12) }]}>
              <LocalizedText style={[styles.doneText, { color: accent }]}>{t('articles.reader.done')}</LocalizedText>
            </Pressable>
          </View>

          <ScrollView bounces={false} showsVerticalScrollIndicator={false}>
            <View style={[styles.preview, { backgroundColor: tokens.page, borderColor: tokens.border }]}>
              <ArticleText
                language={articleLanguage}
                align={settings.align}
                style={{ fontSize: tokens.fontSize, lineHeight: Math.round(tokens.fontSize * ratio), color: tokens.text }}
              >
                {PREVIEW[articleLanguage]}
              </ArticleText>
            </View>

            <LocalizedText style={[styles.sectionLabel, chromeText, { color: theme.textSecondary }]}>
              {t('articles.reader.textSize')}
            </LocalizedText>
            <View style={[styles.segmented, { backgroundColor: theme.backgroundSecondary }]}>
              {TEXT_SIZES.map((size) => {
                const selected = settings.textSize === size;
                return (
                  <Pressable
                    key={size}
                    testID={`article-reader-size-${size}`}
                    onPress={() => update({ textSize: size })}
                    style={[styles.segment, selected && [styles.segmentSelected, { backgroundColor: theme.card }]]}
                  >
                    <ArticleText
                      language={articleLanguage}
                      align="center"
                      style={{
                        fontSize: READER_TEXT_SIZES[size] - 3,
                        lineHeight: Math.round((READER_TEXT_SIZES[size] - 3) * 1.7),
                        color: selected ? accent : theme.textSecondary,
                        fontWeight: selected ? '700' : '400',
                      }}
                    >
                      آ
                    </ArticleText>
                  </Pressable>
                );
              })}
            </View>

            <LocalizedText style={[styles.sectionLabel, chromeText, { color: theme.textSecondary }]}>
              {t('articles.reader.lineSpacing')}
            </LocalizedText>
            <View style={[styles.segmented, { backgroundColor: theme.backgroundSecondary }]}>
              {SPACINGS.map((spacing) => {
                const selected = settings.lineSpacing === spacing;
                return (
                  <Pressable
                    key={spacing}
                    onPress={() => update({ lineSpacing: spacing })}
                    style={[styles.segment, selected && [styles.segmentSelected, { backgroundColor: theme.card }]]}
                  >
                    <SpacingGlyph gap={READER_LINE_SPACING[spacing]} color={selected ? accent : theme.textSecondary} />
                    <LocalizedText style={[styles.segmentLabel, { color: selected ? accent : theme.textSecondary }]}>
                      {t(`articles.reader.spacing.${spacing}`)}
                    </LocalizedText>
                  </Pressable>
                );
              })}
            </View>

            <LocalizedText style={[styles.sectionLabel, chromeText, { color: theme.textSecondary }]}>
              {t('articles.reader.align')}
            </LocalizedText>
            <View style={[styles.segmented, { backgroundColor: theme.backgroundSecondary }]}>
              {ALIGNS.map((option) => {
                const selected = settings.align === option.id;
                return (
                  <Pressable
                    key={option.id}
                    testID={`article-reader-align-${option.id}`}
                    onPress={() => update({ align: option.id })}
                    style={[styles.segment, styles.segmentRow, selected && [styles.segmentSelected, { backgroundColor: theme.card }]]}
                  >
                    <MaterialIcons name={option.icon} size={18} color={selected ? accent : theme.textSecondary} />
                    <LocalizedText style={[styles.segmentLabel, { color: selected ? accent : theme.textSecondary }]}>
                      {t(`articles.reader.align.${option.id}`)}
                    </LocalizedText>
                  </Pressable>
                );
              })}
            </View>

            <LocalizedText style={[styles.sectionLabel, chromeText, { color: theme.textSecondary }]}>
              {t('articles.reader.page')}
            </LocalizedText>
            <View style={styles.pageRow}>
              {PAGES.map((page) => {
                const selected = settings.page === page.id;
                return (
                  <Pressable
                    key={page.id}
                    testID={`article-reader-page-${page.id}`}
                    onPress={() => update({ page: page.id })}
                    style={styles.pageOption}
                  >
                    <View
                      style={[
                        styles.swatchRing,
                        { borderColor: selected ? accent : 'transparent' },
                      ]}
                    >
                      <View style={[styles.swatch, { borderColor: theme.cardBorder }]}>
                        {page.swatch.map((color) => (
                          <View key={color} style={[styles.swatchHalf, { backgroundColor: color }]} />
                        ))}
                        {page.icon ? (
                          <View style={styles.swatchIcon}>
                            <MaterialIcons name={page.icon} size={18} color={accent} />
                          </View>
                        ) : null}
                      </View>
                    </View>
                    <LocalizedText style={[styles.pageLabel, { color: selected ? accent : theme.textSecondary }]}>
                      {t(`articles.reader.page.${page.id}`)}
                    </LocalizedText>
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function SpacingGlyph({ gap, color }: { gap: number; color: string }) {
  const spacing = Math.round((gap - 1.5) * 8);
  return (
    <View style={[styles.spacingGlyph, { gap: spacing }]}>
      {[0, 1, 2].map((line) => (
        <View key={line} style={[styles.spacingLine, { backgroundColor: color, width: line === 2 ? 12 : 18 }]} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  sheet: {
    maxHeight: '90%',
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  grabber: {
    alignSelf: 'center',
    width: 40,
    height: 5,
    borderRadius: 3,
    marginBottom: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  title: {
    flex: 1,
    fontSize: 18,
    lineHeight: 28,
    fontWeight: '700',
  },
  doneButton: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 999,
  },
  doneText: {
    fontSize: 14,
    lineHeight: 22,
    fontWeight: '700',
    textAlign: 'center',
  },
  preview: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 6,
  },
  sectionLabel: {
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '700',
    marginTop: 14,
    marginBottom: 8,
  },
  segmented: {
    flexDirection: 'row',
    borderRadius: 14,
    padding: 4,
    gap: 4,
  },
  segment: {
    flex: 1,
    minHeight: 46,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 6,
  },
  segmentRow: {
    flexDirection: 'row',
    gap: 8,
  },
  segmentSelected: {
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  segmentLabel: {
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  spacingGlyph: {
    alignItems: 'flex-start',
  },
  spacingLine: {
    height: 2,
    borderRadius: 1,
  },
  pageRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  pageOption: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  swatchRing: {
    borderWidth: 2,
    borderRadius: 30,
    padding: 3,
  },
  swatch: {
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: 1,
    overflow: 'hidden',
    flexDirection: 'row',
  },
  swatchHalf: {
    flex: 1,
  },
  swatchIcon: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pageLabel: {
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
});
