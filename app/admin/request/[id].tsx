/**
 * Admin Request Response Screen
 * Allows admin to view request and post response
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useApp } from '@/context/AppContext';
import { Typography, Spacing, BorderRadius } from '@/constants/theme';
import { DuaRequest, DUA_CATEGORIES, GENDER_INFO, UserGender } from '@/types/dua';
import { fetchAdminRequestById, updateAdminResponse } from '@/utils/duaAdmin';
import CenteredText from '@/components/CenteredText';
import { StatusBadge } from '@/components/dua/StatusBadge';
import { buildDuaResponse, detectLanguage, ensureSignature } from '@/utils/duaAdvisor';

export default function AdminRequestResponseScreen() {
  const { theme } = useApp();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [request, setRequest] = useState<DuaRequest | null>(null);
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

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

  const handleSubmitResponse = async () => {
    if (!response.trim()) {
      Alert.alert('خطا', 'لطفاً پاسخ را وارد کنید');
      return;
    }

    if (!request) return;

    setSubmitting(true);
    try {
      const language = detectLanguage(request.message);
      const gender = (request.gender || 'male') as UserGender;
      const finalResponse = ensureSignature(response.trim(), gender, language);
      await updateAdminResponse({
        id: request.id,
        response: finalResponse,
        reviewerName: 'سیدعبدالباقی شیرزادی',
      });

      // Notification will be sent automatically by Edge Function when record is updated
      // If Edge Functions are not deployed, notification will be sent via client-side fallback
      console.log('Response saved. Notification will be sent via Edge Function.');

      Alert.alert('موفق', 'پاسخ با موفقیت ثبت شد و به کاربر اطلاع داده شد', [
        { text: 'باشه', onPress: () => router.back() },
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
    return date.toLocaleDateString('fa-AF', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={[styles.header, { backgroundColor: theme.surahHeader }]}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
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
          <Pressable onPress={() => router.back()} style={styles.backButton}>
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
        <Pressable onPress={() => router.back()} style={styles.backButton}>
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
          <CenteredText style={[styles.messageText, { color: theme.text }]}>
            {request.message}
          </CenteredText>
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
              onPress={() => {
                const draft = buildDuaResponse({
                  message: request.message,
                  category: request.category,
                  gender: request.gender || 'male',
                });
                setResponse(draft);
              }}
              style={({ pressed }) => [
                styles.actionButton,
                { backgroundColor: theme.backgroundSecondary, borderColor: theme.cardBorder },
                pressed && styles.buttonPressed,
              ]}
            >
              <MaterialIcons name="auto-awesome" size={18} color={theme.tint} />
              <CenteredText style={[styles.actionText, { color: theme.text }]}>
                پاسخ پیشنهادی
              </CenteredText>
            </Pressable>
            <Pressable
              onPress={() => {
                const lang = detectLanguage(request.message);
                const updated = ensureSignature(response || '', request.gender || 'male', lang);
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
            <TextInput
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
        </View>

        {/* Submit Button */}
        <Pressable
          onPress={handleSubmitResponse}
          disabled={submitting || !response.trim()}
          style={({ pressed }) => [
            styles.submitButton,
            {
              backgroundColor: submitting || !response.trim() ? theme.cardBorder : theme.tint,
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
