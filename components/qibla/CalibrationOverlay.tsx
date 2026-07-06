import React from 'react';
import { Modal, StyleSheet, Text, View } from 'react-native';

import { useApp } from '@/context/AppContext';
import { BorderRadius, Spacing, Typography } from '@/constants/theme';

interface CalibrationOverlayProps {
  visible: boolean;
}

export function CalibrationOverlay({ visible }: CalibrationOverlayProps) {
  const { theme } = useApp();

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.backdrop}>
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
          <Text style={[styles.title, { color: theme.text }]}>کالیبره کردن قطب‌نما</Text>
          <Text style={[styles.body, { color: theme.textSecondary }]}>
            گوشی را به آرامی به شکل عدد ۸ حرکت دهید تا دقت جهت‌یابی بهبود یابد.
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
    maxWidth: 320,
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
});
