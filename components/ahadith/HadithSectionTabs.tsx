import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { AhadithSection } from '@/types/hadith';
import { useApp } from '@/context/AppContext';
import { useI18n } from '@/utils/i18n/useI18n';
import CenteredText from '@/components/CenteredText';
import { alphaColor } from '@/utils/ahadith/theme';

interface HadithSectionTabsProps {
  activeSection: AhadithSection;
  onChange: (section: AhadithSection) => void;
}

const SECTIONS: AhadithSection[] = ['daily', 'muttafaq', 'topics', 'search'];

export function HadithSectionTabs({ activeSection, onChange }: HadithSectionTabsProps) {
  const { theme } = useApp();
  const { t } = useI18n();
  const labels: Record<AhadithSection, string> = {
    daily: t('hadith.daily'),
    muttafaq: t('hadith.muttafaq'),
    topics: t('hadith.topics'),
    search: t('hadith.search'),
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.surface,
          borderColor: alphaColor(theme.primary, 0.16),
          shadowColor: theme.textPrimary,
        },
      ]}
    >
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
            accessibilityLabel={labels[section]}
          >
            <CenteredText
              numberOfLines={1}
              ellipsizeMode="clip"
              style={[
                styles.tabText,
                {
                  color: selected ? theme.primary : theme.textSecondary,
                },
              ]}
            >
              {labels[section]}
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
    borderRadius: 18,
    borderWidth: 1,
    padding: 6,
    gap: 5,
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 2,
  },
  tab: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    minHeight: 40,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  tabText: {
    fontFamily: 'Vazirmatn',
    fontSize: 11,
    fontWeight: '700',
  },
});
