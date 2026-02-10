/**
 * Na't & Islamic Poetry (Audio Only)
 * Offline-first, car-friendly listening
 */

import React, { useMemo } from 'react';
import { View, StyleSheet, ScrollView, Pressable, Text, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useApp } from '@/context/AppContext';
import { useNaat } from '@/context/NaatContext';
import { BorderRadius, Spacing, Typography } from '@/constants/theme';
import { NaatCard } from '@/components/naat/NaatCard';
import { NaatMiniPlayer } from '@/components/naat/NaatMiniPlayer';

const ADMIN_ENABLED = true;

export default function NaatScreen() {
  const { theme } = useApp();
  const router = useRouter();
  const { naats, loading, player, play, pause, resume, download } = useNaat();

  const progress = useMemo(() => {
    if (!player.current || player.durationMillis <= 0) return 0;
    return player.positionMillis / player.durationMillis;
  }, [player.current, player.durationMillis, player.positionMillis]);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <LinearGradient colors={['#173f33', '#1a4d3e', '#1f6b57']} style={styles.header}>
        <View style={styles.headerPattern} pointerEvents="none">
          <View style={styles.patternLine} />
          <View style={styles.patternLine} />
          <View style={styles.patternLine} />
        </View>
        <View style={styles.headerTopRow}>
          {ADMIN_ENABLED && (
            <Pressable onPress={() => router.push('/naat/admin')} style={styles.adminButton}>
              <MaterialIcons name="settings" size={20} color="#fff" />
              <Text style={styles.adminText}>مدیریت</Text>
            </Pressable>
          )}
        </View>
        <Text style={styles.headerTitle}>نعت و شعر اسلامی</Text>
        <Text style={styles.headerSubtitle}>ذکر دل، غذای روح</Text>
        <View style={styles.ornamentRow}>
          <View style={styles.ornamentLine} />
          <MaterialIcons name="auto-awesome" size={18} color="#d4af37" />
          <View style={styles.ornamentLine} />
        </View>
      </LinearGradient>

      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={theme.tint} />
          <Text style={[styles.loadingText, { color: theme.textSecondary }]}>در حال بارگذاری...</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
          {naats.length === 0 && (
            <View style={[styles.emptyCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
              <Text style={[styles.emptyTitle, { color: theme.text }]}>هیچ نعتی ثبت نشده است</Text>
              <Text style={[styles.emptySubtitle, { color: theme.textSecondary }]}>
                از بخش مدیریت نعت‌ها اضافه کنید
              </Text>
            </View>
          )}

          {naats.map((naat) => (
            <NaatCard
              key={naat.id}
              naat={naat}
              onPlay={() => play(naat)}
              onDownload={() => download(naat)}
            />
          ))}
        </ScrollView>
      )}

      {player.current && (
        <NaatMiniPlayer
          naat={player.current}
          isPlaying={player.isPlaying}
          progress={progress}
          onPlayPause={() => (player.isPlaying ? pause() : resume())}
          onOpen={() => router.push('/naat/now-playing')}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 56,
    paddingBottom: Spacing.xl,
    paddingHorizontal: Spacing.lg,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    overflow: 'hidden',
  },
  headerPattern: {
    position: 'absolute',
    inset: 0,
    opacity: 0.08,
    justifyContent: 'space-evenly',
  },
  patternLine: {
    height: 1,
    backgroundColor: '#ffffff',
    marginHorizontal: Spacing.xl,
  },
  headerTopRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'flex-start',
  },
  adminButton: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  adminText: {
    color: '#fff',
    fontSize: Typography.ui.caption,
    fontFamily: 'Vazirmatn',
  },
  headerTitle: {
    marginTop: Spacing.lg,
    color: '#fff',
    fontSize: Typography.ui.display,
    fontFamily: 'Amiri',
    textAlign: 'center',
  },
  headerSubtitle: {
    marginTop: Spacing.xs,
    color: '#e2f1ea',
    fontSize: Typography.ui.body,
    fontFamily: 'Vazirmatn',
    textAlign: 'center',
  },
  ornamentRow: {
    marginTop: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  ornamentLine: {
    height: 1,
    width: 64,
    backgroundColor: 'rgba(212, 175, 55, 0.6)',
  },
  listContent: {
    padding: Spacing.lg,
    paddingBottom: 140,
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: Spacing.sm,
    fontFamily: 'Vazirmatn',
  },
  emptyCard: {
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.lg,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: Typography.ui.subtitle,
    fontFamily: 'Vazirmatn',
    textAlign: 'center',
  },
  emptySubtitle: {
    marginTop: Spacing.sm,
    fontSize: Typography.ui.caption,
    fontFamily: 'Vazirmatn',
    textAlign: 'center',
  },
});
