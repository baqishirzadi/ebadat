import React, { memo } from 'react';
import { Pressable, StyleSheet, Switch, View } from 'react-native';

import CenteredText from '@/components/CenteredText';
import { RtlView } from '@/components/ui/RtlView';
import { BorderRadius, Spacing, Typography } from '@/constants/theme';
import { useApp } from '@/context/AppContext';
import type { TranslationLanguage } from '@/types/quran';
import { useI18n } from '@/utils/i18n/useI18n';

type LangKey = Exclude<TranslationLanguage, 'none' | 'both'>;

const LANG_OPTIONS: LangKey[] = ['dari', 'pashto', 'english'];

export const TranslationToggle = memo(function TranslationToggle() {
  const { theme, state, setTranslationLanguage } = useApp();
  const { t } = useI18n();
  const stored = state.preferences.showTranslation;
  const current = stored === 'both' ? state.preferences.appLanguage : stored;
  const showTranslation = current !== 'none';
  const activeLang: LangKey =
    current === 'pashto' || current === 'english' || current === 'dari' ? current : 'dari';

  const handleLangSelect = (key: LangKey) => {
    setTranslationLanguage(key);
  };

  const handleShowToggle = (enabled: boolean) => {
    if (enabled) {
      setTranslationLanguage(activeLang);
    } else {
      setTranslationLanguage('none');
    }
  };

  const labelFor = (key: LangKey) =>
    key === 'dari'
      ? t('quran.translation.dari')
      : key === 'pashto'
        ? t('quran.translation.pashto')
        : t('quran.translation.english');

  return (
    <RtlView
      style={[
        styles.container,
        { backgroundColor: theme.card, borderColor: theme.cardBorder },
      ]}
    >
      <View style={[styles.segmented, { backgroundColor: theme.backgroundSecondary, borderColor: theme.cardBorder }]}>
        {LANG_OPTIONS.map((key) => {
          const active = showTranslation && activeLang === key;
          return (
            <Pressable
              key={key}
              onPress={() => handleLangSelect(key)}
              style={[
                styles.segment,
                active && { backgroundColor: theme.tint },
              ]}
            >
              <CenteredText
                style={[
                  styles.segmentText,
                  { color: active ? '#fff' : theme.text },
                ]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.8}
              >
                {labelFor(key)}
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
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    overflow: 'hidden',
    gap: Spacing.sm,
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
    minWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.xs,
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
  },
  toggleLabel: {
    fontFamily: 'Vazirmatn',
    fontSize: Typography.ui.caption,
  },
});
