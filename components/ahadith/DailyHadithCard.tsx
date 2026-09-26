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
import { getQuranFontFamily } from '@/hooks/useFonts';

interface DailyHadithCardProps {
  selection: DailyHadithSelection;
  isBookmarked: boolean;
  onToggleBookmark: (hadithId: number) => void;
  onShare: () => void;
  onSwipeNext: () => void;
  onSwipePrevious: () => void;
}

export function DailyHadithCard({
  selection,
  isBookmarked,
  onToggleBookmark,
  onShare,
  onSwipeNext,
  onSwipePrevious,
}: DailyHadithCardProps) {
  const { theme, themeMode, state } = useApp();
  const { t, language, fontFamily, isRtl } = useI18n();
  const opacity = useRef(new Animated.Value(1)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const swipeDirectionRef = useRef<0 | 1 | -1>(0);

  const gradient = useMemo(() => deriveDailyCardGradient(theme, themeMode), [theme, themeMode]);
  const translation = getHadithTranslation(selection.hadith, language);

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

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gestureState) =>
          Math.abs(gestureState.dx) > 18 && Math.abs(gestureState.dy) < 16,
        onPanResponderRelease: (_, gestureState) => {
          if (gestureState.dx < -44) {
            swipeDirectionRef.current = 1;
            onSwipeNext();
            return;
          }
          if (gestureState.dx > 44) {
            swipeDirectionRef.current = -1;
            onSwipePrevious();
          }
        },
      }),
    [onSwipeNext, onSwipePrevious]
  );

  const hadith = selection.hadith;
  const gradeLabel = hadith.is_muttafaq
    ? getMuttafaqBadgeLabel(language)
    : getAuthenticityGradeLabel(hadith.authenticity_grade, language);

  return (
    <Animated.View style={{ opacity, transform: [{ translateX }] }} {...panResponder.panHandlers}>
      <Pressable
        onLongPress={() => onToggleBookmark(hadith.id)}
        delayLongPress={280}
        accessibilityRole="button"
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
          <LinearGradient
            colors={gradient}
            locations={[0, 0.58, 1]}
            style={[
              styles.topPanel,
              {
                borderColor: alphaColor(theme.primary, 0.28),
              },
            ]}
          >
            <View style={styles.actionsRow}>
              <Pressable onPress={onShare} style={[styles.iconButton, { backgroundColor: alphaColor(theme.surface, 0.18) }]} accessibilityLabel={t('ahadith.card.share')}>
                <MaterialIcons name="share" size={20} color={theme.surface} />
              </Pressable>

              <Pressable
                onPress={() => onToggleBookmark(hadith.id)}
                style={[styles.iconButton, { backgroundColor: alphaColor(theme.surface, 0.18) }]}
                accessibilityLabel={t(isBookmarked ? 'ahadith.card.removeBookmark' : 'ahadith.card.addBookmark')}
              >
                <MaterialIcons
                  name={isBookmarked ? 'bookmark' : 'bookmark-border'}
                  size={22}
                  color={isBookmarked ? theme.accent : theme.surface}
                />
              </Pressable>
            </View>

            <View style={styles.tagRow}>
              <View style={[styles.reasonChip, { backgroundColor: alphaColor(theme.surface, 0.14), borderColor: alphaColor(theme.surface, 0.34) }]}>
                <CenteredText style={[styles.reasonText, { color: theme.surface }]}>{getReasonLabel(selection.reason, language)}</CenteredText>
              </View>

              <View
                style={[
                  styles.badge,
                  hadith.is_muttafaq
                    ? { backgroundColor: alphaColor(theme.accent, 0.24), borderColor: alphaColor(theme.accent, 0.45) }
                    : { backgroundColor: alphaColor(theme.surface, 0.14), borderColor: alphaColor(theme.surface, 0.34) },
                ]}
              >
                <CenteredText
                  style={[
                    styles.badgeText,
                    { color: hadith.is_muttafaq ? theme.accent : theme.surface },
                  ]}
                >
                  {gradeLabel}
                </CenteredText>
              </View>
            </View>

            <CenteredText
              style={[
                styles.arabic,
                {
                  color: theme.surface,
                  fontFamily: getQuranFontFamily(state.preferences.quranFont),
                },
              ]}
            >
              {hadith.arabic_text}
            </CenteredText>
          </LinearGradient>

          <View style={styles.bottomPanel}>
            <CenteredText
              style={[
                language === 'english' ? styles.translationEnglish : styles.translation,
                {
                  color: theme.textPrimary,
                  fontFamily,
                  writingDirection: isRtl ? 'rtl' : 'ltr',
                },
              ]}
            >
              {translation || t('ahadith.translation.unavailable')}
            </CenteredText>

            <View style={[styles.footer, { borderTopColor: alphaColor(theme.textSecondary, 0.2) }]}>
              <CenteredText style={[styles.source, { color: theme.textSecondary }]}>
                {formatSourceLabel(hadith.source_book, hadith.source_number, language)}
                {' · '}
                {gradeLabel}
              </CenteredText>
            </View>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 22,
    borderWidth: 1,
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 4,
    overflow: 'hidden',
  },
  topPanel: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 16,
    borderBottomWidth: 1,
    gap: 10,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  tagRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  reasonChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    minHeight: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reasonText: {
    fontFamily: 'Vazirmatn-Bold',
    fontSize: 11,
  },
  badge: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    minHeight: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontFamily: 'Vazirmatn-Bold',
    fontSize: 10,
  },
  arabic: {
    textAlign: 'center',
    writingDirection: 'rtl',
    fontSize: 40,
    lineHeight: 76,
  },
  bottomPanel: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 14,
    gap: 12,
  },
  translation: {
    fontSize: 22,
    lineHeight: 36,
    textAlign: 'center',
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
  },
  source: {
    fontFamily: 'Vazirmatn-Bold',
    fontSize: 13,
    textAlign: 'center',
  },
});
