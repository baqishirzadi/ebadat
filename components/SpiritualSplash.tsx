/**
 * Spiritual Splash Screen
 * Calm opening: greeting phase then loading until app is interactive.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Text, Dimensions, Linking, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import CenteredText from '@/components/CenteredText';
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

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const PHRASES = [
  {
    arabic: 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ',
    dari: 'به نام خداوند بخشنده مهربان',
    pashto: 'د بخښونکي مهربان الله په نوم',
  },
  {
    arabic: 'الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ',
    dari: 'ستایش خدایی را که پروردگار جهانیان است',
    pashto: 'ستاینه د الله ده چې د ټولو جهانونو پالونکی دی',
  },
  {
    arabic: 'لَا إِلَٰهَ إِلَّا اللَّهُ',
    dari: 'معبودی جز خدا نیست',
    pashto: 'هیڅ معبود نشته مګر الله',
  },
  {
    arabic: 'سُبْحَانَ اللَّهِ وَبِحَمْدِهِ',
    dari: 'پاک است خدا و ستایش او را',
    pashto: 'الله پاک دی او ستاینه یې ده',
  },
  {
    arabic: 'اللَّهُمَّ صَلِّ عَلَى مُحَمَّدٍ وَعَلَى آلِ مُحَمَّدٍ وَأَصْحَابِ مُحَمَّدٍ',
    dari: 'ای خداوند بزرگ، بر محمد، خاندان پاکش و یاران گرامی او درود و رحمت بفرست.',
    pashto: 'ای لوی خدا، پر محمد، د هغه پاک کورنۍ او د هغه ګران ملګرو برکت او رحمت ولیږه.',
  },
] as const;

const SPLASH_PHRASE = PHRASES[Math.floor(Math.random() * PHRASES.length)];
const SPLASH_VISIBLE_MS = 2400;
const SPLASH_FADE_MS = 400;

type SplashScreenPhase = 'greeting' | 'loading';

interface SpiritualSplashProps {
  onComplete: () => void;
  onReady?: () => void;
  onGreetingComplete?: () => void;
  dismiss?: boolean;
}

export function SpiritualSplash({
  onComplete,
  onReady,
  onGreetingComplete,
  dismiss = false,
}: SpiritualSplashProps) {
  const insets = useSafeAreaInsets();
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
    if (!hasReady) return;

    const exitTimeout = setTimeout(() => {
      if (greetingDoneRef.current) return;
      greetingDoneRef.current = true;
      setScreenPhase('loading');
      onGreetingComplete?.();
    }, SPLASH_VISIBLE_MS);

    return () => clearTimeout(exitTimeout);
  }, [hasReady, onGreetingComplete]);

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

  return (
    <Animated.View
      pointerEvents={isExiting ? 'none' : 'auto'}
      onLayout={handleLayout}
      style={[
        styles.container,
        containerStyle,
        { paddingTop: Math.max(48, insets.top + 12), paddingBottom: Math.max(16, insets.bottom + 8) },
      ]}
    >
      <LinearGradient
        colors={['#0a1f18', '#1a4d3e', '#0d2a20']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      {screenPhase === 'greeting' ? (
        <>
          <View style={styles.appNameSection}>
            <Text style={styles.appName}>عبادت</Text>
            <Text style={styles.appSubtitle}>قرآن کریم و اوقات نماز</Text>
          </View>

          <View style={styles.frameContainer}>
            <View style={styles.frame}>
              <View style={styles.frameContent}>
                <Text style={styles.arabicText}>{SPLASH_PHRASE.arabic}</Text>

                <View style={styles.decorativeLine}>
                  <View style={styles.lineLeft} />
                  <View style={styles.lineRight} />
                </View>

                <View style={styles.translationContainer}>
                  <CenteredText style={styles.dariText}>{SPLASH_PHRASE.dari}</CenteredText>
                  <CenteredText style={styles.pashtoText}>{SPLASH_PHRASE.pashto}</CenteredText>
                </View>
              </View>
            </View>
          </View>

          <View style={styles.creditContainer}>
            <View style={styles.creditCard}>
              <CenteredText style={styles.creditDeveloper}>سازنده شرکت نرم افزار</CenteredText>
              <Pressable
                onPress={() => Linking.openURL('https://www.afghan.dev').catch(() => {})}
                style={styles.creditLinkButton}
              >
                <CenteredText style={styles.creditLink}>WWW.AFGHAN.DEV</CenteredText>
              </Pressable>
            </View>
          </View>
        </>
      ) : (
        <View style={styles.loadingSection}>
          <Text style={styles.appName}>عبادت</Text>
          <Animated.View style={[styles.loadingRing, ringStyle]} />
          <CenteredText style={styles.loadingText}>در حال بارگذاری...</CenteredText>
        </View>
      )}
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
    fontFamily: 'Vazirmatn',
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  frameContainer: {
    flex: 1,
    width: SCREEN_WIDTH - 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    minHeight: 0,
  },
  frame: {
    width: '100%',
    maxWidth: SCREEN_WIDTH - 48,
    backgroundColor: 'rgba(13, 41, 32, 0.95)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.35)',
    padding: 20,
    overflow: 'hidden',
  },
  frameContent: {
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  arabicText: {
    fontSize: 27,
    color: '#fff',
    fontFamily: 'Amiri-Bold',
    textAlign: 'center',
    lineHeight: 54,
    writingDirection: 'rtl',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  decorativeLine: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 12,
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
  translationContainer: {
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  dariText: {
    fontSize: 18,
    color: GOLD_LIGHT,
    textAlign: 'center',
    lineHeight: 30,
    fontFamily: 'Amiri',
    writingDirection: 'rtl',
  },
  pashtoText: {
    fontSize: 18,
    color: `${GOLD_LIGHT}90`,
    textAlign: 'center',
    marginTop: 10,
    lineHeight: 36,
    fontFamily: 'NotoNastaliqUrdu',
    writingDirection: 'rtl',
  },
  appNameSection: {
    alignItems: 'center',
    paddingHorizontal: 24,
    marginBottom: 12,
    flexShrink: 0,
  },
  appName: {
    fontSize: 36,
    color: '#fff',
    fontFamily: 'Amiri-Bold',
    textAlign: 'center',
    letterSpacing: 1,
    writingDirection: 'rtl',
  },
  appSubtitle: {
    fontSize: 16,
    color: GOLD_LIGHT,
    marginTop: 8,
    fontFamily: 'Amiri',
    letterSpacing: 0.5,
    opacity: 0.95,
  },
  creditContainer: {
    marginHorizontal: 20,
    marginTop: 16,
    alignItems: 'center',
    flexShrink: 0,
  },
  creditCard: {
    backgroundColor: 'rgba(13, 41, 32, 0.9)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: `${GOLD}40`,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
    width: '100%',
  },
  creditDeveloper: {
    fontSize: 14,
    color: GOLD_LIGHT,
    lineHeight: 24,
    fontFamily: 'Amiri',
    fontWeight: '600',
    writingDirection: 'rtl',
    textAlign: 'center',
  },
  creditLinkButton: {
    marginTop: 2,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  creditLink: {
    fontSize: 13,
    color: GOLD,
    lineHeight: 18,
    fontFamily: 'Amiri-Bold',
    textAlign: 'center',
  },
});
