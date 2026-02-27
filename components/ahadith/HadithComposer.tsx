import React, { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { HadithAdminPayload, HadithSourceBook, HadithSpecialDay } from '@/types/hadith';
import { useApp } from '@/context/AppContext';
import { alphaColor } from '@/utils/ahadith/theme';
import CText from '@/components/CenteredText';

interface HadithComposerProps {
  isSubmitting: boolean;
  onPublish: (payload: HadithAdminPayload) => Promise<void>;
}

const SPECIAL_DAYS: { key: HadithSpecialDay; label: string }[] = [
  { key: 'ramadan', label: 'رمضان' },
  { key: 'laylat_al_qadr', label: 'شب قدر (۲۷ رمضان)' },
  { key: 'eid_al_fitr', label: 'عید فطر' },
  { key: 'eid_al_adha', label: 'عید قربان' },
  { key: 'first_10_dhul_hijjah', label: 'دهه اول ذوالحجه' },
  { key: 'ashura', label: 'عاشورا' },
];

function normalizeTopics(value: string): string[] {
  return value
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter((item) => item.length > 0);
}

function parsePositiveInt(value: string): number | undefined {
  const parsed = Number(value.trim());
  if (!Number.isInteger(parsed) || parsed <= 0) return undefined;
  return parsed;
}

export function HadithComposer({ isSubmitting, onPublish }: HadithComposerProps) {
  const { theme } = useApp();

  const [arabicText, setArabicText] = useState('');
  const [dariTranslation, setDariTranslation] = useState('');
  const [pashtoTranslation, setPashtoTranslation] = useState('');
  const [sourceBook, setSourceBook] = useState<HadithSourceBook>('Bukhari');
  const [sourceNumber, setSourceNumber] = useState('');
  const [isMuttafaq, setIsMuttafaq] = useState(false);
  const [topicsInput, setTopicsInput] = useState('');
  const [dailyIndexInput, setDailyIndexInput] = useState('');
  const [hijriMonthInput, setHijriMonthInput] = useState('');
  const [hijriDayStartInput, setHijriDayStartInput] = useState('');
  const [hijriDayEndInput, setHijriDayEndInput] = useState('');
  const [weekdayFridayOnly, setWeekdayFridayOnly] = useState(false);
  const [selectedSpecialDays, setSelectedSpecialDays] = useState<HadithSpecialDay[]>([]);

  const inputBackground = useMemo(() => alphaColor(theme.primary, 0.05), [theme.primary]);

  const toggleSpecialDay = (key: HadithSpecialDay) => {
    setSelectedSpecialDays((prev) =>
      prev.includes(key) ? prev.filter((item) => item !== key) : [...prev, key]
    );
  };

  const resetForm = () => {
    setArabicText('');
    setDariTranslation('');
    setPashtoTranslation('');
    setSourceBook('Bukhari');
    setSourceNumber('');
    setIsMuttafaq(false);
    setTopicsInput('');
    setDailyIndexInput('');
    setHijriMonthInput('');
    setHijriDayStartInput('');
    setHijriDayEndInput('');
    setWeekdayFridayOnly(false);
    setSelectedSpecialDays([]);
  };

  const handlePublish = async () => {
    const normalizedArabic = arabicText.trim();
    const normalizedDari = dariTranslation.trim();
    const normalizedPashto = pashtoTranslation.trim();
    const normalizedSourceNumber = sourceNumber.trim();

    if (!normalizedArabic || !normalizedDari || !normalizedPashto || !normalizedSourceNumber) {
      Alert.alert('نقص معلومات', 'متن عربی، ترجمه دری، ترجمه پشتو و شماره منبع الزامی است.');
      return;
    }

    const dailyIndex = parsePositiveInt(dailyIndexInput);
    const hijriMonth = parsePositiveInt(hijriMonthInput);
    const hijriDayStart = parsePositiveInt(hijriDayStartInput);
    const hijriDayEnd = parsePositiveInt(hijriDayEndInput);

    const hijriValues = [hijriMonth, hijriDayStart, hijriDayEnd];
    const hijriProvidedCount = hijriValues.filter((item) => item != null).length;

    if (hijriProvidedCount > 0 && hijriProvidedCount < 3) {
      Alert.alert('نقص معلومات', 'برای بازه هجری باید هر سه مقدار ماه، شروع و پایان روز را وارد کنید.');
      return;
    }

    const payload: HadithAdminPayload = {
      arabic_text: normalizedArabic,
      dari_translation: normalizedDari,
      pashto_translation: normalizedPashto,
      source_book: sourceBook,
      source_number: normalizedSourceNumber,
      is_muttafaq: isMuttafaq,
      topics: normalizeTopics(topicsInput),
      ...(selectedSpecialDays.length > 0 ? { special_days: selectedSpecialDays } : {}),
      ...(weekdayFridayOnly ? { weekday_only: 'friday' as const } : {}),
      ...(dailyIndex ? { daily_index: dailyIndex } : {}),
      ...(hijriProvidedCount === 3
        ? {
            hijri_range: {
              month: hijriMonth as number,
              day_start: hijriDayStart as number,
              day_end: hijriDayEnd as number,
            },
          }
        : {}),
    };

    try {
      await onPublish(payload);
      resetForm();
    } catch {
      // Parent screen shows publish failure message.
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <CText style={[styles.sectionTitle, { color: theme.textPrimary }]}>حدیث جدید</CText>

      <View style={styles.group}>
        <CText style={[styles.label, { color: theme.textSecondary }]}>متن عربی</CText>
        <TextInput
          value={arabicText}
          onChangeText={setArabicText}
          multiline
          textAlign="center"
          style={[
            styles.multilineInput,
            {
              color: theme.textPrimary,
              borderColor: alphaColor(theme.primary, 0.24),
              backgroundColor: inputBackground,
            },
          ]}
        />
      </View>

      <View style={styles.group}>
        <CText style={[styles.label, { color: theme.textSecondary }]}>ترجمه دری</CText>
        <TextInput
          value={dariTranslation}
          onChangeText={setDariTranslation}
          multiline
          textAlign="center"
          style={[
            styles.multilineInput,
            {
              color: theme.textPrimary,
              borderColor: alphaColor(theme.primary, 0.24),
              backgroundColor: inputBackground,
            },
          ]}
        />
      </View>

      <View style={styles.group}>
        <CText style={[styles.label, { color: theme.textSecondary }]}>ترجمه پشتو</CText>
        <TextInput
          value={pashtoTranslation}
          onChangeText={setPashtoTranslation}
          multiline
          textAlign="center"
          style={[
            styles.multilineInput,
            {
              color: theme.textPrimary,
              borderColor: alphaColor(theme.primary, 0.24),
              backgroundColor: inputBackground,
            },
          ]}
        />
      </View>

      <View style={styles.group}>
        <CText style={[styles.label, { color: theme.textSecondary }]}>کتاب منبع</CText>
        <View style={styles.rowButtons}>
          {([
            ['Bukhari', 'صحیح بخاری'],
            ['Muslim', 'صحیح مسلم'],
          ] as const).map(([value, label]) => {
            const selected = sourceBook === value;
            return (
              <Pressable
                key={value}
                onPress={() => setSourceBook(value)}
                style={[
                  styles.optionButton,
                  {
                    borderColor: selected
                      ? alphaColor(theme.primary, 0.46)
                      : alphaColor(theme.textSecondary, 0.24),
                    backgroundColor: selected
                      ? alphaColor(theme.primary, 0.16)
                      : theme.surface,
                  },
                ]}
              >
                <CText
                  style={[
                    styles.optionText,
                    { color: selected ? theme.primary : theme.textSecondary },
                  ]}
                >
                  {label}
                </CText>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.inlineRow}>
        <View style={styles.inlineItem}>
          <CText style={[styles.label, { color: theme.textSecondary }]}>شماره منبع</CText>
          <TextInput
            value={sourceNumber}
            onChangeText={setSourceNumber}
            textAlign="center"
            style={[
              styles.singleLineInput,
              {
                color: theme.textPrimary,
                borderColor: alphaColor(theme.primary, 0.24),
                backgroundColor: inputBackground,
              },
            ]}
          />
        </View>

        <View style={styles.inlineItem}>
          <CText style={[styles.label, { color: theme.textSecondary }]}>شماره روزانه (اختیاری)</CText>
          <TextInput
            value={dailyIndexInput}
            onChangeText={setDailyIndexInput}
            keyboardType="number-pad"
            textAlign="center"
            style={[
              styles.singleLineInput,
              {
                color: theme.textPrimary,
                borderColor: alphaColor(theme.primary, 0.24),
                backgroundColor: inputBackground,
              },
            ]}
          />
        </View>
      </View>

      <View style={styles.group}>
        <CText style={[styles.label, { color: theme.textSecondary }]}>موضوعات (با ویرگول جدا کنید)</CText>
        <TextInput
          value={topicsInput}
          onChangeText={setTopicsInput}
          textAlign="center"
          style={[
            styles.singleLineInput,
            {
              color: theme.textPrimary,
              borderColor: alphaColor(theme.primary, 0.24),
              backgroundColor: inputBackground,
            },
          ]}
        />
      </View>

      <View style={styles.group}>
        <CText style={[styles.label, { color: theme.textSecondary }]}>رویدادهای مناسبتی (اختیاری)</CText>
        <View style={styles.wrapRow}>
          {SPECIAL_DAYS.map((item) => {
            const selected = selectedSpecialDays.includes(item.key);
            return (
              <Pressable
                key={item.key}
                onPress={() => toggleSpecialDay(item.key)}
                style={[
                  styles.smallChip,
                  {
                    borderColor: selected
                      ? alphaColor(theme.primary, 0.46)
                      : alphaColor(theme.textSecondary, 0.24),
                    backgroundColor: selected
                      ? alphaColor(theme.primary, 0.16)
                      : theme.surface,
                  },
                ]}
              >
                <CText
                  style={[
                    styles.smallChipText,
                    { color: selected ? theme.primary : theme.textSecondary },
                  ]}
                >
                  {item.label}
                </CText>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.group}>
        <CText style={[styles.label, { color: theme.textSecondary }]}>بازه هجری (اختیاری)</CText>
        <View style={styles.inlineRow}>
          <View style={styles.inlineItem}>
            <CText style={[styles.subLabel, { color: theme.textSecondary }]}>ماه</CText>
            <TextInput
              value={hijriMonthInput}
              onChangeText={setHijriMonthInput}
              keyboardType="number-pad"
              textAlign="center"
              style={[
                styles.singleLineInput,
                {
                  color: theme.textPrimary,
                  borderColor: alphaColor(theme.primary, 0.24),
                  backgroundColor: inputBackground,
                },
              ]}
            />
          </View>
          <View style={styles.inlineItem}>
            <CText style={[styles.subLabel, { color: theme.textSecondary }]}>از روز</CText>
            <TextInput
              value={hijriDayStartInput}
              onChangeText={setHijriDayStartInput}
              keyboardType="number-pad"
              textAlign="center"
              style={[
                styles.singleLineInput,
                {
                  color: theme.textPrimary,
                  borderColor: alphaColor(theme.primary, 0.24),
                  backgroundColor: inputBackground,
                },
              ]}
            />
          </View>
          <View style={styles.inlineItem}>
            <CText style={[styles.subLabel, { color: theme.textSecondary }]}>تا روز</CText>
            <TextInput
              value={hijriDayEndInput}
              onChangeText={setHijriDayEndInput}
              keyboardType="number-pad"
              textAlign="center"
              style={[
                styles.singleLineInput,
                {
                  color: theme.textPrimary,
                  borderColor: alphaColor(theme.primary, 0.24),
                  backgroundColor: inputBackground,
                },
              ]}
            />
          </View>
        </View>
      </View>

      <Pressable
        onPress={() => setWeekdayFridayOnly((prev) => !prev)}
        style={[
          styles.optionButton,
          {
            alignSelf: 'center',
            minWidth: 180,
            borderColor: weekdayFridayOnly
              ? alphaColor(theme.primary, 0.46)
              : alphaColor(theme.textSecondary, 0.24),
            backgroundColor: weekdayFridayOnly
              ? alphaColor(theme.primary, 0.16)
              : theme.surface,
          },
        ]}
      >
        <CText
          style={[
            styles.optionText,
            { color: weekdayFridayOnly ? theme.primary : theme.textSecondary },
          ]}
        >
          فقط جمعه
        </CText>
      </Pressable>

      <Pressable
        onPress={handlePublish}
        disabled={isSubmitting}
        style={[
          styles.publishButton,
          {
            backgroundColor: alphaColor(theme.primary, 0.2),
            borderColor: alphaColor(theme.primary, 0.42),
            opacity: isSubmitting ? 0.7 : 1,
          },
        ]}
      >
        <CText style={[styles.publishButtonText, { color: theme.primary }]}>انتشار فوری حدیث</CText>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  content: {
    gap: 12,
    paddingBottom: 12,
  },
  sectionTitle: {
    fontFamily: 'Vazirmatn-Bold',
    fontSize: 16,
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  group: {
    gap: 6,
  },
  label: {
    fontFamily: 'Vazirmatn-Bold',
    fontSize: 12,
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  subLabel: {
    fontFamily: 'Vazirmatn',
    fontSize: 11,
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  multilineInput: {
    borderWidth: 1,
    borderRadius: 12,
    minHeight: 90,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontFamily: 'Vazirmatn',
    fontSize: 15,
    lineHeight: 25,
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  singleLineInput: {
    borderWidth: 1,
    borderRadius: 12,
    minHeight: 42,
    paddingHorizontal: 12,
    fontFamily: 'Vazirmatn',
    fontSize: 14,
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  rowButtons: {
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'center',
  },
  optionButton: {
    borderWidth: 1,
    borderRadius: 12,
    minHeight: 40,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionText: {
    fontFamily: 'Vazirmatn-Bold',
    fontSize: 13,
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  inlineRow: {
    flexDirection: 'row',
    gap: 8,
  },
  inlineItem: {
    flex: 1,
    gap: 6,
  },
  wrapRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
  },
  smallChip: {
    borderWidth: 1,
    borderRadius: 999,
    minHeight: 34,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  smallChipText: {
    fontFamily: 'Vazirmatn',
    fontSize: 12,
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  publishButton: {
    borderWidth: 1,
    borderRadius: 14,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  publishButtonText: {
    fontFamily: 'Vazirmatn-Bold',
    fontSize: 14,
    textAlign: 'center',
    writingDirection: 'rtl',
  },
});
