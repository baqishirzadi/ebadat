/**
 * Status Badge Component
 * Shows request status (Pending, Answered, Closed)
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { RequestStatus, STATUS_INFO } from '@/types/dua';
import { Typography, Spacing, BorderRadius } from '@/constants/theme';
import CenteredText from '@/components/CenteredText';
import { useI18n } from '@/utils/i18n/useI18n';

interface StatusBadgeProps {
  status: RequestStatus;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const { t } = useI18n();
  const info = STATUS_INFO[status];
  const label =
    status === 'pending'
      ? t('dua.status.pending')
      : status === 'answered'
        ? t('dua.status.answered')
        : t('dua.status.closed');

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
