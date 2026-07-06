import { MaterialIcons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BorderRadius, Spacing, Typography } from '@/constants/theme';
import { useApp } from '@/context/AppContext';

interface OnboardingShellProps {
  step: number;
  totalSteps: number;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  primaryLabel: string;
  onPrimary: () => void;
  primaryDisabled?: boolean;
  secondaryLabel?: string;
  onSecondary?: () => void;
  showBack?: boolean;
  onBack?: () => void;
}

export function OnboardingShell({
  step,
  totalSteps,
  title,
  subtitle,
  children,
  primaryLabel,
  onPrimary,
  primaryDisabled = false,
  secondaryLabel,
  onSecondary,
  showBack = false,
  onBack,
}: OnboardingShellProps) {
  const { theme } = useApp();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { backgroundColor: theme.background, paddingTop: insets.top + Spacing.md }]}>
      <View style={styles.topRow}>
        {showBack && onBack ? (
          <Pressable onPress={onBack} style={styles.backButton} hitSlop={12}>
            <MaterialIcons name="arrow-forward" size={24} color={theme.text} />
          </Pressable>
        ) : (
          <View style={styles.backPlaceholder} />
        )}
        <View style={styles.dots}>
          {Array.from({ length: totalSteps }).map((_, index) => (
            <View
              key={index}
              style={[
                styles.dot,
                {
                  backgroundColor: index <= step - 1 ? theme.tint : theme.divider,
                  width: index === step - 1 ? 20 : 8,
                },
              ]}
            />
          ))}
        </View>
        <View style={styles.backPlaceholder} />
      </View>

      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
        {subtitle ? <Text style={[styles.subtitle, { color: theme.textSecondary }]}>{subtitle}</Text> : null}
      </View>

      <View style={styles.body}>{children}</View>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, Spacing.lg) }]}>
        <Pressable
          onPress={onPrimary}
          disabled={primaryDisabled}
          style={[
            styles.primaryButton,
            { backgroundColor: theme.tint, opacity: primaryDisabled ? 0.5 : 1 },
          ]}
        >
          <Text style={styles.primaryLabel}>{primaryLabel}</Text>
        </Pressable>
        {secondaryLabel && onSecondary ? (
          <Pressable onPress={onSecondary} style={styles.secondaryButton}>
            <Text style={[styles.secondaryLabel, { color: theme.textSecondary }]}>{secondaryLabel}</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
  },
  topRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.lg,
  },
  backButton: {
    padding: Spacing.xs,
  },
  backPlaceholder: {
    width: 32,
  },
  dots: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    height: 8,
    borderRadius: BorderRadius.full,
  },
  header: {
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  title: {
    fontFamily: 'Vazirmatn-Bold',
    fontSize: Typography.ui.heading,
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  subtitle: {
    fontFamily: 'Vazirmatn',
    fontSize: Typography.ui.body,
    lineHeight: 24,
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  body: {
    flex: 1,
  },
  footer: {
    gap: Spacing.sm,
    paddingTop: Spacing.md,
  },
  primaryButton: {
    borderRadius: BorderRadius.full,
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  primaryLabel: {
    color: '#fff',
    fontFamily: 'Vazirmatn-Bold',
    fontSize: Typography.ui.body,
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  secondaryButton: {
    paddingVertical: Spacing.sm,
    alignItems: 'center',
  },
  secondaryLabel: {
    fontFamily: 'Vazirmatn',
    fontSize: Typography.ui.caption,
    textAlign: 'center',
    writingDirection: 'rtl',
  },
});
