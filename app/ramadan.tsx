/**
 * Ramadan Planner Screen
 * Daily Quran goals and duas
 */

import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView, Pressable } from 'react-native';
import { Stack } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useApp } from '@/context/AppContext';
import { useStats } from '@/context/StatsContext';
import { Typography, Spacing, BorderRadius } from '@/constants/theme';
import CenteredText from '@/components/CenteredText';

// Arabic number conversion
const toArabicNumber = (num: number): string => {
  const arabicNumerals = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  return num.toString().split('').map(d => arabicNumerals[parseInt(d)]).join('');
};

// Daily Quran portions for completing in 30 days
const DAILY_PORTIONS = [
  { juz: 1, from: 'الفاتحة', to: 'البقرة ۱۴۱' },
  { juz: 2, from: 'البقرة ۱۴۲', to: 'البقرة ۲۵۲' },
  { juz: 3, from: 'البقرة ۲۵۳', to: 'آل عمران ۹۲' },
  { juz: 4, from: 'آل عمران ۹۳', to: 'النساء ۲۳' },
  { juz: 5, from: 'النساء ۲۴', to: 'النساء ۱۴۷' },
  { juz: 6, from: 'النساء ۱۴۸', to: 'المائدة ۸۱' },
  { juz: 7, from: 'المائدة ۸۲', to: 'الأنعام ۱۱۰' },
  { juz: 8, from: 'الأنعام ۱۱۱', to: 'الأعراف ۸۷' },
  { juz: 9, from: 'الأعراف ۸۸', to: 'الأنفال ۴۰' },
  { juz: 10, from: 'الأنفال ۴۱', to: 'التوبة ۹۲' },
  { juz: 11, from: 'التوبة ۹۳', to: 'هود ۵' },
  { juz: 12, from: 'هود ۶', to: 'يوسف ۵۲' },
  { juz: 13, from: 'يوسف ۵۳', to: 'إبراهيم ۵۲' },
  { juz: 14, from: 'الحجر ۱', to: 'النحل ۱۲۸' },
  { juz: 15, from: 'الإسراء ۱', to: 'الكهف ۷۴' },
  { juz: 16, from: 'الكهف ۷۵', to: 'طه ۱۳۵' },
  { juz: 17, from: 'الأنبياء ۱', to: 'الحج ۷۸' },
  { juz: 18, from: 'المؤمنون ۱', to: 'الفرقان ۲۰' },
  { juz: 19, from: 'الفرقان ۲۱', to: 'النمل ۵۵' },
  { juz: 20, from: 'النمل ۵۶', to: 'العنكبوت ۴۵' },
  { juz: 21, from: 'العنكبوت ۴۶', to: 'الأحزاب ۳۰' },
  { juz: 22, from: 'الأحزاب ۳۱', to: 'يس ۲۷' },
  { juz: 23, from: 'يس ۲۸', to: 'الزمر ۳۱' },
  { juz: 24, from: 'الزمر ۳۲', to: 'فصلت ۴۶' },
  { juz: 25, from: 'فصلت ۴۷', to: 'الجاثية ۳۷' },
  { juz: 26, from: 'الأحقاف ۱', to: 'الذاريات ۳۰' },
  { juz: 27, from: 'الذاريات ۳۱', to: 'الحديد ۲۹' },
  { juz: 28, from: 'المجادلة ۱', to: 'التحريم ۱۲' },
  { juz: 29, from: 'الملك ۱', to: 'المرسلات ۵۰' },
  { juz: 30, from: 'النبأ ۱', to: 'الناس' },
];

