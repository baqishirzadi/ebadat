/**
 * Settings Screen
 * Theme, font, prayer, and notification settings
 * All text in Dari - No English
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Switch,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useApp } from '@/context/AppContext';
import { usePrayer } from '@/context/PrayerContext';
import { CalculationMethods } from '@/utils/prayerTimes';
import {
  Typography,
  Spacing,
  BorderRadius,
  ThemeMode,
  QuranFontFamily,
  DariFontFamily,
  PashtoFontFamily,
  QuranFonts,
  DariFonts,
  PashtoFonts,
} from '@/constants/theme';

export default function SettingsScreen() {
  const {
    theme,
    state,
    setTheme,
    setQuranFont,
    setDariFont,
    setPashtoFont,
    setTranslationLanguage,
  } = useApp();
  const { state: prayerState, updateSettings } = usePrayer();
  const router = useRouter();
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  const themes: { id: ThemeMode; name: string; icon: string }[] = [
    { id: 'light', name: 'روشن', icon: 'light-mode' },
    { id: 'night', name: 'شب (سیاه)', icon: 'dark-mode' },
    { id: 'turquoise', name: 'فیروزه‌ای', icon: 'palette' },
    { id: 'olive', name: 'زیتونی', icon: 'eco' },
  ];

  const quranFonts: { id: QuranFontFamily; name: string; sample: string }[] = [
    { id: 'notoNaskh', name: QuranFonts.notoNaskh.displayNameDari, sample: 'بِسْمِ اللَّهِ' },
    { id: 'amiriQuran', name: QuranFonts.amiriQuran.displayNameDari, sample: 'بِسْمِ اللَّهِ' },
    { id: 'scheherazade', name: QuranFonts.scheherazade.displayNameDari, sample: 'بِسْمِ اللَّهِ' },
  ];

  const dariFonts: { id: DariFontFamily; name: string; sample: string }[] = [
    { id: 'vazirmatn', name: DariFonts.vazirmatn.displayNameDari, sample: 'به نام خداوند' },
    { id: 'amiri', name: DariFonts.amiri.displayNameDari, sample: 'به نام خداوند' },
  ];

  const pashtoFonts: { id: PashtoFontFamily; name: string; sample: string }[] = [
    { id: 'amiri', name: PashtoFonts.amiri.displayNamePashto, sample: 'د خدای په نوم' },
    { id: 'nastaliq', name: PashtoFonts.nastaliq.displayNamePashto, sample: 'د خدای په نوم' },
  ];

  const calculationMethods = Object.keys(CalculationMethods).map(key => ({
    id: key,
    name: key === 'Karachi' ? 'کراچی (حنفی)' :
          key === 'MWL' ? 'رابطه عالم اسلامی' :
          key === 'ISNA' ? 'آمریکای شمالی' :
          key === 'Egypt' ? 'مصر' :
          key === 'Makkah' ? 'ام‌القری مکه' :
          key === 'Tehran' ? 'تهران' : key,
  }));

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.surahHeader }]}>
        <MaterialIcons name="settings" size={36} color="#fff" />
        <Text style={styles.headerTitle}>تنظیمات</Text>
      </View>

      {/* Theme Settings */}
      <Pressable
        onPress={() => toggleSection('theme')}
        style={[styles.sectionHeader, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}
      >
        <MaterialIcons name="palette" size={24} color={theme.tint} />
        <View style={styles.sectionInfo}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>ظاهر برنامه</Text>
          <Text style={[styles.sectionValue, { color: theme.textSecondary }]}>
            {themes.find(t => t.id === state.preferences.theme)?.name}
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
                name={t.icon as any}
                size={20}
                color={state.preferences.theme === t.id ? theme.tint : theme.icon}
              />
              <Text style={[
                styles.optionText,
                { color: state.preferences.theme === t.id ? theme.tint : theme.text },
              ]}>
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
            {QuranFonts[state.preferences.quranFont]?.displayNameDari || 'امیری نسخ'}
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
          {quranFonts.map((f) => (
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
                <Text style={[
                  styles.fontSample, 
                  { color: theme.text, fontFamily: f.id === 'amiriQuran' ? 'QuranFont' : 'ScheherazadeNew' }
                ]}>
                  {f.sample}
                </Text>
                <Text style={[styles.optionText, { color: theme.text }]}>{f.name}</Text>
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
                <Text style={[
                  styles.fontSample, 
                  { color: theme.text, fontFamily: f.id === 'vazirmatn' ? 'Vazirmatn' : 'Amiri' }
                ]}>
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
                <Text style={[
                  styles.fontSample, 
                  { color: theme.text, fontFamily: f.id === 'amiri' ? 'Amiri' : 'NotoNastaliqUrdu' }
                ]}>
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

      {/* Translation Settings */}
      <Pressable
        onPress={() => toggleSection('translation')}
        style={[styles.sectionHeader, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}
      >
        <MaterialIcons name="subtitles" size={24} color={theme.tint} />
        <View style={styles.sectionInfo}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>ترجمه</Text>
          <Text style={[styles.sectionValue, { color: theme.textSecondary }]}>
            {state.preferences.showTranslation === 'dari' ? 'دری (انور بدخشانی)' :
             state.preferences.showTranslation === 'pashto' ? 'پښتو' :
             state.preferences.showTranslation === 'both' ? 'هردو' : 'بدون ترجمه'}
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
            { id: 'dari', name: 'دری (انور بدخشانی)' },
            { id: 'pashto', name: 'پښتو' },
            { id: 'both', name: 'هردو' },
            { id: 'none', name: 'بدون ترجمه' },
          ].map((t) => (
            <Pressable
              key={t.id}
              onPress={() => setTranslationLanguage(t.id as any)}
              style={[
                styles.optionItem,
                { borderBottomColor: theme.divider },
                state.preferences.showTranslation === t.id && { backgroundColor: theme.backgroundSecondary },
              ]}
            >
              <Text style={[
                styles.optionText,
                { color: state.preferences.showTranslation === t.id ? theme.tint : theme.text },
              ]}>
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
            {calculationMethods.find(m => m.id === prayerState.settings.calculationMethod)?.name}
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
              onPress={() => updateSettings({ calculationMethod: m.id as any })}
              style={[
                styles.optionItem,
                { borderBottomColor: theme.divider },
                prayerState.settings.calculationMethod === m.id && { backgroundColor: theme.backgroundSecondary },
              ]}
            >
              <Text style={[
                styles.optionText,
                { color: prayerState.settings.calculationMethod === m.id ? theme.tint : theme.text },
              ]}>
                {m.name}
              </Text>
              {prayerState.settings.calculationMethod === m.id && (
                <MaterialIcons name="check" size={20} color={theme.tint} />
              )}
            </Pressable>
          ))}
        </View>
      )}

      {/* Notification Settings */}
      <View style={[styles.sectionHeader, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
        <MaterialIcons name="notifications" size={24} color={theme.tint} />
        <View style={styles.sectionInfo}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>یادآوری نماز</Text>
        </View>
        <Switch
          value={prayerState.settings.notificationsEnabled}
          onValueChange={(value) => updateSettings({ notificationsEnabled: value })}
          trackColor={{ false: theme.divider, true: theme.tint }}
          thumbColor="#fff"
        />
      </View>

      {/* Adhan Settings Link */}
      <Pressable
        onPress={() => router.push('/adhan-settings')}
        style={[styles.adhanSettingsLink, { backgroundColor: '#0F1F14', borderColor: '#D4AF37' }]}
      >
        <View style={styles.adhanSettingsContent}>
          <MaterialIcons name="notifications-active" size={28} color="#D4AF37" />
          <View style={styles.adhanSettingsText}>
            <Text style={styles.adhanSettingsTitle}>تنظیمات اذان</Text>
            <Text style={styles.adhanSettingsSubtitle}>
              صدای اذان و یادآوری برای هر نماز
            </Text>
          </View>
        </View>
        <MaterialIcons name="chevron-left" size={24} color="#D4AF37" />
      </Pressable>

      {/* Hanafi Asr Notice */}
      <View style={[styles.noticeCard, { backgroundColor: theme.backgroundSecondary, borderColor: theme.cardBorder }]}>
        <MaterialIcons name="info" size={20} color={theme.tint} />
        <Text style={[styles.noticeText, { color: theme.textSecondary }]}>
          وقت عصر بر اساس مذهب حنفی محاسبه می‌شود (سایه دو برابر)
        </Text>
      </View>

      {/* Developer Credit Section */}
      <View style={[styles.creditSection, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
        <View style={styles.creditHeader}>
          <MaterialIcons name="favorite" size={20} color="#D4AF37" />
          <Text style={[styles.creditTitle, { color: theme.text }]}>درباره سازنده</Text>
        </View>
        
        <View style={styles.creditContent}>
          <Text style={[styles.creditIntro, { color: theme.textSecondary }]}>
            این اپلیکیشن برای تسهیل عبادات{'\n'}
            مردم شریف و مؤمن افغانستان ساخته شده است
          </Text>
          
          <View style={[styles.creditDivider, { backgroundColor: theme.divider }]} />
          
          <Text style={[styles.creditDeveloper, { color: theme.text }]}>
            توسط:
          </Text>
          <Text style={[styles.creditName, { color: '#D4AF37' }]}>
            سیدعبدالباقی ابن سیدعبدالاله (عارف بالله)
          </Text>
          <Text style={[styles.creditLineage, { color: theme.textSecondary }]}>
            ابن خلیفه صاحب سیدمحمد یتیم شیرزادی (رحمه‌الله)
          </Text>
          
          <Text style={[styles.creditDua, { color: theme.textSecondary }]}>
            انشاءالله قبول درگاه حق تعالی باشد
          </Text>
        </View>
      </View>

      {/* App Version */}
      <Text style={[styles.versionText, { color: theme.textSecondary }]}>
        نسخه ۱.۰.۰
      </Text>

      <View style={styles.spacer} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: Spacing.lg,
    paddingTop: 60,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: Typography.ui.heading,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: Spacing.sm,
    textAlign: 'center',
    fontFamily: 'Vazirmatn',
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
    fontFamily: 'Vazirmatn',
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: Spacing.md,
    marginTop: Spacing.md,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 2,
  },
  adhanSettingsContent: {
    flexDirection: 'row',
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
    color: '#fff',
    fontFamily: 'Vazirmatn',
    textAlign: 'left',
  },
  adhanSettingsSubtitle: {
    fontSize: Typography.ui.caption,
    color: 'rgba(212, 175, 55, 0.8)',
    fontFamily: 'Vazirmatn',
    marginTop: 2,
    textAlign: 'left',
  },
  creditSection: {
    marginHorizontal: Spacing.md,
    marginTop: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  creditHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  creditTitle: {
    fontSize: Typography.ui.subtitle,
    fontWeight: '600',
    textAlign: 'center',
    fontFamily: 'Vazirmatn',
  },
  creditContent: {
    padding: Spacing.md,
    paddingTop: 0,
    alignItems: 'center',
  },
  creditIntro: {
    fontSize: Typography.ui.body,
    textAlign: 'center',
    lineHeight: 24,
    fontFamily: 'Vazirmatn',
  },
  creditDivider: {
    width: 60,
    height: 1,
    marginVertical: Spacing.md,
    alignSelf: 'center',
  },
  creditDeveloper: {
    fontSize: Typography.ui.caption,
    textAlign: 'center',
    fontFamily: 'Vazirmatn',
  },
  creditName: {
    fontSize: Typography.ui.body,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 4,
    fontFamily: 'NotoNastaliqUrdu',
    lineHeight: 36,
  },
  creditLineage: {
    fontSize: Typography.ui.caption,
    textAlign: 'center',
    marginTop: 2,
    fontFamily: 'NotoNastaliqUrdu',
    lineHeight: 32,
  },
  creditDua: {
    fontSize: Typography.ui.caption,
    textAlign: 'center',
    marginTop: Spacing.md,
    fontStyle: 'italic',
    fontFamily: 'NotoNastaliqUrdu',
    lineHeight: 32,
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
