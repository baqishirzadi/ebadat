import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import React, { memo, useCallback, useState } from 'react';

import { StyleSheet, View } from 'react-native';
import { LocalizedText } from '@/components/ui/LocalizedText';
import Svg, { Circle } from 'react-native-svg';

import { RtlText } from '@/components/ui/RtlText';
import { RtlView } from '@/components/ui/RtlView';
import { BorderRadius, NAAT_GRADIENT, Spacing, Typography } from '@/constants/theme';
import {
  persianCenterCaptionText,
  persianCenterSubtitleText,
  persianCenterText,
} from '@/constants/persianTextLayout';
import { useApp } from '@/context/AppContext';
import { usePrayer } from '@/context/PrayerContext';
import { formatPrayerTime12h } from '@/utils/formatPrayerTime';
import { getPrayerProgress } from '@/utils/prayerDisplay';
import { displayPrayerLabel } from '@/utils/prayerCalculationPolicy';
import { getNextPrayer, PrayerTimes } from '@/utils/prayerTimes';
import { toArabicNumeralsString } from '@/utils/numbers';
import { pickContent } from '@/utils/i18n/content';
import { useI18n } from '@/utils/i18n/useI18n';

const RING_SIZE = 128;
const STROKE = 5;

const pashtoCompactMetrics = {
  amiri: {
    container: { gap: 4 },
    label: { fontSize: 12, lineHeight: 28, includeFontPadding: true, paddingTop: 4, paddingBottom: 6 },
    prayerName: { fontSize: 17, lineHeight: 28, includeFontPadding: true },
    time: { fontSize: 16, lineHeight: 24, includeFontPadding: true },
    countdown: { fontSize: 14, lineHeight: 18 },
    hint: { fontSize: 12, lineHeight: 16, color: 'rgba(255,255,255,0.8)' },
    embedded: { paddingTop: 10, paddingBottom: 2 },
  },
  nastaliq: {
    container: { gap: 3 },
    label: { fontSize: 12, lineHeight: 24, includeFontPadding: true },
    prayerName: { fontSize: 15, lineHeight: 32, includeFontPadding: true },
    time: { fontSize: 15, lineHeight: 22 },
    countdown: { fontSize: 14, lineHeight: 22 },
    hint: { fontSize: 12, lineHeight: 24, includeFontPadding: true, color: 'rgba(255,255,255,0.8)' },
    embedded: { paddingTop: 6, paddingBottom: 2 },
  },
} as const;

function formatCountdown(ms: number, useLatinDigits = false): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSec / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;
  const raw = hours > 0
    ? `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
    : `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  return useLatinDigits ? raw : toArabicNumeralsString(raw);
}

function ProgressRingWithCountdown({
  progress,
  ringColor,
  countdown,
}: {
  progress: number;
  ringColor: string;
  countdown: string;
}) {
  const radius = (RING_SIZE - STROKE * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - progress);

  return (
    <View style={styles.ringContainer}>
      <Svg width={RING_SIZE} height={RING_SIZE}>
        <Circle
          cx={RING_SIZE / 2}
          cy={RING_SIZE / 2}
          r={radius}
          stroke="rgba(255,255,255,0.2)"
          strokeWidth={STROKE}
          fill="none"
        />
        <Circle
          cx={RING_SIZE / 2}
          cy={RING_SIZE / 2}
          r={radius}
          stroke={ringColor}
          strokeWidth={STROKE}
          fill="none"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={offset}
          strokeLinecap="round"
          rotation="-90"
          origin={`${RING_SIZE / 2}, ${RING_SIZE / 2}`}
        />
      </Svg>
      <View style={styles.ringCenter} pointerEvents="none">
        <LocalizedText style={styles.countdownInside}>{countdown}</LocalizedText>
      </View>
    </View>
  );
}

