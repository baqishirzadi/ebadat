import { BorderRadius, Spacing, Typography } from '@/constants/theme';
import { useApp } from '@/context/AppContext';
import { JuzRange } from '@/data/juzRanges';
import { SURAH_NAMES, toArabicNumerals } from '@/data/surahNames';
import { getUthmaniFont } from '@/hooks/useFonts';
import { directionStyle, textCenterStyle } from '@/utils/i18n/direction';
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
  const { t, content, language } = useI18n();
  const direction = directionStyle(language);
  const textCenter = textCenterStyle(language);
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
    <View style={[styles.grid, direction]}>
      {juzItems.map((juz) => {
        const isCurrent = currentPosition ? isPositionInsideJuz(currentPosition, juz) : false;
        const title = t('quran.juzTitle', { number: toArabicNumerals(juz.juzNumber) });
        const pageLine = t('quran.pageRange', {
          start: toArabicNumerals(juz.startPage),
          end: toArabicNumerals(juz.endPage),
        });
        const rangeLine = t('quran.surahAyahRange', {
          startSurah: surahNameMap.get(juz.startSurah) || toArabicNumerals(juz.startSurah),
          startAyah: toArabicNumerals(juz.startAyah),
          endSurah: surahNameMap.get(juz.endSurah) || toArabicNumerals(juz.endSurah),
          endAyah: toArabicNumerals(juz.endAyah),
        });

        return (
          <Pressable
            key={`juz-${juz.juzNumber}`}
            testID={`quran-juz-${juz.juzNumber}`}
            accessibilityRole="button"
            accessibilityLabel={`${title}، ${pageLine}، ${rangeLine}`}
            accessibilityState={{ selected: isCurrent }}
            onPress={() => onPressJuz(juz)}
            style={({ pressed }) => [
              styles.plaque,
              {
                backgroundColor: isCurrent ? theme.playing : theme.card,
                borderColor: theme.playing,
              },
              pressed && styles.plaquePressed,
            ]}
          >
            <View
              style={[
                styles.plaqueInner,
                { borderColor: isCurrent ? `${theme.accent}CC` : `${theme.accent}8C` },
              ]}
            >
              <View
                style={[
                  styles.medallion,
                  isCurrent
                    ? { backgroundColor: '#fff', borderColor: theme.accent }
                    : { backgroundColor: `${theme.playing}12`, borderColor: `${theme.accent}B3` },
                ]}
              >
                <LocalizedText
                  style={[styles.medallionNumber, { color: theme.playing }]}
                  numberOfLines={1}
                >
                  {toArabicNumerals(juz.juzNumber)}
                </LocalizedText>
              </View>
              <View style={styles.info}>
                <LocalizedText
                  style={[styles.title, textCenter, { color: isCurrent ? '#fff' : theme.text }]}
                  numberOfLines={1}
                >
                  {title}
                </LocalizedText>
                <LocalizedText
                  style={[
                    styles.pages,
                    textCenter,
                    { color: isCurrent ? 'rgba(255,255,255,0.85)' : theme.textSecondary },
                  ]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                >
                  {pageLine}
                </LocalizedText>
              </View>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: Spacing.sm + 2,
    paddingTop: Spacing.sm,
  },
  plaque: {
    width: '48.5%',
    minHeight: 76,
    padding: 3,
    borderRadius: BorderRadius.lg,
    borderWidth: 1.2,
    shadowColor: '#0B5E4B',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  plaquePressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  plaqueInner: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 46,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  medallion: {
    position: 'absolute',
    start: 5,
    top: '50%',
    marginTop: -19,
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  medallionNumber: {
    fontFamily: getUthmaniFont(),
    fontSize: 19,
    lineHeight: 27,
    textAlign: 'center',
    includeFontPadding: false,
  },
  info: {
    justifyContent: 'center',
    gap: 2,
  },
  title: {
    fontSize: Typography.ui.body,
    fontWeight: '700',
    fontFamily: 'Vazirmatn',
  },
  pages: {
    fontSize: Typography.ui.caption,
    fontFamily: 'Vazirmatn',
    lineHeight: 18,
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
