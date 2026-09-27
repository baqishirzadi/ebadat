import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { LocalizedText } from '@/components/ui/LocalizedText';
import { useI18n } from '@/utils/i18n/useI18n';

export const UNREAD_BADGE_COLOR = '#E11D48';

interface UnreadCountBadgeProps {
  count: number;
  /** `corner` pins the badge to the top corner of its parent icon; `inline` flows with text. */
  variant?: 'corner' | 'inline';
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

/** The single red unread counter used on every «دعای خیر» entry point. */
export function UnreadCountBadge({ count, variant = 'corner', style, testID }: UnreadCountBadgeProps) {
  const { n } = useI18n();
  if (count <= 0) return null;

  return (
    <View
      testID={testID}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[styles.badge, variant === 'corner' && styles.corner, style]}
    >
      <LocalizedText preserveFontFamily style={styles.text}>{count > 9 ? `${n(9)}+` : n(count)}</LocalizedText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 5,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: UNREAD_BADGE_COLOR,
    borderWidth: 1.5,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  corner: {
    position: 'absolute',
    top: -5,
    left: -5,
    zIndex: 2,
  },
  text: {
    color: '#fff',
    fontSize: 11,
    fontFamily: 'Vazirmatn-Bold',
    lineHeight: 14,
    textAlign: 'center',
    includeFontPadding: false,
  },
});
