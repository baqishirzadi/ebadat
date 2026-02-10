/**
 * Dhikr Counter Screen
 * Digital tasbih with haptic feedback
 */

import React, { useState, useCallback } from 'react';
import { View, StyleSheet, Pressable, Dimensions } from 'react-native';
import { Stack } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withSequence,
} from 'react-native-reanimated';
import { MaterialIcons } from '@expo/vector-icons';
import { useApp } from '@/context/AppContext';
import { useStats } from '@/context/StatsContext';
import { Typography, Spacing, BorderRadius } from '@/constants/theme';
import CenteredText from '@/components/CenteredText';

const { width } = Dimensions.get('window');

// Arabic number conversion
const toArabicNumber = (num: number): string => {
  const arabicNumerals = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  return num.toString().split('').map(d => arabicNumerals[parseInt(d)]).join('');
};

// Common dhikr options
const DHIKR_OPTIONS = [
  { arabic: 'سُبْحَانَ اللَّهِ', dari: 'پاک است خدا', target: 33 },
  { arabic: 'الْحَمْدُ لِلَّهِ', dari: 'ستایش خداست', target: 33 },
  { arabic: 'اللَّهُ أَكْبَرُ', dari: 'خدا بزرگ‌تر است', target: 34 },
  { arabic: 'لَا إِلَٰهَ إِلَّا اللَّهُ', dari: 'معبودی جز خدا نیست', target: 100 },
  { arabic: 'أَسْتَغْفِرُ اللَّهَ', dari: 'از خدا آمرزش می‌خواهم', target: 100 },
  { arabic: 'صَلَّى اللَّهُ عَلَيْهِ وَسَلَّمَ', dari: 'صلوات', target: 100 },
];

