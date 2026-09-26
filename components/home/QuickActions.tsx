import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { RtlText } from '@/components/ui/RtlText';
import { RtlView } from '@/components/ui/RtlView';
import { BorderRadius, Spacing, Typography } from '@/constants/theme';
import { useApp } from '@/context/AppContext';
import { useDua } from '@/context/DuaContext';
import type { UiMessageKey } from '@/utils/i18n/catalog';
import { useI18n } from '@/utils/i18n/useI18n';

const ACTIONS: Array<{
  icon: keyof typeof MaterialIcons.glyphMap;
  labelKey: UiMessageKey;
  route: string;
  badgeKey: 'dua' | null;
}> = [
  { icon: 'menu-book', labelKey: 'home.mufti.title', route: '/mufti-chat', badgeKey: null },
  { icon: 'school', labelKey: 'prayerLearning.title', route: '/(tabs)/prayer-learning', badgeKey: null },
  { icon: 'auto-awesome', labelKey: 'home.quick.adhkar', route: '/(tabs)/adhkar', badgeKey: null },
  { icon: 'format-quote', labelKey: 'hadith.title', route: '/(tabs)/ahadith', badgeKey: null },
  { icon: 'favorite', labelKey: 'home.dua.title', route: '/dua-request', badgeKey: 'dua' },
  { icon: 'nights-stay', labelKey: 'home.quick.dream', route: '/dream-chat', badgeKey: null },
];

export function QuickActions() {
  const { theme } = useApp();
  const { t, language } = useI18n();
  const { unreadCount } = useDua();
  const isEnglish = language === 'english';

  return (
    <RtlView style={styles.grid}>
      {ACTIONS.map((action) => (
        <Pressable
          key={action.route}
          onPress={() => router.push(action.route as never)}
          style={[styles.tile, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}
        >
          <View>
            <RtlView style={[styles.iconCircle, { backgroundColor: `${theme.tint}18` }]}>
              <MaterialIcons name={action.icon} size={24} color={theme.tint} />
            </RtlView>
            {action.badgeKey === 'dua' && unreadCount > 0 ? (
              <View style={[styles.badge, { backgroundColor: '#E11D48' }]}>
                <RtlText style={styles.badgeText}>
                  {unreadCount > 9 ? (isEnglish ? '9+' : '۹+') : String(unreadCount)}
                </RtlText>
              </View>
            ) : null}
          </View>
          <RtlText
            align="center"
            style={[styles.label, isEnglish && styles.labelEnglish, { color: theme.text }]}
            numberOfLines={2}
          >
            {t(action.labelKey)}
          </RtlText>
        </Pressable>
      ))}
    </RtlView>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  tile: {
    width: '31.5%',
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.md,
    paddingHorizontal: 4,
    alignItems: 'center',
    gap: Spacing.sm,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontFamily: 'Vazirmatn-Bold',
    fontSize: 11,
    lineHeight: 16,
  },
  labelEnglish: {
    fontFamily: undefined,
    fontWeight: '700',
    fontSize: 11,
    lineHeight: 15,
  },
  badge: {
    position: 'absolute',
    top: -4,
    left: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: '#fff',
    fontSize: 11,
    fontFamily: 'Vazirmatn-Bold',
    lineHeight: 14,
  },
});
