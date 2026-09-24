import React from 'react';

import { StyleSheet, View } from 'react-native';
import { LocalizedText } from '@/components/ui/LocalizedText';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';

import { useApp } from '@/context/AppContext';
import type { QiblaAccuracyLevel } from '@/hooks/useQiblaHeading';
import { useI18n } from '@/utils/i18n/useI18n';

interface QiblaStatusPillProps {
  accuracyLevel: QiblaAccuracyLevel;
  isDegraded: boolean;
  headingLabel: string;
  qiblaLabel: string;
}

export function QiblaStatusPill({ accuracyLevel, isDegraded, headingLabel, qiblaLabel }: QiblaStatusPillProps) {
  const { theme } = useApp();
  const { t, fontFamily } = useI18n();

  const accuracyText =
    accuracyLevel === 'high' ? t('qibla.accuracy.high') : accuracyLevel === 'medium' ? t('qibla.accuracy.medium') : t('qibla.accuracy.low');

  return (
    <View style={styles.row}>
      <View style={[styles.pill, { backgroundColor: theme.backgroundSecondary, borderColor: theme.cardBorder }]}>
          <LocalizedText style={[styles.text, { color: theme.text, fontFamily }]}>{t('qibla.direction')}: {headingLabel}°</LocalizedText>
      </View>
      <View style={[styles.pill, { backgroundColor: theme.backgroundSecondary, borderColor: theme.cardBorder }]}>
          <LocalizedText style={[styles.text, { color: theme.tint, fontFamily }]}>{t('qibla.label')}: {qiblaLabel}°</LocalizedText>
      </View>
      {isDegraded ? (
        <View style={[styles.pill, { backgroundColor: theme.backgroundSecondary, borderColor: theme.accent }]}>
            <LocalizedText style={[styles.text, { color: theme.accent, fontFamily }]}>{t('qibla.accuracy.low')}</LocalizedText>
        </View>
      ) : (
        <View style={[styles.pill, { backgroundColor: theme.backgroundSecondary, borderColor: theme.cardBorder }]}>
          <LocalizedText style={[styles.text, { color: theme.textSecondary, fontFamily }]}>{accuracyText}</LocalizedText>
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
