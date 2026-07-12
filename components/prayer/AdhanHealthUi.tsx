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
import { tAdhanPermission } from '@/utils/i18n/adhanPermissions';

export type HealthVisualStatus = 'healthy' | 'warning' | 'critical';

const PASS_COLOR = '#1b7f4d';
const FAIL_COLOR = '#c0392b';

export function healthStatusFromReport(
  report: AdhanHealthReport | null,
): HealthVisualStatus {
  if (!report) return 'warning';
  return report.overallStatus;
}

export function healthSummaryLine(status: HealthVisualStatus): string {
  switch (status) {
    case 'healthy':
      return 'اذان آماده است و زمان‌بندی فعال است.';
    case 'warning':
      return 'یک یا چند مورد نیاز به بررسی دارد.';
    default:
      return 'برای پخش به‌موقع اذان، تنظیمات را اصلاح کنید.';
  }
}

export function healthChipLabel(status: HealthVisualStatus): string {
  switch (status) {
    case 'healthy':
      return tAdhanPermission('adhanPermissions.health.statusPass');
    default:
      return tAdhanPermission('adhanPermissions.health.statusWarn');
  }
}

function statusColor(status: HealthVisualStatus, theme: ReturnType<typeof useApp>['theme']): string {
  switch (status) {
    case 'healthy':
      return PASS_COLOR;
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
  const { theme } = useApp();
  const color = statusColor(status, theme);

  return (
    <RtlView style={[styles.chip, { backgroundColor: `${color}18`, borderColor: color }]}>
      <MaterialIcons name={statusIcon(status)} size={16} color={color} />
      <RtlText align="center" style={[styles.chipText, { color }]}>
        {healthChipLabel(status)}
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
  const { theme } = useApp();
  const isPrimary = variant === 'primary';

  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      disabled={disabled}
      style={[
        styles.actionRow,
        {
          backgroundColor: isPrimary ? theme.tint : theme.backgroundSecondary,
          borderColor: isPrimary ? theme.tint : theme.cardBorder,
          opacity: disabled ? 0.5 : 1,
        },
      ]}
    >
      <MaterialIcons name={icon} size={20} color={isPrimary ? '#fff' : theme.tint} />
      <RtlText
        align="center"
        style={[styles.actionLabel, { color: isPrimary ? '#fff' : theme.text }]}
      >
        {label}
      </RtlText>
      <MaterialIcons
        name="chevron-left"
        size={22}
        color={isPrimary ? '#fff' : theme.textSecondary}
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
  const { theme } = useApp();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState<AdhanHealthReport | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const next = await buildAdhanHealthReport();
      setReport(next);
    } catch {
      setReport(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh().catch(() => {});
  }, [refresh]);

  const status = healthStatusFromReport(report);

  return (
    <View style={[styles.panel, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
      <RtlText align="center" style={[styles.panelTitle, { color: theme.text }]}>
        {tAdhanPermission('adhanPermissions.health.title')}
      </RtlText>

      {loading ? (
        <ActivityIndicator color={theme.tint} style={styles.panelLoader} />
      ) : (
        <>
          <AdhanHealthStatusChip status={status} />
          <RtlText align="center" style={[styles.panelSummary, { color: theme.textSecondary }]}>
            {healthSummaryLine(status)}
          </RtlText>
        </>
      )}

      <View style={styles.actionStack}>
        <AdhanHealthActionRow
          label="بررسی کامل وضعیت"
          icon="health-and-safety"
          variant="primary"
          onPress={() => router.push('/adhan-health')}
        />
        <AdhanHealthActionRow
          testID="adhan-system-test-button"
          label="تست اذان (۲۵ ثانیه)"
          icon="notifications-active"
          onPress={onRunSystemTest}
        />
        <AdhanHealthActionRow
          label="تنظیمات اعلان"
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
            حالت عادی فعال است؛ اذان ممکن است کمی تأخیر داشته باشد.
          </RtlText>
          {onRecheckSchedule ? (
            <Button label="بررسی دوباره و زمان‌بندی" onPress={onRecheckSchedule} />
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
    flexDirection: 'row-reverse',
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
