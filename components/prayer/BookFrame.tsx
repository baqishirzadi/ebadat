/**
 * Double-line ornamental frame for prayer-learning book pages.
 */

import React, { type ReactNode } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';

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
    <View
      style={[
        styles.outer,
        {
          backgroundColor: theme.backgroundSecondary,
          borderColor: theme.accent,
        },
        style,
      ]}
    >
      <View
        style={[
          styles.inner,
          {
            borderColor: `${theme.accent}66`,
            padding: padded ? Spacing.md : 0,
          },
        ]}
      >
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    borderWidth: 1.5,
    borderRadius: BorderRadius.lg,
    marginHorizontal: Spacing.md,
    marginVertical: Spacing.sm,
    overflow: 'hidden',
  },
  inner: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    margin: 5,
  },
});

export default BookFrame;
