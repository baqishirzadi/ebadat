/**
 * My Dua Requests Screen
 * Lists all user's requests
 */

import React, { useEffect } from 'react';
import { View, StyleSheet, FlatList, ActivityIndicator, Pressable, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useApp } from '@/context/AppContext';
import { useDua } from '@/context/DuaContext';
import { Typography, Spacing, BorderRadius } from '@/constants/theme';
import { RequestCard } from '@/components/dua/RequestCard';
import CenteredText from '@/components/CenteredText';

export default function DuaRequestsScreen() {
  const { theme } = useApp();
  const { state, refreshRequests, syncPending } = useDua();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = React.useState(false);

  useEffect(() => {
    refreshRequests();
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await syncPending();
    await refreshRequests();
    setRefreshing(false);
  };

  const renderRequest = ({ item }: { item: any }) => <RequestCard request={item} />;

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <MaterialIcons name="inbox" size={64} color={theme.textSecondary} />
      <CenteredText style={[styles.emptyTitle, { color: theme.text }]}>
        درخواستی وجود ندارد
      </CenteredText>
      <CenteredText style={[styles.emptyText, { color: theme.textSecondary }]}>
        برای درخواست دعای خیر یا مشورت شرعی، دکمه زیر را بزنید
      </CenteredText>
      <Pressable
        onPress={() => router.push('/dua-request/new')}
        style={({ pressed }) => [
          styles.newButton,
          { backgroundColor: theme.tint },
          pressed && styles.buttonPressed,
        ]}
      >
        <MaterialIcons name="add" size={20} color="#fff" />
        <CenteredText style={styles.newButtonText}>درخواست جدید</CenteredText>
      </Pressable>
    </View>
  );

  if (state.isLoading && state.requests.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.header}>
          <CenteredText style={[styles.headerTitle, { color: theme.text }]}>
            دعای خیر و مشورت شرعی
          </CenteredText>
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

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.surahHeader }]}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <MaterialIcons name="arrow-forward" size={24} color="#fff" />
        </Pressable>
        <View pointerEvents="none" style={styles.headerTitleContainer}>
          <CenteredText style={styles.headerTitle}>دعای خیر و مشورت شرعی</CenteredText>
        </View>
        <Pressable
          onPress={() => router.push('/dua-request/new')}
          style={styles.newButtonHeader}
        >
          <MaterialIcons name="add" size={24} color="#fff" />
        </Pressable>
      </View>

      {/* Description */}
      <View style={[styles.description, { backgroundColor: theme.backgroundSecondary }]}>
        <CenteredText style={[styles.descriptionText, { color: theme.textSecondary }]}>
          این بخش جهت دریافت دعای خیر، راهنمایی شرعی و نصیحت دینی ایجاد شده است.
          درخواست‌ها مستقیماً توسط سیدعبدالباقی شیرزادی بررسی می‌گردد و در موارد خاص،
          با مشورت علما و سیدان اهل علم پاسخ داده می‌شود.
        </CenteredText>
      </View>

      {/* Requests List */}
      <FlatList
        data={state.requests}
        keyExtractor={(item) => item.id}
        renderItem={renderRequest}
        contentContainerStyle={[
          styles.listContent,
          state.requests.length === 0 && styles.listContentEmpty,
        ]}
        ListEmptyComponent={renderEmpty}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={theme.tint}
            colors={[theme.tint]}
          />
        }
        showsVerticalScrollIndicator={false}
      />

      {/* New Request FAB */}
      {state.requests.length > 0 && (
        <Pressable
          onPress={() => router.push('/dua-request/new')}
          style={({ pressed }) => [
            styles.fab,
            { 
              backgroundColor: theme.tint,
              bottom: Spacing.xl + insets.bottom,
            },
            pressed && styles.fabPressed,
          ]}
        >
          <MaterialIcons name="add" size={28} color="#fff" />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    position: 'relative',
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
    textAlign: 'center',
  },
  headerTitleContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  newButtonHeader: {
    padding: Spacing.xs,
  },
  description: {
    padding: Spacing.md,
    marginHorizontal: Spacing.md,
    marginTop: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  descriptionText: {
    fontSize: Typography.ui.caption,
    lineHeight: 20,
    fontFamily: 'Vazirmatn',
    textAlign: 'right',
  },
  listContent: {
    padding: Spacing.md,
    paddingBottom: 100,
  },
  listContentEmpty: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  emptyTitle: {
    fontSize: Typography.ui.subtitle,
    fontWeight: '600',
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
    fontFamily: 'Vazirmatn',
  },
  emptyText: {
    fontSize: Typography.ui.body,
    textAlign: 'center',
    marginBottom: Spacing.lg,
    fontFamily: 'Vazirmatn',
  },
  newButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
  },
  newButtonText: {
    color: '#fff',
    fontSize: Typography.ui.body,
    fontWeight: '600',
    fontFamily: 'Vazirmatn',
  },
  buttonPressed: {
    opacity: 0.8,
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
  fab: {
    position: 'absolute',
    left: Spacing.xl,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  fabPressed: {
    opacity: 0.8,
  },
});
