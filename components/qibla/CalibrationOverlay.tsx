import { MaterialIcons } from '@expo/vector-icons';
import React, { useEffect } from 'react';
import { Modal, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { useApp } from '@/context/AppContext';
import { BorderRadius, Spacing, Typography } from '@/constants/theme';

interface CalibrationOverlayProps {
  visible: boolean;
}

export function CalibrationOverlay({ visible }: CalibrationOverlayProps) {
  const { theme } = useApp();
  const progress = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      progress.value = withRepeat(
        withTiming(1, { duration: 1600, easing: Easing.inOut(Easing.ease) }),
        -1,
        true,
      );
    } else {
      progress.value = 0;
    }
  }, [progress, visible]);

  const iconStyle = useAnimatedStyle(() => ({
    transform: [
      { rotate: `${progress.value * 360}deg` },
      { scale: 0.9 + progress.value * 0.2 },
    ],
  }));

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.backdrop}>
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
          <Animated.View style={[styles.iconWrap, { backgroundColor: `${theme.tint}1A` }, iconStyle]}>
            <MaterialIcons name="screen-rotation" size={44} color={theme.tint} />
          </Animated.View>
          <Text style={[styles.title, { color: theme.text }]}>کالیبره کردن قطب‌نما</Text>
          <Text style={[styles.body, { color: theme.textSecondary }]}>
            گوشی را چند بار به شکل عدد ۸ (∞) در هوا بچرخانید تا دقت جهت‌یابی بهبود یابد.
          </Text>
          <Text style={[styles.note, { color: theme.textSecondary }]}>
            نکته: از فلزات، آهن‌ربا و قاب مغناطیسی گوشی فاصله بگیرید. جهت قطب‌نمای بعضی مساجد به دلیل تداخل مغناطیسی محل ممکن است کمی فرق کند.
          </Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  card: {
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    gap: Spacing.sm,
    maxWidth: 340,
    alignItems: 'center',
  },
  iconWrap: {
    width: 84,
    height: 84,
    borderRadius: 42,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
  },
  title: {
    fontFamily: 'Vazirmatn-Bold',
    fontSize: Typography.ui.subtitle,
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  body: {
    fontFamily: 'Vazirmatn',
    fontSize: Typography.ui.body,
    lineHeight: 24,
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  note: {
    fontFamily: 'Vazirmatn',
    fontSize: Typography.ui.caption,
    lineHeight: 20,
    textAlign: 'center',
    writingDirection: 'rtl',
  },
});
