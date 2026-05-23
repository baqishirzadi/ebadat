import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Spacing } from '@/constants/theme';

type Props = {
  isPlaying: boolean;
  canSkipPrevious: boolean;
  canSkipNext: boolean;
  onPrevious: () => void;
  onToggle: () => void;
  onNext: () => void;
  accentColor: string;
  primaryTextColor: string;
};

export function NaatTransportControls({
  isPlaying,
  canSkipPrevious,
  canSkipNext,
  onPrevious,
  onToggle,
  onNext,
  accentColor,
  primaryTextColor,
}: Props) {
  return (
    <View style={styles.row}>
      <Pressable
        onPress={onNext}
        disabled={!canSkipNext}
        style={({ pressed }) => [
          styles.sideButton,
          { borderColor: `${primaryTextColor}30` },
          (!canSkipNext || pressed) && styles.dimmed,
        ]}
      >
        <MaterialIcons name="skip-next" size={32} color={primaryTextColor} />
      </Pressable>

      <Pressable
        onPress={onToggle}
        style={({ pressed }) => [
          styles.playButton,
          { backgroundColor: accentColor },
          pressed && styles.playPressed,
        ]}
      >
        <MaterialIcons name={isPlaying ? 'pause' : 'play-arrow'} size={46} color="#173f33" />
      </Pressable>

      <Pressable
        onPress={onPrevious}
        disabled={!canSkipPrevious}
        style={({ pressed }) => [
          styles.sideButton,
          { borderColor: `${primaryTextColor}30` },
          (!canSkipPrevious || pressed) && styles.dimmed,
        ]}
      >
        <MaterialIcons name="skip-previous" size={32} color={primaryTextColor} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.lg,
  },
  sideButton: {
    width: 58,
    height: 58,
    borderRadius: 29,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  playButton: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.24,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  playPressed: {
    opacity: 0.86,
    transform: [{ scale: 0.98 }],
  },
  dimmed: {
    opacity: 0.42,
  },
});
