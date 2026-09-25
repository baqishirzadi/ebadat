import { MaterialIcons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Platform, Pressable, StyleSheet } from 'react-native';

import {
  AdhanHealthStatusChip,
  type HealthVisualStatus,
} from '@/components/prayer/AdhanHealthUi';
import { RtlText } from '@/components/ui/RtlText';
import { RtlView } from '@/components/ui/RtlView';
import { BorderRadius, Spacing, Typography } from '@/constants/theme';
import { useApp } from '@/context/AppContext';
import {
  buildAdhanHealthReport,
  homeCardStatusFromReport,
  openNotificationSettings,
} from '@/utils/adhanHealth';
import { adhanPermissionLocale } from '@/utils/i18n/adhanPermissions';
import { forwardChevronName } from '@/utils/i18n/direction';
import { useI18n } from '@/utils/i18n/useI18n';

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

function summaryKeyForStatus(status: HealthVisualStatus) {
  switch (status) {
    case 'healthy':
      return 'home.adhan.summary.healthy' as const;
    case 'warning':
      return 'home.adhan.summary.warning' as const;
    default:
      return 'home.adhan.summary.critical' as const;
  }
}

export function AdhanStatusCard() {
  const { theme, state } = useApp();
  const { t, isPashto, fontFamily, language } = useI18n();
  const locale = adhanPermissionLocale(state.preferences.appLanguage);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<HealthVisualStatus>('warning');
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const isNastaliq = fontFamily === 'NotoNastaliqUrdu';
  const subtitleLineHeight = isPashto ? (isNastaliq ? 28 : 24) : 20;

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const report = await buildAdhanHealthReport(locale);
      setStatus(homeCardStatusFromReport(report));
      setNotificationsEnabled(report.health.notificationsEnabled);
    } catch {
      setStatus('warning');
      setNotificationsEnabled(true);
    } finally {
      setLoading(false);
    }
  }, [locale]);

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
          t('home.adhan.notificationsAccessTitle'),
          t('home.adhan.notificationsAccessBody'),
          [{ text: t('common.ok') }],
        );
      }
      return;
    }
    router.push((Platform.OS === 'ios' ? '/adhan-settings' : '/adhan-health') as never);
  }, [notificationsEnabled, t]);

  const accent = borderColorForStatus(status, theme);
  const statusTitle = t('home.adhan.statusTitle');

  return (
    <Pressable
      onPress={handlePress}
      testID="adhan-status-card"
      accessibilityRole="button"
      accessibilityLabel={statusTitle}
      style={[styles.card, { backgroundColor: theme.card, borderColor: accent }]}
    >
      <RtlView style={styles.inner}>
        <MaterialIcons name={iconForStatus(status)} size={32} color={accent} />
        <RtlView style={styles.textBlock}>
          <RtlText align="center" style={[styles.title, { color: theme.text }]}>
            {statusTitle}
          </RtlText>
          {loading ? (
            <ActivityIndicator color={theme.tint} size="small" style={styles.loader} />
          ) : (
            <>
              <RtlText
                align="center"
                style={[styles.subtitle, { color: theme.textSecondary, lineHeight: subtitleLineHeight }]}
              >
                {t(summaryKeyForStatus(status))}
              </RtlText>
              <AdhanHealthStatusChip status={status} />
            </>
          )}
        </RtlView>
        <MaterialIcons name={forwardChevronName(language)} size={24} color={theme.textSecondary} />
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
    flexDirection: 'row',
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
