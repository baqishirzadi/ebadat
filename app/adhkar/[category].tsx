/**
 * Adhkar Detail Screen
 * Shows all adhkar in a category with counter functionality
 */

import React, { useState, useCallback } from 'react';
import { View, StyleSheet, FlatList, Pressable } from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useApp } from '@/context/AppContext';
import { useStats } from '@/context/StatsContext';
import { Typography, Spacing, BorderRadius } from '@/constants/theme';
import { getQuranFontFamily } from '@/hooks/useFonts';
import adhkarData from '@/data/adhkar.json';
import CenteredText from '@/components/CenteredText';

interface Dhikr {
  id: string;
  arabic: string;
  dari: string;
  pashto: string;
  reference: string;
  count: number;
  virtue?: string;
}

interface Category {
  id: string;
  nameArabic: string;
  nameDari: string;
  namePashto: string;
  icon: string;
  color: string;
}

export default function AdhkarDetailScreen() {
  const { category } = useLocalSearchParams<{ category: string }>();
  const { theme, state } = useApp();
  const { addDhikr } = useStats();
  const fontFamily = getQuranFontFamily(state.preferences.quranFont);
  
  const categoryInfo = adhkarData.categories.find(c => c.id === category) as Category | undefined;
  const adhkarList = (adhkarData.adhkar as Record<string, Dhikr[]>)[category || ''] || [];
  
  const [counters, setCounters] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    adhkarList.forEach(dhikr => {
      initial[dhikr.id] = 0;
    });
    return initial;
  });

  const handleCount = useCallback((dhikrId: string, targetCount: number) => {
    setCounters(prev => {
      const current = prev[dhikrId];
      if (current < targetCount) {
        // Haptic feedback
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        addDhikr(1);
        return { ...prev, [dhikrId]: current + 1 };
      } else {
        // Completed - stronger feedback
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        return prev;
      }
    });
  }, [addDhikr]);

  const resetCounter = useCallback((dhikrId: string) => {
    setCounters(prev => ({ ...prev, [dhikrId]: 0 }));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, []);

  const renderDhikr = useCallback(({ item }: { item: Dhikr }) => {
    const count = counters[item.id];
    const isComplete = count >= item.count;
    const progress = (count / item.count) * 100;

    return (
      <Pressable
        onPress={() => handleCount(item.id, item.count)}
        onLongPress={() => resetCounter(item.id)}
        style={({ pressed }) => [
          styles.dhikrCard,
          { 
            backgroundColor: isComplete ? `${categoryInfo?.color}15` : theme.card,
            borderColor: isComplete ? categoryInfo?.color : theme.cardBorder,
          },
          pressed && styles.dhikrCardPressed,
        ]}
      >
        {/* Progress bar */}
        <View style={[styles.progressBar, { backgroundColor: `${categoryInfo?.color}20` }]}>
          <View
            style={[
              styles.progressFill,
              { 
                backgroundColor: categoryInfo?.color,
                width: `${Math.min(progress, 100)}%`,
              },
            ]}
          />
        </View>

        {/* Arabic text */}
        <CenteredText
          style={[
            styles.arabicText,
            { fontFamily, color: theme.arabicText },
          ]}
        >
          {item.arabic}
        </CenteredText>

        {/* Dari translation */}
        <CenteredText style={[styles.translationText, { color: theme.translationText }]}>
          {item.dari}
        </CenteredText>

        {/* Pashto translation */}
        <CenteredText style={[styles.translationText, styles.pashtoText, { color: theme.textSecondary }]}>
          {item.pashto}
        </CenteredText>

        {/* Reference and virtue */}
        <View style={styles.metaContainer}>
          <CenteredText style={[styles.reference, { color: theme.textSecondary }]}>
            📖 {item.reference}
          </CenteredText>
          {item.virtue && (
            <CenteredText style={[styles.virtue, { color: categoryInfo?.color }]}>
              ✨ {item.virtue.substring(0, 50)}...
            </CenteredText>
          )}
        </View>

        {/* Counter */}
        <View style={styles.counterContainer}>
          <CenteredText style={[styles.counterText, { color: isComplete ? categoryInfo?.color : theme.text }]}>
            {count} / {item.count}
          </CenteredText>
          {isComplete && (
            <MaterialIcons name="check-circle" size={24} color={categoryInfo?.color} />
          )}
        </View>

        {/* Tap hint */}
        <CenteredText style={[styles.tapHint, { color: theme.textSecondary }]}>
          برای شمارش لمس کنید • نگه دارید برای صفر
        </CenteredText>
      </Pressable>
    );
  }, [counters, theme, fontFamily, categoryInfo, handleCount, resetCounter]);

  if (!categoryInfo) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <CenteredText style={{ color: theme.text }}>دسته‌بندی یافت نشد</CenteredText>
      </View>
    );
  }

  // Calculate total progress
  const totalCount = adhkarList.reduce((sum, d) => sum + d.count, 0);
  const currentCount = Object.values(counters).reduce((sum, c) => sum + c, 0);
  const totalProgress = (currentCount / totalCount) * 100;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Stack.Screen
        options={{
          title: categoryInfo.nameDari,
          headerStyle: { backgroundColor: categoryInfo.color },
          headerTintColor: '#fff',
        }}
      />

      {/* Progress header */}
      <View style={[styles.progressHeader, { backgroundColor: categoryInfo.color }]}>
        <View style={styles.progressInfo}>
          <CenteredText style={styles.progressLabel}>پیشرفت کلی</CenteredText>
          <CenteredText style={styles.progressValue}>{Math.round(totalProgress)}%</CenteredText>
        </View>
        <View style={[styles.totalProgressBar, { backgroundColor: 'rgba(255,255,255,0.3)' }]}>
          <View
            style={[
              styles.totalProgressFill,
              { backgroundColor: '#fff', width: `${totalProgress}%` },
            ]}
          />
        </View>
      </View>

      <FlatList
        data={adhkarList}
        keyExtractor={item => item.id}
        renderItem={renderDhikr}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  progressHeader: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    paddingTop: 0,
  },
  progressInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  progressLabel: {
    fontSize: Typography.ui.body,
    color: 'rgba(255,255,255,0.9)',
  },
  progressValue: {
    fontSize: Typography.ui.subtitle,
    fontWeight: '700',
    color: '#fff',
  },
  totalProgressBar: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  totalProgressFill: {
    height: '100%',
    borderRadius: 4,
  },
  listContent: {
    padding: Spacing.md,
    paddingBottom: Spacing.xxl,
  },
  dhikrCard: {
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    overflow: 'hidden',
  },
  dhikrCardPressed: {
    opacity: 0.95,
    transform: [{ scale: 0.99 }],
  },
  progressBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 4,
  },
  progressFill: {
    height: '100%',
  },
  arabicText: {
    fontSize: Typography.arabic.medium,
    textAlign: 'center',
    lineHeight: 65,
    marginBottom: Spacing.md,
    paddingTop: Spacing.sm,
    paddingBottom: 10,
  },
  translationText: {
    fontSize: Typography.translation.medium,
    lineHeight: 30,
    marginBottom: Spacing.sm,
  },
  pashtoText: {
    marginTop: Spacing.xs,
    fontFamily: 'NotoNastaliqUrdu',
    lineHeight: 45, // Increased for Pashto characters with descenders (پ, چ, etc.)
    paddingBottom: 8, // Extra padding to prevent text cut-off at bottom
  },
  metaContainer: {
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
    gap: Spacing.xs,
  },
  reference: {
    fontSize: Typography.ui.caption,
},
  virtue: {
    fontSize: Typography.ui.caption,
fontStyle: 'italic',
  },
  counterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.lg,
  },
  counterText: {
    fontSize: 32,
    fontWeight: '700',
  },
  tapHint: {
    fontSize: Typography.ui.caption,
    textAlign: 'center',
    marginTop: Spacing.sm,
  },
});
