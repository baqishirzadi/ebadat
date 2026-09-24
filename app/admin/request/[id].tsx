/**
 * Admin Request Response Screen
 * Allows admin to view request and post response
 */

import React, { useEffect, useState } from 'react';

import { View, StyleSheet, ScrollView, Pressable, ActivityIndicator, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { LocalizedTextInput } from '@/components/ui/LocalizedText';
import { useNavigation, useRouter, useLocalSearchParams } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useApp } from '@/context/AppContext';
import { Typography, Spacing, BorderRadius } from '@/constants/theme';
import { DuaRequest, DUA_CATEGORIES, GENDER_INFO, UserGender } from '@/types/dua';
import { fetchAdminRequestById, updateAdminResponse } from '@/utils/duaAdmin';
import CenteredText from '@/components/CenteredText';
import { MarkdownText } from '@/components/MarkdownText';
import { StatusBadge } from '@/components/dua/StatusBadge';
import { detectLanguage, ensureSignature } from '@/utils/duaAdvisor';
import { fetchHanafiDuaSuggestion } from '@/utils/hanafiDuaSuggestion';
import { RESPONDERS, getResponder, type ResponderId } from '@/constants/responders';
import { formatGregorianDateTimeCompact } from '@/utils/calendarDisplay';
import { toArabicNumerals } from '@/utils/numbers';

