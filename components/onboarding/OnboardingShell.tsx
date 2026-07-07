import { MaterialIcons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { RtlText } from '@/components/ui/RtlText';
import { RtlView } from '@/components/ui/RtlView';
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
    <RtlView style={[styles.container, { backgroundColor: theme.background, paddingTop: insets.top + Spacing.md }]}>
      <RtlView style={styles.topRow}>
        {showBack && onBack ? (
          <Pressable onPress={onBack} style={styles.backButton} hitSlop={12}>
            <MaterialIcons name="arrow-forward" size={24} color={theme.text} />
          </Pressable>
        ) : (
          <RtlView style={styles.backPlaceholder} />
        )}
        <RtlView style={styles.dots}>
          {Array.from({ length: totalSteps }).map((_, index) => (
            <RtlView
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
        </RtlView>
        <RtlView style={styles.backPlaceholder} />
      </RtlView>

      <RtlView style={styles.header}>
        <RtlText style={[styles.title, { color: theme.text }]}>{title}</RtlText>
        {subtitle ? <RtlText style={[styles.subtitle, { color: theme.textSecondary }]}>{subtitle}</RtlText> : null}
      </RtlView>

      <RtlView style={styles.body}>{children}</RtlView>

      <RtlView style={[styles.footer, { paddingBottom: Math.max(insets.bottom, Spacing.lg) }]}>
        <Pressable
          onPress={onPrimary}
          disabled={primaryDisabled}
          style={[
            styles.primaryButton,
            { backgroundColor: theme.tint, opacity: primaryDisabled ? 0.5 : 1 },
          ]}
        >
          <RtlText align="center" style={styles.primaryLabel}>{primaryLabel}</RtlText>
        </Pressable>
        {secondaryLabel && onSecondary ? (
          <Pressable onPress={onSecondary} style={styles.secondaryButton}>
            <RtlText align="center" style={[styles.secondaryLabel, { color: theme.textSecondary }]}>
              {secondaryLabel}
            </RtlText>
          </Pressable>
        ) : null}
      </RtlView>
    </RtlView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
  },
  topRow: {
    flexDirection: 'row',
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
    flexDirection: 'row',
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
  },
  subtitle: {
    fontFamily: 'Vazirmatn',
    fontSize: Typography.ui.body,
    lineHeight: 24,
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
  },
  secondaryButton: {
    paddingVertical: Spacing.sm,
    alignItems: 'center',
  },
  secondaryLabel: {
    fontFamily: 'Vazirmatn',
    fontSize: Typography.ui.caption,
  },
});
