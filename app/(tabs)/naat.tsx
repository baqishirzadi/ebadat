/**
 * Na't & Islamic Poetry (Audio Only)
 * Offline-first, car-friendly listening
 */

import React, { useMemo, useState, useRef, useCallback } from 'react';

import { View, StyleSheet, Pressable, ActivityIndicator, FlatList, Modal, Alert, ScrollView } from 'react-native';
import { LocalizedTextInput } from '@/components/ui/LocalizedText';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useApp } from '@/context/AppContext';
import { useNaatCatalog, useNaatPlayer, type NaatQueueSource } from '@/context/NaatContext';
import { BorderRadius, Spacing, Typography, NAAT_GRADIENT } from '@/constants/theme';
import { Naat } from '@/types/naat';
import { NaatCard } from '@/components/naat/NaatCard';
import { NaatProgressBar } from '@/components/naat/NaatProgressBar';
import { NaatQueueSheet } from '@/components/naat/NaatQueueSheet';
import { RtlText } from '@/components/ui/RtlText';
import { tUi } from '@/utils/i18n/ui';

const ADMIN_ENABLED = true;
const NAAT_ADMIN_PIN = '0852';
const HEADER_TITLE = 'نعت و مناجات — یادگار لنگر شیرزاد';
const HEADER_DESCRIPTION =
  'این بخش الهام‌گرفته از محافل نعت، ذکر و خدمت در لنگر شیرزاد است؛\n'
  + 'جایی که به برکت خلیفه صاحب سید عبدالباقی جان (رح)، سال‌ها دل‌ها با نام رسول‌الله ﷺ زنده شده‌اند.\n'
  + 'این صداها ادامه همان راه‌اند — برای آرامش دل‌ها و یاد خدا.';
const HEADER_TITLE_PASHTO = 'نعت او مناجات — د لنګر شیرزاد یادګار';
const HEADER_DESCRIPTION_PASHTO =
  'دا برخه د نعت، ذکر او خدمت له مجلسونو الهام اخیستې ده؛\n'
  + 'هغه ځای چې د خلیفه صاحب سید عبدالباقي جان (رح) په برکت کلونه زړونه د رسول الله ﷺ په نوم ژوندي شوي دي.\n'
  + 'دا غږونه د هماغې لارې دوام دی — د زړونو د آرام او د الله د یاد لپاره.';
