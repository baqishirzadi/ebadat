import CenteredText from '@/components/CenteredText';
import { BorderRadius, Spacing, Typography } from '@/constants/theme';
import { useApp } from '@/context/AppContext';
import { JuzRange } from '@/data/juzRanges';
import { SURAH_NAMES } from '@/data/surahNames';
import { getUthmaniFont } from '@/hooks/useFonts';
import { forwardChevronName, rowStyle } from '@/utils/i18n/direction';
import { useI18n } from '@/utils/i18n/useI18n';
import { MaterialIcons } from '@expo/vector-icons';
import React, { useMemo } from 'react';

import { Pressable, StyleSheet, View } from 'react-native';
import { LocalizedText } from '@/components/ui/LocalizedText';
import { QuranNumberBadge } from './QuranNumberBadge';

interface ReadingPosition {
  surahNumber: number;
  ayahNumber: number;
}

interface JuzListProps {
  juzItems: JuzRange[];
  currentPosition?: ReadingPosition;
  onPressJuz: (juz: JuzRange) => void;
}

const ROW_HEIGHT = 108;

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
  const { t, n, content, language } = useI18n();
  const directionalRow = rowStyle(language);
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
    <View style={styles.list}>
      {juzItems.map((juz) => {
        const isCurrent = currentPosition ? isPositionInsideJuz(currentPosition, juz) : false;
        const title = t('quran.juzTitle', { number: n(juz.juzNumber) });
        const pageLine = t('quran.pageRange', {
          start: n(juz.startPage),
          end: n(juz.endPage),
        });
        const startSurah = surahNameMap.get(juz.startSurah) || n(juz.startSurah);
        const endSurah = surahNameMap.get(juz.endSurah) || n(juz.endSurah);
        const rangeLine = t('quran.surahAyahRange', {
          startSurah,
          startAyah: n(juz.startAyah),
          endSurah,
          endAyah: n(juz.endAyah),
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
              styles.row,
              directionalRow,
              {
                backgroundColor: theme.card,
                borderColor: isCurrent ? theme.playing : theme.cardBorder,
              },
              pressed && styles.rowPressed,
            ]}
          >
            <View style={styles.meta}>
              <CenteredText style={[styles.metaText, { color: theme.textSecondary }]} numberOfLines={1}>
                {startSurah}
              </CenteredText>
              {juz.startSurah !== juz.endSurah ? (
                <CenteredText style={[styles.metaText, styles.metaSecond, { color: theme.textSecondary }]} numberOfLines={1}>
                  {endSurah}
                </CenteredText>
              ) : null}
            </View>

            <QuranNumberBadge value={n(juz.juzNumber)} color={theme.surahHeader} />

            <View style={styles.info}>
              <CenteredText
                style={[styles.title, { color: theme.text }]}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {title}
              </CenteredText>
              <CenteredText
                style={[styles.pages, { color: theme.textSecondary }]}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {pageLine}
              </CenteredText>
            </View>

            <View style={styles.chevron}>
              <MaterialIcons name={forwardChevronName(language)} size={24} color={theme.icon} />
            </View>

            {isCurrent ? (
              <View style={[styles.currentMark, { backgroundColor: theme.playing }]}>
                <MaterialIcons name="play-arrow" size={14} color="#fff" />
              </View>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: Spacing.md,
  },
  row: {
    alignItems: 'center',
    height: ROW_HEIGHT,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    gap: Spacing.md,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    overflow: 'hidden',
  },
  rowPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  meta: {
    flexShrink: 0,
    alignItems: 'flex-start',
    justifyContent: 'center',
    minWidth: 70,
    maxWidth: 92,
  },
  metaText: {
    fontSize: Typography.ui.caption,
    fontFamily: 'Vazirmatn',
  },
  metaSecond: {
    marginTop: 2,
  },
  info: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    width: '100%',
    fontSize: Typography.ui.title,
    fontWeight: '600',
    fontFamily: getUthmaniFont(),
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  pages: {
    width: '100%',
    marginTop: 2,
    fontSize: Typography.ui.caption,
    fontFamily: 'Vazirmatn',
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  chevron: {
    flexShrink: 0,
  },
  currentMark: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
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
