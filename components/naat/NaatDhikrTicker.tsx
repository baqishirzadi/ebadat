import React, { useEffect, useState } from 'react';
import { AccessibilityInfo, StyleSheet, Text } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { Typography } from '@/constants/theme';

const PHRASES = [
  'هو هو هو هو',
  'الله الله الله الله',
  'صلو علی النبی',
  'یا حبیب الله',
];

type Props = {
  playing: boolean;
  color: string;
};

export function NaatDhikrTicker({ playing, color }: Props) {
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(false);
  const opacity = useSharedValue(playing ? 1 : 0.55);
  const translateY = useSharedValue(0);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled()
      .then(setReduceMotion)
      .catch(() => setReduceMotion(false));
  }, []);

  useEffect(() => {
    if (!playing || reduceMotion) return;
    const timer = setInterval(() => {
      setPhraseIndex((current) => (current + 1) % PHRASES.length);
    }, 2200);
    return () => clearInterval(timer);
  }, [playing, reduceMotion]);

  useEffect(() => {
    if (!playing || reduceMotion) {
      opacity.value = withTiming(playing ? 0.8 : 0.45, { duration: 220 });
      translateY.value = withTiming(0, { duration: 220 });
      return;
    }

    opacity.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 700, easing: Easing.out(Easing.quad) }),
        withTiming(0.64, { duration: 900, easing: Easing.inOut(Easing.quad) }),
      ),
      -1,
      true,
    );
    translateY.value = withRepeat(
      withSequence(
        withTiming(-4, { duration: 900, easing: Easing.inOut(Easing.quad) }),
        withTiming(4, { duration: 900, easing: Easing.inOut(Easing.quad) }),
      ),
      -1,
      true,
    );
  }, [opacity, playing, reduceMotion, translateY]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View style={[styles.container, animatedStyle]}>
      <Text style={[styles.text, { color }]} numberOfLines={1}>
        {PHRASES[phraseIndex]}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    minHeight: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontFamily: 'Amiri',
    fontSize: Typography.ui.subtitle,
    textAlign: 'center',
    writingDirection: 'rtl',
  },
});
