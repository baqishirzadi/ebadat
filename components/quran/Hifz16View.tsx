/**
 * Fixed 16-line Indo-Pak hifz page reader (no translation).
 * One ayah font size per page; short lines stretch with measured kashida.
 * Pages 1–2 use a repeating green–blue floral tazhib border with a surah cartouche.
 */

import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Dimensions,
  FlatList,
  type ListRenderItemInfo,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
} from 'react-native';
import Svg, { Circle, Ellipse, G, Path, Rect } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BorderRadius, Spacing } from '@/constants/theme';
import { getSurah } from '@/data/surahNames';
import { useApp, useBookmarks, useReadingPosition } from '@/context/AppContext';
import audioManager from '@/utils/quranAudio';
import {
  applyKashida,
  kashidaCountForWidth,
  splitAyahSpans,
  visibleLength,
} from '@/utils/hifzKashida';
import { toArabicNumerals } from '@/utils/numbers';
import {
  getHifzLinePlayTarget,
  getHifzPage,
  getHifzSurahStartPage,
  hifzAyahVisibleLengthOnPage,
  listHifzPagesForAyah,
  resolveHifzPageTarget,
  HIFZ16_PAGE_COUNT,
  type HifzLine,
  type HifzPage,
} from '@/utils/hifz16';
import { MaterialIcons } from '@expo/vector-icons';

const HIFZ_FONT = Platform.OS === 'ios' ? 'Scheherazade New' : 'ScheherazadeNew';
const PAGE_WIDTH = Dimensions.get('window').width;
const BASE_FONT = 19;
const MIN_FONT = 16;
const MAX_FONT = 22;
const OPENING_FONT = 26;
/** Tall enough for Scheherazade harakat and letter tails. */
const LINE_HEIGHT_RATIO = 1.9;
/** Extra tall for Bismillah so ی / م descenders are not clipped. */
const BASMALLAH_LINE_HEIGHT_RATIO = 2.35;
const BISMILLAH = 'بِسْمِ اللّٰهِ الرَّحْمٰنِ الرَّحِیْمِ';
const AYAH_HIGHLIGHT = 'rgba(14, 107, 79, 0.12)';
const KASHIDA_SLOT_CAP = 14;

/** Fixed miniature palette (independent of app theme). */
const ILLUM = {
  greenDark: '#0E6B4F',
  green: '#1A8A68',
  greenLight: '#D4EDE3',
  blueDark: '#1A6B8A',
  blue: '#3AA0B8',
  blueLight: '#D6EAF2',
  cream: '#FBF7EF',
  field: '#E8F3EE',
  gold: '#C4A35A',
  goldLite: '#D4B86A',
  goldDark: '#A88840',
  ink: '#1A2E28',
};

type Props = {
  surahNumber: number;
  initialAyah?: number;
  contentPaddingTop: number;
  contentPaddingBottom: number;
  activePlayingSurah?: number | null;
  activePlayingAyah?: number | null;
  onPlayAyah?: (surah: number, ayah: number) => void;
  /** Visible page's play target (for dock play/bookmark). */
  onVisiblePositionChange?: (surahNumber: number, ayahNumber: number, pageNumber: number) => void;
};

function isOpeningPage(page: number) {
  return page === 1 || page === 2;
}

/** Bismillah under surah name except Fatiha (ayah 1) and Tawbah (none). */
function shouldInjectBasmallah(line: HifzLine, next: HifzLine | undefined): boolean {
  if (line.type !== 'surah_name') return false;
  const surah = line.surahNumber;
  if (surah == null || surah === 1 || surah === 9) return false;
  return next?.type !== 'basmallah';
}

function estimatePageFontSize(page: HifzPage, contentWidth: number, opening: boolean): number {
  if (contentWidth <= 0) return opening ? OPENING_FONT : BASE_FONT;
  const ayahLines = page.lines.filter((line) => line.type === 'ayah' && line.text && !line.centered);
  if (ayahLines.length === 0) return opening ? OPENING_FONT : BASE_FONT;
  const longest = Math.max(...ayahLines.map((line) => visibleLength(line.text)));
  // Longest line nearly fills the column; shorter lines stretch up to it.
  const estimated = (contentWidth * 0.98) / (Math.max(longest, 1) * 0.52);
  const lo = opening ? 18 : MIN_FONT;
  const hi = opening ? 24 : MAX_FONT;
  return Math.max(lo, Math.min(hi, Math.floor(estimated)));
}

const androidFontPad = Platform.OS === 'android' ? { includeFontPadding: true as const } : null;

/** One floral unit: petals + leaf, used along the border band. */
function FloralUnit({
  x,
  y,
  scale = 1,
  rotate = 0,
}: {
  x: number;
  y: number;
  scale?: number;
  rotate?: number;
}) {
  return (
    <G transform={`translate(${x}, ${y}) rotate(${rotate}) scale(${scale})`}>
      <Path d="M0,-2 Q7,-10 12,-1 Q7,3 0,-2" fill={ILLUM.green} opacity={0.95} />
      <Path d="M0,2 Q-7,10 -12,1 Q-7,-3 0,2" fill={ILLUM.greenDark} opacity={0.85} />
      {[0, 72, 144, 216, 288].map((deg, i) => {
        const rad = (deg * Math.PI) / 180;
        const px = Math.cos(rad) * 5.5;
        const py = Math.sin(rad) * 5.5;
        const fill = i % 2 === 0 ? ILLUM.blue : ILLUM.green;
        return (
          <Ellipse
            key={deg}
            cx={px}
            cy={py}
            rx={3.4}
            ry={5}
            fill={fill}
            opacity={0.95}
            transform={`rotate(${deg}, ${px}, ${py})`}
          />
        );
      })}
      <Circle cx={0} cy={0} r={2.8} fill={ILLUM.goldLite} />
      <Circle cx={0} cy={0} r={1.2} fill={ILLUM.blueDark} />
    </G>
  );
}