// Daily Ramadan Duas
const DAILY_DUAS = [
  { day: 1, arabic: 'اللَّهُمَّ اجْعَلْ صِيَامِي فِيهِ صِيَامَ الصَّائِمِينَ', dari: 'خدایا روزه‌ام را روزه روزه‌داران حقیقی قرار ده' },
  { day: 2, arabic: 'اللَّهُمَّ قَرِّبْنِي فِيهِ إِلَى مَرْضَاتِكَ', dari: 'خدایا مرا به رضایتت نزدیک گردان' },
  { day: 3, arabic: 'اللَّهُمَّ ارْزُقْنِي فِيهِ الذِّهْنَ وَالتَّنْبِيهَ', dari: 'خدایا به من هوشیاری و آگاهی عطا فرما' },
  { day: 4, arabic: 'اللَّهُمَّ قَوِّنِي فِيهِ عَلَى إِقَامَةِ أَمْرِكَ', dari: 'خدایا مرا در اجرای فرمانت توانا گردان' },
  { day: 5, arabic: 'اللَّهُمَّ اجْعَلْنِي فِيهِ مِنَ الْمُسْتَغْفِرِينَ', dari: 'خدایا مرا از استغفارکنندگان قرار ده' },
  { day: 6, arabic: 'اللَّهُمَّ لا تَخْذُلْنِي فِيهِ لِتَعَرُّضِ مَعْصِيَتِكَ', dari: 'خدایا مرا در برابر معصیت رها مکن' },
  { day: 7, arabic: 'اللَّهُمَّ أَعِنِّي فِيهِ عَلَى صِيَامِهِ وَقِيَامِهِ', dari: 'خدایا در روزه و قیامش یاریم کن' },
  { day: 8, arabic: 'اللَّهُمَّ ارْزُقْنِي فِيهِ رَحْمَةَ الأَيْتَامِ', dari: 'خدایا رحمت بر یتیمان را روزی‌ام کن' },
  { day: 9, arabic: 'اللَّهُمَّ اجْعَلْ لِي فِيهِ نَصِيبًا مِنْ رَحْمَتِكَ', dari: 'خدایا از رحمتت بهره‌ای نصیبم کن' },
  { day: 10, arabic: 'اللَّهُمَّ اجْعَلْنِي فِيهِ مِنَ الْمُتَوَكِّلِينَ عَلَيْكَ', dari: 'خدایا مرا از توکل‌کنندگان قرار ده' },
  { day: 11, arabic: 'اللَّهُمَّ حَبِّبْ إِلَيَّ فِيهِ الإِحْسَانَ', dari: 'خدایا نیکوکاری را محبوبم گردان' },
  { day: 12, arabic: 'اللَّهُمَّ زَيِّنِّي فِيهِ بِالسِّتْرِ وَالْعَفَافِ', dari: 'خدایا مرا به پوشیدگی و عفت بیارای' },
  { day: 13, arabic: 'اللَّهُمَّ طَهِّرْنِي فِيهِ مِنَ الدَّنَسِ وَالأَقْذَارِ', dari: 'خدایا از آلودگی‌ها پاکم گردان' },
  { day: 14, arabic: 'اللَّهُمَّ لا تُؤَاخِذْنِي فِيهِ بِالْعَثَرَاتِ', dari: 'خدایا به لغزش‌هایم مؤاخذه‌ام مکن' },
  { day: 15, arabic: 'اللَّهُمَّ ارْزُقْنِي فِيهِ طَاعَةَ الْخَاشِعِينَ', dari: 'خدایا اطاعت خاشعان را روزی‌ام کن' },
  { day: 16, arabic: 'اللَّهُمَّ وَفِّقْنِي فِيهِ لِمُوَافَقَةِ الأَبْرَارِ', dari: 'خدایا مرا به همراهی نیکان توفیق ده' },
  { day: 17, arabic: 'اللَّهُمَّ اهْدِنِي فِيهِ لِصَالِحِ الأَعْمَالِ', dari: 'خدایا به اعمال صالح هدایتم کن' },
  { day: 18, arabic: 'اللَّهُمَّ نَبِّهْنِي فِيهِ لِبَرَكَاتِ أَسْحَارِهِ', dari: 'خدایا از برکات سحرهایش آگاهم کن' },
  { day: 19, arabic: 'اللَّهُمَّ وَفِّرْ حَظِّي فِيهِ مِنْ بَرَكَاتِهِ', dari: 'خدایا بهره‌ام را از برکاتش فراوان کن' },
  { day: 20, arabic: 'اللَّهُمَّ افْتَحْ لِي فِيهِ أَبْوَابَ الْجِنَانِ', dari: 'خدایا درهای بهشت را برویم بگشا' },
  { day: 21, arabic: 'اللَّهُمَّ اجْعَلْ لِي فِيهِ إِلَى مَرْضَاتِكَ دَلِيلًا', dari: 'خدایا راهنمایی به رضایتت قرار ده' },
  { day: 22, arabic: 'اللَّهُمَّ افْتَحْ لِي فِيهِ أَبْوَابَ فَضْلِكَ', dari: 'خدایا درهای فضلت را برویم بگشا' },
  { day: 23, arabic: 'اللَّهُمَّ اغْسِلْنِي فِيهِ مِنَ الذُّنُوبِ', dari: 'خدایا مرا از گناهان بشوی' },
  { day: 24, arabic: 'اللَّهُمَّ إِنِّي أَسْأَلُكَ فِيهِ مَا يُرْضِيكَ', dari: 'خدایا آنچه خشنودت می‌کند می‌خواهم' },
  { day: 25, arabic: 'اللَّهُمَّ اجْعَلْنِي فِيهِ مُحِبًّا لأَوْلِيَائِكَ', dari: 'خدایا مرا دوستدار اولیایت قرار ده' },
  { day: 26, arabic: 'اللَّهُمَّ اجْعَلْ سَعْيِي فِيهِ مَشْكُورًا', dari: 'خدایا تلاشم را مورد قبول قرار ده' },
  { day: 27, arabic: 'اللَّهُمَّ ارْزُقْنِي فِيهِ فَضْلَ لَيْلَةِ الْقَدْرِ', dari: 'خدایا فضل شب قدر را نصیبم کن' },
  { day: 28, arabic: 'اللَّهُمَّ وَفِّرْ حَظِّي فِيهِ مِنَ النَّوَافِلِ', dari: 'خدایا بهره‌ام را از نوافل فراوان کن' },
  { day: 29, arabic: 'اللَّهُمَّ غَشِّنِي فِيهِ بِالرَّحْمَةِ', dari: 'خدایا مرا در رحمتت غرق کن' },
  { day: 30, arabic: 'اللَّهُمَّ اجْعَلْ صِيَامِي فِيهِ بِالشُّكْرِ وَالْقَبُولِ', dari: 'خدایا روزه‌ام را با شکر و قبول قرار ده' },
];