const CountdownBlock = memo(function CountdownBlock({
  prayerTimes,
  ringColor,
  compact = false,
}: {
  prayerTimes: PrayerTimes;
  ringColor: string;
  compact?: boolean;
}) {
  const [now, setNow] = useState(() => new Date());
  const { isPashto, fontFamily, language } = useI18n();
  const compactMetrics = isPashto
    ? fontFamily === 'NotoNastaliqUrdu'
      ? pashtoCompactMetrics.nastaliq
      : pashtoCompactMetrics.amiri
    : null;

  useFocusEffect(
    useCallback(() => {
      const timer = setInterval(() => setNow(new Date()), 1000);
      return () => clearInterval(timer);
    }, []),
  );

  const next = getNextPrayer(prayerTimes, now);
  const remaining = next.time.getTime() - now.getTime();
  const progress = getPrayerProgress(prayerTimes, now);
  const countdown = formatCountdown(remaining, language === 'english');

  if (compact) {
    return (
      <View style={styles.compactCountdownWrap}>
        <View style={[styles.compactProgressTrack, isPashto && styles.compactProgressTrackPashto]}>
          <View style={[styles.compactProgressFill, { width: `${Math.round(progress * 100)}%`, backgroundColor: ringColor }]} />
        </View>
        <RtlText align="center" wrap={false} style={[styles.compactCountdown, compactMetrics?.countdown]}>{countdown}</RtlText>
      </View>
    );
  }

  return (
    <ProgressRingWithCountdown
      progress={progress}
      ringColor={ringColor}
      countdown={countdown}
    />
  );
});

interface NextPrayerCardProps {
  prayerTimes: PrayerTimes | null;
  variant?: 'full' | 'compact';
  embedded?: boolean;
}

function NextPrayerCardInner({ prayerTimes, variant = 'full', embedded = false }: NextPrayerCardProps) {
  const { theme, themeMode } = useApp();
  const { isPashto, language, t, fontFamily } = useI18n();
  const { state } = usePrayer();
  const gradient = NAAT_GRADIENT[themeMode] ?? NAAT_GRADIENT.light;
  const isCompact = variant === 'compact';
  const compactMetrics = isPashto
    ? fontFamily === 'NotoNastaliqUrdu'
      ? pashtoCompactMetrics.nastaliq
      : pashtoCompactMetrics.amiri
    : null;

  if (!prayerTimes) {
    const emptyContent = (
      <RtlText align="center" style={[styles.empty, { fontFamily }]}>{t('home.prayerUnavailable')}</RtlText>
    );

    if (embedded) {
      return <View style={[styles.embeddedCompact, compactMetrics?.embedded]}>{emptyContent}</View>;
    }

    return (
      <View style={[styles.cardShell, styles.shadow]}>
        <LinearGradient colors={gradient} style={isCompact ? styles.cardCompact : styles.card}>
          {emptyContent}
        </LinearGradient>
      </View>
    );
  }

  const next = getNextPrayer(prayerTimes);
  const adhanOn = state.adhanPreferences.masterEnabled;
  const timeZone = state.location?.timezone;
  const nextName = displayPrayerLabel(
    next.key === 'sunrise' ? 'fajr' : next.key,
    pickContent(next, 'name', language),
    state.settings.selectedCity,
    state.location,
  );

  const compactContent = (
    <RtlView style={[styles.compactContainer, compactMetrics?.container]}>
      {isPashto ? (
        <View style={styles.pashtoCompactLabelWrap}>
          <LocalizedText style={[styles.pashtoCompactLabel, { fontFamily }]}>
            {t('home.nextPrayer')}
          </LocalizedText>
        </View>
      ) : (
        <RtlText align="center" style={[styles.compactLabel, { fontFamily }]}>{t('home.nextPrayer')}</RtlText>
      )}
      <RtlView style={styles.compactNameBlock}>
        <RtlText testID="home-next-prayer-name" align="center" wrap={false} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} style={[styles.compactPrayerName, compactMetrics?.prayerName]}>{nextName}</RtlText>
        <RtlText testID="home-next-prayer-time" align="center" wrap={false} numberOfLines={1} style={[styles.compactTime, compactMetrics?.time, { color: theme.bookmark }]}>
          {formatPrayerTime12h(next.time, timeZone)}
        </RtlText>
      </RtlView>
      <CountdownBlock prayerTimes={prayerTimes} ringColor={theme.bookmark} compact />
      <RtlText align="center" style={[styles.compactHint, compactMetrics?.hint, isPashto && styles.compactHintPashto]}>
        {t(adhanOn ? 'home.adhan.enabled' : 'home.adhan.disabled')}
      </RtlText>
    </RtlView>
  );

  const fullContent = (
    <>
      <RtlText align="center" style={[styles.label, { fontFamily }]}>{t('home.nextPrayer')}</RtlText>
      <RtlText align="center" style={styles.prayerName}>{nextName}</RtlText>
      <RtlText align="center" style={[styles.time, { color: theme.bookmark }]}>
        {formatPrayerTime12h(next.time, timeZone)}
      </RtlText>
      <CountdownBlock prayerTimes={prayerTimes} ringColor={theme.bookmark} />
      <RtlText align="center" style={styles.hint}>
        {t(adhanOn ? 'home.adhan.enabled' : 'home.adhan.disabled')}
      </RtlText>
    </>
  );

  if (embedded && isCompact) {
    return <RtlView style={[styles.embeddedCompact, compactMetrics?.embedded]}>{compactContent}</RtlView>;
  }

  return (
    <View style={[embedded ? null : styles.cardShell, embedded ? null : styles.shadow]}>
      <LinearGradient
        colors={gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={isCompact ? styles.cardCompact : styles.card}
      >
        {isCompact ? compactContent : fullContent}
      </LinearGradient>
    </View>
  );
}

