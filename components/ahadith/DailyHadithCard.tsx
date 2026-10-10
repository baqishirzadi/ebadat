import React, { useEffect, useMemo, useRef } from 'react';
import {
  Animated,
  Easing,
  PanResponder,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { DailyHadithSelection } from '@/types/hadith';
import { useApp } from '@/context/AppContext';
import { alphaColor, deriveDailyCardGradient } from '@/utils/ahadith/theme';
import {
  formatSourceLabel,
  getAuthenticityGradeLabel,
  getMuttafaqBadgeLabel,
  getReasonLabel,
} from '@/utils/ahadith/labels';
import { getHadithTranslation } from '@/utils/ahadith/translation';
import CenteredText from '@/components/CenteredText';
import { useI18n } from '@/utils/i18n/useI18n';
import { forwardChevronName } from '@/utils/i18n/direction';
import { getQuranFontFamily } from '@/hooks/useFonts';

interface DailyHadithCardProps {
  selection: DailyHadithSelection;
  isToday: boolean;
  isBookmarked: boolean;
  onToggleBookmark: (hadithId: number) => void;
  onShare: () => void;
  onSwipeNext: () => void;
  onSwipePrevious: () => void;
  onToday: () => void;
}

export function DailyHadithCard({
  selection,
  isToday,
  isBookmarked,
  onToggleBookmark,
  onShare,
  onSwipeNext,
  onSwipePrevious,
  onToday,
}: DailyHadithCardProps) {
  const { theme, themeMode, state } = useApp();
  const { t, language, fontFamily, isRtl, digits } = useI18n();
  const opacity = useRef(new Animated.Value(1)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const swipeDirectionRef = useRef<0 | 1 | -1>(0);

  const gradient = useMemo(() => deriveDailyCardGradient(theme, themeMode), [theme, themeMode]);
  const translation = getHadithTranslation(selection.hadith, language);
  const nastaliq = fontFamily === 'NotoNastaliqUrdu';
  const previousIcon = isRtl ? 'chevron-right' : 'chevron-left';
  const nextIcon = forwardChevronName(language);

  useEffect(() => {
    const direction = swipeDirectionRef.current;
    const offset = direction === 0 ? 0 : direction * 24;

    opacity.setValue(direction === 0 ? 1 : 0.88);
    translateX.setValue(offset);

    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: direction === 0 ? 140 : 240,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(translateX, {
        toValue: 0,
        duration: direction === 0 ? 140 : 240,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start(() => {
      swipeDirectionRef.current = 0;
    });
  }, [selection.hadith.id, opacity, translateX]);

  const goNext = React.useCallback(() => {
    swipeDirectionRef.current = 1;
    onSwipeNext();
  }, [onSwipeNext]);

  const goPrevious = React.useCallback(() => {
    swipeDirectionRef.current = -1;
    onSwipePrevious();
  }, [onSwipePrevious]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gestureState) =>
          Math.abs(gestureState.dx) > 18 && Math.abs(gestureState.dy) < 16,
        onPanResponderRelease: (_, gestureState) => {
          if (gestureState.dx < -44) {
            goNext();
            return;
          }
          if (gestureState.dx > 44) {
            goPrevious();
          }
        },
      }),
    [goNext, goPrevious]
  );

  const hadith = selection.hadith;
  const gradeLabel = hadith.is_muttafaq
    ? getMuttafaqBadgeLabel(language)
    : getAuthenticityGradeLabel(hadith.authenticity_grade, language);
  const onPanel = '#ffffff';
  const chipStyle = { backgroundColor: alphaColor(onPanel, 0.14), borderColor: alphaColor(onPanel, 0.3) };

  return (
    <Animated.View style={{ opacity, transform: [{ translateX }] }} {...panResponder.panHandlers}>
      <Pressable
        onLongPress={() => onToggleBookmark(hadith.id)}
        delayLongPress={280}
        accessibilityHint={t('ahadith.card.bookmarkHint')}
      >
        <View
          style={[
            styles.card,
            {
              borderColor: alphaColor(theme.primary, 0.24),
              shadowColor: theme.textPrimary,
              backgroundColor: theme.surface,
            },
          ]}
        >
          <LinearGradient colors={gradient} locations={[0, 0.58, 1]} style={styles.topPanel}>
            <View style={styles.navRow}>
              <Pressable
                onPress={goPrevious}
                hitSlop={8}
                style={({ pressed }) => [styles.navButton, chipStyle, pressed && styles.pressed]}
                accessibilityRole="button"
                accessibilityLabel={t('ahadith.day.previous')}
              >
                <View style={styles.iconLtr}>
                  <MaterialIcons name={previousIcon} size={24} color={onPanel} />
                </View>
              </Pressable>

              <Pressable
                onPress={onToday}
                disabled={isToday}
                style={({ pressed }) => [styles.todayChip, chipStyle, pressed && styles.pressed]}
                accessibilityRole="button"
                accessibilityLabel={t(isToday ? 'ahadith.day.today' : 'ahadith.day.backToToday')}
              >
                {!isToday ? <MaterialIcons name="today" size={16} color={onPanel} /> : null}
                <CenteredText
                  numberOfLines={1}
                  style={[styles.todayText, { color: onPanel, lineHeight: nastaliq ? 30 : 20 }]}
                >
                  {isToday ? getReasonLabel(selection.reason, language) : t('ahadith.day.backToToday')}
                </CenteredText>
              </Pressable>

              <Pressable
                onPress={goNext}
                hitSlop={8}
                style={({ pressed }) => [styles.navButton, chipStyle, pressed && styles.pressed]}
                accessibilityRole="button"
                accessibilityLabel={t('ahadith.day.next')}
              >
                <View style={styles.iconLtr}>
                  <MaterialIcons name={nextIcon} size={24} color={onPanel} />
                </View>
              </Pressable>
            </View>

            <CenteredText
              style={[
                styles.arabic,
                { color: onPanel, fontFamily: getQuranFontFamily(state.preferences.quranFont) },
              ]}
            >
              {hadith.arabic_text}
            </CenteredText>
          </LinearGradient>

          <View style={styles.bottomPanel}>
            <CenteredText
              style={[
                language === 'english' || language === 'turkish' ? styles.translationEnglish : styles.translation,
                {
                  color: theme.textPrimary,
                  fontFamily,
                  writingDirection: isRtl ? 'rtl' : 'ltr',
                },
                nastaliq && styles.translationNastaliq,
              ]}
            >
              {translation || t('ahadith.translation.unavailable')}
            </CenteredText>

            <View style={[styles.footer, { borderTopColor: alphaColor(theme.textSecondary, 0.2) }]}>
              <Pressable
                onPress={onShare}
                hitSlop={6}
                style={({ pressed }) => [
                  styles.actionButton,
                  { backgroundColor: alphaColor(theme.primary, 0.1) },
                  pressed && styles.pressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel={t('ahadith.card.share')}
              >
                <MaterialIcons name="share" size={20} color={theme.primary} />
              </Pressable>

              <View style={styles.sourceWrap}>
                <CenteredText style={[styles.source, { color: theme.primary, lineHeight: nastaliq ? 30 : 20 }]}>
                  {digits(formatSourceLabel(hadith.source_book, hadith.source_number, language))}
                </CenteredText>
                <View
                  style={[
                    styles.gradeChip,
                    {
                      backgroundColor: alphaColor(hadith.is_muttafaq ? theme.accent : theme.primary, 0.12),
                      borderColor: alphaColor(hadith.is_muttafaq ? theme.accent : theme.primary, 0.32),
                    },
                  ]}
                >
                  <CenteredText
                    style={[
                      styles.gradeText,
                      { color: theme.primary, lineHeight: nastaliq ? 26 : 16 },
                    ]}
                  >
                    {gradeLabel}
                  </CenteredText>
                </View>
              </View>

              <Pressable
                onPress={() => onToggleBookmark(hadith.id)}
                hitSlop={6}
                style={({ pressed }) => [
                  styles.actionButton,
                  { backgroundColor: alphaColor(theme.primary, isBookmarked ? 0.18 : 0.1) },
                  pressed && styles.pressed,
                ]}
                accessibilityRole="button"
                accessibilityState={{ selected: isBookmarked }}
                accessibilityLabel={t(isBookmarked ? 'ahadith.card.removeBookmark' : 'ahadith.card.addBookmark')}
              >
                <MaterialIcons
                  name={isBookmarked ? 'bookmark' : 'bookmark-border'}
                  size={22}
                  color={theme.primary}
                />
              </Pressable>
            </View>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 24,
    borderWidth: 1,
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
    overflow: 'hidden',
  },
  topPanel: {
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 18,
    gap: 12,
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  navButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconLtr: {
    direction: 'ltr',
  },
  todayChip: {
    flexShrink: 1,
    minHeight: 36,
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  todayText: {
    fontFamily: 'Vazirmatn-Bold',
    fontSize: 13,
  },
  pressed: {
    opacity: 0.75,
  },
  arabic: {
    textAlign: 'center',
    writingDirection: 'rtl',
    fontSize: 32,
    lineHeight: 62,
    paddingHorizontal: 4,
  },
  bottomPanel: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 14,
    gap: 14,
  },
  translation: {
    fontSize: 20,
    lineHeight: 34,
    textAlign: 'center',
  },
  translationNastaliq: {
    lineHeight: 44,
  },
  translationEnglish: {
    fontSize: 18,
    lineHeight: 28,
    textAlign: 'center',
    fontWeight: '500',
  },
  footer: {
    borderTopWidth: 1,
    paddingTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sourceWrap: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  source: {
    fontFamily: 'Vazirmatn-Bold',
    fontSize: 14,
    textAlign: 'center',
  },
  gradeChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 3,
  },
  gradeText: {
    fontFamily: 'Vazirmatn-Bold',
    fontSize: 11,
  },
});
