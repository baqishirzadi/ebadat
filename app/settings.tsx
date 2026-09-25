/**
 * Settings Screen
 * Theme, font, prayer, and notification settings
 * All text in Dari - No English
 */

import { ScreenHeader } from '@/components/ui/ScreenHeader';
import {
  BorderRadius,
  DariFontFamily,
  DariFonts,
  PashtoFontFamily,
  PashtoFonts,
  QuranFontFamily,
  QuranFonts,
  Spacing,
  ThemeMode,
  Typography,
} from '@/constants/theme';
import { useApp } from '@/context/AppContext';
import { usePrayer } from '@/context/PrayerContext';
import { getQuranFontFamily } from '@/hooks/useFonts';
import { CalculationMethods } from '@/utils/prayerTimes';
import { translateUi } from '@/utils/i18n/catalog';
import { APP_LANGUAGES, APP_LANGUAGE_ORDER } from '@/utils/i18n/languages';
import { tUi } from '@/utils/i18n/ui';
import { MaterialIcons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';

import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { LocalizedText } from '@/components/ui/LocalizedText';
import { forwardChevronName, rowStyle } from '@/utils/i18n/direction';

export default function SettingsScreen() {
  const {
    theme,
    state,
    setTheme,
    setAppLanguage,
    setQuranFont,
    setDariFont,
    setPashtoFont,
    setTranslationLanguage,
    setArabicFontSize,
    setTranslationFontSize,
    layoutRestartPending,
  } = useApp();
  const { updateSettings, state: prayerState } = usePrayer();
  const uiLanguage = state.preferences.appLanguage;
  const directionalRow = rowStyle(uiLanguage);
  const forwardChevron = forwardChevronName(uiLanguage);
  const calculationMethod = prayerState.settings.calculationMethod;
  const router = useRouter();
  const { section } = useLocalSearchParams<{ section?: string | string[] }>();
  const initialSection = Array.isArray(section) ? section[0] : section;
  const [expandedSection, setExpandedSection] = useState<string | null>(initialSection === 'quran' ? 'quranFont' : null);

  const themes: { id: ThemeMode; name: string; icon: string }[] = useMemo(
    () => [
      { id: 'light', name: 'روشن', icon: 'light-mode' },
      { id: 'night', name: 'شب (سیاه)', icon: 'dark-mode' },
      { id: 'turquoise', name: 'فیروزه‌ای', icon: 'palette' },
      { id: 'olive', name: 'زیتونی', icon: 'eco' },
    ],
    [],
  );

  const dariFonts: { id: DariFontFamily; name: string; sample: string }[] = useMemo(
    () => [
      { id: 'vazirmatn', name: DariFonts.vazirmatn.displayNameDari, sample: 'به نام خداوند' },
      { id: 'amiri', name: DariFonts.amiri.displayNameDari, sample: 'به نام خداوند' },
    ],
    [],
  );

  const quranFonts: { id: QuranFontFamily; name: string; sample: string }[] = useMemo(
    () => [
      {
        id: 'scheherazade',
        name: QuranFonts.scheherazade.displayNameDari,
        sample: 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ',
      },
      {
        id: 'qpcHafs',
        name: QuranFonts.qpcHafs.displayNameDari,
        sample: 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ',
      },
    ],
    [],
  );

  const pashtoFonts: { id: PashtoFontFamily; name: string; sample: string }[] = useMemo(
    () => [
      { id: 'amiri', name: PashtoFonts.amiri.displayNamePashto, sample: 'د خدای په نوم' },
      { id: 'nastaliq', name: PashtoFonts.nastaliq.displayNamePashto, sample: 'د خدای په نوم' },
    ],
    [],
  );

  const fontSizes: { id: 'small' | 'medium' | 'large' | 'xlarge'; name: string }[] = useMemo(
    () => [
      { id: 'small', name: 'کوچک' },
      { id: 'medium', name: 'متوسط' },
      { id: 'large', name: 'بزرگ' },
      { id: 'xlarge', name: 'خیلی بزرگ' },
    ],
    [],
  );

  const visibleQuranFonts = quranFonts;

  const calculationMethods = useMemo(
    () =>
      Object.keys(CalculationMethods).map((key) => ({
        id: key,
        name:
          key === 'Karachi'
            ? 'کراچی (حنفی)'
            : key === 'MWL'
              ? 'رابطه عالم اسلامی'
              : key === 'ISNA'
                ? 'آمریکای شمالی'
                : key === 'Egypt'
                  ? 'مصر'
                  : key === 'Makkah'
                    ? 'ام‌القری مکه'
                    : key === 'Tehran'
                      ? 'تهران'
                      : key,
      })),
    [],
  );

  const toggleSection = useCallback((section: string) => {
    setExpandedSection((current) => (current === section ? null : section));
  }, []);

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <ScreenHeader icon="settings" title={tUi('تنظیمات', uiLanguage)} />

        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Theme Settings */}
          <Pressable
            onPress={() => toggleSection('theme')}
            style={[styles.sectionHeader, directionalRow, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}
          >
            <MaterialIcons name="palette" size={24} color={theme.tint} />
            <View style={styles.sectionInfo}>
              <LocalizedText numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.78} style={[styles.sectionTitle, { color: theme.text }]}>{tUi('ظاهر برنامه', uiLanguage)}</LocalizedText>
              <LocalizedText numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.78} style={[styles.sectionValue, { color: theme.textSecondary }]}>
                {tUi(themes.find((t) => t.id === state.preferences.theme)?.name ?? '', uiLanguage)}
              </LocalizedText>
            </View>
            <MaterialIcons
              name={expandedSection === 'theme' ? 'expand-less' : 'expand-more'}
              size={24}
              color={theme.icon}
            />
          </Pressable>
          {expandedSection === 'theme' && (
            <View style={[styles.optionsList, { backgroundColor: theme.card }]}>
              {themes.map((t) => (
                <Pressable
                  key={t.id}
                  onPress={() => setTheme(t.id)}
                  style={[
                    styles.optionItem,
                    directionalRow,
                    { borderBottomColor: theme.divider },
                    state.preferences.theme === t.id && { backgroundColor: theme.backgroundSecondary },
                  ]}
                >
                  <MaterialIcons
                    name={t.icon as keyof typeof MaterialIcons.glyphMap}
                    size={20}
                    color={state.preferences.theme === t.id ? theme.tint : theme.icon}
                  />
                  <LocalizedText numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.78}
                    style={[
                      styles.optionText,
                      { color: state.preferences.theme === t.id ? theme.tint : theme.text },
                    ]}
                  >
                    {tUi(t.name, uiLanguage)}
                  </LocalizedText>
                  {state.preferences.theme === t.id && (
                    <MaterialIcons name="check" size={20} color={theme.tint} />
                  )}
                </Pressable>
              ))}
            </View>
          )}

          {/* App Language Settings */}
          <Pressable
            onPress={() => toggleSection('appLanguage')}
            style={[styles.sectionHeader, directionalRow, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}
          >
            <MaterialIcons name="language" size={24} color={theme.tint} />
            <View style={styles.sectionInfo}>
              <LocalizedText numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.78} style={[styles.sectionTitle, { color: theme.text }]}>{tUi('زبان برنامه', uiLanguage)}</LocalizedText>
              <LocalizedText numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.78} style={[styles.sectionValue, { color: theme.textSecondary }]}>
                {APP_LANGUAGES[state.preferences.appLanguage].nativeLabel}
              </LocalizedText>
            </View>
            <MaterialIcons
              name={expandedSection === 'appLanguage' ? 'expand-less' : 'expand-more'}
              size={24}
              color={theme.icon}
            />
          </Pressable>
          {expandedSection === 'appLanguage' && (
            <View style={[styles.optionsList, { backgroundColor: theme.card }]}>
              {APP_LANGUAGE_ORDER.map((languageCode) => {
                const active = state.preferences.appLanguage === languageCode;
                return (
                  <Pressable
                    key={languageCode}
                    onPress={() => setAppLanguage(languageCode)}
                    style={[
                      styles.optionItem,
                     directionalRow,
                      directionalRow,
                      { borderBottomColor: theme.divider },
                      active && { backgroundColor: theme.backgroundSecondary },
                    ]}
                  >
                    <LocalizedText numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.78}
                      style={[styles.optionText, { color: active ? theme.tint : theme.text }]}
                    >
                      {APP_LANGUAGES[languageCode].nativeLabel}
                    </LocalizedText>
                    {active && <MaterialIcons name="check" size={20} color={theme.tint} />}
                  </Pressable>
                );
              })}
            </View>
          )}
          {layoutRestartPending && (
            <View style={[styles.restartNotice, directionalRow, { backgroundColor: `${theme.tint}14`, borderColor: `${theme.tint}55` }]}>
              <MaterialIcons name="restart-alt" size={20} color={theme.tint} />
              <View style={styles.restartNoticeText}>
                <LocalizedText style={[styles.restartNoticeTitle, { color: theme.text }]}>
                  {translateUi('language.restart.title', uiLanguage)}
                </LocalizedText>
                <LocalizedText style={[styles.restartNoticeBody, { color: theme.textSecondary }]}>
                  {translateUi('language.restart.body', uiLanguage)}
                </LocalizedText>
              </View>
            </View>
          )}

          {/* Quran Font Settings */}
          <Pressable
            testID="settings-quran-font"
            accessibilityLabel="خط قرآن"
            onPress={() => toggleSection('quranFont')}
            style={[styles.sectionHeader, directionalRow, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}
          >
            <MaterialIcons name="font-download" size={24} color={theme.tint} />
            <View style={styles.sectionInfo}>
              <LocalizedText numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.78} style={[styles.sectionTitle, { color: theme.text }]}>{tUi('خط قرآن', uiLanguage)}</LocalizedText>
              <LocalizedText numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.78} style={[styles.sectionValue, { color: theme.textSecondary }]}>
                {QuranFonts[state.preferences.quranFont]?.displayNameDari ?? 'عثمان طه'}
              </LocalizedText>
            </View>
            <MaterialIcons
              name={expandedSection === 'quranFont' ? 'expand-less' : 'expand-more'}
              size={24}
              color={theme.icon}
            />
          </Pressable>
          {expandedSection === 'quranFont' && (
            <View style={[styles.optionsList, { backgroundColor: theme.card }]}>
              {visibleQuranFonts.map((f) => (
                <Pressable
                  key={f.id}
                  testID={`settings-quran-font-option-${f.id}`}
                  accessibilityLabel={f.name}
                  onPress={() => setQuranFont(f.id)}
                  style={[
                    styles.optionItem,
                    directionalRow,
                    styles.fontPreviewOption,
                    { borderBottomColor: theme.divider },
                    state.preferences.quranFont === f.id && { backgroundColor: theme.backgroundSecondary },
                  ]}
                >
                  <View style={styles.fontPreview}>
                    <LocalizedText
                      preserveFontFamily
                      style={[
                        styles.fontSample,
                        { color: theme.text, fontFamily: getQuranFontFamily(f.id) },
                      ]}
                    >
                      {f.sample}
                    </LocalizedText>
                    <LocalizedText numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.78} style={[styles.optionText, { color: theme.text }]}>{f.name}</LocalizedText>
                  </View>
                  {state.preferences.quranFont === f.id && (
                    <MaterialIcons name="check" size={20} color={theme.tint} />
                  )}
                </Pressable>
              ))}
            </View>
          )}

          {/* Dari Font Settings */}
          <Pressable
            onPress={() => toggleSection('dariFont')}
            style={[styles.sectionHeader, directionalRow, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}
          >
            <MaterialIcons name="translate" size={24} color={theme.tint} />
            <View style={styles.sectionInfo}>
              <LocalizedText numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.78} style={[styles.sectionTitle, { color: theme.text }]}>{tUi('خط دری', uiLanguage)}</LocalizedText>
              <LocalizedText numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.78} style={[styles.sectionValue, { color: theme.textSecondary }]}>
                {DariFonts[state.preferences.dariFont]?.displayNameDari || 'وزیرمتن'}
              </LocalizedText>
            </View>
            <MaterialIcons
              name={expandedSection === 'dariFont' ? 'expand-less' : 'expand-more'}
              size={24}
              color={theme.icon}
            />
          </Pressable>
          {expandedSection === 'dariFont' && (
            <View style={[styles.optionsList, { backgroundColor: theme.card }]}>
              {dariFonts.map((f) => (
                <Pressable
                  key={f.id}
                  onPress={() => setDariFont(f.id)}
                  style={[
                    styles.optionItem,
                    directionalRow,
                    styles.fontPreviewOption,
                    { borderBottomColor: theme.divider },
                    state.preferences.dariFont === f.id && { backgroundColor: theme.backgroundSecondary },
                  ]}
                >
                  <View style={styles.fontPreview}>
                    <LocalizedText
                      preserveFontFamily
                      style={[
                        styles.fontSample,
                        { color: theme.text, fontFamily: f.id === 'vazirmatn' ? 'Vazirmatn' : 'Amiri' },
                      ]}
                    >
                      {f.sample}
                    </LocalizedText>
                    <LocalizedText numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.78} style={[styles.optionText, { color: theme.text }]}>{f.name}</LocalizedText>
                  </View>
                  {state.preferences.dariFont === f.id && (
                    <MaterialIcons name="check" size={20} color={theme.tint} />
                  )}
                </Pressable>
              ))}
            </View>
          )}

          {/* Pashto Font Settings */}
          <Pressable
            testID="settings-pashto-font"
            onPress={() => toggleSection('pashtoFont')}
            style={[styles.sectionHeader, directionalRow, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}
          >
            <MaterialIcons name="text-format" size={24} color={theme.tint} />
            <View style={styles.sectionInfo}>
              <LocalizedText numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.78} style={[styles.sectionTitle, { color: theme.text }]}>{tUi('خط پښتو', uiLanguage)}</LocalizedText>
              <LocalizedText numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.78} style={[styles.sectionValue, { color: theme.textSecondary }]}>
                {PashtoFonts[state.preferences.pashtoFont]?.displayNamePashto || 'امیری نسخ'}
              </LocalizedText>
            </View>
            <MaterialIcons
              name={expandedSection === 'pashtoFont' ? 'expand-less' : 'expand-more'}
              size={24}
              color={theme.icon}
            />
          </Pressable>
          {expandedSection === 'pashtoFont' && (
            <View style={[styles.optionsList, { backgroundColor: theme.card }]}>
              {pashtoFonts.map((f) => (
                <Pressable
                  key={f.id}
                  testID={`settings-pashto-font-option-${f.id}`}
                  onPress={() => setPashtoFont(f.id)}
                  style={[
                    styles.optionItem,
                    directionalRow,
                    styles.fontPreviewOption,
                    { borderBottomColor: theme.divider },
                    state.preferences.pashtoFont === f.id && { backgroundColor: theme.backgroundSecondary },
                  ]}
                >
                  <View style={styles.fontPreview}>
                    <LocalizedText
                      preserveFontFamily
                      style={[
                        styles.fontSample,
                        {
                          color: theme.text,
                          fontFamily: f.id === 'amiri' ? 'Amiri' : 'NotoNastaliqUrdu',
                          fontSize: f.id === 'nastaliq' ? 18 : Typography.arabic.small,
                          lineHeight: f.id === 'nastaliq' ? 42 : 30,
                          includeFontPadding: f.id === 'nastaliq',
                        },
                      ]}
                    >
                      {f.sample}
                    </LocalizedText>
                    <LocalizedText numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.78} style={[styles.optionText, { color: theme.text }]}>{f.name}</LocalizedText>
                  </View>
                  {state.preferences.pashtoFont === f.id && (
                    <MaterialIcons name="check" size={20} color={theme.tint} />
                  )}
                </Pressable>
              ))}
            </View>
          )}

          {/* Arabic font size */}
          <Pressable
            onPress={() => toggleSection('arabicSize')}
            style={[styles.sectionHeader, directionalRow, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}
          >
            <MaterialIcons name="format-size" size={24} color={theme.tint} />
            <View style={styles.sectionInfo}>
              <LocalizedText numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.78} style={[styles.sectionTitle, { color: theme.text }]}>{tUi('اندازه متن عربی قرآن', uiLanguage)}</LocalizedText>
              <LocalizedText numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.78} style={[styles.sectionValue, { color: theme.textSecondary }]}>
                {tUi(fontSizes.find((s) => s.id === state.preferences.arabicFontSize)?.name ?? '', uiLanguage)}
              </LocalizedText>
            </View>
            <MaterialIcons
              name={expandedSection === 'arabicSize' ? 'expand-less' : 'expand-more'}
              size={24}
              color={theme.icon}
            />
          </Pressable>
          {expandedSection === 'arabicSize' && (
            <View style={[styles.optionsList, { backgroundColor: theme.card }]}>
              {fontSizes.map((s) => (
                <Pressable
                  key={s.id}
                  onPress={() => setArabicFontSize(s.id)}
                  style={[
                    styles.optionItem,
                    directionalRow,
                    { borderBottomColor: theme.divider },
                    state.preferences.arabicFontSize === s.id && {
                      backgroundColor: theme.backgroundSecondary,
                    },
                  ]}
                >
                  <LocalizedText numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.78}
                    style={[
                      styles.optionText,
                      { color: state.preferences.arabicFontSize === s.id ? theme.tint : theme.text },
                    ]}
                  >
                    {tUi(s.name, uiLanguage)} ({Typography.arabic[s.id]}px)
                  </LocalizedText>
                  {state.preferences.arabicFontSize === s.id && (
                    <MaterialIcons name="check" size={20} color={theme.tint} />
                  )}
                </Pressable>
              ))}
            </View>
          )}

          {/* Translation font size */}
          <Pressable
            onPress={() => toggleSection('translationSize')}
            style={[styles.sectionHeader, directionalRow, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}
          >
            <MaterialIcons name="text-fields" size={24} color={theme.tint} />
            <View style={styles.sectionInfo}>
              <LocalizedText numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.78} style={[styles.sectionTitle, { color: theme.text }]}>{tUi('اندازه متن ترجمه', uiLanguage)}</LocalizedText>
              <LocalizedText numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.78} style={[styles.sectionValue, { color: theme.textSecondary }]}>
                {tUi(fontSizes.find((s) => s.id === state.preferences.translationFontSize)?.name ?? '', uiLanguage)}
              </LocalizedText>
            </View>
            <MaterialIcons
              name={expandedSection === 'translationSize' ? 'expand-less' : 'expand-more'}
              size={24}
              color={theme.icon}
            />
          </Pressable>
          {expandedSection === 'translationSize' && (
            <View style={[styles.optionsList, { backgroundColor: theme.card }]}>
              {fontSizes.map((s) => (
                <Pressable
                  key={s.id}
                  onPress={() => setTranslationFontSize(s.id)}
                  style={[
                    styles.optionItem,
                    directionalRow,
                    { borderBottomColor: theme.divider },
                    state.preferences.translationFontSize === s.id && {
                      backgroundColor: theme.backgroundSecondary,
                    },
                  ]}
                >
                  <LocalizedText numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.78}
                    style={[
                      styles.optionText,
                      {
                        color:
                          state.preferences.translationFontSize === s.id ? theme.tint : theme.text,
                      },
                    ]}
                  >
                    {tUi(s.name, uiLanguage)} ({Typography.translation[s.id]}px)
                  </LocalizedText>
                  {state.preferences.translationFontSize === s.id && (
                    <MaterialIcons name="check" size={20} color={theme.tint} />
                  )}
                </Pressable>
              ))}
            </View>
          )}

          {/* Translation Settings */}
          <Pressable
            onPress={() => toggleSection('translation')}
            style={[styles.sectionHeader, directionalRow, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}
          >
            <MaterialIcons name="subtitles" size={24} color={theme.tint} />
            <View style={styles.sectionInfo}>
              <LocalizedText numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.78} style={[styles.sectionTitle, { color: theme.text }]}>{tUi('ترجمه', uiLanguage)}</LocalizedText>
              <LocalizedText numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.78} style={[styles.sectionValue, { color: theme.textSecondary }]}>
                {state.preferences.showTranslation === 'dari'
                  ? tUi('فارسی (دری) - انور بدخشانی', uiLanguage)
                  : state.preferences.showTranslation === 'pashto'
                    ? tUi('پښتو', uiLanguage)
                    : state.preferences.showTranslation === 'english'
                      ? tUi('انگلیسی', uiLanguage)
                    : state.preferences.showTranslation === 'both'
                      ? tUi('هردو', uiLanguage)
                      : tUi('بدون ترجمه', uiLanguage)}
              </LocalizedText>
            </View>
            <MaterialIcons
              name={expandedSection === 'translation' ? 'expand-less' : 'expand-more'}
              size={24}
              color={theme.icon}
            />
          </Pressable>
          {expandedSection === 'translation' && (
            <View style={[styles.optionsList, { backgroundColor: theme.card }]}>
              {[
                { id: 'dari', name: 'فارسی (دری) - انور بدخشانی' },
                { id: 'pashto', name: 'پښتو' },
                { id: 'english', name: 'انگلیسی' },
                { id: 'none', name: 'بدون ترجمه' },
              ].map((t) => (
                <Pressable
                  key={t.id}
                  onPress={() => setTranslationLanguage(t.id as 'dari' | 'pashto' | 'english' | 'none')}
                  style={[
                    styles.optionItem,
                    directionalRow,
                    { borderBottomColor: theme.divider },
                    state.preferences.showTranslation === t.id && {
                      backgroundColor: theme.backgroundSecondary,
                    },
                  ]}
                >
                  <LocalizedText numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.78}
                    style={[
                      styles.optionText,
                      { color: state.preferences.showTranslation === t.id ? theme.tint : theme.text },
                    ]}
                  >
                    {t.name}
                  </LocalizedText>
                  {state.preferences.showTranslation === t.id && (
                    <MaterialIcons name="check" size={20} color={theme.tint} />
                  )}
                </Pressable>
              ))}
            </View>
          )}

          {/* Prayer Calculation Method */}
          <Pressable
            onPress={() => toggleSection('prayerMethod')}
            style={[styles.sectionHeader, directionalRow, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}
          >
            <MaterialIcons name="schedule" size={24} color={theme.tint} />
            <View style={styles.sectionInfo}>
              <LocalizedText numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.78} style={[styles.sectionTitle, { color: theme.text }]}>{tUi('روش محاسبه نماز', uiLanguage)}</LocalizedText>
              <LocalizedText numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.78} style={[styles.sectionValue, { color: theme.textSecondary }]}>
                {calculationMethods.find((m) => m.id === calculationMethod)?.name}
              </LocalizedText>
            </View>
            <MaterialIcons
              name={expandedSection === 'prayerMethod' ? 'expand-less' : 'expand-more'}
              size={24}
              color={theme.icon}
            />
          </Pressable>
          {expandedSection === 'prayerMethod' && (
            <View style={[styles.optionsList, { backgroundColor: theme.card }]}>
              {calculationMethods.map((m) => (
                <Pressable
                  key={m.id}
                  onPress={() => updateSettings({ calculationMethod: m.id as keyof typeof CalculationMethods })}
                  style={[
                    styles.optionItem,
                    directionalRow,
                    { borderBottomColor: theme.divider },
                    calculationMethod === m.id && { backgroundColor: theme.backgroundSecondary },
                  ]}
                >
                  <LocalizedText numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.78}
                    style={[
                      styles.optionText,
                      { color: calculationMethod === m.id ? theme.tint : theme.text },
                    ]}
                  >
                    {m.name}
                  </LocalizedText>
                  {calculationMethod === m.id && (
                    <MaterialIcons name="check" size={20} color={theme.tint} />
                  )}
                </Pressable>
              ))}
            </View>
          )}

          {/* Adhan Settings Link */}
          <Pressable
            onPress={() => router.push('/adhan-settings')}
            style={[styles.adhanSettingsLink, directionalRow, { backgroundColor: theme.card, borderColor: theme.tint }]}
          >
            <View style={[styles.adhanSettingsContent, directionalRow]}>
              <MaterialIcons name="notifications-active" size={28} color={theme.tint} />
              <View style={styles.adhanSettingsText}>
                <LocalizedText style={[styles.adhanSettingsTitle, { color: theme.text }]}>{tUi('تنظیمات اذان', uiLanguage)}</LocalizedText>
                <LocalizedText style={[styles.adhanSettingsSubtitle, { color: theme.textSecondary }]}>
                  صدای اذان و یادآوری برای هر نماز
                </LocalizedText>
              </View>
            </View>
            <MaterialIcons name={forwardChevron} size={24} color={theme.tint} />
          </Pressable>

          {/* Hanafi Asr Notice */}
          <View
            style={[
              styles.noticeCard,
              directionalRow,
              { backgroundColor: theme.backgroundSecondary, borderColor: theme.cardBorder },
            ]}
          >
            <MaterialIcons name="info" size={20} color={theme.tint} />
            <LocalizedText style={[styles.noticeText, { color: theme.textSecondary }]}>
              {translateUi('settings.asrNotice', uiLanguage)}
            </LocalizedText>
          </View>

          {/* App Version */}
          <LocalizedText style={[styles.versionText, { color: theme.textSecondary }]}>{tUi('نسخه ۱.۰.۰', uiLanguage)}</LocalizedText>

          <View style={styles.spacer} />
        </ScrollView>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: Spacing.xl,
  },
  restartNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    marginHorizontal: Spacing.md,
    marginTop: Spacing.sm,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
  },
  restartNoticeText: {
    flex: 1,
    gap: 2,
  },
  restartNoticeTitle: {
    fontSize: Typography.ui.body,
  },
  restartNoticeBody: {
    fontSize: Typography.ui.caption,
    lineHeight: 22,
  },
  sectionHeader: {
    alignItems: 'center',
    height: 84,
    paddingHorizontal: Spacing.md,
    paddingVertical: 7,
    marginHorizontal: Spacing.md,
    marginTop: Spacing.sm,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  sectionInfo: {
    flex: 1,
    minWidth: 0,
    marginHorizontal: Spacing.md,
    alignItems: 'center',
  },
  sectionTitle: {
    width: '100%',
    fontSize: 14,
    lineHeight: 28,
    fontWeight: '600',
    textAlign: 'center',
    fontFamily: 'Vazirmatn-Bold',
  },
  sectionValue: {
    width: '100%',
    fontSize: 12,
    lineHeight: 24,
    marginTop: 1,
    textAlign: 'center',
    fontFamily: 'Vazirmatn',
  },
  optionsList: {
    marginHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
  },
  optionItem: {
    alignItems: 'center',
    height: 56,
    paddingHorizontal: Spacing.md,
    paddingVertical: 7,
    borderBottomWidth: 1,
    gap: Spacing.sm,
  },
  fontPreviewOption: {
    height: 88,
  },
  optionText: {
    flex: 1,
    minWidth: 0,
    fontSize: 13,
    lineHeight: 26,
    textAlign: 'center',
    fontFamily: 'Vazirmatn',
  },
  fontPreview: {
    flex: 1,
    alignItems: 'center',
  },
  fontSample: {
    fontSize: Typography.arabic.small,
    marginBottom: 4,
    textAlign: 'center',
  },
  fontNotice: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  fontNoticeText: {
    fontSize: Typography.ui.caption,
    lineHeight: 20,
    textAlign: 'right',
    fontFamily: 'Vazirmatn',
  },
  noticeCard: {
    alignItems: 'center',
    padding: Spacing.md,
    marginHorizontal: Spacing.md,
    marginTop: Spacing.lg,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    gap: Spacing.sm,
  },
  noticeText: {
    flex: 1,
    fontSize: Typography.ui.caption,
    textAlign: 'center',
    fontFamily: 'Vazirmatn',
  },
  adhanSettingsLink: {
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: Spacing.md,
    marginTop: Spacing.md,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
  },
  adhanSettingsContent: {
    alignItems: 'center',
    gap: Spacing.md,
    flex: 1,
  },
  adhanSettingsText: {
    flex: 1,
  },
  adhanSettingsTitle: {
    fontSize: Typography.ui.subtitle,
    fontWeight: 'bold',
    fontFamily: 'Vazirmatn-Bold',
    textAlign: 'right',
  },
  adhanSettingsSubtitle: {
    fontSize: Typography.ui.caption,
    fontFamily: 'Vazirmatn',
    marginTop: 2,
    textAlign: 'right',
  },
  versionText: {
    fontSize: Typography.ui.caption,
    textAlign: 'center',
    marginTop: Spacing.lg,
    fontFamily: 'Vazirmatn',
  },
  spacer: {
    height: 100,
  },
});
