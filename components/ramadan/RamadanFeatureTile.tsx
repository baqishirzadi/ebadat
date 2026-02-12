/**
 * Ramadan Feature Tile
 * Reusable entry card for Ramadan planner
 */

import React from 'react';
import { View, StyleSheet, Pressable, StyleProp, ViewStyle } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useApp } from '@/context/AppContext';
import { Typography, Spacing, BorderRadius } from '@/constants/theme';
import CenteredText from '@/components/CenteredText';
import { RAMADAN_FEATURE_COPY } from '@/constants/ramadanContent';

interface RamadanFeatureTileProps {
  variant?: 'full' | 'compact';
  showSubtitle?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function RamadanFeatureTile({
  variant = 'full',
  showSubtitle = true,
  style,
}: RamadanFeatureTileProps) {
  const { theme } = useApp();
  const router = useRouter();
  const isCompact = variant === 'compact';

  return (
    <Pressable
      onPress={() => router.push('/ramadan')}
      style={({ pressed }) => [
        styles.container,
        isCompact && styles.containerCompact,
        {
          backgroundColor: theme.surahHeader,
          shadowColor: theme.surahHeader,
        },
        pressed && styles.pressed,
        style,
      ]}
    >
      <View style={styles.contentRow}>
        <View style={[styles.iconContainer, isCompact && styles.iconContainerCompact]}>
          <MaterialIcons name="nights-stay" size={isCompact ? 20 : 22} color="#fff" />
        </View>

        <View style={styles.content}>
          <CenteredText style={[styles.title, isCompact && styles.titleCompact]}>
            {RAMADAN_FEATURE_COPY.title}
          </CenteredText>
          {showSubtitle && (
            <CenteredText style={[styles.subtitle, isCompact && styles.subtitleCompact]} numberOfLines={2}>
              {RAMADAN_FEATURE_COPY.subtitle}
            </CenteredText>
          )}
        </View>
      </View>

      <MaterialIcons name="chevron-left" size={24} color="rgba(255,255,255,0.85)" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 4,
  },
  containerCompact: {
    paddingVertical: Spacing.sm,
  },
  pressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flex: 1,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainerCompact: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  content: {
    flex: 1,
    alignItems: 'center',
  },
  title: {
    fontSize: Typography.ui.body,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 2,
    textAlign: 'center',
    writingDirection: 'rtl',
    includeFontPadding: false,
    fontFamily: 'Vazirmatn',
  },
  titleCompact: {
    marginBottom: 0,
  },
  subtitle: {
    fontSize: Typography.ui.caption,
    color: 'rgba(255,255,255,0.88)',
    textAlign: 'center',
    writingDirection: 'rtl',
    includeFontPadding: false,
    fontFamily: 'Vazirmatn',
  },
  subtitleCompact: {
    fontSize: 11,
  },
});

export default RamadanFeatureTile;
