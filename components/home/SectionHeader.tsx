import React from 'react';
import { StyleSheet } from 'react-native';

import { RtlText } from '@/components/ui/RtlText';
import { Spacing, Typography } from '@/constants/theme';
import { useApp } from '@/context/AppContext';

interface SectionHeaderProps {
  title: string;
}

export function SectionHeader({ title }: SectionHeaderProps) {
  const { theme } = useApp();
  return (
    <RtlText align="center" style={[styles.title, { color: theme.textSecondary }]}>
      {title}
    </RtlText>
  );
}

const styles = StyleSheet.create({
  title: {
    fontFamily: 'Vazirmatn-Bold',
    fontSize: Typography.ui.caption,
    marginBottom: Spacing.sm,
    marginTop: Spacing.xs,
    paddingHorizontal: Spacing.md,
    letterSpacing: 0.5,
  },
});