function CornerBloom({ x, y }: { x: number; y: number }) {
  return (
    <G transform={`translate(${x}, ${y})`}>
      {[0, 45, 90, 135, 180, 225, 270, 315].map((deg, i) => {
        const rad = (deg * Math.PI) / 180;
        const px = Math.cos(rad) * 10;
        const py = Math.sin(rad) * 10;
        return (
          <Ellipse
            key={deg}
            cx={px}
            cy={py}
            rx={5}
            ry={7.5}
            fill={i % 2 === 0 ? ILLUM.green : ILLUM.blue}
            opacity={0.92}
            transform={`rotate(${deg}, ${px}, ${py})`}
          />
        );
      })}
      {[22.5, 112.5, 202.5, 292.5].map((deg) => {
        const rad = (deg * Math.PI) / 180;
        const lx = Math.cos(rad) * 17;
        const ly = Math.sin(rad) * 17;
        const mx = Math.cos(rad) * 12;
        const my = Math.sin(rad) * 12;
        return (
          <Path
            key={`leaf-${deg}`}
            d={`M0,0 Q${mx},${my} ${lx},${ly}`}
            stroke={ILLUM.greenDark}
            strokeWidth={1.6}
            fill="none"
            opacity={0.8}
          />
        );
      })}
      <Circle cx={0} cy={0} r={5.5} fill={ILLUM.greenDark} />
      <Circle cx={0} cy={0} r={3.2} fill={ILLUM.blue} />
      <Circle cx={0} cy={0} r={1.6} fill={ILLUM.gold} />
    </G>
  );
}

/**
 * Repeating green–blue floral border.
 * `slim` keeps a ~12px band so regular pages keep room for 16 lines.
 */
const FloralOpeningBorder = memo(function FloralOpeningBorder({
  width,
  height,
  slim = false,
}: {
  width: number;
  height: number;
  slim?: boolean;
}) {
  if (width <= 0 || height <= 0) return null;

  const w = width;
  const h = height;
  const outer = slim ? 0 : 6;
  const bandOuter = slim ? 0 : 12;
  const bandInner = slim ? 5 : 34;
  const tip = slim ? 0 : 8;
  const step = slim ? 8 : 14;
  const unitStep = slim ? 12 : 24;
  const flowerScale = slim ? 0.28 : 0.92;
  const cornerScale = slim ? 0.3 : 1;

  // Scalloped outer path
  const scallopOuter: string[] = [`M ${outer},${outer + tip}`];
  for (let x = outer; x < w - outer; x += step) {
    scallopOuter.push(
      `L ${Math.min(x + step / 2, w - outer)},${outer}`,
      `L ${Math.min(x + step, w - outer)},${outer + tip}`
    );
  }
  for (let y = outer + tip; y < h - outer; y += step) {
    scallopOuter.push(
      `L ${w - outer},${Math.min(y + tip, h - outer)}`,
      `L ${w - outer - tip},${Math.min(y + step, h - outer)}`
    );
  }
  for (let x = w - outer; x > outer; x -= step) {
    scallopOuter.push(
      `L ${Math.max(x - step / 2, outer)},${h - outer}`,
      `L ${Math.max(x - step, outer)},${h - outer - tip}`
    );
  }
  for (let y = h - outer - tip; y > outer; y -= step) {
    scallopOuter.push(
      `L ${outer},${Math.max(y - tip, outer)}`,
      `L ${outer + tip},${Math.max(y - step, outer)}`
    );
  }
  scallopOuter.push('Z');

  const frameRing = [
    `M ${bandOuter},${bandOuter}`,
    `H ${w - bandOuter}`,
    `V ${h - bandOuter}`,
    `H ${bandOuter}`,
    'Z',
    `M ${bandInner},${bandInner}`,
    `V ${h - bandInner}`,
    `H ${w - bandInner}`,
    `V ${bandInner}`,
    'Z',
  ].join(' ');

  const topUnits: number[] = [];
  for (let x = bandInner + (slim ? 4 : 8); x < w - bandInner - (slim ? 2 : 6); x += unitStep) {
    topUnits.push(x);
  }
  const sideUnits: number[] = [];
  for (let y = bandInner + (slim ? 8 : 14); y < h - bandInner - (slim ? 6 : 10); y += unitStep) {
    sideUnits.push(y);
  }

  const midY = (bandOuter + bandInner) / 2;
  const midX = (bandOuter + bandInner) / 2;
  const cornerInset = slim ? 6 : 10;

  return (
    <Svg width={w} height={h} style={StyleSheet.absoluteFill} pointerEvents="none">
      <Rect x={0} y={0} width={w} height={h} fill={ILLUM.cream} />
      <Path d={scallopOuter.join(' ')} fill={ILLUM.greenDark} />
      <Path
        d={scallopOuter.join(' ')}
        fill="none"
        stroke={ILLUM.gold}
        strokeWidth={slim ? 0.8 : 1.4}
      />
      <Rect
        x={outer + (slim ? 2 : 4)}
        y={outer + (slim ? 2 : 4)}
        width={w - (outer + (slim ? 2 : 4)) * 2}
        height={h - (outer + (slim ? 2 : 4)) * 2}
        fill={ILLUM.cream}
        stroke={ILLUM.goldLite}
        strokeWidth={slim ? 0.6 : 1}
      />
      <Path d={frameRing} fill={ILLUM.field} fillRule="evenodd" />
      <Path d={frameRing} fill={ILLUM.blueLight} fillRule="evenodd" opacity={0.35} />
      <Rect
        x={bandOuter}
        y={bandOuter}
        width={w - bandOuter * 2}
        height={h - bandOuter * 2}
        fill="none"
        stroke={ILLUM.greenDark}
        strokeWidth={slim ? 1.2 : 2.2}
      />
      <Rect
        x={bandInner}
        y={bandInner}
        width={w - bandInner * 2}
        height={h - bandInner * 2}
        fill="#FFFEFA"
        stroke={ILLUM.gold}
        strokeWidth={slim ? 1 : 1.8}
      />
      {!slim ? (
        <Rect
          x={bandInner + 4}
          y={bandInner + 4}
          width={w - (bandInner + 4) * 2}
          height={h - (bandInner + 4) * 2}
          fill="none"
          stroke={ILLUM.green}
          strokeWidth={0.9}
          opacity={0.6}
        />
      ) : null}

      {topUnits.map((x, i) => (
        <FloralUnit
          key={`t-${i}`}
          x={x}
          y={midY}
          scale={flowerScale}
          rotate={i % 2 === 0 ? -10 : 10}
        />
      ))}
      {topUnits.map((x, i) => (
        <FloralUnit
          key={`b-${i}`}
          x={x}
          y={h - midY}
          scale={flowerScale}
          rotate={i % 2 === 0 ? 170 : 190}
        />
      ))}
      {sideUnits.map((y, i) => (
        <FloralUnit
          key={`l-${i}`}
          x={midX}
          y={y}
          scale={flowerScale * 0.95}
          rotate={i % 2 === 0 ? -98 : -82}
        />
      ))}
      {sideUnits.map((y, i) => (
        <FloralUnit
          key={`r-${i}`}
          x={w - midX}
          y={y}
          scale={flowerScale * 0.95}
          rotate={i % 2 === 0 ? 98 : 82}
        />
      ))}

      <G transform={`translate(${bandOuter + cornerInset}, ${bandOuter + cornerInset}) scale(${cornerScale})`}>
        <CornerBloom x={0} y={0} />
      </G>
      <G transform={`translate(${w - bandOuter - cornerInset}, ${bandOuter + cornerInset}) scale(${cornerScale})`}>
        <CornerBloom x={0} y={0} />
      </G>
      <G transform={`translate(${bandOuter + cornerInset}, ${h - bandOuter - cornerInset}) scale(${cornerScale})`}>
        <CornerBloom x={0} y={0} />
      </G>
      <G
        transform={`translate(${w - bandOuter - cornerInset}, ${h - bandOuter - cornerInset}) scale(${cornerScale})`}
      >
        <CornerBloom x={0} y={0} />
      </G>
    </Svg>
  );
});

