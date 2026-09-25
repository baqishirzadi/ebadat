/**
 * Thin gold divider used under chapter / leaf titles.
 */

import React from 'react';
import { StyleSheet, View } from 'react-native';

import { Spacing } from '@/constants/theme';
import { useApp } from '@/context/AppContext';

interface BookOrnamentProps {
  width?: number;
}

export function BookOrnament({ width = 120 }: BookOrnamentProps) {
  const { theme } = useApp();

  return (
    <View style={styles.row}>
      <View style={[styles.line, { backgroundColor: theme.accent, width: width * 0.35 }]} />
      <View style={[styles.diamond, { borderColor: theme.accent }]} />
      <View style={[styles.line, { backgroundColor: theme.accent, width: width * 0.35 }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: Spacing.sm,
    gap: Spacing.sm,
  },
  line: {
    height: 1,
  },
  diamond: {
    width: 7,
    height: 7,
    borderWidth: 1.5,
    transform: [{ rotate: '45deg' }],
  },
});

export default BookOrnament;
