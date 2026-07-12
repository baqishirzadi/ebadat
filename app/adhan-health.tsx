import { MaterialIcons } from '@expo/vector-icons';
import { Stack, useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';

import {
  AdhanHealthActionRow,
  AdhanHealthStatusChip,
  healthStatusFromReport,
} from '@/components/prayer/AdhanHealthUi';
import { OemAutostartGuide } from '@/components/prayer/OemAutostartGuide';
import { Button } from '@/components/ui/Button';
import { RtlText } from '@/components/ui/RtlText';
import { RtlView } from '@/components/ui/RtlView';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { BorderRadius, Spacing, Typography } from '@/constants/theme';
import { useApp } from '@/context/AppContext';
import { usePrayer } from '@/context/PrayerContext';
import {
  AdhanHealthCheckItem,
  AdhanHealthReport,
  buildAdhanHealthReport,
  openAdhanChannelSettings,
  openBatteryOptimizationSettings,
  openExactAlarmSettings,
  openNotificationSettings,
  openOemAutostartSettings,
  repairAdhanScheduling,
  runVerifiedAdhanSystemTest,
} from '@/utils/adhanHealth';
import { tAdhanPermission } from '@/utils/i18n/adhanPermissions';
import { markOemAutostartAcknowledged } from '@/utils/prayerOnboarding';

function statusIcon(status: AdhanHealthCheckItem['status']): keyof typeof MaterialIcons.glyphMap {
  switch (status) {
    case 'pass':
      return 'check-circle';
    case 'fail':
      return 'error';
    case 'warn':
      return 'warning';
    default:
      return 'info';
  }
}

const PASS_COLOR = '#1b7f4d';
const FAIL_COLOR = '#c0392b';

function statusColor(status: AdhanHealthCheckItem['status'], theme: ReturnType<typeof useApp>['theme']): string {
  switch (status) {
    case 'pass':
      return PASS_COLOR;
    case 'fail':
      return FAIL_COLOR;
    case 'warn':
      return theme.warning;
    default:
      return theme.textSecondary;
  }
}

function overallLabel(status: AdhanHealthReport['overallStatus']): string {
  switch (status) {
    case 'healthy':
      return 'اذان آماده است';
    case 'warning':
      return 'نیاز به بررسی';
    default:
      return 'مشکل جدی';
  }
}

function checkChipLabel(status: AdhanHealthCheckItem['status']): string {
  return status === 'pass'
    ? tAdhanPermission('adhanPermissions.health.statusPass')
    : tAdhanPermission('adhanPermissions.health.statusWarn');
}

export default function AdhanHealthScreen() {
  const { theme } = useApp();
  const { requestPrayerSchedule } = usePrayer();
  const [report, setReport] = useState<AdhanHealthReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [repairing, setRepairing] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const next = await buildAdhanHealthReport();
      setReport(next);
    } catch {
      Alert.alert('خطا', 'بررسی سلامت اذان انجام نشد.');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      refresh().catch(() => {});
    }, [refresh]),
  );

  const handleRepair = useCallback(async () => {
    setRepairing(true);
    try {
      await repairAdhanScheduling();
      await requestPrayerSchedule('health-repair');
      await refresh();
      Alert.alert('بازیابی انجام شد', 'اذان‌ها دوباره با سیستم همگام شدند.');
    } catch {
      Alert.alert('خطا', 'بازیابی اذان انجام نشد.');
    } finally {
      setRepairing(false);
    }
  }, [refresh, requestPrayerSchedule]);

  const handleLiveTest = useCallback(async () => {
    setTesting(true);
    setTestResult('در حال انتظار برای اعلان تست...');
    try {
      const result = await runVerifiedAdhanSystemTest();
      if (result.passed) {
        setTestResult('تست موفق: اعلان با صدا دریافت شد.');
      } else {
        setTestResult('تست ناموفق: اعلان در زمان مقرر دریافت نشد.');
      }
      await refresh();
    } catch {
      setTestResult('خطا در اجرای تست زنده.');
    } finally {
      setTesting(false);
    }
  }, [refresh]);

  const handleFix = useCallback(
    async (check: AdhanHealthCheckItem) => {
      switch (check.id) {
        case 'notifications':
          await openNotificationSettings();
          return;
        case 'channels':
          await openAdhanChannelSettings();
          return;
        case 'exact_alarm':
          await openExactAlarmSettings();
          return;
        case 'battery':
          await openBatteryOptimizationSettings();
          return;
        case 'autostart':
          await openOemAutostartSettings();
          await markOemAutostartAcknowledged();
          await refresh();
          return;
        case 'scheduled':
        case 'delivery':
          await handleRepair();
          return;
        default:
          return;
      }
    },
    [handleRepair, refresh],
  );

  if (Platform.OS !== 'android') {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <ScreenHeader title={tAdhanPermission('adhanPermissions.health.title')} />
        <View style={[styles.centered, styles.rtlRoot, { backgroundColor: theme.background }]}>
          <RtlText align="center" style={[styles.unsupported, { color: theme.textSecondary }]}>
            بررسی سلامت اذان فقط در اندروید در دسترس است.
          </RtlText>
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ScreenHeader title={tAdhanPermission('adhanPermissions.health.title')} />
      <ScrollView
        style={[styles.container, styles.rtlRoot, { backgroundColor: theme.background }]}
        contentContainerStyle={styles.content}
      >
        <View style={[styles.summaryCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
          {loading || !report ? (
            <ActivityIndicator color={theme.tint} style={styles.loader} />
          ) : (
            <RtlView style={styles.summaryInner}>
              <AdhanHealthStatusChip status={healthStatusFromReport(report)} />
              <RtlText align="center" style={[styles.summaryTitle, { color: theme.text }]}>
                {overallLabel(report.overallStatus)}
              </RtlText>
              <RtlText align="center" style={[styles.summaryBody, { color: theme.textSecondary }]}>
                {report.health.scheduledAlarmCount > 0 && report.health.nextAlarmAtMs
                  ? `اذان بعدی: ${new Date(report.health.nextAlarmAtMs).toLocaleString('fa-AF')}`
                  : 'وضعیت زمان‌بندی را در زیر بررسی کنید.'}
              </RtlText>
              <Button label="بروزرسانی" onPress={() => refresh().catch(() => {})} variant="secondary" />
            </RtlView>
          )}
        </View>

        {report?.checks.map((check) => (
          <View
            key={check.id}
            style={[styles.checkCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}
          >
            <RtlView
              style={[
                styles.checkChipWrap,
                {
                  backgroundColor: `${statusColor(check.status, theme)}14`,
                  borderColor: statusColor(check.status, theme),
                },
              ]}
            >
              <MaterialIcons name={statusIcon(check.status)} size={15} color={statusColor(check.status, theme)} />
              <RtlText align="center" style={[styles.checkChipText, { color: statusColor(check.status, theme) }]}>
                {checkChipLabel(check.status)}
              </RtlText>
            </RtlView>
            <RtlView style={styles.checkText}>
              <RtlText align="center" style={[styles.checkTitle, { color: theme.text }]}>
                {check.title}
              </RtlText>
              <RtlText align="center" style={[styles.checkBody, { color: theme.textSecondary }]}>
                {check.body}
              </RtlText>
            </RtlView>
            {check.fixLabel ? (
              <Button
                label={check.fixLabel}
                onPress={() => handleFix(check).catch(() => {})}
                style={styles.fullWidthButton}
              />
            ) : null}
            {check.id === 'autostart' && check.status === 'warn' ? (
              <OemAutostartGuide manufacturer={report?.health.manufacturer ?? ''} />
            ) : null}
          </View>
        ))}

        {report && report.firedEvents.length > 0 ? (
          <View style={[styles.historyCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
            <RtlText align="center" style={[styles.historyTitle, { color: theme.text }]}>
              آخرین رویدادها
            </RtlText>
            {report.firedEvents.slice(0, 5).map((event) => (
              <RtlView key={`${event.id}-${event.actualFireAtMs}`} style={styles.historyRow}>
                <RtlText align="center" style={[styles.historyMeta, { color: theme.textSecondary }]}>
                  {event.type === 'system_test'
                    ? 'تست سیستمی'
                    : event.type === 'maintenance'
                      ? 'نگهداری'
                      : event.prayer || 'اذان'}
                </RtlText>
                <RtlText align="center" style={[styles.historyTime, { color: theme.text }]}>
                  {new Date(event.actualFireAtMs).toLocaleString('fa-AF')}
                  {event.delaySeconds > 0 ? ` (+${event.delaySeconds}s)` : ''}
                </RtlText>
              </RtlView>
            ))}
          </View>
        ) : null}

        <View style={[styles.actionsCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
          <RtlText align="center" style={[styles.actionsTitle, { color: theme.text }]}>
            اقدامات
          </RtlText>
          <Button
            label={repairing ? 'در حال بازیابی...' : 'بازیابی اذان'}
            onPress={() => handleRepair().catch(() => {})}
            disabled={repairing || testing}
            style={styles.fullWidthButton}
          />
          <Button
            label={testing ? 'در حال تست...' : 'تست زنده (۲۵ ثانیه)'}
            onPress={() => handleLiveTest().catch(() => {})}
            disabled={repairing || testing}
            variant="secondary"
            style={styles.fullWidthButton}
          />
          <View style={styles.fullWidthButton}>
            <AdhanHealthActionRow
              label="راهنمای گوشی (Autostart)"
              icon="settings-suggest"
              onPress={() => openOemAutostartSettings().catch(() => {})}
            />
          </View>
          {testResult ? (
            <RtlText align="center" style={[styles.testResult, { color: theme.textSecondary }]}>
              {testResult}
            </RtlText>
          ) : null}
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  rtlRoot: {
    direction: 'rtl',
  },
  container: {
    flex: 1,
  },
  content: {
    padding: Spacing.md,
    gap: Spacing.sm,
    paddingBottom: Spacing.xl,
    alignItems: 'stretch',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  loader: {
    alignSelf: 'center',
  },
  unsupported: {
    fontFamily: 'Vazirmatn',
    fontSize: Typography.ui.body,
  },
  summaryCard: {
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    gap: Spacing.sm,
    alignSelf: 'stretch',
  },
  summaryInner: {
    alignItems: 'center',
    gap: Spacing.sm,
  },
  summaryTitle: {
    fontFamily: 'Vazirmatn-Bold',
    fontSize: Typography.ui.subtitle,
  },
  summaryBody: {
    fontFamily: 'Vazirmatn',
    fontSize: Typography.ui.caption,
  },
  checkCard: {
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    gap: Spacing.sm,
    alignSelf: 'stretch',
    alignItems: 'center',
  },
  checkChipWrap: {
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
  checkChipText: {
    fontFamily: 'Vazirmatn-Bold',
    fontSize: Typography.ui.caption,
  },
  checkText: {
    alignItems: 'center',
    gap: 4,
    alignSelf: 'stretch',
  },
  checkTitle: {
    fontFamily: 'Vazirmatn-Bold',
    fontSize: Typography.ui.body,
  },
  checkBody: {
    fontFamily: 'Vazirmatn',
    fontSize: Typography.ui.caption,
    lineHeight: 22,
  },
  historyCard: {
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    gap: Spacing.xs,
    alignSelf: 'stretch',
    alignItems: 'center',
  },
  historyTitle: {
    fontFamily: 'Vazirmatn-Bold',
    fontSize: Typography.ui.body,
    marginBottom: Spacing.xs,
  },
  historyRow: {
    alignItems: 'center',
    gap: 2,
    alignSelf: 'stretch',
    paddingVertical: Spacing.xs,
  },
  historyMeta: {
    fontFamily: 'Vazirmatn-Bold',
    fontSize: Typography.ui.caption,
  },
  historyTime: {
    fontFamily: 'Vazirmatn',
    fontSize: Typography.ui.caption,
  },
  actionsCard: {
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    gap: Spacing.sm,
    alignSelf: 'stretch',
    alignItems: 'center',
  },
  actionsTitle: {
    fontFamily: 'Vazirmatn-Bold',
    fontSize: Typography.ui.body,
  },
  testResult: {
    fontFamily: 'Vazirmatn',
    fontSize: Typography.ui.caption,
    lineHeight: 20,
  },
  fullWidthButton: {
    alignSelf: 'stretch',
    width: '100%',
  },
});
