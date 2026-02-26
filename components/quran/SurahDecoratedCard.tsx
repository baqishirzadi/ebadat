import { BorderRadius, Spacing, Typography } from '@/constants/theme';
import { useApp } from '@/context/AppContext';
import { toArabicNumerals } from '@/data/surahNames';
import { MaterialIcons } from '@expo/vector-icons';
import React from 'react';
import { I18nManager, Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';

type MaterialIconName = React.ComponentProps<typeof MaterialIcons>['name'];

interface SurahDecoratedCardProps {
  surahNumber: number;
  title: string;
  subtitle: string;
  onPress: () => void;
  isHighlighted?: boolean;
  metaTop?: string;
  metaBottom?: string;
  metaIcon?: MaterialIconName;
  actionIcon?: MaterialIconName;
  subtitleNumberOfLines?: number;
  style?: StyleProp<ViewStyle>;
}

export function SurahDecoratedCard({
  surahNumber,
  title,
  subtitle,
  onPress,
  isHighlighted = false,
  metaTop,
  metaBottom,
  metaIcon,
  actionIcon,
  subtitleNumberOfLines = 2,
  style,
}: SurahDecoratedCardProps) {
  const { theme } = useApp();
  const actionIconName = actionIcon || (I18nManager.isRTL ? 'chevron-left' : 'chevron-right');

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: theme.card,
          borderColor: isHighlighted ? theme.playing : theme.cardBorder,
        },
        style,
        pressed && styles.cardPressed,
      ]}
    >
      <View style={styles.actionContainer}>
        <MaterialIcons name={actionIconName} size={24} color={theme.icon} />
      </View>

      <View style={styles.infoContainer}>
        <Text style={[styles.title, { color: theme.text }]} numberOfLines={1} ellipsizeMode="tail">
          {title}
        </Text>
        <Text
          style={[styles.subtitle, { color: theme.textSecondary }]}
          numberOfLines={subtitleNumberOfLines}
          ellipsizeMode="tail"
        >
          {subtitle}
        </Text>
      </View>

      <View style={styles.badgeContainer}>
        <View style={[styles.decorativeRing, { borderColor: theme.surahHeader }]} />
        <View style={[styles.decorativeRingMiddle, { borderColor: `${theme.surahHeader}80` }]} />
        <View style={[styles.numberContainer, { backgroundColor: theme.surahHeader }]}>
          <Text style={styles.numberText}>{toArabicNumerals(surahNumber)}</Text>
        </View>
        <View style={[styles.cornerDeco, styles.cornerTopLeft, { borderColor: theme.surahHeader }]} />
        <View style={[styles.cornerDeco, styles.cornerTopRight, { borderColor: theme.surahHeader }]} />
        <View style={[styles.cornerDeco, styles.cornerBottomLeft, { borderColor: theme.surahHeader }]} />
        <View style={[styles.cornerDeco, styles.cornerBottomRight, { borderColor: theme.surahHeader }]} />
      </View>

      {(metaTop || metaBottom) && (
        <View style={styles.metaContainer}>
          {!!metaTop && (
            <View style={styles.metaRow}>
              {!!metaIcon && <MaterialIcons name={metaIcon} size={12} color={theme.textSecondary} />}
              <Text style={[styles.metaText, { color: theme.textSecondary }]} numberOfLines={1}>
                {metaTop}
              </Text>
            </View>
          )}
          {!!metaBottom && (
            <Text style={[styles.metaText, styles.metaBottom, { color: theme.textSecondary }]} numberOfLines={1}>
              {metaBottom}
            </Text>
          )}
        </View>
      )}

      {isHighlighted && (
        <View style={[styles.playingBadge, { backgroundColor: theme.playing }]}>
          <MaterialIcons name="play-arrow" size={14} color="#fff" />
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    height: 96,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    gap: Spacing.md,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    overflow: 'hidden',
  },
  cardPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.985 }],
  },
  actionContainer: {
    flexShrink: 0,
  },
  infoContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: Typography.ui.title,
    fontWeight: '600',
    fontFamily: 'ScheherazadeNew',
    textAlign: 'center',
    width: '100%',
  },
  subtitle: {
    fontSize: Typography.ui.caption,
    marginTop: 2,
    fontFamily: 'Vazirmatn',
    textAlign: 'center',
    width: '100%',
    writingDirection: 'rtl',
  },
  badgeContainer: {
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    flexShrink: 0,
  },
  decorativeRing: {
    position: 'absolute',
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderStyle: 'solid',
  },
  decorativeRingMiddle: {
    position: 'absolute',
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1.5,
    borderStyle: 'solid',
  },
  numberContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    zIndex: 1,
  },
  numberText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Vazirmatn',
  },
  cornerDeco: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderWidth: 1.5,
    borderStyle: 'solid',
  },
  cornerTopLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 1.5,
    borderLeftWidth: 1.5,
    borderRightWidth: 0,
    borderBottomWidth: 0,
    borderTopLeftRadius: 4,
  },
  cornerTopRight: {
    top: 0,
    right: 0,
    borderTopWidth: 1.5,
    borderRightWidth: 1.5,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
    borderTopRightRadius: 4,
  },
  cornerBottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 1.5,
    borderLeftWidth: 1.5,
    borderTopWidth: 0,
    borderRightWidth: 0,
    borderBottomLeftRadius: 4,
  },
  cornerBottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 1.5,
    borderRightWidth: 1.5,
    borderTopWidth: 0,
    borderLeftWidth: 0,
    borderBottomRightRadius: 4,
  },
  metaContainer: {
    alignItems: 'flex-start',
    justifyContent: 'center',
    minWidth: 70,
    flexShrink: 0,
  },
  metaRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: Typography.ui.caption,
    fontFamily: 'Vazirmatn',
  },
  metaBottom: {
    marginTop: 2,
  },
  playingBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
