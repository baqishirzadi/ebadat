/**
 * Na't & Islamic Poetry (Audio Only)
 * Offline-first, car-friendly listening
 */

import React, { useMemo, useState } from 'react';
import { View, StyleSheet, ScrollView, Pressable, Text, ActivityIndicator, TextInput, FlatList, Modal, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useApp } from '@/context/AppContext';
import { useNaat, type NaatQueueSource } from '@/context/NaatContext';
import { BorderRadius, Spacing, Typography, NAAT_GRADIENT } from '@/constants/theme';
import { Naat } from '@/types/naat';
import { NaatCard } from '@/components/naat/NaatCard';
import { NaatProgressBar } from '@/components/naat/NaatProgressBar';
import { NaatQueueSheet } from '@/components/naat/NaatQueueSheet';

const ADMIN_ENABLED = true;
const NAAT_ADMIN_PIN = '0852';
const HEADER_TITLE = 'نعت و مناجات — یادگار لنگر شیرزاد';
const HEADER_DESCRIPTION =
  'این بخش الهام‌گرفته از محافل نعت، ذکر و خدمت در لنگر شیرزاد است؛\n' +
  'جایی که به برکت خلیفه صاحب سید عبدالباقی جان (رح)، سال‌ها دل‌ها با نام رسول‌الله ﷺ زنده شده‌اند.\n' +
  'این صداها ادامه همان راه‌اند — برای آرامش دل‌ها و یاد خدا.';

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

function filterQueueItems(ids: string[], naats: Naat[]) {
  const byId = new Map(naats.map((item) => [item.id, item]));
  return ids.map((id) => byId.get(id)).filter((item): item is Naat => Boolean(item));
}

