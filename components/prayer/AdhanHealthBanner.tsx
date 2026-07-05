import { MaterialIcons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useState } from 'react';
import { Linking, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { BorderRadius, Spacing, Typography } from '@/constants/theme';
import {
  AdhanHealthState,
  fetchAdhanHealth,
  getHealthBannerMessage,
  openBatteryOptimizationSettings,
  openNotificationSettings,
  openOemAutostartSettings,
  snoozeBatteryNudge,
  triggerAdhanMaintenance,
} from '@/utils/adhanHealth';

interface AdhanHealthBannerProps {
  theme: {
    card: string;
    cardBorder: string;
    text: string;
    textSecondary: string;
    tint: string;
    backgroundSecondary: string;
  };
  onSelectCity?: () => void;
}

export function AdhanHealthBanner({ theme, onSelectCity }: AdhanHealthBannerProps) {
  const [health, setHealth] = useState<AdhanHealthState | null>(null);
  const [dismissedBattery, setDismissedBattery] = useState(false);

  const refresh = useCallback(async () => {
    if (Platform.OS !== 'android') return;
    const next = await fetchAdhanHealth();
    setHealth(next);
  }, []);

  useEffect(() => {
    refresh().catch(() => {});
  }, [refresh]);

  if (!health || Platform.OS !== 'android') return null;

  const showHealth = health.shouldShowHealthBanner;
  const showBattery = health.shouldShowBatteryNudge && !dismissedBattery;

  if (!showHealth && !showBattery) return null;

  const healthCopy = showHealth ? getHealthBannerMessage(health.issues) : null;

  const handleHealthAction = async () => {
    if (health.issues.includes('notification_denied')) {
      await openNotificationSettings();
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
        <View style={[styles.card, { backgroundColor: '#fff4e5', borderColor: '#f0b429' }]}>
          <View style={styles.row}>
            <MaterialIcons name="notifications-off" size={22} color="#b26a00" />
            <View style={styles.textBlock}>
              <Text style={[styles.title, { color: theme.text }]}>{healthCopy.title}</Text>
              <Text style={[styles.body, { color: theme.textSecondary }]}>{healthCopy.body}</Text>
            </View>
          </View>
          <Pressable
            testID="adhan-health-banner-action"
            onPress={() => handleHealthAction().catch(() => {})}
            style={[styles.button, { backgroundColor: theme.tint }]}
          >
            <Text style={styles.buttonText}>رفع مشکل</Text>
          </Pressable>
        </View>
      ) : null}

      {showBattery ? (
        <View style={[styles.card, { backgroundColor: theme.backgroundSecondary, borderColor: theme.cardBorder }]}>
          <View style={styles.row}>
            <MaterialIcons name="battery-alert" size={22} color="#D4AF37" />
            <View style={styles.textBlock}>
              <Text style={[styles.title, { color: theme.text }]}>بهینه‌سازی باتری</Text>
              <Text style={[styles.body, { color: theme.textSecondary }]}>
                برای اطمینان از پخش به‌موقع اذان، بهینه‌سازی باتری را برای عبادت غیرفعال کنید.
              </Text>
            </View>
          </View>
          <View style={styles.actions}>
            <Pressable
              testID="adhan-battery-nudge-open"
              onPress={() => openBatteryOptimizationSettings().catch(() => {})}
              style={[styles.button, { backgroundColor: theme.tint }]}
            >
              <Text style={styles.buttonText}>تنظیمات باتری</Text>
            </Pressable>
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
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  card: {
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
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
  button: {
    borderRadius: BorderRadius.full,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontFamily: 'Vazirmatn-Bold',
    fontSize: Typography.ui.caption,
    textAlign: 'center',
    writingDirection: 'rtl',
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
