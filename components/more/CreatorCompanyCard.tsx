import React from 'react';
import { Linking, Pressable, StyleSheet, View } from 'react-native';

import CenteredText from '@/components/CenteredText';
import {
  CREATOR_COMPANY_LABEL,
  CREATOR_COMPANY_LABEL_ENGLISH,
  CREATOR_COMPANY_LINK,
  CREATOR_COMPANY_URL,
} from '@/constants/aboutCreatorContent';
import { BorderRadius, Spacing, Typography } from '@/constants/theme';
import { useApp } from '@/context/AppContext';

export function CreatorCompanyCard() {
  const { theme, state } = useApp();
  const isEnglish = state.preferences.appLanguage === 'english';
  const companyLabel = isEnglish ? CREATOR_COMPANY_LABEL_ENGLISH : CREATOR_COMPANY_LABEL;

  return (
    <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
      <CenteredText style={[styles.label, isEnglish && styles.labelEnglish, { color: theme.text }]}>
        {companyLabel}
      </CenteredText>
      <Pressable
        onPress={() => Linking.openURL(CREATOR_COMPANY_URL).catch(() => {})}
        style={({ pressed }) => [styles.linkButton, pressed && styles.pressed]}
      >
        <CenteredText style={[styles.link, isEnglish && styles.linkEnglish, { color: theme.bookmark }]}>
          {CREATOR_COMPANY_LINK}
        </CenteredText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.lg,
    alignItems: 'center',
  },
  label: {
    fontSize: Typography.ui.body,
    fontFamily: 'Vazirmatn',
    textAlign: 'center',
  },
  labelEnglish: {
    fontFamily: undefined,
    letterSpacing: 0.2,
  },
  linkButton: {
    marginTop: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  link: {
    fontSize: Typography.ui.subtitle,
    fontWeight: '700',
    fontFamily: 'Vazirmatn-Bold',
  },
  linkEnglish: {
    fontFamily: undefined,
    letterSpacing: 0.4,
  },
  pressed: {
    opacity: 0.88,
  },
});
