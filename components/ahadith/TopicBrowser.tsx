import React, { useMemo } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Hadith } from '@/types/hadith';
import { useApp } from '@/context/AppContext';
import { alphaColor } from '@/utils/ahadith/theme';
import { getTopicLabelFa } from '@/utils/ahadith/labels';
import CenteredText from '@/components/CenteredText';
import { getDariFontFamily, getQuranFontFamily } from '@/hooks/useFonts';

interface TopicBrowserProps {
  topics: string[];
  selectedTopic: string | null;
  topicHadiths: Hadith[];
  onSelectTopic: (topic: string | null) => void;
  onOpenHadith: (hadith: Hadith) => void;
}

export function TopicBrowser({
  topics,
  selectedTopic,
  topicHadiths,
  onSelectTopic,
  onOpenHadith,
}: TopicBrowserProps) {
  const { theme, state } = useApp();

  const title = useMemo(
    () => (selectedTopic ? `موضوع: ${getTopicLabelFa(selectedTopic)}` : 'یک موضوع انتخاب کنید'),
    [selectedTopic]
  );

  return (
    <View style={styles.container}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.topicsRow}>
        <Pressable
          onPress={() => onSelectTopic(null)}
          style={({ pressed }) => [
            styles.topicChip,
            {
              backgroundColor: selectedTopic === null ? alphaColor(theme.primary, 0.18) : theme.surface,
              borderColor: selectedTopic === null ? alphaColor(theme.primary, 0.4) : alphaColor(theme.textSecondary, 0.25),
            },
            pressed && { opacity: 0.85 },
          ]}
        >
          <CenteredText numberOfLines={1} style={[styles.topicChipText, { color: selectedTopic === null ? theme.primary : theme.textSecondary }]}>همه</CenteredText>
        </Pressable>

        {topics.map((topic) => {
          const selected = selectedTopic === topic;
          return (
            <Pressable
              key={topic}
              onPress={() => onSelectTopic(topic)}
              style={({ pressed }) => [
                styles.topicChip,
                {
                  backgroundColor: selected ? alphaColor(theme.primary, 0.18) : theme.surface,
                  borderColor: selected ? alphaColor(theme.primary, 0.4) : alphaColor(theme.textSecondary, 0.25),
                },
                pressed && { opacity: 0.85 },
              ]}
            >
              <CenteredText numberOfLines={1} style={[styles.topicChipText, { color: selected ? theme.primary : theme.textSecondary }]}>
                {getTopicLabelFa(topic)}
              </CenteredText>
            </Pressable>
          );
        })}
      </ScrollView>

      <CenteredText style={[styles.sectionTitle, { color: theme.textPrimary }]}>{title}</CenteredText>

      <FlatList
        data={selectedTopic ? topicHadiths : []}
        keyExtractor={(item) => String(item.id)}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => onOpenHadith(item)}
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
              numberOfLines={2}
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
          </Pressable>
        )}
        ListEmptyComponent={
          <CenteredText style={[styles.empty, { color: theme.textSecondary }]}>برای دیدن احادیث، یک موضوع انتخاب کنید</CenteredText>
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
  topicsRow: {
    gap: 8,
    paddingBottom: 8,
    paddingTop: 2,
    alignItems: 'center',
  },
  topicChip: {
    borderWidth: 1,
    borderRadius: 22,
    height: 42,
    minHeight: 42,
    paddingHorizontal: 16,
    maxWidth: 140,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  topicChipText: {
    fontFamily: 'Vazirmatn-Bold',
    fontSize: 13,
    textAlign: 'center',
  },
  sectionTitle: {
    marginTop: 10,
    marginBottom: 10,
    fontFamily: 'Vazirmatn-Bold',
    fontSize: 14,
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  listContent: {
    paddingBottom: 24,
  },
  card: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    gap: 8,
  },
  arabic: {
    fontSize: 22,
    lineHeight: 42,
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  translation: {
    fontSize: 14,
    lineHeight: 24,
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  empty: {
    fontFamily: 'Vazirmatn',
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 26,
  },
});