/** Page / juz strip painted into the floral top band (opening pages only). */
const OpeningMetaBand = memo(function OpeningMetaBand({
  pageNumber,
  juz,
}: {
  pageNumber: number;
  juz: number;
}) {
  return (
    <View style={styles.openingMetaBand}>
      <Text style={[styles.openingMetaText, androidFontPad]}>
        {toArabicNumerals(pageNumber)}
      </Text>
      <Text style={[styles.openingMetaText, androidFontPad]}>
        الجزء {toArabicNumerals(juz)}
      </Text>
    </View>
  );
});

/**
 * Dense green–blue flower field. Used above the cartouche and below the ayahs
 * so leftover white on pages 1–2 is filled with the same floral design.
 */
const OpeningGarden = memo(function OpeningGarden() {
  const [size, setSize] = useState({ width: 0, height: 0 });

  const flowers = useMemo(() => {
    const { width, height } = size;
    if (width < 24 || height < 24) return [];
    const gapX = 34;
    const gapY = 32;
    const cols = Math.max(3, Math.floor(width / gapX));
    const rows = Math.max(1, Math.floor(height / gapY));
    const items: { x: number; y: number; scale: number; rotate: number; bloom: boolean }[] = [];
    for (let row = 0; row < rows; row += 1) {
      for (let col = 0; col < cols; col += 1) {
        const offset = row % 2 === 0 ? gapX * 0.35 : gapX * 0.85;
        const x = 16 + col * gapX + (offset % gapX) * 0.15;
        const y = gapY * 0.55 + row * gapY;
        if (x > width - 8 || y > height - 6) continue;
        const bloom = (row + col) % 5 === 0;
        items.push({
          x,
          y,
          scale: bloom ? 1.15 : 0.82,
          rotate: (row * 17 + col * 23) % 40 - 20,
          bloom,
        });
      }
    }
    return items;
  }, [size]);

  return (
    <View
      style={styles.openingGarden}
      onLayout={(event) => {
        const { width, height } = event.nativeEvent.layout;
        const next = { width: Math.floor(width), height: Math.floor(height) };
        setSize((prev) => (prev.width === next.width && prev.height === next.height ? prev : next));
      }}
    >
      <Svg width={size.width || 1} height={size.height || 1}>
        <Rect
          x={0}
          y={0}
          width={size.width || 1}
          height={size.height || 1}
          fill={ILLUM.field}
          opacity={0.55}
        />
        {flowers.map((flower, index) =>
          flower.bloom ? (
            <CornerBloom key={`bloom-${index}`} x={flower.x} y={flower.y} />
          ) : (
            <FloralUnit
              key={`fl-${index}`}
              x={flower.x}
              y={flower.y}
              scale={flower.scale}
              rotate={flower.rotate}
            />
          )
        )}
      </Svg>
    </View>
  );
});

/** Blue–green cartouche with gold trim for the surah name above the ayah text. */
const SurahCartouche = memo(function SurahCartouche({ title }: { title?: string }) {
  if (!title) return null;
  return (
    <View style={styles.surahCartouche}>
      <View style={styles.surahCartoucheFrame} />
      <Text
        numberOfLines={1}
        ellipsizeMode="clip"
        style={[styles.surahCartoucheText, { fontFamily: HIFZ_FONT }, androidFontPad]}
      >
        {title}
      </Text>
    </View>
  );
});

/** Tiny side flower for compact surah / Bismillah ornaments. */
const MiniFloral = memo(function MiniFloral({ size = 22 }: { size?: number }) {
  const mid = size / 2;
  return (
    <Svg width={size} height={size}>
      <FloralUnit x={mid} y={mid} scale={size / 28} />
    </Svg>
  );
});

/**
 * Compact floral gold header: surah name in a slim cartouche with side flowers,
 * optional Bismillah with gold rules and end blooms.
 */
const SurahFloralHeader = memo(function SurahFloralHeader({
  title,
  basmallahText,
  fontSize,
}: {
  title?: string;
  basmallahText?: string | null;
  fontSize: number;
  lineHeight: number;
}) {
  const titleSize = Math.max(13, fontSize - 1);
  const titleText = title ? applyKashida(title, 4, 2) : '';
  return (
    <View style={styles.floralHeader}>
      {title ? (
        <View style={styles.surahBannerRow}>
          <MiniFloral size={14} />
          <View style={styles.surahBanner}>
            <View style={styles.surahBannerInner} />
            <Text
              numberOfLines={1}
              style={[
                styles.surahBannerText,
                {
                  fontFamily: HIFZ_FONT,
                  fontSize: titleSize,
                  lineHeight: Math.round(titleSize * 1.5),
                },
                androidFontPad,
              ]}
            >
              {titleText}
            </Text>
          </View>
          <MiniFloral size={14} />
        </View>
      ) : null}
      {basmallahText != null ? (
        <BasmallahText
          text={basmallahText || BISMILLAH}
          fontSize={fontSize}
          ornate
          compact
        />
      ) : null}
    </View>
  );
});