export const NextPrayerCard = memo(NextPrayerCardInner);

const styles = StyleSheet.create({
  cardShell: {
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.md,
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
  },
  shadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  card: {
    padding: Spacing.lg,
    alignItems: 'center',
    gap: Spacing.sm,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.35)',
  },
  cardCompact: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
  },
  embeddedCompact: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.xs,
    alignItems: 'center',
    alignSelf: 'stretch',
    width: '100%',
  },
  label: {
    fontFamily: 'Vazirmatn',
    fontSize: Typography.ui.caption,
    color: 'rgba(255,255,255,0.75)',
  },
  prayerName: {
    fontFamily: 'Vazirmatn-Bold',
    fontSize: Typography.ui.heading,
    color: '#fff',
  },
  time: {
    fontFamily: 'Vazirmatn-Bold',
    fontSize: 32,
    marginBottom: Spacing.xs,
  },
  ringContainer: {
    width: RING_SIZE,
    height: RING_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: Spacing.sm,
  },
  ringCenter: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countdownInside: {
    fontFamily: 'Vazirmatn-Bold',
    fontSize: 20,
    color: '#fff',
    fontVariant: ['tabular-nums'],
    textAlign: 'center',
    paddingHorizontal: 4,
  },
  hint: {
    fontFamily: 'Vazirmatn',
    fontSize: Typography.ui.caption,
    color: 'rgba(255,255,255,0.65)',
    marginTop: Spacing.xs,
  },
  empty: {
    fontFamily: 'Vazirmatn',
    fontSize: Typography.ui.body,
    color: 'rgba(255,255,255,0.7)',
    paddingVertical: Spacing.lg,
  },
  compactContainer: {
    gap: 4,
    alignItems: 'center',
    alignSelf: 'stretch',
    width: '100%',
  },
  compactNameBlock: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.sm,
    alignSelf: 'stretch',
    paddingHorizontal: Spacing.sm,
  },
  compactLabel: {
    ...persianCenterCaptionText,
    color: 'rgba(255,255,255,0.7)',
  },
  pashtoCompactLabelWrap: {
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 28,
    paddingTop: 2,
    paddingBottom: 2,
    overflow: 'visible',
  },
  pashtoCompactLabel: {
    width: '100%',
    textAlign: 'center',
    writingDirection: 'rtl',
    fontSize: 13,
    lineHeight: 24,
    includeFontPadding: true,
    color: 'rgba(255,255,255,0.85)',
  },
  compactPrayerName: {
    ...persianCenterSubtitleText,
    fontFamily: 'Vazirmatn-Bold',
    color: '#fff',
    flexShrink: 1,
  },
  compactTime: {
    ...persianCenterText,
    fontFamily: 'Vazirmatn-Bold',
    fontSize: Typography.ui.subtitle,
    flexShrink: 0,
  },
  compactCountdownWrap: {
    marginTop: 2,
    gap: 3,
    alignSelf: 'stretch',
    alignItems: 'center',
  },
  compactProgressTrack: {
    height: 3,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.2)',
    overflow: 'hidden',
    width: '100%',
  },
  compactProgressTrackPashto: {
    height: 4,
    width: '72%',
    borderRadius: 3,
  },
  compactProgressFill: {
    height: '100%',
    borderRadius: 2,
  },
  compactCountdown: {
    ...persianCenterText,
    fontFamily: 'Vazirmatn-Bold',
    fontSize: 15,
    color: 'rgba(255,255,255,0.9)',
    fontVariant: ['tabular-nums'],
  },
  compactHint: {
    ...persianCenterText,
    fontSize: 11,
    color: 'rgba(255,255,255,0.55)',
  },
  compactHintPashto: {
    color: 'rgba(255,255,255,0.8)',
  },
});
