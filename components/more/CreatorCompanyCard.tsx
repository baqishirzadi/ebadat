import React from 'react';
import { Linking, Pressable, StyleSheet, View } from 'react-native';

import CenteredText from '@/components/CenteredText';
import {
  CREATOR_COMPANY_LABEL,
  CREATOR_COMPANY_LINK,
  CREATOR_COMPANY_URL,
} from '@/constants/aboutCreatorContent';
import { BorderRadius, Spacing, Typography } from '@/constants/theme';
import { useApp } from '@/context/AppContext';

export function CreatorCompanyCard() {
  const { theme } = useApp();

  return (
    <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
      <CenteredText style={[styles.label, { color: theme.text }]}>
        {CREATOR_COMPANY_LABEL}
      </CenteredText>
      <Pressable
        onPress={() => Linking.openURL(CREATOR_COMPANY_URL).catch(() => {})}
        style={({ pressed }) => [styles.linkButton, pressed && styles.pressed]}
      >
        <CenteredText style={[styles.link, { color: theme.bookmark }]}>
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
  pressed: {
    opacity: 0.88,
  },
});
