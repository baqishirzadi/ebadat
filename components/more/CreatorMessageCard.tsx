import React from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import CenteredText from '@/components/CenteredText';
import {
  CREATOR_MESSAGE_DARI_BODY,
  CREATOR_MESSAGE_DARI_SIGNATURE,
  CREATOR_MESSAGE_DARI_TITLE,
  CREATOR_MESSAGE_PASHTO_BODY,
  CREATOR_MESSAGE_PASHTO_SIGNATURE,
  CREATOR_MESSAGE_PASHTO_TITLE,
} from '@/constants/aboutCreatorContent';
import { BorderRadius, Spacing, Typography } from '@/constants/theme';
import { useApp } from '@/context/AppContext';

export function CreatorMessageCard() {
  const { theme } = useApp();

  return (
    <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
      <LinearGradient
        colors={[`${theme.tint}18`, `${theme.tint}08`]}
        style={styles.headerStrip}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={[styles.headerIconWrap, { backgroundColor: `${theme.tint}22`, borderColor: `${theme.tint}40` }]}>
          <MaterialIcons name="format-quote" size={20} color={theme.tint} />
        </View>
        <CenteredText style={[styles.headerHint, { color: theme.textSecondary }]}>
          پیام سازنده
        </CenteredText>
      </LinearGradient>

      <View style={styles.block}>
        <CenteredText style={[styles.blockTitle, { color: theme.tint }]}>
          {CREATOR_MESSAGE_DARI_TITLE}
        </CenteredText>
        <CenteredText style={[styles.bodyDari, { color: theme.text }]}>
          {CREATOR_MESSAGE_DARI_BODY}
        </CenteredText>
        <CenteredText style={[styles.signatureDari, { color: theme.bookmark }]}>
          {CREATOR_MESSAGE_DARI_SIGNATURE}
        </CenteredText>
      </View>

      <View style={[styles.divider, { backgroundColor: theme.divider }]} />

      <View style={[styles.block, styles.pashtoBlock]}>
        <CenteredText style={[styles.blockTitlePashto, { color: theme.tint }]}>
          {CREATOR_MESSAGE_PASHTO_TITLE}
        </CenteredText>
        <CenteredText
          style={[styles.bodyPashto, { color: theme.text }]}
          {...(Platform.OS === 'android' ? { textBreakStrategy: 'simple' as const } : null)}
        >
          {CREATOR_MESSAGE_PASHTO_BODY}
        </CenteredText>
        <CenteredText
          style={[styles.signaturePashto, { color: theme.bookmark }]}
          {...(Platform.OS === 'android' ? { textBreakStrategy: 'simple' as const } : null)}
        >
          {CREATOR_MESSAGE_PASHTO_SIGNATURE}
        </CenteredText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    overflow: 'hidden',
  },
  headerStrip: {
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    gap: Spacing.xs,
  },
  headerIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerHint: {
    fontSize: Typography.ui.caption,
    fontFamily: 'Vazirmatn',
  },
  block: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  blockTitle: {
    fontSize: Typography.ui.subtitle,
    fontWeight: '700',
    fontFamily: 'Vazirmatn-Bold',
    marginBottom: Spacing.sm,
  },
  bodyDari: {
    fontSize: Typography.ui.body,
    fontFamily: 'Vazirmatn',
    lineHeight: 28,
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  signatureDari: {
    marginTop: Spacing.md,
    fontSize: Typography.ui.body,
    fontFamily: 'Vazirmatn-Bold',
    fontWeight: '700',
    lineHeight: 26,
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  divider: {
    height: 1,
    marginHorizontal: Spacing.lg,
  },
  blockTitlePashto: {
    fontSize: Typography.ui.subtitle,
    fontFamily: 'NotoNastaliqUrdu',
    lineHeight: 44,
    marginBottom: Spacing.md,
    includeFontPadding: false,
  },
  bodyPashto: {
    fontSize: Typography.ui.body,
    fontFamily: 'NotoNastaliqUrdu',
    lineHeight: 46,
    textAlign: 'center',
    writingDirection: 'rtl',
    includeFontPadding: false,
  },
  signaturePashto: {
    marginTop: Spacing.md,
    fontSize: Typography.ui.body,
    fontFamily: 'NotoNastaliqUrdu',
    lineHeight: 40,
    textAlign: 'center',
    writingDirection: 'rtl',
    includeFontPadding: false,
  },
  pashtoBlock: {
    paddingBottom: Spacing.md,
    paddingTop: Spacing.xs,
  },
});
