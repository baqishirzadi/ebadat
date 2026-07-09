/**
 * Spiritual Splash Screen
 * Shows a beautiful Islamic greeting on app launch
 * With elegant golden frame design
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Text, Dimensions, Linking, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import CenteredText from '@/components/CenteredText';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  withSequence,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

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
const SPLASH_VISIBLE_MS = 2800;
const SPLASH_FADE_MS = 400;

interface SpiritualSplashProps {
  onComplete: () => void;
  onReady?: () => void;
}

const GoldenCorner = ({ position }: { position: 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight' }) => {
  const rotations = {
    topLeft: '0deg',
    topRight: '90deg',
    bottomRight: '180deg',
    bottomLeft: '270deg',
  };

  return (
    <View style={[styles.cornerContainer, styles[position]]}>
      <View style={[styles.corner, { transform: [{ rotate: rotations[position] }] }]}>
        <View style={styles.cornerOuter} />
        <View style={styles.cornerInner} />
        <View style={styles.cornerDot} />
      </View>
    </View>
  );
};

export function SpiritualSplash({ onComplete, onReady }: SpiritualSplashProps) {
  const insets = useSafeAreaInsets();
  const [isExiting, setIsExiting] = useState(false);
  const completedRef = useRef(false);
  const readyRef = useRef(false);

  const opacity = useSharedValue(1);
  const frameScale = useSharedValue(0.9);
  const appNameOpacity = useSharedValue(1);
  const appNameScale = useSharedValue(0.95);
  const arabicOpacity = useSharedValue(1);
  const translationOpacity = useSharedValue(1);
  const creditOpacity = useSharedValue(1);
  const glowOpacity = useSharedValue(0);

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
    onReady?.();
  }, [onReady]);

  useEffect(() => {
    appNameOpacity.value = withDelay(50, withTiming(1, { duration: 380, easing: Easing.out(Easing.cubic) }));
    appNameScale.value = withDelay(
      100,
      withSequence(
        withTiming(1.03, { duration: 260, easing: Easing.out(Easing.cubic) }),
        withTiming(1, { duration: 150 })
      )
    );
    frameScale.value = withSequence(
      withDelay(130, withTiming(1.01, { duration: 260, easing: Easing.out(Easing.cubic) })),
      withTiming(1, { duration: 150 })
    );
    glowOpacity.value = withDelay(140, withTiming(1, { duration: 500 }));
    arabicOpacity.value = withDelay(180, withTiming(1, { duration: 320 }));
    translationOpacity.value = withDelay(280, withTiming(1, { duration: 320 }));
    creditOpacity.value = withDelay(360, withTiming(1, { duration: 320 }));

    const exitTimeout = setTimeout(beginExit, SPLASH_VISIBLE_MS);
    const hardTimeout = setTimeout(beginExit, 4500);

    return () => {
      clearTimeout(exitTimeout);
      clearTimeout(hardTimeout);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const containerStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const frameStyle = useAnimatedStyle(() => ({
    transform: [{ scale: frameScale.value }],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value * 0.6,
  }));

  const arabicStyle = useAnimatedStyle(() => ({
    opacity: arabicOpacity.value,
  }));

  const translationStyle = useAnimatedStyle(() => ({
    opacity: translationOpacity.value,
  }));

  const creditStyle = useAnimatedStyle(() => ({
    opacity: creditOpacity.value,
  }));

  const appNameStyle = useAnimatedStyle(() => ({
    opacity: appNameOpacity.value,
    transform: [{ scale: appNameScale.value }],
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

      <Animated.View style={[styles.appNameSection, appNameStyle]}>
        <Text style={styles.appName}>عبادت</Text>
        <Text style={styles.appSubtitle}>قرآن کریم و اوقات نماز</Text>
      </Animated.View>

      <View style={styles.patternContainer}>
        {[...Array(8)].map((_, i) => (
          <View
            key={i}
            style={[
              styles.patternCircle,
              {
                top: `${15 + i * 10}%`,
                left: i % 2 === 0 ? '-20%' : undefined,
                right: i % 2 === 1 ? '-20%' : undefined,
                opacity: 0.03,
              },
            ]}
          />
        ))}
      </View>

      <Animated.View style={[styles.frameContainer, frameStyle]}>
        <Animated.View style={[styles.frameGlow, glowStyle]} />

        <View style={styles.frame}>
          <GoldenCorner position="topLeft" />
          <GoldenCorner position="topRight" />
          <GoldenCorner position="bottomLeft" />
          <GoldenCorner position="bottomRight" />

          <View style={styles.frameBorderTop} />
          <View style={styles.frameBorderBottom} />
          <View style={styles.frameBorderLeft} />
          <View style={styles.frameBorderRight} />

          <View style={styles.frameContent}>
            <Text style={styles.starDecoration}>✦</Text>

            <Animated.View style={arabicStyle}>
              <Text style={styles.arabicText}>{SPLASH_PHRASE.arabic}</Text>
            </Animated.View>

            <View style={styles.decorativeLine}>
              <View style={styles.lineLeft} />
              <Text style={styles.lineCenter}>۞</Text>
              <View style={styles.lineRight} />
            </View>

            <Animated.View style={[styles.translationContainer, translationStyle]}>
              <CenteredText style={styles.dariText}>{SPLASH_PHRASE.dari}</CenteredText>
              <CenteredText style={styles.pashtoText}>{SPLASH_PHRASE.pashto}</CenteredText>
            </Animated.View>
          </View>
        </View>
      </Animated.View>

      <Animated.View style={[styles.creditContainer, creditStyle]}>
        <View style={styles.creditCard}>
          <CenteredText style={styles.creditDeveloper}>سازنده شرکت نرم افزار</CenteredText>
          <Pressable
            onPress={() => Linking.openURL('https://www.afghan.dev').catch(() => {})}
            style={styles.creditLinkButton}
          >
            <CenteredText style={styles.creditLink}>WWW.AFGHAN.DEV</CenteredText>
          </Pressable>
        </View>
      </Animated.View>
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
  patternContainer: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  patternCircle: {
    position: 'absolute',
    width: SCREEN_WIDTH * 0.8,
    height: SCREEN_WIDTH * 0.8,
    borderRadius: SCREEN_WIDTH * 0.4,
    borderWidth: 1,
    borderColor: GOLD,
  },
  frameContainer: {
    flex: 1,
    width: SCREEN_WIDTH - 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    minHeight: 0,
  },
  frameGlow: {
    position: 'absolute',
    top: -10,
    left: -10,
    right: -10,
    bottom: -10,
    borderRadius: 20,
    backgroundColor: GOLD,
    shadowColor: GOLD,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 30,
    elevation: 20,
  },
  frame: {
    width: '100%',
    maxWidth: SCREEN_WIDTH - 48,
    backgroundColor: 'rgba(13, 41, 32, 0.95)',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: GOLD,
    padding: 20,
    position: 'relative',
    overflow: 'hidden',
  },
  cornerContainer: {
    position: 'absolute',
    width: 40,
    height: 40,
    zIndex: 10,
  },
  topLeft: {
    top: -2,
    left: -2,
  },
  topRight: {
    top: -2,
    right: -2,
  },
  bottomLeft: {
    bottom: -2,
    left: -2,
  },
  bottomRight: {
    bottom: -2,
    right: -2,
  },
  corner: {
    width: 40,
    height: 40,
    position: 'relative',
  },
  cornerOuter: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 30,
    height: 30,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderColor: GOLD_LIGHT,
    borderTopLeftRadius: 8,
  },
  cornerInner: {
    position: 'absolute',
    top: 8,
    left: 8,
    width: 15,
    height: 15,
    borderTopWidth: 2,
    borderLeftWidth: 2,
    borderColor: GOLD,
    borderTopLeftRadius: 4,
  },
  cornerDot: {
    position: 'absolute',
    top: 5,
    left: 5,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: GOLD_LIGHT,
  },
  frameBorderTop: {
    position: 'absolute',
    top: 8,
    left: 45,
    right: 45,
    height: 1,
    backgroundColor: `${GOLD}40`,
  },
  frameBorderBottom: {
    position: 'absolute',
    bottom: 8,
    left: 45,
    right: 45,
    height: 1,
    backgroundColor: `${GOLD}40`,
  },
  frameBorderLeft: {
    position: 'absolute',
    left: 8,
    top: 45,
    bottom: 45,
    width: 1,
    backgroundColor: `${GOLD}40`,
  },
  frameBorderRight: {
    position: 'absolute',
    right: 8,
    top: 45,
    bottom: 45,
    width: 1,
    backgroundColor: `${GOLD}40`,
  },
  frameContent: {
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  starDecoration: {
    color: GOLD,
    fontSize: 16,
    marginBottom: 8,
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
  },
  lineLeft: {
    flex: 1,
    height: 1,
    backgroundColor: `${GOLD}60`,
  },
  lineCenter: {
    color: GOLD,
    fontSize: 20,
    marginHorizontal: 12,
  },
  lineRight: {
    flex: 1,
    height: 1,
    backgroundColor: `${GOLD}60`,
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
    fontSize: 44,
    color: '#fff',
    fontFamily: 'Amiri-Bold',
    textAlign: 'center',
    letterSpacing: 1.2,
    textShadowColor: 'rgba(212, 175, 55, 0.4)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 12,
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
