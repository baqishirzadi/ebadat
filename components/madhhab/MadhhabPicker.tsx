import { MaterialIcons } from '@expo/vector-icons';
import React from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { RtlText } from '@/components/ui/RtlText';
import { BorderRadius, Spacing, Typography } from '@/constants/theme';
import { useApp } from '@/context/AppContext';
import { directionStyle } from '@/utils/i18n/direction';
import { useI18n } from '@/utils/i18n/useI18n';
import {
  MADHHAB_KEYS,
  madhhabLabel,
  type MadhhabKey,
} from '@/utils/madhhab';

const NOTE_KEYS = {
  hanafi: 'onboarding.madhhab.note.hanafi',
  shafii: 'onboarding.madhhab.note.shafii',
  maliki: 'onboarding.madhhab.note.maliki',
  hanbali: 'onboarding.madhhab.note.hanbali',
  ahl_hadith: 'onboarding.madhhab.note.ahl_hadith',
} as const;

interface MadhhabOptionListProps {
  selected: MadhhabKey;
  onSelect: (madhhab: MadhhabKey) => void;
  /** Setup cards show the Asr note. Settings keeps the short row. */
  centered?: boolean;
}

export function MadhhabOptionList({ selected, onSelect, centered = false }: MadhhabOptionListProps) {
  const { theme } = useApp();
  const { t, language } = useI18n();

  return (
    <View style={[styles.list, centered && styles.listCentered]}>
      {MADHHAB_KEYS.map((key) => {
        const active = selected === key;
        const label = (
          <RtlText
            align="right"
            wrap={!centered}
            style={[styles.label, centered && styles.labelSetup, { color: active ? theme.tint : theme.text }]}
          >
            {madhhabLabel(key, language)}
          </RtlText>
        );
        const badge = key === 'hanafi' ? (
          <RtlText
            align={centered ? 'center' : 'right'}
            wrap={!centered}
            style={[
              centered ? styles.recommendPillText : styles.badge,
              { color: centered ? theme.tint : theme.textSecondary },
            ]}
          >
            {t('onboarding.madhhab.recommended')}
          </RtlText>
        ) : null;
        const check = active ? (
          <MaterialIcons name="check" size={22} color={theme.tint} />
        ) : (
          <View style={[styles.checkPlaceholder, { borderColor: theme.cardBorder }]} />
        );

        return (
          <Pressable
            key={key}
            onPress={() => onSelect(key)}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            testID={`madhhab-option-${key}`}
            style={[
              styles.option,
              centered && styles.optionSetup,
              centered && directionStyle(language),
              {
                backgroundColor: active ? `${theme.tint}14` : theme.card,
                borderColor: active ? theme.tint : theme.cardBorder,
              },
            ]}
          >
            {centered ? (
              <>
                <View style={styles.optionText}>
                  <View style={[styles.nameRow, directionStyle(language)]}>
                    {label}
                    {badge ? (
                      <View style={[styles.recommendPill, { backgroundColor: `${theme.tint}18` }]}>
                        {badge}
                      </View>
                    ) : null}
                  </View>
                  <RtlText align="right" style={[styles.note, { color: theme.textSecondary }]}>
                    {t(NOTE_KEYS[key])}
                  </RtlText>
                </View>
                {check}
              </>
            ) : (
              <>
                <View style={styles.optionText}>
                  {label}
                  {badge}
                </View>
                {check}
              </>
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
  listCentered: {
    flexGrow: 1,
    justifyContent: 'center',
    gap: Spacing.md,
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
  optionSetup: {
    borderRadius: BorderRadius.xl,
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  optionText: {
    flex: 1,
    minWidth: 0,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  label: {
    fontFamily: 'Vazirmatn-Bold',
    fontSize: Typography.ui.body,
  },
  labelSetup: {
    width: undefined,
    alignSelf: 'flex-start',
  },
  note: {
    fontFamily: 'Vazirmatn',
    fontSize: Typography.ui.caption,
    lineHeight: 20,
    marginTop: 4,
  },
  recommendPill: {
    borderRadius: BorderRadius.full,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  recommendPillText: {
    fontFamily: 'Vazirmatn',
    fontSize: 11,
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
