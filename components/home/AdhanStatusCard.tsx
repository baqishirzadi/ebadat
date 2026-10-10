import { MaterialIcons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Alert, InteractionManager, Platform, Pressable, StyleSheet } from 'react-native';

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

const FAIL_COLOR = '#c0392b';

function borderColorForStatus(status: HealthVisualStatus, theme: ReturnType<typeof useApp>['theme']): string {
  switch (status) {
    case 'healthy':
      return theme.tint;
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
  const { t, fontFamily, language } = useI18n();
  const locale = adhanPermissionLocale(state.preferences.appLanguage);
  const hasStatusRef = useRef(false);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<HealthVisualStatus>('warning');
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const isNastaliq = fontFamily === 'NotoNastaliqUrdu';
  const subtitleLineHeight = language !== 'english' ? (isNastaliq ? 28 : 24) : 20;
  // Two summary lines plus the status chip. Keeping this slot stable stops the
  // card from resizing when a refresh finishes during an iOS swipe-back.
  const statusSlotMinHeight = subtitleLineHeight * 2 + 40;

  const refresh = useCallback(async (isCancelled: () => boolean) => {
    const showSpinner = !hasStatusRef.current;
    if (showSpinner) setLoading(true);
    try {
      const report = await buildAdhanHealthReport(locale);
      if (isCancelled()) return;
      setStatus(homeCardStatusFromReport(report));
      setNotificationsEnabled(report.health.notificationsEnabled);
      hasStatusRef.current = true;
    } catch {
      if (isCancelled()) return;
      if (!hasStatusRef.current) {
        setStatus('warning');
        setNotificationsEnabled(true);
      }
      hasStatusRef.current = true;
    } finally {
      if (showSpinner) setLoading(false);
    }
  }, [locale]);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      const task = InteractionManager.runAfterInteractions(() => {
        if (!cancelled) refresh(() => cancelled).catch(() => {});
      });
      return () => {
        cancelled = true;
        task.cancel();
      };
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
          <RtlView style={[styles.statusSlot, { minHeight: statusSlotMinHeight }]}>
            {loading ? (
              <ActivityIndicator color={theme.tint} size="small" />
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
  statusSlot: {
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
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
});