const STORAGE_KEY = '@ebadat/ramadan_progress';

export default function RamadanScreen() {
  const { theme } = useApp();
  const { updateRamadanDay } = useStats();
  const [completedDays, setCompletedDays] = useState<number[]>([]);
  const [selectedDay, setSelectedDay] = useState(1);

  useEffect(() => {
    loadProgress();
  }, []);

  async function loadProgress() {
    try {
      const saved = await AsyncStorage.getItem(STORAGE_KEY);
      if (saved) {
        setCompletedDays(JSON.parse(saved));
      }
    } catch (error) {
      console.error('Error loading progress:', error);
    }
  }

  const toggleDay = useCallback(async (day: number) => {
    setCompletedDays(prev => {
      const newProgress = prev.includes(day)
        ? prev.filter(d => d !== day)
        : [...prev, day];
      
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newProgress));
      updateRamadanDay(day, newProgress.includes(day) ? 1 : 0);
      return newProgress;
    });
  }, [updateRamadanDay]);

  const portion = DAILY_PORTIONS[selectedDay - 1];
  const dua = DAILY_DUAS[selectedDay - 1];
  const progress = (completedDays.length / 30) * 100;

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]}>
      <Stack.Screen
        options={{
          title: 'برنامه رمضان',
          headerStyle: { backgroundColor: theme.surahHeader },
          headerTintColor: '#fff',
        }}
      />

      {/* Progress Card */}
      <View style={[styles.progressCard, { backgroundColor: theme.tint }]}>
        <CenteredText style={styles.progressTitle}>پیشرفت ختم قرآن</CenteredText>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${progress}%` }]} />
        </View>
        <CenteredText style={styles.progressText}>
          {toArabicNumber(completedDays.length)} از ۳۰ جز
        </CenteredText>
      </View>

      {/* Day Selector */}
      <View style={styles.daySelector}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {[...Array(30)].map((_, i) => {
            const day = i + 1;
            const isCompleted = completedDays.includes(day);
            const isSelected = selectedDay === day;

            return (
              <Pressable
                key={day}
                onPress={() => setSelectedDay(day)}
                style={[
                  styles.dayButton,
                  { backgroundColor: theme.card, borderColor: isSelected ? theme.tint : theme.cardBorder },
                  isCompleted && { backgroundColor: `${theme.tint}20` },
                  isSelected && { borderWidth: 2 },
                ]}
              >
                <CenteredText style={[
                  styles.dayButtonText,
                  { color: isCompleted ? theme.tint : theme.text },
                ]}>
                  {toArabicNumber(day)}
                </CenteredText>
                {isCompleted && (
                  <MaterialIcons name="check" size={14} color={theme.tint} />
                )}
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* Selected Day Content */}
      <View style={styles.section}>
        <CenteredText style={[styles.sectionTitle, { color: theme.textSecondary }]}>
          روز {toArabicNumber(selectedDay)} رمضان
        </CenteredText>

        {/* Quran Portion */}
        <View style={[styles.portionCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
          <View style={styles.portionHeader}>
            <View style={[styles.juzBadge, { backgroundColor: theme.tint }]}>
              <CenteredText style={styles.juzText}>جز {toArabicNumber(portion.juz)}</CenteredText>
            </View>
            <Pressable
              onPress={() => toggleDay(selectedDay)}
              style={[
                styles.checkButton,
                { backgroundColor: completedDays.includes(selectedDay) ? theme.tint : 'transparent', borderColor: theme.tint },
              ]}
            >
              <MaterialIcons
                name={completedDays.includes(selectedDay) ? 'check' : 'check-box-outline-blank'}
                size={20}
                color={completedDays.includes(selectedDay) ? '#fff' : theme.tint}
              />
              <CenteredText style={[
                styles.checkButtonText,
                { color: completedDays.includes(selectedDay) ? '#fff' : theme.tint },
              ]}>
                {completedDays.includes(selectedDay) ? 'تکمیل شد' : 'علامت‌گذاری'}
              </CenteredText>
            </Pressable>
          </View>
          <View style={styles.portionRange}>
            <View style={styles.portionFrom}>
              <CenteredText style={[styles.portionLabel, { color: theme.textSecondary }]}>از</CenteredText>
              <CenteredText style={[styles.portionValue, { color: theme.text }]}>{portion.from}</CenteredText>
            </View>
            <MaterialIcons name="arrow-back" size={20} color={theme.icon} />
            <View style={styles.portionTo}>
              <CenteredText style={[styles.portionLabel, { color: theme.textSecondary }]}>تا</CenteredText>
              <CenteredText style={[styles.portionValue, { color: theme.text }]}>{portion.to}</CenteredText>
            </View>
          </View>
        </View>

        {/* Daily Dua */}
        <View style={[styles.duaCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
          <CenteredText style={[styles.duaTitle, { color: theme.textSecondary }]}>
            دعای روز {toArabicNumber(selectedDay)}
          </CenteredText>
          <CenteredText style={[styles.duaArabic, { color: theme.arabicText }]}>
            {dua.arabic}
          </CenteredText>
          <CenteredText style={[styles.duaDari, { color: theme.text }]}>
            {dua.dari}
          </CenteredText>
        </View>
      </View>

      {/* Tips */}
      <View style={[styles.tipsCard, { backgroundColor: `${theme.tint}10`, borderColor: theme.tint }]}>
        <MaterialIcons name="lightbulb" size={24} color={theme.tint} />
        <View style={styles.tipsContent}>
          <CenteredText style={[styles.tipsTitle, { color: theme.tint }]}>نکته</CenteredText>
          <CenteredText style={[styles.tipsText, { color: theme.text }]}>
            برای ختم قرآن در رمضان، هر روز حدود ۲۰ صفحه (یک جز) تلاوت کنید.
          </CenteredText>
        </View>
      </View>

      <View style={styles.bottomPadding} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  progressCard: {
    marginHorizontal: Spacing.md,
    marginTop: Spacing.md,
    padding: Spacing.lg,
    borderRadius: BorderRadius.xl,
  },
  progressTitle: {
    fontSize: Typography.ui.body,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
  },
  progressBar: {
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 4,
    marginTop: Spacing.md,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#fff',
    borderRadius: 4,
  },
  progressText: {
    fontSize: Typography.ui.subtitle,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
    marginTop: Spacing.sm,
  },
  daySelector: {
    marginTop: Spacing.lg,
    paddingHorizontal: Spacing.sm,
  },
  dayButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 4,
    borderWidth: 1,
  },
  dayButtonText: {
    fontSize: Typography.ui.body,
    fontWeight: '600',
  },
  section: {
    marginTop: Spacing.lg,
    paddingHorizontal: Spacing.md,
  },
  sectionTitle: {
    fontSize: Typography.ui.subtitle,
    fontWeight: '600',
    marginBottom: Spacing.md,
    textAlign: 'center',
  },
  portionCard: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
  },
  portionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  juzBadge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  juzText: {
    fontSize: Typography.ui.body,
    fontWeight: '600',
    color: '#fff',
  },
  checkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  checkButtonText: {
    fontSize: Typography.ui.caption,
    fontWeight: '600',
  },
  portionRange: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  portionFrom: {
    alignItems: 'flex-end',
  },
  portionTo: {
    alignItems: 'flex-start',
  },
  portionLabel: {
    fontSize: Typography.ui.caption,
  },
  portionValue: {
    fontSize: Typography.ui.body,
    fontWeight: '600',
    marginTop: 2,
  },
  duaCard: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    marginTop: Spacing.md,
  },
  duaTitle: {
    fontSize: Typography.ui.caption,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  duaArabic: {
    fontSize: Typography.arabic.small,
    textAlign: 'center',
    fontFamily: 'serif',
    lineHeight: 40,
    marginBottom: Spacing.md,
  },
  duaDari: {
    fontSize: Typography.ui.body,
    textAlign: 'center',
    lineHeight: 24,
  },
  tipsCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginHorizontal: Spacing.md,
    marginTop: Spacing.xl,
    padding: Spacing.lg,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    gap: Spacing.md,
  },
  tipsContent: {
    flex: 1,
  },
  tipsTitle: {
    fontSize: Typography.ui.body,
    fontWeight: '600',
    marginBottom: Spacing.xs,
  },
  tipsText: {
    fontSize: Typography.ui.caption,
    lineHeight: 20,
  },
  bottomPadding: {
    height: 40,
  },
});
