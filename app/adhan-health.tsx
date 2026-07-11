import { MaterialIcons } from '@expo/vector-icons';
import { Stack, useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Button } from '@/components/ui/Button';
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
        case 'scheduled':
        case 'delivery':
          await handleRepair();
          return;
        default:
          return;
      }
    },
    [handleRepair],
  );

  if (Platform.OS !== 'android') {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <ScreenHeader title="سلامت اذان" />
        <View style={[styles.centered, { backgroundColor: theme.background }]}>
          <Text style={[styles.unsupported, { color: theme.textSecondary }]}>
            بررسی سلامت اذان فقط در اندروید در دسترس است.
          </Text>
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ScreenHeader title="سلامت اذان" />
      <ScrollView
        style={[styles.container, { backgroundColor: theme.background }]}
        contentContainerStyle={styles.content}
      >
        <View style={[styles.summaryCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
          {loading || !report ? (
            <ActivityIndicator color={theme.tint} />
          ) : (
            <>
              <View style={styles.summaryRow}>
                <MaterialIcons
                  name={report.overallStatus === 'healthy' ? 'verified' : 'health-and-safety'}
                  size={28}
                  color={
                    report.overallStatus === 'healthy'
                      ? PASS_COLOR
                      : report.overallStatus === 'warning'
                        ? theme.warning
                        : FAIL_COLOR
                  }
                />
                <View style={styles.summaryText}>
                  <Text style={[styles.summaryTitle, { color: theme.text }]}>
                    {overallLabel(report.overallStatus)}
                  </Text>
                  <Text style={[styles.summaryBody, { color: theme.textSecondary }]}>
                    {report.health.scheduledAlarmCount > 0 && report.health.nextAlarmAtMs
                      ? `اذان بعدی: ${new Date(report.health.nextAlarmAtMs).toLocaleString('fa-AF')}`
                      : 'وضعیت زمان‌بندی را در زیر بررسی کنید.'}
                  </Text>
                </View>
              </View>
              <Button label="بروزرسانی" onPress={() => refresh().catch(() => {})} variant="secondary" />
            </>
          )}
        </View>

        {report?.checks.map((check) => (
          <View
            key={check.id}
            style={[styles.checkCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}
          >
            <View style={styles.checkRow}>
              <MaterialIcons name={statusIcon(check.status)} size={24} color={statusColor(check.status, theme)} />
              <View style={styles.checkText}>
                <Text style={[styles.checkTitle, { color: theme.text }]}>{check.title}</Text>
                <Text style={[styles.checkBody, { color: theme.textSecondary }]}>{check.body}</Text>
              </View>
            </View>
            {check.fixLabel ? (
              <Pressable
                onPress={() => handleFix(check).catch(() => {})}
                style={[styles.fixButton, { backgroundColor: theme.tint }]}
              >
                <Text style={styles.fixButtonText}>{check.fixLabel}</Text>
              </Pressable>
            ) : null}
          </View>
        ))}

        {report && report.firedEvents.length > 0 ? (
          <View style={[styles.historyCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
            <Text style={[styles.historyTitle, { color: theme.text }]}>آخرین رویدادها</Text>
            {report.firedEvents.slice(0, 5).map((event) => (
              <View key={`${event.id}-${event.actualFireAtMs}`} style={styles.historyRow}>
                <Text style={[styles.historyMeta, { color: theme.textSecondary }]}>
                  {event.type === 'system_test'
                    ? 'تست سیستمی'
                    : event.type === 'maintenance'
                      ? 'نگهداری'
                      : event.prayer || 'اذان'}
                </Text>
                <Text style={[styles.historyTime, { color: theme.text }]}>
                  {new Date(event.actualFireAtMs).toLocaleString('fa-AF')}
                  {event.delaySeconds > 0 ? ` (+${event.delaySeconds}s)` : ''}
                </Text>
              </View>
            ))}
          </View>
        ) : null}

        <View style={[styles.actionsCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
          <Text style={[styles.actionsTitle, { color: theme.text }]}>اقدامات</Text>
          <Button
            label={repairing ? 'در حال بازیابی...' : 'بازیابی اذان'}
            onPress={() => handleRepair().catch(() => {})}
            disabled={repairing || testing}
          />
          <Button
            label={testing ? 'در حال تست...' : 'تست زنده (۲۵ ثانیه)'}
            onPress={() => handleLiveTest().catch(() => {})}
            disabled={repairing || testing}
            variant="secondary"
          />
          <Pressable
            onPress={() => openOemAutostartSettings().catch(() => {})}
            style={[styles.linkButton, { borderColor: theme.cardBorder }]}
          >
            <Text style={[styles.linkButtonText, { color: theme.text }]}>راهنمای گوشی (Autostart)</Text>
          </Pressable>
          {testResult ? (
            <Text style={[styles.testResult, { color: theme.textSecondary }]}>{testResult}</Text>
          ) : null}
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: Spacing.md,
    gap: Spacing.sm,
    paddingBottom: Spacing.xl,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  unsupported: {
    fontFamily: 'Vazirmatn',
    fontSize: Typography.ui.body,
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  summaryCard: {
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  summaryRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  summaryText: {
    flex: 1,
    gap: 4,
  },
  summaryTitle: {
    fontFamily: 'Vazirmatn-Bold',
    fontSize: Typography.ui.subtitle,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  summaryBody: {
    fontFamily: 'Vazirmatn',
    fontSize: Typography.ui.caption,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  checkCard: {
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  checkRow: {
    flexDirection: 'row-reverse',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  checkText: {
    flex: 1,
    gap: 4,
  },
  checkTitle: {
    fontFamily: 'Vazirmatn-Bold',
    fontSize: Typography.ui.body,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  checkBody: {
    fontFamily: 'Vazirmatn',
    fontSize: Typography.ui.caption,
    lineHeight: 20,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  fixButton: {
    alignSelf: 'stretch',
    borderRadius: BorderRadius.full,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
  },
  fixButtonText: {
    fontFamily: 'Vazirmatn-Bold',
    fontSize: Typography.ui.caption,
    color: '#fff',
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  historyCard: {
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    gap: Spacing.xs,
  },
  historyTitle: {
    fontFamily: 'Vazirmatn-Bold',
    fontSize: Typography.ui.body,
    textAlign: 'right',
    writingDirection: 'rtl',
    marginBottom: Spacing.xs,
  },
  historyRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  historyMeta: {
    fontFamily: 'Vazirmatn',
    fontSize: Typography.ui.caption,
    writingDirection: 'rtl',
  },
  historyTime: {
    fontFamily: 'Vazirmatn',
    fontSize: Typography.ui.caption,
    flex: 1,
    textAlign: 'left',
  },
  actionsCard: {
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  actionsTitle: {
    fontFamily: 'Vazirmatn-Bold',
    fontSize: Typography.ui.body,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  linkButton: {
    borderWidth: 1,
    borderRadius: BorderRadius.full,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
  },
  linkButtonText: {
    fontFamily: 'Vazirmatn-Bold',
    fontSize: Typography.ui.caption,
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  testResult: {
    fontFamily: 'Vazirmatn',
    fontSize: Typography.ui.caption,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
});
