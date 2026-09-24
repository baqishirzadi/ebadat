import { MaterialIcons } from '@expo/vector-icons';
import React, { memo } from 'react';
import { Pressable, StyleSheet, Switch, View } from 'react-native';

import CenteredText from '@/components/CenteredText';
import { RtlView } from '@/components/ui/RtlView';
import { BorderRadius, Spacing, Typography } from '@/constants/theme';
import { useApp } from '@/context/AppContext';
import type { TranslationLanguage } from '@/types/quran';
import { useI18n } from '@/utils/i18n/useI18n';

const LANG_OPTIONS: { key: Exclude<TranslationLanguage, 'none' | 'both'>; icon: keyof typeof MaterialIcons.glyphMap }[] = [
  { key: 'dari', icon: 'translate' },
  { key: 'pashto', icon: 'language' },
  { key: 'english', icon: 'public' },
];

export const TranslationToggle = memo(function TranslationToggle() {
  const { theme, state, setTranslationLanguage } = useApp();
  const { t } = useI18n();
  const stored = state.preferences.showTranslation;
  const current = stored === 'both' ? state.preferences.appLanguage : stored;
  const showTranslation = current !== 'none';
  const activeLang: Exclude<TranslationLanguage, 'none' | 'both'> =
    current === 'pashto' || current === 'english' || current === 'dari' ? current : 'dari';

  const handleLangSelect = (key: Exclude<TranslationLanguage, 'none' | 'both'>) => {
    setTranslationLanguage(key);
  };

  const handleShowToggle = (enabled: boolean) => {
    if (enabled) {
      setTranslationLanguage(activeLang);
    } else {
      setTranslationLanguage('none');
    }
  };

  return (
    <RtlView
      style={[
        styles.container,
        { backgroundColor: theme.card, borderColor: theme.cardBorder },
      ]}
    >
      <CenteredText style={[styles.label, { color: theme.textSecondary }]}>
        {t('quran.translation.label')}
      </CenteredText>

      <View style={[styles.segmented, { backgroundColor: theme.backgroundSecondary, borderColor: theme.cardBorder }]}>
        {LANG_OPTIONS.map((option) => {
          const active = showTranslation && activeLang === option.key;
          return (
            <Pressable
              key={option.key}
              onPress={() => handleLangSelect(option.key)}
              style={[
                styles.segment,
                active && { backgroundColor: theme.tint },
              ]}
            >
              <MaterialIcons
                name={option.icon}
                size={16}
                color={active ? '#fff' : theme.textSecondary}
              />
              <CenteredText
                style={[
                  styles.segmentText,
                  { color: active ? '#fff' : theme.text },
                ]}
              >
                {option.key === 'dari'
                  ? t('quran.translation.dari')
                  : option.key === 'pashto'
                    ? t('quran.translation.pashto')
                    : t('quran.translation.english')}
              </CenteredText>
            </Pressable>
          );
        })}
      </View>

      <RtlView style={styles.toggleRow}>
        <CenteredText style={[styles.toggleLabel, { color: theme.text }]}>
          {t('quran.showTranslation')}
        </CenteredText>
        <Switch
          value={showTranslation}
          onValueChange={handleShowToggle}
          trackColor={{ false: theme.divider, true: `${theme.tint}80` }}
          thumbColor={showTranslation ? theme.tint : theme.card}
        />
      </RtlView>
    </RtlView>
  );
});

const styles = StyleSheet.create({
  container: {
    marginHorizontal: Spacing.md,
    marginTop: Spacing.sm,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    overflow: 'hidden',
    gap: Spacing.sm,
  },
  label: {
    fontFamily: 'Vazirmatn-Bold',
    fontSize: Typography.ui.caption,
  },
  segmented: {
    flexDirection: 'row',
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    padding: 3,
    gap: 3,
  },
  segment: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
  },
  segmentText: {
    fontFamily: 'Vazirmatn-Bold',
    fontSize: Typography.ui.caption,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
    paddingTop: Spacing.xs,
  },
  toggleLabel: {
    fontFamily: 'Vazirmatn',
    fontSize: Typography.ui.caption,
  },
});
