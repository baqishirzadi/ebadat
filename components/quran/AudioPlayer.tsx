/**
 * AudioPlayer Component
 * Simple ayah-by-ayah controls with reciter switch
 */

import CenteredText from '@/components/CenteredText';
import { BorderRadius, Spacing, Typography } from '@/constants/theme';
import { useApp } from '@/context/AppContext';
import audioManager, { ReciterKey, RECITERS, getQuranPlaybackErrorMessage } from '@/utils/quranAudio';
import { toArabicNumerals } from '@/utils/numbers';
import { MaterialIcons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Modal, Pressable, StyleSheet, View } from 'react-native';

interface AudioPlayerProps {
  surahNumber: number;
  ayahNumber: number;
  totalAyahs: number;
  isVisible?: boolean;
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
  isPlaying,
  onPlayContinuous,
  onPause,
  onResume,
  onStop,
  onClose,
}: AudioPlayerProps) {
  const { theme } = useApp();
  const [currentReciter, setCurrentReciter] = useState<ReciterKey>('ghamidi');
  const [showReciterModal, setShowReciterModal] = useState(false);

  useEffect(() => {
    setCurrentReciter(audioManager.getReciter());
  }, []);

  const handleReciterChange = useCallback(
    async (reciter: ReciterKey) => {
      setShowReciterModal(false);
      if (reciter === currentReciter) return;

      try {
        await audioManager.setReciter(reciter);
        setCurrentReciter(reciter);
        await audioManager.playAyah(surahNumber, ayahNumber, totalAyahs, isPlaying);
      } catch (error) {
        Alert.alert('پخش آیه', getQuranPlaybackErrorMessage(error));
      }
    },
    [currentReciter, isPlaying, surahNumber, ayahNumber, totalAyahs]
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

  const handleClose = useCallback(() => {
    onStop();
    onClose?.();
  }, [onStop, onClose]);

  if (!isVisible) return null;

  return (
    <View style={[styles.container, { backgroundColor: theme.card, borderTopColor: theme.divider }]}>
      <View style={styles.content}>
        <View style={styles.leftSection}>
          <Pressable
            onPress={() => setShowReciterModal(true)}
            style={[styles.reciterButton, { backgroundColor: theme.backgroundSecondary }]}
          >
            <MaterialIcons name="person" size={16} color={theme.tint} />
            <CenteredText style={[styles.reciterName, { color: theme.text }]}>
              {RECITERS[currentReciter].name}
            </CenteredText>
            <MaterialIcons name="arrow-drop-down" size={18} color={theme.icon} />
          </Pressable>

          <CenteredText style={[styles.ayahInfo, { color: theme.textSecondary }]}>
            سوره {toArabicNumerals(surahNumber)} · آیه {toArabicNumerals(ayahNumber)}
          </CenteredText>
        </View>

        <View style={styles.controlsSection}>
          <Pressable
            onPress={handlePlayPause}
            style={({ pressed }) => [
              styles.playButton,
              { backgroundColor: theme.playing },
              pressed && styles.playButtonPressed,
            ]}
          >
            <MaterialIcons name={isPlaying ? 'pause' : 'play-arrow'} size={30} color="#fff" />
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

      <Modal
        visible={showReciterModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowReciterModal(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowReciterModal(false)}>
          <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
            <CenteredText style={[styles.modalTitle, { color: theme.text }]}>انتخاب قاری</CenteredText>

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
    paddingBottom: 34,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  leftSection: {
    flex: 1,
    alignItems: 'flex-start',
    gap: 6,
  },
  reciterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
    gap: 4,
  },
  reciterName: {
    fontSize: 12,
    fontFamily: 'Vazirmatn',
    fontWeight: '600',
  },
  ayahInfo: {
    fontSize: Typography.ui.body,
    fontWeight: '600',
    fontFamily: 'Vazirmatn',
  },
  controlsSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  playButton: {
    width: 54,
    height: 54,
    borderRadius: 27,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playButtonPressed: {
    opacity: 0.8,
  },
  controlButton: {
    padding: Spacing.sm,
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
    padding: Spacing.md,
    fontFamily: 'Vazirmatn',
  },
  modalOption: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
    borderBottomWidth: 1,
  },
  reciterOptionName: {
    fontSize: Typography.ui.body,
    fontWeight: '600',
    fontFamily: 'Vazirmatn',
  },
});