/** Full Bismillah line with room for Scheherazade descenders. */
const BasmallahText = memo(function BasmallahText({
  text,
  fontSize,
  ornate = false,
  compact = false,
}: {
  text?: string;
  fontSize: number;
  ornate?: boolean;
  /** Mid-page header: smaller type so it fits the two-line slot. */
  compact?: boolean;
}) {
  const size = compact ? Math.max(13, fontSize - 2) : fontSize + 1;
  const ratio = compact ? 2 : BASMALLAH_LINE_HEIGHT_RATIO;
  const body = (
    <Text
      style={[
        styles.basmallahText,
        ornate && styles.basmallahTextOrnate,
        {
          color: ILLUM.greenDark,
          fontFamily: HIFZ_FONT,
          fontSize: size,
          lineHeight: Math.round(size * ratio),
        },
        androidFontPad,
      ]}
    >
      {text || BISMILLAH}
    </Text>
  );

  if (!ornate) {
    return <View style={styles.basmallahRow}>{body}</View>;
  }

  return (
    <View style={[styles.basmallahOrnateRow, compact && styles.basmallahOrnateRowCompact]}>
      <View style={styles.basmallahRuleSide}>
        <MiniFloral size={compact ? 12 : 14} />
        <View style={styles.basmallahRule} />
      </View>
      <View style={[styles.basmallahOrnateTextWrap, compact && styles.basmallahOrnateTextWrapCompact]}>
        {body}
      </View>
      <View style={[styles.basmallahRuleSide, styles.basmallahRuleSideEnd]}>
        <View style={styles.basmallahRule} />
        <MiniFloral size={compact ? 12 : 14} />
      </View>
    </View>
  );
});

const MAX_KASHIDA_TOTAL = 12 * KASHIDA_SLOT_CAP;

type MeasurePhase = 'natural' | 'stretched' | 'done';

const JustifiedAyahText = memo(function JustifiedAyahText({
  text,
  fontSize,
  lineHeight,
  color,
  contentWidth,
  centered,
  justify = false,
  ayahStart,
  ayahEnd,
  highlightAyah,
}: {
  text: string;
  fontSize: number;
  lineHeight: number;
  color: string;
  contentWidth: number;
  centered?: boolean;
  /** From page 3: stretch joining letters so the line reaches the column edge. */
  justify?: boolean;
  ayahStart?: number;
  ayahEnd?: number;
  highlightAyah?: number | null;
}) {
  const prepared = text;
  const fitWidth = Math.max(0, contentWidth);
  const stretch = justify && !centered;
  const fillTarget = Math.max(0, fitWidth - 2);

  const [kashidaCount, setKashidaCount] = useState(0);
  const [phase, setPhase] = useState<MeasurePhase>(stretch ? 'natural' : 'done');
  const refinePass = useRef(0);
  const naturalWidth = useRef(0);
  const countRef = useRef(0);
  const [visibleCount, setVisibleCount] = useState(0);

  useEffect(() => {
    refinePass.current = 0;
    naturalWidth.current = 0;
    countRef.current = 0;
    setKashidaCount(0);
    setVisibleCount(0);
    setPhase(stretch && prepared && fitWidth > 0 ? 'natural' : 'done');
  }, [fitWidth, fontSize, prepared, stretch]);

  const display = useMemo(() => {
    if (!stretch || visibleCount <= 0) return prepared;
    return applyKashida(prepared, visibleCount, KASHIDA_SLOT_CAP);
  }, [prepared, stretch, visibleCount]);

  const measureText = useMemo(() => {
    if (kashidaCount <= 0) return prepared;
    return applyKashida(prepared, kashidaCount, KASHIDA_SLOT_CAP);
  }, [kashidaCount, prepared]);

  const onNaturalLayout = useCallback(
    (event: { nativeEvent: { lines: { width: number }[] } }) => {
      if (phase !== 'natural' || !stretch || fitWidth <= 0) return;
      const lines = event.nativeEvent.lines;
      let width = lines[0]?.width ?? 0;
      // If the measure host was clipped, Android reports multiple wrapped lines
      // near the column width — fall back to a character estimate.
      if (lines.length > 1 && width >= fillTarget - 8) {
        const chars = visibleLength(prepared);
        const targetChars = fillTarget / Math.max(fontSize * 0.22, 4);
        width = Math.max(1, chars * (fillTarget / Math.max(targetChars, chars)));
      }
      if (width <= 0) return;
      naturalWidth.current = width;
      if (width >= fillTarget) {
        countRef.current = 0;
        setKashidaCount(0);
        setVisibleCount(0);
        setPhase('done');
        return;
      }
      const measured = kashidaCountForWidth(width, fillTarget, fontSize);
      countRef.current = measured;
      setKashidaCount(measured);
      setPhase(measured > 0 ? 'stretched' : 'done');
    },
    [fillTarget, fitWidth, fontSize, phase, prepared, stretch]
  );

  const onStretchedLayout = useCallback(
    (event: { nativeEvent: { lines: { width: number }[] } }) => {
      if (phase !== 'stretched' || fitWidth <= 0) return;
      const width = event.nativeEvent.lines[0]?.width ?? 0;
      if (width <= 0) return;

      const count = countRef.current;
      const overflow = width - fillTarget;
      const gained = width - naturalWidth.current;
      const per = count > 0 && gained > 0 ? gained / count : Math.max(fontSize * 0.28, 3.2);

      if (overflow > 2) {
        const next = Math.max(0, count - Math.max(1, Math.ceil(overflow / per)));
        if (refinePass.current >= 6 || next === count) {
          setVisibleCount(next);
          setPhase('done');
          return;
        }
        refinePass.current += 1;
        countRef.current = next;
        setKashidaCount(next);
        return;
      }

      const slack = fillTarget - width;
      if (slack > 4 && refinePass.current < 6 && count < MAX_KASHIDA_TOTAL) {
        refinePass.current += 1;
        const next = Math.min(MAX_KASHIDA_TOTAL, count + Math.max(1, Math.round(slack / per)));
        countRef.current = next;
        setKashidaCount(next);
        return;
      }

      setVisibleCount(count);
      setPhase('done');
    },
    [fillTarget, fitWidth, fontSize, phase]
  );

  const spans = useMemo(() => {
    if (ayahStart == null || ayahEnd == null) {
      return [{ text: display, ayah: -1 }];
    }
    return splitAyahSpans(display, ayahStart, ayahEnd);
  }, [ayahEnd, ayahStart, display]);

  const lineStyle = useMemo(
    () => [
      styles.lineText,
      centered ? styles.lineCentered : styles.lineArabic,
      { color, fontSize, lineHeight },
      androidFontPad,
    ],
    [centered, color, fontSize, lineHeight]
  );

  const measureStyle = useMemo(
    () => [
      {
        fontFamily: HIFZ_FONT,
        color,
        fontSize,
        lineHeight,
        textAlign: 'right' as const,
        writingDirection: 'rtl' as const,
      },
      androidFontPad,
    ],
    [color, fontSize, lineHeight]
  );

  const measuring = stretch && fitWidth > 0 && phase !== 'done';

  return (
    <View style={styles.lineMeasureWrap}>
      {measuring ? (
        <View style={styles.measureHost} pointerEvents="none">
          <Text
            key={`m-${phase}-${kashidaCount}`}
            style={measureStyle}
            onTextLayout={phase === 'natural' ? onNaturalLayout : onStretchedLayout}
          >
            {phase === 'natural' ? prepared : measureText}
          </Text>
        </View>
      ) : null}
      <Text style={lineStyle}>
        {highlightAyah == null
          ? display
          : spans.map((span, index) => {
              const active = span.ayah === highlightAyah && span.ayah > 0;
              return (
                <Text
                  key={`${span.ayah}-${index}`}
                  style={active ? styles.ayahHighlight : undefined}
                >
                  {span.text}
                </Text>
              );
            })}
      </Text>
    </View>
  );
});

