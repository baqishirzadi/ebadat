import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { type ReactNode, useCallback } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { RtlText } from '@/components/ui/RtlText';
import { BorderRadius, NAAT_GRADIENT, Spacing, Typography } from '@/constants/theme';
import { useApp } from '@/context/AppContext';
import { backIconName, directionStyle } from '@/utils/i18n/direction';
import { useI18n } from '@/utils/i18n/useI18n';

type ScreenHeaderVariant = 'standard' | 'toolbar' | 'hero';

interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  variant?: ScreenHeaderVariant;
  icon?: keyof typeof MaterialIcons.glyphMap;
  showBack?: boolean;
  onBack?: () => void;
  rightAction?: ReactNode;
  testID?: string;
}

export function ScreenHeader({
  title,
  subtitle,
  variant = 'standard',
  icon,
  showBack,
  onBack,
  rightAction,
  testID,
}: ScreenHeaderProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { themeMode } = useApp();
  const { language } = useI18n();

  const shouldShowBack = showBack ?? variant !== 'hero';

  const handleBack = useCallback(() => {
    if (onBack) {
      onBack();
      return;
    }
    if (router.canGoBack?.()) {
      router.back();
    } else {
      router.replace('/(tabs)/more');
    }
  }, [onBack, router]);

  const titleSize =
    variant === 'hero' ? Typography.ui.display : Typography.ui.heading;

  return (
    <LinearGradient
      colors={NAAT_GRADIENT[themeMode] ?? NAAT_GRADIENT.light}
      style={[
        styles.gradient,
        { paddingTop: insets.top + Spacing.sm },
      ]}
      testID={testID}
    >
      {variant === 'toolbar' ? (
        <View style={[styles.toolbarRow, directionStyle(language)]}>
          <View style={styles.toolbarSide}>
            {shouldShowBack ? (
              <Pressable onPress={handleBack} hitSlop={10} style={styles.backButton}>
                <View style={styles.iconUnmirrored}>
                  <MaterialIcons name={backIconName(language)} size={24} color="#fff" />
                </View>
              </Pressable>
            ) : (
              <View style={styles.backPlaceholder} />
            )}
          </View>
          <View style={styles.toolbarCenter}>
            <RtlText align="center" style={[styles.title, { fontSize: titleSize }]}>
              {title}
            </RtlText>
            {subtitle ? (
              <RtlText align="center" style={styles.subtitle}>
                {subtitle}
              </RtlText>
            ) : null}
          </View>
          <View style={styles.toolbarSide}>{rightAction ?? <View style={styles.backPlaceholder} />}</View>
        </View>
      ) : (
        <>
          {shouldShowBack || rightAction ? (
            <View
              pointerEvents="box-none"
              style={[
                styles.backRow,
                directionStyle(language),
                { top: insets.top + Spacing.sm },
              ]}
            >
              {shouldShowBack ? (
                <Pressable onPress={handleBack} hitSlop={10} style={styles.backButton}>
                  <View style={styles.iconUnmirrored}>
                    <MaterialIcons name={backIconName(language)} size={24} color="#fff" />
                  </View>
                </Pressable>
              ) : (
                <View style={styles.backPlaceholder} />
              )}
              {rightAction ? <View style={styles.backButton}>{rightAction}</View> : null}
            </View>
          ) : null}
          {icon ? (
            <MaterialIcons
              name={icon}
              size={variant === 'hero' ? 40 : 36}
              color="#fff"
              style={styles.icon}
            />
          ) : null}
          <RtlText
            align="center"
            style={[
              styles.title,
              { fontSize: titleSize },
              variant === 'hero' && styles.heroTitle,
            ]}
          >
            {title}
          </RtlText>
          {subtitle ? (
            <RtlText align="center" style={styles.subtitle}>
              {subtitle}
            </RtlText>
          ) : null}
        </>
      )}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    paddingBottom: Spacing.lg,
    paddingHorizontal: Spacing.lg,
    alignItems: 'center',
    borderBottomLeftRadius: BorderRadius.xl,
    borderBottomRightRadius: BorderRadius.xl,
    overflow: 'hidden',
  },
  toolbarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    minHeight: 44,
  },
  toolbarSide: {
    width: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toolbarCenter: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  backButton: {
    padding: Spacing.xs,
  },
  backRow: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
  },
  iconUnmirrored: {
    direction: 'ltr',
  },
  backPlaceholder: {
    width: 24,
    height: 24,
  },
  icon: {
    marginBottom: Spacing.xs,
  },
  title: {
    fontFamily: 'Vazirmatn-Bold',
    color: '#fff',
    marginTop: Spacing.xs,
  },
  heroTitle: {
    marginTop: Spacing.sm,
  },
  subtitle: {
    fontFamily: 'Vazirmatn',
    fontSize: Typography.ui.caption,
    color: 'rgba(255,255,255,0.8)',
    marginTop: Spacing.xs,
    paddingHorizontal: Spacing.sm,
  },
});
