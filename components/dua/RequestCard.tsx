/**
 * Request Card Component
 * Displays a request in the list
 */

import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { DuaRequest, DUA_CATEGORIES } from '@/types/dua';
import { useApp } from '@/context/AppContext';
import { Typography, Spacing, BorderRadius } from '@/constants/theme';
import { StatusBadge } from './StatusBadge';
import CenteredText from '@/components/CenteredText';

interface RequestCardProps {
  request: DuaRequest;
  onPress?: () => void;
  disableNavigation?: boolean;
  showArrow?: boolean;
}

export function RequestCard({
  request,
  onPress,
  disableNavigation,
  showArrow = true,
}: RequestCardProps) {
  const { theme } = useApp();
  const router = useRouter();

  const category = DUA_CATEGORIES.find((c) => c.id === request.category);
  const categoryName = category?.nameDari || 'نامشخص';

  // Format date
  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('fa-AF', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const handlePress =
    onPress ??
    (disableNavigation
      ? undefined
      : () => router.push(`/dua-request/${request.id}`));

  return (
    <Pressable
      onPress={handlePress}
      disabled={!handlePress}
      style={({ pressed }) => [
        styles.container,
        {
          backgroundColor: theme.card,
          borderColor: theme.cardBorder,
        },
        pressed && handlePress && styles.pressed,
      ]}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <MaterialIcons
            name={category?.icon as any || 'help'}
            size={20}
            color={theme.tint}
          />
          <CenteredText style={[styles.category, { color: theme.textSecondary }]}>
            {categoryName}
          </CenteredText>
        </View>
        <StatusBadge status={request.status} />
      </View>

      {/* Message Preview */}
      <CenteredText style={[styles.message, { color: theme.text }]} numberOfLines={2}>
        {request.message}
      </CenteredText>

      {/* Footer */}
      <View style={styles.footer}>
        <CenteredText style={[styles.date, { color: theme.textSecondary }]}>
          {formatDate(request.createdAt)}
        </CenteredText>
        {request.status === 'answered' && (
          <View style={styles.answeredIndicator}>
            <MaterialIcons name="check-circle" size={16} color="#10B981" />
            <CenteredText style={styles.answeredText}>پاسخ داده شده</CenteredText>
          </View>
        )}
      </View>

      {/* Arrow */}
      {showArrow && (
        <MaterialIcons
          name="chevron-left"
          size={20}
          color={theme.icon}
          style={styles.arrow}
        />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginBottom: Spacing.sm,
  },
  pressed: {
    opacity: 0.8,
  },
  header: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
    gap: Spacing.xs,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
  },
  category: {
    fontSize: Typography.ui.caption,
    fontFamily: 'Vazirmatn',
  },
  message: {
    fontSize: Typography.ui.body,
    marginBottom: Spacing.sm,
    fontFamily: 'Vazirmatn',
    textAlign: 'center',
  },
  footer: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
  },
  date: {
    fontSize: Typography.ui.caption,
    fontFamily: 'Vazirmatn',
  },
  answeredIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  answeredText: {
    fontSize: Typography.ui.caption,
    color: '#10B981',
    fontFamily: 'Vazirmatn',
  },
  arrow: {
    position: 'absolute',
    left: Spacing.md,
    top: '50%',
    marginTop: -10,
  },
});
