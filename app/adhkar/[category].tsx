/**
 * Adhkar Detail Screen
 * Shows all adhkar in a category with tap-to-count on each card.
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  Pressable,
  I18nManager,
  Animated,
} from 'react-native';
import { useLocalSearchParams, Stack, useNavigation, useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useApp } from '@/context/AppContext';
import { useStats } from '@/context/StatsContext';
import { Typography, Spacing, BorderRadius } from '@/constants/theme';
import { getQuranFontFamily } from '@/hooks/useFonts';
import adhkarData from '@/data/adhkar.json';
import CenteredText from '@/components/CenteredText';
import { useI18n } from '@/utils/i18n/useI18n';
import { backIconName } from '@/utils/i18n/direction';

interface Dhikr {
  id: string;
  arabic: string;
  dari: string;
  pashto: string;
  english?: string;
  reference: string;
  count: number;
  virtue?: string;
}

interface Category {
  id: string;
  nameArabic: string;
  nameDari: string;
  namePashto: string;
  nameEnglish?: string;
  icon: string;
  color: string;
}

function CountBadge({
  label,
  color,
  borderColor,
  backgroundColor,
  pulseKey,
}: {
  label: string;
  color: string;
  borderColor: string;
  backgroundColor: string;
  pulseKey: number;
}) {
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (pulseKey <= 0) return;
    scale.setValue(1);
    Animated.sequence([
      Animated.spring(scale, {
        toValue: 1.12,
        friction: 5,
        tension: 220,
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: 1,
        friction: 6,
        tension: 180,
        useNativeDriver: true,
      }),
    ]).start();
  }, [pulseKey, scale]);

  return (
    <Animated.View
      style={[
        styles.counterBadge,
        { backgroundColor, borderColor, transform: [{ scale }] },
      ]}
    >
      <CenteredText style={[styles.counterText, { color }]}>{label}</CenteredText>
    </Animated.View>
  );
}

export default function AdhkarDetailScreen() {
  const { category } = useLocalSearchParams<{ category: string }>();
  const { theme, state } = useApp();
  const { t, n, content, language } = useI18n();
  const { addDhikr } = useStats();
  const navigation = useNavigation();
  const router = useRouter();
  const fontFamily = getQuranFontFamily(state.preferences.quranFont);

  const handleBack = useCallback(() => {
    if (navigation.canGoBack()) {
      router.back();
      return;
    }
    router.replace('/(tabs)/adhkar');
  }, [navigation, router]);

  const categoryInfo = adhkarData.categories.find(c => c.id === category) as Category | undefined;
  const adhkarList = (adhkarData.adhkar as Record<string, Dhikr[]>)[category || ''] || [];

  const [counters, setCounters] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    adhkarList.forEach(dhikr => {
      initial[dhikr.id] = 0;
    });
    return initial;
  });
  const [pulseKeys, setPulseKeys] = useState<Record<string, number>>({});

  const handleCount = useCallback((dhikrId: string, targetCount: number) => {
    setCounters(prev => {
      const current = prev[dhikrId] ?? 0;
      const next = current >= targetCount ? 1 : current + 1;
      return { ...prev, [dhikrId]: next };
    });
    setPulseKeys(prev => ({ ...prev, [dhikrId]: (prev[dhikrId] ?? 0) + 1 }));

    const current = counters[dhikrId] ?? 0;
    const next = current >= targetCount ? 1 : current + 1;
    if (next >= targetCount || current >= targetCount) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    addDhikr(1);
  }, [addDhikr, counters]);

  const renderDhikr = useCallback(({ item }: { item: Dhikr }) => {
    const count = counters[item.id] ?? 0;
    const isComplete = count >= item.count;
    const progress = item.count > 0 ? (count / item.count) * 100 : 0;
    const accent = categoryInfo?.color ?? theme.tint;
    const countLabel = t('adhkar.countProgress', {
      current: n(count),
      target: n(item.count),
    });

    return (
      <Pressable
        onPress={() => handleCount(item.id, item.count)}
        style={({ pressed }) => [
          styles.dhikrCard,
          {
            backgroundColor: isComplete ? `${accent}12` : theme.card,
            borderColor: isComplete ? accent : theme.cardBorder,
          },
          pressed && styles.dhikrCardPressed,
        ]}
      >
        <View style={[styles.progressBar, { backgroundColor: `${accent}18` }, styles.ltrProgress]}>
          <View
            style={[
              styles.progressFill,
              {
                backgroundColor: accent,
                width: `${Math.min(progress, 100)}%`,
              },
            ]}
          />
        </View>

        <CenteredText
          style={[
            styles.arabicText,
            { fontFamily, color: theme.arabicText },
          ]}
        >
          {item.arabic}
        </CenteredText>

        <CenteredText style={[styles.translationText, { color: theme.translationText }]}>
          {content(item, null)}
        </CenteredText>

        <View style={styles.metaRow}>
          <MaterialIcons name="menu-book" size={14} color={theme.textSecondary} />
          <CenteredText style={[styles.reference, { color: theme.textSecondary }]}>
            {item.reference}
          </CenteredText>
        </View>

        {item.virtue ? (
          <CenteredText
            numberOfLines={1}
            style={[styles.virtue, { color: accent }]}
          >
            {item.virtue}
          </CenteredText>
        ) : null}

        <View style={styles.counterRow}>
          <CountBadge
            label={countLabel}
            color={isComplete ? accent : theme.text}
            borderColor={isComplete ? accent : theme.cardBorder}
            backgroundColor={isComplete ? `${accent}18` : theme.backgroundSecondary}
            pulseKey={pulseKeys[item.id] ?? 0}
          />
          {isComplete ? (
            <MaterialIcons name="check-circle" size={22} color={accent} />
          ) : null}
        </View>
      </Pressable>
    );
  }, [counters, pulseKeys, theme, fontFamily, categoryInfo, handleCount, content, n, t]);

  if (!categoryInfo) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <CenteredText style={{ color: theme.text }}>{t('adhkar.categoryMissing')}</CenteredText>
      </View>
    );
  }

  const totalCount = adhkarList.reduce((sum, d) => sum + d.count, 0);
  const currentCount = Object.values(counters).reduce((sum, c) => sum + c, 0);
  const totalProgress = totalCount > 0 ? (currentCount / totalCount) * 100 : 0;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Stack.Screen
        options={{
          title: content(categoryInfo, 'name'),
          headerStyle: { backgroundColor: categoryInfo.color },
          headerTintColor: '#fff',
          headerLeft: () => (
            <Pressable onPress={handleBack} hitSlop={10} style={styles.headerBackButton}>
              <MaterialIcons name={backIconName(language)} size={24} color="#fff" />
            </Pressable>
          ),
        }}
      />

      <View style={[styles.progressHeader, { backgroundColor: categoryInfo.color }]}>
        <View style={styles.progressInfo}>
          <CenteredText style={styles.progressLabel}>{t('adhkar.progress')}</CenteredText>
          <CenteredText style={styles.progressValue}>{n(Math.round(totalProgress))}%</CenteredText>
        </View>
        <View style={[styles.totalProgressBar, { backgroundColor: 'rgba(255,255,255,0.3)' }, styles.ltrProgress]}>
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
  headerBackButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
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
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
    marginBottom: Spacing.md,
    overflow: 'hidden',
  },
  dhikrCardPressed: {
    opacity: 0.95,
    transform: [{ scale: 0.985 }],
  },
  progressBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
  },
  progressFill: {
    height: '100%',
  },
  arabicText: {
    fontSize: Typography.arabic.medium,
    textAlign: 'center',
    lineHeight: 58,
    marginBottom: Spacing.sm,
    paddingTop: Spacing.xs,
  },
  translationText: {
    fontSize: Typography.translation.medium,
    lineHeight: 28,
    marginBottom: Spacing.sm,
  },
  metaRow: {
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  ltrProgress: {
    direction: 'ltr',
  },
  reference: {
    fontSize: Typography.ui.caption,
    flexShrink: 1,
  },
  virtue: {
    fontSize: Typography.ui.caption,
    fontStyle: 'italic',
    textAlign: 'center',
    marginBottom: Spacing.sm,
    opacity: 0.9,
  },
  counterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  counterBadge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: 999,
    borderWidth: 1,
    minWidth: 120,
    alignItems: 'center',
  },
  counterText: {
    fontSize: Typography.ui.body,
    fontWeight: '700',
  },
});
