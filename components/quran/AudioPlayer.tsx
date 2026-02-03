/**
 * AudioPlayer Component
 * Enhanced audio player with dual reciters: Ghamidi & Muaiqly
 * Features: Speed control, repeat modes, reciter switching
 */

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { View, StyleSheet, Pressable, ActivityIndicator, Modal, Text } from 'react-native';
import CenteredText from '@/components/CenteredText';
import { MaterialIcons } from '@expo/vector-icons';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  withRepeat,
  Easing,
} from 'react-native-reanimated';
import { useApp } from '@/context/AppContext';
import { Typography, Spacing, BorderRadius } from '@/constants/theme';
import {
  getQuranAudioManager,
  QuranAudioManager,
  AudioStatus,
  ReciterId,
  RECITERS,
  PLAYBACK_SPEEDS,
  REPEAT_MODES,
} from '@/utils/quranAudio';

interface AudioPlayerProps {
  surahNumber: number;
  ayahNumber: number;
  isVisible?: boolean;
  onAyahComplete?: () => void;
  onClose?: () => void;
}

// Arabic number conversion
const toArabicNumber = (num: number): string => {
  const arabicNumerals = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  return num.toString().split('').map(d => arabicNumerals[parseInt(d)]).join('');
};

// Format time in mm:ss with Arabic numerals
const formatTime = (milliseconds: number): string => {
  const totalSeconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${toArabicNumber(minutes)}:${seconds.toString().padStart(2, '0').split('').map(d => toArabicNumber(parseInt(d))).join('')}`;
};

export function AudioPlayer({
  surahNumber,
  ayahNumber,
  isVisible = true,
  onAyahComplete,
  onClose,
}: AudioPlayerProps) {
  const { theme } = useApp();
  const audioManagerRef = useRef<QuranAudioManager | null>(null);
  
  const [audioStatus, setAudioStatus] = useState<AudioStatus>({
    isPlaying: false,
    isLoading: false,
    position: 0,
    duration: 0,
    isBuffering: false,
  });
  
  const [currentReciter, setCurrentReciter] = useState<ReciterId>('ghamidi');
  const [currentSpeed, setCurrentSpeed] = useState(1.0);
  const [repeatMode, setRepeatMode] = useState<'none' | 'ayah' | 'surah'>('none');
  const [showReciterModal, setShowReciterModal] = useState(false);
  const [showSpeedModal, setShowSpeedModal] = useState(false);

  // Animated pulse for playing state
  const pulseScale = useSharedValue(1);
  
  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }));

  useEffect(() => {
    if (audioStatus.isPlaying) {
      pulseScale.value = withRepeat(
        withTiming(1.1, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
        -1,
        true
      );
    } else {
      pulseScale.value = withTiming(1);
    }
  }, [audioStatus.isPlaying, pulseScale]);

  // Initialize audio manager (runs once on mount)
  useEffect(() => {
    const manager = getQuranAudioManager();
    audioManagerRef.current = manager;
    manager.setOnStatusUpdate(setAudioStatus);
    setCurrentReciter(manager.getReciter());
  }, []);

  // Set ayah complete callback (runs when callback or repeatMode changes)
  useEffect(() => {
    if (audioManagerRef.current) {
      audioManagerRef.current.setOnAyahComplete(() => {
        if (repeatMode !== 'ayah') {
          onAyahComplete?.();
        }
      });
    }
  }, [repeatMode, onAyahComplete]);

  // Play ayah when surah/ayah changes
  useEffect(() => {
    if (audioManagerRef.current) {
      audioManagerRef.current.playAyah(surahNumber, ayahNumber);
    }
  }, [surahNumber, ayahNumber]);

  // Cleanup only on unmount
  useEffect(() => {
    return () => {
      audioManagerRef.current?.unload();
    };
  }, []);

  // Update repeat mode in manager
  useEffect(() => {
    audioManagerRef.current?.setRepeatMode(repeatMode);
  }, [repeatMode]);

  // Toggle play/pause
  const handlePlayPause = useCallback(async () => {
    if (!audioManagerRef.current) return;
    
    if (audioStatus.isPlaying) {
      await audioManagerRef.current.pause();
    } else {
      await audioManagerRef.current.resume();
    }
  }, [audioStatus.isPlaying]);

  // Seek backward 5 seconds
  const handleSeekBackward = useCallback(async () => {
    await audioManagerRef.current?.seekBackward();
  }, []);

  // Seek forward 5 seconds
  const handleSeekForward = useCallback(async () => {
    await audioManagerRef.current?.seekForward();
  }, []);

  // Change reciter
  const handleReciterChange = useCallback(async (reciter: ReciterId) => {
    if (!audioManagerRef.current) return;
    
    setCurrentReciter(reciter);
    await audioManagerRef.current.setReciter(reciter);
    setShowReciterModal(false);
    
    // Replay current ayah with new reciter
    await audioManagerRef.current.playAyah(surahNumber, ayahNumber);
  }, [surahNumber, ayahNumber]);

  // Change speed
  const handleSpeedChange = useCallback(async (speed: number) => {
    if (!audioManagerRef.current) return;
    
    setCurrentSpeed(speed);
    await audioManagerRef.current.setSpeed(speed);
    setShowSpeedModal(false);
  }, []);

  // Cycle repeat mode
  const handleRepeatCycle = useCallback(() => {
    const modes: Array<'none' | 'ayah' | 'surah'> = ['none', 'ayah', 'surah'];
    const currentIndex = modes.indexOf(repeatMode);
    const nextIndex = (currentIndex + 1) % modes.length;
    setRepeatMode(modes[nextIndex]);
  }, [repeatMode]);

  // Close player
  const handleClose = useCallback(async () => {
    await audioManagerRef.current?.unload();
    onClose?.();
  }, [onClose]);

  if (!isVisible) return null;

  const progressPercent = audioStatus.duration > 0 
    ? (audioStatus.position / audioStatus.duration) * 100 
    : 0;

  const reciterInfo = RECITERS[currentReciter];
  const repeatIcon = repeatMode === 'ayah' ? 'repeat-one' : 'repeat';
  const repeatColor = repeatMode !== 'none' ? theme.tint : theme.icon;

  return (
    <Animated.View style={[styles.container, { backgroundColor: theme.card, borderTopColor: theme.divider }]}>
      {/* Progress Bar */}
      <View style={[styles.progressBar, { backgroundColor: theme.backgroundSecondary }]}>
        <View
          style={[
            styles.progressFill,
            { backgroundColor: theme.playing, width: `${progressPercent}%` },
          ]}
        />
      </View>

      {/* Main Content */}
      <View style={styles.content}>
        {/* Left Section: Reciter & Info */}
        <View style={styles.leftSection}>
          <Pressable
            onPress={() => setShowReciterModal(true)}
            style={[styles.reciterButton, { backgroundColor: theme.backgroundSecondary }]}
          >
            <MaterialIcons name="person" size={16} color={theme.tint} />
            <CenteredText style={[styles.reciterName, { color: theme.text }]}>
              {reciterInfo.nameArabic}
            </CenteredText>
            <MaterialIcons name="arrow-drop-down" size={18} color={theme.icon} />
          </Pressable>
          
          <CenteredText style={[styles.ayahInfo, { color: theme.textSecondary }]}>
            آیه {toArabicNumber(ayahNumber)}
          </CenteredText>
          
          <CenteredText style={[styles.timeText, { color: theme.textSecondary }]}>
            {formatTime(audioStatus.position)} / {formatTime(audioStatus.duration)}
          </CenteredText>
        </View>

        {/* Center Section: Main Controls */}
        <View style={styles.controlsSection}>
          {/* Seek Backward */}
          <Pressable
            onPress={handleSeekBackward}
            style={({ pressed }) => [styles.controlButton, pressed && styles.controlButtonPressed]}
          >
            <MaterialIcons name="replay-5" size={28} color={theme.icon} />
          </Pressable>

          {/* Play/Pause */}
          <Animated.View style={pulseStyle}>
            <Pressable
              onPress={handlePlayPause}
              disabled={audioStatus.isLoading}
              style={({ pressed }) => [
                styles.playButton,
                { backgroundColor: theme.playing },
                pressed && styles.playButtonPressed,
              ]}
            >
              {audioStatus.isLoading || audioStatus.isBuffering ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <MaterialIcons
                  name={audioStatus.isPlaying ? 'pause' : 'play-arrow'}
                  size={32}
                  color="#fff"
                />
              )}
            </Pressable>
          </Animated.View>

          {/* Seek Forward */}
          <Pressable
            onPress={handleSeekForward}
            style={({ pressed }) => [styles.controlButton, pressed && styles.controlButtonPressed]}
          >
            <MaterialIcons name="forward-5" size={28} color={theme.icon} />
          </Pressable>
        </View>

        {/* Right Section: Extra Controls */}
        <View style={styles.rightSection}>
          {/* Speed Control */}
          <Pressable
            onPress={() => setShowSpeedModal(true)}
            style={[styles.miniButton, { backgroundColor: theme.backgroundSecondary }]}
          >
            <CenteredText style={[styles.speedText, { color: theme.text }]}>
              {PLAYBACK_SPEEDS.find(s => s.value === currentSpeed)?.label || '۱×'}
            </CenteredText>
          </Pressable>

          {/* Repeat */}
          <Pressable
            onPress={handleRepeatCycle}
            style={({ pressed }) => [styles.controlButton, pressed && styles.controlButtonPressed]}
          >
            <MaterialIcons name={repeatIcon} size={24} color={repeatColor} />
          </Pressable>

          {/* Close */}
          <Pressable
            onPress={handleClose}
            style={({ pressed }) => [styles.closeButton, pressed && styles.closeButtonPressed]}
          >
            <MaterialIcons name="close" size={24} color={theme.icon} />
          </Pressable>
        </View>
      </View>

      {/* Error Message */}
      {audioStatus.error && (
        <View style={styles.errorContainer}>
          <CenteredText style={[styles.errorText, { color: theme.textSecondary }]}>
            {audioStatus.error}
          </CenteredText>
        </View>
      )}

      {/* Reciter Selection Modal */}
      <Modal
        visible={showReciterModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowReciterModal(false)}
      >
        <Pressable 
          style={styles.modalOverlay}
          onPress={() => setShowReciterModal(false)}
        >
          <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
            <CenteredText style={[styles.modalTitle, { color: theme.text }]}>انتخاب قاری</CenteredText>
            
            {Object.values(RECITERS).map((reciter) => (
              <Pressable
                key={reciter.id}
                onPress={() => handleReciterChange(reciter.id)}
                style={[
                  styles.modalOption,
                  { borderBottomColor: theme.divider },
                  currentReciter === reciter.id && { backgroundColor: theme.backgroundSecondary },
                ]}
              >
                <View style={styles.reciterOptionInfo}>
                  <CenteredText style={[styles.reciterOptionName, { color: theme.text }]}>
                    {reciter.nameArabic}
                  </CenteredText>
                  <CenteredText style={[styles.reciterOptionQuality, { color: theme.textSecondary }]}>
                    {reciter.quality}
                  </CenteredText>
                </View>
                {currentReciter === reciter.id && (
                  <MaterialIcons name="check" size={24} color={theme.tint} />
                )}
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>

      {/* Speed Selection Modal */}
      <Modal
        visible={showSpeedModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSpeedModal(false)}
      >
        <Pressable 
          style={styles.modalOverlay}
          onPress={() => setShowSpeedModal(false)}
        >
          <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
            <CenteredText style={[styles.modalTitle, { color: theme.text }]}>سرعت پخش</CenteredText>
            
            {PLAYBACK_SPEEDS.map((speed) => (
              <Pressable
                key={speed.value}
                onPress={() => handleSpeedChange(speed.value)}
                style={[
                  styles.modalOption,
                  { borderBottomColor: theme.divider },
                  currentSpeed === speed.value && { backgroundColor: theme.backgroundSecondary },
                ]}
              >
                <View style={styles.speedOptionInfo}>
                  <CenteredText style={[styles.speedOptionLabel, { color: theme.text }]}>
                    {speed.labelDari}
                  </CenteredText>
                  <CenteredText style={[styles.speedOptionValue, { color: theme.textSecondary }]}>
                    {speed.label}
                  </CenteredText>
                </View>
                {currentSpeed === speed.value && (
                  <MaterialIcons name="check" size={24} color={theme.tint} />
                )}
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopWidth: 1,
    paddingBottom: 34, // Safe area
  },
  progressBar: {
    height: 4,
    width: '100%',
  },
  progressFill: {
    height: '100%',
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
    marginTop: 4,
  },
  timeText: {
    fontSize: Typography.ui.caption,
    fontFamily: 'Vazirmatn',
    marginTop: 2,
  },
  controlsSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  controlButton: {
    padding: Spacing.sm,
    borderRadius: BorderRadius.full,
  },
  controlButtonPressed: {
    opacity: 0.7,
  },
  playButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playButtonPressed: {
    opacity: 0.8,
  },
  rightSection: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: Spacing.xs,
  },
  miniButton: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
  },
  speedText: {
    fontSize: 12,
    fontFamily: 'Vazirmatn',
    fontWeight: '600',
  },
  closeButton: {
    padding: Spacing.sm,
    borderRadius: BorderRadius.full,
  },
  closeButtonPressed: {
    opacity: 0.7,
  },
  errorContainer: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  errorText: {
    fontSize: Typography.ui.caption,
    textAlign: 'center',
    fontFamily: 'Vazirmatn',
  },
  
  // Modal Styles
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
  reciterOptionInfo: {
    alignItems: 'flex-end',
  },
  reciterOptionName: {
    fontSize: Typography.ui.body,
    fontWeight: '600',
    fontFamily: 'Vazirmatn',
  },
  reciterOptionQuality: {
    fontSize: Typography.ui.caption,
    marginTop: 2,
  },
  speedOptionInfo: {
    alignItems: 'flex-end',
  },
  speedOptionLabel: {
    fontSize: Typography.ui.body,
    fontWeight: '600',
    fontFamily: 'Vazirmatn',
  },
  speedOptionValue: {
    fontSize: Typography.ui.caption,
    marginTop: 2,
  },
});