export const Hifz16View = memo(function Hifz16View({
  surahNumber,
  initialAyah = 1,
  contentPaddingTop,
  contentPaddingBottom,
  activePlayingSurah,
  activePlayingAyah,
  onPlayAyah,
  onVisiblePositionChange,
}: Props) {
  const { theme } = useApp();
  const { position, updatePosition } = useReadingPosition();
  const { isBookmarked } = useBookmarks();
  const insets = useSafeAreaInsets();
  const listRef = useRef<FlatList<number>>(null);

  const pageNumbers = useMemo(
    () => Array.from({ length: HIFZ16_PAGE_COUNT }, (_, index) => index + 1),
    []
  );

  const startPage = useMemo(() => {
    if (initialAyah > 1) {
      for (let page = getHifzSurahStartPage(surahNumber); page <= HIFZ16_PAGE_COUNT; page += 1) {
        const data = getHifzPage(page);
        if (!data) continue;
        const hit = data.lines.some(
          (line) =>
            line.type === 'ayah' &&
            line.surahNumber === surahNumber &&
            line.ayahStart != null &&
            line.ayahEnd != null &&
            line.ayahStart <= initialAyah &&
            initialAyah <= line.ayahEnd
        );
        if (hit) return page;
        if (data.lines.some((line) => line.surahNumber && line.surahNumber > surahNumber)) break;
      }
    }
    return getHifzSurahStartPage(surahNumber);
  }, [initialAyah, surahNumber]);

  const startIndex = Math.max(0, startPage - 1);
  const visiblePageRef = useRef(startPage);
  const userInterruptedFollowRef = useRef(false);
  const followProgrammaticRef = useRef(false);

  const scrollToPage = useCallback((page: number, animated: boolean) => {
    const index = Math.max(0, page - 1);
    visiblePageRef.current = page;
    followProgrammaticRef.current = true;
    requestAnimationFrame(() => {
      listRef.current?.scrollToIndex({ index, animated });
      // FlatList settle; clear flag after animation window.
      setTimeout(() => {
        followProgrammaticRef.current = false;
      }, animated ? 450 : 80);
    });
  }, []);

  useEffect(() => {
    visiblePageRef.current = startPage;
    userInterruptedFollowRef.current = false;
    scrollToPage(startPage, false);
  }, [scrollToPage, startPage, surahNumber]);

  // Follow the playing ayah in both directions. Mid-ayah multi-page turns
  // follow audio progress. Manual paging pauses follow until audio catches up.
  useEffect(() => {
    if (activePlayingSurah == null || activePlayingAyah == null) {
      userInterruptedFollowRef.current = false;
      return;
    }

    const surah = activePlayingSurah;
    const ayah = activePlayingAyah;
    const pages = listHifzPagesForAyah(surah, ayah);
    if (pages.length === 0) return;

    const firstPage = pages[0];
    const lastPage = pages[pages.length - 1];
    userInterruptedFollowRef.current = false;

    const jumpToNearestContainingPage = () => {
      const visible = visiblePageRef.current;
      if (pages.includes(visible)) return;
      const target =
        visible < firstPage ? firstPage : visible > lastPage ? lastPage : firstPage;
      scrollToPage(target, true);
    };

    jumpToNearestContainingPage();

    const lengths = pages.map((page) => hifzAyahVisibleLengthOnPage(page, surah, ayah));
    const total = Math.max(1, lengths.reduce((sum, n) => sum + n, 0));

    const pageForProgress = (position: number, duration: number): number => {
      if (pages.length < 2 || duration <= 0.25) {
        return pages.includes(visiblePageRef.current) ? visiblePageRef.current : firstPage;
      }
      const ratio = Math.min(1, Math.max(0, position / duration));
      let acc = 0;
      let target = lastPage;
      for (let i = 0; i < pages.length; i += 1) {
        acc += lengths[i] / total;
        if (ratio < acc || i === pages.length - 1) {
          target = pages[i];
          break;
        }
      }
      return target;
    };

    const followProgress = (position: number, duration: number) => {
      const target = pageForProgress(position, duration);
      if (userInterruptedFollowRef.current) {
        if (target === visiblePageRef.current) {
          userInterruptedFollowRef.current = false;
        }
        return;
      }
      if (target !== visiblePageRef.current) {
        scrollToPage(target, true);
      }
    };

    const snap = audioManager.getPlaybackSnapshot();
    if (snap.surah === surah && snap.ayah === ayah) {
      followProgress(snap.position, snap.duration);
    }
    return audioManager.subscribe((next) => {
      if (next.surah !== surah || next.ayah !== ayah) return;
      followProgress(next.position, next.duration);
    });
  }, [activePlayingAyah, activePlayingSurah, scrollToPage]);

  const handleLinePress = useCallback(
    (line: HifzLine) => {
      const target = getHifzLinePlayTarget(line);
      if (!target || !onPlayAyah) return;
      onPlayAyah(target.surah, target.ayah);
    },
    [onPlayAyah]
  );

  const onVisiblePositionChangeRef = useRef(onVisiblePositionChange);
  onVisiblePositionChangeRef.current = onVisiblePositionChange;
  const updatePositionRef = useRef(updatePosition);
  updatePositionRef.current = updatePosition;
  const positionRef = useRef(position);
  positionRef.current = position;
  const playingRef = useRef({ surah: activePlayingSurah, ayah: activePlayingAyah });
  playingRef.current = { surah: activePlayingSurah, ayah: activePlayingAyah };

  const reportVisiblePosition = useCallback((pageNumber: number) => {
    const playing = playingRef.current;
    const saved = positionRef.current;
    const resolved = resolveHifzPageTarget(pageNumber, {
      playingSurah: playing.surah,
      playingAyah: playing.ayah,
      savedSurah: saved.surahNumber > 0 ? saved.surahNumber : null,
      savedAyah: saved.ayahNumber > 0 ? saved.ayahNumber : null,
    });
    if (!resolved) return;

    updatePositionRef.current({
      surahNumber: resolved.surah,
      ayahNumber: resolved.ayah,
      page: resolved.page,
    });
    onVisiblePositionChangeRef.current?.(resolved.surah, resolved.ayah, resolved.page);
  }, []);

  useEffect(() => {
    reportVisiblePosition(startPage);
  }, [reportVisiblePosition, startPage]);

  // Re-resolve dock target when playback moves onto the visible page.
  useEffect(() => {
    reportVisiblePosition(visiblePageRef.current);
  }, [activePlayingAyah, activePlayingSurah, reportVisiblePosition]);

  const reportVisiblePositionLive = useRef(reportVisiblePosition);
  reportVisiblePositionLive.current = reportVisiblePosition;

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: Array<{ item: number }> }) => {
      const first = viewableItems[0]?.item;
      if (typeof first !== 'number') return;
      visiblePageRef.current = first;
      reportVisiblePositionLive.current(first);
    }
  ).current;

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 60 }).current;

  const handleScrollBeginDrag = useCallback(() => {
    if (followProgrammaticRef.current) return;
    if (playingRef.current.surah != null && playingRef.current.ayah != null) {
      userInterruptedFollowRef.current = true;
    }
  }, []);

  const lineHasBookmark = useCallback(
    (line: HifzLine) => {
      if (line.type !== 'ayah' || line.surahNumber == null || line.ayahStart == null) {
        return false;
      }
      const end = line.ayahEnd ?? line.ayahStart;
      for (let ayah = line.ayahStart; ayah <= end; ayah += 1) {
        if (isBookmarked(line.surahNumber, ayah)) return true;
      }
      return false;
    },
    [isBookmarked]
  );

  const renderPage = useCallback(
    ({ item: pageNumber }: ListRenderItemInfo<number>) => {
      const page = getHifzPage(pageNumber);
      if (!page) return <View style={{ width: PAGE_WIDTH }} />;
      return (
        <HifzPageCard
          page={page}
          background={theme.background}
          contentPaddingTop={contentPaddingTop}
          contentPaddingBottom={contentPaddingBottom + insets.bottom}
          activePlayingSurah={activePlayingSurah}
          activePlayingAyah={activePlayingAyah}
          onLinePress={handleLinePress}
          lineHasBookmark={lineHasBookmark}
        />
      );
    },
    [
      activePlayingAyah,
      activePlayingSurah,
      contentPaddingBottom,
      contentPaddingTop,
      handleLinePress,
      insets.bottom,
      lineHasBookmark,
      theme.background,
    ]
  );

  return (
    <FlatList
      ref={listRef}
      style={[styles.list, { backgroundColor: theme.background }]}
      data={pageNumbers}
      keyExtractor={(page) => `hifz16-${page}`}
      horizontal
      pagingEnabled
      showsHorizontalScrollIndicator={false}
      initialScrollIndex={startIndex}
      getItemLayout={(_, index) => ({
        length: PAGE_WIDTH,
        offset: PAGE_WIDTH * index,
        index,
      })}
      onScrollToIndexFailed={({ index }) => {
        requestAnimationFrame(() => {
          listRef.current?.scrollToIndex({ index, animated: false });
        });
      }}
      renderItem={renderPage}
      onViewableItemsChanged={onViewableItemsChanged}
      viewabilityConfig={viewabilityConfig}
      onScrollBeginDrag={handleScrollBeginDrag}
      windowSize={3}
      initialNumToRender={2}
      maxToRenderPerBatch={2}
      removeClippedSubviews={false}
    />
  );
});

