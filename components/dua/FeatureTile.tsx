/**
 * Dua Request Feature Tile
 * Home screen entry point
 */

import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useApp } from '@/context/AppContext';
import { useDua } from '@/context/DuaContext';
import { Typography, Spacing, BorderRadius } from '@/constants/theme';
import CenteredText from '@/components/CenteredText';
import { UnreadCountBadge } from '@/components/dua/UnreadCountBadge';
import { useI18n } from '@/utils/i18n/useI18n';

export function DuaFeatureTile() {
  const { theme } = useApp();
  const { t } = useI18n();
  const { unreadCount } = useDua();
  const router = useRouter();

  return (
    <Pressable
      onPress={() => router.push('/dua-request')}
      style={({ pressed }) => [
        styles.container,
        {
          backgroundColor: theme.card,
          borderColor: theme.cardBorder,
        },
        pressed && styles.pressed,
      ]}
    >
      {/* Icon */}
      <View style={[styles.iconContainer, { backgroundColor: `${theme.tint}20` }]}>
        <MaterialIcons name="favorite" size={32} color={theme.tint} />
        <UnreadCountBadge count={unreadCount} style={styles.badge} />
      </View>

      {/* Content */}
      <View style={styles.content}>
        <CenteredText style={[styles.title, { color: theme.text }]}>
          {t('adhkar.dua.title')}
        </CenteredText>
        <CenteredText style={[styles.description, { color: theme.textSecondary }]} numberOfLines={2}>
          {t('adhkar.dua.body')}
        </CenteredText>
      </View>

      {/* Arrow */}
      <MaterialIcons name="chevron-left" size={24} color={theme.icon} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginBottom: Spacing.md,
    gap: Spacing.md,
  },
  pressed: {
    opacity: 0.8,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badge: {
    top: -2,
    left: -2,
  },
  content: {
    flex: 1,
    alignItems: 'center',
  },
  title: {
    fontSize: Typography.ui.subtitle,
    fontWeight: '700',
    marginBottom: Spacing.xs,
    fontFamily: 'Vazirmatn',
  },
  description: {
    fontSize: Typography.ui.caption,
    fontFamily: 'Vazirmatn',
  },
});
