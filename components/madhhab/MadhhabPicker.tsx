import { MaterialIcons } from '@expo/vector-icons';
import React from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { RtlText } from '@/components/ui/RtlText';
import { BorderRadius, Spacing, Typography } from '@/constants/theme';
import { useApp } from '@/context/AppContext';
import { useI18n } from '@/utils/i18n/useI18n';
import {
  MADHHAB_KEYS,
  madhhabLabel,
  type MadhhabKey,
} from '@/utils/madhhab';

interface MadhhabOptionListProps {
  selected: MadhhabKey;
  onSelect: (madhhab: MadhhabKey) => void;
}

export function MadhhabOptionList({ selected, onSelect }: MadhhabOptionListProps) {
  const { theme } = useApp();
  const { t, language } = useI18n();

  return (
    <View style={styles.list}>
      {MADHHAB_KEYS.map((key) => {
        const active = selected === key;
        return (
          <Pressable
            key={key}
            onPress={() => onSelect(key)}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            testID={`madhhab-option-${key}`}
            style={[
              styles.option,
              {
                backgroundColor: active ? `${theme.tint}14` : theme.card,
                borderColor: active ? theme.tint : theme.cardBorder,
              },
            ]}
          >
            <View style={styles.optionText}>
              <RtlText style={[styles.label, { color: active ? theme.tint : theme.text }]}>
                {madhhabLabel(key, language)}
              </RtlText>
              {key === 'hanafi' ? (
                <RtlText style={[styles.badge, { color: theme.textSecondary }]}>
                  {t('onboarding.madhhab.recommended')}
                </RtlText>
              ) : null}
            </View>
            {active ? (
              <MaterialIcons name="check" size={22} color={theme.tint} />
            ) : (
              <View style={[styles.checkPlaceholder, { borderColor: theme.cardBorder }]} />
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

interface MadhhabSheetProps {
  visible: boolean;
  selected: MadhhabKey;
  onClose: () => void;
  onSelect: (madhhab: MadhhabKey) => void;
}

export function MadhhabSheet({ visible, selected, onClose, onSelect }: MadhhabSheetProps) {
  const { theme } = useApp();
  const { t } = useI18n();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={[styles.sheet, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
        <View style={[styles.handle, { backgroundColor: theme.cardBorder }]} />
        <RtlText align="center" style={[styles.sheetTitle, { color: theme.text }]}>
          {t('settings.madhhab.title')}
        </RtlText>
        <MadhhabOptionList
          selected={selected}
          onSelect={(key) => {
            onSelect(key);
            onClose();
          }}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: Spacing.sm,
    width: '100%',
  },
  option: {
    borderWidth: 2,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  optionText: {
    flex: 1,
    minWidth: 0,
  },
  label: {
    fontFamily: 'Vazirmatn-Bold',
    fontSize: Typography.ui.body,
  },
  badge: {
    fontFamily: 'Vazirmatn',
    fontSize: Typography.ui.caption,
    marginTop: 2,
  },
  checkPlaceholder: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.46)',
  },
  sheet: {
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.md,
    paddingBottom: Spacing.xl,
    gap: Spacing.md,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
  },
  sheetTitle: {
    fontFamily: 'Vazirmatn-Bold',
    fontSize: Typography.ui.subtitle,
  },
});
