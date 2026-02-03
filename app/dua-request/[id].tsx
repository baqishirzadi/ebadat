/**
 * Dua Request Detail Screen
 * Shows request details and response (if answered)
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Pressable,
  RefreshControl,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useApp } from '@/context/AppContext';
import { useDua } from '@/context/DuaContext';
import { Typography, Spacing, BorderRadius } from '@/constants/theme';
import { DuaRequest, DUA_CATEGORIES, STATUS_INFO } from '@/types/dua';
import { StatusBadge } from '@/components/dua/StatusBadge';
import CenteredText from '@/components/CenteredText';

export default function DuaRequestDetailScreen() {
  const { theme } = useApp();
  const { getRequestById, refreshRequests } = useDua();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [request, setRequest] = useState<DuaRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadRequest();
  }, [id]);

  const loadRequest = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await getRequestById(id);
      setRequest(data);
    } catch (error) {
      console.error('Failed to load request:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshRequests();
    await loadRequest();
    setRefreshing(false);
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
          <CenteredText style={styles.headerTitle}>جزئیات درخواست</CenteredText>
          <View style={styles.headerRight} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.tint} />
          <CenteredText style={[styles.loadingText, { color: theme.textSecondary }]}>
            در حال بارگذاری...
          </CenteredText>
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
          <CenteredText style={styles.headerTitle}>جزئیات درخواست</CenteredText>
          <View style={styles.headerRight} />
        </View>
        <View style={styles.emptyContainer}>
          <MaterialIcons name="error-outline" size={64} color={theme.textSecondary} />
          <CenteredText style={[styles.emptyText, { color: theme.text }]}>
            درخواست یافت نشد
          </CenteredText>
        </View>
      </View>
    );
  }

  const category = DUA_CATEGORIES.find((c) => c.id === request.category);
  const statusInfo = STATUS_INFO[request.status];

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.surahHeader }]}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <MaterialIcons name="arrow-forward" size={24} color="#fff" />
        </Pressable>
        <CenteredText style={styles.headerTitle}>جزئیات درخواست</CenteredText>
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

        {/* Response (if answered) */}
        {request.status === 'answered' && request.response && (
          <View style={[styles.card, styles.responseCard, { backgroundColor: `${statusInfo.color}15`, borderColor: statusInfo.color }]}>
            <View style={styles.cardHeader}>
              <MaterialIcons name="check-circle" size={20} color={statusInfo.color} />
              <CenteredText style={[styles.cardTitle, { color: theme.text }]}>
                پاسخ
              </CenteredText>
            </View>
            <CenteredText style={[styles.responseText, { color: theme.text }]}>
              {request.response}
            </CenteredText>
            {request.reviewerName && (
              <View style={styles.reviewerInfo}>
                <MaterialIcons name="person" size={16} color={theme.textSecondary} />
                <CenteredText style={[styles.reviewerText, { color: theme.textSecondary }]}>
                  پاسخ توسط: {request.reviewerName}
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
              درخواست شما در حال بررسی است. پاسخ شما از طریق اعلان اطلاع‌رسانی خواهد شد.
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
    marginBottom: Spacing.md,
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
  responseCard: {
    borderWidth: 2,
  },
  responseText: {
    fontSize: Typography.ui.body,
    lineHeight: 24,
    marginBottom: Spacing.md,
    fontFamily: 'Vazirmatn',
    textAlign: 'right',
  },
  reviewerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
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
    textAlign: 'right',
  },
  bottomPadding: {
    height: Spacing.xxl,
  },
});
