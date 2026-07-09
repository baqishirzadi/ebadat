import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

import CenteredText from '@/components/CenteredText';
import { BorderRadius, Spacing, Typography } from '@/constants/theme';
import { useApp } from '@/context/AppContext';

interface MoreHubRowProps {
  icon: keyof typeof MaterialIcons.glyphMap;
  label: string;
  subtitle: string;
  testID?: string;
  onPress: () => void;
}

export function MoreHubRow({ icon, label, subtitle, testID, onPress }: MoreHubRowProps) {
  const { theme } = useApp();

  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        { backgroundColor: theme.card, borderColor: theme.cardBorder },
        pressed && styles.pressed,
      ]}
    >
      <MaterialIcons name="chevron-left" size={22} color={theme.icon} />
      <View style={styles.textWrap}>
        <CenteredText style={[styles.label, { color: theme.text }]}>{label}</CenteredText>
        <CenteredText style={[styles.subtitle, { color: theme.textSecondary }]}>{subtitle}</CenteredText>
      </View>
      <View style={[styles.iconWrap, { backgroundColor: `${theme.tint}18`, borderColor: `${theme.tint}30` }]}>
        <MaterialIcons name={icon} size={22} color={theme.tint} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.md,
    gap: Spacing.md,
  },
  textWrap: {
    flex: 1,
    alignItems: 'center',
  },
  label: {
    fontSize: Typography.ui.body,
    fontWeight: '700',
    fontFamily: 'Vazirmatn-Bold',
  },
  subtitle: {
    fontSize: Typography.ui.caption,
    marginTop: 4,
    lineHeight: 20,
    fontFamily: 'Vazirmatn',
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.92,
    transform: [{ scale: 0.985 }],
  },
});