const HifzPageCard = memo(function HifzPageCard({
  page,
  background,
  contentPaddingTop,
  contentPaddingBottom,
  activePlayingSurah,
  activePlayingAyah,
  onLinePress,
  lineHasBookmark,
}: {
  page: HifzPage;
  background: string;
  contentPaddingTop: number;
  contentPaddingBottom: number;
  activePlayingSurah?: number | null;
  activePlayingAyah?: number | null;
  onLinePress: (line: HifzLine) => void;
  lineHasBookmark: (line: HifzLine) => boolean;
}) {
  const opening = isOpeningPage(page.page);
  const [contentWidth, setContentWidth] = useState(0);
  const [frameSize, setFrameSize] = useState({ width: 0, height: 0 });

  const onTextColumnLayout = useCallback((event: LayoutChangeEvent) => {
    const next = Math.floor(event.nativeEvent.layout.width);
    setContentWidth((prev) => (prev === next ? prev : next));
  }, []);

  const onFrameLayout = useCallback((event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setFrameSize((prev) =>
      prev.width === Math.floor(width) && prev.height === Math.floor(height)
        ? prev
        : { width: Math.floor(width), height: Math.floor(height) }
    );
  }, []);

  const fontSize = useMemo(
    () => estimatePageFontSize(page, contentWidth, opening),
    [page, contentWidth, opening]
  );
  const lineHeight = Math.round(fontSize * LINE_HEIGHT_RATIO);

  const surahLine = page.lines.find((line) => line.type === 'surah_name');
  const surahInfo = surahLine?.surahNumber ? getSurah(surahLine.surahNumber) : undefined;
  const basmallahLine = page.lines.find((line) => line.type === 'basmallah');
  const openingAyahLines = useMemo(
    () => page.lines.filter((line) => line.type === 'ayah' && line.text),
    [page.lines]
  );
  const regularLines = page.lines;

  return (
    <View
      style={[
        styles.page,
        {
          width: PAGE_WIDTH,
          backgroundColor: background,
          paddingTop: contentPaddingTop,
          paddingBottom: contentPaddingBottom,
        },
      ]}
    >
      <View style={styles.ltr}>
        {opening ? (
          <View style={styles.openingFrame} onLayout={onFrameLayout}>
            <FloralOpeningBorder width={frameSize.width} height={frameSize.height} />
            <View style={styles.openingInner}>
              <OpeningMetaBand pageNumber={page.page} juz={page.juz} />
              <OpeningGarden />
              <SurahCartouche title={surahLine?.text} />
              {surahInfo ? (
                <View style={styles.openingFacts}>
                  <Text style={[styles.openingFactText, androidFontPad]}>
                    {surahInfo.revelationType}
                  </Text>
                  <Text style={[styles.openingFactDot, androidFontPad]}>·</Text>
                  <Text style={[styles.openingFactText, androidFontPad]}>
                    {toArabicNumerals(surahInfo.ayahCount)} آیه
                  </Text>
                </View>
              ) : null}

              <View style={styles.openingTextArea} onLayout={onTextColumnLayout}>
                {basmallahLine ? (
                  <BasmallahText text={basmallahLine.text} fontSize={fontSize} ornate />
                ) : null}

                <View style={styles.openingAyahBlock}>
                  {openingAyahLines.map((line) => {
                    const highlightAyah =
                      line.surahNumber === activePlayingSurah ? activePlayingAyah : null;
                    const bookmarked = lineHasBookmark(line);
                    return (
                      <Pressable
                        key={`${page.page}-${line.line}`}
                        onPress={() => onLinePress(line)}
                        style={styles.openingLineRow}
                      >
                        {bookmarked ? (
                          <View style={styles.bookmarkMark} pointerEvents="none">
                            <MaterialIcons name="bookmark" size={12} color={ILLUM.gold} />
                          </View>
                        ) : null}
                        <JustifiedAyahText
                          text={line.text}
                          fontSize={fontSize}
                          lineHeight={lineHeight}
                          color={ILLUM.ink}
                          contentWidth={contentWidth}
                          centered
                          ayahStart={line.ayahStart}
                          ayahEnd={line.ayahEnd}
                          highlightAyah={highlightAyah}
                        />
                      </Pressable>
                    );
                  })}
                </View>
              </View>
              <OpeningGarden />
            </View>
          </View>
        ) : (
          <View style={styles.slimFrame} onLayout={onFrameLayout}>
            <FloralOpeningBorder width={frameSize.width} height={frameSize.height} slim />
            <View style={styles.slimInner}>
              <View style={styles.slimMetaBand}>
                <Text style={[styles.slimMetaText, androidFontPad]}>
                  {toArabicNumerals(page.page)}
                </Text>
                <Text style={[styles.slimMetaText, androidFontPad]}>
                  الجزء {toArabicNumerals(page.juz)}
                </Text>
              </View>
              <View style={styles.slimTextColumn} onLayout={onTextColumnLayout}>
                {regularLines.map((line, index) => {
                  const prev = regularLines[index - 1];
                  const next = regularLines[index + 1];
                  // Basmallah already drawn inside the preceding surah floral header.
                  if (line.type === 'basmallah' && prev?.type === 'surah_name') {
                    return null;
                  }

                  const playable = line.type === 'ayah';
                  const centered =
                    line.type === 'surah_name' ||
                    line.type === 'basmallah' ||
                    Boolean(line.centered);
                  const isSpacer = line.type === 'spacer' || !line.text;
                  const highlightAyah =
                    playable && line.surahNumber === activePlayingSurah
                      ? activePlayingAyah
                      : null;
                  const bookmarked = playable && lineHasBookmark(line);
                  const injectBasmallah = shouldInjectBasmallah(line, next);
                  const headerBasmallah =
                    line.type === 'surah_name'
                      ? injectBasmallah
                        ? BISMILLAH
                        : next?.type === 'basmallah'
                          ? next.text || BISMILLAH
                          : null
                      : null;
                  const hasHeaderBasmallah = headerBasmallah != null;

                  return (
                    <Pressable
                      key={`${page.page}-${line.line}`}
                      disabled={!playable}
                      onPress={() => onLinePress(line)}
                      style={[
                        styles.lineRow,
                        isSpacer && styles.spacerRow,
                        line.type === 'surah_name' && styles.surahBlockRow,
                        hasHeaderBasmallah && styles.surahWithBasmallahRow,
                        line.type === 'basmallah' && styles.surahBlockRow,
                      ]}
                    >
                      {bookmarked ? (
                        <View style={styles.bookmarkMark} pointerEvents="none">
                          <MaterialIcons name="bookmark" size={12} color={ILLUM.gold} />
                        </View>
                      ) : null}
                      {isSpacer ? (
                        <View style={styles.spacer} />
                      ) : line.type === 'ayah' ? (
                        <JustifiedAyahText
                          text={line.text}
                          fontSize={fontSize}
                          lineHeight={lineHeight}
                          color={ILLUM.ink}
                          contentWidth={contentWidth}
                          centered={centered}
                          justify={!centered}
                          ayahStart={line.ayahStart}
                          ayahEnd={line.ayahEnd}
                          highlightAyah={highlightAyah}
                        />
                      ) : line.type === 'basmallah' ? (
                        <BasmallahText text={line.text} fontSize={fontSize} ornate />
                      ) : line.type === 'surah_name' ? (
                        <SurahFloralHeader
                          title={line.text}
                          basmallahText={headerBasmallah}
                          fontSize={fontSize}
                          lineHeight={lineHeight}
                        />
                      ) : (
                        <Text
                          numberOfLines={1}
                          style={[
                            styles.lineText,
                            styles.lineCentered,
                            {
                              color: ILLUM.greenDark,
                              fontSize,
                              lineHeight,
                            },
                            androidFontPad,
                          ]}
                        >
                          {line.text}
                        </Text>
                      )}
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </View>
        )}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  list: {
    flex: 1,
  },
  page: {
    flex: 1,
    paddingHorizontal: 0,
  },
  pageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.sm,
    paddingBottom: Spacing.xs,
    marginBottom: Spacing.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  metaText: {
    fontFamily: 'Vazirmatn-Bold',
    fontSize: 13,
    writingDirection: 'rtl',
  },
  ltr: {
    flex: 1,
    direction: 'ltr',
  },
  frame: {
    flex: 1,
    borderWidth: 1.5,
    borderRadius: BorderRadius.lg,
    padding: 3,
  },
  pageBody: {
    flex: 1,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: BorderRadius.md,
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  textColumn: {
    flex: 1,
    width: '100%',
  },
  openingFrame: {
    flex: 1,
    position: 'relative',
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: ILLUM.cream,
  },
  slimFrame: {
    flex: 1,
    position: 'relative',
    borderRadius: 0,
    overflow: 'hidden',
    backgroundColor: ILLUM.cream,
    marginBottom: 0,
  },
  slimInner: {
    flex: 1,
    marginHorizontal: 14,
    marginTop: 10,
    marginBottom: 10,
    paddingTop: 2,
    paddingBottom: 4,
  },
  slimMetaBand: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    paddingBottom: 4,
    marginBottom: 2,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: ILLUM.gold,
  },
  slimMetaText: {
    fontFamily: 'Vazirmatn-Bold',
    fontSize: 12,
    color: ILLUM.greenDark,
    writingDirection: 'rtl',
  },
  slimTextColumn: {
    flex: 1,
    width: '100%',
  },
  openingInner: {
    flex: 1,
    margin: 46,
    paddingTop: 2,
  },
  openingMetaBand: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: ILLUM.gold,
  },
  openingMetaText: {
    fontFamily: 'Vazirmatn-Bold',
    fontSize: 13,
    color: ILLUM.greenDark,
    writingDirection: 'rtl',
  },
  openingGarden: {
    flex: 1,
    minHeight: 72,
    marginVertical: 4,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: ILLUM.gold,
  },
  surahCartouche: {
    minHeight: 58,
    marginTop: 6,
    marginBottom: 4,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    width: '82%',
    maxWidth: 300,
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 6,
    borderWidth: 3,
    borderColor: ILLUM.greenDark,
    backgroundColor: '#F3FAF7',
  },
  surahCartoucheFrame: {
    ...StyleSheet.absoluteFillObject,
    margin: 4,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: ILLUM.gold,
  },
  surahCartoucheText: {
    fontSize: 22,
    lineHeight: 36,
    color: ILLUM.greenDark,
    textAlign: 'center',
    writingDirection: 'rtl',
    width: '100%',
  },
  openingFacts: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 4,
    paddingVertical: 4,
  },
  openingFactText: {
    fontFamily: 'Vazirmatn-Bold',
    fontSize: 13,
    color: ILLUM.greenDark,
    writingDirection: 'rtl',
  },
  openingFactDot: {
    fontSize: 14,
    color: ILLUM.goldDark,
  },
  openingTextArea: {
    flexGrow: 0,
    flexShrink: 0,
    paddingHorizontal: 6,
    paddingVertical: 4,
    justifyContent: 'flex-start',
  },
  basmallahRow: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    paddingTop: 1,
    paddingBottom: 6,
    overflow: 'visible',
  },
  basmallahOrnateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    paddingTop: 1,
    paddingBottom: 4,
    overflow: 'visible',
    gap: 3,
  },
  basmallahRuleSide: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    minWidth: 22,
  },
  basmallahRuleSideEnd: {
    justifyContent: 'flex-end',
  },
  basmallahRule: {
    flex: 1,
    height: StyleSheet.hairlineWidth * 2,
    backgroundColor: ILLUM.gold,
    opacity: 0.85,
  },
  basmallahOrnateTextWrap: {
    flexShrink: 1,
    maxWidth: '70%',
    overflow: 'visible',
  },
  basmallahText: {
    textAlign: 'center',
    writingDirection: 'rtl',
    width: '100%',
    overflow: 'visible',
  },
  basmallahTextOrnate: {
    paddingHorizontal: 2,
  },
  floralHeader: {
    width: '100%',
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-evenly',
    overflow: 'hidden',
    paddingTop: 4,
    paddingBottom: 2,
  },
  surahBannerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'stretch',
    gap: 6,
    paddingHorizontal: 2,
  },
  surahBanner: {
    flex: 1,
    paddingTop: 2,
    paddingBottom: 2,
    paddingHorizontal: 16,
    borderRadius: 3,
    borderWidth: 1.5,
    borderColor: ILLUM.greenDark,
    backgroundColor: '#F3FAF7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  surahBannerInner: {
    ...StyleSheet.absoluteFillObject,
    top: 3,
    right: 5,
    bottom: 3,
    left: 5,
    borderRadius: 2,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: ILLUM.gold,
  },
  surahBannerText: {
    color: ILLUM.greenDark,
    textAlign: 'center',
    writingDirection: 'rtl',
    fontWeight: '600',
    paddingHorizontal: 12,
  },
  basmallahOrnateRowCompact: {
    paddingTop: 0,
    paddingBottom: 5,
    gap: 2,
  },
  basmallahOrnateTextWrapCompact: {
    maxWidth: '78%',
  },
  surahNameBlock: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  /** One line slot for a standalone surah name / orphan basmallah. */
  surahBlockRow: {
    flexGrow: 1,
    flexShrink: 0,
    overflow: 'hidden',
  },
  /**
   * Name + Bismillah share one header while the data basmallah line is omitted;
   * take two line slots so the block stays below the previous ayah.
   */
  surahWithBasmallahRow: {
    flex: 2,
    flexGrow: 2,
    flexShrink: 0,
    overflow: 'hidden',
  },
  openingLineRow: {
    width: '100%',
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 42,
    paddingVertical: 5,
    paddingHorizontal: 2,
    borderRadius: 0,
    borderWidth: 0,
    position: 'relative',
  },
  bookmarkMark: {
    position: 'absolute',
    top: 2,
    left: 2,
    zIndex: 2,
  },
  openingAyahBlock: {
    flexGrow: 0,
    flexShrink: 0,
    width: '100%',
  },
  // Soft wash + hairline gold frame on the playing ayah span only.
  ayahHighlight: {
    backgroundColor: AYAH_HIGHLIGHT,
  },
  lineRow: {
    flex: 1,
    width: '100%',
    alignSelf: 'stretch',
    justifyContent: 'center',
    paddingVertical: 3,
    paddingHorizontal: 0,
    borderRadius: 0,
    borderWidth: 0,
    position: 'relative',
  },
  activeLine: {
    // colors applied inline from themePlaying
  },
  spacerRow: {
    opacity: 0,
  },
  spacer: {
    height: 1,
  },
  lineMeasureWrap: {
    width: '100%',
    position: 'relative',
    overflow: 'visible',
    justifyContent: 'center',
  },
  measureHost: {
    position: 'absolute',
    opacity: 0,
    left: 0,
    top: 0,
    width: 8000,
    zIndex: -1,
  },
  lineText: {
    fontFamily: HIFZ_FONT,
    width: '100%',
  },
  lineArabic: {
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  lineCentered: {
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  surahName: {
    fontWeight: '600',
  },
});
