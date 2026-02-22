/**
 * Scholar Carousel Component
 * Horizontal scrollable list of featured scholars
 */

import React from 'react';
import { View, StyleSheet, FlatList, Pressable } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useApp } from '@/context/AppContext';
import { Scholar } from '@/types/articles';
import { Spacing, BorderRadius } from '@/constants/theme';
import CenteredText from '@/components/CenteredText';

interface ScholarCarouselProps {
  scholars: Scholar[];
}

export function ScholarCarousel({ scholars }: ScholarCarouselProps) {
  const { theme } = useApp();
  const router = useRouter();

  const handleScholarPress = (scholarId: string) => {
    // Navigate to scholar's articles or profile
    router.push(`/articles?author=${scholarId}`);
  };

  const renderScholar = ({ item }: { item: Scholar }) => (
    <Pressable
      onPress={() => handleScholarPress(item.id)}
      style={({ pressed }) => [
        styles.scholarCard,
        {
          backgroundColor: theme.card,
          borderColor: theme.cardBorder,
        },
        pressed && styles.cardPressed,
      ]}
    >
      {item.photoUrl ? (
        <View style={[styles.avatar, { backgroundColor: theme.backgroundSecondary }]}>
          <MaterialIcons name="person" size={24} color={theme.tint} />
        </View>
      ) : (
        <View style={[styles.avatar, { backgroundColor: theme.tint }]}>
          <MaterialIcons name="person" size={24} color="#fff" />
        </View>
      )}
      <CenteredText style={[styles.scholarName, { color: theme.text }]} numberOfLines={2}>
        {item.fullName}
      </CenteredText>
      {item.verified && (
        <MaterialIcons name="verified" size={16} color={theme.tint} style={styles.verified} />
      )}
    </Pressable>
  );

  if (scholars.length === 0) return null;

  return (
    <View style={styles.container}>
      <CenteredText style={[styles.title, { color: theme.text }]}>
        علما و نویسندگان
      </CenteredText>
      <FlatList
        data={scholars}
        keyExtractor={(item) => item.id}
        renderItem={renderScholar}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: Spacing.sm,
    fontFamily: 'Vazirmatn',
  },
  listContent: {
    paddingHorizontal: Spacing.xs,
  },
  scholarCard: {
    width: 120,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    alignItems: 'center',
    position: 'relative',
  },
  cardPressed: {
    opacity: 0.9,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  scholarName: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    fontFamily: 'Vazirmatn',
  },
  verified: {
    position: 'absolute',
    top: Spacing.xs,
    right: Spacing.xs,
  },
  separator: {
    width: Spacing.sm,
  },
});
