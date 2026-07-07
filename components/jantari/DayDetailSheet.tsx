import React from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { RtlText } from '@/components/ui/RtlText';
import { RtlView } from '@/components/ui/RtlView';
import { BorderRadius, Spacing, Typography } from '@/constants/theme';
import { useApp } from '@/context/AppContext';
import { getKabulDateParts } from '@/utils/afghanistanCalendar';
import { formatShamsiSlash, GREG_MONTHS_EN } from '@/utils/calendarDisplay';
import { gregorianToAfghanSolarHijri } from '@/utils/afghanSolarHijri';
import { gregorianToHijri } from '@/utils/islamicCalendar';
import { toArabicNumerals } from '@/utils/numbers';

interface DayDetailSheetProps {
  visible: boolean;
  date: Date | null;
  onClose: () => void;
}

export function DayDetailSheet({ visible, date, onClose }: DayDetailSheetProps) {
  const { theme } = useApp();

  if (!date) return null;

  const shamsi = gregorianToAfghanSolarHijri(date);
  const hijri = gregorianToHijri(date);
  const gregParts = getKabulDateParts(date);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={[styles.sheet, { backgroundColor: theme.card, borderColor: theme.cardBorder }]} onPress={() => {}}>
          <View style={[styles.handle, { backgroundColor: theme.divider }]} />
          <RtlText align="center" style={[styles.title, { color: theme.text }]}>جزئیات روز</RtlText>

          <RtlView style={styles.dates}>
            <RtlView style={styles.dateRow}>
              <RtlText align="center" style={[styles.dateLabel, { color: theme.textSecondary }]}>شمسی</RtlText>
              <RtlText align="center" style={[styles.dateValue, { color: theme.tint }]}>
                {formatShamsiSlash(shamsi)}
              </RtlText>
            </RtlView>
            <RtlView style={styles.dateRow}>
              <RtlText align="center" style={[styles.dateLabel, { color: theme.textSecondary }]}>قمری</RtlText>
              <RtlText align="center" style={[styles.dateValue, { color: theme.text }]}>
                {toArabicNumerals(hijri.day)} {hijri.monthNameDari} {toArabicNumerals(hijri.year)}
              </RtlText>
            </RtlView>
            <RtlView style={styles.dateRow}>
              <RtlText align="center" style={[styles.dateLabel, { color: theme.textSecondary }]}>میلادی</RtlText>
              <RtlText align="center" style={[styles.dateValue, { color: theme.text }]}>
                {gregParts.day} {GREG_MONTHS_EN[gregParts.month - 1]} {gregParts.year}
              </RtlText>
            </RtlView>
          </RtlView>

          <Pressable onPress={onClose} style={[styles.closeBtn, { backgroundColor: theme.tint }]}>
            <RtlText align="center" style={styles.closeText}>بستن</RtlText>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.lg,
    paddingBottom: Spacing.xxl,
    gap: Spacing.md,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: Spacing.sm,
  },
  title: {
    fontFamily: 'Vazirmatn-Bold',
    fontSize: Typography.ui.body,
  },
  dates: {
    gap: Spacing.sm,
  },
  dateRow: {
    gap: 4,
    paddingVertical: Spacing.xs,
  },
  dateLabel: {
    fontFamily: 'Vazirmatn',
    fontSize: Typography.ui.caption,
  },
  dateValue: {
    fontFamily: 'Vazirmatn-Bold',
    fontSize: Typography.ui.subtitle,
  },
  closeBtn: {
    borderRadius: BorderRadius.full,
    paddingVertical: Spacing.md,
    marginTop: Spacing.sm,
  },
  closeText: {
    color: '#fff',
    fontFamily: 'Vazirmatn-Bold',
    fontSize: Typography.ui.body,
  },
});
