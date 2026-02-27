import React, { useEffect, useMemo, useRef } from 'react';
import {
  Animated,
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
import CenteredText from '@/components/CenteredText';
import { getQuranFontFamily, getDariFontFamily, getPashtoFontFamily } from '@/hooks/useFonts';

interface DailyHadithCardProps {
  selection: DailyHadithSelection;
  isBookmarked: boolean;
  onToggleBookmark: (hadithId: number) => void;
  onShare: () => void;
  onSwipeNext: () => void;
  onSwipePrevious: () => void;
}

function getReasonLabel(reason: DailyHadithSelection['reason']): string {
  if (reason === 'special_days') return 'مناسبتی';
  if (reason === 'hijri_range') return 'تقویم هجری';
  if (reason === 'weekday_only') return 'مخصوص جمعه';
  return 'روزانه';
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
  const opacity = useRef(new Animated.Value(1)).current;

  const gradient = useMemo(() => deriveDailyCardGradient(theme, themeMode), [theme, themeMode]);

  useEffect(() => {
    opacity.setValue(0.1);
    Animated.timing(opacity, {
      toValue: 1,
      duration: 260,
      useNativeDriver: true,
    }).start();
  }, [selection.hadith.id, opacity]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gestureState) =>
          Math.abs(gestureState.dx) > 18 && Math.abs(gestureState.dy) < 16,
        onPanResponderRelease: (_, gestureState) => {
          if (gestureState.dx < -44) {
            onSwipeNext();
            return;
          }
          if (gestureState.dx > 44) {
            onSwipePrevious();
          }
        },
      }),
    [onSwipeNext, onSwipePrevious]
  );

  const hadith = selection.hadith;

  return (
    <Animated.View style={{ opacity }} {...panResponder.panHandlers}>
      <Pressable
        onLongPress={() => onToggleBookmark(hadith.id)}
        delayLongPress={280}
        accessibilityRole="button"
        accessibilityHint="Long press to bookmark this hadith"
      >
        <LinearGradient
          colors={gradient}
          style={[
            styles.card,
            {
              borderColor: alphaColor(theme.primary, 0.24),
              shadowColor: theme.textPrimary,
            },
          ]}
        >
          <View style={styles.topBar}>
            <View style={[styles.reasonChip, { backgroundColor: alphaColor(theme.primary, 0.16), borderColor: alphaColor(theme.primary, 0.35) }]}> 
              <CenteredText style={[styles.reasonText, { color: theme.primary }]}>{getReasonLabel(selection.reason)}</CenteredText>
            </View>

            <View style={styles.actions}>
              {hadith.is_muttafaq ? (
                <View style={[styles.badge, { backgroundColor: alphaColor(theme.accent, 0.24), borderColor: alphaColor(theme.accent, 0.42) }]}> 
                  <CenteredText style={[styles.badgeText, { color: theme.accent }]}>Muttafaq Alayh</CenteredText>
                </View>
              ) : null}

              <Pressable onPress={onShare} style={styles.iconButton} accessibilityLabel="Share hadith">
                <MaterialIcons name="share" size={20} color={theme.primary} />
              </Pressable>

              <Pressable
                onPress={() => onToggleBookmark(hadith.id)}
                style={styles.iconButton}
                accessibilityLabel={isBookmarked ? 'Remove bookmark' : 'Add bookmark'}
              >
                <MaterialIcons
                  name={isBookmarked ? 'bookmark' : 'bookmark-border'}
                  size={22}
                  color={isBookmarked ? theme.accent : theme.primary}
                />
              </Pressable>
            </View>
          </View>

          <CenteredText
            style={[
              styles.arabic,
              {
                color: theme.textPrimary,
                fontFamily: getQuranFontFamily(state.preferences.quranFont),
              },
            ]}
          >
            {hadith.arabic_text}
          </CenteredText>

          <View style={[styles.divider, { backgroundColor: alphaColor(theme.textSecondary, 0.25) }]} />

          <CenteredText
            style={[
              styles.dari,
              {
                color: theme.textPrimary,
                fontFamily: getDariFontFamily(state.preferences.dariFont),
              },
            ]}
          >
            {hadith.dari_translation}
          </CenteredText>

          <CenteredText
            style={[
              styles.pashto,
              {
                color: theme.textSecondary,
                fontFamily: getPashtoFontFamily(state.preferences.pashtoFont),
              },
            ]}
          >
            {hadith.pashto_translation}
          </CenteredText>

          <View style={[styles.footer, { borderTopColor: alphaColor(theme.textSecondary, 0.2) }]}> 
            <CenteredText style={[styles.source, { color: theme.textSecondary }]}>
              {`Sahih ${hadith.source_book} ${hadith.source_number}`}
            </CenteredText>
            <CenteredText style={[styles.hint, { color: theme.textSecondary }]}>برای نشانه‌گذاری، نگه‌دارید</CenteredText>
          </View>
        </LinearGradient>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 22,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 16,
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 4,
    gap: 12,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },
  reasonChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    minHeight: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reasonText: {
    fontFamily: 'Vazirmatn-Bold',
    fontSize: 11,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  iconButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    minHeight: 28,
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
    fontSize: 38,
    lineHeight: 74,
  },
  divider: {
    height: 1,
  },
  dari: {
    fontSize: 22,
    lineHeight: 36,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  pashto: {
    fontSize: 19,
    lineHeight: 31,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  footer: {
    borderTopWidth: 1,
    paddingTop: 12,
    gap: 4,
  },
  source: {
    fontFamily: 'Vazirmatn-Bold',
    fontSize: 13,
    textAlign: 'center',
  },
  hint: {
    fontFamily: 'Vazirmatn',
    fontSize: 11,
    textAlign: 'center',
  },
});
