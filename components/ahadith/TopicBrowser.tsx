import React, { useMemo } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Hadith } from '@/types/hadith';
import { useApp } from '@/context/AppContext';
import { alphaColor } from '@/utils/ahadith/theme';
import { getTopicLabel } from '@/utils/ahadith/labels';
import CenteredText from '@/components/CenteredText';
import { HadithListCard } from '@/components/ahadith/HadithListCard';
import { useI18n } from '@/utils/i18n/useI18n';

interface TopicBrowserProps {
  allHadiths: Hadith[];
  topics: string[];
  selectedTopic: string | null;
  topicHadiths: Hadith[];
  onSelectTopic: (topic: string | null) => void;
  onOpenHadith: (hadith: Hadith) => void;
}

export function TopicBrowser({
  allHadiths,
  topics,
  selectedTopic,
  topicHadiths,
  onSelectTopic,
  onOpenHadith,
}: TopicBrowserProps) {
  const { theme } = useApp();
  const { t, language, fontFamily, n } = useI18n();
  const nastaliq = fontFamily === 'NotoNastaliqUrdu';

  const title = useMemo(
    () => (selectedTopic
      ? t('ahadith.topics.selected', { topic: getTopicLabel(selectedTopic, language) })
      : t('ahadith.topics.all')),
    [selectedTopic, language, t]
  );

  const allHadithsNewestFirst = useMemo(
    () => [...allHadiths].sort((a, b) => b.id - a.id),
    [allHadiths]
  );

  const visibleHadiths = selectedTopic ? topicHadiths : allHadithsNewestFirst;

  const renderChip = (key: string, label: string, selected: boolean, onPress: () => void) => (
    <Pressable
      key={key}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={({ pressed }) => [
        styles.topicChip,
        {
          backgroundColor: selected ? theme.primary : theme.surface,
          borderColor: selected ? theme.primary : alphaColor(theme.textSecondary, 0.25),
        },
        pressed && { opacity: 0.85 },
      ]}
    >
      <CenteredText
        numberOfLines={1}
        style={[
          styles.topicChipText,
          { color: selected ? '#ffffff' : theme.textSecondary, lineHeight: nastaliq ? 30 : 20 },
        ]}
      >
        {label}
      </CenteredText>
    </Pressable>
  );

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.topicsScroll}
        contentContainerStyle={styles.topicsRow}
      >
        {renderChip('all', t('ahadith.topics.allChip'), selectedTopic === null, () => onSelectTopic(null))}
        {topics.map((topic) =>
          renderChip(topic, getTopicLabel(topic, language), selectedTopic === topic, () => onSelectTopic(topic))
        )}
      </ScrollView>

      <View style={styles.titleRow}>
        <CenteredText style={[styles.sectionTitle, { color: theme.textPrimary, lineHeight: nastaliq ? 32 : 22 }]}>
          {title}
        </CenteredText>
        <View style={[styles.countChip, { backgroundColor: alphaColor(theme.primary, 0.1) }]}>
          <CenteredText style={[styles.countText, { color: theme.primary }]}>{n(visibleHadiths.length)}</CenteredText>
        </View>
      </View>

      <FlatList
        data={visibleHadiths}
        keyExtractor={(item) => String(item.id)}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        renderItem={({ item }) => <HadithListCard hadith={item} onPress={onOpenHadith} />}
        ListEmptyComponent={
          <CenteredText style={[styles.empty, { color: theme.textSecondary }]}>
            {t(selectedTopic ? 'ahadith.topics.emptyForTopic' : 'ahadith.topics.empty')}
          </CenteredText>
        }
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topicsScroll: {
    flexGrow: 0,
  },
  topicsRow: {
    gap: 8,
    paddingVertical: 4,
    alignItems: 'center',
  },
  topicChip: {
    borderWidth: 1,
    borderRadius: 22,
    minHeight: 40,
    paddingHorizontal: 16,
    paddingVertical: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topicChipText: {
    fontFamily: 'Vazirmatn-Bold',
    fontSize: 13,
    textAlign: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
    marginBottom: 10,
  },
  sectionTitle: {
    fontFamily: 'Vazirmatn-Bold',
    fontSize: 15,
    textAlign: 'center',
  },
  countChip: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 2,
  },
  countText: {
    fontFamily: 'Vazirmatn-Bold',
    fontSize: 12,
  },
  separator: {
    height: 10,
  },
  listContent: {
    paddingBottom: 28,
  },
  empty: {
    fontFamily: 'Vazirmatn',
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 26,
  },
});
