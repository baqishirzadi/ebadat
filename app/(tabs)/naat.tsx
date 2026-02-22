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
import { useNaat } from '@/context/NaatContext';
import { BorderRadius, Spacing, Typography, NAAT_GRADIENT } from '@/constants/theme';
import { NaatCard } from '@/components/naat/NaatCard';

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

export default function NaatScreen() {
  const { theme, state } = useApp();
  const themeMode = state.preferences.theme;
  const headerGradient = NAAT_GRADIENT[themeMode] ?? NAAT_GRADIENT.light;
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { naats, loading, player, play, pause, resume, download, seek } = useNaat();
  const [query, setQuery] = useState('');
  const [selectedReciter, setSelectedReciter] = useState('همه');
  const [showNaatAdminPinModal, setShowNaatAdminPinModal] = useState(false);
  const [naatAdminPin, setNaatAdminPin] = useState('');

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
          contentContainerStyle={styles.listContent}
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
            const durationMillis = isActive
              ? player.durationMillis || (item.duration_seconds ? item.duration_seconds * 1000 : 0)
              : 0;
            const positionMillis = isActive ? player.positionMillis : 0;
            const progress = durationMillis > 0 ? positionMillis / durationMillis : 0;
            const canSeek = isActive && durationMillis > 0;
            return (
              <View style={styles.section}>
                <NaatCard
                  naat={item}
                  isActive={isActive}
                  isPlaying={isActive ? player.isPlaying : false}
                  progress={progress}
                  positionMillis={positionMillis}
                  durationMillis={durationMillis}
                  onSeek={canSeek ? (millis) => seek(Math.max(0, Math.min(durationMillis, millis))) : undefined}
                  onPlay={() => {
                    if (isActive) {
                      if (player.isPlaying) {
                        pause();
                      } else {
                        resume();
                      }
                      return;
                    }
                    play(item);
                  }}
                  onDownload={() => download(item)}
                />
              </View>
            );
          }}
        />
      )}

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
  section: {
    paddingHorizontal: Spacing.lg,
  },
  headerSection: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
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
});
