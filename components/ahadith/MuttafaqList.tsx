import React from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { Hadith } from '@/types/hadith';
import { useApp } from '@/context/AppContext';
import CenteredText from '@/components/CenteredText';
import { HadithListCard } from '@/components/ahadith/HadithListCard';
import { useI18n } from '@/utils/i18n/useI18n';

interface MuttafaqListProps {
  items: Hadith[];
  onOpen: (hadith: Hadith) => void;
}

export function MuttafaqList({ items, onOpen }: MuttafaqListProps) {
  const { theme } = useApp();
  const { t } = useI18n();

  return (
    <FlatList
      data={items}
      keyExtractor={(item) => String(item.id)}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      ItemSeparatorComponent={() => <View style={styles.separator} />}
      renderItem={({ item }) => <HadithListCard hadith={item} onPress={onOpen} />}
      ListEmptyComponent={
        <CenteredText style={[styles.empty, { color: theme.textSecondary }]}>{t('ahadith.muttafaq.empty')}</CenteredText>
      }
    />
  );
}

const styles = StyleSheet.create({
  content: {
    paddingTop: 2,
    paddingBottom: 28,
  },
  separator: {
    height: 10,
  },
  empty: {
    fontFamily: 'Vazirmatn',
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 20,
  },
});
