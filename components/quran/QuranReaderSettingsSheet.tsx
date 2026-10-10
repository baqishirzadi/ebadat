import React from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { LocalizedText } from '@/components/ui/LocalizedText';
import { HifzFonts, QuranFonts, Typography, type HifzFontFamily, type QuranFontFamily } from '@/constants/theme';
import { useApp } from '@/context/AppContext';
import { getHifzFontFamily, getQuranFontFamily } from '@/hooks/useFonts';
import { useQuranReaderSettings, type QuranLineSpacing, type QuranPageTone } from '@/hooks/useQuranReaderSettings';
import type { UiMessageKey } from '@/utils/i18n/catalog';
import { useI18n } from '@/utils/i18n/useI18n';
import { QuranText } from './QuranText';

interface QuranReaderSettingsSheetProps {
  visible: boolean;
  onClose: () => void;
  /** Hide controls that cannot change the fixed 16-line Hafiz page geometry. */
  fixedMushaf?: boolean;
}

const FONT_SIZES = ['small', 'medium', 'large', 'xlarge'] as const;
const SPACINGS: QuranLineSpacing[] = ['compact', 'normal', 'relaxed'];
const PAGE_TONES: { id: QuranPageTone; colors: string[] }[] = [
  { id: 'auto', colors: ['#FFFFFF', '#0E1311'] },
  { id: 'light', colors: ['#FFFFFF'] },
  { id: 'sepia', colors: ['#F6EFE1'] },
  { id: 'dark', colors: ['#0E1311'] },
];
const TRANSLATIONS = ['none', 'dari', 'pashto', 'turkish', 'english'] as const;
const HIFZ_FONT_LABELS: Record<HifzFontFamily, UiMessageKey> = {
  amiriQuran: 'quran.reader.hifzFont.amiriQuran',
  scheherazade: 'quran.reader.hifzFont.scheherazade',
};
const BISMILLAH = 'بِسْمِ اللّٰهِ الرَّحْمٰنِ الرَّحِيْمِ';
const FONT_SAMPLE = 'بِسْمِ اللَّهِ';

