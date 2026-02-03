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
import { getFirestoreDB, isFirebaseConfigured } from '@/utils/firebase';
import {
  collection,
  getDocs,
  query,
  orderBy,
  where,
  limit,
} from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getFirebaseAuth, signOut } from 'firebase/auth';
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
    if (isFirebaseConfigured()) {
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
    if (!isFirebaseConfigured()) {
      setLoading(false);
      return;
    }

    try {
      const db = getFirestoreDB();
      let q = query(
        collection(db, 'dua_requests'),
        orderBy('createdAt', 'desc'),
        limit(100)
      );

      if (statusFilter !== 'all') {
        q = query(q, where('status', '==', statusFilter));
      }

      const snapshot = await getDocs(q);
      const loadedRequests: DuaRequest[] = [];

      snapshot.forEach((doc) => {
        const data = doc.data();
        loadedRequests.push({
          id: doc.id,
          userId: data.userId,
          category: data.category,
          message: data.message,
          isAnonymous: data.isAnonymous || false,
          status: data.status || 'pending',
          createdAt: data.createdAt?.toDate() || new Date(),
          answeredAt: data.answeredAt?.toDate(),
          response: data.response,
          reviewerId: data.reviewerId,
          reviewerName: data.reviewerName,
        });
      });

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
      const auth = getFirebaseAuth();
      await signOut(auth);
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
