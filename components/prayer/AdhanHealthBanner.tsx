import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { Linking, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { BorderRadius, Spacing, Typography } from '@/constants/theme';
import { useApp } from '@/context/AppContext';
import {
  AdhanHealthState,
  fetchAdhanHealth,
  getHealthBannerMessage,
  openBatteryOptimizationSettings,
  openExactAlarmSettings,
  openNotificationSettings,
  openOemAutostartSettings,
  snoozeBatteryNudge,
  triggerAdhanMaintenance,
} from '@/utils/adhanHealth';

interface AdhanHealthBannerProps {
  onSelectCity?: () => void;
}

export function AdhanHealthBanner({ onSelectCity }: AdhanHealthBannerProps) {
  const { theme } = useApp();
  const router = useRouter();
  const [health, setHealth] = useState<AdhanHealthState | null>(null);
  const [dismissedBattery, setDismissedBattery] = useState(false);

  const refresh = useCallback(async () => {
    const next = await fetchAdhanHealth();
    setHealth(next);
  }, []);

  useEffect(() => {
    refresh().catch(() => {});
  }, [refresh]);

  if (!health) return null;

  const showHealth = health.shouldShowHealthBanner;
  const showBattery = Platform.OS === 'android' && health.shouldShowBatteryNudge && !dismissedBattery;

  if (!showHealth && !showBattery) return null;

  const healthCopy = showHealth ? getHealthBannerMessage(health.issues) : null;

  const handleHealthAction = async () => {
    if (health.issues.includes('notification_denied')) {
      await openNotificationSettings();
      return;
    }
    if (health.issues.includes('exact_alarm_missing')) {
      const opened = await openExactAlarmSettings();
      if (!opened) {
        await openNotificationSettings();
      }
      return;
    }
    if (health.issues.includes('alarms_not_firing') || health.issues.includes('channel_unhealthy')) {
      router.push('/adhan-health');
      return;
    }
    if (health.issues.includes('config_missing') && onSelectCity) {
      onSelectCity();
      return;
    }
    if (health.issues.includes('no_alarms_scheduled')) {
      await triggerAdhanMaintenance();
      await refresh();
    }
  };

  return (
    <View style={styles.stack}>
      {showHealth && healthCopy ? (
        <View style={[styles.card, { backgroundColor: theme.warningSurface, borderColor: theme.warning, gap: Spacing.sm }]}>
          <View style={styles.row}>
            <MaterialIcons name="notifications-off" size={22} color={theme.warning} />
            <View style={styles.textBlock}>
              <Text style={[styles.title, { color: theme.text }]}>{healthCopy.title}</Text>
              <Text style={[styles.body, { color: theme.textSecondary }]}>{healthCopy.body}</Text>
            </View>
          </View>
          <Button label="رفع مشکل" onPress={() => handleHealthAction().catch(() => {})} />
          {Platform.OS === 'android' ? (
            <Pressable
              onPress={() => router.push('/adhan-health')}
              style={[styles.secondaryButton, { borderColor: theme.cardBorder }]}
            >
              <Text style={[styles.secondaryButtonText, { color: theme.text }]}>بررسی کامل سلامت</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      {showBattery ? (
        <Card style={styles.card}>
          <View style={styles.row}>
            <MaterialIcons name="battery-alert" size={22} color={theme.accent} />
            <View style={styles.textBlock}>
              <Text style={[styles.title, { color: theme.text }]}>بهینه‌سازی باتری</Text>
              <Text style={[styles.body, { color: theme.textSecondary }]}>
                برای اطمینان از پخش به‌موقع اذان، بهینه‌سازی باتری را برای عبادت غیرفعال کنید.
              </Text>
            </View>
          </View>
          <View style={styles.actions}>
            <Button label="تنظیمات باتری" onPress={() => openBatteryOptimizationSettings().catch(() => {})} />
            <Pressable
              testID="adhan-battery-nudge-oem"
              onPress={() => openOemAutostartSettings().catch(() => Linking.openSettings())}
              style={[styles.secondaryButton, { borderColor: theme.cardBorder }]}
            >
              <Text style={[styles.secondaryButtonText, { color: theme.text }]}>راهنمای گوشی</Text>
            </Pressable>
            <Pressable
              testID="adhan-battery-nudge-dismiss"
              onPress={() => {
                snoozeBatteryNudge().catch(() => {});
                setDismissedBattery(true);
              }}
              style={styles.dismiss}
            >
              <Text style={[styles.dismissText, { color: theme.textSecondary }]}>بعداً</Text>
            </Pressable>
          </View>
        </Card>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: Spacing.sm,
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.md,
  },
  card: {
    gap: Spacing.sm,
  },
  row: {
    flexDirection: 'row-reverse',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  textBlock: {
    flex: 1,
    gap: 4,
  },
  title: {
    fontFamily: 'Vazirmatn-Bold',
    fontSize: Typography.ui.body,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  body: {
    fontFamily: 'Vazirmatn',
    fontSize: Typography.ui.caption,
    lineHeight: 20,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  actions: {
    gap: Spacing.xs,
    alignItems: 'stretch',
  },
  secondaryButton: {
    borderWidth: 1,
    borderRadius: BorderRadius.full,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontFamily: 'Vazirmatn-Bold',
    fontSize: Typography.ui.caption,
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  dismiss: {
    alignSelf: 'center',
    paddingVertical: Spacing.xs,
  },
  dismissText: {
    fontFamily: 'Vazirmatn',
    fontSize: Typography.ui.caption,
    textAlign: 'center',
    writingDirection: 'rtl',
  },
});
