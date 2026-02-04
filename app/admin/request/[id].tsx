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
import { DuaRequest, DUA_CATEGORIES } from '@/types/dua';
import { getSupabaseClient, isSupabaseConfigured } from '@/utils/supabase';
import CenteredText from '@/components/CenteredText';
import { StatusBadge } from '@/components/dua/StatusBadge';

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
    if (!id || !isSupabaseConfigured()) return;

    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('dua_requests')
        .select('*')
        .eq('id', id)
        .single();

      if (error || !data) {
        throw error || new Error('Request not found');
      }

      const requestData: DuaRequest = {
        id: data.id,
        userId: data.user_id,
        category: data.category,
        message: data.message,
        isAnonymous: data.is_anonymous || false,
        status: data.status || 'pending',
        createdAt: data.created_at ? new Date(data.created_at) : new Date(),
        answeredAt: data.answered_at ? new Date(data.answered_at) : undefined,
        response: data.response || undefined,
        reviewerId: data.reviewer_id || undefined,
        reviewerName: data.reviewer_name || undefined,
      };

      setRequest(requestData);
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

    if (!request || !isSupabaseConfigured()) return;

    setSubmitting(true);
    try {
      const supabase = getSupabaseClient();
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      
      if (!currentUser) {
        Alert.alert('خطا', 'لطفاً دوباره وارد شوید');
        router.replace('/admin/login');
        return;
      }

      // Get reviewer name (you can fetch from admin_users collection)
      const reviewerName = 'سیدعبدالباقی شیرزادی'; // Default, can be fetched from user profile

      const { error: updateError } = await supabase
        .from('dua_requests')
        .update({
          status: 'answered',
          response: response.trim(),
          reviewer_id: currentUser.id,
          reviewer_name: reviewerName,
          answered_at: new Date().toISOString(),
        })
        .eq('id', request.id);

      if (updateError) {
        throw updateError;
      }

      // Notification will be sent automatically by Edge Function when record is updated
      // If Edge Functions are not deployed, notification will be sent via client-side fallback
      console.log('Response saved. Notification will be sent via Edge Function.');

      Alert.alert('موفق', 'پاسخ با موفقیت ثبت شد و به کاربر اطلاع داده شد', [
        { text: 'باشه', onPress: () => router.back() },
      ]);
    } catch (error) {
      console.error('Failed to submit response:', error);
      Alert.alert('خطا', 'در ثبت پاسخ خطایی رخ داد');
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

        {/* Request Message */}
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
          <View style={styles.cardHeader}>
            <MaterialIcons name="message" size={20} color={theme.tint} />
            <CenteredText style={[styles.cardTitle, { color: theme.text }]}>
              متن درخواست
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
              textAlign="right"
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
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
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
    textAlign: 'right',
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
  inputContainer: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.md,
  },
  textInput: {
    fontSize: Typography.ui.body,
    fontFamily: 'Vazirmatn',
    minHeight: 200,
    textAlign: 'right',
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
