import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import CText from '@/components/CenteredText';
import { useApp } from '@/context/AppContext';
import { useAhadith } from '@/context/AhadithContext';
import { Hadith } from '@/types/hadith';
import { alphaColor } from '@/utils/ahadith/theme';
import { formatSourceLabel, getAuthenticityGradeLabelFa } from '@/utils/ahadith/labels';
import { NAAT_GRADIENT } from '@/constants/theme';
import { getPublishedHadithById } from '@/utils/ahadithRemoteService';
import { getDariFontFamily, getPashtoFontFamily, getQuranFontFamily } from '@/hooks/useFonts';
import { getHadithTranslation } from '@/utils/ahadith/translation';
import { useI18n } from '@/utils/i18n/useI18n';

export default function HadithDetailScreen() {
  const params = useLocalSearchParams<{ id?: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme, themeMode, state } = useApp();
  const { t, language, fontFamily } = useI18n();
  const { hadiths, syncRemoteHadiths } = useAhadith();

  const [hadith, setHadith] = useState<Hadith | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const hadithId = useMemo(() => {
    const parsed = Number(params.id);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
  }, [params.id]);

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

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <LinearGradient
        colors={NAAT_GRADIENT[themeMode] ?? NAAT_GRADIENT.light}
        style={[styles.header, { paddingTop: insets.top + 10 }]}
      >
        <Pressable
          onPress={() => {
            if (router.canGoBack?.()) {
              router.back();
            } else {
              router.replace('/(tabs)/ahadith');
            }
          }}
          style={styles.headerIconButton}
        >
          <MaterialIcons name="arrow-forward" size={22} color="#fff" />
        </Pressable>
        <CText style={styles.headerTitle}>{t('hadith.title')}</CText>
        <View style={styles.headerIconButton} />
      </LinearGradient>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <CText style={[styles.errorText, { color: theme.textSecondary }]}>{error}</CText>
        </View>
      ) : hadith ? (
        <ScrollView contentContainerStyle={styles.content}>
          <View
            style={[
              styles.card,
              { backgroundColor: theme.surface, borderColor: alphaColor(theme.primary, 0.24) },
            ]}
          >
            <CText
              style={[
                styles.arabic,
                {
                  color: theme.textPrimary,
                  fontFamily: getQuranFontFamily(state.preferences.quranFont),
                },
              ]}
            >
              {hadith.arabic_text}
            </CText>

            <View style={[styles.divider, { backgroundColor: alphaColor(theme.textSecondary, 0.26) }]} />

            <CText
              style={[
                language === 'pashto' ? styles.pashto : styles.dari,
                {
                  color: theme.textPrimary,
                  fontFamily: fontFamily ?? (language === 'pashto'
                    ? getPashtoFontFamily(state.preferences.pashtoFont)
                    : getDariFontFamily(state.preferences.dariFont)),
                },
              ]}
            >
              {getHadithTranslation(hadith, language)}
            </CText>

            <CText style={[styles.source, { color: theme.primary }]}>
              {formatSourceLabel(hadith.source_book, hadith.source_number)}
              {' · '}
              {hadith.is_muttafaq ? 'متفق‌علیه' : getAuthenticityGradeLabelFa(hadith.authenticity_grade)}
            </CText>
          </View>
        </ScrollView>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    minHeight: 88,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingBottom: 14,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerIconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    color: '#fff',
    fontFamily: 'Vazirmatn-Bold',
    fontSize: 22,
    textAlign: 'center',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  errorText: {
    fontFamily: 'Vazirmatn',
    fontSize: 14,
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  content: {
    padding: 12,
    paddingBottom: 24,
  },
  card: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 14,
    gap: 14,
  },
  arabic: {
    fontSize: 34,
    lineHeight: 68,
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  divider: {
    height: 1,
  },
  dari: {
    fontSize: 20,
    lineHeight: 34,
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  pashto: {
    fontSize: 18,
    lineHeight: 32,
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  source: {
    marginTop: 4,
    fontFamily: 'Vazirmatn-Bold',
    fontSize: 14,
    textAlign: 'center',
    writingDirection: 'rtl',
  },
});
