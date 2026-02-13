/**
 * Spiritual Splash Screen
 * Shows a beautiful Islamic greeting on app launch
 * With elegant golden frame design
 */

import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Text, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import CenteredText from '@/components/CenteredText';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  withSequence,
  withDelay,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Spiritual phrases to show randomly
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
];

interface SpiritualSplashProps {
  onComplete: () => void;
}

// Golden corner decoration component
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

export function SpiritualSplash({ onComplete }: SpiritualSplashProps) {
  const insets = useSafeAreaInsets();
  const [phrase] = useState(() => PHRASES[Math.floor(Math.random() * PHRASES.length)]);
  
  const opacity = useSharedValue(0);
  const frameScale = useSharedValue(0.9);
  const appNameOpacity = useSharedValue(0);
  const appNameScale = useSharedValue(0.95);
  const arabicOpacity = useSharedValue(0);
  const translationOpacity = useSharedValue(0);
  const creditOpacity = useSharedValue(0);
  const glowOpacity = useSharedValue(0);

  useEffect(() => {
    // Animate in sequence
    opacity.value = withTiming(1, { duration: 500, easing: Easing.out(Easing.cubic) });
    appNameOpacity.value = withDelay(100, withTiming(1, { duration: 600, easing: Easing.out(Easing.cubic) }));
    appNameScale.value = withDelay(100, withSequence(
      withTiming(1.05, { duration: 400, easing: Easing.out(Easing.cubic) }),
      withTiming(1, { duration: 200 })
    ));
    frameScale.value = withSequence(
      withDelay(300, withTiming(1.02, { duration: 400, easing: Easing.out(Easing.cubic) })),
      withTiming(1, { duration: 200 })
    );
    glowOpacity.value = withDelay(400, withTiming(1, { duration: 600 }));
    arabicOpacity.value = withDelay(500, withTiming(1, { duration: 500 }));
    translationOpacity.value = withDelay(800, withTiming(1, { duration: 500 }));
    creditOpacity.value = withDelay(1100, withTiming(1, { duration: 600 }));

    // Fade out and complete
    const timeout = setTimeout(() => {
      opacity.value = withTiming(0, { duration: 400 }, (finished) => {
        if (finished) {
          runOnJS(onComplete)();
        }
      });
    }, 3500);

    return () => clearTimeout(timeout);
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
    <Animated.View style={[styles.container, containerStyle, { paddingTop: Math.max(48, insets.top + 12), paddingBottom: Math.max(16, insets.bottom + 8) }]}>
      {/* Gradient Background */}
      <LinearGradient
        colors={['#0a1f18', '#1a4d3e', '#0d2a20']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      {/* App Name - Prominent at top */}
      <Animated.View style={[styles.appNameSection, appNameStyle]}>
        <Text style={styles.appName}>عبادت</Text>
        <Text style={styles.appSubtitle}>قرآن کریم و اوقات نماز</Text>
      </Animated.View>

      {/* Subtle geometric pattern */}
      <View style={styles.patternContainer}>
        {[...Array(8)].map((_, i) => (
          <View
            key={i}
            style={[
              styles.patternCircle,
              {
                top: `${15 + (i * 10)}%`,
                left: i % 2 === 0 ? '-20%' : undefined,
                right: i % 2 === 1 ? '-20%' : undefined,
                opacity: 0.03,
              },
            ]}
          />
        ))}
      </View>

      {/* Main Content Frame */}
      <Animated.View style={[styles.frameContainer, frameStyle]}>
        {/* Golden glow effect */}
        <Animated.View style={[styles.frameGlow, glowStyle]} />
        
        {/* Golden Frame */}
        <View style={styles.frame}>
          {/* Corner Decorations */}
          <GoldenCorner position="topLeft" />
          <GoldenCorner position="topRight" />
          <GoldenCorner position="bottomLeft" />
          <GoldenCorner position="bottomRight" />
          
          {/* Frame Border Lines */}
          <View style={styles.frameBorderTop} />
          <View style={styles.frameBorderBottom} />
          <View style={styles.frameBorderLeft} />
          <View style={styles.frameBorderRight} />

          {/* Inner Content */}
          <View style={styles.frameContent}>
            {/* Star decoration above */}
            <Text style={styles.starDecoration}>✦</Text>
            
            {/* Arabic Text */}
            <Animated.View style={arabicStyle}>
              <Text style={styles.arabicText}>
                {phrase.arabic}
              </Text>
            </Animated.View>

            {/* Decorative line */}
            <View style={styles.decorativeLine}>
              <View style={styles.lineLeft} />
              <Text style={styles.lineCenter}>۞</Text>
              <View style={styles.lineRight} />
            </View>

            {/* Translations */}
            <Animated.View style={[styles.translationContainer, translationStyle]}>
              <CenteredText style={styles.dariText}>{phrase.dari}</CenteredText>
              <CenteredText style={styles.pashtoText}>{phrase.pashto}</CenteredText>
            </Animated.View>
          </View>
        </View>
      </Animated.View>

      {/* Developer Credit */}
      <Animated.View style={[styles.creditContainer, creditStyle]}>
        <View style={styles.creditCard}>
          <CenteredText style={styles.creditIntro}>
            برای تسهیل عبادات مردم شریف افغانستان
          </CenteredText>
          <View style={styles.creditDivider} />
          <CenteredText style={styles.creditDeveloper}>
            سیدعبدالباقی ابن سیدعبدالاله (عارف بالله)
          </CenteredText>
          <CenteredText style={styles.creditLineage}>
            ابن خلیفه صاحب سیدمحمد یتیم شیرزادی (رحمه‌الله)
          </CenteredText>
          <CenteredText style={styles.creditDua}>
            انشاءالله قبول درگاه حق تعالی باشد
          </CenteredText>
        </View>
      </Animated.View>
    </Animated.View>
  );
}

const GOLD = '#D4AF37';
const GOLD_LIGHT = '#E8D48A';
const GOLD_DARK = '#B8960C';

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
  // Corner decorations
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
  // Frame border lines
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
    fontSize: 18,
    marginBottom: 12,
  },
  arabicText: {
    fontSize: 28,
    color: '#fff',
    fontFamily: 'QuranFont',
    textAlign: 'center',
    lineHeight: 58,
    writingDirection: 'rtl',
    paddingHorizontal: 8,
    paddingVertical: 8,
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
    fontSize: 16,
    color: GOLD_LIGHT,
    textAlign: 'center',
    lineHeight: 28,
    fontFamily: 'Vazirmatn',
    writingDirection: 'rtl',
  },
  pashtoText: {
    fontSize: 14,
    color: `${GOLD_LIGHT}90`,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 32,
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
    fontSize: 48,
    color: '#fff',
    fontFamily: 'ScheherazadeNew',
    textAlign: 'center',
    letterSpacing: 2,
    textShadowColor: 'rgba(212, 175, 55, 0.4)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 12,
    writingDirection: 'rtl',
  },
  appSubtitle: {
    fontSize: 14,
    color: GOLD_LIGHT,
    marginTop: 8,
    fontFamily: 'Vazirmatn',
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
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: 'center',
    width: '100%',
  },
  creditIntro: {
    fontSize: 11,
    color: `${GOLD_LIGHT}cc`,
    lineHeight: 18,
    fontFamily: 'Vazirmatn',
    writingDirection: 'rtl',
    textAlign: 'center',
  },
  creditDivider: {
    width: 48,
    height: 1,
    backgroundColor: `${GOLD}50`,
    marginVertical: 10,
  },
  creditDeveloper: {
    fontSize: 13,
    color: GOLD_LIGHT,
    lineHeight: 22,
    fontFamily: 'Vazirmatn',
    fontWeight: '600',
    writingDirection: 'rtl',
    textAlign: 'center',
  },
  creditLineage: {
    fontSize: 11,
    color: `${GOLD}cc`,
    lineHeight: 18,
    marginTop: 4,
    fontFamily: 'Vazirmatn',
    writingDirection: 'rtl',
    textAlign: 'center',
  },
  creditDua: {
    fontSize: 10,
    color: `${GOLD}99`,
    marginTop: 8,
    fontFamily: 'Vazirmatn',
    fontStyle: 'italic',
    writingDirection: 'rtl',
    textAlign: 'center',
  },
});
