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
import { useI18n } from '@/utils/i18n/useI18n';
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
import { adhanPermissionLocale, tAdhanPermission, type AdhanPermissionLocale } from '@/utils/i18n/adhanPermissions';
import { markOemAutostartAcknowledged } from '@/utils/prayerOnboarding';
import { formatGregorianDateTimeCompact } from '@/utils/calendarDisplay';
import { toArabicNumerals } from '@/utils/numbers';

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

function overallLabelKey(
  status: AdhanHealthReport['overallStatus'],
): 'adhanHealth.overall.healthy' | 'adhanHealth.overall.warning' | 'adhanHealth.overall.critical' {
  switch (status) {
    case 'healthy':
      return 'adhanHealth.overall.healthy';
    case 'warning':
      return 'adhanHealth.overall.warning';
    default:
      return 'adhanHealth.overall.critical';
  }
}

function checkChipLabel(status: AdhanHealthCheckItem['status'], locale: AdhanPermissionLocale): string {
  return status === 'pass'
    ? tAdhanPermission('adhanPermissions.health.statusPass', locale)
    : tAdhanPermission('adhanPermissions.health.statusWarn', locale);
}

export default function AdhanHealthScreen() {
  const { theme, state } = useApp();
  const { t, language } = useI18n();
  const locale = adhanPermissionLocale(state.preferences.appLanguage);
  const { requestPrayerSchedule } = usePrayer();
  const [report, setReport] = useState<AdhanHealthReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [repairing, setRepairing] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  const formatAlarmTime = useCallback(
    (ms: number) => {
      const date = new Date(ms);
      if (language === 'english') {
        return formatGregorianDateTimeCompact(date, String, 'en-US');
      }
      if (language === 'pashto') {
        return formatGregorianDateTimeCompact(date, toArabicNumerals, 'ps-AF');
      }
      return formatGregorianDateTimeCompact(date, toArabicNumerals, 'fa-AF');
    },
    [language],
  );

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const next = await buildAdhanHealthReport(locale);
      setReport(next);
    } catch {
      Alert.alert(t('adhanHealth.error'), t('adhanHealth.refreshFailed'));
    } finally {
      setLoading(false);
    }
  }, [locale, t]);

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
      Alert.alert(t('adhanHealth.repairDoneTitle'), t('adhanHealth.repairDoneBody'));
    } catch {
      Alert.alert(t('adhanHealth.error'), t('adhanHealth.repairFailed'));
    } finally {
      setRepairing(false);
    }
  }, [refresh, requestPrayerSchedule, t]);

  const handleLiveTest = useCallback(async () => {
    setTesting(true);
    setTestResult(t('adhanHealth.testWaiting'));
    try {
      const result = await runVerifiedAdhanSystemTest();
      if (result.passed) {
        setTestResult(t('adhanHealth.testPassed'));
      } else {
        setTestResult(t('adhanHealth.testFailed'));
      }
      await refresh();
    } catch {
      setTestResult(t('adhanHealth.testError'));
    } finally {
      setTesting(false);
    }
  }, [refresh, t]);

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
          await handleRepair();
          return;
        case 'delivery':
          await handleLiveTest();
          return;
        default:
          return;
      }
    },
    [handleLiveTest, handleRepair, refresh],
  );

  if (Platform.OS !== 'android') {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <ScreenHeader title={tAdhanPermission('adhanPermissions.health.title', locale)} />
        <View style={[styles.centered, styles.rtlRoot, { backgroundColor: theme.background }]}>
          <RtlText align="center" style={[styles.unsupported, { color: theme.textSecondary }]}>
            {t('adhanHealth.androidOnly')}
          </RtlText>
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ScreenHeader title={tAdhanPermission('adhanPermissions.health.title', locale)} />
      <ScrollView
        testID="android-adhan-health"
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
                {t(overallLabelKey(report.overallStatus))}
              </RtlText>
              <RtlText align="center" style={[styles.summaryBody, { color: theme.textSecondary }]}>
                {report.health.scheduledAlarmCount > 0 && report.health.nextAlarmAtMs
                  ? t('adhanHealth.nextAdhan', { time: formatAlarmTime(report.health.nextAlarmAtMs) })
                  : t('adhanHealth.scheduleHint')}
              </RtlText>
              <Button label={t('adhanHealth.refresh')} onPress={() => refresh().catch(() => {})} variant="secondary" />
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
                {checkChipLabel(check.status, locale)}
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
              {t('adhanHealth.recentEvents')}
            </RtlText>
            {report.firedEvents.slice(0, 5).map((event) => (
              <RtlView key={`${event.id}-${event.actualFireAtMs}`} style={styles.historyRow}>
                <RtlText align="center" style={[styles.historyMeta, { color: theme.textSecondary }]}>
                  {event.type === 'system_test'
                    ? t('adhanHealth.event.systemTest')
                    : event.type === 'maintenance'
                      ? t('adhanHealth.event.maintenance')
                      : event.prayer || t('adhanHealth.event.adhan')}
                </RtlText>
                <RtlText align="center" style={[styles.historyTime, { color: theme.text }]}>
                  {formatAlarmTime(event.actualFireAtMs)}
                  {event.delaySeconds > 0 ? ` (+${event.delaySeconds}s)` : ''}
                </RtlText>
              </RtlView>
            ))}
          </View>
        ) : null}

        <View style={[styles.actionsCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
          <RtlText align="center" style={[styles.actionsTitle, { color: theme.text }]}>
            {t('adhanHealth.actions')}
          </RtlText>
          <Button
            label={repairing ? t('adhanHealth.repairing') : t('adhanHealth.repair')}
            onPress={() => handleRepair().catch(() => {})}
            disabled={repairing || testing}
            style={styles.fullWidthButton}
          />
          <Button
            label={testing ? t('adhanHealth.testing') : t('adhanHealth.liveTest')}
            onPress={() => handleLiveTest().catch(() => {})}
            disabled={repairing || testing}
            variant="secondary"
            style={styles.fullWidthButton}
          />
          <View style={styles.fullWidthButton}>
            <AdhanHealthActionRow
              label={t('adhanHealth.oemGuide')}
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
