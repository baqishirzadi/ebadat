import { MaterialIcons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, ScrollView, StyleSheet } from 'react-native';
import { useNavigation } from 'expo-router';
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
  secondaryMuted?: boolean;
  showBack?: boolean;
  onBack?: () => void;
  scrollable?: boolean;
  contentAlign?: 'stretch' | 'center';
  compactHeader?: boolean;
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
  secondaryMuted = false,
  showBack = false,
  onBack,
  scrollable = true,
  contentAlign = 'stretch',
  compactHeader = false,
}: OnboardingShellProps) {
  const { theme } = useApp();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();

  const footerPaddingBottom = Math.max(insets.bottom, Spacing.lg);

  return (
    <RtlView style={[styles.container, { backgroundColor: theme.background, paddingTop: insets.top + Spacing.md }]}>
      <RtlView style={[styles.topRow, compactHeader && styles.topRowCompact]}>
        {showBack ? (
          <Pressable
            onPress={() => {
              if (onBack) {
                onBack();
                return;
              }
              if (navigation.canGoBack()) {
                navigation.goBack();
              }
            }}
            style={styles.backButton}
            hitSlop={12}
          >
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

      <RtlView style={[styles.header, compactHeader && styles.headerCompact]}>
        <RtlText align="center" style={[styles.title, { color: theme.text }]}>{title}</RtlText>
        {subtitle ? (
          <RtlText align="center" style={[styles.subtitle, { color: theme.textSecondary }]}>
            {subtitle}
          </RtlText>
        ) : null}
      </RtlView>

      {scrollable ? (
        <ScrollView
          style={styles.body}
          contentContainerStyle={[
            styles.bodyContent,
            contentAlign === 'center' && styles.bodyContentCentered,
            { paddingBottom: Spacing.md },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {children}
        </ScrollView>
      ) : (
        <RtlView style={[styles.body, contentAlign === 'center' && styles.bodyContentCentered]}>{children}</RtlView>
      )}

      <RtlView style={[styles.footer, { paddingBottom: footerPaddingBottom }]}>
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
            <RtlText
              align="center"
              style={[
                secondaryMuted ? styles.secondaryMuted : styles.secondaryLabel,
                { color: theme.textSecondary },
              ]}
            >
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
  topRowCompact: {
    marginBottom: Spacing.md,
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
  headerCompact: {
    marginBottom: Spacing.md,
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
  bodyContent: {
    flexGrow: 1,
  },
  bodyContentCentered: {
    alignItems: 'center',
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
  secondaryMuted: {
    fontFamily: 'Vazirmatn',
    fontSize: Typography.ui.caption - 1,
    opacity: 0.75,
  },
});