export function QuranReaderSettingsSheet({ visible, onClose, fixedMushaf = false }: QuranReaderSettingsSheetProps) {
  const insets = useSafeAreaInsets();
  const { theme, state, setArabicFontSize, setHifzFont, setQuranFont, setTranslationLanguage } = useApp();
  const { t, isLatin } = useI18n();
  const { settings, update, tokens } = useQuranReaderSettings();
  const selectedSize = state.preferences.arabicFontSize;
  const sizeIndex = FONT_SIZES.indexOf(selectedSize);

  const changeFontSize = (delta: number) => {
    const next = Math.max(0, Math.min(FONT_SIZES.length - 1, sizeIndex + delta));
    setArabicFontSize(FONT_SIZES[next]);
  };

  const fontOptions = Object.entries(QuranFonts) as [QuranFontFamily, (typeof QuranFonts)[QuranFontFamily]][];
  const hifzFontOptions = Object.keys(HifzFonts) as HifzFontFamily[];

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.root}>
        <Pressable
          style={styles.backdrop}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel={t('quran.reader.done')}
        />
        <View
          testID="quran-reader-settings-sheet"
          style={[
            styles.sheet,
            {
              backgroundColor: theme.card,
              borderColor: theme.cardBorder,
              paddingBottom: insets.bottom + 16,
            },
          ]}
        >
          <View style={[styles.grabber, { backgroundColor: theme.divider }]} />
          <View style={styles.header}>
            <LocalizedText style={[styles.title, { color: theme.text }]}>
              {t(fixedMushaf ? 'quran.reader.hifzSettings' : 'quran.reader.settings')}
            </LocalizedText>
            <Pressable
              testID="quran-reader-settings-done"
              onPress={onClose}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel={t('quran.reader.done')}
              style={styles.iconButton}
            >
              <MaterialIcons name="close" size={22} color={theme.text} />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {fixedMushaf ? <>
            <View style={[styles.preview, { backgroundColor: tokens.page, borderColor: tokens.border }]}>
              <QuranText
                allowFontScaling={false}
                style={{
                  color: tokens.arabic,
                  fontFamily: getHifzFontFamily(state.preferences.hifzFont),
                  fontSize: 22,
                  lineHeight: Math.round(22 * 2.6),
                  width: '100%',
                  textAlign: 'center',
                  writingDirection: 'rtl',
                  includeFontPadding: true,
                  paddingVertical: 8,
                }}
              >
                {BISMILLAH}
              </QuranText>
            </View>
            <SettingLabel>{t('quran.reader.font')}</SettingLabel>
            <View style={styles.fontRow}>
              {hifzFontOptions.map((font) => {
                const selected = state.preferences.hifzFont === font;
                return (
                  <Pressable
                    key={font}
                    testID={`quran-reader-hifz-font-${font}`}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    onPress={() => setHifzFont(font)}
                    style={[
                      styles.fontOption,
                      { borderColor: selected ? theme.tint : theme.cardBorder, backgroundColor: selected ? theme.backgroundSecondary : 'transparent' },
                    ]}
                  >
                    <QuranText
                      allowFontScaling={false}
                      style={[styles.fontSample, { color: theme.text, fontFamily: getHifzFontFamily(font) }]}
                    >
                      {FONT_SAMPLE}
                    </QuranText>
                    <LocalizedText style={[styles.fontName, { color: selected ? theme.tint : theme.textSecondary }]}>
                      {t(HIFZ_FONT_LABELS[font])}
                    </LocalizedText>
                  </Pressable>
                );
              })}
            </View>
            </> : null}
            {!fixedMushaf ? <>
            <View style={[styles.preview, { backgroundColor: tokens.page, borderColor: tokens.border }]}>
              <QuranText
                allowFontScaling={false}
                style={{
                  color: tokens.arabic,
                  fontFamily: getQuranFontFamily(state.preferences.quranFont),
                  fontSize: Typography.arabic[selectedSize],
                  lineHeight: Math.round(Typography.arabic[selectedSize] * 2.6),
                  width: '100%',
                  textAlign: 'center',
                  writingDirection: 'rtl',
                  includeFontPadding: true,
                  paddingVertical: 8,
                }}
              >
                {BISMILLAH}
              </QuranText>
            </View>

            <SettingLabel>{t('quran.reader.textSize')}</SettingLabel>
            <View style={[styles.sizeControl, { backgroundColor: theme.backgroundSecondary }]}>
              <Pressable
                testID="quran-reader-size-decrease"
                accessibilityRole="button"
                accessibilityLabel={t('quran.reader.decrease')}
                disabled={sizeIndex === 0}
                onPress={() => changeFontSize(-1)}
                style={styles.sizeButton}
              >
                <MaterialIcons name="text-decrease" size={23} color={sizeIndex === 0 ? theme.divider : theme.tint} />
              </Pressable>
              <View style={styles.sizeValue}>
                <LocalizedText style={[styles.sizeName, { color: theme.text }]}>
                  {t(`quran.reader.size.${selectedSize}`)}
                </LocalizedText>
                <LocalizedText style={[styles.sizePixels, { color: theme.textSecondary }]}>
                  {`${Typography.arabic[selectedSize]}px`}
                </LocalizedText>
              </View>
              <Pressable
                testID="quran-reader-size-increase"
                accessibilityRole="button"
                accessibilityLabel={t('quran.reader.increase')}
                disabled={sizeIndex === FONT_SIZES.length - 1}
                onPress={() => changeFontSize(1)}
                style={styles.sizeButton}
              >
                <MaterialIcons name="text-increase" size={23} color={sizeIndex === FONT_SIZES.length - 1 ? theme.divider : theme.tint} />
              </Pressable>
            </View>
            <View style={styles.sizePresets}>
              {FONT_SIZES.map((size) => {
                const selected = selectedSize === size;
                return (
                  <Pressable
                    key={size}
                    testID={`quran-reader-size-preset-${size}`}
                    accessibilityRole="button"
                    accessibilityLabel={t(`quran.reader.size.${size}`)}
                    accessibilityState={{ selected }}
                    onPress={() => setArabicFontSize(size)}
                    style={[
                      styles.sizePreset,
                      {
                        backgroundColor: selected ? theme.backgroundSecondary : 'transparent',
                        borderColor: selected ? theme.tint : theme.cardBorder,
                      },
                    ]}
                  >
                    <QuranText
                      allowFontScaling={false}
                      style={{
                        color: selected ? theme.tint : theme.textSecondary,
                        fontFamily: getQuranFontFamily(state.preferences.quranFont),
                        fontSize: Math.round(Typography.arabic[size] * 0.55),
                        lineHeight: 26,
                      }}
                    >
                      آ
                    </QuranText>
                  </Pressable>
                );
              })}
            </View>

            <SettingLabel>{t('quran.reader.lineSpacing')}</SettingLabel>
            <View style={styles.optionRow}>
              {SPACINGS.map((spacing) => {
                const selected = settings.lineSpacing === spacing;
                return (
                  <Pressable
                    key={spacing}
                    testID={`quran-reader-spacing-${spacing}`}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    onPress={() => update({ lineSpacing: spacing })}
                    style={[
                      styles.option,
                      { borderColor: selected ? theme.tint : theme.cardBorder, backgroundColor: selected ? theme.backgroundSecondary : 'transparent' },
                    ]}
                  >
                    <LocalizedText style={[styles.optionText, { color: selected ? theme.tint : theme.textSecondary }]}>
                      {t(`quran.reader.spacing.${spacing}`)}
                    </LocalizedText>
                  </Pressable>
                );
              })}
            </View>

            </> : null}
            <SettingLabel>{t('quran.reader.page')}</SettingLabel>
            <View style={styles.pageRow}>
              {PAGE_TONES.map((tone) => {
                const selected = settings.pageTone === tone.id;
                return (
                  <Pressable
                    key={tone.id}
                    testID={`quran-reader-page-${tone.id}`}
                    accessibilityRole="button"
                    accessibilityLabel={t(`quran.reader.page.${tone.id}`)}
                    accessibilityState={{ selected }}
                    onPress={() => update({ pageTone: tone.id })}
                    style={styles.pageOption}
                  >
                    <View style={[styles.swatchRing, { borderColor: selected ? theme.tint : 'transparent' }]}>
                      <View style={[styles.swatch, { borderColor: theme.cardBorder }]}>
                        {tone.colors.map((color) => <View key={color} style={[styles.swatchHalf, { backgroundColor: color }]} />)}
                      </View>
                    </View>
                    <LocalizedText style={[styles.pageLabel, { color: selected ? theme.tint : theme.textSecondary }]}>
                      {t(`quran.reader.page.${tone.id}`)}
                    </LocalizedText>
                  </Pressable>
                );
              })}
            </View>

            {!fixedMushaf ? <>
            <SettingLabel>{t('quran.reader.font')}</SettingLabel>
            <View style={styles.fontRow}>
              {fontOptions.map(([font, details]) => {
                const selected = state.preferences.quranFont === font;
                return (
                  <Pressable
                    key={font}
                    testID={`quran-reader-font-${font}`}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    onPress={() => setQuranFont(font)}
                    style={[
                      styles.fontOption,
                      { borderColor: selected ? theme.tint : theme.cardBorder, backgroundColor: selected ? theme.backgroundSecondary : 'transparent' },
                    ]}
                  >
                    <QuranText
                      allowFontScaling={false}
                      style={[styles.fontSample, { color: theme.text, fontFamily: getQuranFontFamily(font) }]}
                    >
                      {FONT_SAMPLE}
                    </QuranText>
                    <LocalizedText style={[styles.fontName, { color: selected ? theme.tint : theme.textSecondary }]}>
                      {isLatin ? details.displayName : details.displayNameDari}
                    </LocalizedText>
                  </Pressable>
                );
              })}
            </View>
            </> : null}

            {!fixedMushaf ? <>
            <SettingLabel>{t('quran.reader.translation')}</SettingLabel>
            <View style={styles.translationGrid}>
              {TRANSLATIONS.map((translation) => {
                const selected = state.preferences.showTranslation === translation;
                return (
                  <Pressable
                    key={translation}
                    testID={`quran-reader-translation-${translation}`}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    onPress={() => setTranslationLanguage(translation)}
                    style={[
                      styles.translationOption,
                      { borderColor: selected ? theme.tint : theme.cardBorder, backgroundColor: selected ? theme.backgroundSecondary : 'transparent' },
                    ]}
                  >
                    <LocalizedText style={[styles.optionText, { color: selected ? theme.tint : theme.textSecondary }]}>
                      {t(`quran.reader.translation.${translation}`)}
                    </LocalizedText>
                  </Pressable>
                );
              })}
            </View>
            </> : null}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function SettingLabel({ children }: { children: React.ReactNode }) {
  const { theme } = useApp();
  return <LocalizedText style={[styles.sectionLabel, { color: theme.textSecondary }]}>{children}</LocalizedText>;
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  // Keep the Quran page fully visible behind the settings card.
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'transparent' },
  sheet: { maxHeight: '92%', borderTopLeftRadius: 20, borderTopRightRadius: 20, borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: 18, paddingTop: 10 },
  grabber: { alignSelf: 'center', width: 38, height: 4, borderRadius: 2, marginBottom: 8 },
  header: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  title: { fontSize: 18, fontWeight: '700' },
  iconButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  preview: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 12, marginBottom: 2, overflow: 'visible' },
  sectionLabel: { fontSize: 13, fontWeight: '700', marginTop: 14, marginBottom: 8 },
  sizeControl: { minHeight: 54, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: 8, paddingHorizontal: 8 },
  sizeButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  sizeValue: { alignItems: 'center' },
  sizeName: { fontSize: 14, fontWeight: '700' },
  sizePixels: { fontSize: 11 },
  sizePresets: { flexDirection: 'row', gap: 8, marginTop: 8 },
  sizePreset: { flex: 1, minHeight: 40, borderWidth: 1, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  optionRow: { flexDirection: 'row', gap: 8 },
  option: { flex: 1, minHeight: 42, borderWidth: 1, borderRadius: 8, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  optionText: { fontSize: 13, fontWeight: '600', textAlign: 'center' },
  pageRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  pageOption: { flex: 1, alignItems: 'center', gap: 4 },
  swatchRing: { width: 44, height: 44, borderWidth: 2, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  swatch: { width: 34, height: 34, borderWidth: 1, borderRadius: 18, overflow: 'hidden', flexDirection: 'row' },
  swatchHalf: { flex: 1 },
  pageLabel: { fontSize: 11, textAlign: 'center' },
  fontRow: { flexDirection: 'row', gap: 8 },
  fontOption: { flex: 1, minHeight: 100, borderWidth: 1, borderRadius: 8, alignItems: 'center', justifyContent: 'center', gap: 2, overflow: 'visible', paddingVertical: 10 },
  fontSample: { fontSize: 21, lineHeight: 48, writingDirection: 'rtl', includeFontPadding: true, paddingVertical: 4 },
  fontName: { fontSize: 11, textAlign: 'center' },
  translationGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingBottom: 8 },
  translationOption: { width: '31%', minHeight: 42, borderWidth: 1, borderRadius: 8, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
});
