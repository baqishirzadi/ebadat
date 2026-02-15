/**
 * SurahHeader Component
 * Displays surah information with decorative Islamic styling
 * Includes translation toggle for Dari/Pashto
 */

import React, { memo } from 'react';
import { View, StyleSheet, Pressable, Text } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useApp } from '@/context/AppContext';
import { Typography, Spacing, BorderRadius } from '@/constants/theme';
import CenteredText from '@/components/CenteredText';
import { TranslationLanguage } from '@/types/quran';
import { toArabicNumerals } from '@/utils/numbers';

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
  const { theme, state, setTranslationLanguage } = useApp();
  const currentTranslation = state.preferences.showTranslation;
  
  // Translation toggle options - Dari, Pashto, Both, or Arabic only
  const translationOptions: { key: TranslationLanguage; label: string }[] = [
    { key: 'dari', label: 'دری' },
    { key: 'pashto', label: 'پښتو' },
    { key: 'both', label: 'هردو' },
    { key: 'none', label: 'بدون ترجمه' },
  ];

  return (
    <View style={styles.wrapper}>
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

        {/* Arabic Name - NO ENGLISH */}
        <CenteredText style={[styles.arabicName, { color: theme.surahHeaderText }]}>
          سُورَةُ {name}
        </CenteredText>

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

        {/* Play Button */}
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

      {/* Bismillah - Not shown for:
          - Surah Al-Fatiha (1) - because Bismillah IS ayah 1
          - Surah At-Tawbah (9) - no Bismillah by divine order */}
      {showBismillah && number !== 1 && number !== 9 && (
        <View style={[styles.bismillahContainer, { backgroundColor: theme.backgroundSecondary }]}>
          <CenteredText style={[styles.bismillah, { color: theme.bismillah }]}>
            بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
          </CenteredText>
        </View>
      )}
      
      {/* Translation Toggle Bar */}
      <View style={[styles.translationToggle, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
        <Text style={[styles.toggleLabel, { color: theme.textSecondary }]}>ترجمه:</Text>
        <View style={styles.toggleButtons}>
          {translationOptions.map((option) => (
            <Pressable
              key={option.key}
              onPress={() => setTranslationLanguage(option.key)}
              style={[
                styles.toggleButton,
                {
                  backgroundColor: currentTranslation === option.key ? theme.tint : theme.backgroundSecondary,
                },
              ]}
            >
              <Text
                style={[
                  styles.toggleButtonText,
                  {
                    color: currentTranslation === option.key ? '#fff' : theme.text,
                  },
                ]}
              >
                {option.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>
    </View>
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
  arabicName: {
    fontSize: Typography.ui.display,
    fontWeight: '700',
    marginBottom: Spacing.md,
    fontFamily: 'QuranFont',
    textAlign: 'center',
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
    position: 'absolute',
    right: Spacing.md,
    top: '50%',
    marginTop: -20,
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
    fontFamily: 'ScheherazadeNew',
    textAlign: 'center',
    lineHeight: 73, // Optimized height
    letterSpacing: 1,
    includeFontPadding: false,
    paddingBottom: 8, // Reduced padding - prevents cut-off without taking too much space
  },
  // Translation toggle styles
  translationToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: Spacing.md,
    marginTop: Spacing.sm,
    padding: Spacing.sm,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    gap: Spacing.sm,
  },
  toggleLabel: {
    fontSize: Typography.ui.caption,
    fontFamily: 'Vazirmatn',
    marginRight: Spacing.xs,
  },
  toggleButtons: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  toggleButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.md,
  },
  toggleButtonText: {
    fontSize: Typography.ui.caption,
    fontFamily: 'Vazirmatn',
    fontWeight: '500',
  },
});
