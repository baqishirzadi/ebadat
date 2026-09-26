/**
 * Fixed 16-line Indo-Pak hifz page reader (no translation).
 * One ayah font size per page; short lines stretch with measured kashida.
 * Pages 1–2 use a repeating green–blue floral tazhib border with a surah cartouche.
 */

import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Dimensions,
  FlatList,
  I18nManager,
  type ListRenderItemInfo,
  Platform,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
} from 'react-native';
import Svg, { Circle, Ellipse, G, Path, Rect } from 'react-native-svg';

import { BorderRadius, Spacing } from '@/constants/theme';
import { getSurah } from '@/data/surahNames';
import { useApp, useAppLanguage, useBookmarks, useReadingPosition } from '@/context/AppContext';
import type { AppLanguage } from '@/types/quran';
import audioManager from '@/utils/quranAudio';
import {
  applyKashida,
  kashidaCountForWidth,
  kashidaSlots,
  MAX_STRETCH_LETTERS,
  splitAyahSpans,
  splitLineBodyAndMarkers,
  visibleLength,
} from '@/utils/hifzKashida';
import { toArabicNumerals } from '@/utils/numbers';
import {
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
const WINDOW_HEIGHT = Dimensions.get('window').height;
/** Sentinel past Fatiha in the swipe list; not a mushaf page number. */
const HIFZ_DEDICATION_PAGE = 0;
/** Android mirrors horizontal FlatLists under RTL; undo that for physical LTR paging. */
const UNMIRROR_RTL = I18nManager.isRTL ? ({ transform: [{ scaleX: -1 }] } as const) : null;
/** One body size for every mushaf page (stable across a surah). */
const BASE_FONT = 17;
/** Tall enough for Scheherazade harakat and letter tails. */
const LINE_HEIGHT_RATIO = 1.9;
/** Extra tall for Bismillah so ی / م descenders are not clipped. */
const BASMALLAH_LINE_HEIGHT_RATIO = 2.35;
const BISMILLAH = 'بِسْمِ اللّٰهِ الرَّحْمٰنِ الرَّحِیْمِ';
const AYAH_HIGHLIGHT = 'rgba(14, 107, 79, 0.12)';
/** Short stroke per join — matches MAX_TATWEEL_PER_LETTER in hifzKashida. */
const KASHIDA_SLOT_CAP = 5;
/** Matches `slimInner` horizontal inset (all pages). */
const SLIM_COLUMN_MARGIN = 18;
/**
 * Horizontal pads on `ayahLineBody`. After RTL unmirror cancels out, physical
 * right is the on-screen right (RTL line start). Keep first-letter ink inside.
 */
const AYAH_PAD_START = 16; // physical right → on-screen right (line start)
const AYAH_PAD_END = 4; // physical left → toward markers
const AYAH_PAD_TOTAL = AYAH_PAD_START + AYAH_PAD_END;
/** Keep the seed when the refined count is this close. */
const KASHIDA_COMMIT_EPSILON = 1;
/** Rough Scheherazade char advance as a fraction of font size (seed estimate). */
const CHAR_WIDTH_RATIO = 0.52;

/** Final measured tatweel counts survive FlatList remounts. */
const kashidaCache = new Map<string, number>();

function predictContentWidth(): number {
  return Math.max(0, Math.floor(PAGE_WIDTH - SLIM_COLUMN_MARGIN * 2));
}

/** Content box inside `ayahLineBody` (onLayout width includes padding). */
function bodyContentWidth(slotWidth: number): number {
  return Math.max(0, slotWidth - AYAH_PAD_TOTAL);
}

function kashidaCacheKey(
  pageNumber: number,
  lineNumber: number,
  contentWidth: number,
  fontSize: number,
  markerWidth = 0,
  bodySlot = 0,
): string {
  // v26: start inset on physical right; stretch targets content box only.
  return `v26:${pageNumber}:${lineNumber}:${contentWidth}:${fontSize}:${markerWidth}:${bodySlot}`;
}

/**
 * Seed tatweels from the stretchable body's slack against the fill target.
 * `longestChars` is the longest body on the page (markers already excluded).
 */
function estimateSeedKashida(
  text: string,
  longestChars: number,
  fillTarget: number,
  fontSize: number,
): number {
  if (fillTarget <= 0 || longestChars <= 0 || fontSize <= 0) return 0;
  const chars = visibleLength(text);
  if (chars <= 0) return 0;
  const sizedCharWidth = fontSize * CHAR_WIDTH_RATIO;
  const longestNatural = longestChars * sizedCharWidth;
  const charWidth =
    longestNatural >= fillTarget - 4 ? fillTarget / longestChars : sizedCharWidth;
  const naturalEst = chars * charWidth;
  // Stay under the slot so the seed never paints a clipped right edge.
  return Math.floor(kashidaCountForWidth(naturalEst, fillTarget, fontSize) * 0.55);
}

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

function isOpeningPage(_page: number) {
  // Pages 1–2 use the same slim 16-line frame as the rest of the mushaf.
  return false;
}

/** Bismillah under surah name except Fatiha (ayah 1) and Tawbah (none). */
function shouldInjectBasmallah(line: HifzLine, next: HifzLine | undefined): boolean {
  if (line.type !== 'surah_name') return false;
  const surah = line.surahNumber;
  if (surah == null || surah === 1 || surah === 9) return false;
  return next?.type !== 'basmallah';
}

function longestJustifiedAyahChars(page: HifzPage): number {
  const ayahLines = page.lines.filter((line) => line.type === 'ayah' && line.text && !line.centered);
  if (ayahLines.length === 0) return 0;
  // Stretch budget is for the body only — trailing ﴿n﴾ is pinned separately.
  return Math.max(
    ...ayahLines.map((line) => {
      const { body } = splitLineBodyAndMarkers(line.text);
      return visibleLength(body || line.text);
    }),
  );
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
 * Full ornate frame on opening pages; `slim` draws only top and bottom bands
 * so pages 3+ keep room for 16 lines with open sides.
 */
const FloralOpeningBorder = memo(function FloralOpeningBorder({
  width,
  height,
  slim = false,
  sparse = false,
}: {
  width: number;
  height: number;
  slim?: boolean;
  /** Dedication page: corners + sparse band flowers, no dense side garden. */
  sparse?: boolean;
}) {
  if (width <= 0 || height <= 0) return null;

  const w = width;
  const h = height;

  // Slim pages: top and bottom bands only — no left/right frame.
  if (slim) {
    const bandH = 8;
    const unitStep = 14;
    const flowerScale = 0.32;
    const topUnits: number[] = [];
    for (let x = 10; x < w - 8; x += unitStep) {
      topUnits.push(x);
    }
    const midY = bandH / 2;
    return (
      <Svg
        width={w}
        height={h}
        style={[StyleSheet.absoluteFill, styles.floralSvg]}
        pointerEvents="none"
      >
        <Rect x={0} y={0} width={w} height={bandH} fill={ILLUM.field} opacity={0.45} />
        <Rect x={0} y={h - bandH} width={w} height={bandH} fill={ILLUM.field} opacity={0.45} />
        <Rect
          x={0}
          y={0}
          width={w}
          height={bandH}
          fill="none"
          stroke={ILLUM.greenDark}
          strokeWidth={1.1}
        />
        <Rect
          x={2}
          y={2}
          width={w - 4}
          height={bandH - 4}
          fill="none"
          stroke={ILLUM.gold}
          strokeWidth={0.8}
        />
        <Rect
          x={0}
          y={h - bandH}
          width={w}
          height={bandH}
          fill="none"
          stroke={ILLUM.greenDark}
          strokeWidth={1.1}
        />
        <Rect
          x={2}
          y={h - bandH + 2}
          width={w - 4}
          height={bandH - 4}
          fill="none"
          stroke={ILLUM.gold}
          strokeWidth={0.8}
        />
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
      </Svg>
    );
  }

  const outer = 6;
  const bandOuter = 12;
  const bandInner = 34;
  const tip = 8;
  const step = 14;
  const unitStep = sparse ? 56 : 24;
  const flowerScale = sparse ? 0.72 : 0.92;
  const cornerScale = sparse ? 0.85 : 1;

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
  for (let x = bandInner + 8; x < w - bandInner - 6; x += unitStep) {
    topUnits.push(x);
  }
  const sideUnits: number[] = [];
  for (let y = bandInner + 14; y < h - bandInner - 10; y += unitStep) {
    sideUnits.push(y);
  }

  const midY = (bandOuter + bandInner) / 2;
  const midX = (bandOuter + bandInner) / 2;
  const cornerInset = 10;

  return (
    <Svg
      width={w}
      height={h}
      style={[StyleSheet.absoluteFill, styles.floralSvg]}
      pointerEvents="none"
    >
      <Path d={scallopOuter.join(' ')} fill="none" />
      <Path
        d={scallopOuter.join(' ')}
        fill="none"
        stroke={ILLUM.gold}
        strokeWidth={1.4}
      />
      <Rect
        x={outer + 4}
        y={outer + 4}
        width={w - (outer + 4) * 2}
        height={h - (outer + 4) * 2}
        fill="none"
        stroke={ILLUM.goldLite}
        strokeWidth={1}
      />
      <Path d={frameRing} fill="none" />
      <Rect
        x={bandOuter}
        y={bandOuter}
        width={w - bandOuter * 2}
        height={h - bandOuter * 2}
        fill="none"
        stroke={ILLUM.greenDark}
        strokeWidth={2.2}
      />
      <Rect
        x={bandInner}
        y={bandInner}
        width={w - bandInner * 2}
        height={h - bandInner * 2}
        fill="none"
        stroke={ILLUM.gold}
        strokeWidth={1.8}
      />
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
      {!sparse
        ? sideUnits.map((y, i) => (
            <FloralUnit
              key={`l-${i}`}
              x={midX}
              y={y}
              scale={flowerScale * 0.95}
              rotate={i % 2 === 0 ? -98 : -82}
            />
          ))
        : null}
      {!sparse
        ? sideUnits.map((y, i) => (
            <FloralUnit
              key={`r-${i}`}
              x={w - midX}
              y={y}
              scale={flowerScale * 0.95}
              rotate={i % 2 === 0 ? 98 : 82}
            />
          ))
        : null}

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

type TitleMeasurePhase = 'natural' | 'stretched' | 'done';

/**
 * Stretch a surah name with measured tatweels so it fills the decorative banner
 * (طاق). Reuses the same kashida helpers as ayah lines.
 */
const StretchedSurahTitle = memo(function StretchedSurahTitle({
  title,
  fontSize,
  lineHeight,
  textStyle,
}: {
  title: string;
  fontSize: number;
  lineHeight: number;
  textStyle: object | object[];
}) {
  const [fitWidth, setFitWidth] = useState(0);
  const [kashidaCount, setKashidaCount] = useState(0);
  const [phase, setPhase] = useState<TitleMeasurePhase>('done');
  const naturalWidth = useRef(0);
  const countRef = useRef(0);
  const refinePass = useRef(0);

  const fillTarget = Math.max(0, fitWidth - 2);

  const onContainerLayout = useCallback((event: LayoutChangeEvent) => {
    const next = Math.floor(event.nativeEvent.layout.width);
    if (next <= 0) return;
    setFitWidth((prev) => {
      if (prev === next) return prev;
      naturalWidth.current = 0;
      countRef.current = 0;
      refinePass.current = 0;
      setKashidaCount(0);
      setPhase('natural');
      return next;
    });
  }, []);

  useEffect(() => {
    naturalWidth.current = 0;
    countRef.current = 0;
    refinePass.current = 0;
    setKashidaCount(0);
    setPhase(fitWidth > 0 ? 'natural' : 'done');
  }, [title, fontSize, fitWidth]);

  const commit = useCallback((finalCount: number) => {
    const clamped = Math.max(0, Math.min(MAX_KASHIDA_TOTAL, finalCount));
    setKashidaCount(clamped);
    setPhase('done');
  }, []);

  const onNaturalLayout = useCallback(
    (event: { nativeEvent: { lines: { width: number }[] } }) => {
      if (phase !== 'natural' || fillTarget <= 0) return;
      const width = event.nativeEvent.lines[0]?.width ?? 0;
      if (width <= 0) return;
      naturalWidth.current = width;
      if (width >= fillTarget) {
        countRef.current = 0;
        commit(0);
        return;
      }
      const measured = kashidaCountForWidth(width, fillTarget, fontSize);
      countRef.current = measured;
      setKashidaCount(measured);
      if (measured <= 0) {
        commit(0);
        return;
      }
      setPhase('stretched');
    },
    [commit, fillTarget, fontSize, phase],
  );

  const onStretchedLayout = useCallback(
    (event: { nativeEvent: { lines: { width: number }[] } }) => {
      if (phase !== 'stretched' || fillTarget <= 0) return;
      const width = event.nativeEvent.lines[0]?.width ?? 0;
      if (width <= 0) return;

      const count = countRef.current;
      const overflow = width - fillTarget;
      const gained = width - naturalWidth.current;
      const per = count > 0 && gained > 0 ? gained / count : Math.max(fontSize * 0.28, 3.2);

      if (overflow > 2) {
        const next = Math.max(0, count - Math.max(1, Math.ceil(overflow / per)));
        if (refinePass.current >= 6 || next === count) {
          commit(next);
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

      commit(count);
    },
    [commit, fillTarget, fontSize, phase],
  );

  const display =
    kashidaCount > 0 ? applyKashida(title, kashidaCount, KASHIDA_SLOT_CAP) : title;
  const measuring = fitWidth > 0 && phase !== 'done';
  const measureText =
    phase === 'stretched' && kashidaCount > 0
      ? applyKashida(title, kashidaCount, KASHIDA_SLOT_CAP)
      : title;

  return (
    <View style={styles.stretchedTitleWrap} onLayout={onContainerLayout}>
      {measuring ? (
        <View style={styles.measureHost} pointerEvents="none">
          <Text
            key={`title-m-${phase}-${kashidaCount}`}
            style={[
              {
                fontFamily: HIFZ_FONT,
                fontSize,
                lineHeight,
                textAlign: 'center' as const,
                writingDirection: 'rtl' as const,
              },
              androidFontPad,
            ]}
            onTextLayout={phase === 'natural' ? onNaturalLayout : onStretchedLayout}
          >
            {measureText}
          </Text>
        </View>
      ) : null}
      <Text
        numberOfLines={1}
        ellipsizeMode="clip"
        style={[
          { fontFamily: HIFZ_FONT, fontSize, lineHeight },
          textStyle,
          androidFontPad,
        ]}
      >
        {display}
      </Text>
    </View>
  );
});

/** Blue–green cartouche with gold trim for the surah name above the ayah text. */
const SurahCartouche = memo(function SurahCartouche({ title }: { title?: string }) {
  if (!title) return null;
  return (
    <View style={styles.surahCartouche}>
      <View style={styles.surahCartoucheFrame} />
      <StretchedSurahTitle
        title={title}
        fontSize={22}
        lineHeight={36}
        textStyle={styles.surahCartoucheText}
      />
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
  const titleLineHeight = Math.round(titleSize * 1.5);
  return (
    <View style={styles.floralHeader}>
      {title ? (
        <View style={styles.surahBannerRow}>
          <MiniFloral size={14} />
          <View style={styles.surahBanner}>
            <View style={styles.surahBannerInner} />
            <StretchedSurahTitle
              title={title}
              fontSize={titleSize}
              lineHeight={titleLineHeight}
              textStyle={styles.surahBannerText}
            />
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

const MAX_KASHIDA_TOTAL = MAX_STRETCH_LETTERS * KASHIDA_SLOT_CAP;
/** Remeasure passes while settling ayah stretch against the real line width. */
const KASHIDA_REFINE_PASSES = 10;
/** Probe may sit this many px from the target before we commit. */
const PROBE_SLACK_PX = 6;
/** Shrink-wrap probe reports glyph advance. */
const PROBE_WIDTH_BIAS = 1;
type MeasurePhase = 'natural' | 'stretched' | 'done';

/**
 * Conservative reserve for a trailing ﴿n﴾ until onLayout measures the real width.
 * Scheherazade ornament markers are much wider than digit count suggests.
 */
function estimateMarkerWidth(markers: string, fontSize: number): number {
  if (!markers) return 0;
  return Math.ceil(fontSize * 6);
}

/** RLM so bracket glyphs stay RTL when the marker Text has no Arabic letter. */
const MARKER_RTL_MARK = '\u200F';

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
  pageNumber,
  lineNumber,
  longestChars,
  measureEnabled = true,
  onAyahPress,
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
  pageNumber: number;
  lineNumber: number;
  longestChars: number;
  /** False while the pager is turning — paint seed only, no measure restyles. */
  measureEnabled?: boolean;
  /** Play the ayah under the tap (not the line's ayahStart). */
  onAyahPress?: (ayah: number) => void;
}) {
  const { body, markers } = useMemo(() => splitLineBodyAndMarkers(text), [text]);
  const fitWidth = Math.max(0, contentWidth);
  const stretch = justify && !centered;
  const [measuredMarkerWidth, setMeasuredMarkerWidth] = useState(0);
  const [bodySlotWidth, setBodySlotWidth] = useState(0);
  const markerReserve = markers
    ? measuredMarkerWidth > 0
      ? measuredMarkerWidth
      : estimateMarkerWidth(markers, fontSize)
    : 0;
  // Target the content box only — onLayout width includes start/end padding.
  const fillTarget = Math.max(
    0,
    (bodySlotWidth > 0
      ? bodyContentWidth(bodySlotWidth)
      : Math.max(0, fitWidth - (stretch ? markerReserve : 0) - AYAH_PAD_TOTAL)) - 2,
  );
  const cacheKey = kashidaCacheKey(
    pageNumber,
    lineNumber,
    fitWidth,
    fontSize,
    markerReserve,
    bodySlotWidth,
  );
  const seed = useMemo(
    () => (stretch ? estimateSeedKashida(body, longestChars, fillTarget, fontSize) : 0),
    [body, fillTarget, fontSize, longestChars, stretch],
  );

  const initialCached = stretch && fitWidth > 0 ? kashidaCache.get(cacheKey) : undefined;
  const [kashidaCount, setKashidaCount] = useState(0);
  const [phase, setPhase] = useState<MeasurePhase>('done');
  const countRef = useRef(0);
  const refinePass = useRef(0);
  const loRef = useRef(0);
  const hiRef = useRef(MAX_KASHIDA_TOTAL);
  const visibleCountRef = useRef(0);
  const seedRef = useRef(seed);
  seedRef.current = seed;
  const bodySlotRef = useRef(0);
  bodySlotRef.current = bodySlotWidth;
  const phaseRef = useRef(phase);
  phaseRef.current = phase;
  const [visibleCount, setVisibleCount] = useState(() =>
    initialCached !== undefined ? initialCached : seed,
  );
  visibleCountRef.current = visibleCount;
  const lineTatweelCap = useMemo(() => {
    const slots = kashidaSlots(body).length;
    return Math.min(MAX_KASHIDA_TOTAL, Math.max(0, slots) * KASHIDA_SLOT_CAP);
  }, [body]);

  useEffect(() => {
    setMeasuredMarkerWidth(0);
  }, [markers, fontSize, body]);

  const onMarkerLayout = useCallback((event: LayoutChangeEvent) => {
    const next = Math.ceil(event.nativeEvent.layout.width);
    if (next <= 0) return;
    setMeasuredMarkerWidth((prev) => (Math.abs(prev - next) <= 1 ? prev : next));
  }, []);

  const onBodySlotLayout = useCallback((event: LayoutChangeEvent) => {
    const next = Math.floor(event.nativeEvent.layout.width);
    if (next <= 0) return;
    setBodySlotWidth((prev) => (Math.abs(prev - next) <= 1 ? prev : next));
  }, []);

  const commitVisible = useCallback(
    (finalCount: number, opts?: { allowZero?: boolean; cache?: boolean }) => {
      let clamped = Math.max(0, Math.min(MAX_KASHIDA_TOTAL, finalCount));
      if (clamped === 0 && seedRef.current > 0 && !opts?.allowZero) {
        clamped = seedRef.current;
      }
      if (opts?.cache === true) {
        kashidaCache.set(cacheKey, clamped);
      }
      setVisibleCount((prev) =>
        Math.abs(prev - clamped) <= KASHIDA_COMMIT_EPSILON ? prev : clamped,
      );
      setPhase('done');
    },
    [cacheKey],
  );

  useEffect(() => {
    countRef.current = 0;
    refinePass.current = 0;
    loRef.current = 0;
    hiRef.current = MAX_KASHIDA_TOTAL;
    setKashidaCount(0);

    if (!stretch || !body || fitWidth <= 0) {
      setVisibleCount(0);
      setPhase('done');
      return;
    }

    // Do not stretch until the real body slot (and marker) are known — a seed
    // based on the full column width overshoots and clips the RTL start (right).
    if (bodySlotWidth <= 0) {
      setVisibleCount(0);
      setPhase('done');
      return;
    }
    if (markers && measuredMarkerWidth <= 0) {
      setVisibleCount(0);
      setPhase('done');
      return;
    }

    const hit = kashidaCache.get(cacheKey);
    if (hit !== undefined) {
      setVisibleCount(hit);
      setPhase('done');
      return;
    }

    // Stable paint while probing: conservative seed for this measured slot.
    setVisibleCount(seed);

    if (!measureEnabled) {
      setPhase('done');
      return;
    }

    setPhase('natural');
  }, [
    body,
    bodySlotWidth,
    cacheKey,
    fitWidth,
    measureEnabled,
    measuredMarkerWidth,
    markers,
    seed,
    stretch,
  ]);

  const bodyDisplay = useMemo(() => {
    if (!stretch || visibleCount <= 0) return body;
    return applyKashida(body, visibleCount, KASHIDA_SLOT_CAP);
  }, [body, stretch, visibleCount]);

  const probeDisplay = useMemo(() => {
    if (!stretch) return body;
    if (phase === 'natural') return body;
    if (kashidaCount <= 0) return body;
    return applyKashida(body, kashidaCount, KASHIDA_SLOT_CAP);
  }, [body, kashidaCount, phase, stretch]);

  const settleWithProbeWidth = useCallback(
    (rawWidth: number, lineCount: number, secondLineWidth = 0) => {
      if (!stretch) return;
      const slot = bodyContentWidth(bodySlotRef.current);
      if (slot <= 0) return;
      const wrapped = lineCount > 1 && secondLineWidth > fontSize * 0.85;
      const painted = Math.max(0, Math.ceil(rawWidth * PROBE_WIDTH_BIAS));
      const shortfall = slot - painted;
      // Past the content box → step tatweel down before showing a clipped start.
      const overshoot = wrapped || painted > slot;
      const filled = !overshoot && shortfall <= PROBE_SLACK_PX;
      const cap = Math.max(0, lineTatweelCap || MAX_KASHIDA_TOTAL);

      const currentPhase = phaseRef.current;
      if (currentPhase === 'natural') {
        // If the bare body already fills or overshoots the slot, do not add tatweel.
        if (overshoot || filled) {
          commitVisible(0, { allowZero: true, cache: true });
          return;
        }
        const fromSlack = kashidaCountForWidth(Math.max(painted, 1), slot, fontSize);
        // Climb from the conservative seed — never jump straight to a full-slack guess.
        const start = Math.min(
          cap,
          Math.max(seedRef.current, Math.min(fromSlack, seedRef.current + Math.max(4, Math.floor(cap * 0.15)))),
        );
        countRef.current = start;
        refinePass.current = 0;
        loRef.current = 0;
        hiRef.current = cap;
        // Probe only — visible line keeps seed/cache until commit.
        setKashidaCount(start);
        setPhase('stretched');
        return;
      }

      if (currentPhase !== 'stretched') return;
      if (refinePass.current >= KASHIDA_REFINE_PASSES + 12) {
        commitVisible(Math.max(loRef.current, countRef.current > 0 ? loRef.current : seedRef.current), {
          allowZero: true,
          cache: true,
        });
        return;
      }
      refinePass.current += 1;

      const count = countRef.current;
      if (overshoot) {
        // Run is past the slot — step down so we never paint a clipped right edge.
        hiRef.current = count;
        const next = Math.max(
          loRef.current,
          count - Math.max(1, Math.ceil((count - loRef.current) / 2) || 1),
        );
        if (next >= count) {
          const finalCount = loRef.current > 0 ? loRef.current : Math.max(0, count - 1);
          commitVisible(finalCount, { allowZero: true, cache: true });
          return;
        }
        countRef.current = next;
        setKashidaCount(next);
        return;
      }

      loRef.current = count;
      if (filled || count >= hiRef.current || count >= cap) {
        commitVisible(count, { allowZero: true, cache: true });
        return;
      }

      const per = Math.max(fontSize * 0.28, 3.5);
      const need = Math.max(1, Math.ceil(shortfall / per));
      const room = hiRef.current - count;
      const step = Math.max(1, Math.min(room, Math.max(need, Math.ceil(room / 2))));
      const next = Math.min(cap, count + step);
      if (next === count) {
        commitVisible(count, { allowZero: true, cache: true });
        return;
      }
      countRef.current = next;
      setKashidaCount(next);
    },
    [commitVisible, fontSize, lineTatweelCap, stretch],
  );

  const onProbeTextLayout = useCallback(
    (event: { nativeEvent: { lines: { width: number }[] } }) => {
      if (!stretch) return;
      if (phaseRef.current === 'done') return;
      const lines = event.nativeEvent.lines;
      if (!lines.length) return;
      const width = Math.ceil(lines[0]?.width ?? 0);
      const second = Math.ceil(lines[1]?.width ?? 0);
      settleWithProbeWidth(width, lines.length, second);
    },
    [settleWithProbeWidth, stretch],
  );

  const onBodyTextLayout = useCallback(
    (event: { nativeEvent: { lines: { width: number }[] } }) => {
      if (!stretch) return;
      if (phaseRef.current !== 'done') return;
      const lines = event.nativeEvent.lines;
      if (!lines.length) return;
      const slot = bodyContentWidth(bodySlotRef.current);
      if (slot <= 0) return;
      const painted = Math.ceil(lines[0]?.width ?? 0);
      const wrapped = lines.length > 1;
      // Visible line past the content box — trim tatweel (do not grow further).
      const overshoots = wrapped || painted > slot;
      if (!overshoots) return;
      const prev = visibleCountRef.current;
      if (prev <= 0) return;
      const next = Math.max(0, prev - Math.max(2, Math.ceil(prev * 0.2)));
      const clamped = next === prev ? Math.max(0, prev - 1) : next;
      kashidaCache.delete(cacheKey);
      commitVisible(clamped, { allowZero: true, cache: true });
    },
    [cacheKey, commitVisible, stretch],
  );

  const markerAyah = useMemo(() => {
    if (!markers || ayahStart == null) return -1;
    const hit = splitAyahSpans(markers, ayahStart, ayahEnd ?? ayahStart);
    return hit[0]?.ayah ?? ayahStart;
  }, [ayahEnd, ayahStart, markers]);

  const lineStyle = useMemo(
    () => [
      styles.lineText,
      centered ? styles.lineCentered : styles.lineArabic,
      { color, fontSize, lineHeight },
      androidFontPad,
    ],
    [centered, color, fontSize, lineHeight],
  );

  const probeStyle = useMemo(
    () => [
      styles.lineText,
      {
        color,
        fontSize,
        lineHeight,
        // Shrink-wrap: lines[0].width reports glyph advance (fixed width lied on both platforms).
        writingDirection: 'rtl' as const,
      },
      androidFontPad,
    ],
    [color, fontSize, lineHeight],
  );

  const renderSpan = useCallback(
    (span: { text: string; ayah: number }, index: number) => {
      const active = highlightAyah != null && span.ayah === highlightAyah && span.ayah > 0;
      const pressable = onAyahPress && span.ayah > 0;
      return (
        <Text
          key={`${span.ayah}-${index}`}
          style={active ? styles.ayahHighlight : undefined}
          onPress={pressable ? () => onAyahPress(span.ayah) : undefined}
          suppressHighlighting
        >
          {span.text}
        </Text>
      );
    },
    [highlightAyah, onAyahPress],
  );

  if (centered || !stretch) {
    const fullSpans =
      ayahStart == null || ayahEnd == null
        ? [{ text, ayah: -1 as number }]
        : splitAyahSpans(text, ayahStart, ayahEnd);
    return (
      <View style={[styles.lineMeasureWrap, styles.centeredLinePad]}>
        <Text style={[lineStyle, styles.centeredLineText]} numberOfLines={1} ellipsizeMode="clip">
          {onAyahPress || highlightAyah != null
            ? fullSpans.map(renderSpan)
            : text}
        </Text>
      </View>
    );
  }

  const measuring = measureEnabled && phase !== 'done' && bodySlotWidth > 0;

  const markerHighlight =
    highlightAyah != null && markerAyah === highlightAyah && markerAyah > 0
      ? styles.ayahHighlight
      : undefined;

  const bodyPress =
    onAyahPress && ayahStart != null && ayahStart > 0
      ? () => onAyahPress(ayahStart)
      : undefined;

  const bodyActive =
    highlightAyah != null &&
    ayahStart != null &&
    ayahEnd != null &&
    highlightAyah >= ayahStart &&
    highlightAyah <= ayahEnd
      ? styles.ayahHighlight
      : undefined;

  return (
    <View style={styles.lineMeasureWrap}>
      {measuring ? (
        <View
          style={styles.ayahProbeHost}
          pointerEvents="none"
          collapsable={false}
          accessible={false}
          importantForAccessibility="no-hide-descendants"
        >
          <Text
            key={`ayah-probe-${phase}-${kashidaCount}-${bodySlotWidth}`}
            style={probeStyle}
            onTextLayout={onProbeTextLayout}
            accessible={false}
          >
            {probeDisplay}
          </Text>
        </View>
      ) : null}
      <View style={styles.ayahLineRow}>
        <View style={styles.ayahLineBody} onLayout={onBodySlotLayout}>
          <Text
            style={[lineStyle, styles.ayahLineBodyText, bodyActive]}
            numberOfLines={1}
            ellipsizeMode="clip"
            onTextLayout={onBodyTextLayout}
            onPress={bodyPress}
            suppressHighlighting
          >
            {bodyDisplay}
          </Text>
        </View>
        {markers ? (
          <View style={styles.ayahLineMarker} onLayout={onMarkerLayout}>
            <Text
              style={[lineStyle, styles.ayahLineMarkerText, markerHighlight]}
              numberOfLines={1}
              onPress={
                onAyahPress && markerAyah > 0 ? () => onAyahPress(markerAyah) : undefined
              }
              suppressHighlighting
            >
              {MARKER_RTL_MARK}
              {markers}
            </Text>
          </View>
        ) : null}
      </View>
    </View>
  );
});

const DEDICATION_BISMILLAH = 'بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ';
const DEDICATION_HAMD_AR =
  'الحمدُ للهِ الّذي أنزلَ القرآنَ هُدىً ورحمةً، والصلاةُ والسلامُ على سيدنا محمدٍ، وعلى آله وصحبه أجمعين.';
const DEDICATION_CLOSING_AR =
  'تَقَبَّلَ اللهُ مِنَّا وَمِنْكُمْ، وَجَعَلَ الْقُرْآنَ رَبِيعَ قُلُوبِنَا وَنُورَ صُدُورِنَا.';

type DedicationCopy = {
  /** Local-language body (Dari / Pashto / English). Arabic lines are shared constants. */
  paras: readonly string[];
  fromLabel: string;
  donorName: string;
};

const DEDICATION_BY_LANGUAGE: Record<AppLanguage, DedicationCopy> = {
  dari: {
    paras: [
      'این مصحف شریف را به نیت رضای خدا و خدمت به کلام او وقف می‌کنم.',
      'باشد که تلاوت آن سبب هدایت و آرامش دل‌ها گردد.',
    ],
    fromLabel: 'وقف و تقدیم از جانب',
    donorName: 'سید عبدالاله شیرزادی',
  },
  pashto: {
    paras: [
      'دا مبارک مصحف د الله د رضا او د ده د کلام د خدمت لپاره وقفوم.',
      'هیله ده چې تلاوت یې د هدایت او د زړونو د سکون سبب شي.',
    ],
    fromLabel: 'وقف او وړاندې کول له خوا د',
    donorName: 'سید عبدالاله شیرزادی',
  },
  english: {
    paras: [
      'I dedicate this noble mushaf for the pleasure of Allah and in service of His Word.',
      'May its recitation bring guidance and peace to hearts.',
    ],
    fromLabel: 'Dedicated and presented by',
    donorName: 'Sayed Abdulilah Shirzadi',
  },
};

const NASTALIQ_FONT = 'NotoNastaliqUrdu';
const NASTALIQ_LINE_RATIO = 2.4;
const ARABIC_LINE_RATIO = 1.7;

/** Waqf / dedication leaf past Fatiha — not part of the 548-page mushaf. */
const HifzDedicationPage = memo(function HifzDedicationPage({
  background,
  contentPaddingTop,
  contentPaddingBottom,
  pageHeight,
}: {
  background: string;
  contentPaddingTop: number;
  contentPaddingBottom: number;
  pageHeight: number;
}) {
  const language = useAppLanguage();
  const copy = DEDICATION_BY_LANGUAGE[language] ?? DEDICATION_BY_LANGUAGE.dari;
  const isEnglish = language === 'english';
  /** Dari/Pashto body in Nastaliq; English uses the platform UI face. */
  const localFont = isEnglish ? undefined : NASTALIQ_FONT;
  const localSize = isEnglish ? 14 : 15;
  const localLine = Math.round(localSize * (isEnglish ? 1.45 : NASTALIQ_LINE_RATIO));
  const arabicSize = 16;
  const arabicLine = Math.round(arabicSize * ARABIC_LINE_RATIO);
  const bismillahSize = 18;
  const bismillahLine = Math.round(bismillahSize * ARABIC_LINE_RATIO);
  const align = isEnglish ? ('left' as const) : ('center' as const);
  const writingDirection = isEnglish ? ('ltr' as const) : ('rtl' as const);

  const [frameSize, setFrameSize] = useState(() => ({
    width: Math.floor(PAGE_WIDTH),
    height: 0,
  }));

  const onFrameLayout = useCallback((event: LayoutChangeEvent) => {
    const width = Math.floor(event.nativeEvent.layout.width);
    const height = Math.floor(event.nativeEvent.layout.height);
    setFrameSize((prev) => {
      if (Math.abs(prev.width - width) <= 1 && prev.height === height) return prev;
      return { width, height };
    });
  }, []);

  return (
    <View
      style={[
        styles.page,
        {
          width: PAGE_WIDTH,
          height: pageHeight > 0 ? pageHeight : undefined,
          backgroundColor: background,
          paddingTop: contentPaddingTop,
          paddingBottom: contentPaddingBottom,
        },
      ]}
    >
      <View style={styles.ltr}>
        <View style={styles.openingFrame} onLayout={onFrameLayout}>
          <FloralOpeningBorder
            width={frameSize.width}
            height={frameSize.height}
            sparse
          />
          <View style={styles.dedicationInner}>
            <View style={styles.dedicationContent}>
              <Text
                style={[
                  styles.dedicationBismillah,
                  {
                    fontFamily: HIFZ_FONT,
                    fontSize: bismillahSize,
                    lineHeight: bismillahLine,
                    paddingBottom: 4,
                  },
                  androidFontPad,
                ]}
              >
                {DEDICATION_BISMILLAH}
              </Text>
              <View style={styles.dedicationRule} />
              <Text
                style={[
                  styles.dedicationArabic,
                  {
                    fontFamily: HIFZ_FONT,
                    fontSize: arabicSize,
                    lineHeight: arabicLine,
                    paddingBottom: 4,
                  },
                  androidFontPad,
                ]}
              >
                {DEDICATION_HAMD_AR}
              </Text>
              {copy.paras.map((para) => (
                <Text
                  key={para.slice(0, 28)}
                  style={[
                    styles.dedicationPara,
                    {
                      fontFamily: localFont,
                      fontSize: localSize,
                      lineHeight: localLine,
                      textAlign: align,
                      writingDirection,
                      paddingBottom: isEnglish ? 2 : 6,
                    },
                    androidFontPad,
                  ]}
                >
                  {para}
                </Text>
              ))}
              <View style={styles.dedicationRule} />
              <Text
                style={[
                  styles.dedicationFromLabel,
                  {
                    fontFamily: localFont,
                    writingDirection,
                    paddingBottom: isEnglish ? 0 : 4,
                  },
                  androidFontPad,
                ]}
              >
                {copy.fromLabel}
              </Text>
              <Text
                style={[
                  styles.dedicationName,
                  {
                    fontFamily: localFont,
                    fontSize: isEnglish ? 15 : 16,
                    lineHeight: Math.round(
                      (isEnglish ? 15 : 16) * (isEnglish ? 1.35 : NASTALIQ_LINE_RATIO),
                    ),
                    writingDirection,
                    paddingBottom: isEnglish ? 2 : 6,
                  },
                  androidFontPad,
                ]}
              >
                {copy.donorName}
              </Text>
              <Text
                style={[
                  styles.dedicationClosing,
                  {
                    fontFamily: HIFZ_FONT,
                    fontSize: 14,
                    lineHeight: Math.round(14 * ARABIC_LINE_RATIO),
                    paddingBottom: 4,
                  },
                  androidFontPad,
                ]}
              >
                {DEDICATION_CLOSING_AR}
              </Text>
            </View>
          </View>
        </View>
      </View>
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
  const listRef = useRef<FlatList<number>>(null);

  const pageNumbers = useMemo(
    () => [
      ...Array.from({ length: HIFZ16_PAGE_COUNT }, (_, index) => HIFZ16_PAGE_COUNT - index),
      HIFZ_DEDICATION_PAGE,
    ],
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

  /** Reversed mushaf pages, then dedication after Fatiha in the swipe list. */
  const pageIndex = useCallback((page: number) => {
    if (page === HIFZ_DEDICATION_PAGE) return HIFZ16_PAGE_COUNT;
    return HIFZ16_PAGE_COUNT - page;
  }, []);
  const startIndex = Math.max(0, pageIndex(startPage));
  const visiblePageRef = useRef(startPage);
  const userInterruptedFollowRef = useRef(false);
  const followProgrammaticRef = useRef(false);

  const scrollToPage = useCallback(
    (page: number, animated: boolean) => {
      const index = Math.max(0, pageIndex(page));
      visiblePageRef.current = page;
      followProgrammaticRef.current = true;
      requestAnimationFrame(() => {
        listRef.current?.scrollToIndex({ index, animated });
        // FlatList settle; clear flag after animation window.
        setTimeout(() => {
          followProgrammaticRef.current = false;
        }, animated ? 450 : 80);
      });
    },
    [pageIndex],
  );

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
      if (visible === HIFZ_DEDICATION_PAGE) return;
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
      if (visiblePageRef.current === HIFZ_DEDICATION_PAGE) return;
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

  const handleAyahPress = useCallback(
    (surah: number, ayah: number) => {
      if (!onPlayAyah || surah < 1 || ayah < 1) return;
      onPlayAyah(surah, ayah);
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
    if (pageNumber === HIFZ_DEDICATION_PAGE) {
      // Title only — keep dock / reading position on the last mushaf ayah.
      onVisiblePositionChangeRef.current?.(0, 0, HIFZ_DEDICATION_PAGE);
      return;
    }
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

  const [measureEnabled, setMeasureEnabled] = useState(true);

  const handleScrollBeginDrag = useCallback(() => {
    setMeasureEnabled(false);
    if (followProgrammaticRef.current) return;
    if (playingRef.current.surah != null && playingRef.current.ayah != null) {
      userInterruptedFollowRef.current = true;
    }
  }, []);

  const handleMomentumScrollEnd = useCallback(() => {
    setMeasureEnabled(true);
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

  const [listHeight, setListHeight] = useState(() => Math.floor(WINDOW_HEIGHT));
  const onListLayout = useCallback((event: LayoutChangeEvent) => {
    const next = Math.floor(event.nativeEvent.layout.height);
    if (next <= 0) return;
    setListHeight((prev) => (prev === next ? prev : next));
  }, []);

  const pageHeight = listHeight;

  const renderPage = useCallback(
    ({ item: pageNumber }: ListRenderItemInfo<number>) => {
      if (pageNumber === HIFZ_DEDICATION_PAGE) {
        return (
          <View style={[{ width: PAGE_WIDTH, height: pageHeight }, UNMIRROR_RTL]}>
            <HifzDedicationPage
              background={theme.background}
              contentPaddingTop={contentPaddingTop}
              contentPaddingBottom={contentPaddingBottom}
              pageHeight={pageHeight}
            />
          </View>
        );
      }
      const page = getHifzPage(pageNumber);
      if (!page) {
        return (
          <View style={[{ width: PAGE_WIDTH, height: pageHeight }, UNMIRROR_RTL]} />
        );
      }
      return (
        <View style={[{ width: PAGE_WIDTH, height: pageHeight }, UNMIRROR_RTL]}>
          <HifzPageCard
            page={page}
            background={theme.background}
            contentPaddingTop={contentPaddingTop}
            contentPaddingBottom={contentPaddingBottom}
            pageHeight={pageHeight}
            activePlayingSurah={activePlayingSurah}
            activePlayingAyah={activePlayingAyah}
            onAyahPress={handleAyahPress}
            lineHasBookmark={lineHasBookmark}
            measureEnabled={measureEnabled}
          />
        </View>
      );
    },
    [
      activePlayingAyah,
      activePlayingSurah,
      contentPaddingBottom,
      contentPaddingTop,
      handleAyahPress,
      lineHasBookmark,
      measureEnabled,
      pageHeight,
      theme.background,
    ]
  );

  return (
    <FlatList
      ref={listRef}
      style={[styles.list, { backgroundColor: theme.background }, UNMIRROR_RTL]}
      data={pageNumbers}
      keyExtractor={(page) =>
        page === HIFZ_DEDICATION_PAGE ? 'hifz16-dedication' : `hifz16-${page}`
      }
      horizontal
      pagingEnabled
      decelerationRate="fast"
      disableIntervalMomentum
      showsHorizontalScrollIndicator={false}
      initialScrollIndex={startIndex}
      getItemLayout={(_, index) => ({
        length: PAGE_WIDTH,
        offset: PAGE_WIDTH * index,
        index,
      })}
      onLayout={onListLayout}
      onScrollToIndexFailed={({ index }) => {
        requestAnimationFrame(() => {
          listRef.current?.scrollToIndex({ index, animated: false });
        });
      }}
      renderItem={renderPage}
      onViewableItemsChanged={onViewableItemsChanged}
      viewabilityConfig={viewabilityConfig}
      onScrollBeginDrag={handleScrollBeginDrag}
      onMomentumScrollEnd={handleMomentumScrollEnd}
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
  pageHeight,
  activePlayingSurah,
  activePlayingAyah,
  onAyahPress,
  lineHasBookmark,
  measureEnabled,
}: {
  page: HifzPage;
  background: string;
  contentPaddingTop: number;
  contentPaddingBottom: number;
  pageHeight: number;
  activePlayingSurah?: number | null;
  activePlayingAyah?: number | null;
  onAyahPress: (surah: number, ayah: number) => void;
  lineHasBookmark: (line: HifzLine) => boolean;
  measureEnabled: boolean;
}) {
  const opening = isOpeningPage(page.page);
  const predictedWidth = predictContentWidth();
  const [measuredWidth, setMeasuredWidth] = useState<number | null>(null);
  const contentWidth =
    measuredWidth != null && Math.abs(measuredWidth - predictedWidth) > 1
      ? measuredWidth
      : predictedWidth;
  const [frameSize, setFrameSize] = useState(() => ({
    width: Math.floor(PAGE_WIDTH),
    height: 0,
  }));

  useEffect(() => {
    setMeasuredWidth(null);
  }, [page.page, opening]);

  const onTextColumnLayout = useCallback(
    (event: LayoutChangeEvent) => {
      const next = Math.floor(event.nativeEvent.layout.width);
      setMeasuredWidth((prev) => {
        if (Math.abs(next - predictedWidth) <= 1) return null;
        return prev === next ? prev : next;
      });
    },
    [predictedWidth],
  );

  const onFrameLayout = useCallback((event: LayoutChangeEvent) => {
    const width = Math.floor(event.nativeEvent.layout.width);
    const height = Math.floor(event.nativeEvent.layout.height);
    setFrameSize((prev) => {
      const widthStable = Math.abs(prev.width - width) <= 1;
      const heightStable = prev.height === height;
      if (widthStable && heightStable) return prev;
      return {
        width: widthStable ? prev.width : width,
        height,
      };
    });
  }, []);

  // One body size on every page — same as the rest of the mushaf.
  const fontSize = BASE_FONT;
  const lineHeight = Math.round(fontSize * LINE_HEIGHT_RATIO);
  const longestChars = useMemo(() => longestJustifiedAyahChars(page), [page]);

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
          height: pageHeight > 0 ? pageHeight : undefined,
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
                    const surah = line.surahNumber;
                    return (
                      <View key={`${page.page}-${line.line}`} style={styles.openingLineRow}>
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
                          pageNumber={page.page}
                          lineNumber={line.line}
                          longestChars={longestChars}
                          onAyahPress={
                            surah
                              ? (ayah) => onAyahPress(surah, ayah)
                              : undefined
                          }
                        />
                      </View>
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
                    <View
                      key={`${page.page}-${line.line}`}
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
                          pageNumber={page.page}
                          lineNumber={line.line}
                          longestChars={longestChars}
                          measureEnabled={measureEnabled}
                          onAyahPress={
                            line.surahNumber
                              ? (ayah) => onAyahPress(line.surahNumber!, ayah)
                              : undefined
                          }
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
                    </View>
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
  floralSvg: {
    zIndex: 0,
    backgroundColor: 'transparent',
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
    position: 'absolute',
    top: 10,
    right: 18,
    bottom: 10,
    left: 18,
    zIndex: 10,
    elevation: 10,
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
    position: 'absolute',
    top: 46,
    right: 46,
    bottom: 46,
    left: 46,
    zIndex: 10,
    elevation: 10,
    paddingTop: 2,
  },
  dedicationInner: {
    position: 'absolute',
    top: 46,
    right: 40,
    bottom: 46,
    left: 40,
    zIndex: 10,
    elevation: 10,
  },
  dedicationContent: {
    flex: 1,
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
    gap: 8,
  },
  dedicationBismillah: {
    color: ILLUM.greenDark,
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  dedicationArabic: {
    color: ILLUM.ink,
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  dedicationRule: {
    alignSelf: 'center',
    width: '42%',
    height: StyleSheet.hairlineWidth * 2,
    backgroundColor: ILLUM.gold,
    opacity: 0.9,
    marginVertical: 2,
  },
  dedicationPara: {
    color: ILLUM.ink,
  },
  dedicationFromLabel: {
    fontSize: 12,
    color: ILLUM.greenDark,
    textAlign: 'center',
    marginTop: 2,
  },
  dedicationName: {
    color: ILLUM.greenDark,
    textAlign: 'center',
  },
  dedicationClosing: {
    color: ILLUM.greenDark,
    textAlign: 'center',
    writingDirection: 'rtl',
    marginTop: 2,
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
  stretchedTitleWrap: {
    width: '100%',
    alignSelf: 'stretch',
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
    width: '100%',
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
  centeredLinePad: {
    paddingHorizontal: 10,
  },
  centeredLineText: {
    maxWidth: '100%',
  },
  lineText: {
    fontFamily: HIFZ_FONT,
  },
  ayahLineRow: {
    width: '100%',
    // Physical row-reverse: first child (body) sits on the right edge.
    flexDirection: 'row-reverse',
    alignItems: 'center',
  },
  ayahLineBody: {
    flex: 1,
    justifyContent: 'center',
    // Prevent children from stretching to the slot width (Yoga default alignItems:stretch).
    alignItems: 'flex-end',
    // Physical right = on-screen right (line start) once RTL unmirror cancels out.
    paddingRight: AYAH_PAD_START,
    paddingLeft: AYAH_PAD_END,
  },
  ayahLineBodyText: {
    alignSelf: 'flex-end',
    maxWidth: '100%',
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  ayahLineMarker: {
    flexGrow: 0,
    flexShrink: 0,
    paddingLeft: 2,
    paddingRight: 6,
  },
  ayahLineMarkerText: {
    writingDirection: 'rtl',
    textAlign: 'right',
  },
  /** Off-screen shrink-wrap probe — wide so the run never wraps at the page column. */
  ayahProbeHost: {
    position: 'absolute',
    opacity: 0,
    left: -10000,
    top: 0,
    width: 4096,
    zIndex: -1,
  },
  measureHost: {
    position: 'absolute',
    opacity: 0,
    // Off-screen, unconstrained width so onTextLayout reports true glyph advance.
    left: -10000,
    top: 0,
    zIndex: -1,
  },
  lineArabic: {
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  lineCentered: {
    textAlign: 'center',
    writingDirection: 'rtl',
    width: '100%',
  },
  surahName: {
    fontWeight: '600',
  },
});
