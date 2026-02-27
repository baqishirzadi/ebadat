import React, { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import CText from '@/components/CenteredText';
import { useApp } from '@/context/AppContext';
import { useAhadith } from '@/context/AhadithContext';
import { HadithComposer } from '@/components/ahadith/HadithComposer';
import { NAAT_GRADIENT } from '@/constants/theme';
import {
  clearHadithAdminSession,
  createAndPublishHadith,
  isHadithAdminSessionActive,
  retryHadithNotification,
} from '@/utils/hadithAdminService';
import { alphaColor } from '@/utils/ahadith/theme';
import { HadithAdminPayload } from '@/types/hadith';

interface PublishSummary {
  hadithId: number | null;
  sent: number;
  failed: number;
  retryRequired: boolean;
}

export default function HadithAdminScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme, themeMode } = useApp();
  const { syncRemoteHadiths } = useAhadith();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [summary, setSummary] = useState<PublishSummary | null>(null);

  React.useEffect(() => {
    if (!isHadithAdminSessionActive()) {
      router.replace('/(tabs)/ahadith' as any);
    }
  }, [router]);

  const cardStyle = useMemo(
    () => ({
      borderColor: alphaColor(theme.primary, 0.24),
      backgroundColor: theme.surface,
    }),
    [theme.primary, theme.surface]
  );

  const handleBack = () => {
    router.back();
  };

  const handleLogout = () => {
    clearHadithAdminSession();
    router.replace('/(tabs)/ahadith' as any);
  };

  const handlePublish = async (payload: HadithAdminPayload) => {
    if (!isHadithAdminSessionActive()) {
      Alert.alert('نشست منقضی شده', 'برای ادامه دوباره از هدر احادیث وارد مدیریت شوید.');
      router.replace('/(tabs)/ahadith' as any);
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await createAndPublishHadith(payload);
      await syncRemoteHadiths(true);

      setSummary({
        hadithId: result.hadith?.id ?? null,
        sent: result.sent,
        failed: result.failed,
        retryRequired: !!result.retryRequired,
      });

      if (result.retryRequired) {
        Alert.alert(
          'انتشار انجام شد',
          `حدیث منتشر شد. ارسال موفق: ${result.sent} • ناموفق: ${result.failed}. لطفاً دکمه ارسال دوباره را بزنید.`
        );
      } else {
        Alert.alert('انتشار موفق', `حدیث منتشر شد. ارسال موفق: ${result.sent} • ناموفق: ${result.failed}`);
      }
    } catch (error) {
      if (
        error instanceof Error &&
        (error.message === 'HADITH_ADMIN_SESSION_EXPIRED' || error.message === 'HADITH_ADMIN_UNAUTHORIZED')
      ) {
        clearHadithAdminSession();
        Alert.alert('دسترسی نامعتبر', 'برای ادامه دوباره از هدر احادیث وارد مدیریت شوید.');
        router.replace('/(tabs)/ahadith' as any);
        return;
      }

      Alert.alert('خطا', 'انتشار حدیث ناموفق بود. دوباره تلاش کنید.');
      if (__DEV__) {
        console.warn('[HadithAdmin] publish failed', error);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRetryNotification = async () => {
    if (!summary?.hadithId) return;

    setIsSubmitting(true);
    try {
      const result = await retryHadithNotification(summary.hadithId);
      setSummary((prev) =>
        prev
          ? {
              ...prev,
              sent: result.sent,
              failed: result.failed,
              retryRequired: !!result.retryRequired,
            }
          : prev
      );

      Alert.alert('ارسال اعلان', `ارسال موفق: ${result.sent} • ناموفق: ${result.failed}`);
    } catch (error) {
      Alert.alert('خطا', 'ارسال دوباره اعلان ناموفق بود.');
      if (__DEV__) {
        console.warn('[HadithAdmin] retry notification failed', error);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <LinearGradient
        colors={NAAT_GRADIENT[themeMode] ?? NAAT_GRADIENT.light}
        style={[styles.header, { paddingTop: insets.top + 10 }]}
      >
        <Pressable onPress={handleBack} style={styles.headerIconButton}>
          <MaterialIcons name="arrow-forward" size={22} color="#fff" />
        </Pressable>
        <CText style={styles.headerTitle}>مدیریت احادیث</CText>
        <Pressable onPress={handleLogout} style={styles.headerIconButton}>
          <MaterialIcons name="logout" size={22} color="#fff" />
        </Pressable>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={[styles.block, cardStyle]}>
          <CText style={[styles.helpText, { color: theme.textSecondary }]}>
            حدیث جدید را وارد کنید. پس از انتشار، اعلان به همه کاربران دارای اعلان فعال ارسال می‌شود.
          </CText>
          <HadithComposer isSubmitting={isSubmitting} onPublish={handlePublish} />
        </View>

        {summary ? (
          <View style={[styles.block, cardStyle]}>
            <CText style={[styles.summaryTitle, { color: theme.textPrimary }]}>نتیجه انتشار</CText>
            <CText style={[styles.summaryText, { color: theme.textSecondary }]}>
              ارسال موفق: {summary.sent} • ناموفق: {summary.failed}
            </CText>
            {summary.retryRequired && summary.hadithId ? (
              <Pressable
                onPress={handleRetryNotification}
                disabled={isSubmitting}
                style={[
                  styles.retryButton,
                  {
                    borderColor: alphaColor(theme.primary, 0.4),
                    backgroundColor: alphaColor(theme.primary, 0.16),
                    opacity: isSubmitting ? 0.7 : 1,
                  },
                ]}
              >
                <CText style={[styles.retryButtonText, { color: theme.primary }]}>
                  ارسال دوباره اعلان
                </CText>
              </Pressable>
            ) : null}
          </View>
        ) : null}
      </ScrollView>
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
  content: {
    padding: 12,
    gap: 12,
    paddingBottom: 24,
  },
  block: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 12,
    gap: 10,
  },
  helpText: {
    textAlign: 'center',
    writingDirection: 'rtl',
    fontFamily: 'Vazirmatn',
    fontSize: 12,
    lineHeight: 22,
  },
  summaryTitle: {
    textAlign: 'center',
    writingDirection: 'rtl',
    fontFamily: 'Vazirmatn-Bold',
    fontSize: 14,
  },
  summaryText: {
    textAlign: 'center',
    writingDirection: 'rtl',
    fontFamily: 'Vazirmatn',
    fontSize: 13,
  },
  retryButton: {
    borderWidth: 1,
    borderRadius: 12,
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryButtonText: {
    fontFamily: 'Vazirmatn-Bold',
    fontSize: 13,
    textAlign: 'center',
    writingDirection: 'rtl',
  },
});
