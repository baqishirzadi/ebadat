import { Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';

import { BorderRadius, Spacing, Typography } from '@/constants/theme';
import { useApp } from '@/context/AppContext';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost';
  disabled?: boolean;
  style?: ViewStyle;
}

export function Button({ label, onPress, variant = 'primary', disabled = false, style }: ButtonProps) {
  const { theme } = useApp();

  const backgroundColor =
    variant === 'primary' ? theme.tint : variant === 'secondary' ? theme.backgroundSecondary : 'transparent';
  const textColor = variant === 'primary' ? '#fff' : theme.text;
  const borderColor = variant === 'secondary' ? theme.cardBorder : 'transparent';

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={[
        styles.base,
        {
          backgroundColor,
          borderColor,
          opacity: disabled ? 0.5 : 1,
        },
        style,
      ]}
    >
      <Text style={[styles.label, { color: textColor }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    paddingVertical: Spacing.sm + 2,
    paddingHorizontal: Spacing.lg,
    alignItems: 'center',
  },
  label: {
    fontFamily: 'Vazirmatn-Bold',
    fontSize: Typography.ui.body,
    textAlign: 'center',
    writingDirection: 'rtl',
  },
});
