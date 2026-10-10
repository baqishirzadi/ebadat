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
import { DUA_CATEGORIES, DuaRequest, STATUS_INFO } from '@/types/dua';
import { MaterialIcons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useFocusEffect, useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { formatGregorianDateTimeCompact } from '@/utils/calendarDisplay';
import { toArabicNumerals } from '@/utils/numbers';
import { pickContent } from '@/utils/i18n/content';
import { backIconName, directionStyle } from '@/utils/i18n/direction';
import { LocalizedText } from '@/components/ui/LocalizedText';
import { CopiedNotice, useCopiedNotice } from '@/components/ui/CopiedNotice';
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
  const { theme } = useApp();
  const { t, language, isLatin } = useI18n();
  const { copiedVisible, showCopied } = useCopiedNotice();
  const isPashto = language === 'pashto';
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
      showCopied();
    } catch {
      Alert.alert(t('common.error'), t('dua.detail.copyFailure'));
    }
  }, [showCopied, t]);

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
    return formatGregorianDateTimeCompact(
      date,
      isLatin ? String : toArabicNumerals,
      language === 'turkish' ? 'tr-TR' : language === 'english' ? 'en-US' : language === 'arabic' ? 'ar' : isPashto ? 'ps-AF' : 'fa-AF',
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={[styles.header, { backgroundColor: theme.surahHeader }]}>
          <Pressable onPress={handleBack} style={styles.backButton}>
            <MaterialIcons name={backIconName(language)} size={24} color="#fff" />
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
            <MaterialIcons name={backIconName(language)} size={24} color="#fff" />
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
    ? t(request.gender === 'male' ? 'dua.gender.male' : request.gender === 'female' ? 'dua.gender.female' : 'dua.gender.unknown')
    : t('dua.gender.unknown');
  const responder = request.responderId ? getResponder(request.responderId) : null;
  const responderName = responder
    ? pickContent(responder, 'name', language)
    : request.responderName || '';
  const senderName = responderName || request.reviewerName || '';
  const direction = directionStyle(language);
  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.surahHeader }]}>
        <Pressable onPress={handleBack} style={styles.backButton}>
          <MaterialIcons name={backIconName(language)} size={24} color="#fff" />
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
              {category ? pickContent(category, 'name', language) : t('dua.gender.unknown')}
            </CenteredText>
          </View>
        </View>
        {request.responderId && (
          <View style={styles.metaRow}>
            <View style={[styles.metaChip, { backgroundColor: theme.backgroundSecondary }]}>
              <MaterialIcons name="person-outline" size={14} color={theme.textSecondary} />
              <CenteredText style={[styles.metaText, { color: theme.textSecondary }]}>
                {t('dua.detail.responder', { name: responderName })}
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
          <View testID="dua-reply-bubble" style={[styles.replyThread, direction]}>
            <View style={[styles.replyAvatar, { backgroundColor: theme.tint }]}>
              <MaterialIcons name="person" size={20} color={theme.onTint} />
            </View>
            <View
              style={[
                styles.replyBubble,
                { backgroundColor: theme.card, borderColor: `${statusInfo.color}55` },
              ]}
            >
              <View style={[styles.replyHeader, direction]}>
                <View style={styles.replyHeaderText}>
                  <LocalizedText style={[styles.replySender, styles.replyRtl, { color: theme.tint }]} numberOfLines={1}>
                    {senderName || t('dua.detail.response')}
                  </LocalizedText>
                  {request.reviewerName && request.reviewerName !== senderName ? (
                    <LocalizedText style={[styles.replyMeta, styles.replyRtl, { color: theme.textSecondary }]} numberOfLines={1}>
                      {t('dua.detail.responderLabel', { name: request.reviewerName })}
                    </LocalizedText>
                  ) : null}
                </View>
                <Pressable
                  testID="dua-copy-response"
                  accessibilityRole="button"
                  accessibilityLabel={t('dua.detail.copy')}
                  onPress={() => void handleCopyResponse(request.response!)}
                  hitSlop={8}
                  style={({ pressed }) => [styles.copyResponseButton, direction, pressed && styles.pressed]}
                >
                  <MaterialIcons name="content-copy" size={16} color={theme.textSecondary} />
                  <CenteredText style={[styles.copyResponseLabel, { color: theme.textSecondary }]}>{t('dua.detail.copy')}</CenteredText>
                </Pressable>
              </View>
              <MarkdownText
                style={[styles.responseText, styles.replyRtl, { color: theme.text }]}
                boldStyle={{ color: theme.text }}
              >
                {request.response}
              </MarkdownText>
              {/0787506666|لنگر/.test(request.response) ? (
                <View style={[styles.distressBox, direction, { backgroundColor: theme.backgroundSecondary }]}>
                  <MaterialIcons name="phone-in-talk" size={18} color={theme.tint} />
                  <CenteredText style={[styles.distressText, { color: theme.textSecondary }]}>
                    {t('dua.detail.distress')}
                  </CenteredText>
                </View>
              ) : null}
              {request.answeredAt ? (
                <View style={[styles.replyFooter, direction]}>
                  <MaterialIcons name="done-all" size={15} color={statusInfo.color} />
                  <LocalizedText style={[styles.replyTime, styles.replyRtl, { color: theme.textSecondary }]}>
                    {formatDate(request.answeredAt)}
                  </LocalizedText>
                </View>
              ) : null}
            </View>
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
      <CopiedNotice visible={copiedVisible} label={t('common.copy')} />
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2,
  },
  pressed: {
    opacity: 0.6,
  },
  replyThread: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  replyAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  replyBubble: {
    flex: 1,
    minWidth: 0,
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    borderBottomStartRadius: 4,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.xs,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  replyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  replyHeaderText: {
    flex: 1,
    minWidth: 0,
  },
  replySender: {
    fontSize: Typography.ui.body,
    fontFamily: 'Vazirmatn-Bold',
  },
  replyMeta: {
    fontSize: Typography.ui.caption,
    fontFamily: 'Vazirmatn',
  },
  replyFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
    marginTop: 2,
  },
  replyTime: {
    fontSize: 12,
    fontFamily: 'Vazirmatn',
  },
  // Responders always write in Dari or Pashto, whatever the reader's app language.
  // Natural alignment follows the RTL base direction; an explicit 'right' is
  // mirrored to the left by iOS inside RTL layouts.
  replyRtl: {
    textAlign: 'auto',
    writingDirection: 'rtl',
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
  responseText: {
    fontSize: Typography.ui.body,
    lineHeight: 26,
    marginBottom: Spacing.xs,
    fontFamily: 'Vazirmatn',
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
