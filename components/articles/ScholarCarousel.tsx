/**
 * Scholar Carousel
 * Horizontal strip of scholar avatars; tapping one filters the feed.
 */

import React from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';

import { scholarInitial, scholarTone, shortScholarName } from '@/components/articles/articleTheme';
import { LocalizedText } from '@/components/ui/LocalizedText';
import { useApp } from '@/context/AppContext';
import type { Scholar } from '@/types/articles';
import { directionStyle } from '@/utils/i18n/direction';
import { useI18n } from '@/utils/i18n/useI18n';

interface ScholarCarouselProps {
  scholars: Scholar[];
  selectedId?: string | null;
  onSelect: (scholar: Scholar) => void;
}

export function ScholarCarousel({ scholars, selectedId, onSelect }: ScholarCarouselProps) {
  const { theme } = useApp();
  const { language } = useI18n();

  if (scholars.length === 0) return null;

  return (
    <FlatList
      data={scholars}
      keyExtractor={(item) => item.id}
      horizontal
      showsHorizontalScrollIndicator={false}
      style={directionStyle(language)}
      contentContainerStyle={styles.row}
      renderItem={({ item }) => {
        const selected = selectedId === item.id;
        return (
          <Pressable
            onPress={() => onSelect(item)}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            style={({ pressed }) => [styles.item, pressed && styles.pressed]}
          >
            <View style={[styles.ring, { borderColor: selected ? theme.tint : 'transparent' }]}>
              <View style={[styles.avatar, { backgroundColor: scholarTone(item.fullName) }]}>
                <LocalizedText style={styles.initial}>{scholarInitial(item.fullName)}</LocalizedText>
              </View>
            </View>
            <LocalizedText
              numberOfLines={2}
              style={[styles.name, { color: selected ? theme.tint : theme.text }, selected && styles.nameSelected]}
            >
              {shortScholarName(item.fullName)}
            </LocalizedText>
          </Pressable>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 12,
  },
  item: {
    width: 78,
    alignItems: 'center',
    gap: 6,
  },
  pressed: {
    opacity: 0.8,
  },
  ring: {
    borderWidth: 2,
    borderRadius: 32,
    padding: 2,
  },
  avatar: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initial: {
    color: '#FFFFFF',
    fontSize: 22,
    lineHeight: 32,
    fontWeight: '700',
    textAlign: 'center',
  },
  name: {
    fontSize: 11.5,
    lineHeight: 18,
    textAlign: 'center',
  },
  nameSelected: {
    fontWeight: '700',
  },
});
