import React from 'react';
import { StyleSheet } from 'react-native';

import CenteredText from '@/components/CenteredText';
import { Spacing, Typography } from '@/constants/theme';
import { useApp } from '@/context/AppContext';

interface MoreSectionTitleProps {
  title: string;
}

export function MoreSectionTitle({ title }: MoreSectionTitleProps) {
  const { theme } = useApp();

  return (
    <CenteredText style={[styles.title, { color: theme.textSecondary }]}>
      {title}
    </CenteredText>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: Typography.ui.caption,
    fontWeight: '700',
    marginBottom: Spacing.md,
    textTransform: 'uppercase',
  },
});
