import { MaterialIcons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Platform, Pressable, StyleSheet } from 'react-native';

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
import { buildAdhanHealthReport, openNotificationSettings } from '@/utils/adhanHealth';

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
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<HealthVisualStatus>('warning');
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const report = await buildAdhanHealthReport();
      setStatus(healthStatusFromReport(report));
      setNotificationsEnabled(report.health.notificationsEnabled);
    } catch {
      setStatus('warning');
      setNotificationsEnabled(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      refresh().catch(() => {});
    }, [refresh]),
  );

  const handlePress = useCallback(async () => {
    if (Platform.OS === 'ios' && !notificationsEnabled) {
      const opened = await openNotificationSettings();
      if (!opened) {
        Alert.alert(
          'دسترسی اعلان‌ها',
          'برای فعال‌کردن اعلان‌های اذان، به Settings → Apps → Ebadat → Notifications بروید و Allow Notifications را روشن کنید.',
          [{ text: 'باشه' }],
        );
      }
      return;
    }
    router.push((Platform.OS === 'ios' ? '/adhan-settings' : '/adhan-health') as never);
  }, [notificationsEnabled]);

  const accent = borderColorForStatus(status, theme);

  return (
    <Pressable
      onPress={handlePress}
      testID="adhan-status-card"
      accessibilityRole="button"
      accessibilityLabel="وضعیت اذان"
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
        <MaterialIcons name="chevron-left" size={24} color={theme.textSecondary} />
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
