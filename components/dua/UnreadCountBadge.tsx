import React from 'react';
import { StyleSheet, View } from 'react-native';

import { RtlText } from '@/components/ui/RtlText';

interface UnreadCountBadgeProps {
  count: number;
  /** light = white text on rose; dark = for tinted cards */
  tone?: 'light' | 'onTint';
}

export function UnreadCountBadge({ count, tone = 'light' }: UnreadCountBadgeProps) {
  if (count <= 0) return null;

  return (
    <View style={[styles.badge, tone === 'onTint' && styles.badgeOnTint]}>
      <RtlText style={styles.text}>{count > 9 ? '۹+' : String(count)}</RtlText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    position: 'absolute',
    top: -4,
    left: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E11D48',
    zIndex: 2,
  },
  badgeOnTint: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: 'rgba(225, 29, 72, 0.35)',
  },
  text: {
    color: '#fff',
    fontSize: 11,
    fontFamily: 'Vazirmatn-Bold',
    lineHeight: 14,
  },
});
