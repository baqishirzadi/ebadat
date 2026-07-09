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
import { MaterialIcons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

export default function SettingsScreen() {
  const {
    theme,
    state,
    setTheme,
    setQuranFont,
    setDariFont,
    setPashtoFont,
    setTranslationLanguage,
    setArabicFontSize,
    setTranslationFontSize,
  } = useApp();
  const { updateSettings, state: prayerState } = usePrayer();
  const calculationMethod = prayerState.settings.calculationMethod;
  const router = useRouter();
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const isIOS = Platform.OS === 'ios';

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

  const visibleQuranFonts = isIOS ? quranFonts.filter((f) => f.id !== 'qpcHafs') : quranFonts;

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
        <ScreenHeader icon="settings" title="تنظیمات" />

        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Theme Settings */}
          <Pressable
            onPress={() => toggleSection('theme')}
            style={[styles.sectionHeader, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}
          >
            <MaterialIcons name="palette" size={24} color={theme.tint} />
            <View style={styles.sectionInfo}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>ظاهر برنامه</Text>
              <Text style={[styles.sectionValue, { color: theme.textSecondary }]}>
                {themes.find((t) => t.id === state.preferences.theme)?.name}
              </Text>
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
                    { borderBottomColor: theme.divider },
                    state.preferences.theme === t.id && { backgroundColor: theme.backgroundSecondary },
                  ]}
                >
                  <MaterialIcons
                    name={t.icon as keyof typeof MaterialIcons.glyphMap}
                    size={20}
                    color={state.preferences.theme === t.id ? theme.tint : theme.icon}
                  />
                  <Text
                    style={[
                      styles.optionText,
                      { color: state.preferences.theme === t.id ? theme.tint : theme.text },
                    ]}
                  >
                    {t.name}
                  </Text>
                  {state.preferences.theme === t.id && (
                    <MaterialIcons name="check" size={20} color={theme.tint} />
                  )}
                </Pressable>
              ))}
            </View>
          )}

          {/* Quran Font Settings */}
          <Pressable
            onPress={() => toggleSection('quranFont')}
            style={[styles.sectionHeader, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}
          >
            <MaterialIcons name="font-download" size={24} color={theme.tint} />
            <View style={styles.sectionInfo}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>خط قرآن</Text>
              <Text style={[styles.sectionValue, { color: theme.textSecondary }]}>
                {QuranFonts[state.preferences.quranFont]?.displayNameDari ?? 'عثمان طه'}
              </Text>
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
                  onPress={() => setQuranFont(f.id)}
                  style={[
                    styles.optionItem,
                    { borderBottomColor: theme.divider },
                    state.preferences.quranFont === f.id && { backgroundColor: theme.backgroundSecondary },
                  ]}
                >
                  <View style={styles.fontPreview}>
                    <Text
                      style={[
                        styles.fontSample,
                        { color: theme.text, fontFamily: getQuranFontFamily(f.id) },
                      ]}
                    >
                      {f.sample}
                    </Text>
                    <Text style={[styles.optionText, { color: theme.text }]}>{f.name}</Text>
                  </View>
                  {state.preferences.quranFont === f.id && (
                    <MaterialIcons name="check" size={20} color={theme.tint} />
                  )}
                </Pressable>
              ))}
              {isIOS ? (
                <View style={[styles.fontNotice, { borderTopColor: theme.divider }]}>
                  <Text style={[styles.fontNoticeText, { color: theme.textSecondary }]}>
                    برای نمایش زیباتر و پایدارتر در iOS، صفحه قرآن فعلاً با خط استاندارد عثمان طه نشان داده می‌شود.
                  </Text>
                </View>
              ) : null}
            </View>
          )}

          {/* Dari Font Settings */}
          <Pressable
            onPress={() => toggleSection('dariFont')}
            style={[styles.sectionHeader, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}
          >
            <MaterialIcons name="translate" size={24} color={theme.tint} />
            <View style={styles.sectionInfo}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>خط دری</Text>
              <Text style={[styles.sectionValue, { color: theme.textSecondary }]}>
                {DariFonts[state.preferences.dariFont]?.displayNameDari || 'وزیرمتن'}
              </Text>
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
                    { borderBottomColor: theme.divider },
                    state.preferences.dariFont === f.id && { backgroundColor: theme.backgroundSecondary },
                  ]}
                >
                  <View style={styles.fontPreview}>
                    <Text
                      style={[
                        styles.fontSample,
                        { color: theme.text, fontFamily: f.id === 'vazirmatn' ? 'Vazirmatn' : 'Amiri' },
                      ]}
                    >
                      {f.sample}
                    </Text>
                    <Text style={[styles.optionText, { color: theme.text }]}>{f.name}</Text>
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
            onPress={() => toggleSection('pashtoFont')}
            style={[styles.sectionHeader, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}
          >
            <MaterialIcons name="text-format" size={24} color={theme.tint} />
            <View style={styles.sectionInfo}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>خط پښتو</Text>
              <Text style={[styles.sectionValue, { color: theme.textSecondary }]}>
                {PashtoFonts[state.preferences.pashtoFont]?.displayNamePashto || 'امیری نسخ'}
              </Text>
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
                  onPress={() => setPashtoFont(f.id)}
                  style={[
                    styles.optionItem,
                    { borderBottomColor: theme.divider },
                    state.preferences.pashtoFont === f.id && { backgroundColor: theme.backgroundSecondary },
                  ]}
                >
                  <View style={styles.fontPreview}>
                    <Text
                      style={[
                        styles.fontSample,
                        {
                          color: theme.text,
                          fontFamily: f.id === 'amiri' ? 'Amiri' : 'NotoNastaliqUrdu',
                        },
                      ]}
                    >
                      {f.sample}
                    </Text>
                    <Text style={[styles.optionText, { color: theme.text }]}>{f.name}</Text>
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
            style={[styles.sectionHeader, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}
          >
            <MaterialIcons name="format-size" size={24} color={theme.tint} />
            <View style={styles.sectionInfo}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>اندازه متن عربی قرآن</Text>
              <Text style={[styles.sectionValue, { color: theme.textSecondary }]}>
                {fontSizes.find((s) => s.id === state.preferences.arabicFontSize)?.name}
              </Text>
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
                    { borderBottomColor: theme.divider },
                    state.preferences.arabicFontSize === s.id && {
                      backgroundColor: theme.backgroundSecondary,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.optionText,
                      { color: state.preferences.arabicFontSize === s.id ? theme.tint : theme.text },
                    ]}
                  >
                    {s.name} ({Typography.arabic[s.id]}px)
                  </Text>
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
            style={[styles.sectionHeader, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}
          >
            <MaterialIcons name="text-fields" size={24} color={theme.tint} />
            <View style={styles.sectionInfo}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>اندازه متن ترجمه</Text>
              <Text style={[styles.sectionValue, { color: theme.textSecondary }]}>
                {fontSizes.find((s) => s.id === state.preferences.translationFontSize)?.name}
              </Text>
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
                    { borderBottomColor: theme.divider },
                    state.preferences.translationFontSize === s.id && {
                      backgroundColor: theme.backgroundSecondary,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.optionText,
                      {
                        color:
                          state.preferences.translationFontSize === s.id ? theme.tint : theme.text,
                      },
                    ]}
                  >
                    {s.name} ({Typography.translation[s.id]}px)
                  </Text>
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
            style={[styles.sectionHeader, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}
          >
            <MaterialIcons name="subtitles" size={24} color={theme.tint} />
            <View style={styles.sectionInfo}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>ترجمه</Text>
              <Text style={[styles.sectionValue, { color: theme.textSecondary }]}>
                {state.preferences.showTranslation === 'dari'
                  ? 'فارسی (دری) - انور بدخشانی'
                  : state.preferences.showTranslation === 'pashto'
                    ? 'پښتو'
                    : state.preferences.showTranslation === 'both'
                      ? 'هردو'
                      : 'بدون ترجمه'}
              </Text>
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
                { id: 'both', name: 'هردو' },
                { id: 'none', name: 'بدون ترجمه' },
              ].map((t) => (
                <Pressable
                  key={t.id}
                  onPress={() => setTranslationLanguage(t.id as 'dari' | 'pashto' | 'both' | 'none')}
                  style={[
                    styles.optionItem,
                    { borderBottomColor: theme.divider },
                    state.preferences.showTranslation === t.id && {
                      backgroundColor: theme.backgroundSecondary,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.optionText,
                      { color: state.preferences.showTranslation === t.id ? theme.tint : theme.text },
                    ]}
                  >
                    {t.name}
                  </Text>
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
            style={[styles.sectionHeader, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}
          >
            <MaterialIcons name="schedule" size={24} color={theme.tint} />
            <View style={styles.sectionInfo}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>روش محاسبه نماز</Text>
              <Text style={[styles.sectionValue, { color: theme.textSecondary }]}>
                {calculationMethods.find((m) => m.id === calculationMethod)?.name}
              </Text>
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
                    { borderBottomColor: theme.divider },
                    calculationMethod === m.id && { backgroundColor: theme.backgroundSecondary },
                  ]}
                >
                  <Text
                    style={[
                      styles.optionText,
                      { color: calculationMethod === m.id ? theme.tint : theme.text },
                    ]}
                  >
                    {m.name}
                  </Text>
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
            style={[styles.adhanSettingsLink, { backgroundColor: theme.card, borderColor: theme.tint }]}
          >
            <View style={styles.adhanSettingsContent}>
              <MaterialIcons name="notifications-active" size={28} color={theme.tint} />
              <View style={styles.adhanSettingsText}>
                <Text style={[styles.adhanSettingsTitle, { color: theme.text }]}>تنظیمات اذان</Text>
                <Text style={[styles.adhanSettingsSubtitle, { color: theme.textSecondary }]}>
                  صدای اذان و یادآوری برای هر نماز
                </Text>
              </View>
            </View>
            <MaterialIcons name="chevron-left" size={24} color={theme.tint} />
          </Pressable>

          {/* Hanafi Asr Notice */}
          <View
            style={[
              styles.noticeCard,
              { backgroundColor: theme.backgroundSecondary, borderColor: theme.cardBorder },
            ]}
          >
            <MaterialIcons name="info" size={20} color={theme.tint} />
            <Text style={[styles.noticeText, { color: theme.textSecondary }]}>
              وقت عصر بر اساس مذهب حنفی محاسبه می‌شود (سایه دو برابر)
            </Text>
          </View>

          {/* App Version */}
          <Text style={[styles.versionText, { color: theme.textSecondary }]}>نسخه ۱.۰.۰</Text>

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
  sectionHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    padding: Spacing.md,
    marginHorizontal: Spacing.md,
    marginTop: Spacing.sm,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
  },
  sectionInfo: {
    flex: 1,
    marginRight: Spacing.md,
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: Typography.ui.subtitle,
    fontWeight: '600',
    textAlign: 'center',
    fontFamily: 'Vazirmatn-Bold',
  },
  sectionValue: {
    fontSize: Typography.ui.body,
    marginTop: 2,
    textAlign: 'center',
    fontFamily: 'Vazirmatn',
  },
  optionsList: {
    marginHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
  },
  optionItem: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    padding: Spacing.md,
    borderBottomWidth: 1,
    gap: Spacing.sm,
  },
  optionText: {
    flex: 1,
    fontSize: Typography.ui.body,
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
    flexDirection: 'row-reverse',
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
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: Spacing.md,
    marginTop: Spacing.md,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
  },
  adhanSettingsContent: {
    flexDirection: 'row-reverse',
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
