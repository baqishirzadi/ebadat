import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { RtlText } from '@/components/ui/RtlText';
import { RtlView } from '@/components/ui/RtlView';
import { BorderRadius, Spacing, Typography } from '@/constants/theme';
import { useApp } from '@/context/AppContext';
import {
  AdhanHealthReport,
  buildAdhanHealthReport,
} from '@/utils/adhanHealth';
import { adhanPermissionLocale, tAdhanPermission, type AdhanPermissionLocale } from '@/utils/i18n/adhanPermissions';
import { translateUi } from '@/utils/i18n/catalog';
import type { AppLanguage } from '@/types/quran';
import { forwardChevronName, rowStyle } from '@/utils/i18n/direction';
import { useI18n } from '@/utils/i18n/useI18n';

export type HealthVisualStatus = 'healthy' | 'warning' | 'critical';

const FAIL_COLOR = '#c0392b';

export function healthStatusFromReport(
  report: AdhanHealthReport | null,
): HealthVisualStatus {
  if (!report) return 'warning';
  return report.overallStatus;
}

function languageForPermissionLocale(locale: AdhanPermissionLocale): AppLanguage {
  if (locale === 'en') return 'english';
  if (locale === 'ps') return 'pashto';
  if (locale === 'tr') return 'turkish';
  if (locale === 'ar') return 'arabic';
  return 'dari';
}

export function healthSummaryLine(status: HealthVisualStatus, locale: AdhanPermissionLocale = 'fa'): string {
  const language = languageForPermissionLocale(locale);
  if (status === 'healthy') return translateUi('home.adhan.summary.healthy', language);
  if (status === 'warning') return translateUi('home.adhan.summary.warning', language);
  return translateUi('home.adhan.summary.critical', language);
}

export function healthChipLabel(status: HealthVisualStatus, locale: AdhanPermissionLocale = 'fa'): string {
  switch (status) {
    case 'healthy':
      return tAdhanPermission('adhanPermissions.health.statusPass', locale);
    default:
      return tAdhanPermission('adhanPermissions.health.statusWarn', locale);
  }
}

function statusColor(status: HealthVisualStatus, theme: ReturnType<typeof useApp>['theme']): string {
  switch (status) {
    case 'healthy':
      return theme.tint;
    case 'warning':
      return theme.warning;
    default:
      return FAIL_COLOR;
  }
}

function statusIcon(status: HealthVisualStatus): keyof typeof MaterialIcons.glyphMap {
  switch (status) {
    case 'healthy':
      return 'check-circle';
    case 'warning':
      return 'warning';
    default:
      return 'error';
  }
}

interface AdhanHealthStatusChipProps {
  status: HealthVisualStatus;
}

export function AdhanHealthStatusChip({ status }: AdhanHealthStatusChipProps) {
  const { theme, state } = useApp();
  const locale = adhanPermissionLocale(state.preferences.appLanguage);
  const color = statusColor(status, theme);

  return (
    <RtlView style={[styles.chip, { backgroundColor: `${color}18`, borderColor: color }]}>
      <MaterialIcons name={statusIcon(status)} size={16} color={color} />
      <RtlText align="center" style={[styles.chipText, { color }]}>
        {healthChipLabel(status, locale)}
      </RtlText>
    </RtlView>
  );
}

interface AdhanHealthActionRowProps {
  label: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  onPress: () => void;
  variant?: 'primary' | 'secondary';
  disabled?: boolean;
  testID?: string;
}

export function AdhanHealthActionRow({
  label,
  icon,
  onPress,
  variant = 'secondary',
  disabled = false,
  testID,
}: AdhanHealthActionRowProps) {
  const { theme, state } = useApp();
  const language = state.preferences.appLanguage;
  const isPrimary = variant === 'primary';

  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      disabled={disabled}
      style={[
        styles.actionRow,
        rowStyle(language),
        {
          backgroundColor: isPrimary ? theme.tint : theme.backgroundSecondary,
          borderColor: isPrimary ? theme.tint : theme.cardBorder,
          opacity: disabled ? 0.5 : 1,
        },
      ]}
    >
      <MaterialIcons name={icon} size={20} color={isPrimary ? theme.onTint : theme.tint} />
      <RtlText
        align="center"
        style={[styles.actionLabel, { color: isPrimary ? theme.onTint : theme.text }]}
      >
        {label}
      </RtlText>
      <MaterialIcons
        name={forwardChevronName(language)}
        size={22}
        color={isPrimary ? theme.onTint : theme.textSecondary}
      />
    </Pressable>
  );
}

