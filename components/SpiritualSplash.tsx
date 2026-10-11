/**
 * Spiritual Splash Screen
 * Calm opening: greeting phase then loading until app is interactive.
 * The ayah stays in Arabic. Every other line follows the saved app language.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Text, Dimensions, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

import { Spacing } from '@/constants/theme';
import {
  getArabicBoldFontFamily,
  getArabicFontFamily,
  getDariFontFamily,
  getPashtoBoldFontFamily,
  getPashtoFontFamily,
} from '@/hooks/useFonts';
import { translateUi } from '@/utils/i18n/catalog';
import { isLatinLanguage, readPersistedAppLanguage } from '@/utils/i18n/languages';
import type { AppLanguage } from '@/types/quran';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const BRAND_MARK = require('@/assets/images/splash-icon.png');
const BRAND_MARK_SIZE = Math.min(128, Math.round(SCREEN_WIDTH * 0.28));

const PHRASES = [
  {
    arabic: 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ',
    dari: 'به نام خداوند بخشنده مهربان',
    pashto: 'د بخښونکي مهربان الله په نوم',
    english: 'In the name of Allah, the Most Gracious, the Most Merciful',
    turkish: 'Rahman ve Rahim olan Allah’ın adıyla',
  },
  {
    arabic: 'الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ',
    dari: 'ستایش خدایی را که پروردگار جهانیان است',
    pashto: 'ستاینه د الله ده چې د ټولو جهانونو پالونکی دی',
    english: 'All praise is due to Allah, Lord of all the worlds',
    turkish: 'Hamd, âlemlerin Rabbi olan Allah’a mahsustur',
  },
  {
    arabic: 'سُبْحَانَ اللَّهِ وَبِحَمْدِهِ',
    dari: 'پاک است خدا و ستایش او را',
    pashto: 'الله پاک دی او ستاینه یې ده',
    english: 'Glory be to Allah, and praise be to Him',
    turkish: 'Allah’ı tesbih eder ve O’na hamdederim',
  },
  {
    arabic: 'اللَّهُمَّ صَلِّ عَلَى مُحَمَّدٍ وَعَلَى آلِ مُحَمَّدٍ وَأَصْحَابِ مُحَمَّدٍ',
    dari: 'ای خداوند بزرگ، بر محمد، خاندان پاکش و یاران گرامی او درود و رحمت بفرست.',
    pashto: 'ای لوی خدا، پر محمد، د هغه پاک کورنۍ او د هغه ګران ملګرو برکت او رحمت ولیږه.',
    english: 'O Allah, send Your blessings upon Muhammad, upon his family, and upon his companions.',
    turkish: 'Allah’ım, Muhammed’e, onun ailesine ve ashabına salât eyle.',
  },
] as const;

/** Morning: basmala. Day: hamd. Evening: tasbih. Night: salawat. */
function phraseForHour(hour: number) {
  if (hour >= 5 && hour < 11) return PHRASES[0];
  if (hour >= 11 && hour < 16) return PHRASES[1];
  if (hour >= 16 && hour < 20) return PHRASES[2];
  return PHRASES[3];
}

const SPLASH_VISIBLE_MS = 2800;
const SPLASH_FADE_MS = 400;

type SplashScreenPhase = 'greeting' | 'loading';

interface SpiritualSplashProps {
  onComplete: () => void;
  onReady?: () => void;
  onGreetingComplete?: () => void;
  dismiss?: boolean;
}

type Dedication = { label: string; name: string };

const DEDICATION: Record<AppLanguage, Dedication> = {
  dari: { label: 'تقدیم', name: 'خلافت شیرزاد' },
  pashto: { label: 'تقدیم', name: 'خلافت شیرزاد' },
  arabic: { label: 'تقديم', name: 'خلافت شیرزاد' },
  english: { label: 'Presented by', name: 'Shirzad Caliphate' },
  turkish: { label: 'Takdim', name: 'Halafet Şirzad' },
};

function splashFontFamily(language: AppLanguage): string | undefined {
  if (language === 'pashto') return getPashtoFontFamily(undefined);
  if (language === 'arabic') return getArabicFontFamily();
  if (language === 'dari') return getDariFontFamily('vazirmatn');
  return undefined;
}

function splashBoldFontFamily(language: AppLanguage): string | undefined {
  if (language === 'pashto') return getPashtoBoldFontFamily(undefined);
  if (language === 'arabic') return getArabicBoldFontFamily();
  if (language === 'dari') return 'Vazirmatn-Bold';
  return undefined;
}

