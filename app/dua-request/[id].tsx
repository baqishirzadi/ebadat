/**
 * Dua Request Detail Screen
 * Shows request details and response (if answered)
 */

import CenteredText from '@/components/CenteredText';
import { MarkdownText, normalizeMarkdownForClipboard } from '@/components/MarkdownText';
import { StatusBadge } from '@/components/dua/StatusBadge';
import { BorderRadius, Spacing, Typography } from '@/constants/theme';
import { useApp } from '@/context/AppContext';
import { useDua } from '@/context/DuaContext';
import { getResponder } from '@/constants/responders';
import { DUA_CATEGORIES, DuaRequest, GENDER_INFO, STATUS_INFO } from '@/types/dua';
import { MaterialIcons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useFocusEffect, useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { formatGregorianDateTimeCompact } from '@/utils/calendarDisplay';
import { toArabicNumerals } from '@/utils/numbers';
import { useI18n } from '@/utils/i18n/useI18n';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';

export default function DuaRequestDetailScreen() {
  const { theme, state: appState } = useApp();
  const { t } = useI18n();
  const isPashto = appState.preferences.appLanguage === 'pashto';
  const { getRequestById, refreshRequests, markRequestSeen } = useDua();
  const router = useRouter();
  const navigation = useNavigation();
  const { id } = useLocalSearchParams<{ id: string }>();

  const handleBack = useCallback(() => {
    if (navigation.canGoBack()) {
      router.back();
      return;
    }
    router.replace('/dua-request');
  }, [navigation, router]);

  const [request, setRequest] = useState<DuaRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadRequest = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await getRequestById(id);
      setRequest(data);
      if (data?.status === 'answered') {
        await markRequestSeen(data.id);
      }
    } catch (error) {
      console.error('Failed to load request:', error);
    } finally {
      setLoading(false);
    }
  }, [id, getRequestById, markRequestSeen]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshRequests();
    await loadRequest();
    setRefreshing(false);
  }, [refreshRequests, loadRequest]);

  const handleCopyResponse = useCallback(async (response: string) => {
    try {
      await Clipboard.setStringAsync(normalizeMarkdownForClipboard(response));
      Alert.alert(t('common.success'), t('dua.detail.copySuccess'));
    } catch {
      Alert.alert(t('common.error'), t('dua.detail.copyFailure'));
    }
  }, [t]);

  useEffect(() => {
    loadRequest();
  }, [loadRequest]);

  useFocusEffect(
    useCallback(() => {
      // Always refresh when screen is focused to get latest admin replies
      handleRefresh();
    }, [handleRefresh])
  );

  const formatDate = (date: Date): string => {
    return formatGregorianDateTimeCompact(date, toArabicNumerals, isPashto ? 'ps-AF' : 'fa-AF');
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={[styles.header, { backgroundColor: theme.surahHeader }]}>
          <Pressable onPress={handleBack} style={styles.backButton}>
            <MaterialIcons name="arrow-forward" size={24} color="#fff" />
          </Pressable>
          <CenteredText style={styles.headerTitle}>{t('dua.detail.title')}</CenteredText>
          <View style={styles.headerRight} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.tint} />
          <CenteredText style={[styles.loadingText, { color: theme.textSecondary }]}>
            {t('dua.index.loading')}
          </CenteredText>
        </View>
      </View>
    );
  }

  if (!request) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={[styles.header, { backgroundColor: theme.surahHeader }]}>
          <Pressable onPress={handleBack} style={styles.backButton}>
            <MaterialIcons name="arrow-forward" size={24} color="#fff" />
          </Pressable>
          <CenteredText style={styles.headerTitle}>{t('dua.detail.title')}</CenteredText>
          <View style={styles.headerRight} />
        </View>
        <View style={styles.emptyContainer}>
          <MaterialIcons name="error-outline" size={64} color={theme.textSecondary} />
          <CenteredText style={[styles.emptyText, { color: theme.text }]}>
            {t('dua.detail.notFound')}
          </CenteredText>
        </View>
      </View>
    );
  }

  const category = DUA_CATEGORIES.find((c) => c.id === request.category);
  const statusInfo = STATUS_INFO[request.status];
  const genderLabel = request.gender
    ? (isPashto ? GENDER_INFO[request.gender].namePashto : GENDER_INFO[request.gender].nameDari)
    : isPashto ? 'نامعلوم' : 'نامشخص';

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.surahHeader }]}>
        <Pressable onPress={handleBack} style={styles.backButton}>
          <MaterialIcons name="arrow-forward" size={24} color="#fff" />
        </Pressable>
        <CenteredText style={styles.headerTitle}>{t('dua.detail.title')}</CenteredText>
        <View style={styles.headerRight} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={theme.tint}
            colors={[theme.tint]}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Status and Category */}
        <View style={styles.metaRow}>
          <StatusBadge status={request.status} />
          <View style={styles.categoryBadge}>
            <MaterialIcons
              name={category?.icon as any || 'help'}
              size={16}
              color={theme.tint}
            />
            <CenteredText style={[styles.categoryText, { color: theme.tint }]}>
              {isPashto ? category?.namePashto || 'نامعلوم' : category?.nameDari || 'نامشخص'}
            </CenteredText>
          </View>
        </View>
        {request.responderId && (
          <View style={styles.metaRow}>
            <View style={[styles.metaChip, { backgroundColor: theme.backgroundSecondary }]}>
              <MaterialIcons name="person-outline" size={14} color={theme.textSecondary} />
              <CenteredText style={[styles.metaText, { color: theme.textSecondary }]}>
                {t('dua.detail.responder', { name: request.responderName || (isPashto ? getResponder(request.responderId)?.namePashto : getResponder(request.responderId)?.nameDari) || '' })}
              </CenteredText>
            </View>
          </View>
        )}
        <View style={styles.metaRow}>
          <View style={[styles.metaChip, { backgroundColor: theme.backgroundSecondary }]}>
            <MaterialIcons name="person" size={14} color={theme.textSecondary} />
            <CenteredText style={[styles.metaText, { color: theme.textSecondary }]}>
              {t('dua.detail.gender', { gender: genderLabel })}
            </CenteredText>
          </View>
          <View style={[styles.metaChip, { backgroundColor: theme.backgroundSecondary }]}>
            <MaterialIcons name="schedule" size={14} color={theme.textSecondary} />
            <CenteredText style={[styles.metaText, { color: theme.textSecondary }]}>
              {formatDate(request.createdAt)}
            </CenteredText>
          </View>
        </View>

        {/* Request Message */}
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
          <View style={styles.cardHeader}>
            <MaterialIcons name="message" size={20} color={theme.tint} />
            <CenteredText style={[styles.cardTitle, { color: theme.text }]}>
              {t('dua.detail.requestText')}
            </CenteredText>
          </View>
          <MarkdownText style={[styles.messageText, { color: theme.text }]} boldStyle={{ color: theme.text }}>
            {request.message}
          </MarkdownText>
          <CenteredText style={[styles.dateText, { color: theme.textSecondary }]}>
            {formatDate(request.createdAt)}
          </CenteredText>
        </View>

        {/* Response (if answered) */}
        {request.status === 'answered' && request.response && (
          <View style={[styles.card, styles.responseCard, { backgroundColor: `${statusInfo.color}15`, borderColor: statusInfo.color }]}>
            <View style={styles.cardHeader}>
              <MaterialIcons name="check-circle" size={20} color={statusInfo.color} />
              <CenteredText style={[styles.cardTitle, { color: theme.text }]}>
              {t('dua.detail.response')}
            </CenteredText>
              <Pressable
                testID="dua-copy-response"
                onPress={() => void handleCopyResponse(request.response!)}
                hitSlop={8}
                style={styles.copyResponseButton}
              >
                <MaterialIcons name="content-copy" size={17} color={theme.textSecondary} />
                <CenteredText style={[styles.copyResponseLabel, { color: theme.textSecondary }]}>{t('dua.detail.copy')}</CenteredText>
              </Pressable>
            </View>
            <MarkdownText style={[styles.responseText, { color: theme.text }]} boldStyle={{ color: theme.text }}>
              {request.response}
            </MarkdownText>
            {/0787506666|لنگر/.test(request.response) ? (
              <View style={[styles.distressBox, { backgroundColor: theme.backgroundSecondary }]}>
                <MaterialIcons name="phone-in-talk" size={18} color={theme.tint} />
                <CenteredText style={[styles.distressText, { color: theme.textSecondary }]}>
                  {t('dua.detail.distress')}
                </CenteredText>
              </View>
            ) : null}
            {request.reviewerName && (
              <View style={styles.reviewerInfo}>
                <MaterialIcons name="person" size={16} color={theme.textSecondary} />
                <CenteredText style={[styles.reviewerText, { color: theme.textSecondary }]}>
                  {t('dua.detail.responderLabel', { name: request.reviewerName })}
                </CenteredText>
              </View>
            )}
            {request.answeredAt && (
              <CenteredText style={[styles.dateText, { color: theme.textSecondary }]}>
                {formatDate(request.answeredAt)}
              </CenteredText>
            )}
          </View>
        )}

        {/* Pending Message */}
        {request.status === 'pending' && (
          <View style={[styles.infoCard, { backgroundColor: theme.backgroundSecondary }]}>
            <MaterialIcons name="schedule" size={24} color={theme.tint} />
            <CenteredText style={[styles.infoText, { color: theme.textSecondary }]}>
              {t('dua.detail.pending')}
            </CenteredText>
          </View>
        )}

        <View style={styles.bottomPadding} />
      </ScrollView>
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
    paddingTop: 60,
    paddingBottom: Spacing.lg,
    paddingHorizontal: Spacing.lg,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    overflow: 'hidden',
  },
  backButton: {
    padding: Spacing.xs,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    fontFamily: 'Vazirmatn',
  },
  headerRight: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.md,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: Spacing.md,
    fontSize: Typography.ui.body,
    fontFamily: 'Vazirmatn',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  emptyText: {
    fontSize: Typography.ui.subtitle,
    marginTop: Spacing.md,
    fontFamily: 'Vazirmatn',
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.md,
  },
  metaText: {
    fontSize: Typography.ui.caption,
    fontFamily: 'Vazirmatn',
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
    backgroundColor: 'rgba(26, 77, 62, 0.1)',
  },
  categoryText: {
    fontSize: Typography.ui.caption,
    fontWeight: '600',
    fontFamily: 'Vazirmatn',
  },
  card: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginBottom: Spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
    justifyContent: 'center',
    position: 'relative',
  },
  cardTitle: {
    fontSize: Typography.ui.subtitle,
    fontWeight: '600',
    fontFamily: 'Vazirmatn',
  },
  copyResponseButton: {
    position: 'absolute',
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  copyResponseLabel: {
    fontSize: Typography.ui.caption,
    fontFamily: 'Vazirmatn',
  },
  messageText: {
    fontSize: Typography.ui.body,
    lineHeight: 24,
    marginBottom: Spacing.md,
    fontFamily: 'Vazirmatn',
    textAlign: 'center',
  },
  responseCard: {
    borderWidth: 2,
  },
  responseText: {
    fontSize: Typography.ui.body,
    lineHeight: 24,
    marginBottom: Spacing.md,
    fontFamily: 'Vazirmatn',
    textAlign: 'center',
  },
  distressBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.sm,
  },
  distressText: {
    flex: 1,
    fontSize: Typography.ui.caption,
    lineHeight: 20,
    fontFamily: 'Vazirmatn',
    textAlign: 'center',
  },
  reviewerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  reviewerText: {
    fontSize: Typography.ui.caption,
    fontFamily: 'Vazirmatn',
  },
  dateText: {
    fontSize: Typography.ui.caption,
    fontFamily: 'Vazirmatn',
    marginTop: Spacing.sm,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.md,
  },
  infoText: {
    flex: 1,
    fontSize: Typography.ui.body,
    lineHeight: 22,
    fontFamily: 'Vazirmatn',
    textAlign: 'center',
  },
  bottomPadding: {
    height: Spacing.xxl,
  },
});
