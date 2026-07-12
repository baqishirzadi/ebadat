import { MaterialIcons } from '@expo/vector-icons';
import { Linking, Platform, StyleSheet, View } from 'react-native';

import { RtlText } from '@/components/ui/RtlText';
import { RtlView } from '@/components/ui/RtlView';
import { BorderRadius, Spacing, Typography } from '@/constants/theme';
import { useApp } from '@/context/AppContext';
import { resolveOemGuideKey, tAdhanPermissionSteps } from '@/utils/i18n/adhanPermissions';

interface OemAutostartGuideProps {
  manufacturer: string;
}

export function OemAutostartGuide({ manufacturer }: OemAutostartGuideProps) {
  const { theme } = useApp();
  const oemKey = resolveOemGuideKey(manufacturer);
  const steps = tAdhanPermissionSteps(oemKey);

  return (
    <RtlView style={[styles.card, { backgroundColor: theme.backgroundSecondary, borderColor: theme.cardBorder }]}>
      {steps.map((step, index) => (
        <RtlView key={`${oemKey}-${index}`} style={styles.stepRow}>
          <View style={[styles.badge, { backgroundColor: theme.tint }]}>
            <RtlText align="center" style={styles.badgeText}>
              {(index + 1).toLocaleString('fa-AF')}
            </RtlText>
          </View>
          <RtlText style={[styles.stepText, { color: theme.text }]}>{step}</RtlText>
        </RtlView>
      ))}
    </RtlView>
  );
}

export async function openAppDetailsSettings(): Promise<void> {
  if (Platform.OS !== 'android') {
    await Linking.openSettings();
    return;
  }
  try {
    const { NativeModules } = await import('react-native');
    const module = (NativeModules as {
      ExactAlarmModule?: { openExactAlarmSettings?: () => Promise<boolean> };
    }).ExactAlarmModule;
    if (typeof module?.openExactAlarmSettings === 'function') {
      await module.openExactAlarmSettings();
      return;
    }
  } catch {
    // fall through
  }
  await Linking.openSettings();
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  stepRow: {
    flexDirection: 'row-reverse',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  badge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: '#fff',
    fontFamily: 'Vazirmatn-Bold',
    fontSize: Typography.ui.caption,
  },
  stepText: {
    flex: 1,
    fontFamily: 'Vazirmatn',
    fontSize: Typography.ui.body,
    lineHeight: 24,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
});
