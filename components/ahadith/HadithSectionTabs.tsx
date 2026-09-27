import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { AhadithSection } from '@/types/hadith';
import { useApp } from '@/context/AppContext';
import { useI18n } from '@/utils/i18n/useI18n';
import CenteredText from '@/components/CenteredText';
import { alphaColor } from '@/utils/ahadith/theme';

interface HadithSectionTabsProps {
  activeSection: AhadithSection;
  onChange: (section: AhadithSection) => void;
}

const SECTIONS: { id: AhadithSection; icon: keyof typeof MaterialIcons.glyphMap }[] = [
  { id: 'daily', icon: 'wb-sunny' },
  { id: 'muttafaq', icon: 'verified' },
  { id: 'topics', icon: 'category' },
  { id: 'search', icon: 'search' },
];

export function HadithSectionTabs({ activeSection, onChange }: HadithSectionTabsProps) {
  const { theme } = useApp();
  const { t, fontFamily } = useI18n();
  const nastaliq = fontFamily === 'NotoNastaliqUrdu';
  const labels: Record<AhadithSection, string> = {
    daily: t('hadith.daily'),
    muttafaq: t('hadith.muttafaq'),
    topics: t('hadith.topics'),
    search: t('hadith.search'),
  };

  return (
    <View
      accessibilityRole="tablist"
      style={[
        styles.container,
        {
          backgroundColor: theme.surface,
          borderColor: alphaColor(theme.primary, 0.16),
          shadowColor: theme.textPrimary,
        },
      ]}
    >
      {SECTIONS.map(({ id, icon }) => {
        const selected = id === activeSection;
        const color = selected ? theme.surface : theme.textSecondary;
        return (
          <Pressable
            key={id}
            onPress={() => onChange(id)}
            style={({ pressed }) => [
              styles.tab,
              { backgroundColor: selected ? theme.primary : 'transparent' },
              pressed && !selected && { backgroundColor: alphaColor(theme.primary, 0.08) },
            ]}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            accessibilityLabel={labels[id]}
          >
            <MaterialIcons name={icon} size={20} color={selected ? theme.surface : theme.primary} />
            <CenteredText
              numberOfLines={2}
              adjustsFontSizeToFit
              minimumFontScale={0.8}
              style={[
                styles.tabText,
                { color, lineHeight: nastaliq ? 30 : 18 },
              ]}
            >
              {labels[id]}
            </CenteredText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderRadius: 20,
    borderWidth: 1,
    padding: 5,
    gap: 4,
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 8,
    elevation: 2,
  },
  tab: {
    flex: 1,
    borderRadius: 15,
    minHeight: 60,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    paddingVertical: 6,
    gap: 3,
  },
  tabText: {
    fontFamily: 'Vazirmatn-Bold',
    fontSize: 13,
  },
});