export default function NaatScreen() {
  const { theme, state } = useApp();
  const themeMode = state.preferences.theme;
  const headerGradient = NAAT_GRADIENT[themeMode] ?? NAAT_GRADIENT.light;
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const {
    naats,
    loading,
    syncError,
    player,
    session,
    playFromQueue,
    togglePlayPause,
    skipNext,
    skipPrevious,
    download,
    seek,
    stop,
    refresh,
  } = useNaat();
  const [query, setQuery] = useState('');
  const [selectedReciter, setSelectedReciter] = useState('همه');
  const [showNaatAdminPinModal, setShowNaatAdminPinModal] = useState(false);
  const [naatAdminPin, setNaatAdminPin] = useState('');
  const [queueVisible, setQueueVisible] = useState(false);

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

  const queueItems = useMemo(
    () => filterQueueItems(session.queueIds, naats),
    [naats, session.queueIds],
  );

  const queueLabel =
    player.current && session.totalCount > 0 && session.currentIndex >= 0
      ? `${session.currentIndex + 1} از ${session.totalCount}`
      : 'صف پخش';

  const handleQueueSelect = (id: string) => {
    setQueueVisible(false);
    const source: NaatQueueSource = session.source ?? 'catalog';
    const sourceItems = queueItems.length > 0 ? queueItems : filtered;
    playFromQueue(sourceItems, id, source).catch(() => {});
  };

  const handleNaatAdminPinSubmit = () => {
    if (naatAdminPin.trim() === NAAT_ADMIN_PIN) {
      setShowNaatAdminPinModal(false);
      setNaatAdminPin('');
      router.push('/naat/admin');
    } else {
      Alert.alert('خطا', 'PIN اشتباه است');
    }
  };

  const closeNaatAdminPinModal = () => {
    setShowNaatAdminPinModal(false);
    setNaatAdminPin('');
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.statusFill, { height: insets.top, backgroundColor: headerGradient[0] }]} />
      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={theme.tint} />
          <Text style={[styles.loadingText, { color: theme.textSecondary }]}>در حال بارگذاری...</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.listContent, player.current && styles.listContentWithPlayer]}
          ListHeaderComponent={(
            <View>
              <LinearGradient
                colors={headerGradient}
                style={[styles.header, { paddingTop: Spacing.xl + insets.top }]}
              >
                <Pressable
                  onLongPress={() => ADMIN_ENABLED && setShowNaatAdminPinModal(true)}
                  delayLongPress={600}
                  style={styles.headerContent}
                >
                  <View style={styles.headerTopRow}>
                    <Pressable onPress={() => router.push('/naat/downloads')} style={styles.downloadsButton}>
                      <MaterialIcons name="library-music" size={20} color={theme.surahHeaderText} />
                      <Text style={[styles.downloadsText, { color: theme.surahHeaderText }]}>دانلودها</Text>
                    </Pressable>
                  </View>
                  <Text style={[styles.headerTitle, { color: theme.surahHeaderText }]}>{HEADER_TITLE}</Text>
                  <Text style={[styles.headerDescription, { color: theme.surahHeaderText }]}>{HEADER_DESCRIPTION}</Text>
                  <View style={styles.motifRow}>
                    <View style={[styles.motifDot, { backgroundColor: theme.bookmark }]} />
                    <View style={[styles.motifLine, { backgroundColor: theme.bookmark }]} />
                    <MaterialIcons name="auto-awesome" size={18} color={theme.bookmark} />
                    <View style={[styles.motifLine, { backgroundColor: theme.bookmark }]} />
                    <View style={[styles.motifDot, { backgroundColor: theme.bookmark }]} />
                  </View>
                </Pressable>
              </LinearGradient>

              <View style={styles.headerSection}>
                {syncError && (
                  <View style={[styles.syncBanner, { backgroundColor: theme.backgroundSecondary, borderColor: theme.cardBorder }]}>
                    <View style={styles.syncBannerTextWrap}>
                      <MaterialIcons name="sync-problem" size={18} color="#D4AF37" />
                      <Text style={[styles.syncBannerText, { color: theme.textSecondary }]} numberOfLines={2}>
                        {syncError}
                      </Text>
                    </View>
                    <Pressable
                      onPress={() => {
                        refresh().catch(() => {});
                      }}
                      style={[styles.syncBannerButton, { backgroundColor: theme.tint }]}
                    >
                      <Text style={styles.syncBannerButtonText}>تلاش دوباره</Text>
                    </Pressable>
                  </View>
                )}

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
              </View>
            </View>
          )}
          ListEmptyComponent={(
            <View style={styles.section}>
              <View style={[styles.emptyCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
                <Text style={[styles.emptyTitle, { color: theme.text }]}>هیچ نعتی ثبت نشده است</Text>
                <Text style={[styles.emptySubtitle, { color: theme.textSecondary }]}>
                  برای افزودن، هدر را طولانی لمس کنید
                </Text>
              </View>
            </View>
          )}
          renderItem={({ item }) => {
            const isActive = player.current?.id === item.id;
            return (
              <View style={styles.section}>
                <NaatCard
                  naat={item}
                  isActive={isActive}
                  isPlaying={isActive ? player.isPlaying : false}
                  onPlay={() => {
                    if (isActive) {
                      togglePlayPause().catch(() => {});
                      return;
                    }
                    playFromQueue(filtered, item.id, 'filtered').catch(() => {});
                  }}
                  onDownload={() => download(item)}
                />
              </View>
            );
          }}
        />
      )}

      {player.current && (
        <View
          style={[
            styles.playerDock,
            {
              bottom: insets.bottom + 82,
              backgroundColor: theme.card,
              borderColor: theme.cardBorder,
              shadowColor: theme.text,
            },
          ]}
        >
          <NaatProgressBar
            positionMillis={player.positionMillis}
            durationMillis={player.durationMillis || (player.current.duration_seconds ? player.current.duration_seconds * 1000 : 0)}
            onSeek={(millis) => seek(millis)}
            fillColor={theme.tint}
            trackColor={theme.backgroundSecondary}
            textColor={theme.textSecondary}
          />

          <View style={styles.playerMainRow}>
            <Pressable
              onPress={() => setQueueVisible(true)}
              style={[styles.playerIconButton, { backgroundColor: theme.backgroundSecondary }]}
            >
              <MaterialIcons name="queue-music" size={22} color={theme.tint} />
            </Pressable>

            <View style={styles.playerInfo}>
              <Text style={[styles.playerTitle, { color: theme.text }]} numberOfLines={1}>
                {player.current.title_fa}
              </Text>
              <Text style={[styles.playerSubtitle, { color: theme.textSecondary }]} numberOfLines={1}>
                {player.current.reciter_name} • {queueLabel}
              </Text>
            </View>

            <View style={styles.playerControls}>
              <Pressable
                onPress={() => {
                  skipPrevious().catch(() => {});
                }}
                disabled={!session.canSkipPrevious}
                style={[styles.playerIconButton, { backgroundColor: theme.backgroundSecondary, opacity: session.canSkipPrevious ? 1 : 0.42 }]}
              >
                <MaterialIcons name="skip-previous" size={22} color={theme.textSecondary} />
              </Pressable>
              <Pressable
                onPress={() => {
                  togglePlayPause().catch(() => {});
                }}
                style={[styles.playerPlayButton, { backgroundColor: theme.tint }]}
              >
                <MaterialIcons name={player.isPlaying ? 'pause' : 'play-arrow'} size={28} color="#fff" />
              </Pressable>
              <Pressable
                onPress={() => {
                  skipNext().catch(() => {});
                }}
                disabled={!session.canSkipNext}
                style={[styles.playerIconButton, { backgroundColor: theme.backgroundSecondary, opacity: session.canSkipNext ? 1 : 0.42 }]}
              >
                <MaterialIcons name="skip-next" size={22} color={theme.textSecondary} />
              </Pressable>
              <Pressable
                onPress={() => {
                  stop().catch(() => {});
                }}
                style={[styles.playerIconButton, { backgroundColor: theme.backgroundSecondary }]}
              >
                <MaterialIcons name="stop" size={22} color={theme.textSecondary} />
              </Pressable>
            </View>
          </View>
        </View>
      )}

      <NaatQueueSheet
        visible={queueVisible}
        items={queueItems.length > 0 ? queueItems : filtered}
        currentId={player.current?.id}
        onClose={() => setQueueVisible(false)}
        onSelect={handleQueueSelect}
      />

      {/* Naat Admin PIN Modal */}
      <Modal
        visible={showNaatAdminPinModal}
        transparent
        animationType="fade"
        onRequestClose={closeNaatAdminPinModal}
      >
        <View style={styles.pinModalOverlay}>
          <View style={[styles.pinModalContent, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
            <Text style={[styles.pinModalTitle, { color: theme.text }]}>ورود به مدیریت نعت</Text>
            <TextInput
              style={[styles.pinModalInput, { color: theme.text, borderColor: theme.cardBorder }]}
              placeholder="PIN را وارد کنید"
              placeholderTextColor={theme.textSecondary}
              value={naatAdminPin}
              onChangeText={setNaatAdminPin}
              secureTextEntry
              keyboardType="number-pad"
              maxLength={4}
              textAlign="center"
            />
            <View style={styles.pinModalButtons}>
              <Pressable
                onPress={handleNaatAdminPinSubmit}
                style={[styles.pinModalButton, styles.pinModalButtonPrimary, { backgroundColor: theme.tint }]}
              >
                <Text style={styles.pinModalButtonText}>تأیید</Text>
              </Pressable>
              <Pressable
                onPress={closeNaatAdminPinModal}
                style={[styles.pinModalButton, styles.pinModalButtonSecondary, { backgroundColor: theme.backgroundSecondary, borderColor: theme.cardBorder }]}
              >
                <Text style={[styles.pinModalButtonTextSecondary, { color: theme.text }]}>انصراف</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  statusFill: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 2,
  },
  header: {
    paddingTop: 0,
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
    fontSize: Typography.ui.caption,
    fontFamily: 'Vazirmatn',
  },
  headerTitle: {
    marginTop: Spacing.md,
    fontSize: Typography.ui.title,
    fontFamily: 'Amiri',
    textAlign: 'center',
    lineHeight: 40,
  },
  headerDescription: {
    marginTop: Spacing.xs,
    fontSize: Typography.ui.caption,
    lineHeight: 22,
    fontFamily: 'Vazirmatn',
    textAlign: 'center',
    paddingHorizontal: Spacing.sm,
  },
  motifRow: {
    marginTop: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  motifLine: {
    height: 1,
    width: 64,
  },
  motifDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  listContent: {
    paddingBottom: Spacing.xxl,
  },
  listContentWithPlayer: {
    paddingBottom: 250,
  },
  section: {
    paddingHorizontal: Spacing.lg,
  },
  headerSection: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
  },
  syncBanner: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  syncBannerTextWrap: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  syncBannerText: {
    flex: 1,
    fontFamily: 'Vazirmatn',
    fontSize: Typography.ui.caption,
    textAlign: 'right',
  },
  syncBannerButton: {
    alignSelf: 'flex-start',
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
  },
  syncBannerButtonText: {
    color: '#fff',
    fontFamily: 'Vazirmatn',
    fontSize: Typography.ui.caption,
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
  pinModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  pinModalContent: {
    width: '100%',
    maxWidth: 320,
    padding: Spacing.xl,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
  },
  pinModalTitle: {
    fontSize: Typography.ui.title,
    fontWeight: '700',
    fontFamily: 'Vazirmatn',
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  pinModalInput: {
    fontFamily: 'Vazirmatn',
    fontSize: Typography.ui.subtitle,
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
  },
  pinModalButtons: {
    flexDirection: 'column',
    gap: Spacing.sm,
  },
  pinModalButton: {
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
  },
  pinModalButtonPrimary: {},
  pinModalButtonSecondary: {
    borderWidth: 1,
  },
  pinModalButtonText: {
    color: '#fff',
    fontSize: Typography.ui.body,
    fontWeight: '600',
    fontFamily: 'Vazirmatn',
  },
  pinModalButtonTextSecondary: {
    fontSize: Typography.ui.body,
    fontWeight: '600',
    fontFamily: 'Vazirmatn',
  },
  playerDock: {
    position: 'absolute',
    left: Spacing.md,
    right: Spacing.md,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.sm,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.16,
    shadowRadius: 18,
    elevation: 10,
    gap: Spacing.sm,
  },
  playerMainRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  playerInfo: {
    flex: 1,
    minWidth: 0,
    alignItems: 'flex-end',
  },
  playerTitle: {
    fontFamily: 'Vazirmatn',
    fontSize: Typography.ui.body,
    fontWeight: '800',
    textAlign: 'right',
  },
  playerSubtitle: {
    marginTop: 2,
    fontFamily: 'Vazirmatn',
    fontSize: Typography.ui.caption,
    textAlign: 'right',
  },
  playerControls: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
  },
  playerIconButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playerPlayButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
