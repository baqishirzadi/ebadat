/**
 * AudioPlayer Component
 * Simple ayah-by-ayah controls with reciter switch
 */

import CenteredText from '@/components/CenteredText';
import { BorderRadius, Spacing, Typography } from '@/constants/theme';
import { useApp } from '@/context/AppContext';
import type { QuranReaderTokens } from '@/hooks/useQuranReaderSettings';
import audioManager, {
  ReciterKey,
  RECITERS,
  QURAN_PLAYBACK_RATES,
  type QuranPlaybackRate,
  QuranPlaybackScopeType,
  type QuranPlaybackSnapshot,
  getQuranPlaybackErrorMessage,
  DEFAULT_QURAN_RECITER,
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
  /** Page-tone palette shared with the active Quran reader. */
  readerTokens?: QuranReaderTokens;
  isPlaying: boolean;
  /** Reports the rendered bar height so the reader can pad content exactly. */
  onHeightChange?: (height: number) => void;
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
  readerTokens,
  scopeType = 'surah',
  scopeStartAyah = 1,
  scopeEndAyah,
  juzNumber = null,
  isPlaying,
  onHeightChange,
  onPlayContinuous,
  onPause,
  onResume,
  onStop,
  onClose,
}: AudioPlayerProps) {
  const { theme } = useApp();
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const [currentReciter, setCurrentReciter] = useState<ReciterKey>(() => audioManager.getReciter() || DEFAULT_QURAN_RECITER);
  const [showReciterModal, setShowReciterModal] = useState(false);
  const [showSpeedModal, setShowSpeedModal] = useState(false);
  const [playback, setPlayback] = useState<QuranPlaybackSnapshot>(() => audioManager.getPlaybackSnapshot());
  const [playbackRate, setPlaybackRate] = useState<QuranPlaybackRate>(() => audioManager.getPlaybackRate());
  const palette = readerTokens ?? {
    page: theme.background,
    surface: theme.backgroundSecondary,
    border: theme.cardBorder,
    text: theme.text,
    textSecondary: theme.textSecondary,
    accent: theme.tint,
    divider: theme.divider,
  };

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
  // Preparing and buffering copy sits under the controls and changes the
  // player height, so the page jumps up and back down. The spinner on the
  // play button is the loading indicator. Errors stay, because they are rare.
  const statusText = playback.errorMessage ?? '';

  return (
    <View
      style={[
        styles.container,
        compact && styles.containerCompact,
        {
          backgroundColor: palette.page,
          borderTopColor: palette.divider,
          paddingBottom: compact ? insets.bottom : Math.max(insets.bottom - 6, 0),
        },
      ]}
      pointerEvents="box-none"
      onLayout={(event) => onHeightChange?.(event.nativeEvent.layout.height)}
    >
      <View style={[styles.content, compact && styles.contentCompact]} pointerEvents="auto">
        {compact ? (
          <View style={styles.compactRow}>
            <Pressable
              testID="quran-audio-toggle"
              onPress={handlePlayPause}
              disabled={playback.status === 'preparing'}
              style={({ pressed }) => [
                styles.playButtonCompact,
                { backgroundColor: palette.accent, opacity: playback.status === 'preparing' ? 0.75 : 1 },
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
              onPress={() => setShowReciterModal(true)}
              style={[styles.reciterButtonCompact, { backgroundColor: palette.surface }]}
            >
              <MaterialIcons name="person" size={15} color={palette.accent} />
              <CenteredText
                style={[styles.reciterNameCompact, { color: palette.text }]}
                numberOfLines={1}
              >
                {RECITERS[currentReciter].name}
              </CenteredText>
              <MaterialIcons name="arrow-drop-down" size={16} color={palette.accent} />
            </Pressable>

            <CenteredText
              testID="quran-audio-current-ayah"
              style={[styles.ayahInfoCompact, { color: palette.textSecondary }]}
              numberOfLines={1}
            >
              {toArabicNumerals(surahNumber)}:{toArabicNumerals(ayahNumber)}
            </CenteredText>

            <Pressable
              testID="quran-playback-speed"
              onPress={() => setShowSpeedModal(true)}
              style={({ pressed }) => [
                styles.speedButtonCompact,
                { borderColor: palette.divider, backgroundColor: palette.surface },
                pressed && styles.controlButtonPressed,
              ]}
            >
              <CenteredText style={[styles.speedButtonText, { color: palette.text }]}>
                {playbackRate === 1 ? '1x' : `${playbackRate}x`}
              </CenteredText>
            </Pressable>

            <Pressable
              onPress={onStop}
              style={({ pressed }) => [styles.controlButtonCompact, pressed && styles.controlButtonPressed]}
            >
              <MaterialIcons name="stop" size={20} color={palette.accent} />
            </Pressable>

            <Pressable
              testID="quran-audio-close"
              onPress={handleClose}
              style={({ pressed }) => [styles.controlButtonCompact, pressed && styles.controlButtonPressed]}
            >
              <MaterialIcons name="close" size={20} color={palette.accent} />
            </Pressable>
          </View>
        ) : (
          <>
            <Pressable
              onPress={() => setShowReciterModal(true)}
              style={[styles.reciterButton, { backgroundColor: palette.surface }]}
            >
              <MaterialIcons name="person" size={15} color={palette.accent} />
              <View style={styles.reciterTextWrap}>
                <CenteredText
                  style={[styles.reciterName, { color: palette.text }]}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {RECITERS[currentReciter].name}
                </CenteredText>
              </View>
              <MaterialIcons name="arrow-drop-down" size={16} color={palette.accent} />
            </Pressable>

            <View style={styles.bottomRow}>
            <CenteredText
              testID="quran-audio-current-ayah"
              style={[styles.ayahInfo, { color: palette.textSecondary }]}
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
                    { borderColor: palette.divider, backgroundColor: palette.surface },
                    pressed && styles.controlButtonPressed,
                  ]}
                >
                  <CenteredText style={[styles.speedButtonText, { color: palette.text }]}>
                    {playbackRate === 1 ? '1x' : `${playbackRate}x`}
                  </CenteredText>
                </Pressable>

                <Pressable
                  testID="quran-audio-toggle"
                  onPress={handlePlayPause}
                  disabled={playback.status === 'preparing'}
                  style={({ pressed }) => [
                    styles.playButton,
                    {
                      backgroundColor: palette.accent,
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
                  <MaterialIcons name="stop" size={24} color={palette.accent} />
                </Pressable>

                <Pressable
                  testID="quran-audio-close"
                  onPress={handleClose}
                  style={({ pressed }) => [styles.controlButton, pressed && styles.controlButtonPressed]}
                >
                  <MaterialIcons name="close" size={24} color={palette.accent} />
                </Pressable>
              </View>
            </View>
            {statusText ? (
              <CenteredText
                style={[
                  styles.statusText,
                  { color: playback.status === 'error' ? '#DC2626' : palette.textSecondary },
                ]}
                numberOfLines={1}
              >
                {statusText}
              </CenteredText>
            ) : null}
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
          <View style={[styles.modalContent, { backgroundColor: palette.page }]}>
            <CenteredText style={[styles.modalTitle, { color: palette.text }]}>انتخاب قاری</CenteredText>
            <CenteredText style={[styles.modalSubtitle, { color: palette.textSecondary }]}>
              برای تغییر قاری، یکی از گزینه‌ها را انتخاب کنید
            </CenteredText>

            {Object.values(RECITERS).map((reciter) => (
              <Pressable
                key={reciter.key}
                onPress={() => void handleReciterChange(reciter.key)}
                style={[
                  styles.modalOption,
                  { borderBottomColor: palette.divider },
                  currentReciter === reciter.key && { backgroundColor: palette.surface },
                ]}
              >
                <CenteredText style={[styles.reciterOptionName, { color: palette.text }]}>
                  {reciter.name}
                </CenteredText>
                {currentReciter === reciter.key && (
                  <MaterialIcons name="check" size={24} color={palette.accent} />
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
          <View style={[styles.modalContent, { backgroundColor: palette.page }]}>
            <CenteredText style={[styles.modalTitle, { color: palette.text }]}>سرعت پخش</CenteredText>
            <View style={styles.speedOptions}>
              {QURAN_PLAYBACK_RATES.map((rate) => (
                <Pressable
                  key={rate}
                  testID={`quran-playback-speed-${rate}`}
                  onPress={() => void handleRateChange(rate)}
                  style={[
                    styles.speedOption,
                    {
                      borderColor: rate === playbackRate ? palette.accent : palette.divider,
                      backgroundColor: rate === playbackRate ? `${palette.accent}22` : palette.surface,
                    },
                  ]}
                >
                  <CenteredText style={[styles.speedOptionText, { color: rate === playbackRate ? palette.accent : palette.text }]}>
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
    paddingTop: 2,
    paddingBottom: 0,
    gap: 2,
  },
  contentCompact: {
    minHeight: 48,
    paddingTop: 4,
    paddingBottom: 4,
    gap: 0,
  },
  compactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 40,
  },
  reciterButtonCompact: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 0,
    minHeight: 36,
    paddingHorizontal: 8,
    borderRadius: BorderRadius.sm,
    gap: 4,
  },
  reciterNameCompact: {
    flex: 1,
    minWidth: 0,
    fontSize: 14,
    lineHeight: 20,
    fontFamily: 'Vazirmatn',
    fontWeight: '700',
    textAlign: 'center',
  },
  ayahInfoCompact: {
    flexShrink: 0,
    fontSize: 12,
    fontFamily: 'Vazirmatn',
    fontWeight: '700',
    minWidth: 40,
    textAlign: 'center',
  },
  speedButtonCompact: {
    minWidth: 34,
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
    padding: 4,
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