export default function AdminRequestResponseScreen() {
  const { theme, state } = useApp();
  const isPashto = state.preferences.appLanguage === 'pashto';
  const router = useRouter();
  const navigation = useNavigation();
  const { id } = useLocalSearchParams<{ id: string }>();

  const handleBack = () => {
    if (navigation.canGoBack()) {
      router.back();
      return;
    }
    router.replace('/admin/dashboard');
  };

  const [request, setRequest] = useState<DuaRequest | null>(null);
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [suggesting, setSuggesting] = useState(false);
  const [reviewerId, setReviewerId] = useState<ResponderId | null>(null);

  useEffect(() => {
    loadRequest();
  }, [id]);

  const loadRequest = async () => {
    if (!id) return;

    try {
      const data = await fetchAdminRequestById(String(id));
      if (!data) {
        throw new Error('Request not found');
      }
      setRequest(data);
      setReviewerId(data.responderId ?? null);
      if (data.response) {
        setResponse(data.response);
      }
    } catch (error) {
      console.error('Failed to load request:', error);
      Alert.alert('خطا', 'در بارگذاری درخواست خطایی رخ داد');
    } finally {
      setLoading(false);
    }
  };

  const handleSuggestResponse = async () => {
    if (!request) return;
    if (!reviewerId) {
      Alert.alert('خطا', 'لطفاً پاسخ‌دهنده را انتخاب کنید');
      return;
    }
    const responder = getResponder(reviewerId);
    if (!responder) return;
    setSuggesting(true);
    try {
      const draft = await fetchHanafiDuaSuggestion(
        request.message,
        (request.gender || 'male') as UserGender,
        reviewerId,
        responder.nameDari,
        state.preferences.appLanguage,
        undefined,
      );
      setResponse(draft);
    } catch (error) {
      console.error('Failed to fetch Hanafi dua suggestion:', error);
      Alert.alert(
        'خطا',
        error instanceof Error && error.message
          ? error.message
          : 'دریافت پاسخ پیشنهادی ممکن نشد. دوباره تلاش کنید.',
      );
    } finally {
      setSuggesting(false);
    }
  };

  const handleSubmitResponse = async () => {
    if (!response.trim() || !reviewerId) {
      Alert.alert('خطا', 'لطفاً پاسخ را وارد کنید');
      return;
    }

    if (!request) return;

    setSubmitting(true);
    try {
      const language = detectLanguage(request.message);
      const gender = (request.gender || 'male') as UserGender;
      const reviewer = getResponder(reviewerId);
      if (!reviewer) return;
      const finalResponse = ensureSignature(response.trim(), gender, language, reviewer.nameDari);
      await updateAdminResponse({
        id: request.id,
        response: finalResponse,
        reviewerId: reviewer.id,
        reviewerName: reviewer.nameDari,
      });

      // Notification will be sent automatically by Edge Function when record is updated
      // If Edge Functions are not deployed, notification will be sent via client-side fallback
      console.log('Response saved. Notification will be sent via Edge Function.');

      Alert.alert('موفق', 'پاسخ با موفقیت ثبت شد و به کاربر اطلاع داده شد', [
        { text: 'باشه', onPress: handleBack },
      ]);
    } catch (error) {
      console.error('Failed to submit response:', error);
      const message =
        error instanceof Error && error.message
          ? error.message
          : 'در ثبت پاسخ خطایی رخ داد';
      Alert.alert('خطا', message);
    } finally {
      setSubmitting(false);
    }
  };

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
          <CenteredText style={styles.headerTitle}>پاسخ به درخواست</CenteredText>
          <View style={styles.headerRight} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.tint} />
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
          <CenteredText style={styles.headerTitle}>پاسخ به درخواست</CenteredText>
          <View style={styles.headerRight} />
        </View>
        <View style={styles.emptyContainer}>
          <CenteredText style={[styles.emptyText, { color: theme.text }]}>
            درخواست یافت نشد
          </CenteredText>
        </View>
      </View>
    );
  }

  const category = DUA_CATEGORIES.find((c) => c.id === request.category);
  const genderLabel = request.gender ? GENDER_INFO[request.gender].nameDari : 'نامشخص';

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.surahHeader }]}>
        <Pressable onPress={handleBack} style={styles.backButton}>
          <MaterialIcons name="arrow-forward" size={24} color="#fff" />
        </Pressable>
        <CenteredText style={styles.headerTitle}>پاسخ به درخواست</CenteredText>
        <View style={styles.headerRight} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Request Info */}
        <View style={styles.metaRow}>
          <StatusBadge status={request.status} />
          <View style={styles.categoryBadge}>
            <MaterialIcons name={category?.icon as any || 'help'} size={16} color={theme.tint} />
            <CenteredText style={[styles.categoryText, { color: theme.tint }]}>
              {category?.nameDari || 'نامشخص'}
            </CenteredText>
          </View>
        </View>
        <View style={styles.metaRow}>
          <View style={[styles.metaChip, { backgroundColor: theme.backgroundSecondary }]}>
            <MaterialIcons name="person" size={14} color={theme.textSecondary} />
            <CenteredText style={[styles.metaText, { color: theme.textSecondary }]}>
              {`جنسیت: ${genderLabel}`}
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
              متن درخواست متقاضی
            </CenteredText>
          </View>
          <MarkdownText style={[styles.messageText, { color: theme.text }]} boldStyle={{ color: theme.text }}>
            {request.message}
          </MarkdownText>
          <CenteredText style={[styles.dateText, { color: theme.textSecondary }]}>
            {formatDate(request.createdAt)}
          </CenteredText>
        </View>

        {/* Response Input */}
        <View style={styles.section}>
          <CenteredText style={[styles.sectionTitle, { color: theme.text }]}>
            پاسخ
          </CenteredText>
          <View style={styles.actionRow}>
            <Pressable
              onPress={handleSuggestResponse}
              disabled={suggesting || !request}
              style={({ pressed }) => [
                styles.actionButton,
                { backgroundColor: theme.backgroundSecondary, borderColor: theme.cardBorder },
                pressed && styles.buttonPressed,
                (suggesting || !request) && { opacity: 0.6 },
              ]}
            >
              {suggesting ? (
                <ActivityIndicator size="small" color={theme.tint} />
              ) : (
                <MaterialIcons name="auto-awesome" size={18} color={theme.tint} />
              )}
              <CenteredText style={[styles.actionText, { color: theme.text }]}>
                {suggesting ? 'در حال پیشنهاد…' : 'پاسخ پیشنهادی'}
              </CenteredText>
            </Pressable>
            <Pressable
              onPress={() => {
                if (!reviewerId) {
                  Alert.alert('خطا', 'لطفاً پاسخ‌دهنده را انتخاب کنید');
                  return;
                }
                const lang = detectLanguage(request.message);
                const responder = getResponder(reviewerId);
                if (!responder) return;
                const updated = ensureSignature(response || '', request.gender || 'male', lang, responder.nameDari);
                setResponse(updated);
              }}
              style={({ pressed }) => [
                styles.actionButton,
                { backgroundColor: theme.backgroundSecondary, borderColor: theme.cardBorder },
                pressed && styles.buttonPressed,
              ]}
            >
              <MaterialIcons name="edit" size={18} color={theme.tint} />
              <CenteredText style={[styles.actionText, { color: theme.text }]}>
                افزودن امضاء
              </CenteredText>
            </Pressable>
          </View>
          <View style={[styles.inputContainer, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
            <LocalizedTextInput
              style={[styles.textInput, { color: theme.text }]}
              placeholder="پاسخ خود را بنویسید..."
              placeholderTextColor={theme.textSecondary}
              value={response}
              onChangeText={setResponse}
              multiline
              numberOfLines={10}
              textAlignVertical="top"
              textAlign="center"
            />
          </View>
          <CenteredText style={[styles.sectionTitle, { color: theme.text, marginTop: Spacing.md }]}>
            پاسخ‌دهنده
          </CenteredText>
          <View style={styles.responderRow}>
            {RESPONDERS.map((responder) => {
              const selected = reviewerId === responder.id;
              return (
                <Pressable
                  key={responder.id}
                  onPress={() => setReviewerId(responder.id)}
                  style={({ pressed }) => [
                    styles.responderChip,
                    {
                      backgroundColor: selected ? `${theme.tint}18` : theme.backgroundSecondary,
                      borderColor: selected ? theme.tint : theme.cardBorder,
                    },
                    pressed && styles.buttonPressed,
                  ]}
                >
                  <CenteredText style={[styles.actionText, { color: selected ? theme.tint : theme.text }]}>
                    {responder.nameDari}
                  </CenteredText>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Submit Button */}
        <Pressable
          onPress={handleSubmitResponse}
          disabled={submitting || !response.trim() || !reviewerId}
          style={({ pressed }) => [
            styles.submitButton,
            {
              backgroundColor: submitting || !response.trim() || !reviewerId ? theme.cardBorder : theme.tint,
            },
            pressed && styles.buttonPressed,
          ]}
        >
          {submitting ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <MaterialIcons name="send" size={20} color="#fff" />
              <CenteredText style={styles.submitButtonText}>ثبت پاسخ</CenteredText>
            </>
          )}
        </Pressable>

        <View style={styles.bottomPadding} />
      </ScrollView>
    </KeyboardAvoidingView>
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  emptyText: {
    fontSize: Typography.ui.subtitle,
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
    marginBottom: Spacing.lg,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  cardTitle: {
    fontSize: Typography.ui.subtitle,
    fontWeight: '600',
    fontFamily: 'Vazirmatn',
  },
  messageText: {
    fontSize: Typography.ui.body,
    lineHeight: 24,
    marginBottom: Spacing.md,
    fontFamily: 'Vazirmatn',
    textAlign: 'center',
  },
  dateText: {
    fontSize: Typography.ui.caption,
    fontFamily: 'Vazirmatn',
    marginTop: Spacing.sm,
  },
  section: {
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    fontSize: Typography.ui.subtitle,
    fontWeight: '600',
    marginBottom: Spacing.md,
    fontFamily: 'Vazirmatn',
  },
  actionRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  actionText: {
    fontSize: Typography.ui.caption,
    fontWeight: '600',
    fontFamily: 'Vazirmatn',
  },
  responderRow: {
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  responderChip: {
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
  inputContainer: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.md,
  },
  textInput: {
    fontSize: Typography.ui.body,
    fontFamily: 'Vazirmatn',
    minHeight: 200,
    textAlign: 'center',
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    marginTop: Spacing.md,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: Typography.ui.body,
    fontWeight: '600',
    fontFamily: 'Vazirmatn',
  },
  buttonPressed: {
    opacity: 0.8,
  },
  bottomPadding: {
    height: Spacing.xxl,
  },
});
