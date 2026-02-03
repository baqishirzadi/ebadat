/**
 * Status Badge Component
 * Shows request status (Pending, Answered, Closed)
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { RequestStatus, STATUS_INFO } from '@/types/dua';
import { Typography, Spacing, BorderRadius } from '@/constants/theme';
import CenteredText from '@/components/CenteredText';

interface StatusBadgeProps {
  status: RequestStatus;
  language?: 'dari' | 'pashto';
}

export function StatusBadge({ status, language = 'dari' }: StatusBadgeProps) {
  const info = STATUS_INFO[status];
  const label = language === 'pashto' ? info.namePashto : info.nameDari;

  return (
    <View style={[styles.badge, { backgroundColor: `${info.color}20`, borderColor: info.color }]}>
      <CenteredText style={[styles.text, { color: info.color }]}>
        {label}
      </CenteredText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
  },
  text: {
    fontSize: Typography.ui.caption,
    fontWeight: '600',
    fontFamily: 'Vazirmatn',
  },
});
