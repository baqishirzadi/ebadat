import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';

import { Linking, Platform, Pressable, StyleSheet, View } from 'react-native';
import { LocalizedText } from '@/components/ui/LocalizedText';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { BorderRadius, Spacing, Typography } from '@/constants/theme';
import { useApp } from '@/context/AppContext';
import {
  AdhanHealthState,
  fetchAdhanHealth,
  openExactAlarmSettings,
} from '@/utils/adhanHealth';
import { adhanPermissionLocale, tAdhanPermission } from '@/utils/i18n/adhanPermissions';

interface AdhanHealthBannerProps {
  onSelectCity?: () => void;
}

export function AdhanHealthBanner({ onSelectCity: _onSelectCity }: AdhanHealthBannerProps) {
  const { theme, state } = useApp();
  const locale = adhanPermissionLocale(state.preferences.appLanguage);
  const router = useRouter();
  const [health, setHealth] = useState<AdhanHealthState | null>(null);

  const refresh = useCallback(async () => {
    const next = await fetchAdhanHealth();
    setHealth(next);
  }, []);

  useEffect(() => {
    refresh().catch(() => {});
  }, [refresh]);

  const handleExactAlarmAction = useCallback(async () => {
    const opened = await openExactAlarmSettings();
    if (!opened) {
      await Linking.openSettings();
    }
    await refresh();
  }, [refresh]);

  if (Platform.OS !== 'android' || !health?.shouldShowExactAlarmBanner) {
    return null;
  }

  return (
    <View style={styles.stack}>
      <Card style={{ ...styles.card, backgroundColor: theme.warningSurface, borderColor: theme.warning }}>
        <View style={styles.row}>
          <MaterialIcons name="alarm" size={22} color={theme.warning} />
          <View style={styles.textBlock}>
            <LocalizedText style={[styles.body, { color: theme.text }]}>
              {tAdhanPermission('adhanPermissions.banner.body', locale)}
            </LocalizedText>
          </View>
        </View>
        <Button
          label={tAdhanPermission('adhanPermissions.banner.button', locale)}
          onPress={() => handleExactAlarmAction().catch(() => {})}
        />
        <Pressable
          onPress={() => router.push('/adhan-health')}
          style={[styles.secondaryButton, { borderColor: theme.cardBorder }]}
        >
          <LocalizedText style={[styles.secondaryButtonText, { color: theme.text }]}>
            {tAdhanPermission('adhanPermissions.health.fullCheck', locale)}
          </LocalizedText>
        </Pressable>
      </Card>
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
  },
  body: {
    fontFamily: 'Vazirmatn',
    fontSize: Typography.ui.caption,
    lineHeight: 22,
    textAlign: 'right',
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
});
