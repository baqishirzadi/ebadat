/**
 * Admin Dashboard
 * List all requests for review
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  TextInput,
  Pressable,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useApp } from '@/context/AppContext';
import { Typography, Spacing, BorderRadius } from '@/constants/theme';
import { DuaRequest, RequestStatus, STATUS_INFO } from '@/types/dua';
import { getSupabaseClient, isSupabaseConfigured } from '@/utils/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import CenteredText from '@/components/CenteredText';
import { RequestCard } from '@/components/dua/RequestCard';
import NetInfo from '@react-native-community/netinfo';

const ADMIN_STORAGE_KEY = '@ebadat/admin_session';

export default function AdminDashboardScreen() {
  const { theme } = useApp();
  const router = useRouter();

  const [requests, setRequests] = useState<DuaRequest[]>([]);
  const [filteredRequests, setFilteredRequests] = useState<DuaRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState<RequestStatus | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const pendingCount = requests.filter(r => r.status === 'pending').length;
  const answeredCount = requests.filter(r => r.status === 'answered').length;
  const closedCount = requests.filter(r => r.status === 'closed').length;

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (isSupabaseConfigured()) {
      loadRequests();
    }
  }, [statusFilter]);

  useEffect(() => {
    filterRequests();
  }, [requests, statusFilter, searchQuery]);

  const checkAuth = async () => {
    try {
      const sessionRaw = await AsyncStorage.getItem(ADMIN_STORAGE_KEY);
      if (!sessionRaw) {
        router.replace('/admin/login');
        return;
      }
      const session = JSON.parse(sessionRaw);
      if (!session?.pinVerified) {
        router.replace('/admin/login');
      }
    } catch (error) {
      router.replace('/admin/login');
    }
  };

  const loadRequests = async () => {
    if (!isSupabaseConfigured()) {
      setErrorMessage('Supabase تنظیم نشده است. لطفاً تنظیمات را بررسی کنید.');
      setLoading(false);
      return;
    }

    try {
      const netInfo = await NetInfo.fetch();
      if (!netInfo.isConnected || netInfo.isInternetReachable === false) {
        setErrorMessage('اتصال اینترنت موجود نیست');
        setLoading(false);
        return;
      }

      setErrorMessage(null);
      const supabase = getSupabaseClient();
      let query = supabase
        .from('dua_requests')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      const loadedRequests: DuaRequest[] = (data || []).map((row: any) => ({
        id: row.id,
        userId: row.user_id,
        category: row.category,
        message: row.message,
        gender: row.gender || 'unspecified',
        isAnonymous: row.is_anonymous || false,
        status: row.status || 'pending',
        createdAt: row.created_at ? new Date(row.created_at) : new Date(),
        answeredAt: row.answered_at ? new Date(row.answered_at) : undefined,
        response: row.response || undefined,
        reviewerId: row.reviewer_id || undefined,
        reviewerName: row.reviewer_name || undefined,
      }));

      setRequests(loadedRequests);
    } catch (error) {
      const message =
        error instanceof Error && /network request failed|failed to fetch/i.test(error.message)
          ? 'خطا در اتصال به سرور. لطفاً اینترنت را بررسی کنید.'
          : 'خطا در بارگذاری درخواست‌ها';
      setErrorMessage(message);
      if (__DEV__) {
        console.warn('Failed to load requests:', error);
      }
    } finally {
      setLoading(false);
    }
  };

  const filterRequests = () => {
    let filtered = requests;

    if (statusFilter !== 'all') {
      filtered = filtered.filter((r) => r.status === statusFilter);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.trim().toLowerCase();
      filtered = filtered.filter(
        (r) =>
          r.message.toLowerCase().includes(query) ||
          r.response?.toLowerCase().includes(query)
      );
    }

    setFilteredRequests(filtered);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadRequests();
    setRefreshing(false);
  };

  const handleLogout = async () => {
    try {
      await AsyncStorage.removeItem(ADMIN_STORAGE_KEY);
      router.replace('/admin/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const renderRequest = ({ item }: { item: DuaRequest }) => (
    <Pressable onPress={() => router.push(`/admin/request/${item.id}`)}>
      <RequestCard request={item} />
    </Pressable>
  );

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={[styles.header, { backgroundColor: theme.surahHeader }]}>
          <View style={styles.headerCenter}>
            <CenteredText style={styles.headerTitle}>پنل مدیریت</CenteredText>
            <CenteredText style={styles.headerSubtitle}>درخواست‌های دعای خیر و مشورت شرعی</CenteredText>
          </View>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.tint} />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.surahHeader }]}>
        <Pressable onPress={handleLogout} style={styles.logoutButton}>
          <MaterialIcons name="logout" size={24} color="#fff" />
        </Pressable>
        <View style={styles.headerCenter}>
          <CenteredText style={styles.headerTitle}>پنل مدیریت</CenteredText>
          <CenteredText style={styles.headerSubtitle}>درخواست‌های دعای خیر و مشورت شرعی</CenteredText>
        </View>
        <View style={styles.headerRight} />
      </View>

      {errorMessage && (
        <View style={[styles.errorBanner, { backgroundColor: theme.backgroundSecondary }]}>
          <MaterialIcons name="error-outline" size={18} color={theme.textSecondary} />
          <CenteredText style={[styles.errorText, { color: theme.textSecondary }]}>
            {errorMessage}
          </CenteredText>
        </View>
      )}

      {/* Summary */}
      <View style={styles.summaryRow}>
        <View style={[styles.summaryChip, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
          <CenteredText style={[styles.summaryValue, { color: theme.text }]}>
            {pendingCount}
          </CenteredText>
          <CenteredText style={[styles.summaryLabel, { color: theme.textSecondary }]}>در انتظار</CenteredText>
        </View>
        <View style={[styles.summaryChip, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
          <CenteredText style={[styles.summaryValue, { color: theme.text }]}>
            {answeredCount}
          </CenteredText>
          <CenteredText style={[styles.summaryLabel, { color: theme.textSecondary }]}>پاسخ‌داده‌شده</CenteredText>
        </View>
        <View style={[styles.summaryChip, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
          <CenteredText style={[styles.summaryValue, { color: theme.text }]}>
            {closedCount}
          </CenteredText>
          <CenteredText style={[styles.summaryLabel, { color: theme.textSecondary }]}>بسته‌شده</CenteredText>
        </View>
      </View>

      {/* Search */}
      <View style={[styles.searchContainer, { backgroundColor: theme.backgroundSecondary }]}>
        <MaterialIcons name="search" size={20} color={theme.icon} />
        <TextInput
          style={[styles.searchInput, { color: theme.text }]}
          placeholder="جستجوی متن درخواست..."
          placeholderTextColor={theme.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
          textAlign="right"
        />
        {searchQuery.length > 0 && (
          <Pressable onPress={() => setSearchQuery('')}>
            <MaterialIcons name="close" size={20} color={theme.icon} />
          </Pressable>
        )}
      </View>

      {/* Status Filters */}
      <View style={styles.filtersContainer}>
        {(['all', 'pending', 'answered', 'closed'] as const).map((status) => {
          const isSelected = statusFilter === status;
          const statusLabel =
            status === 'all'
              ? 'همه'
              : STATUS_INFO[status as RequestStatus].nameDari;

          return (
            <Pressable
              key={status}
              onPress={() => setStatusFilter(status)}
              style={({ pressed }) => [
                styles.filterButton,
                {
                  backgroundColor: isSelected ? theme.tint : theme.card,
                  borderColor: isSelected ? theme.tint : theme.cardBorder,
                },
                pressed && styles.buttonPressed,
              ]}
            >
              <CenteredText
                style={[
                  styles.filterText,
                  { color: isSelected ? '#fff' : theme.text },
                ]}
              >
                {statusLabel}
              </CenteredText>
            </Pressable>
          );
        })}
      </View>

      {/* Requests List */}
      <FlatList
        data={filteredRequests}
        keyExtractor={(item) => item.id}
        renderItem={renderRequest}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={theme.tint}
            colors={[theme.tint]}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <MaterialIcons name="inbox" size={64} color={theme.textSecondary} />
            <CenteredText style={[styles.emptyText, { color: theme.text }]}>
              درخواستی ثبت نشده است
            </CenteredText>
            <CenteredText style={[styles.emptySubtext, { color: theme.textSecondary }]}>
              در صورت وجود درخواست جدید، اینجا نمایش داده می‌شود
            </CenteredText>
          </View>
        }
        showsVerticalScrollIndicator={false}
      />
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
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  logoutButton: {
    padding: Spacing.xs,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    fontFamily: 'Vazirmatn',
  },
  headerSubtitle: {
    fontSize: Typography.ui.caption,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
    fontFamily: 'Vazirmatn',
  },
  headerRight: {
    width: 40,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginHorizontal: Spacing.md,
    marginTop: Spacing.sm,
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  errorText: {
    fontSize: Typography.ui.caption,
    fontFamily: 'Vazirmatn',
  },
  summaryRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginHorizontal: Spacing.md,
    marginTop: Spacing.md,
  },
  summaryChip: {
    flex: 1,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: Typography.ui.subtitle,
    fontWeight: '700',
    fontFamily: 'Vazirmatn',
  },
  summaryLabel: {
    fontSize: Typography.ui.caption,
    marginTop: 2,
    fontFamily: 'Vazirmatn',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    marginHorizontal: Spacing.md,
    marginTop: Spacing.md,
    borderRadius: BorderRadius.lg,
  },
  searchInput: {
    flex: 1,
    fontSize: Typography.ui.body,
    fontFamily: 'Vazirmatn',
  },
  filtersContainer: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  filterButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  filterText: {
    fontSize: Typography.ui.caption,
    fontWeight: '600',
    fontFamily: 'Vazirmatn',
  },
  buttonPressed: {
    opacity: 0.8,
  },
  listContent: {
    padding: Spacing.md,
    paddingBottom: 100,
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
    marginTop: Spacing.md,
    fontFamily: 'Vazirmatn',
  },
  emptySubtext: {
    fontSize: Typography.ui.caption,
    marginTop: Spacing.sm,
    fontFamily: 'Vazirmatn',
    textAlign: 'center',
  },
});
