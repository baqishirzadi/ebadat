import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { AhadithSection } from '@/types/hadith';
import { useApp } from '@/context/AppContext';
import CenteredText from '@/components/CenteredText';
import { alphaColor } from '@/utils/ahadith/theme';

interface HadithSectionTabsProps {
  activeSection: AhadithSection;
  onChange: (section: AhadithSection) => void;
}

const SECTION_LABELS: Record<AhadithSection, string> = {
  daily: 'حدیث روز',
  muttafaq: 'متفق‌علیه',
  topics: 'موضوعات',
  search: 'جستجو',
};

const SECTIONS: AhadithSection[] = ['daily', 'muttafaq', 'topics', 'search'];

export function HadithSectionTabs({ activeSection, onChange }: HadithSectionTabsProps) {
  const { theme } = useApp();

  return (
    <View style={[styles.container, { backgroundColor: theme.surface }]}> 
      {SECTIONS.map((section) => {
        const selected = section === activeSection;
        return (
          <Pressable
            key={section}
            onPress={() => onChange(section)}
            style={({ pressed }) => [
              styles.tab,
              {
                backgroundColor: selected ? alphaColor(theme.primary, 0.16) : 'transparent',
                borderColor: selected ? alphaColor(theme.primary, 0.32) : alphaColor(theme.textSecondary, 0.2),
              },
              pressed && { opacity: 0.85 },
            ]}
            accessibilityRole="button"
            accessibilityLabel={SECTION_LABELS[section]}
          >
            <CenteredText
              style={[
                styles.tabText,
                {
                  color: selected ? theme.primary : theme.textSecondary,
                },
              ]}
            >
              {SECTION_LABELS[section]}
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
    borderRadius: 16,
    padding: 6,
    gap: 6,
  },
  tab: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    minHeight: 40,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  tabText: {
    fontFamily: 'Vazirmatn',
    fontSize: 12,
    fontWeight: '700',
  },
});
