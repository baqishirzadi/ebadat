/**
 * SurahHeader Component
 * Displays surah information with decorative Islamic styling
 * Includes translation toggle for Dari/Pashto
 */

import React, { memo } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useApp } from '@/context/AppContext';
import { Typography, Spacing, BorderRadius } from '@/constants/theme';
import CenteredText from '@/components/CenteredText';
import { RtlView } from '@/components/ui/RtlView';
import { TranslationToggle } from './TranslationToggle';
import { toArabicNumerals } from '@/utils/numbers';
import { getQuranFontFamily } from '@/hooks/useFonts';
import { QuranText } from './QuranText';

interface SurahHeaderProps {
  number: number;
  name: string;
  ayahCount: number;
  revelationType: 'Meccan' | 'Medinan' | string;
  showBismillah?: boolean;
  onPlayPress?: () => void;
  onInfoPress?: () => void;
}

export const SurahHeader = memo(function SurahHeader({
  number,
  name,
  ayahCount,
  revelationType,
  showBismillah = true,
  onPlayPress,
}: SurahHeaderProps) {
  const { theme, state } = useApp();
  const quranFontFamily = getQuranFontFamily(state.preferences.quranFont);

  return (
    <RtlView style={styles.wrapper}>
      {/* Main Header Card */}
      <View style={[styles.container, { backgroundColor: theme.surahHeader }]}>
        {/* Decorative Corner Elements */}
        <View style={[styles.cornerTopLeft, { borderColor: `${theme.surahHeaderText}40` }]} />
        <View style={[styles.cornerTopRight, { borderColor: `${theme.surahHeaderText}40` }]} />
        <View style={[styles.cornerBottomLeft, { borderColor: `${theme.surahHeaderText}40` }]} />
        <View style={[styles.cornerBottomRight, { borderColor: `${theme.surahHeaderText}40` }]} />

        {/* Surah Number */}
        <View style={[styles.numberBadge, { backgroundColor: `${theme.surahHeaderText}20` }]}>
          <CenteredText style={[styles.numberText, { color: theme.surahHeaderText }]}>
            {toArabicNumerals(number)}
          </CenteredText>
        </View>

        {/* Arabic Name + Play Button - same row for alignment */}
        <View style={styles.nameRow}>
          <View style={styles.arabicNameWrapper}>
            <View style={styles.arabicIsolate}>
              <QuranText
                style={[styles.arabicName, { color: theme.surahHeaderText, fontFamily: quranFontFamily }]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.65}
              >
                سُورَةُ {name}
              </QuranText>
            </View>
          </View>
          {onPlayPress && (
            <Pressable
              onPress={onPlayPress}
              style={({ pressed }) => [
                styles.playButton,
                { backgroundColor: `${theme.surahHeaderText}20` },
                pressed && styles.playButtonPressed,
              ]}
            >
              <MaterialIcons name="play-arrow" size={28} color={theme.surahHeaderText} />
            </Pressable>
          )}
        </View>

        {/* Meta Info */}
        <View style={styles.metaContainer}>
          <View style={[styles.metaItem, { backgroundColor: `${theme.surahHeaderText}20` }]}>
            <MaterialIcons name="format-list-numbered" size={14} color={theme.surahHeaderText} />
            <CenteredText style={[styles.metaText, { color: theme.surahHeaderText }]}>
              {toArabicNumerals(ayahCount)} آیه
            </CenteredText>
          </View>
          <View style={[styles.metaItem, { backgroundColor: `${theme.surahHeaderText}20` }]}>
            <MaterialIcons 
              name={revelationType === 'Meccan' ? 'brightness-5' : 'brightness-2'} 
              size={14} 
              color={theme.surahHeaderText} 
            />
            <CenteredText style={[styles.metaText, { color: theme.surahHeaderText }]}>
              {revelationType === 'Meccan' ? 'مکی' : 'مدنی'}
            </CenteredText>
          </View>
        </View>
      </View>

      {/* Bismillah - Not shown for:
          - Surah Al-Fatiha (1) - because Bismillah IS ayah 1
          - Surah At-Tawbah (9) - no Bismillah by divine order */}
      {showBismillah && number !== 1 && number !== 9 && (
        <View style={[styles.bismillahContainer, { backgroundColor: theme.backgroundSecondary }]}>
          <QuranText style={[styles.bismillah, { color: theme.bismillah, fontFamily: quranFontFamily }]}>
            بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
          </QuranText>
        </View>
      )}
      
      <TranslationToggle />
    </RtlView>
  );
});

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: Spacing.md,
  },
  container: {
    marginHorizontal: Spacing.md,
    marginTop: Spacing.md,
    padding: Spacing.lg,
    borderRadius: BorderRadius.xl,
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  // Decorative corners
  cornerTopLeft: {
    position: 'absolute',
    top: 8,
    left: 8,
    width: 20,
    height: 20,
    borderTopWidth: 2,
    borderLeftWidth: 2,
    borderTopLeftRadius: 8,
  },
  cornerTopRight: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 20,
    height: 20,
    borderTopWidth: 2,
    borderRightWidth: 2,
    borderTopRightRadius: 8,
  },
  cornerBottomLeft: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    width: 20,
    height: 20,
    borderBottomWidth: 2,
    borderLeftWidth: 2,
    borderBottomLeftRadius: 8,
  },
  cornerBottomRight: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    width: 20,
    height: 20,
    borderBottomWidth: 2,
    borderRightWidth: 2,
    borderBottomRightRadius: 8,
  },
  numberBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  numberText: {
    fontSize: 18,
    fontWeight: '700',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  arabicNameWrapper: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  arabicIsolate: {
    width: '100%',
    direction: 'ltr',
    alignItems: 'center',
  },
  arabicName: {
    fontSize: Typography.ui.display,
    fontWeight: '700',
    fontFamily: getQuranFontFamily('scheherazade'),
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  metaContainer: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  metaText: {
    fontSize: Typography.ui.caption,
    fontWeight: '500',
  },
  playButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playButtonPressed: {
    opacity: 0.7,
  },
  bismillahContainer: {
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.md,
    paddingVertical: Spacing.md, // Reduced from xl
    paddingBottom: Spacing.lg, // Reduced from xxl - prevents cut-off without being too large
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
  },
  bismillah: {
    fontSize: Typography.arabic.large,
    textAlign: 'center',
    lineHeight: 58,
    includeFontPadding: false,
    paddingBottom: 2,
  },
});
