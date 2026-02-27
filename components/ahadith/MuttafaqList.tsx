import React from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { Hadith } from '@/types/hadith';
import { useApp } from '@/context/AppContext';
import CenteredText from '@/components/CenteredText';
import { alphaColor } from '@/utils/ahadith/theme';
import { getQuranFontFamily, getDariFontFamily } from '@/hooks/useFonts';

interface MuttafaqListProps {
  items: Hadith[];
  onOpen: (hadith: Hadith) => void;
}

export function MuttafaqList({ items, onOpen }: MuttafaqListProps) {
  const { theme, state } = useApp();

  return (
    <FlatList
      data={items}
      keyExtractor={(item) => String(item.id)}
      contentContainerStyle={styles.content}
      ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
      renderItem={({ item }) => (
        <Pressable
          onPress={() => onOpen(item)}
          style={({ pressed }) => [
            styles.card,
            {
              backgroundColor: theme.surface,
              borderColor: alphaColor(theme.primary, 0.2),
            },
            pressed && { opacity: 0.9 },
          ]}
        >
          <CenteredText
            numberOfLines={3}
            style={[
              styles.arabic,
              {
                color: theme.textPrimary,
                fontFamily: getQuranFontFamily(state.preferences.quranFont),
              },
            ]}
          >
            {item.arabic_text}
          </CenteredText>

          <CenteredText
            numberOfLines={2}
            style={[
              styles.translation,
              {
                color: theme.textSecondary,
                fontFamily: getDariFontFamily(state.preferences.dariFont),
              },
            ]}
          >
            {item.dari_translation}
          </CenteredText>

          <CenteredText style={[styles.source, { color: theme.primary }]}>
            {`Sahih ${item.source_book} ${item.source_number}`}
          </CenteredText>
        </Pressable>
      )}
      ListEmptyComponent={
        <CenteredText style={[styles.empty, { color: theme.textSecondary }]}>حدیث متفق‌علیه موجود نیست</CenteredText>
      }
    />
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: 20,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
    gap: 10,
  },
  arabic: {
    fontSize: 24,
    lineHeight: 46,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  translation: {
    fontSize: 15,
    lineHeight: 26,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  source: {
    fontFamily: 'Vazirmatn-Bold',
    fontSize: 12,
    textAlign: 'left',
  },
  empty: {
    fontFamily: 'Vazirmatn',
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 20,
  },
});
