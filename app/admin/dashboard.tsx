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
      const session = await AsyncStorage.getItem(ADMIN_STORAGE_KEY);
      if (!session) {
        router.replace('/admin/login');
        return;
      }
    } catch (error) {
      router.replace('/admin/login');
    }
  };

  const loadRequests = async () => {
    if (!isSupabaseConfigured()) {
      setLoading(false);
      return;
    }

    try {
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
      console.error('Failed to load requests:', error);
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
      const supabase = getSupabaseClient();
      await supabase.auth.signOut();
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
          <CenteredText style={styles.headerTitle}>پنل مدیریت</CenteredText>
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
        <CenteredText style={styles.headerTitle}>پنل مدیریت</CenteredText>
        <View style={styles.headerRight} />
      </View>

      {/* Search */}
      <View style={[styles.searchContainer, { backgroundColor: theme.backgroundSecondary }]}>
        <MaterialIcons name="search" size={20} color={theme.icon} />
        <TextInput
          style={[styles.searchInput, { color: theme.text }]}
          placeholder="جستجوی درخواست..."
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
              درخواستی یافت نشد
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
  logoutButton: {
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
    flexDirection: 'row',
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
});
