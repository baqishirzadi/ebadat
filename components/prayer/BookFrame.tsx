/**
 * Full-width paper page for prayer-learning — no tight double frame.
 */

import React, { type ReactNode } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';

import { RtlView } from '@/components/ui/RtlView';
import { BorderRadius, Spacing } from '@/constants/theme';
import { useApp } from '@/context/AppContext';

interface BookFrameProps {
  children: ReactNode;
  style?: ViewStyle;
  padded?: boolean;
}

export function BookFrame({ children, style, padded = true }: BookFrameProps) {
  const { theme } = useApp();

  return (
    <RtlView
      style={[
        styles.page,
        {
          backgroundColor: theme.backgroundSecondary,
          borderColor: `${theme.accent}55`,
          padding: padded ? Spacing.lg : 0,
        },
        style,
      ]}
    >
      <View style={[styles.goldRule, { backgroundColor: theme.accent }]} />
      {children}
      <View style={[styles.goldRule, { backgroundColor: theme.accent, marginTop: Spacing.md }]} />
    </RtlView>
  );
}

const styles = StyleSheet.create({
  page: {
    marginHorizontal: Spacing.md,
    marginVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  goldRule: {
    height: 1.5,
    width: '28%',
    alignSelf: 'center',
    marginBottom: Spacing.md,
    opacity: 0.85,
  },
});

export default BookFrame;
