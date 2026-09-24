import { BorderRadius, Spacing, Typography } from '@/constants/theme';
import { useApp } from '@/context/AppContext';
import { JuzRange } from '@/data/juzRanges';
import { SURAH_NAMES, toArabicNumerals } from '@/data/surahNames';
import { getUthmaniFont } from '@/hooks/useFonts';
import { useI18n } from '@/utils/i18n/useI18n';
import React, { useMemo } from 'react';

import { Pressable, StyleSheet, View } from 'react-native';
import { LocalizedText } from '@/components/ui/LocalizedText';

interface ReadingPosition {
  surahNumber: number;
  ayahNumber: number;
}

interface JuzListProps {
  juzItems: JuzRange[];
  currentPosition?: ReadingPosition;
  onPressJuz: (juz: JuzRange) => void;
}

function comparePosition(
  a: { surah: number; ayah: number },
  b: { surah: number; ayah: number }
): number {
  if (a.surah !== b.surah) return a.surah - b.surah;
  return a.ayah - b.ayah;
}

function isPositionInsideJuz(position: ReadingPosition, juz: JuzRange): boolean {
  const current = { surah: position.surahNumber, ayah: position.ayahNumber };
  const start = { surah: juz.startSurah, ayah: juz.startAyah };
  const end = { surah: juz.endSurah, ayah: juz.endAyah };
  return comparePosition(current, start) >= 0 && comparePosition(current, end) <= 0;
}

export function JuzList({ juzItems, currentPosition, onPressJuz }: JuzListProps) {
  const { theme } = useApp();
  const { t, content } = useI18n();
  const surahNameMap = useMemo(
    () => new Map(SURAH_NAMES.map((surah) => [surah.number, content(surah, null)])),
    [content],
  );

  if (juzItems.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <LocalizedText style={[styles.emptyText, { color: theme.textSecondary }]}>{t('common.noResults')}</LocalizedText>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {juzItems.map((juz) => {
        const isCurrent = currentPosition ? isPositionInsideJuz(currentPosition, juz) : false;
        const startSurahName = surahNameMap.get(juz.startSurah) || toArabicNumerals(juz.startSurah);
        const endSurahName = surahNameMap.get(juz.endSurah) || toArabicNumerals(juz.endSurah);
        const pageLine = t('quran.pageRange', {
          start: toArabicNumerals(juz.startPage),
          end: toArabicNumerals(juz.endPage),
        });
        const rangeLine = t('quran.surahAyahRange', {
          startSurah: startSurahName,
          startAyah: toArabicNumerals(juz.startAyah),
          endSurah: endSurahName,
          endAyah: toArabicNumerals(juz.endAyah),
        });

        return (
          <Pressable
            key={`juz-${juz.juzNumber}`}
            onPress={() => onPressJuz(juz)}
            style={({ pressed }) => [
              styles.juzCard,
              {
                backgroundColor: theme.card,
                borderColor: isCurrent ? `${theme.playing}CC` : `${theme.playing}3D`,
                borderWidth: isCurrent ? 1.4 : 1.1,
                shadowColor: isCurrent ? `${theme.playing}66` : `${theme.playing}40`,
              },
              pressed && styles.juzCardPressed,
              pressed && !isCurrent && { borderColor: `${theme.playing}66` },
            ]}
          >
            <View
              style={[
                styles.decorativeTopLine,
                { backgroundColor: isCurrent ? `${theme.playing}70` : `${theme.playing}3D` },
              ]}
            />
            <View
              style={[
                styles.decorativeBottomLine,
                { backgroundColor: isCurrent ? `${theme.playing}3D` : `${theme.playing}26` },
              ]}
            />

            <View style={styles.calligraphyWrap}>
              <LocalizedText style={[styles.calligraphy, { color: `${theme.playing}D9` }]}>﷽</LocalizedText>
            </View>

            <View style={styles.centerInfo}>
              <LocalizedText style={[styles.title, { color: theme.text }]}>
                {t('quran.juzTitle', { number: toArabicNumerals(juz.juzNumber) })}
              </LocalizedText>
              <LocalizedText style={[styles.detailLine, { color: theme.textSecondary }]} numberOfLines={1}>
                {pageLine}
              </LocalizedText>
              <LocalizedText style={[styles.rangeLine, { color: theme.textSecondary }]} numberOfLines={2}>
                {rangeLine}
              </LocalizedText>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.md,
  },
  juzCard: {
    minHeight: 128,
    borderRadius: BorderRadius.xl,
    borderWidth: 1.1,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
    shadowColor: '#0B5E4B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    overflow: 'hidden',
    position: 'relative',
  },
  juzCardPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.99 }],
  },
  decorativeTopLine: {
    position: 'absolute',
    top: 0,
    right: 22,
    left: 22,
    height: 2,
    borderBottomLeftRadius: 2,
    borderBottomRightRadius: 2,
  },
  decorativeBottomLine: {
    position: 'absolute',
    bottom: 0,
    right: 42,
    left: 42,
    height: 1,
    borderTopLeftRadius: 1,
    borderTopRightRadius: 1,
  },
  calligraphyWrap: {
    marginTop: 2,
    marginBottom: 2,
  },
  calligraphy: {
    fontFamily: getUthmaniFont(),
    fontSize: 26,
    textAlign: 'center',
    writingDirection: 'rtl',
    includeFontPadding: false,
  },
  centerInfo: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  title: {
    fontSize: Typography.ui.heading,
    fontWeight: '700',
    fontFamily: 'Vazirmatn',
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  detailLine: {
    fontSize: Typography.ui.caption,
    fontFamily: 'Vazirmatn',
    lineHeight: 20,
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  rangeLine: {
    fontSize: Typography.ui.caption,
    fontFamily: 'Vazirmatn',
    lineHeight: 22,
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  emptyContainer: {
    paddingVertical: Spacing.xl,
  },
  emptyText: {
    textAlign: 'center',
    fontSize: Typography.ui.body,
    fontFamily: 'Vazirmatn',
  },
});