const TAB_BAR_CLEARANCE = 82;

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
  const isPashto = state.preferences.appLanguage === 'pashto';
  const headerGradient = NAAT_GRADIENT[themeMode] ?? NAAT_GRADIENT.light;
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { naats, loading, syncError, download, refresh } = useNaatCatalog();
  const { player, session, playFromQueue, togglePlayPause, skipNext, skipPrevious, seek, stop } = useNaatPlayer();
  const [query, setQuery] = useState('');
  const verifiedOnFocusRef = useRef(false);

  useFocusEffect(
    useCallback(() => {
      if (verifiedOnFocusRef.current) return;
      verifiedOnFocusRef.current = true;
      void refresh();
    }, [refresh]),
  );

  const [selectedReciter, setSelectedReciter] = useState('همه');
  const [showNaatAdminPinModal, setShowNaatAdminPinModal] = useState(false);
  const [naatAdminPin, setNaatAdminPin] = useState('');
  const [queueVisible, setQueueVisible] = useState(false);
  const [playerDockHeight, setPlayerDockHeight] = useState(0);

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
      ? isPashto
        ? `${session.currentIndex + 1} له ${session.totalCount}`
        : `${session.currentIndex + 1} از ${session.totalCount}`
      : tUi('صف پخش', state.preferences.appLanguage);
  const listBottomPadding = player.current
    ? playerDockHeight + insets.bottom + TAB_BAR_CLEARANCE + Spacing.lg
    : Spacing.xxl;

  const handlePlayerDockLayout = useCallback((height: number) => {
    const roundedHeight = Math.ceil(height);
    setPlayerDockHeight((previous) => (previous === roundedHeight ? previous : roundedHeight));
  }, []);

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

  const renderNaatItem = useCallback(({ item }: { item: Naat }) => {
    const isActive = player.current?.id === item.id;
    const durationMillis = isActive
      ? player.durationMillis || (item.duration_seconds ? item.duration_seconds * 1000 : 0)
      : 0;
    return (
      <View style={styles.section}>
        <NaatCard
          naat={item}
          isActive={isActive}
          isPlaying={isActive ? player.isPlaying : false}
          positionMillis={isActive ? player.positionMillis : 0}
          durationMillis={durationMillis}
          onSeek={isActive && durationMillis > 0 ? seek : undefined}
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
  }, [player.current?.id, player.isPlaying, player.positionMillis, player.durationMillis, togglePlayPause, playFromQueue, filtered, download, seek]);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.statusFill, { height: insets.top, backgroundColor: headerGradient[0] }]} />
      {loading ? (
      <View testID="naat-loading" style={styles.loading}>
          <ActivityIndicator size="large" color={theme.tint} />
          <RtlText align="center" style={[styles.loadingText, { color: theme.textSecondary }]}>در حال بارگذاری...</RtlText>
        </View>
      ) : (
        <FlatList
          testID="naat-screen-list"
          data={filtered}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.listContent, { paddingBottom: listBottomPadding }]}
          ListHeaderComponent={(
            <View testID="naat-header">
              <LinearGradient
                colors={headerGradient}
                style={[styles.header, { paddingTop: Spacing.xl + insets.top }]}
              >
                <View style={styles.headerContent}>
                  <View style={styles.headerTopRow}>
                    <Pressable
                      testID="naat-downloads-button"
                      onPress={() => router.push('/naat/downloads')}
                      style={[styles.downloadsButton, { borderColor: `${theme.surahHeaderText}55` }]}
                    >
                      <MaterialIcons name="library-music" size={20} color={theme.surahHeaderText} />
                      <RtlText align="center" wrap={false} style={[styles.downloadsText, { color: theme.surahHeaderText }]}>{tUi('دانلودها', state.preferences.appLanguage)}</RtlText>
                    </Pressable>
                  </View>
                  <Pressable
                    testID="naat-header-content"
                    onLongPress={() => ADMIN_ENABLED && setShowNaatAdminPinModal(true)}
                    delayLongPress={600}
                    style={styles.headerBody}
                  >
                    <RtlText testID="naat-header-title" align="center" style={[styles.headerTitle, { color: theme.surahHeaderText }]}>
                      {isPashto ? HEADER_TITLE_PASHTO : HEADER_TITLE}
                    </RtlText>
                    <RtlText testID="naat-header-description" align="center" style={[styles.headerDescription, { color: theme.surahHeaderText }]}>
                      {isPashto ? HEADER_DESCRIPTION_PASHTO : HEADER_DESCRIPTION}
                    </RtlText>
                    <View style={styles.motifRow}>
                      <View style={[styles.motifDot, { backgroundColor: theme.bookmark }]} />
                      <View style={[styles.motifLine, { backgroundColor: theme.bookmark }]} />
                      <MaterialIcons name="auto-awesome" size={18} color={theme.bookmark} />
                      <View style={[styles.motifLine, { backgroundColor: theme.bookmark }]} />
                      <View style={[styles.motifDot, { backgroundColor: theme.bookmark }]} />
                    </View>
                  </Pressable>
                </View>
              </LinearGradient>

              <View style={styles.headerSection}>
                {syncError && (
                  <View style={[styles.syncBanner, { backgroundColor: theme.backgroundSecondary, borderColor: theme.cardBorder }]}>
                    <View style={styles.syncBannerTextWrap}>
                      <MaterialIcons name="sync-problem" size={18} color="#D4AF37" />
                      <RtlText align="center" style={[styles.syncBannerText, { color: theme.textSecondary }]}>
                        {syncError}
                      </RtlText>
                    </View>
                    <Pressable
                      onPress={() => {
                        refresh().catch(() => {});
                      }}
                      style={[styles.syncBannerButton, { backgroundColor: theme.tint }]}
                    >
                      <RtlText align="center" wrap={false} style={styles.syncBannerButtonText}>{tUi('تلاش دوباره', state.preferences.appLanguage)}</RtlText>
                    </Pressable>
                  </View>
                )}

                <View style={[styles.searchBox, { backgroundColor: theme.backgroundSecondary, borderColor: theme.cardBorder }]}>
                  <MaterialIcons name="search" size={20} color={theme.textSecondary} />
                  <LocalizedTextInput
                    testID="naat-search-input"
                    style={[styles.searchInput, { color: theme.text }]}
                    placeholder={isPashto ? 'د نعت لټون...' : 'جستجوی نعت...'}
                    placeholderTextColor={theme.textSecondary}
                    value={query}
                    onChangeText={setQuery}
                    textAlign="center"
                  />
                </View>

                <ScrollView
                  testID="naat-reciter-filters"
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
                      <RtlText align="center" wrap={false} style={[styles.reciterText, { color: selectedReciter === reciter ? '#fff' : theme.text }]}>
                        {reciter === 'همه' ? tUi('همه', state.preferences.appLanguage) : reciter}
                      </RtlText>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            </View>
          )}
          ListEmptyComponent={(
            <View style={styles.section}>
              <View style={[styles.emptyCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
                <RtlText align="center" style={[styles.emptyTitle, { color: theme.text }]}>{tUi('هیچ نعتی ثبت نشده است', state.preferences.appLanguage)}</RtlText>
                <RtlText align="center" style={[styles.emptySubtitle, { color: theme.textSecondary }]}>
                  {tUi('برای افزودن، هدر را طولانی لمس کنید', state.preferences.appLanguage)}
                </RtlText>
              </View>
            </View>
          )}
          renderItem={renderNaatItem}
        />
      )}

      <NaatPlayerDock
        player={player}
        session={session}
        isPashto={isPashto}
        queueLabel={queueLabel}
        bottomInset={insets.bottom}
        onHeightChange={handlePlayerDockLayout}
        theme={theme}
        setQueueVisible={setQueueVisible}
        seek={seek}
        skipPrevious={skipPrevious}
        togglePlayPause={togglePlayPause}
        skipNext={skipNext}
        stop={stop}
      />

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
            <RtlText style={[styles.pinModalTitle, { color: theme.text }]}>ورود به مدیریت نعت</RtlText>
            <LocalizedTextInput
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
                <RtlText style={styles.pinModalButtonText}>تأیید</RtlText>
              </Pressable>
              <Pressable
                onPress={closeNaatAdminPinModal}
                style={[styles.pinModalButton, styles.pinModalButtonSecondary, { backgroundColor: theme.backgroundSecondary, borderColor: theme.cardBorder }]}
              >
                <RtlText style={[styles.pinModalButtonTextSecondary, { color: theme.text }]}>انصراف</RtlText>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const NaatPlayerDock = React.memo(function NaatPlayerDock({
  player,
  session,
  isPashto,
  queueLabel,
  bottomInset,
  onHeightChange,
  theme,
  setQueueVisible,
  seek,
  skipPrevious,
  togglePlayPause,
  skipNext,
  stop,
}: {
  player: ReturnType<typeof useNaatPlayer>['player'];
  session: ReturnType<typeof useNaatPlayer>['session'];
  isPashto: boolean;
  queueLabel: string;
  bottomInset: number;
  onHeightChange: (height: number) => void;
  theme: ReturnType<typeof useApp>['theme'];
  setQueueVisible: React.Dispatch<React.SetStateAction<boolean>>;
  seek: ReturnType<typeof useNaatPlayer>['seek'];
  skipPrevious: ReturnType<typeof useNaatPlayer>['skipPrevious'];
  togglePlayPause: ReturnType<typeof useNaatPlayer>['togglePlayPause'];
  skipNext: ReturnType<typeof useNaatPlayer>['skipNext'];
  stop: ReturnType<typeof useNaatPlayer>['stop'];
}) {
  if (!player.current) return null;
  return (
    <View
      testID="naat-player-dock"
      style={[
        styles.playerDock,
        {
          bottom: bottomInset + 82,
          backgroundColor: theme.card,
          borderColor: theme.cardBorder,
          shadowColor: theme.text,
        },
      ]}
      onLayout={(event) => onHeightChange(event.nativeEvent.layout.height)}
    >
      <NaatProgressBar
        positionMillis={player.positionMillis}
        durationMillis={player.durationMillis || (player.current.duration_seconds ? player.current.duration_seconds * 1000 : 0)}
        onSeek={(millis) => seek(millis)}
        fillColor={theme.tint}
        trackColor={theme.backgroundSecondary}
        textColor={theme.textSecondary}
        showTimeLabels={false}
      />
      <View style={styles.playerHeaderRow}>
        <Pressable
          testID="naat-player-queue-button"
          accessibilityLabel="صف پخش نعت"
          onPress={() => setQueueVisible(true)}
          style={[styles.playerIconButton, { backgroundColor: theme.backgroundSecondary }]}
        >
          <MaterialIcons name="queue-music" size={22} color={theme.tint} />
        </Pressable>
        <View style={styles.playerInfo}>
          <RtlText align="center" style={[styles.playerTitle, { color: theme.text }]} numberOfLines={1}>
            {isPashto ? player.current.title_ps : player.current.title_fa}
          </RtlText>
          <RtlText align="center" style={[styles.playerSubtitle, { color: theme.textSecondary }]} numberOfLines={1}>
            {player.current.reciter_name} • {queueLabel}
          </RtlText>
        </View>
        <Pressable
          testID="naat-player-stop-button"
          accessibilityLabel="بستن پلیر نعت"
          onPress={() => {
            stop().catch(() => {});
          }}
          style={[styles.playerIconButton, { backgroundColor: theme.backgroundSecondary }]}
        >
          <MaterialIcons name="close" size={21} color={theme.textSecondary} />
        </Pressable>
      </View>
      <View style={styles.playerControls}>
          <Pressable
            testID="naat-player-next-button"
            accessibilityLabel="نعت بعدی"
            onPress={() => {
              skipNext().catch(() => {});
            }}
            disabled={!session.canSkipNext}
            style={[styles.playerIconButton, { backgroundColor: theme.backgroundSecondary, opacity: session.canSkipNext ? 1 : 0.42 }]}
          >
            <MaterialIcons name="skip-next" size={22} color={theme.textSecondary} />
          </Pressable>
          <Pressable
            testID="naat-player-toggle-button"
            accessibilityLabel={player.isPlaying ? 'توقف نعت' : 'پخش نعت'}
            onPress={() => {
              togglePlayPause().catch(() => {});
            }}
            style={[styles.playerPlayButton, { backgroundColor: theme.tint }]}
          >
            <MaterialIcons name={player.isPlaying ? 'pause' : 'play-arrow'} size={28} color="#fff" />
          </Pressable>
          <Pressable
            testID="naat-player-previous-button"
            accessibilityLabel="نعت قبلی"
            onPress={() => {
              skipPrevious().catch(() => {});
            }}
            disabled={!session.canSkipPrevious}
            style={[styles.playerIconButton, { backgroundColor: theme.backgroundSecondary, opacity: session.canSkipPrevious ? 1 : 0.42 }]}
          >
            <MaterialIcons name="skip-previous" size={22} color={theme.textSecondary} />
          </Pressable>
      </View>
    </View>
  );
});

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
  headerBody: {
    width: '100%',
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  downloadsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    minHeight: 40,
    paddingHorizontal: Spacing.md,
    borderWidth: 1,
    borderRadius: BorderRadius.full,
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
    alignItems: 'center',
  },
  syncBannerTextWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
  },
  syncBannerText: {
    fontFamily: 'Vazirmatn',
    fontSize: Typography.ui.caption,
    textAlign: 'center',
    flexShrink: 1,
  },
  syncBannerButton: {
    alignSelf: 'center',
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
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.sm,
    borderWidth: 1,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.md,
    height: 42,
    minHeight: 42,
    marginBottom: Spacing.md,
  },
  searchInput: {
    flex: 1,
    fontFamily: 'Vazirmatn',
    textAlign: 'right',
  },
  reciterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
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
    paddingTop: Spacing.xs,
    paddingBottom: Spacing.sm,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.16,
    shadowRadius: 18,
    elevation: 10,
    gap: Spacing.xs,
  },
  playerHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  playerInfo: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
  },
  playerTitle: {
    fontFamily: 'Vazirmatn',
    fontSize: Typography.ui.body,
    fontWeight: '800',
    textAlign: 'center',
  },
  playerSubtitle: {
    marginTop: 2,
    fontFamily: 'Vazirmatn',
    fontSize: Typography.ui.caption,
    textAlign: 'center',
  },
  playerControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
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
