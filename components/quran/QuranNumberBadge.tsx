import { NumericText } from '@/components/ui/NumericText';
import React from 'react';
import { StyleSheet, View } from 'react-native';

/** Number medallion shared by the surah and juz index cards. */
export function QuranNumberBadge({ value, color }: { value: string; color: string }) {
  return (
    <View style={styles.container}>
      <View style={[styles.ring, { borderColor: color }]} />
      <View style={[styles.ringMiddle, { borderColor: `${color}80` }]} />
      <View style={[styles.disc, { backgroundColor: color }]}>
        <NumericText style={styles.number}>{value}</NumericText>
      </View>
      <View style={[styles.corner, styles.cornerTopLeft, { borderColor: color }]} />
      <View style={[styles.corner, styles.cornerTopRight, { borderColor: color }]} />
      <View style={[styles.corner, styles.cornerBottomLeft, { borderColor: color }]} />
      <View style={[styles.corner, styles.cornerBottomRight, { borderColor: color }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 48,
    height: 48,
    flexShrink: 0,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  ring: {
    position: 'absolute',
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderStyle: 'solid',
  },
  ringMiddle: {
    position: 'absolute',
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1.5,
    borderStyle: 'solid',
  },
  disc: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    zIndex: 1,
  },
  corner: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderWidth: 1.5,
    borderStyle: 'solid',
  },
  cornerTopLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 1.5,
    borderLeftWidth: 1.5,
    borderRightWidth: 0,
    borderBottomWidth: 0,
    borderTopLeftRadius: 4,
  },
  cornerTopRight: {
    top: 0,
    right: 0,
    borderTopWidth: 1.5,
    borderRightWidth: 1.5,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
    borderTopRightRadius: 4,
  },
  cornerBottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 1.5,
    borderLeftWidth: 1.5,
    borderTopWidth: 0,
    borderRightWidth: 0,
    borderBottomLeftRadius: 4,
  },
  cornerBottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 1.5,
    borderRightWidth: 1.5,
    borderTopWidth: 0,
    borderLeftWidth: 0,
    borderBottomRightRadius: 4,
  },
  number: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 22,
    includeFontPadding: false,
  },
});
