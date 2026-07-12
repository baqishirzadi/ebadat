import { MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet } from 'react-native';

import {
  AdhanHealthStatusChip,
  healthStatusFromReport,
  healthSummaryLine,
  type HealthVisualStatus,
} from '@/components/prayer/AdhanHealthUi';
import { RtlText } from '@/components/ui/RtlText';
import { RtlView } from '@/components/ui/RtlView';
import { BorderRadius, Spacing, Typography } from '@/constants/theme';
import { useApp } from '@/context/AppContext';
import { buildAdhanHealthReport } from '@/utils/adhanHealth';

const PASS_COLOR = '#1b7f4d';
const FAIL_COLOR = '#c0392b';

function borderColorForStatus(status: HealthVisualStatus, theme: ReturnType<typeof useApp>['theme']): string {
  switch (status) {
    case 'healthy':
      return PASS_COLOR;
    case 'warning':
      return theme.warning;
    default:
      return FAIL_COLOR;
  }
}

function iconForStatus(status: HealthVisualStatus): keyof typeof MaterialIcons.glyphMap {
  switch (status) {
    case 'healthy':
      return 'verified';
    case 'warning':
      return 'health-and-safety';
    default:
      return 'error-outline';
  }
}

export function AdhanStatusCard() {
  const { theme } = useApp();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<HealthVisualStatus>('warning');

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const report = await buildAdhanHealthReport();
      setStatus(healthStatusFromReport(report));
    } catch {
      setStatus('warning');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      refresh().catch(() => {});
    }, [refresh]),
  );

  const accent = borderColorForStatus(status, theme);

  return (
    <Pressable
      onPress={() => router.push('/adhan-health')}
      style={[styles.card, { backgroundColor: theme.card, borderColor: accent }]}
    >
      <RtlView style={styles.inner}>
        <MaterialIcons name={iconForStatus(status)} size={32} color={accent} />
        <RtlView style={styles.textBlock}>
          <RtlText align="center" style={[styles.title, { color: theme.text }]}>
            وضعیت اذان
          </RtlText>
          {loading ? (
            <ActivityIndicator color={theme.tint} size="small" style={styles.loader} />
          ) : (
            <>
              <RtlText align="center" style={[styles.subtitle, { color: theme.textSecondary }]}>
                {healthSummaryLine(status).replace(/\.$/, '')}
              </RtlText>
              <AdhanHealthStatusChip status={status} />
            </>
          )}
        </RtlView>
        <MaterialIcons name="chevron-left" size={28} color={accent} />
      </RtlView>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
  },
  inner: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: Spacing.md,
  },
  textBlock: {
    flex: 1,
    gap: Spacing.xs,
    alignItems: 'center',
  },
  title: {
    fontFamily: 'Vazirmatn-Bold',
    fontSize: Typography.ui.body,
  },
  subtitle: {
    fontFamily: 'Vazirmatn',
    fontSize: Typography.ui.caption,
    lineHeight: 20,
  },
  loader: {
    marginTop: Spacing.xs,
  },
});