interface AdhanNotificationHealthPanelProps {
  onOpenNotificationSettings: () => void;
  onRunSystemTest: () => void;
  testStatusLabel?: string;
  showFallbackWarning?: boolean;
  onRecheckSchedule?: () => void;
}

export function AdhanNotificationHealthPanel({
  onOpenNotificationSettings,
  onRunSystemTest,
  testStatusLabel,
  showFallbackWarning = false,
  onRecheckSchedule,
}: AdhanNotificationHealthPanelProps) {
  const { theme, state } = useApp();
  const { t } = useI18n();
  const locale = adhanPermissionLocale(state.preferences.appLanguage);
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState<AdhanHealthReport | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const next = await buildAdhanHealthReport(locale);
      setReport(next);
    } catch {
      setReport(null);
    } finally {
      setLoading(false);
    }
  }, [locale]);

  useEffect(() => {
    refresh().catch(() => {});
  }, [refresh]);

  const status = healthStatusFromReport(report);

  return (
    <View style={[styles.panel, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
      <RtlText align="center" style={[styles.panelTitle, { color: theme.text }]}>
        {tAdhanPermission('adhanPermissions.health.title', locale)}
      </RtlText>

      {loading ? (
        <ActivityIndicator color={theme.tint} style={styles.panelLoader} />
      ) : (
        <>
          <AdhanHealthStatusChip status={status} />
          <RtlText align="center" style={[styles.panelSummary, { color: theme.textSecondary }]}>
            {healthSummaryLine(status, locale)}
          </RtlText>
        </>
      )}

      <View style={styles.actionStack}>
        <AdhanHealthActionRow
          label={tAdhanPermission('adhanPermissions.health.fullCheck', locale)}
          icon="health-and-safety"
          variant="primary"
          onPress={() => router.push('/adhan-health')}
        />
        <AdhanHealthActionRow
          testID="adhan-system-test-button"
          label={t('adhanHealth.testAdhan')}
          icon="notifications-active"
          onPress={onRunSystemTest}
        />
        <AdhanHealthActionRow
          label={t('adhanHealth.notificationSettings')}
          icon="settings"
          onPress={onOpenNotificationSettings}
        />
      </View>

      {testStatusLabel ? (
        <RtlText align="center" style={[styles.testHint, { color: theme.textSecondary }]}>
          {testStatusLabel}
        </RtlText>
      ) : null}

      {showFallbackWarning ? (
        <View style={[styles.fallbackBox, { backgroundColor: theme.warningSurface, borderColor: theme.warning }]}>
          <RtlText align="center" style={[styles.fallbackText, { color: theme.text }]}>
            {t('adhanHealth.fallbackHint')}
          </RtlText>
          {onRecheckSchedule ? (
            <Button label={t('adhanHealth.recheckSchedule')} onPress={onRecheckSchedule} />
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    gap: 6,
    paddingVertical: 5,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    overflow: 'hidden',
  },
  chipText: {
    fontFamily: 'Vazirmatn-Bold',
    fontSize: Typography.ui.caption,
  },
  actionRow: {
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.sm + 2,
    paddingHorizontal: Spacing.md,
  },
  actionLabel: {
    flex: 1,
    fontFamily: 'Vazirmatn-Bold',
    fontSize: Typography.ui.body,
  },
  panel: {
    margin: Spacing.md,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    gap: Spacing.sm,
  },
  panelTitle: {
    fontFamily: 'Vazirmatn-Bold',
    fontSize: Typography.ui.subtitle,
  },
  panelLoader: {
    alignSelf: 'center',
    marginVertical: Spacing.sm,
  },
  panelSummary: {
    fontFamily: 'Vazirmatn',
    fontSize: Typography.ui.caption,
    lineHeight: 22,
  },
  actionStack: {
    gap: Spacing.xs,
    marginTop: Spacing.xs,
  },
  testHint: {
    fontFamily: 'Vazirmatn',
    fontSize: Typography.ui.caption,
    lineHeight: 20,
  },
  fallbackBox: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    gap: Spacing.sm,
  },
  fallbackText: {
    fontFamily: 'Vazirmatn',
    fontSize: Typography.ui.caption,
    lineHeight: 22,
  },
});
