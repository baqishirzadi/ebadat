/**
 * AudioPlayer Component
 * Simple ayah-by-ayah controls with reciter switch
 */

import CenteredText from '@/components/CenteredText';
import { BorderRadius, Spacing, Typography } from '@/constants/theme';
import { useApp } from '@/context/AppContext';
import audioManager, {
  ReciterKey,
  RECITERS,
  QURAN_PLAYBACK_RATES,
  type QuranPlaybackRate,
  QuranPlaybackScopeType,
  type QuranPlaybackSnapshot,
  getQuranPlaybackErrorMessage,
} from '@/utils/quranAudio';
import { toArabicNumerals } from '@/utils/numbers';
import { MaterialIcons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useI18n } from '@/utils/i18n/useI18n';

interface AudioPlayerProps {
  surahNumber: number;
  ayahNumber: number;
  totalAyahs: number;
  scopeType?: QuranPlaybackScopeType;
  scopeStartAyah?: number;
  scopeEndAyah?: number;
  juzNumber?: number | null;
  isVisible?: boolean;
  /** Compact docked bar under the mushaf (hifz) — does not reserve page height. */
  compact?: boolean;
  isPlaying: boolean;
  onPlayContinuous: () => void;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  onClose?: () => void;
}

export function AudioPlayer({
  surahNumber,
  ayahNumber,
  totalAyahs,
  isVisible = true,
  compact = false,
  scopeType = 'surah',
  scopeStartAyah = 1,
  scopeEndAyah,
  juzNumber = null,
  isPlaying,
  onPlayContinuous,
  onPause,
  onResume,
  onStop,
  onClose,
}: AudioPlayerProps) {
  const { theme } = useApp();
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const [currentReciter, setCurrentReciter] = useState<ReciterKey>('yasser_ad_dussary');
  const [showReciterModal, setShowReciterModal] = useState(false);
  const [showSpeedModal, setShowSpeedModal] = useState(false);
  const [playback, setPlayback] = useState<QuranPlaybackSnapshot>(() => audioManager.getPlaybackSnapshot());
  const [playbackRate, setPlaybackRate] = useState<QuranPlaybackRate>(() => audioManager.getPlaybackRate());

  useEffect(() => {
    setCurrentReciter(audioManager.getReciter());
    const unsubscribe = audioManager.subscribe((snapshot) => {
      setPlayback(snapshot);
      setCurrentReciter(snapshot.reciter);
      setPlaybackRate(snapshot.playbackRate);
    });
    return unsubscribe;
  }, []);

  const handleReciterChange = useCallback(
    async (reciter: ReciterKey) => {
      setShowReciterModal(false);
      if (reciter === currentReciter) return;

      try {
        await audioManager.setReciter(reciter);
        setCurrentReciter(reciter);
        void audioManager
          .playAyah(surahNumber, ayahNumber, totalAyahs, true, true, {
            type: scopeType,
            startAyah: scopeStartAyah,
            endAyah: scopeEndAyah ?? totalAyahs,
            juzNumber,
          })
          .catch((error) => {
            Alert.alert(t('quran.audio.playAyah'), getQuranPlaybackErrorMessage(error));
          });
      } catch (error) {
        Alert.alert(t('quran.audio.playAyah'), getQuranPlaybackErrorMessage(error));
      }
    },
    [currentReciter, surahNumber, ayahNumber, totalAyahs, scopeType, scopeStartAyah, scopeEndAyah, juzNumber, t]
  );

  const handlePlayPause = useCallback(() => {
    if (isPlaying) {
      onPause();
      return;
    }

    // If same ayah is loaded, resume; otherwise start continuous from current ayah
    if (audioManager.getCurrentSurah() === surahNumber && audioManager.getCurrentAyah() === ayahNumber) {
      onResume();
    } else {
      onPlayContinuous();
    }
  }, [isPlaying, onPause, onPlayContinuous, onResume, surahNumber, ayahNumber]);

  const handleRateChange = useCallback(async (rate: QuranPlaybackRate) => {
    setShowSpeedModal(false);
    setPlaybackRate(rate);
    await audioManager.setPlaybackRate(rate);
  }, []);

  const handleClose = useCallback(() => {
    onStop();
    onClose?.();
  }, [onStop, onClose]);

  if (!isVisible) return null;

  const isPreparing = playback.status === 'preparing' || playback.status === 'buffering';
  const statusText = playback.statusMessage || playback.errorMessage || ' ';

  return (
    <View
      style={[
        styles.container,
        compact && styles.containerCompact,
        {
          backgroundColor: theme.card,
          borderTopColor: theme.divider,
          paddingBottom: Math.max(insets.bottom, compact ? 4 : 8),
        },
      ]}
      pointerEvents="box-none"
    >
      <View style={[styles.content, compact && styles.contentCompact]} pointerEvents="auto">
        {compact ? (
          <View style={styles.compactRow}>
            <Pressable
              onPress={() => setShowReciterModal(true)}
              style={[styles.reciterButtonCompact, { backgroundColor: theme.backgroundSecondary }]}
            >
              <MaterialIcons name="person" size={14} color={theme.tint} />
              <CenteredText
                style={[styles.reciterNameCompact, { color: theme.text }]}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {RECITERS[currentReciter].name}
              </CenteredText>
            </Pressable>

            <CenteredText
              style={[styles.ayahInfoCompact, { color: theme.textSecondary }]}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {toArabicNumerals(surahNumber)}:{toArabicNumerals(ayahNumber)}
            </CenteredText>

            <Pressable
              testID="quran-playback-speed"
              onPress={() => setShowSpeedModal(true)}
              style={({ pressed }) => [
                styles.speedButtonCompact,
                { borderColor: theme.divider, backgroundColor: theme.backgroundSecondary },
                pressed && styles.controlButtonPressed,
              ]}
            >
              <CenteredText style={[styles.speedButtonText, { color: theme.text }]}>
                {playbackRate === 1 ? '1x' : `${playbackRate}x`}
              </CenteredText>
            </Pressable>

            <Pressable
              onPress={handlePlayPause}
              disabled={playback.status === 'preparing'}
              style={({ pressed }) => [
                styles.playButtonCompact,
                { backgroundColor: theme.playing, opacity: playback.status === 'preparing' ? 0.75 : 1 },
                pressed && styles.playButtonPressed,
              ]}
            >
              {isPreparing ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <MaterialIcons name={isPlaying ? 'pause' : 'play-arrow'} size={22} color="#fff" />
              )}
            </Pressable>

            <Pressable
              onPress={onStop}
              style={({ pressed }) => [styles.controlButtonCompact, pressed && styles.controlButtonPressed]}
            >
              <MaterialIcons name="stop" size={22} color={theme.icon} />
            </Pressable>

            <Pressable
              onPress={handleClose}
              style={({ pressed }) => [styles.controlButtonCompact, pressed && styles.controlButtonPressed]}
            >
              <MaterialIcons name="close" size={22} color={theme.icon} />
            </Pressable>
          </View>
        ) : (
          <>
            <Pressable
              onPress={() => setShowReciterModal(true)}
              style={[styles.reciterButton, { backgroundColor: theme.backgroundSecondary }]}
            >
              <MaterialIcons name="person" size={15} color={theme.tint} />
              <View style={styles.reciterTextWrap}>
                <CenteredText
                  style={[styles.reciterName, { color: theme.text }]}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {RECITERS[currentReciter].name}
                </CenteredText>
              </View>
              <MaterialIcons name="arrow-drop-down" size={16} color={theme.icon} />
            </Pressable>

            <View style={styles.bottomRow}>
              <CenteredText
                style={[styles.ayahInfo, { color: theme.textSecondary }]}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                سوره {toArabicNumerals(surahNumber)} · آیه {toArabicNumerals(ayahNumber)}
              </CenteredText>

              <View style={styles.controlsSection}>
                <Pressable
                  testID="quran-playback-speed"
                  onPress={() => setShowSpeedModal(true)}
                  style={({ pressed }) => [
                    styles.speedButton,
                    { borderColor: theme.divider, backgroundColor: theme.backgroundSecondary },
                    pressed && styles.controlButtonPressed,
                  ]}
                >
                  <CenteredText style={[styles.speedButtonText, { color: theme.text }]}>
                    {playbackRate === 1 ? '1x' : `${playbackRate}x`}
                  </CenteredText>
                </Pressable>

                <Pressable
                  onPress={handlePlayPause}
                  disabled={playback.status === 'preparing'}
                  style={({ pressed }) => [
                    styles.playButton,
                    {
                      backgroundColor: theme.playing,
                      opacity: playback.status === 'preparing' ? 0.75 : 1,
                    },
                    pressed && styles.playButtonPressed,
                  ]}
                >
                  {isPreparing ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <MaterialIcons name={isPlaying ? 'pause' : 'play-arrow'} size={26} color="#fff" />
                  )}
                </Pressable>

                <Pressable
                  onPress={onStop}
                  style={({ pressed }) => [styles.controlButton, pressed && styles.controlButtonPressed]}
                >
                  <MaterialIcons name="stop" size={24} color={theme.icon} />
                </Pressable>

                <Pressable
                  onPress={handleClose}
                  style={({ pressed }) => [styles.controlButton, pressed && styles.controlButtonPressed]}
                >
                  <MaterialIcons name="close" size={24} color={theme.icon} />
                </Pressable>
              </View>
            </View>
            <CenteredText
              style={[
                styles.statusText,
                { color: playback.status === 'error' ? '#DC2626' : theme.textSecondary },
              ]}
              numberOfLines={1}
            >
              {statusText}
            </CenteredText>
          </>
        )}
      </View>

      <Modal
        visible={showReciterModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowReciterModal(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowReciterModal(false)}>
          <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
            <CenteredText style={[styles.modalTitle, { color: theme.text }]}>انتخاب قاری</CenteredText>
            <CenteredText style={[styles.modalSubtitle, { color: theme.textSecondary }]}>
              برای تغییر قاری، یکی از گزینه‌ها را انتخاب کنید
            </CenteredText>

            {Object.values(RECITERS).map((reciter) => (
              <Pressable
                key={reciter.key}
                onPress={() => void handleReciterChange(reciter.key)}
                style={[
                  styles.modalOption,
                  { borderBottomColor: theme.divider },
                  currentReciter === reciter.key && { backgroundColor: theme.backgroundSecondary },
                ]}
              >
                <CenteredText style={[styles.reciterOptionName, { color: theme.text }]}>
                  {reciter.name}
                </CenteredText>
                {currentReciter === reciter.key && (
                  <MaterialIcons name="check" size={24} color={theme.tint} />
                )}
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>

      <Modal
        visible={showSpeedModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSpeedModal(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowSpeedModal(false)}>
          <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
            <CenteredText style={[styles.modalTitle, { color: theme.text }]}>سرعت پخش</CenteredText>
            <View style={styles.speedOptions}>
              {QURAN_PLAYBACK_RATES.map((rate) => (
                <Pressable
                  key={rate}
                  testID={`quran-playback-speed-${rate}`}
                  onPress={() => void handleRateChange(rate)}
                  style={[
                    styles.speedOption,
                    {
                      borderColor: rate === playbackRate ? theme.tint : theme.divider,
                      backgroundColor: rate === playbackRate ? `${theme.tint}22` : theme.backgroundSecondary,
                    },
                  ]}
                >
                  <CenteredText style={[styles.speedOptionText, { color: rate === playbackRate ? theme.tint : theme.text }]}>
                    {rate === 1 ? '1x' : `${rate}x`}
                  </CenteredText>
                </Pressable>
              ))}
            </View>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopWidth: 1,
  },
  containerCompact: {
    elevation: 24,
    zIndex: 200,
  },
  content: {
    flexDirection: 'column',
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.xs,
    paddingBottom: Spacing.xs,
    minHeight: 122,
    gap: 5,
  },
  contentCompact: {
    minHeight: 52,
    paddingTop: 6,
    paddingBottom: 4,
    gap: 0,
  },
  compactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  reciterButtonCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
    maxWidth: 110,
    minHeight: 32,
    paddingHorizontal: 8,
    borderRadius: BorderRadius.sm,
    gap: 4,
  },
  reciterNameCompact: {
    flexShrink: 1,
    fontSize: 11,
    fontFamily: 'Vazirmatn',
    fontWeight: '600',
  },
  ayahInfoCompact: {
    flexShrink: 0,
    fontSize: 12,
    fontFamily: 'Vazirmatn',
    fontWeight: '700',
    minWidth: 44,
    textAlign: 'center',
  },
  speedButtonCompact: {
    minWidth: 36,
    height: 32,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  playButtonCompact: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  controlButtonCompact: {
    padding: 6,
    borderRadius: BorderRadius.full,
  },
  reciterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    minHeight: 36,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
    gap: Spacing.xs,
  },
  reciterTextWrap: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reciterName: {
    fontSize: 12,
    fontFamily: 'Vazirmatn',
    fontWeight: '600',
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  ayahInfo: {
    flex: 1,
    minWidth: 0,
    fontSize: Typography.ui.caption,
    fontWeight: '600',
    fontFamily: 'Vazirmatn',
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  controlsSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 0,
    gap: 5,
  },
  statusText: {
    fontFamily: 'Vazirmatn',
    fontSize: 11,
    lineHeight: 16,
    minHeight: 16,
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  speedButton: {
    minWidth: 42,
    height: 34,
    borderRadius: 17,
    borderWidth: StyleSheet.hairlineWidth,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  speedButtonText: {
    fontFamily: 'Vazirmatn',
    fontSize: 11,
    fontWeight: '800',
    textAlign: 'center',
  },
  playButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playButtonPressed: {
    opacity: 0.8,
  },
  controlButton: {
    padding: 8,
    borderRadius: BorderRadius.full,
  },
  controlButtonPressed: {
    opacity: 0.7,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '80%',
    maxWidth: 320,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
  },
  modalTitle: {
    fontSize: Typography.ui.subtitle,
    fontWeight: '700',
    textAlign: 'center',
    paddingTop: Spacing.md,
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.xs,
    fontFamily: 'Vazirmatn',
  },
  modalSubtitle: {
    textAlign: 'center',
    fontSize: Typography.ui.caption,
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm,
    fontFamily: 'Vazirmatn',
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.md,
    borderBottomWidth: 1,
    gap: Spacing.sm,
  },
  reciterOptionName: {
    flex: 1,
    fontSize: Typography.ui.body,
    fontWeight: '600',
    fontFamily: 'Vazirmatn',
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  speedOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
  },
  speedOption: {
    minWidth: 58,
    height: 40,
    borderWidth: 1,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.sm,
  },
  speedOptionText: {
    fontFamily: 'Vazirmatn',
    fontSize: Typography.ui.caption,
    fontWeight: '800',
    textAlign: 'center',
  },
});
