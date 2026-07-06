import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';

import { useApp } from '@/context/AppContext';
import type { QiblaAccuracyLevel } from '@/hooks/useQiblaHeading';

interface QiblaStatusPillProps {
  accuracyLevel: QiblaAccuracyLevel;
  isDegraded: boolean;
  headingLabel: string;
  qiblaLabel: string;
}

export function QiblaStatusPill({ accuracyLevel, isDegraded, headingLabel, qiblaLabel }: QiblaStatusPillProps) {
  const { theme } = useApp();

  const accuracyText =
    accuracyLevel === 'high' ? 'دقت بالا' : accuracyLevel === 'medium' ? 'دقت متوسط' : 'دقت پایین';

  return (
    <View style={styles.row}>
      <View style={[styles.pill, { backgroundColor: theme.backgroundSecondary, borderColor: theme.cardBorder }]}>
        <Text style={[styles.text, { color: theme.text }]}>جهت: {headingLabel}°</Text>
      </View>
      <View style={[styles.pill, { backgroundColor: theme.backgroundSecondary, borderColor: theme.cardBorder }]}>
        <Text style={[styles.text, { color: theme.tint }]}>قبله: {qiblaLabel}°</Text>
      </View>
      {isDegraded ? (
        <View style={[styles.pill, { backgroundColor: theme.backgroundSecondary, borderColor: theme.accent }]}>
          <Text style={[styles.text, { color: theme.accent }]}>دقت پایین</Text>
        </View>
      ) : (
        <View style={[styles.pill, { backgroundColor: theme.backgroundSecondary, borderColor: theme.cardBorder }]}>
          <Text style={[styles.text, { color: theme.textSecondary }]}>{accuracyText}</Text>
        </View>
      )}
    </View>
  );
}

interface QiblaNeedleProps {
  size: number;
  needleRotation: Animated.SharedValue<number>;
  isAligned: boolean;
}

export function QiblaNeedle({ size, needleRotation, isAligned }: QiblaNeedleProps) {
  const { theme } = useApp();
  const style = useAnimatedStyle(() => ({
    transform: [{ rotate: `${needleRotation.value}deg` }],
  }));

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          width: size,
          height: size,
          alignItems: 'center',
          justifyContent: 'flex-start',
          paddingTop: size * 0.12,
        },
        style,
      ]}
    >
      <View
        style={{
          width: 4,
          height: size * 0.34,
          borderRadius: 2,
          backgroundColor: isAligned ? theme.accent : theme.tint,
          shadowColor: isAligned ? theme.accent : 'transparent',
          shadowOpacity: isAligned ? 0.8 : 0,
          shadowRadius: 8,
        }}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 16,
  },
  pill: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  text: {
    fontFamily: 'Vazirmatn-Bold',
    fontSize: 12,
    textAlign: 'center',
    writingDirection: 'rtl',
  },
});
