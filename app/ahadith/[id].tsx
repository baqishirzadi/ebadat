import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import CText from '@/components/CenteredText';
import { HadithShareCanvas } from '@/components/ahadith/HadithShareCanvas';
import { useApp } from '@/context/AppContext';
import { useAhadith } from '@/context/AhadithContext';
import { Hadith } from '@/types/hadith';
import { alphaColor } from '@/utils/ahadith/theme';
import {
  formatSourceLabel,
  getAuthenticityGradeLabel,
  getMuttafaqBadgeLabel,
  getTopicLabel,
} from '@/utils/ahadith/labels';
import { NAAT_GRADIENT } from '@/constants/theme';
import { getPublishedHadithById } from '@/utils/ahadithRemoteService';
import { getQuranFontFamily } from '@/hooks/useFonts';
import { getHadithTranslation } from '@/utils/ahadith/translation';
import { shareHadithCard } from '@/utils/ahadith/shareCard';
import { backIconName } from '@/utils/i18n/direction';
import { useI18n } from '@/utils/i18n/useI18n';

export default function HadithDetailScreen() {
  const params = useLocalSearchParams<{ id?: string }>();
  const router = useRouter();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { theme, themeMode, state } = useApp();
  const { t, language, fontFamily, isRtl, digits } = useI18n();
  const { hadiths, syncRemoteHadiths, toggleBookmark, isBookmarked } = useAhadith();
  const shareCanvasRef = useRef<View | null>(null);
  const nastaliq = fontFamily === 'NotoNastaliqUrdu';

  const [hadith, setHadith] = useState<Hadith | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const hadithId = useMemo(() => {
    const parsed = Number(params.id);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
  }, [params.id]);

  const goBack = useCallback(() => {
    if (navigation.canGoBack()) {
      router.back();
      return;
    }
    router.replace('/(tabs)/ahadith');
  }, [navigation, router]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (!hadithId) {
        setError(t('ahadith.detail.invalidId'));
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      const localHadith = hadiths.find((item) => item.id === hadithId);
      if (localHadith) {
        if (!cancelled) {
          setHadith(localHadith);
          setLoading(false);
        }
        return;
      }

      try {
        await syncRemoteHadiths(true);
        const refreshedLocal = hadiths.find((item) => item.id === hadithId);
        if (refreshedLocal) {
          if (!cancelled) {
            setHadith(refreshedLocal);
            setLoading(false);
          }
          return;
        }

        const remoteHadith = await getPublishedHadithById(hadithId);
        if (!cancelled) {
          if (remoteHadith) {
            setHadith(remoteHadith);
          } else {
            setError(t('ahadith.detail.notFound'));
          }
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(t('ahadith.detail.loadFailed'));
          if (__DEV__) {
            console.warn('[HadithDetail] load failed', loadError);
          }
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [hadithId, hadiths, syncRemoteHadiths, t]);

  const handleShare = useCallback(async () => {
    if (!hadith) return;
    await shareHadithCard({
      captureRef: shareCanvasRef,
      fallbackMessage: language === 'arabic'
        ? `${hadith.arabic_text}\n\n${formatSourceLabel(hadith.source_book, hadith.source_number, language)}`
        : `${hadith.arabic_text}\n\n${getHadithTranslation(hadith, language) || t('ahadith.translation.unavailable')}\n\n${formatSourceLabel(hadith.source_book, hadith.source_number, language)}`,
    });
  }, [hadith, language, t]);

  const bookmarked = hadith ? isBookmarked(hadith.id) : false;
  const gradeLabel = hadith
    ? hadith.is_muttafaq
      ? getMuttafaqBadgeLabel(language)
      : getAuthenticityGradeLabel(hadith.authenticity_grade, language)
    : '';

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <LinearGradient
        colors={NAAT_GRADIENT[themeMode] ?? NAAT_GRADIENT.light}
        style={[styles.header, { paddingTop: insets.top + 8 }]}
      >
        <Pressable
          onPress={goBack}
          hitSlop={8}
          style={styles.headerIconButton}
          accessibilityRole="button"
          accessibilityLabel={t('common.back')}
        >
          <View style={styles.iconLtr}>
            <MaterialIcons name={backIconName(language)} size={24} color="#fff" />
          </View>
        </Pressable>
        <CText style={styles.headerTitle} numberOfLines={1}>
          {t('ahadith.detail.title')}
        </CText>
        <View style={styles.headerIconButton} />
      </LinearGradient>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <MaterialIcons name="error-outline" size={48} color={alphaColor(theme.textSecondary, 0.6)} />
          <CText style={[styles.errorText, { color: theme.textSecondary }]}>{error}</CText>
        </View>
      ) : hadith ? (
        <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 28 }]}>
          <View
            style={[
              styles.card,
              {
                backgroundColor: theme.surface,
                borderColor: alphaColor(theme.primary, 0.22),
                shadowColor: theme.textPrimary,
              },
            ]}
          >
            <View style={[styles.arabicPanel, { backgroundColor: alphaColor(theme.primary, 0.06) }]}>
              <CText
                style={[
                  styles.arabic,
                  { color: theme.textPrimary, fontFamily: getQuranFontFamily(state.preferences.quranFont) },
                ]}
              >
                {hadith.arabic_text}
              </CText>
            </View>

            {language !== 'arabic' ? (
            <CText
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
              {getHadithTranslation(hadith, language) || t('ahadith.translation.unavailable')}
            </CText>
            ) : null}

            {hadith.topics.length > 0 ? (
              <View style={styles.topicsRow}>
                {hadith.topics.map((topic) => (
                  <View
                    key={topic}
                    style={[styles.topicChip, { backgroundColor: alphaColor(theme.primary, 0.08) }]}
                  >
                    <CText
                      style={[styles.topicText, { color: theme.primary, lineHeight: nastaliq ? 28 : 18 }]}
                    >
                      {getTopicLabel(topic, language)}
                    </CText>
                  </View>
                ))}
              </View>
            ) : null}

            <View style={[styles.footer, { borderTopColor: alphaColor(theme.textSecondary, 0.2) }]}>
              <Pressable
                onPress={() => void handleShare()}
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
                <CText style={[styles.source, { color: theme.primary, lineHeight: nastaliq ? 30 : 20 }]}>
                  {digits(formatSourceLabel(hadith.source_book, hadith.source_number, language))}
                </CText>
                <View
                  style={[
                    styles.gradeChip,
                    {
                      backgroundColor: alphaColor(hadith.is_muttafaq ? theme.accent : theme.primary, 0.12),
                      borderColor: alphaColor(hadith.is_muttafaq ? theme.accent : theme.primary, 0.32),
                    },
                  ]}
                >
                  <CText style={[styles.gradeText, { color: theme.primary, lineHeight: nastaliq ? 26 : 16 }]}>
                    {gradeLabel}
                  </CText>
                </View>
              </View>

              <Pressable
                onPress={() => void toggleBookmark(hadith.id)}
                hitSlop={6}
                style={({ pressed }) => [
                  styles.actionButton,
                  { backgroundColor: alphaColor(theme.primary, bookmarked ? 0.18 : 0.1) },
                  pressed && styles.pressed,
                ]}
                accessibilityRole="button"
                accessibilityState={{ selected: bookmarked }}
                accessibilityLabel={t(bookmarked ? 'ahadith.card.removeBookmark' : 'ahadith.card.addBookmark')}
              >
                <MaterialIcons name={bookmarked ? 'bookmark' : 'bookmark-border'} size={22} color={theme.primary} />
              </Pressable>
            </View>
          </View>
        </ScrollView>
      ) : null}

      {hadith ? (
        <View style={styles.hiddenShareCanvas} pointerEvents="none">
          <HadithShareCanvas ref={shareCanvasRef} hadith={hadith} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingBottom: 14,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerIconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconLtr: {
    direction: 'ltr',
  },
  headerTitle: {
    flex: 1,
    color: '#fff',
    fontFamily: 'Vazirmatn-Bold',
    fontSize: 20,
    textAlign: 'center',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    gap: 10,
  },
  errorText: {
    fontFamily: 'Vazirmatn',
    fontSize: 14,
    textAlign: 'center',
  },
  content: {
    padding: 12,
  },
  card: {
    borderWidth: 1,
    borderRadius: 22,
    padding: 12,
    gap: 16,
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  arabicPanel: {
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 12,
  },
  arabic: {
    fontSize: 30,
    lineHeight: 60,
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  translation: {
    fontSize: 20,
    lineHeight: 34,
    textAlign: 'center',
    paddingHorizontal: 4,
  },
  translationNastaliq: {
    lineHeight: 44,
  },
  translationEnglish: {
    fontSize: 17,
    lineHeight: 28,
    textAlign: 'center',
    fontWeight: '500',
    paddingHorizontal: 4,
  },
  topicsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 6,
  },
  topicChip: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  topicText: {
    fontFamily: 'Vazirmatn-Bold',
    fontSize: 12,
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
  pressed: {
    opacity: 0.75,
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
  hiddenShareCanvas: {
    position: 'absolute',
    left: -9999,
    top: -9999,
    opacity: 0,
  },
});
