/**
 * Na't & Islamic Poetry (Audio Only)
 * Offline-first, car-friendly listening
 */

import React, { useMemo, useState } from 'react';
import { View, StyleSheet, ScrollView, Pressable, Text, ActivityIndicator, TextInput } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useApp } from '@/context/AppContext';
import { useNaat } from '@/context/NaatContext';
import { BorderRadius, Spacing, Typography } from '@/constants/theme';
import { NaatCard } from '@/components/naat/NaatCard';
import { NaatMiniPlayer } from '@/components/naat/NaatMiniPlayer';

const ADMIN_ENABLED = true;

function normalizeText(input: string) {
  return input
    .toLowerCase()
    .replace(/[ًٌٍَُِّْ]/g, '')
    .replace(/[ي]/g, 'ی')
    .replace(/[ك]/g, 'ک')
    .replace(/[ۀة]/g, 'ه')
    .replace(/[أإآ]/g, 'ا')
    .replace(/\s+/g, ' ')
    .trim();
}

export default function NaatScreen() {
  const { theme } = useApp();
  const router = useRouter();
  const { naats, loading, player, play, pause, resume, download } = useNaat();
  const [query, setQuery] = useState('');
  const [selectedReciter, setSelectedReciter] = useState('همه');

  const progress = useMemo(() => {
    if (!player.current || player.durationMillis <= 0) return 0;
    return player.positionMillis / player.durationMillis;
  }, [player.current, player.durationMillis, player.positionMillis]);

  const reciters = useMemo(() => {
    const names = Array.from(new Set(naats.map((item) => item.reciter_name).filter(Boolean)));
    return ['همه', ...names];
  }, [naats]);

  const filtered = useMemo(() => {
    const q = normalizeText(query);
    return naats.filter((item) => {
      const matchesReciter = selectedReciter === 'همه' || item.reciter_name === selectedReciter;
      if (!q) return matchesReciter;
      const hay = normalizeText(`${item.title_fa} ${item.title_ps} ${item.reciter_name}`);
      return matchesReciter && hay.includes(q);
    });
  }, [naats, query, selectedReciter]);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <LinearGradient colors={['#173f33', '#1a4d3e', '#1f6b57']} style={styles.header}>
        <Pressable
          onLongPress={() => ADMIN_ENABLED && router.push('/naat/admin')}
          delayLongPress={600}
          style={styles.headerContent}
        >
          <View style={styles.headerTopRow}>
            <Pressable onPress={() => router.push('/naat/downloads')} style={styles.downloadsButton}>
              <MaterialIcons name="library-music" size={20} color="#fff" />
              <Text style={styles.downloadsText}>دانلودها</Text>
            </Pressable>
          </View>
          <Text style={styles.headerTitle}>نعت و شعر اسلامی</Text>
          <Text style={styles.headerSubtitle}>ذکر دل، غذای روح</Text>
          <View style={styles.motifRow}>
            <View style={styles.motifDot} />
            <View style={styles.motifLine} />
            <MaterialIcons name="auto-awesome" size={18} color="#d4af37" />
            <View style={styles.motifLine} />
            <View style={styles.motifDot} />
          </View>
        </Pressable>
      </LinearGradient>

      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={theme.tint} />
          <Text style={[styles.loadingText, { color: theme.textSecondary }]}>در حال بارگذاری...</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
          <View style={[styles.searchBox, { backgroundColor: theme.backgroundSecondary, borderColor: theme.cardBorder }]}>
            <MaterialIcons name="search" size={20} color={theme.textSecondary} />
            <TextInput
              style={[styles.searchInput, { color: theme.text }]}
              placeholder="جستجوی نعت..."
              placeholderTextColor={theme.textSecondary}
              value={query}
              onChangeText={setQuery}
              textAlign="right"
            />
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.reciterRow}
          >
            {reciters.map((reciter) => (
              <Pressable
                key={reciter}
                onPress={() => setSelectedReciter(reciter)}
                style={[
                  styles.reciterChip,
                  {
                    backgroundColor: selectedReciter === reciter ? theme.tint : theme.backgroundSecondary,
                    borderColor: theme.cardBorder,
                  },
                ]}
              >
                <Text style={[styles.reciterText, { color: selectedReciter === reciter ? '#fff' : theme.text }]}>
                  {reciter}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
          {filtered.length === 0 && (
            <View style={[styles.emptyCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
              <Text style={[styles.emptyTitle, { color: theme.text }]}>هیچ نعتی ثبت نشده است</Text>
              <Text style={[styles.emptySubtitle, { color: theme.textSecondary }]}>
                برای افزودن، هدر را طولانی لمس کنید
              </Text>
            </View>
          )}

          {filtered.map((naat) => (
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
  headerContent: {
    width: '100%',
  },
  headerTopRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'flex-start',
  },
  downloadsButton: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  downloadsText: {
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
  motifRow: {
    marginTop: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  motifLine: {
    height: 1,
    width: 64,
    backgroundColor: 'rgba(212, 175, 55, 0.6)',
  },
  motifDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(212, 175, 55, 0.8)',
  },
  listContent: {
    padding: Spacing.lg,
    paddingBottom: 140,
  },
  searchBox: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: Spacing.sm,
    borderWidth: 1,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    marginBottom: Spacing.md,
  },
  searchInput: {
    flex: 1,
    fontFamily: 'Vazirmatn',
    textAlign: 'right',
  },
  reciterRow: {
    flexDirection: 'row-reverse',
    gap: Spacing.sm,
    paddingBottom: Spacing.md,
  },
  reciterChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  reciterText: {
    fontFamily: 'Vazirmatn',
    fontSize: Typography.ui.caption,
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
