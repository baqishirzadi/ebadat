import React, { useMemo, useState } from 'react';
import { I18nManager, Pressable, StyleSheet, View } from 'react-native';
import { AhadithNotificationPreferences } from '@/types/hadith';
import { useApp } from '@/context/AppContext';
import { alphaColor } from '@/utils/ahadith/theme';
import { useI18n } from '@/utils/i18n/useI18n';
import CenteredText from '@/components/CenteredText';

interface HadithNotificationTimePickerProps {
  prefs: AhadithNotificationPreferences;
  onToggleEnabled: (enabled: boolean) => Promise<boolean>;
  onSaveTime: (hour: number, minute: number) => Promise<boolean>;
}

type Meridiem = 'am' | 'pm';

function pad(value: number): string {
  return `${value}`.padStart(2, '0');
}

function to12Hour(hour24: number): { hour12: number; meridiem: Meridiem } {
  const meridiem: Meridiem = hour24 >= 12 ? 'pm' : 'am';
  const hour12 = hour24 % 12 || 12;
  return { hour12, meridiem };
}

function to24Hour(hour12: number, meridiem: Meridiem): number {
  const normalized = hour12 % 12;
  return meridiem === 'pm' ? normalized + 12 : normalized;
}

export function HadithNotificationTimePicker({
  prefs,
  onToggleEnabled,
  onSaveTime,
}: HadithNotificationTimePickerProps) {
  const { theme } = useApp();
  const { t, digits } = useI18n();
  const getMeridiemLabel = (value: Meridiem) => t(value === 'am' ? 'ahadith.time.am' : 'ahadith.time.pm');
  const initial = to12Hour(prefs.hour);
  const [hour12, setHour12] = useState(initial.hour12);
  const [minute, setMinute] = useState(prefs.minute);
  const [meridiem, setMeridiem] = useState<Meridiem>(initial.meridiem);
  const [isBusy, setIsBusy] = useState(false);

  React.useEffect(() => {
    const converted = to12Hour(prefs.hour);
    setHour12(converted.hour12);
    setMinute(prefs.minute);
    setMeridiem(converted.meridiem);
  }, [prefs.hour, prefs.minute]);

  const displayTime = useMemo(
    () =>
      t('ahadith.notification.preview', {
        meridiem: getMeridiemLabel(meridiem),
        hour: digits(pad(hour12)),
        minute: digits(pad(minute)),
      }),
    [digits, getMeridiemLabel, hour12, meridiem, minute, t],
  );

  const changeHour = (delta: number) => {
    setHour12((prev) => {
      const next = prev + delta;
      if (next < 1) return 12;
      if (next > 12) return 1;
      return next;
    });
  };

  const changeMinute = (delta: number) => {
    setMinute((prev) => {
      const next = prev + delta;
      if (next < 0) return 55;
      if (next > 55) return 0;
      return next;
    });
  };

  const handleToggle = async () => {
    setIsBusy(true);
    try {
      await onToggleEnabled(!prefs.enabled);
    } finally {
      setIsBusy(false);
    }
  };

  const handleSaveTime = async () => {
    setIsBusy(true);
    try {
      const hour24 = to24Hour(hour12, meridiem);
      await onSaveTime(hour24, minute);
    } finally {
      setIsBusy(false);
    }
  };

  const hourColumn = (
    <View style={styles.column}>
      <Pressable
        onPress={() => changeHour(1)}
        style={[styles.stepButton, { borderColor: alphaColor(theme.primary, 0.26) }]}
      >
        <CenteredText style={[styles.stepText, { color: theme.primary }]}>+</CenteredText>
      </Pressable>
      <CenteredText style={[styles.timeValue, { color: theme.textPrimary }]}>
        {digits(pad(hour12))}
      </CenteredText>
      <Pressable
        onPress={() => changeHour(-1)}
        style={[styles.stepButton, { borderColor: alphaColor(theme.primary, 0.26) }]}
      >
        <CenteredText style={[styles.stepText, { color: theme.primary }]}>-</CenteredText>
      </Pressable>
      <CenteredText style={[styles.unitLabel, { color: theme.textSecondary }]}>{t('ahadith.time.hour')}</CenteredText>
    </View>
  );

  const minuteColumn = (
    <View style={styles.column}>
      <Pressable
        onPress={() => changeMinute(5)}
        style={[styles.stepButton, { borderColor: alphaColor(theme.primary, 0.26) }]}
      >
        <CenteredText style={[styles.stepText, { color: theme.primary }]}>+</CenteredText>
      </Pressable>
      <CenteredText style={[styles.timeValue, { color: theme.textPrimary }]}>
        {digits(pad(minute))}
      </CenteredText>
      <Pressable
        onPress={() => changeMinute(-5)}
        style={[styles.stepButton, { borderColor: alphaColor(theme.primary, 0.26) }]}
      >
        <CenteredText style={[styles.stepText, { color: theme.primary }]}>-</CenteredText>
      </Pressable>
      <CenteredText style={[styles.unitLabel, { color: theme.textSecondary }]}>{t('ahadith.time.minute')}</CenteredText>
    </View>
  );

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: theme.surface, borderColor: alphaColor(theme.primary, 0.24) },
      ]}
    >
      <View style={styles.headerRow}>
        <CenteredText style={[styles.title, { color: theme.textPrimary }]}>{t('ahadith.notification.title')}</CenteredText>
        <Pressable
          onPress={handleToggle}
          disabled={isBusy}
          style={({ pressed }) => [
            styles.toggle,
            {
              backgroundColor: prefs.enabled
                ? alphaColor(theme.primary, 0.18)
                : alphaColor(theme.textSecondary, 0.12),
              borderColor: prefs.enabled
                ? alphaColor(theme.primary, 0.4)
                : alphaColor(theme.textSecondary, 0.3),
            },
            pressed && { opacity: 0.8 },
          ]}
        >
          <CenteredText
            style={[
              styles.toggleText,
              { color: prefs.enabled ? theme.primary : theme.textSecondary },
            ]}
          >
            {prefs.enabled ? t('ahadith.notification.enabled') : t('ahadith.notification.disabled')}
          </CenteredText>
        </Pressable>
      </View>

      <CenteredText style={[styles.description, { color: theme.textSecondary }]}>
        {t('ahadith.notification.description')}
      </CenteredText>

      <View style={styles.timeControlRow}>
        {/* Keep physical order stable: in RTL we invert JSX so hour stays on left and minute on right. */}
        {I18nManager.isRTL ? minuteColumn : hourColumn}
        <CenteredText style={[styles.separator, { color: theme.textSecondary }]}>:</CenteredText>
        {I18nManager.isRTL ? hourColumn : minuteColumn}
      </View>

      <View style={styles.meridiemRow}>
        {(['am', 'pm'] as const).map((value) => {
          const selected = meridiem === value;
          return (
            <Pressable
              key={value}
              onPress={() => setMeridiem(value)}
              style={[
                styles.meridiemButton,
                {
                  backgroundColor: selected
                    ? alphaColor(theme.primary, 0.18)
                    : alphaColor(theme.textSecondary, 0.12),
                  borderColor: selected
                    ? alphaColor(theme.primary, 0.4)
                    : alphaColor(theme.textSecondary, 0.28),
                },
              ]}
            >
              <CenteredText
                style={[
                  styles.meridiemText,
                  { color: selected ? theme.primary : theme.textSecondary },
                ]}
              >
                {getMeridiemLabel(value)}
              </CenteredText>
            </Pressable>
          );
        })}
      </View>

      <CenteredText style={[styles.preview, { color: theme.textSecondary }]}>{displayTime}</CenteredText>

      <Pressable
        onPress={handleSaveTime}
        disabled={isBusy}
        style={({ pressed }) => [
          styles.saveButton,
          {
            backgroundColor: alphaColor(theme.primary, 0.18),
            borderColor: alphaColor(theme.primary, 0.4),
          },
          pressed && { opacity: 0.8 },
        ]}
      >
        <CenteredText style={[styles.saveText, { color: theme.primary }]}>{t('ahadith.notification.save')}</CenteredText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
    gap: 10,
  },
  headerRow: {
    flexDirection: 'column',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontFamily: 'Vazirmatn-Bold',
    fontSize: 14,
  },
  description: {
    fontFamily: 'Vazirmatn',
    fontSize: 12,
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  toggle: {
    minWidth: 76,
    minHeight: 34,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  toggleText: {
    fontFamily: 'Vazirmatn-Bold',
    fontSize: 12,
  },
  timeControlRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  column: {
    alignItems: 'center',
    gap: 8,
  },
  stepButton: {
    width: 36,
    height: 32,
    borderWidth: 1,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepText: {
    fontFamily: 'Vazirmatn-Bold',
    fontSize: 18,
    lineHeight: 20,
  },
  timeValue: {
    fontFamily: 'Vazirmatn-Bold',
    fontSize: 22,
    minWidth: 36,
    textAlign: 'center',
  },
  unitLabel: {
    fontFamily: 'Vazirmatn',
    fontSize: 12,
    textAlign: 'center',
  },
  separator: {
    fontFamily: 'Vazirmatn-Bold',
    fontSize: 24,
  },
  meridiemRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
  },
  meridiemButton: {
    minWidth: 106,
    minHeight: 34,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  meridiemText: {
    fontFamily: 'Vazirmatn-Bold',
    fontSize: 12,
    textAlign: 'center',
  },
  preview: {
    textAlign: 'center',
    fontFamily: 'Vazirmatn',
    fontSize: 12,
  },
  saveButton: {
    borderWidth: 1,
    borderRadius: 12,
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveText: {
    fontFamily: 'Vazirmatn-Bold',
    fontSize: 13,
  },
});