function DedicationCard({ language }: { language: AppLanguage }) {
  const dedication = DEDICATION[language];
  const latin = isLatinLanguage(language);
  const fontFamily = splashFontFamily(language);

  return (
    <View style={styles.creditContainer}>
      <View style={styles.creditCard}>
        <Text
          style={[
            styles.dedicationLabel,
            {
              fontFamily,
              writingDirection: latin ? 'ltr' : 'rtl',
            },
          ]}
        >
          {dedication.label}
        </Text>
        <Text
          style={[
            styles.dedicationName,
            latin ? styles.dedicationNameLatin : { fontFamily: splashBoldFontFamily(language) },
            { writingDirection: latin ? 'ltr' : 'rtl' },
          ]}
        >
          {dedication.name}
        </Text>
      </View>
    </View>
  );
}

export function SpiritualSplash({
  onComplete,
  onReady,
  onGreetingComplete,
  dismiss = false,
}: SpiritualSplashProps) {
  const insets = useSafeAreaInsets();
  const [language, setLanguage] = useState<AppLanguage | null>(null);
  const [phrase] = useState(() => phraseForHour(new Date().getHours()));
  const [screenPhase, setScreenPhase] = useState<SplashScreenPhase>('greeting');
  const [isExiting, setIsExiting] = useState(false);
  const [hasReady, setHasReady] = useState(false);
  const completedRef = useRef(false);
  const readyRef = useRef(false);
  const greetingDoneRef = useRef(false);

  const opacity = useSharedValue(1);
  const spin = useSharedValue(0);

  const finish = useCallback(() => {
    if (completedRef.current) return;
    completedRef.current = true;
    onComplete();
  }, [onComplete]);

  const beginExit = useCallback(() => {
    if (completedRef.current) return;
    setIsExiting(true);
    opacity.value = withTiming(0, { duration: SPLASH_FADE_MS, easing: Easing.out(Easing.cubic) }, (finished) => {
      if (finished) {
        runOnJS(finish)();
      }
    });
  }, [finish, opacity]);

  const handleLayout = useCallback(() => {
    if (readyRef.current) return;
    readyRef.current = true;
    setHasReady(true);
    onReady?.();
  }, [onReady]);

  useEffect(() => {
    let cancelled = false;
    readPersistedAppLanguage().then((saved) => {
      if (!cancelled) setLanguage(saved);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!hasReady || !language) return;

    const exitTimeout = setTimeout(() => {
      if (greetingDoneRef.current) return;
      greetingDoneRef.current = true;
      setScreenPhase('loading');
      onGreetingComplete?.();
    }, SPLASH_VISIBLE_MS);

    return () => clearTimeout(exitTimeout);
  }, [hasReady, language, onGreetingComplete]);

  useEffect(() => {
    if (screenPhase !== 'loading') return;
    spin.value = withRepeat(withTiming(360, { duration: 1200, easing: Easing.linear }), -1, false);
  }, [screenPhase, spin]);

  useEffect(() => {
    if (dismiss && screenPhase === 'loading') {
      beginExit();
    }
  }, [beginExit, dismiss, screenPhase]);

  const containerStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${spin.value}deg` }],
  }));

  const latin = language ? isLatinLanguage(language) : false;
  const uiFont = language ? splashFontFamily(language) : undefined;
  const translation = language && language !== 'arabic' ? phrase[language] : null;

  return (
    <Animated.View
      testID="spiritual-splash-overlay"
      pointerEvents={isExiting ? 'none' : 'auto'}
      onLayout={handleLayout}
      style={[
        styles.container,
        containerStyle,
        { paddingTop: Math.max(48, insets.top + 12), paddingBottom: Math.max(16, insets.bottom + 8) },
      ]}
    >
      <LinearGradient
        colors={['#19452c', '#19452c', '#19452c']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      {language && screenPhase === 'greeting' ? (
        <>
          <View style={styles.appNameSection}>
            <Image
              source={BRAND_MARK}
              style={styles.brandMark}
              resizeMode="contain"
              accessibilityIgnoresInvertColors
            />
            <Text
              style={[
                styles.appName,
                latin ? styles.appNameLatin : { fontFamily: splashBoldFontFamily(language) },
              ]}
            >
              {translateUi('app.brandName', language)}
            </Text>
            <Text
              style={[
                styles.appSubtitle,
                {
                  fontFamily: uiFont,
                  writingDirection: latin ? 'ltr' : 'rtl',
                  lineHeight: language === 'pashto' ? 36 : 28,
                },
              ]}
            >
              {translateUi('app.splash.subtitle', language)}
            </Text>
          </View>

          <View style={styles.frameContainer}>
            <View style={styles.frame}>
              <View style={styles.frameContent}>
                <Text style={styles.arabicText}>{phrase.arabic}</Text>

                {translation ? (
                  <>
                    <View style={styles.decorativeLine}>
                      <View style={styles.lineLeft} />
                      <View style={styles.lineRight} />
                    </View>
                    <Text
                      style={[
                        styles.translationText,
                        {
                          fontFamily: uiFont,
                          writingDirection: latin ? 'ltr' : 'rtl',
                          lineHeight: language === 'pashto' ? 40 : latin ? 24 : 30,
                        },
                      ]}
                    >
                      {translation}
                    </Text>
                  </>
                ) : null}
              </View>
            </View>
          </View>

          <DedicationCard language={language} />
        </>
      ) : null}

      {language && screenPhase === 'loading' ? (
        <>
          <View style={styles.loadingSection}>
            <Image
              source={BRAND_MARK}
              style={styles.brandMark}
              resizeMode="contain"
              accessibilityIgnoresInvertColors
            />
            <Text style={[styles.appName, latin ? styles.appNameLatin : { fontFamily: splashBoldFontFamily(language) }]}>
              {translateUi('app.brandName', language)}
            </Text>
            <Animated.View style={[styles.loadingRing, ringStyle]} />
            <Text
              style={[
                styles.loadingText,
                {
                  fontFamily: uiFont,
                  writingDirection: latin ? 'ltr' : 'rtl',
                  lineHeight: language === 'pashto' ? 36 : 28,
                },
              ]}
            >
              {translateUi('common.loading', language)}
            </Text>
          </View>
          <DedicationCard language={language} />
        </>
      ) : null}
    </Animated.View>
  );
}

const GOLD = '#D4AF37';
const GOLD_LIGHT = '#E8D48A';

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 16,
    zIndex: 1000,
  },
  loadingSection: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.lg,
    paddingHorizontal: 24,
  },
  loadingRing: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 3,
    borderColor: `${GOLD}33`,
    borderTopColor: GOLD,
    borderRightColor: GOLD_LIGHT,
  },
  loadingText: {
    fontSize: 16,
    color: GOLD_LIGHT,
    textAlign: 'center',
    includeFontPadding: true,
  },
  frameContainer: {
    flex: 1,
    width: SCREEN_WIDTH - 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    minHeight: 0,
  },
  frame: {
    width: '100%',
    maxWidth: SCREEN_WIDTH - 48,
    backgroundColor: 'rgba(13, 41, 32, 0.95)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.35)',
    padding: 16,
    overflow: 'hidden',
  },
  frameContent: {
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  arabicText: {
    fontSize: 24,
    color: '#fff',
    fontFamily: 'Amiri-Bold',
    textAlign: 'center',
    lineHeight: 48,
    writingDirection: 'rtl',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  decorativeLine: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 10,
    width: '80%',
    gap: 0,
  },
  lineLeft: {
    flex: 1,
    height: 1,
    backgroundColor: `${GOLD}40`,
  },
  lineRight: {
    flex: 1,
    height: 1,
    backgroundColor: `${GOLD}40`,
  },
  translationText: {
    fontSize: 16,
    color: GOLD_LIGHT,
    textAlign: 'center',
    includeFontPadding: true,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  appNameSection: {
    alignItems: 'center',
    paddingHorizontal: 24,
    marginBottom: 8,
    flexShrink: 0,
  },
  brandMark: {
    width: BRAND_MARK_SIZE,
    height: BRAND_MARK_SIZE,
    marginBottom: 10,
    borderRadius: 24,
  },
  appName: {
    fontSize: 36,
    color: '#fff',
    fontFamily: 'Amiri-Bold',
    textAlign: 'center',
    letterSpacing: 1,
    writingDirection: 'rtl',
  },
  appNameLatin: {
    writingDirection: 'ltr',
    fontFamily: undefined,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  appSubtitle: {
    fontSize: 16,
    color: GOLD_LIGHT,
    marginTop: 8,
    letterSpacing: 0.5,
    opacity: 0.95,
    textAlign: 'center',
    includeFontPadding: true,
  },
  creditContainer: {
    alignSelf: 'stretch',
    marginHorizontal: 48,
    marginTop: 4,
    flexShrink: 0,
  },
  creditCard: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(212, 175, 55, 0.55)',
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: 'center',
    gap: 2,
    width: '100%',
  },
  dedicationLabel: {
    width: '100%',
    fontSize: 12,
    color: 'rgba(232, 212, 138, 0.72)',
    textAlign: 'center',
    includeFontPadding: true,
  },
  dedicationName: {
    width: '100%',
    color: GOLD,
    fontSize: 18,
    textAlign: 'center',
    includeFontPadding: true,
  },
  dedicationNameLatin: {
    fontWeight: '700',
  },
});
