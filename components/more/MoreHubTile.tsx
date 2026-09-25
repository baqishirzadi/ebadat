import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

import CenteredText from '@/components/CenteredText';
import { BorderRadius, Spacing, Typography } from '@/constants/theme';
import { useApp } from '@/context/AppContext';
import { useI18n } from '@/utils/i18n/useI18n';

interface MoreHubTileProps {
  icon: keyof typeof MaterialIcons.glyphMap;
  label: string;
  subtitle: string;
  testID?: string;
  badgeCount?: number;
  onPress: () => void;
}

export function MoreHubTile({
  icon,
  label,
  subtitle,
  testID,
  badgeCount = 0,
  onPress,
}: MoreHubTileProps) {
  const { theme } = useApp();
  const { isPashto, fontFamily } = useI18n();
  const isNastaliq = fontFamily === 'NotoNastaliqUrdu';
  const subtitleLineHeight = isPashto ? (isNastaliq ? 30 : 26) : 22;

  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      style={({ pressed }) => [
        styles.tile,
        { backgroundColor: theme.card, borderColor: theme.cardBorder },
        pressed && styles.pressed,
      ]}
    >
      <View style={[styles.iconWrap, { backgroundColor: `${theme.tint}18`, borderColor: `${theme.tint}30` }]}>
        <MaterialIcons name={icon} size={24} color={theme.tint} />
        {badgeCount > 0 ? (
          <View style={styles.badge}>
            <CenteredText style={styles.badgeText}>
              {badgeCount > 9 ? '۹+' : String(badgeCount)}
            </CenteredText>
          </View>
        ) : null}
      </View>
      <CenteredText style={[styles.label, { color: theme.text }]}>{label}</CenteredText>
      <CenteredText style={[styles.subtitle, { color: theme.textSecondary, lineHeight: subtitleLineHeight }]}>
        {subtitle}
      </CenteredText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tile: {
    width: '48%',
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.md,
    alignItems: 'center',
  },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#E11D48',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
    lineHeight: 12,
  },
  label: {
    fontSize: Typography.ui.body,
    fontWeight: '700',
    fontFamily: 'Vazirmatn-Bold',
  },
  subtitle: {
    fontSize: Typography.ui.caption,
    marginTop: Spacing.xs,
    lineHeight: 22,
    fontFamily: 'Vazirmatn',
  },
  pressed: {
    opacity: 0.92,
    transform: [{ scale: 0.985 }],
  },
});
