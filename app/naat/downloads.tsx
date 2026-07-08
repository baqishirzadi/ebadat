/**
 * Naat Download Manager
 */

import React, { useMemo } from 'react';
import { View, StyleSheet, Text, Pressable, ScrollView } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useApp } from '@/context/AppContext';
import { useNaat } from '@/context/NaatContext';
import { BorderRadius, Spacing, Typography } from '@/constants/theme';
import { NaatCard } from '@/components/naat/NaatCard';
import { NaatMiniPlayer } from '@/components/naat/NaatMiniPlayer';

export default function NaatDownloadsScreen() {
  const { theme } = useApp();
  const router = useRouter();
  const { naats, player, play, playFromQueue, togglePlayPause, download, seek } = useNaat();

  const downloaded = useMemo(() => naats.filter((n) => n.isDownloaded), [naats]);
  const inProgress = useMemo(
    () => naats.filter((n) => n.downloadProgress !== undefined && !n.isDownloaded),
    [naats],
  );
  const totalSize = useMemo(
    () => downloaded.reduce((sum, n) => sum + (n.file_size_mb || 0), 0).toFixed(1),
    [downloaded],
  );

  return (
    <View testID="ios-naat-downloads-ready" style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { backgroundColor: theme.surahHeader }]}>
        <Pressable
          onPress={() => {
            if (router.canGoBack?.()) {
              router.back();
            } else {
              router.replace('/naat');
            }
          }}
          style={styles.backButton}
        >
          <MaterialIcons name="arrow-forward" size={24} color="#fff" />
        </Pressable>
        <Text style={styles.headerTitle}>دانلودها</Text>
      </View>

      <ScrollView contentContainerStyle={[styles.content, player.current && styles.contentWithMiniPlayer]}>
        <View style={[styles.summaryCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
          <Text style={[styles.summaryTitle, { color: theme.text }]}>حجم ذخیره‌شده</Text>
          <Text style={[styles.summaryValue, { color: theme.tint }]}>{totalSize} MB</Text>
        </View>

        {inProgress.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>در حال دانلود</Text>
            {inProgress.map((naat) => {
              const isActive = player.current?.id === naat.id;
              const durationMillis = isActive
                ? player.durationMillis || (naat.duration_seconds ? naat.duration_seconds * 1000 : 0)
                : 0;
              return (
                <NaatCard
                  key={naat.id}
                  naat={naat}
                  isActive={isActive}
                  isPlaying={isActive ? player.isPlaying : false}
                  progress={isActive && durationMillis > 0 ? player.positionMillis / durationMillis : 0}
                  positionMillis={isActive ? player.positionMillis : 0}
                  durationMillis={durationMillis}
                  onSeek={isActive && durationMillis > 0 ? (millis) => seek(Math.max(0, Math.min(durationMillis, millis))) : undefined}
                  onPlay={() => {
                    if (isActive) {
                      togglePlayPause().catch(() => {});
                      return;
                    }
                    play(naat).catch(() => {});
                  }}
                  onDownload={() => download(naat)}
                />
              );
            })}
          </View>
        )}

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>دانلود شده</Text>
          {downloaded.length === 0 ? (
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>هنوز چیزی دانلود نشده است</Text>
          ) : (
            downloaded.map((naat) => {
              const isActive = player.current?.id === naat.id;
              const durationMillis = isActive
                ? player.durationMillis || (naat.duration_seconds ? naat.duration_seconds * 1000 : 0)
                : 0;
              return (
                <NaatCard
                  key={naat.id}
                  naat={naat}
                  isActive={isActive}
                  isPlaying={isActive ? player.isPlaying : false}
                  progress={isActive && durationMillis > 0 ? player.positionMillis / durationMillis : 0}
                  positionMillis={isActive ? player.positionMillis : 0}
                  durationMillis={durationMillis}
                  onSeek={isActive && durationMillis > 0 ? (millis) => seek(Math.max(0, Math.min(durationMillis, millis))) : undefined}
                  onPlay={() => {
                    if (isActive) {
                      togglePlayPause().catch(() => {});
                      return;
                    }
                    playFromQueue(downloaded, naat.id, 'downloads').catch(() => {});
                  }}
                  onDownload={() => download(naat)}
                />
              );
            })
          )}
        </View>
      </ScrollView>

      {player.current && (
        <NaatMiniPlayer
          naat={player.current}
          isPlaying={player.isPlaying}
          progress={player.durationMillis > 0 ? player.positionMillis / player.durationMillis : 0}
          onPlayPause={() => {
            togglePlayPause().catch(() => {});
          }}
          onOpen={() => router.push('/naat')}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingTop: 56,
    paddingBottom: Spacing.md,
    paddingHorizontal: Spacing.lg,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    overflow: 'hidden',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    color: '#fff',
    fontFamily: 'Vazirmatn',
    fontSize: Typography.ui.subtitle,
  },
  content: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  contentWithMiniPlayer: {
    paddingBottom: 160,
  },
  summaryCard: {
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  summaryTitle: {
    fontFamily: 'Vazirmatn',
    fontSize: Typography.ui.caption,
  },
  summaryValue: {
    marginTop: Spacing.xs,
    fontFamily: 'Vazirmatn',
    fontSize: Typography.ui.subtitle,
  },
  section: {
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    fontFamily: 'Vazirmatn',
    fontSize: Typography.ui.caption,
    marginBottom: Spacing.sm,
  },
  emptyText: {
    fontFamily: 'Vazirmatn',
    fontSize: Typography.ui.caption,
  },
});