export default function CounterScreen() {
  const { theme } = useApp();
  const { addDhikr } = useStats();
  const [count, setCount] = useState(0);
  const [selectedDhikr, setSelectedDhikr] = useState(DHIKR_OPTIONS[0]);
  const [showOptions, setShowOptions] = useState(false);

  const scale = useSharedValue(1);
  const counterScale = useSharedValue(1);

  const handleTap = useCallback(() => {
    // Animate
    scale.value = withSequence(
      withSpring(0.95, { damping: 10, stiffness: 400 }),
      withSpring(1, { damping: 10, stiffness: 400 })
    );
    counterScale.value = withSequence(
      withSpring(1.1, { damping: 10, stiffness: 400 }),
      withSpring(1, { damping: 10, stiffness: 400 })
    );

    // Haptic
    if ((count + 1) % 33 === 0) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else if ((count + 1) % 10 === 0) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    // Update
    setCount(prev => prev + 1);
    addDhikr(1);
  }, [count, addDhikr, scale, counterScale]);

  const handleReset = useCallback(() => {
    setCount(0);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
  }, []);

  const tapStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const counterStyle = useAnimatedStyle(() => ({
    transform: [{ scale: counterScale.value }],
  }));

  const progress = Math.min((count / selectedDhikr.target) * 100, 100);
  const rounds = Math.floor(count / selectedDhikr.target);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Stack.Screen
        options={{
          title: 'شمارنده ذکر',
          headerStyle: { backgroundColor: theme.surahHeader, borderBottomLeftRadius: 28, borderBottomRightRadius: 28, overflow: 'hidden' },
          headerTintColor: '#fff',
          presentation: 'modal',
        }}
      />

      {/* Dhikr Selector */}
      <Pressable
        onPress={() => setShowOptions(!showOptions)}
        style={[styles.dhikrSelector, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}
      >
        <CenteredText style={[styles.selectedDhikrArabic, { color: theme.arabicText }]}>
          {selectedDhikr.arabic}
        </CenteredText>
        <CenteredText style={[styles.selectedDhikrDari, { color: theme.textSecondary }]}>
          {selectedDhikr.dari}
        </CenteredText>
        <MaterialIcons name="arrow-drop-down" size={24} color={theme.icon} />
      </Pressable>

      {/* Options Dropdown */}
      {showOptions && (
        <View style={[styles.optionsDropdown, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
          {DHIKR_OPTIONS.map((dhikr, index) => (
            <Pressable
              key={index}
              onPress={() => {
                setSelectedDhikr(dhikr);
                setShowOptions(false);
                setCount(0);
              }}
              style={[
                styles.optionItem,
                { borderBottomColor: theme.divider },
                selectedDhikr.arabic === dhikr.arabic && { backgroundColor: `${theme.tint}10` },
              ]}
            >
              <CenteredText style={[styles.optionArabic, { color: theme.text }]}>{dhikr.arabic}</CenteredText>
              <CenteredText style={[styles.optionTarget, { color: theme.textSecondary }]}>
                هدف: {toArabicNumber(dhikr.target)}
              </CenteredText>
            </Pressable>
          ))}
        </View>
      )}

      {/* Counter Display */}
      <View style={styles.counterSection}>
        <Animated.Text style={[styles.counterText, { color: theme.text }, counterStyle]}>
          {toArabicNumber(count)}
        </Animated.Text>
        <CenteredText style={[styles.targetText, { color: theme.textSecondary }]}>
          / {toArabicNumber(selectedDhikr.target)}
        </CenteredText>
        {rounds > 0 && (
          <CenteredText style={[styles.roundsText, { color: theme.tint }]}>
            {toArabicNumber(rounds)} دور کامل
          </CenteredText>
        )}
      </View>

      {/* Progress Ring */}
      <View style={styles.progressContainer}>
        <View style={[styles.progressRing, { borderColor: theme.cardBorder }]}>
          <View
            style={[
              styles.progressFill,
              {
                backgroundColor: theme.tint,
                height: `${progress}%`,
              },
            ]}
          />
        </View>
      </View>

      {/* Tap Area */}
      <Animated.View style={[styles.tapContainer, tapStyle]}>
        <Pressable
          onPress={handleTap}
          style={({ pressed }) => [
            styles.tapArea,
            { backgroundColor: theme.tint },
            pressed && styles.tapAreaPressed,
          ]}
        >
          <MaterialIcons name="touch-app" size={64} color="#fff" />
          <CenteredText style={styles.tapText}>لمس کنید</CenteredText>
        </Pressable>
      </Animated.View>

      {/* Reset Button */}
      <Pressable
        onPress={handleReset}
        style={({ pressed }) => [
          styles.resetButton,
          { backgroundColor: theme.card, borderColor: theme.cardBorder },
          pressed && styles.resetButtonPressed,
        ]}
      >
        <MaterialIcons name="refresh" size={24} color={theme.icon} />
        <CenteredText style={[styles.resetText, { color: theme.text }]}>صفر کردن</CenteredText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    paddingTop: Spacing.lg,
  },
  dhikrSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginHorizontal: Spacing.lg,
  },
  selectedDhikrArabic: {
    fontSize: Typography.arabic.small,
    fontFamily: 'serif',
  },
  selectedDhikrDari: {
    fontSize: Typography.ui.caption,
  },
  optionsDropdown: {
    position: 'absolute',
    top: 80,
    left: Spacing.lg,
    right: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    zIndex: 100,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  optionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.md,
    borderBottomWidth: 1,
  },
  optionArabic: {
    fontSize: Typography.ui.body,
    fontFamily: 'serif',
  },
  optionTarget: {
    fontSize: Typography.ui.caption,
  },
  counterSection: {
    alignItems: 'center',
    marginTop: Spacing.xl,
    marginBottom: Spacing.xl, // Extra space below counter to prevent collision with progress bar
  },
  counterText: {
    fontSize: 80,
    fontWeight: '700',
    marginBottom: Spacing.sm, // Extra space below number
  },
  targetText: {
    fontSize: Typography.ui.title,
    marginTop: -Spacing.sm,
  },
  roundsText: {
    fontSize: Typography.ui.body,
    fontWeight: '600',
    marginTop: Spacing.sm,
  },
  progressContainer: {
    marginTop: Spacing.xl, // Increased top margin to prevent collision
    marginBottom: Spacing.lg,
  },
  progressRing: {
    width: 100,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    overflow: 'hidden',
    justifyContent: 'flex-end',
    transform: [{ rotate: '-90deg' }],
  },
  progressFill: {
    width: '100%',
    borderRadius: 8,
  },
  tapContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tapArea: {
    width: width * 0.6,
    height: width * 0.6,
    borderRadius: width * 0.3,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tapAreaPressed: {
    opacity: 0.9,
  },
  tapText: {
    fontSize: Typography.ui.subtitle,
    fontWeight: '600',
    color: '#fff',
    marginTop: Spacing.md,
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    marginBottom: Spacing.xl,
  },
  resetButtonPressed: {
    opacity: 0.8,
  },
  resetText: {
    fontSize: Typography.ui.body,
    fontWeight: '500',
  },
});
