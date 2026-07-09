import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

import CenteredText from '@/components/CenteredText';
import { BorderRadius, Spacing, Typography } from '@/constants/theme';
import { useApp } from '@/context/AppContext';

interface MoreHubTileProps {
  icon: keyof typeof MaterialIcons.glyphMap;
  label: string;
  subtitle: string;
  testID?: string;
  onPress: () => void;
}

export function MoreHubTile({ icon, label, subtitle, testID, onPress }: MoreHubTileProps) {
  const { theme } = useApp();

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
      </View>
      <CenteredText style={[styles.label, { color: theme.text }]}>{label}</CenteredText>
      <CenteredText style={[styles.subtitle, { color: theme.textSecondary }]}>{subtitle}</CenteredText>
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
