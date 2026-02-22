/**
 * Scholar Card Component
 * Displays scholar information
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useApp } from '@/context/AppContext';
import { Scholar } from '@/types/articles';
import { Spacing, BorderRadius } from '@/constants/theme';
import CenteredText from '@/components/CenteredText';

interface ScholarCardProps {
  scholar: Scholar;
}

export function ScholarCard({ scholar }: ScholarCardProps) {
  const { theme } = useApp();

  return (
    <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
      {scholar.photoUrl ? (
        <View style={[styles.avatar, { backgroundColor: theme.backgroundSecondary }]}>
          <MaterialIcons name="person" size={32} color={theme.tint} />
        </View>
      ) : (
        <View style={[styles.avatar, { backgroundColor: theme.tint }]}>
          <MaterialIcons name="person" size={32} color="#fff" />
        </View>
      )}
      <CenteredText style={[styles.name, { color: theme.text }]}>
        {scholar.fullName}
      </CenteredText>
      {scholar.bio && (
        <CenteredText style={[styles.bio, { color: theme.textSecondary }]}>
          {scholar.bio}
        </CenteredText>
      )}
      {scholar.verified && (
        <View style={styles.verified}>
          <MaterialIcons name="verified" size={20} color={theme.tint} />
          <CenteredText style={[styles.verifiedText, { color: theme.tint }]}>
            تأیید شده
          </CenteredText>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    alignItems: 'center',
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  name: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: Spacing.sm,
    fontFamily: 'Vazirmatn',
  },
  bio: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: Spacing.sm,
    fontFamily: 'Vazirmatn',
  },
  verified: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: Spacing.xs,
  },
  verifiedText: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'Vazirmatn',
  },
});
