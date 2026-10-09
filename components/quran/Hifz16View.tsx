/**
 * Fixed 16-line Indo-Pak hifz page reader (no translation).
 * One ayah font size per page; short lines stretch with measured kashida.
 * Pages 1–2 use a repeating green–blue floral tazhib border with a surah cartouche.
 */

import React, { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  Modal,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
    Text,
  TextInput,
  View,
  useWindowDimensions,
    type LayoutChangeEvent,
} from 'react-native';
import Reanimated, {
  cancelAnimation,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, { Circle, Ellipse, G, Path, Rect } from 'react-native-svg';

import { BorderRadius, Spacing } from '@/constants/theme';
import { useAppLanguage, useBookmarks, useLocalizedFontPreferences, useReadingPosition } from '@/context/AppContext';
import { getSurah, SURAH_NAMES } from '@/data/surahNames';
import { getArabicBoldFontFamily, getArabicFontFamily, getDariFontFamily, getPashtoBoldFontFamily, getPashtoFontFamily } from '@/hooks/useFonts';
import { getPortraitWindowSize } from '@/hooks/usePortraitLock';
import { useQuranReaderSettings } from '@/hooks/useQuranReaderSettings';
import type { AppLanguage } from '@/types/quran';
import { isLatinLanguage } from '@/utils/i18n/languages';
import {
    getHifzPage,
    getHifzJuzPageRange,
    findHifzJuzStartAyah,
    getHifzSurahStartPage,
    HIFZ16_PAGE_COUNT,
    hifzAyahVisibleLengthOnPage,
    hifzPageContainsAyah,
    listHifzPagesForAyah,
    resolveHifzPageTarget,
    type HifzLine,
    type HifzPage,
} from '@/utils/hifz16';
import {
    applyKashida,
    kashidaCountForWidth,
    kashidaSlots,
    MAX_STRETCH_LETTERS,
    splitAyahSpans,
    splitLineBodyAndMarkers,
    visibleLength,
} from '@/utils/hifzKashida';
import { toArabicNumerals, toLatinNumeralsString } from '@/utils/numbers';
import audioManager from '@/utils/quranAudio';
import { MaterialIcons } from '@expo/vector-icons';
import { useI18n } from '@/utils/i18n/useI18n';
import {
  normalizeArabicForSearch,
  normalizeDariForSearch,
  normalizeEnglishForSearch,
  normalizePashtoForSearch,
} from '@/utils/quranSearchNormalize';
import { NativeHifz16Page } from './NativeHifz16Page';

const HIFZ_FONT = Platform.OS === 'ios' ? 'Scheherazade New' : 'ScheherazadeNew';
const { width: PAGE_WIDTH } = getPortraitWindowSize();
/** Android's non-numbered dedication leaf immediately before Quran page 1. */
const HIFZ_DEDICATION_PAGE = 0;
const HAS_HIFZ_DEDICATION = Platform.OS === 'android';
/** Dua khatm leaf immediately after the last mushaf page. Not a numbered page. */
const HIFZ_KHATM_PAGE = HIFZ16_PAGE_COUNT + 1;
/** Prayer-request leaf immediately after the khatm dua. Not a numbered page. */
const HIFZ_CREDITS_PAGE = HIFZ16_PAGE_COUNT + 2;

function isHifzExtraLeaf(page: number): boolean {
  return page === HIFZ_DEDICATION_PAGE || page === HIFZ_KHATM_PAGE || page === HIFZ_CREDITS_PAGE;
}
// translateX, not `left`: a layout pass on every finger move is what made the
// sheet lag. Each page is laid out on screen and then slid, so the neighbor
// is already drawn when the finger moves.
const HIFZ_PAGE_SPRING = { damping: 28, stiffness: 320, mass: 0.6, overshootClamping: true } as const;

/** Next (+1) or previous (-1) mushaf page. Dedication 0 sits before page 1; khatm and the prayer leaf sit after the last page. */
function neighborHifzPage(page: number, delta: 1 | -1): number | null {
  const next = page + delta;
  const first = HAS_HIFZ_DEDICATION ? HIFZ_DEDICATION_PAGE : 1;
  if (next < first || next > HIFZ_CREDITS_PAGE) return null;
  return next;
}

/**
 * One page in the three-page window. Translation is
 * (settledPage - page) * width + drag, so resetting drag to 0 and moving
 * settledPage by one in the same UI frame leaves the on-screen page still.
 */
const HifzPageSlot = memo(function HifzPageSlot({
  page,
  width,
  settled,
  drag,
  resting,
  interactive,
  children,
}: {
  page: number;
  width: number;
  settled: SharedValue<number>;
  drag: SharedValue<number>;
  resting: boolean;
  interactive: boolean;
  children: React.ReactNode;
}) {
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: (settled.value - page) * width + drag.value }],
  }), [page, width]);
  return (
    <Reanimated.View
      collapsable={false}
      pointerEvents={interactive ? 'auto' : 'none'}
      style={[
        { position: 'absolute', top: 0, bottom: 0, left: 0, width },
        resting ? null : animatedStyle,
      ]}
    >
      {children}
    </Reanimated.View>
  );
});
/** One body size for every mushaf page (stable across a surah). */
const BASE_FONT = 17;
/** Tall enough for Scheherazade harakat and letter tails. */
const LINE_HEIGHT_RATIO = 1.9;
/** Extra tall for Bismillah so ی / م descenders are not clipped. */
const BASMALLAH_LINE_HEIGHT_RATIO = 2.35;
/**
 * iOS draws Text only inside its bounds; stacked high/low marks (small meem over tanween)
 * rise past the line box, so visible line Texts get symmetric headroom.
 */
const LINE_INK_PAD = 6;
const BISMILLAH = 'بِسْمِ اللّٰهِ الرَّحْمٰنِ الرَّحِیْمِ';
const AYAH_HIGHLIGHT = 'rgba(36, 140, 100, 0.28)';
/**
 * Conjunction «وَ» before a hamza-alef word (وَاِذَا، وَاِذْ، وَاِیَّایَ، وَاَنِّیْ…)
 * must read as two words on a physical iPhone. Scheherazade swallows the
 * space after و there, so the break is a layout spacer Core Text cannot
 * collapse. The alef must carry a vowel sign: stems like والد and the
 * article وَال keep their bare alef and stay joined.
 */
const WAW_GAP_RE = /(^|[\s\u00A0])(و[\u064B-\u065F]*)(?=ا[\u064E\u064F\u0650\u0670\u0653])/gu;
const WAW_GAP_MAX = 8;
/** Still a visible word break on the tightest lines. */
const WAW_GAP_MIN = 4;

function countWawGaps(text: string): number {
  const hits = text.match(new RegExp(WAW_GAP_RE.source, 'gu'));
  return hits ? hits.length : 0;
}

type WawGapPart = { type: 'text'; text: string } | { type: 'gap' };

function splitWawGapParts(text: string): WawGapPart[] {
  const parts: WawGapPart[] = [];
  const re = new RegExp(WAW_GAP_RE.source, 'gu');
  let last = 0;
  let match: RegExpExecArray | null;
  while ((match = re.exec(text))) {
    const end = match.index + match[0].length;
    if (end > last) parts.push({ type: 'text', text: text.slice(last, end) });
    parts.push({ type: 'gap' });
    last = end;
  }
  if (last < text.length) parts.push({ type: 'text', text: text.slice(last) });
  if (parts.length === 0) parts.push({ type: 'text', text });
  return parts;
}

/** Short stroke per join — matches MAX_TATWEEL_PER_LETTER in hifzKashida. */
const KASHIDA_SLOT_CAP = 5;
/** Pages 1–2 stretch every line to the column; short rows need longer joins. */
const OPENING_SHORT_LINE_SLOT_CAP = 14;
/** Pages 1–2 fill the column with their real rows and a larger surah plaque. */
function isOpeningFillPage(page: number): boolean {
  return page === 1 || page === 2;
}
/** Matches `slimInner` horizontal inset (all pages). */
const SLIM_COLUMN_MARGIN = 18;
/**
 * Keep the same 20px total safety inset around the rendered body. Four pixels
 * sit inside Text on the RTL start side so glyph ink cannot touch Text's clip edge.
 */
const AYAH_PAD_START = 12;
const AYAH_PAD_END = 4;
const AYAH_TEXT_START_INSET = 4;
const AYAH_PAD_TOTAL = AYAH_PAD_START + AYAH_PAD_END + AYAH_TEXT_START_INSET;
/** End-side inset when a ﴿n﴾ follows — the number reads as part of the ayah. */
const AYAH_PAD_BEFORE_MARKER = 3;
/** Keep at least this much of the end-side inset when a tight line borrows it. */
const AYAH_END_PAD_FLOOR = 2;
/**
 * Per-line fit for a line wider than the column even with no kashida:
 * narrow the waw gaps, borrow the end (left) inset, then shrink that one
 * line's font. The start edge never moves and nothing is ever ellipsized.
 */
type LineFit = { gap: number; relief: number; scale: number };
const LINE_FIT_DEFAULT: LineFit = { gap: WAW_GAP_MAX, relief: 0, scale: 1 };
/** Smallest per-line font scale (17pt → 13.6pt) that still reads cleanly. */
const LINE_SCALE_FLOOR = 0.75;
const CENTERED_LINE_PAD = 10;
const LINE_SCALE_STEP = 0.005;
/** Survives FlatList remounts so a revisited page does not re-probe and jump. */
const lineFitCache = new Map<string, LineFit>();
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
function bodyContentWidth(slotWidth: number, padTotal = AYAH_PAD_TOTAL): number {
  return Math.max(0, slotWidth - padTotal);
}

function kashidaCacheKey(
  pageNumber: number,
  lineNumber: number,
  contentWidth: number,
  fontSize: number,
  markerWidth = 0,
  bodySlot = 0,
  gapReserve = 0,
  padTotal = AYAH_PAD_TOTAL,
): string {
  // v36: overlong lines shrink their font instead of spilling or ellipsizing.
  return `v37:${pageNumber}:${lineNumber}:${contentWidth}:${fontSize}:${markerWidth}:${bodySlot}:r${gapReserve}:p${padTotal}`;
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

/**
 * Short lines on pages 1–2 can need more than five strokes per join to reach the
 * column width. Keep the normal helper for every other line, and spread only
 * these extra strokes over the line's available joins.
 */
function applyKashidaWithSlotCap(text: string, count: number, maxPerSlot: number): string {
  if (maxPerSlot <= KASHIDA_SLOT_CAP) {
    return applyKashida(text, count, maxPerSlot);
  }
  if (!text || count <= 0) return text;

  const slots = kashidaSlots(text);
  if (slots.length === 0) return text;
  // The even fill below starts at the line head; while the normal helper can
  // hold the budget, let it spread strokes along the whole line instead.
  if (count <= Math.min(slots.length, MAX_STRETCH_LETTERS) * KASHIDA_SLOT_CAP) {
    return applyKashida(text, count, KASHIDA_SLOT_CAP);
  }

  const cap = Math.max(KASHIDA_SLOT_CAP, Math.floor(maxPerSlot));
  const budget = Math.min(count, slots.length * cap);
  const inserts = new Map<number, number>();
  let placed = 0;
  while (placed < budget) {
    let progressed = false;
    for (const slot of slots) {
      if (placed >= budget) break;
      const current = inserts.get(slot) ?? 0;
      if (current >= cap) continue;
      inserts.set(slot, current + 1);
      placed += 1;
      progressed = true;
    }
    if (!progressed) break;
  }

  let result = '';
  for (let index = 0; index <= text.length; index += 1) {
    const extra = inserts.get(index) ?? 0;
    if (extra > 0) result += 'ـ'.repeat(extra);
    if (index < text.length) result += text[index];
  }
  return result;
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
  /** Exact Hafiz page for juz, bookmark and direct page navigation. */
  initialPage?: number | null;
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

function lastAyahLineOf(page: HifzPage | null): HifzLine | undefined {
  if (!page) return undefined;
  for (let i = page.lines.length - 1; i >= 0; i -= 1) {
    const line = page.lines[i];
    if (line.type === 'ayah' && line.text && line.ayahStart != null) return line;
  }
  return undefined;
}

/**
 * Lines that carry a bookmark ribbon: the line where a bookmarked ayah begins.
 * An ayah that wraps (even across a page) keeps a single ribbon on its opening line.
 */
function bookmarkRibbonLines(
  page: HifzPage,
  isAyahBookmarked: (surah: number, ayah: number) => boolean,
): Set<number> {
  const marked = new Set<number>();
  let prev = lastAyahLineOf(getHifzPage(page.page - 1));
  for (const line of page.lines) {
    if (line.type !== 'ayah' || !line.text || line.surahNumber == null || line.ayahStart == null) {
      continue;
    }
    const end = line.ayahEnd ?? line.ayahStart;
    const continues =
      prev?.surahNumber === line.surahNumber &&
      (prev.ayahEnd ?? prev.ayahStart) === line.ayahStart;
    for (let ayah = continues ? line.ayahStart + 1 : line.ayahStart; ayah <= end; ayah += 1) {
      if (isAyahBookmarked(line.surahNumber, ayah)) {
        marked.add(line.line);
        break;
      }
    }
    prev = line;
  }
  return marked;
}

/** Gold ribbon hung in the right margin beside the line, clear of the ayah text. */
const BookmarkRibbon = memo(function BookmarkRibbon() {
  return (
    <View style={styles.bookmarkRibbon} pointerEvents="none">
      <Svg width={10} height={18}>
        <Path d="M0 0 H10 V18 L5 13.5 L0 18 Z" fill={ILLUM.gold} stroke="#9C7C34" strokeWidth={0.8} />
      </Svg>
    </View>
  );
});

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

/** Surah names stay fixed and centered; only ayah body lines use kashida. */
const SurahTitleText = memo(function SurahTitleText({
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
  return (
    <Text
      numberOfLines={1}
      ellipsizeMode="clip"
      style={[
        {
          fontFamily: HIFZ_FONT,
          fontSize,
          lineHeight,
          textAlign: 'center' as const,
          writingDirection: 'rtl' as const,
        },
        textStyle,
        androidFontPad,
      ]}
    >
      {title}
    </Text>
  );
});

/** Blue–green cartouche with gold trim for the surah name above the ayah text. */
const SurahCartouche = memo(function SurahCartouche({ title }: { title?: string }) {
  if (!title) return null;
  return (
    <View style={styles.surahCartouche}>
      <View style={styles.surahCartoucheFrame} />
      <SurahTitleText
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

/** Static mid-mushaf header: centered surah name and Bismillah with plain gold rules. */
const SurahFloralHeader = memo(function SurahFloralHeader({
  title,
  basmallahText,
  surahNumber,
  fontSize,
  lineHeight,
}: {
  title?: string;
  basmallahText?: string | null;
  surahNumber?: number;
  fontSize: number;
  lineHeight: number;
}) {
  // Pages 1–2: double-framed plaque with the mushaf side notes and Bismillah.
  if (surahNumber === 1 || surahNumber === 2) {
    const titleSize = fontSize + 3;
    const info = getSurah(surahNumber);
    const revelation = info?.revelationType === 'مدنی' ? 'مدنية' : 'مكية';
    return (
      <View style={styles.floralHeader}>
        {title ? (
          <View style={styles.openingPlaqueOuter}>
            <View style={styles.openingPlaqueInner}>
              <View style={styles.openingPlaqueSide}>
                <Text style={[styles.openingPlaqueNote, androidFontPad]} numberOfLines={1}>
                  {revelation}
                </Text>
              </View>
              <View style={styles.openingPlaqueCenter}>
                <MiniFloral size={16} />
                <SurahTitleText
                  title={title}
                  fontSize={titleSize}
                  lineHeight={Math.round(titleSize * 1.55)}
                  textStyle={styles.openingPlaqueTitle}
                />
                <MiniFloral size={16} />
              </View>
              <View style={styles.openingPlaqueSide}>
                <Text style={[styles.openingPlaqueNote, androidFontPad]} numberOfLines={1}>
                  {info ? `آياتها ${toArabicNumerals(info.ayahCount)}` : ''}
                </Text>
              </View>
            </View>
          </View>
        ) : null}
        {basmallahText != null ? (
          <BasmallahText text={basmallahText || BISMILLAH} fontSize={fontSize + 2} ornate />
        ) : null}
      </View>
    );
  }

  return (
    <View style={styles.surahHeader}>
      {title ? (
        <View style={styles.surahHeaderTitleRow}>
          <MiniFloral size={14} />
          <View style={styles.surahHeaderRule} />
          <Text
            numberOfLines={1}
            ellipsizeMode="clip"
            style={[
              styles.surahHeaderTitle,
              {
                fontFamily: HIFZ_FONT,
                fontSize,
                lineHeight,
              },
              androidFontPad,
            ]}
          >
            {title}
          </Text>
          <View style={styles.surahHeaderRule} />
          <MiniFloral size={14} />
        </View>
      ) : null}
      {basmallahText != null ? (
        <View style={styles.surahHeaderBasmallahRow}>
          <MiniFloral size={14} />
          <View style={styles.surahHeaderRule} />
          <Text
            numberOfLines={1}
            ellipsizeMode="clip"
            style={[
              styles.surahHeaderBasmallah,
              {
                fontFamily: HIFZ_FONT,
                fontSize: BASE_FONT,
                lineHeight,
              },
              androidFontPad,
            ]}
          >
            {basmallahText || BISMILLAH}
          </Text>
          <View style={styles.surahHeaderRule} />
          <MiniFloral size={14} />
        </View>
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
  /** Retained for non-header callers that need a compact ornament. */
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

function WawGapPieces({
  text,
  textStyle,
  gap,
  highlight,
  onPress,
}: {
  text: string;
  textStyle: object | object[];
  gap: number;
  highlight?: object;
  onPress?: () => void;
}) {
  const parts = splitWawGapParts(text);
  return (
    <>
      {parts.map((part, index) =>
        part.type === 'gap' ? (
          <View key={`gap-${index}`} style={{ width: gap }} />
        ) : (
          <Text
            key={`tx-${index}`}
            style={[textStyle, styles.wawGapPiece]}
            onPress={onPress}
            suppressHighlighting
            numberOfLines={1}
            ellipsizeMode="clip"
          >
            {highlight ? <Text style={highlight}>{part.text}</Text> : part.text}
          </Text>
        ),
      )}
    </>
  );
}

const JustifiedAyahText = memo(function JustifiedAyahText({
  text,
  fontSize: baseFontSize,
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
  /** Play the ayah under the tap (not the line's ayahStart). */
  onAyahPress?: (ayah: number) => void;
}) {
  const { body, markers } = useMemo(
    () => splitLineBodyAndMarkers(text),
    [text],
  );
  const fitWidth = Math.max(0, contentWidth);
  const wawCount = useMemo(() => countWawGaps(text), [text]);
  const hasWawGap = wawCount > 0;
  const fitKey = `${pageNumber}:${lineNumber}:${fitWidth}:${baseFontSize}`;
  const [lineFit, setLineFit] = useState<LineFit>(
    () => lineFitCache.get(fitKey) ?? LINE_FIT_DEFAULT,
  );
  useEffect(() => {
    setLineFit(lineFitCache.get(fitKey) ?? LINE_FIT_DEFAULT);
  }, [fitKey, text]);
  const stretch = justify && !centered;
  const fontSize = Math.round(baseFontSize * lineFit.scale * 100) / 100;
  const wawGap = lineFit.gap;
  const wawCountRef = useRef(wawCount);
  wawCountRef.current = wawCount;
  const lineFitRef = useRef(lineFit);
  lineFitRef.current = lineFit;
  const fitKeyRef = useRef(fitKey);
  fitKeyRef.current = fitKey;
  const gapReserve = wawCount * wawGap;
  const gapReserveRef = useRef(gapReserve);
  gapReserveRef.current = gapReserve;
  const baseEndPad = markers ? AYAH_PAD_BEFORE_MARKER : AYAH_PAD_START;
  const maxPadRelief = Math.max(0, baseEndPad - AYAH_END_PAD_FLOOR);
  const endPad = baseEndPad - Math.min(stretch ? lineFit.relief : 0, maxPadRelief);
  const padTotal = endPad + AYAH_PAD_END + AYAH_TEXT_START_INSET;
  const maxPadReliefRef = useRef(maxPadRelief);
  maxPadReliefRef.current = maxPadRelief;
  const padTotalRef = useRef(padTotal);
  padTotalRef.current = padTotal;
  const lineSlotCap = isOpeningFillPage(pageNumber)
    ? OPENING_SHORT_LINE_SLOT_CAP
    : KASHIDA_SLOT_CAP;
  // Keyed to the marker run: a reset effect would land after the one-shot
  // onLayout and leave the width at 0 for good.
  const markerMeasureKey = `${markers}:${fontSize}`;
  const [markerMeasure, setMarkerMeasure] = useState({ key: '', width: 0 });
  const measuredMarkerWidth = markerMeasure.key === markerMeasureKey ? markerMeasure.width : 0;
  const markerMeasureKeyRef = useRef(markerMeasureKey);
  markerMeasureKeyRef.current = markerMeasureKey;
  const [rowWidth, setRowWidth] = useState(0);
  // The body hugs its text so the number sits right after the last word;
  // its stretch slot is the row minus the number.
  const bodySlotWidth =
    rowWidth <= 0
      ? 0
      : markers
        ? measuredMarkerWidth > 0
          ? Math.max(0, rowWidth - measuredMarkerWidth)
          : 0
        : rowWidth;
  const markerReserve = markers
    ? measuredMarkerWidth > 0
      ? measuredMarkerWidth
      : estimateMarkerWidth(markers, fontSize)
    : 0;
  // Target the content box only — onLayout width includes start/end padding.
  const fillTarget = Math.max(
    0,
    (bodySlotWidth > 0
      ? bodyContentWidth(bodySlotWidth, padTotal)
      : Math.max(0, fitWidth - (stretch ? markerReserve : 0) - padTotal)) - gapReserve - 2,
  );
  const cacheKey = kashidaCacheKey(
    pageNumber,
    lineNumber,
    fitWidth,
    fontSize,
    markerReserve,
    bodySlotWidth,
    gapReserve,
    padTotal,
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
  const seedRef = useRef(seed);
  seedRef.current = seed;
  const bodySlotRef = useRef(0);
  bodySlotRef.current = bodySlotWidth;
  const phaseRef = useRef(phase);
  phaseRef.current = phase;
  const [visibleCount, setVisibleCount] = useState(() =>
    initialCached !== undefined ? initialCached : seed,
  );
  const lineTatweelCap = useMemo(() => {
    const slots = kashidaSlots(body).length;
    return Math.min(MAX_KASHIDA_TOTAL, Math.max(0, slots) * lineSlotCap);
  }, [body, lineSlotCap]);

  const onMarkerLayout = useCallback((event: LayoutChangeEvent) => {
    const next = Math.ceil(event.nativeEvent.layout.width);
    if (next <= 0) return;
    const key = markerMeasureKeyRef.current;
    setMarkerMeasure((prev) =>
      prev.key === key && Math.abs(prev.width - next) <= 1 ? prev : { key, width: next },
    );
  }, []);

  const onRowLayout = useCallback((event: LayoutChangeEvent) => {
    const next = Math.floor(event.nativeEvent.layout.width);
    if (next <= 0) return;
    setRowWidth((prev) => (Math.abs(prev - next) <= 1 ? prev : next));
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

    setPhase('natural');
  }, [
    body,
    bodySlotWidth,
    cacheKey,
    fitWidth,
    measuredMarkerWidth,
    markers,
    seed,
    stretch,
  ]);

  const bodyDisplay = useMemo(() => {
    if (!stretch || visibleCount <= 0) return body;
    return applyKashidaWithSlotCap(body, visibleCount, lineSlotCap);
  }, [body, lineSlotCap, stretch, visibleCount]);

  const probeDisplay = useMemo(() => {
    if (!stretch) return body;
    if (phase === 'natural') return body;
    if (kashidaCount <= 0) return body;
    return applyKashidaWithSlotCap(body, kashidaCount, lineSlotCap);
  }, [body, kashidaCount, lineSlotCap, phase, stretch]);

  const settleWithProbeWidth = useCallback(
    (rawWidth: number, lineCount: number, secondLineWidth = 0) => {
      if (!stretch) return;
      const slot = Math.max(
        0,
        bodyContentWidth(bodySlotRef.current, padTotalRef.current) - gapReserveRef.current,
      );
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
        const gaps = wawCountRef.current;
        if (overshoot && !wrapped) {
          // Wider than the column with no kashida: narrow the waw gaps (never
          // below a visible break), borrow the end inset, then shrink this line.
          const fit = lineFitRef.current;
          const content = bodyContentWidth(bodySlotRef.current, padTotalRef.current);
          const total = painted + gaps * fit.gap;
          let next: LineFit | null = null;
          if (gaps > 0 && fit.gap > WAW_GAP_MIN) {
            next = {
              ...fit,
              gap: Math.max(
                WAW_GAP_MIN,
                Math.min(fit.gap - 1, Math.floor((content - painted) / gaps)),
              ),
            };
          } else if (fit.relief < maxPadReliefRef.current) {
            next = {
              ...fit,
              relief: Math.min(
                maxPadReliefRef.current,
                fit.relief + Math.max(1, Math.ceil(total - content)),
              ),
            };
          } else if (fit.scale > LINE_SCALE_FLOOR) {
            const ratio = total > 0 ? content / total : 1;
            const target = Math.floor(fit.scale * ratio / LINE_SCALE_STEP) * LINE_SCALE_STEP;
            next = {
              ...fit,
              scale: Math.max(LINE_SCALE_FLOOR, Math.min(fit.scale - LINE_SCALE_STEP, target)),
            };
          }
          if (next) {
            lineFitCache.set(fitKeyRef.current, next);
            setLineFit(next);
            return;
          }
        }
        // The word gap is reserved layout, not a character we can delete.
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

  // Centered lines never stretch, but a long one must still fit its column.
  const [centerAvail, setCenterAvail] = useState(0);
  const [centerChecked, setCenterChecked] = useState('');
  const centerKey = `${fitKey}:${fontSize}:${wawGap}:${centerAvail}`;
  const onCenterLayout = useCallback((event: LayoutChangeEvent) => {
    const next = Math.floor(event.nativeEvent.layout.width) - CENTERED_LINE_PAD * 2;
    if (next <= 0) return;
    setCenterAvail((prev) => (Math.abs(prev - next) <= 1 ? prev : next));
  }, []);
  const onCenterProbeLayout = useCallback(
    (event: { nativeEvent: { lines: { width: number }[] } }) => {
      const lines = event.nativeEvent.lines;
      if (!lines.length || centerAvail <= 0) return;
      const painted = Math.ceil((lines[0]?.width ?? 0) * PROBE_WIDTH_BIAS);
      const fit = lineFitRef.current;
      const gaps = wawCountRef.current;
      const total = painted + gaps * fit.gap;
      let next: LineFit | null = null;
      if (total > centerAvail) {
        if (gaps > 0 && fit.gap > WAW_GAP_MIN) {
          next = {
            ...fit,
            gap: Math.max(
              WAW_GAP_MIN,
              Math.min(fit.gap - 1, Math.floor((centerAvail - painted) / gaps)),
            ),
          };
        } else if (fit.scale > LINE_SCALE_FLOOR) {
          const target =
            Math.floor((fit.scale * centerAvail) / total / LINE_SCALE_STEP) * LINE_SCALE_STEP;
          next = {
            ...fit,
            scale: Math.max(LINE_SCALE_FLOOR, Math.min(fit.scale - LINE_SCALE_STEP, target)),
          };
        }
      }
      if (next) {
        lineFitCache.set(fitKeyRef.current, next);
        setLineFit(next);
        return;
      }
      setCenterChecked(centerKey);
    },
    [centerAvail, centerKey],
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
      styles.lineInkPad,
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
    const source = text;
    const fullSpans =
      ayahStart == null || ayahEnd == null
        ? [{ text: source, ayah: -1 as number }]
        : splitAyahSpans(source, ayahStart, ayahEnd);
    return (
      <View
        style={[
          styles.lineMeasureWrap,
          styles.centeredLinePad,
          hasWawGap && styles.wawGapRun,
          hasWawGap && centered && styles.centeredWawRun,
        ]}
        onLayout={onCenterLayout}
      >
        {centerAvail > 0 && centerChecked !== centerKey ? (
          <View
            style={styles.ayahProbeHost}
            pointerEvents="none"
            collapsable={false}
            accessible={false}
            importantForAccessibility="no-hide-descendants"
          >
            <Text key={centerKey} style={probeStyle} onTextLayout={onCenterProbeLayout} accessible={false}>
              {source}
            </Text>
          </View>
        ) : null}
        {hasWawGap ? (
          fullSpans.map((span, index) => (
            <WawGapPieces
              key={`${span.ayah}-${index}`}
              text={span.text}
              textStyle={lineStyle}
              gap={wawGap}
              highlight={
                highlightAyah != null && span.ayah === highlightAyah && span.ayah > 0
                  ? styles.ayahHighlight
                  : undefined
              }
              onPress={onAyahPress && span.ayah > 0 ? () => onAyahPress(span.ayah) : undefined}
            />
          ))
        ) : (
          <Text style={[lineStyle, styles.centeredLineText]} numberOfLines={1} ellipsizeMode="clip">
            {onAyahPress || highlightAyah != null
              ? fullSpans.map(renderSpan)
              : source}
          </Text>
        )}
      </View>
    );
  }

  const measuring = phase !== 'done' && bodySlotWidth > 0;

  const markerHighlight =
    highlightAyah != null && markerAyah === highlightAyah && markerAyah > 0
      ? styles.ayahHighlight
      : undefined;

  // A justified line can hold the tail of one ayah and the start of the next;
  // each part must highlight and play on its own.
  const bodySpans =
    ayahStart == null || ayahEnd == null
      ? null
      : splitAyahSpans(bodyDisplay, ayahStart, ayahEnd);

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
            key={`ayah-probe-${phase}-${kashidaCount}-${bodySlotWidth}-${gapReserve}-${padTotal}-${fontSize}`}
            style={probeStyle}
            onTextLayout={onProbeTextLayout}
            accessible={false}
          >
            {probeDisplay}
          </Text>
        </View>
      ) : null}
      <View style={styles.ayahLineRow} onLayout={onRowLayout}>
        <View
          style={[
            styles.ayahLineBody,
            { paddingLeft: endPad },
          ]}
        >
          {hasWawGap ? (
            <View style={[styles.ayahLineBodyText, styles.wawGapRun]}>
              {bodySpans && (onAyahPress || highlightAyah != null)
                ? bodySpans.map((span, index) => (
                    <WawGapPieces
                      key={`${span.ayah}-${index}`}
                      text={span.text}
                      textStyle={lineStyle}
                      gap={wawGap}
                      highlight={
                        highlightAyah != null && span.ayah === highlightAyah && span.ayah > 0
                          ? styles.ayahHighlight
                          : undefined
                      }
                      onPress={
                        onAyahPress && span.ayah > 0 ? () => onAyahPress(span.ayah) : undefined
                      }
                    />
                  ))
                : (
                    <WawGapPieces text={bodyDisplay} textStyle={lineStyle} gap={wawGap} />
                  )}
            </View>
          ) : (
            <Text
              style={[lineStyle, styles.ayahLineBodyText]}
              numberOfLines={1}
              ellipsizeMode="clip"
            >
              {bodySpans && (onAyahPress || highlightAyah != null)
                ? bodySpans.map(renderSpan)
                : bodyDisplay}
            </Text>
          )}
        </View>
        {markers ? (
          <View
            style={styles.ayahLineMarker}
            onLayout={onMarkerLayout}
          >
            <Text
              style={[lineStyle, styles.ayahLineMarkerText]}
              numberOfLines={1}
              ellipsizeMode="clip"
              onPress={
                onAyahPress && markerAyah > 0 ? () => onAyahPress(markerAyah) : undefined
              }
              suppressHighlighting
            >
              {MARKER_RTL_MARK}
              {markerHighlight ? <Text style={markerHighlight}>{markers}</Text> : markers}
            </Text>
          </View>
        ) : null}
      </View>
    </View>
  );
});

type HifzPageLayout = {
  fontSize: number;
  lineHeight: number;
  longestChars: number;
};

/**
 * Android used to mount a measurement state machine for every visible line.
 * The 16-line source is static, so a conservative page-wide calculation is
 * both safer and much faster: each line paints once and never settles again.
 */
const pageLayoutCache = new Map<string, HifzPageLayout>();

function getHifzPageLayout(page: HifzPage, contentWidth: number): HifzPageLayout {
  const cacheKey = `${page.page}:${Math.floor(contentWidth)}`;
  const cached = pageLayoutCache.get(cacheKey);
  if (cached) return cached;

  const longestChars = Math.max(1, longestJustifiedAyahChars(page));
  // Allow the marker and ink padding before estimating the widest Arabic row.
  // The coefficient intentionally errs wide so Android never clips harakat.
  const safeTextWidth = Math.max(1, contentWidth - AYAH_PAD_TOTAL - 28);
  const safeSize = Math.floor(safeTextWidth / Math.max(1, longestChars * 0.59));
  const fontSize = Math.max(13, Math.min(BASE_FONT, safeSize));
  const layout = {
    fontSize,
    lineHeight: Math.round(fontSize * LINE_HEIGHT_RATIO),
    longestChars,
  };
  pageLayoutCache.set(cacheKey, layout);
  return layout;
}

const StaticHifzAyahText = memo(function StaticHifzAyahText({
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
  longestChars,
  onAyahPress,
}: {
  text: string;
  fontSize: number;
  lineHeight: number;
  color: string;
  contentWidth: number;
  centered?: boolean;
  justify?: boolean;
  ayahStart?: number;
  ayahEnd?: number;
  highlightAyah?: number | null;
  longestChars: number;
  onAyahPress?: (ayah: number) => void;
}) {
  const displayText = useMemo(() => {
    if (!justify || centered) return text;
    const { body, markers } = splitLineBodyAndMarkers(text);
    const target = Math.max(1, contentWidth - AYAH_PAD_TOTAL - (markers ? 28 : 0));
    const count = estimateSeedKashida(body, longestChars, target, fontSize);
    return `${applyKashidaWithSlotCap(body, count, KASHIDA_SLOT_CAP)}${markers}`;
  }, [centered, contentWidth, fontSize, justify, longestChars, text]);

  const spans = useMemo(
    () =>
      ayahStart == null || ayahEnd == null
        ? [{ text: displayText, ayah: -1 }]
        : splitAyahSpans(displayText, ayahStart, ayahEnd),
    [ayahEnd, ayahStart, displayText],
  );

  return (
    <Text
      numberOfLines={1}
      ellipsizeMode="clip"
      style={[
        styles.lineText,
        centered ? styles.lineCentered : styles.lineArabic,
        styles.lineInkPad,
        { color, fontSize, lineHeight },
        androidFontPad,
      ]}
    >
      {spans.map((span, index) => {
        const active = highlightAyah != null && span.ayah === highlightAyah && span.ayah > 0;
        return (
          <Text
            key={`${span.ayah}-${index}`}
            style={active ? styles.ayahHighlight : undefined}
            onPress={onAyahPress && span.ayah > 0 ? () => onAyahPress(span.ayah) : undefined}
            suppressHighlighting
          >
            {span.text}
          </Text>
        );
      })}
    </Text>
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
  turkish: {
    paras: [
      'Bu mübarek mushafı Allah’ın rızası ve O’nun kelâmına hizmet için vakfediyorum.',
      'Tilavetinin kalplere hidayet ve huzur getirmesini dilerim.',
    ],
    fromLabel: 'Vakfeden ve sunan',
    donorName: 'Seyyid Abdülilah Şirzadi',
  },
  arabic: {
    paras: [
      'أقف هذا المصحف الشريف ابتغاء مرضاة الله وخدمةً لكلامه.',
      'أسأل الله أن يكون تلاوته سبب هداية وطمأنينة للقلوب.',
    ],
    fromLabel: 'وقف وتقديم من',
    donorName: 'السيد عبدالإله شيرزادي',
  },
};

const NASTALIQ_FONT = 'NotoNastaliqUrdu';
const NASTALIQ_LINE_RATIO = 2.4;
const ARABIC_LINE_RATIO = 1.7;

/**
 * Android opening-page geometry in dp. Hifz16PageView.kt draws the text with
 * the same OPENING_* values, so both must change together.
 */
const OPENING_TEXT_TOP = 60;
const OPENING_TEXT_BOTTOM = 46;
const OPENING_SIDE_INSET = 44;
const OPENING_BASMALLAH_GAP = 0.5;
/** Page 2 is the taller opening page: surah, bismillah, half-row gap, five ayahs. */
const OPENING_SHARED_ROWS = 7.5;
/** Hifz16PageView's regular frame: 7dp outer margins, 30dp header, 5dp footer. */
const NATIVE_ROW_CHROME = 7 + 30 + 5 + 7;
const OPENING_FLOWER_MIN_GAP = 34;

/** Small flower spray above and below the opening text, in the frame's style. */
function OpeningFlowerRow({ cx, y }: { cx: number; y: number }) {
  return (
    <G>
      <Path
        d={`M ${cx - 86},${y} L ${cx + 86},${y}`}
        stroke={ILLUM.gold}
        strokeWidth={0.8}
        opacity={0.7}
      />
      <FloralUnit x={cx - 58} y={y} scale={0.62} rotate={-10} />
      <FloralUnit x={cx - 30} y={y} scale={0.7} rotate={10} />
      <G transform={`translate(${cx}, ${y}) scale(0.72) translate(${-cx}, ${-y})`}>
        <CornerBloom x={cx} y={y} />
      </G>
      <FloralUnit x={cx + 30} y={y} scale={0.7} rotate={170} />
      <FloralUnit x={cx + 58} y={y} scale={0.62} rotate={190} />
    </G>
  );
}

/**
 * Floral frame for Android pages 1–2, drawn over the native page. It uses the
 * dedication page's frame, border and paper so turning between them is seamless.
 */
const HifzOpeningOrnament = memo(function HifzOpeningOrnament({
  pageWidth,
  pageHeight,
  contentPaddingTop,
  contentPaddingBottom,
}: {
  pageWidth: number;
  pageHeight: number;
  contentPaddingTop: number;
  contentPaddingBottom: number;
}) {
  const frameWidth = Math.floor(pageWidth);
  const frameHeight = Math.floor(pageHeight - contentPaddingTop - contentPaddingBottom);
  if (frameWidth <= 0 || frameHeight <= 0) return null;

  const rowHeight = (pageHeight - contentPaddingTop - contentPaddingBottom - NATIVE_ROW_CHROME) / 16;
  // Same block on page 1 and page 2, so the flowers do not move when the page turns.
  const areaTop = OPENING_TEXT_TOP;
  const areaBottom = frameHeight - OPENING_TEXT_BOTTOM;
  const blockTop = areaTop + (areaBottom - areaTop - OPENING_SHARED_ROWS * rowHeight) / 2;
  const blockBottom = blockTop + OPENING_SHARED_ROWS * rowHeight;
  const showFlowers = blockTop - areaTop >= OPENING_FLOWER_MIN_GAP;

  return (
    <View
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, { paddingTop: contentPaddingTop, paddingBottom: contentPaddingBottom }]}
    >
      <View style={[styles.ltr, styles.openingFrame, { backgroundColor: 'transparent' }]}>
        <FloralOpeningBorder width={frameWidth} height={frameHeight} sparse />
        {showFlowers ? (
          <Svg width={frameWidth} height={frameHeight} style={StyleSheet.absoluteFill} pointerEvents="none">
            <OpeningFlowerRow cx={frameWidth / 2} y={(areaTop + blockTop) / 2} />
            <OpeningFlowerRow cx={frameWidth / 2} y={(blockBottom + areaBottom) / 2} />
          </Svg>
        ) : null}
      </View>
    </View>
  );
});

/** Waqf / dedication leaf past Fatiha — not part of the 548-page mushaf. */
const HifzDedicationPage = memo(function HifzDedicationPage({
  background,
  ink,
  textColor,
  accent,
  contentPaddingTop,
  contentPaddingBottom,
  pageHeight,
  pageWidth,
  onToggleControls,
}: {
  background: string;
  ink: string;
  textColor: string;
  accent: string;
  contentPaddingTop: number;
  contentPaddingBottom: number;
  pageHeight: number;
  pageWidth: number;
  onToggleControls: () => void;
}) {
  const language = useAppLanguage();
  const copy = DEDICATION_BY_LANGUAGE[language] ?? DEDICATION_BY_LANGUAGE.dari;
  const isLatin = isLatinLanguage(language);
  /** Dari, Pashto and Arabic body in Nastaliq; Turkish and English use the platform UI face. */
  const localFont = isLatin ? undefined : NASTALIQ_FONT;
  const localSize = isLatin ? 14 : 15;
  const localLine = Math.round(localSize * (isLatin ? 1.45 : NASTALIQ_LINE_RATIO));
  const arabicSize = 16;
  const arabicLine = Math.round(arabicSize * ARABIC_LINE_RATIO);
  const bismillahSize = 18;
  const bismillahLine = Math.round(bismillahSize * ARABIC_LINE_RATIO);
  const align = isLatin ? ('left' as const) : ('center' as const);
  const writingDirection = isLatin ? ('ltr' as const) : ('rtl' as const);

  const [frameSize, setFrameSize] = useState(() => ({
    width: Math.floor(pageWidth),
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
    <Pressable
      testID="hifz16-dedication"
      onPress={onToggleControls}
      style={[
        styles.page,
        {
          width: pageWidth,
          height: pageHeight > 0 ? pageHeight : undefined,
          backgroundColor: background,
          paddingTop: contentPaddingTop,
          paddingBottom: contentPaddingBottom,
        },
      ]}
    >
      <View style={styles.ltr}>
        <View style={[styles.openingFrame, { backgroundColor: background }]} onLayout={onFrameLayout}>
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
                    color: accent,
                    paddingBottom: 4,
                  },
                  androidFontPad,
                ]}
              >
                {DEDICATION_BISMILLAH}
              </Text>
              <View style={[styles.dedicationRule, { backgroundColor: accent }]} />
              <Text
                style={[
                  styles.dedicationArabic,
                  {
                    fontFamily: HIFZ_FONT,
                    fontSize: arabicSize,
                    lineHeight: arabicLine,
                    color: ink,
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
                      color: textColor,
                      textAlign: align,
                      writingDirection,
                      paddingBottom: isLatin ? 2 : 6,
                    },
                    androidFontPad,
                  ]}
                >
                  {para}
                </Text>
              ))}
              <View style={[styles.dedicationRule, { backgroundColor: accent }]} />
              <Text
                style={[
                  styles.dedicationFromLabel,
                  {
                    fontFamily: localFont,
                    color: accent,
                    writingDirection,
                    paddingBottom: isLatin ? 0 : 4,
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
                    color: accent,
                    fontSize: isLatin ? 15 : 16,
                    lineHeight: Math.round(
                      (isLatin ? 15 : 16) * (isLatin ? 1.35 : NASTALIQ_LINE_RATIO),
                    ),
                    writingDirection,
                    paddingBottom: isLatin ? 2 : 6,
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
                    color: accent,
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
    </Pressable>
  );
});

/** Printed dua of completing the Quran, with the same harakat as the 16-line mushaf. */
const KHATM_TITLE = 'دُعَآءُ خَتْمِ الْقُرْاٰنِ';
const KHATM_BODY =
  'صَدَقَ اللّٰهُ الْعَلِیُّ الْعَظِیْمُ ○ وَصَدَقَ رَسُوْلُهُ النَّبِیُّ الْكَرِیْمُ ○ وَنَحْنُ عَلَیْ ذٰلِكَ مِنَ الشّٰهِدِیْنَ ○ رَبَّنَا تَقَبَّلْ مِنَّا اِنَّكَ اَنْتَ السَّمِیْعُ الْعَلِیْمُ ○ اَللّٰهُمَّ ارْزُقْنَا بِكُلِّ حَرْفٍ مِّنَ الْقُرْاٰنِ حَلَاوَةً وَبِكُلِّ جُزْءٍ مِّنَ الْقُرْاٰنِ جَزَآءً اَللّٰهُمَّ ارْزُقْنَا بِالْاَلِفِ اُلْفَةً وَبِالْبَآءِ بَرَكَةً وَبِالتَّآءِ تَوْبَةً وَبِالثَّآءِ ثَوَابًا وَبِالْجِیْمِ جَمَالًا وَبِالْحَآءِ حِكْمَةً وَبِالْخَآءِ خَیْرًا وَبِالدَّالِ دَلِیْلًا وَبِالذَّالِ ذَكَآءً وَبِالرَّآءِ رَحْمَةً وَبِالزَّایِ زَكٰوةً وَبِالسِّیْنِ سَعَادَةً وَبِالشِّیْنِ شِفَآءً وَبِالصَّادِ صِدْقًا وَبِالضَّادِ ضِیَآءً وَبِالطَّآءِ طَرَاوَةً وَبِالظَّآءِ ظَفَرًا وَبِالْعَیْنِ عِلْمًا وَبِالْغَیْنِ غِنًی وَبِالْفَآءِ فَلَاحًا وَبِالْقَافِ قُرْبَةً وَبِالْكَافِ كَرَامَةً وَبِاللَّامِ لُطْفًا وَبِالْمِیْمِ مَوْعِظَةً وَبِالنُّوْنِ نُوْرًا وَبِالْوَاوِ وُصْلَةً وَبِالْهَآءِ هِدَایَةً وَبِالْیَآءِ یَقِیْنًا ○ اَللّٰهُمَّ انْفَعْنَا بِالْقُرْاٰنِ الْعَظِیْمِ ○ وَارْفَعْنَا بِالْاٰیَاتِ وَالذِّكْرِ الْحَكِیْمِ ○ وَتَقَبَّلْ مِنَّا قِرَآءَتَنَا وَتَجَاوَزْ عَنَّا مَا كَانَ فِیْ تِلَاوَةِ الْقُرْاٰنِ مِنْ خَطَاٍ اَوْ نِسْیَانٍ اَوْ تَحْرِیْفِ كَلِمَةٍ عَنْ مَّوَاضِعِهَا اَوْ تَقْدِیْمٍ اَوْ تَاْخِیْرٍ اَوْ زِیَادَةٍ اَوْ نُقْصَانٍ اَوْ تَاْوِیْلٍ عَلَیْ غَیْرِ مَا اَنْزَلْتَهُ عَلَیْهِ اَوْ شَكٍّ اَوْ سَهْوٍ اَوْ سُوْٓءِ اِلْحَانٍ اَوْ تَعْجِیْلٍ عِنْدَ تِلَاوَةِ الْقُرْاٰنِ اَوْ كَسَلٍ اَوْ سُرْعَةٍ اَوْ وَقْفٍ بِغَیْرِ وُقُوْفٍ اَوْ اِدْغَامٍ بِغَیْرِ مُدْغَمٍ اَوْ اِظْهَارٍ بِغَیْرِ بَیَانٍ اَوْ مَدٍّ اَوْ تَقْدِیْمٍ اَوْ هَمْزَةٍ اَوْ جَزْمٍ اَوْ اِعْرَابٍ بِغَیْرِ مَا كَتَبَهُ اَوْ قِلَّةِ رَغْبَةٍ وَّرَهْبَةٍ عِنْدَ اٰیَةِ الرَّحْمَةِ وَاٰیَةِ الْعَذَابِ فَاغْفِرْ لَنَا رَبَّنَا وَاكْتُبْنَا مَعَ الشّٰهِدِیْنَ ○ اَللّٰهُمَّ نَوِّرْ قُلُوْبَنَا بِالْقُرْاٰنِ وَزَیِّنْ اَخْلَاقَنَا بِالْقُرْاٰنِ وَنَجِّنَا مِنَ النَّارِ بِالْقُرْاٰنِ وَاَدْخِلْنَا فِی الْجَنَّةِ بِالْقُرْاٰنِ اَللّٰهُمَّ اجْعَلِ الْقُرْاٰنَ لَنَا فِی الدُّنْیَا قَرِیْنًا وَفِی الْقَبْرِ مُؤْنِسًا وَعَلَی الصِّرَاطِ نُوْرًا وَفِی الْجَنَّةِ رَفِیْقًا وَمِنَ النَّارِ سِتْرًا وَّحِجَابًا وَاِلَی الْخَیْرَاتِ كُلِّهَا دَلِیْلًا فَاكْتُبْنَا عَلَی الرَّشَادِ وَارْزُقْنَا اَدَآءَهُ بِالْقَلْبِ وَاللِّسَانِ وَحُبَّ الْخَیْرِ وَالسَّعَادَةِ وَالْبِشَارَةِ مِنَ الْاِیْمَانِ ○ وَصَلّٰی اللّٰهُ تَعَالٰی عَلٰی خَیْرِ خَلْقِهٖ مُحَمَّدٍ وَّاٰلِهٖ وَاَصْحٰبِهٖ وَاَتْبَاعِهٖ اَجْمَعِیْنَ ○ اٰمِیْنَ ○';
const KHATM_CLOSING = 'وَسَلِّمْ تَسْلِیْمًا كَثِیْرًا كَثِیْرًا اَبَدًا ○';

/** Gold rectangle used on ordinary mushaf pages (pages 3–548). */
function MushafGoldFrame({ width, height }: { width: number; height: number }) {
  if (width <= 0 || height <= 0) return null;
  const inset = 1;
  return (
    <Svg width={width} height={height} style={StyleSheet.absoluteFill} pointerEvents="none">
      <Rect
        x={inset}
        y={inset}
        width={Math.max(0, width - inset * 2)}
        height={Math.max(0, height - inset * 2)}
        stroke={ILLUM.gold}
        strokeWidth={1.5}
        fill="none"
      />
    </Svg>
  );
}

function KhatmMedallion({ color, paper }: { color: string; paper: string }) {
  return (
    <Svg width={148} height={18}>
      <Path d="M6 9 H142" stroke={color} strokeWidth={2.2} strokeLinecap="round" />
      <Circle cx={74} cy={9} r={6.4} fill={color} />
      <Circle cx={74} cy={9} r={2.5} fill={paper} />
      <Circle cx={74} cy={9} r={1.15} fill={color} />
    </Svg>
  );
}

/** Unnumbered leaf after mushaf page 548. Wording matches the printed khatm page. */
const HifzKhatmPage = memo(function HifzKhatmPage({
  background,
  ink,
  contentPaddingTop,
  contentPaddingBottom,
  pageHeight,
  pageWidth,
  onToggleControls,
}: {
  background: string;
  ink: string;
  contentPaddingTop: number;
  contentPaddingBottom: number;
  pageHeight: number;
  pageWidth: number;
  onToggleControls: () => void;
}) {
  const [frameSize, setFrameSize] = useState({ width: Math.floor(pageWidth), height: 0 });
  const [slotHeight, setSlotHeight] = useState(0);
  const [fit, setFit] = useState(1);

  const onFrameLayout = useCallback((event: LayoutChangeEvent) => {
    const width = Math.floor(event.nativeEvent.layout.width);
    const height = Math.floor(event.nativeEvent.layout.height);
    setFrameSize((prev) => {
      if (Math.abs(prev.width - width) <= 1 && prev.height === height) return prev;
      return { width, height };
    });
  }, []);

  const onSlotLayout = useCallback((event: LayoutChangeEvent) => {
    const height = Math.floor(event.nativeEvent.layout.height);
    setSlotHeight((prev) => (Math.abs(prev - height) <= 2 ? prev : height));
  }, []);

  useEffect(() => {
    setFit(1);
  }, [pageWidth, pageHeight]);

  const baseFont = pageHeight > 0 ? Math.min(15, Math.max(12, pageHeight / 48)) : 13;
  const fontSize = Math.max(7, baseFont * fit);
  const lineHeight = Math.round(fontSize * 2.2);
  const titleLine = Math.round(20 * BASMALLAH_LINE_HEIGHT_RATIO);
  const khatmInkPad = Platform.OS === 'android' ? { includeFontPadding: false as const } : null;

  const onBodyTextLayout = useCallback((event: { nativeEvent: { lines: Array<{ y: number; height: number }> } }) => {
    const lines = event.nativeEvent.lines;
    if (lines.length === 0 || slotHeight <= 0) return;
    const last = lines[lines.length - 1];
    const used = last.y + last.height + 8;
    if (used <= slotHeight) return;
    setFit((prev) => {
      const next = prev * (slotHeight / used);
      const floor = 7 / baseFont;
      if (next <= floor) return prev <= floor ? prev : floor;
      return next < prev ? next : prev;
    });
  }, [baseFont, slotHeight]);

  return (
    <Pressable
      testID="hifz16-khatm"
      onPress={onToggleControls}
      style={[
        styles.page,
        {
          width: pageWidth,
          height: pageHeight > 0 ? pageHeight : undefined,
          backgroundColor: background,
          paddingTop: contentPaddingTop,
          paddingBottom: contentPaddingBottom,
        },
      ]}
    >
      <View style={[styles.ltr, styles.khatmFrame]} onLayout={onFrameLayout}>
        <MushafGoldFrame width={frameSize.width} height={frameSize.height} />
        <View style={styles.khatmInner}>
          <Text
            style={[
              styles.khatmTitle,
              {
                fontFamily: HIFZ_FONT,
                fontSize: 20,
                lineHeight: titleLine,
                color: ink,
              },
              khatmInkPad,
            ]}
          >
            {KHATM_TITLE}
          </Text>
          <View style={styles.khatmBodySlot} onLayout={onSlotLayout}>
            <Text
              onTextLayout={onBodyTextLayout}
              style={[
                styles.khatmBody,
                {
                  fontFamily: HIFZ_FONT,
                  fontSize,
                  lineHeight,
                  color: ink,
                },
                khatmInkPad,
              ]}
            >
              {KHATM_BODY}
            </Text>
          </View>
          <Text
            style={[
              styles.khatmClosing,
              {
                fontFamily: HIFZ_FONT,
                fontSize,
                lineHeight,
                color: ink,
              },
              khatmInkPad,
            ]}
          >
            {KHATM_CLOSING}
          </Text>
          <View style={styles.khatmMedallion}>
            <KhatmMedallion color={ink} paper={background} />
          </View>
        </View>
      </View>
    </Pressable>
  );
});

const CREDITS_NAMES_AR = [
  'سید عبدالاله شیرزادی',
  'سید صفی‌الله شیرزادی',
  'سید عبدالباقی شیرزادی',
  'سید عبدالله شیرزادی',
] as const;

type CreditsCopy = {
  title: string;
  intro: string;
  names: readonly string[];
  closing: string;
};

const CREDITS_BY_LANGUAGE: Record<AppLanguage, CreditsCopy> = {
  dari: {
    title: 'التماس دعا',
    intro: 'الحمد لله الذي بنعمته تتم الصالحات.\n\nاین قرآن شریف را این برادران گرامی تهیه و طراحی کرده‌اند و هزینهٔ آن را نیز پرداخته‌اند.',
    names: CREDITS_NAMES_AR,
    closing: 'از کسانی که این قرآن را می‌خوانند التماس دعا است که این برادران را در دعای خیر فراموش نکنند و ثواب تلاوت خود را به ایشان هدیه کنند. خداوند این خدمت را بپذیرد و ثواب آن را به آنان برساند. آمین.',
  },
  pashto: {
    title: 'د خیر دعا غوښتنه',
    intro: 'حمد هغه الله لره دی چې نیک کارونه په نعمت یې پای ته رسېږي.\n\nدا مبارک قرآن دغو ګرانو وروڼو برابر او طرحه کړی او لګښت یې هم ورکړی دی.',
    names: CREDITS_NAMES_AR,
    closing: 'له لوستونکو التماس دی چې دا وروڼه په خیر دعا کې هېر نه کړي او د دې تلاوت ثواب دې ورته ډالۍ کړي. الله دې دا خدمت قبول کړي او ثواب دې ورته ورسوي. آمین.',
  },
  arabic: {
    title: 'التماس الدعاء',
    intro: 'الحمد لله الذي بنعمته تتم الصالحات.\n\nأُعِدَّ هذا المصحف الشريف ورُتِّب بسعي هؤلاء الإخوة الكرام واهتمامهم، وبتمويلهم وتحت إشرافهم.',
    names: [
      'السيد عبدالإله شيرزادي',
      'السيد صفي الله شيرزادي',
      'السيد عبدالباقي شيرزادي',
      'السيد عبدالله شيرزادي',
    ],
    closing: 'يُلتَمس من تالي هذا الكلام المبارك ألا ينسوهم من صالح دعائهم. تقبّل الله هذه الخدمة منهم، وغفر لهم، وجعلها لهم ذخراً في الآخرة. آمين.',
  },
  english: {
    title: 'A request for prayers',
    intro: 'Praise belongs to Allah, by whose favor good works are brought to completion.\n\nThis noble mushaf was prepared and arranged through the care, the funding, and the oversight of these brothers.',
    names: [
      'Sayed Abdul Ellah Shirzadi',
      'Said Safiullah Shirzadi',
      'Sayed Abdul Baqi Shirzadi',
      'Said Abdullah Shirzadi',
    ],
    closing: 'Those who recite this blessed Word are asked not to forget them in their prayers. May Allah accept this service from them, forgive them, and lay it up for them in the Hereafter. Amen.',
  },
  turkish: {
    title: 'HAYIR DUASI',
    intro: 'Hamd, güzel ve hayırlı işleri nimetleriyle tamamlayan Allah’a mahsustur.\n\nBu mübarek Mushaf, aşağıda isimleri zikredilen kardeşlerimizin emekleri, maddi katkıları ve himmetleriyle hazırlanmıştır:',
    names: [
      'Seyit Abdul Ellah Şirzadi',
      'Seyit Safiyullah Şirzadi',
      'Seyit Abdul Baki Şirzadi',
      'Seyit Abdullah Şirzadi',
    ],
    closing: 'Bu mübarek Kelâm-ı İlâhî’yi okuyanlardan, adı geçen kardeşlerimizi hayır dualarında unutmamalarını niyaz ederiz.\n\nYüce Allah’tan bu hayırlı hizmeti kabul buyurmasını, kendilerini affetmesini, kendilerine rahmet etmesini ve bu hizmeti ahiretleri için kalıcı bir azık ve vesile-i necat eylemesini dileriz.\n\nÂmin.',
  },
};

/** Unnumbered leaf after the khatm dua. Asks only for prayers for the preparation team. */
const HifzCreditsPage = memo(function HifzCreditsPage({
  background,
  ink,
  contentPaddingTop,
  contentPaddingBottom,
  pageHeight,
  pageWidth,
  onToggleControls,
}: {
  background: string;
  ink: string;
  contentPaddingTop: number;
  contentPaddingBottom: number;
  pageHeight: number;
  pageWidth: number;
  onToggleControls: () => void;
}) {
  const language = useAppLanguage();
  const fontPrefs = useLocalizedFontPreferences();
  const copy = CREDITS_BY_LANGUAGE[language] ?? CREDITS_BY_LANGUAGE.dari;
  const latin = isLatinLanguage(language);
  const dariFace = getDariFontFamily(fontPrefs?.dariFont ?? 'vazirmatn');
  const bodyFont = latin
    ? undefined
    : language === 'pashto'
      ? getPashtoFontFamily(fontPrefs?.pashtoFont)
      : language === 'arabic'
        ? getArabicFontFamily()
        : dariFace;
  const titleFont = latin
    ? undefined
    : language === 'pashto'
      ? getPashtoBoldFontFamily(fontPrefs?.pashtoFont)
      : language === 'arabic'
        ? getArabicBoldFontFamily()
        : `${dariFace}-Bold`;
  const direction = latin ? ('ltr' as const) : ('rtl' as const);
  const readableLine = 1.8;
  const bodySize = latin ? 16 : language === 'arabic' ? 18 : 16;
  const bodyLine = Math.round(bodySize * (latin ? 1.45 : readableLine));
  const titleSize = latin ? 22 : 26;
  const titleLine = Math.round(titleSize * (latin ? 1.35 : readableLine));
  const [frameSize, setFrameSize] = useState({ width: Math.floor(pageWidth), height: 0 });

  const onFrameLayout = useCallback((event: LayoutChangeEvent) => {
    const width = Math.floor(event.nativeEvent.layout.width);
    const height = Math.floor(event.nativeEvent.layout.height);
    setFrameSize((prev) => {
      if (Math.abs(prev.width - width) <= 1 && prev.height === height) return prev;
      return { width, height };
    });
  }, []);

  const textStyle = {
    fontFamily: bodyFont,
    color: ink,
    textAlign: 'center' as const,
    writingDirection: direction,
  };

  return (
    <Pressable
      testID="hifz16-credits"
      onPress={onToggleControls}
      style={[
        styles.page,
        {
          width: pageWidth,
          height: pageHeight > 0 ? pageHeight : undefined,
          backgroundColor: background,
          paddingTop: contentPaddingTop,
          paddingBottom: contentPaddingBottom,
        },
      ]}
    >
      <View style={[styles.ltr, styles.khatmFrame]} onLayout={onFrameLayout}>
        <MushafGoldFrame width={frameSize.width} height={frameSize.height} />
        <View style={styles.creditsInner}>
          <View style={styles.creditsHeading}>
            <Text
              style={[
                styles.creditsTitle,
                textStyle,
                { fontFamily: titleFont, fontSize: titleSize, lineHeight: titleLine },
                androidFontPad,
              ]}
            >
              {copy.title}
            </Text>
            <View style={styles.creditsRule} />
          </View>
          <Text
            style={[
              styles.creditsIntro,
              textStyle,
              { fontSize: bodySize, lineHeight: bodyLine },
              androidFontPad,
            ]}
          >
            {copy.intro}
          </Text>
          <View style={styles.creditsNames}>
            {copy.names.map((name) => (
              <Text
                key={name}
                style={[
                  styles.creditsName,
                  textStyle,
                  { fontSize: bodySize, lineHeight: bodyLine },
                  androidFontPad,
                ]}
              >
                {name}
              </Text>
            ))}
          </View>
          <Text
            style={[
              styles.creditsClosing,
              textStyle,
              { fontSize: bodySize, lineHeight: bodyLine },
              androidFontPad,
            ]}
          >
            {copy.closing}
          </Text>
        </View>
      </View>
    </Pressable>
  );
});

export const Hifz16View = memo(function Hifz16View({
  surahNumber,
  initialAyah = 1,
  initialPage = null,
  contentPaddingTop,
  contentPaddingBottom,
  activePlayingSurah,
  activePlayingAyah,
  onPlayAyah,
  onVisiblePositionChange,
}: Props) {
  // Read the viewport reactively. At cold launch Android can report a zero
  // Dimensions.get('window').width while the activity is still measuring; a
  // module-level width then makes every horizontal page zero-width forever.
  const viewport = useWindowDimensions();
  const { tokens: readerTokens } = useQuranReaderSettings();
  const { position, updatePosition } = useReadingPosition();
  const { addBookmark, getBookmark, isBookmarked, removeBookmark } = useBookmarks();
  const { t, n, language } = useI18n();
  const latinCard = isLatinLanguage(language);
  // Mushaf pages advance toward the left, so Dari keeps › on the previous
  // side. Turkish and English read left to right, so ‹ sits on the previous
  // side and › on the next side.
  const previousPageIcon = latinCard ? 'chevron-left' : 'chevron-right';
  const nextPageIcon = latinCard ? 'chevron-right' : 'chevron-left';
  const startPage = useMemo(() => {
    if (initialPage != null && initialPage >= 1 && initialPage <= HIFZ16_PAGE_COUNT) {
      return initialPage;
    }
    return listHifzPagesForAyah(surahNumber, initialAyah)[0] ?? getHifzSurahStartPage(surahNumber);
  }, [initialAyah, initialPage, surahNumber]);

  const visiblePageRef = useRef(startPage);
  const [visiblePage, setVisiblePage] = useState(startPage);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [navigatorOpen, setNavigatorOpen] = useState(false);
  const [navigatorPage, setNavigatorPage] = useState('');
  const [navigatorJuz, setNavigatorJuz] = useState('');
  const [navigatorSurah, setNavigatorSurah] = useState('');
  const [navigatorTab, setNavigatorTab] = useState<'page' | 'juz' | 'surah'>('page');
  const [navigatorError, setNavigatorError] = useState<string | null>(null);
  const userInterruptedFollowRef = useRef(false);
  const swipeAnchorPageRef = useRef(0);
  const playingRef = useRef({ surah: activePlayingSurah, ayah: activePlayingAyah });
  playingRef.current = { surah: activePlayingSurah, ayah: activePlayingAyah };
  const [measuredPageWidth, setMeasuredPageWidth] = useState(0);
  const layoutWidth = measuredPageWidth > 0 ? measuredPageWidth : 0;
  const layoutWidthRef = useRef(layoutWidth);
  layoutWidthRef.current = layoutWidth;
  const drag = useSharedValue(0);
  const settled = useSharedValue(startPage);
  const turnToken = useSharedValue(0);
  const reportPageRef = useRef<(page: number) => void>(() => {});
  // The centered page has no transform while it is still, so a tap reaches the
  // canvas. Neighbors stay translated one page aside; that is what gets drawn.
  const [gliding, setGliding] = useState(false);
  const glidingRef = useRef(false);
  const queuedAnimRef = useRef<(() => void) | null>(null);
  const [glideEpoch, setGlideEpoch] = useState(0);
  // Bumps when a new gesture starts, so a settle from the previous turn cannot
  // drop the transform out from under the finger.
  const settleTokenRef = useRef(0);
  const pendingRestRef = useRef(false);

  const endGlide = useCallback(() => {
    glidingRef.current = false;
    setGliding(false);
  }, []);

  const beginGlide = useCallback((start: () => void) => {
    if (glidingRef.current) {
      start();
      return;
    }
    queuedAnimRef.current = start;
    glidingRef.current = true;
    setGliding(true);
    setGlideEpoch((epoch) => epoch + 1);
  }, []);

  useLayoutEffect(() => {
    const run = queuedAnimRef.current;
    if (!run) return;
    queuedAnimRef.current = null;
    run();
  }, [glideEpoch]);

  // The UI thread already moved settled and zeroed drag. This render keeps the
  // transform on; the next frame drops it, once translation is already 0.
  const commitPage = useCallback((page: number) => {
    pendingRestRef.current = true;
    visiblePageRef.current = page;
    setVisiblePage(page);
    reportPageRef.current(page);
  }, []);

  useLayoutEffect(() => {
    if (!pendingRestRef.current) return;
    pendingRestRef.current = false;
    const token = settleTokenRef.current;
    requestAnimationFrame(() => {
      if (settleTokenRef.current !== token) return;
      endGlide();
    });
  }, [endGlide, visiblePage]);

  const snapToPage = useCallback((page: number) => {
    cancelAnimation(drag);
    queuedAnimRef.current = null;
    settleTokenRef.current += 1;
    turnToken.value += 1;
    pendingRestRef.current = false;
    settled.value = page;
    drag.value = 0;
    visiblePageRef.current = page;
    glidingRef.current = false;
    setGliding(false);
    setVisiblePage(page);
    reportPageRef.current(page);
  }, [drag, settled, turnToken]);

  const glideToNeighbor = useCallback((target: number, toValue: number, duration: number) => {
    const token = (turnToken.value += 1);
    beginGlide(() => {
      drag.value = withTiming(toValue, { duration }, (finished) => {
        if (!finished || turnToken.value !== token) return;
        // Same UI frame: the on-screen page's translation stays 0.
        settled.value = target;
        drag.value = 0;
        runOnJS(commitPage)(target);
      });
    });
  }, [beginGlide, commitPage, drag, settled, turnToken]);

  const springDragHome = useCallback(() => {
    const token = (turnToken.value += 1);
    beginGlide(() => {
      drag.value = withSpring(0, HIFZ_PAGE_SPRING, (finished) => {
        if (!finished || turnToken.value !== token) return;
        runOnJS(endGlide)();
      });
    });
  }, [beginGlide, drag, endGlide, turnToken]);

  const scrollToPage = useCallback(
    (page: number, animated: boolean) => {
      const first = HAS_HIFZ_DEDICATION ? HIFZ_DEDICATION_PAGE : 1;
      const target = Math.min(HIFZ_CREDITS_PAGE, Math.max(first, page));
      const current = visiblePageRef.current;
      const width = layoutWidthRef.current;
      cancelAnimation(drag);
      queuedAnimRef.current = null;
      if (target === current) {
        if (!glidingRef.current) return;
        springDragHome();
        return;
      }
      if (!animated || Math.abs(target - current) !== 1 || width <= 0) {
        snapToPage(target);
        return;
      }
      // The next page sits on the physical left. Positive translateX reveals
      // it, matching a rightward finger. translateX is not mirrored.
      glideToNeighbor(target, target > current ? width : -width, 220);
    },
    [drag, glideToNeighbor, snapToPage, springDragHome],
  );
  // Physical right (positive dx) opens the next mushaf page.
  const swipeResponder = useMemo(
    () => PanResponder.create({
      onMoveShouldSetPanResponderCapture: (_event, gesture) =>
        !navigatorOpen &&
        Math.abs(gesture.dx) > 10 &&
        Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.25,
      onPanResponderGrant: () => {
        cancelAnimation(drag);
        queuedAnimRef.current = null;
        settleTokenRef.current += 1;
        turnToken.value += 1;
        pendingRestRef.current = false;
        swipeAnchorPageRef.current = visiblePageRef.current;
        glidingRef.current = true;
        setGliding(true);
        if (playingRef.current.surah != null && playingRef.current.ayah != null) {
          userInterruptedFollowRef.current = true;
        }
      },
      onPanResponderMove: (_event, gesture) => {
        const width = layoutWidthRef.current;
        if (width <= 0) return;
        const current = swipeAnchorPageRef.current;
        let dx = gesture.dx;
        if (dx > 0 && neighborHifzPage(current, 1) == null) dx *= 0.2;
        if (dx < 0 && neighborHifzPage(current, -1) == null) dx *= 0.2;
        drag.value = Math.max(-width, Math.min(width, dx));
      },
      onPanResponderRelease: (_event, gesture) => {
        const width = layoutWidthRef.current;
        const threshold = Math.max(42, width * 0.12);
        const current = swipeAnchorPageRef.current;
        if (width <= 0 || Math.abs(gesture.dx) < threshold) {
          springDragHome();
          return;
        }
        const target = gesture.dx > 0 ? neighborHifzPage(current, 1) : neighborHifzPage(current, -1);
        if (target == null) {
          springDragHome();
          return;
        }
        glideToNeighbor(target, gesture.dx > 0 ? width : -width, 180);
      },
      onPanResponderTerminate: () => {
        springDragHome();
      },
      onPanResponderTerminationRequest: () => true,
    }),
    [drag, glideToNeighbor, navigatorOpen, springDragHome, turnToken],
  );
  useEffect(() => {
    cancelAnimation(drag);
    queuedAnimRef.current = null;
    settleTokenRef.current += 1;
    turnToken.value += 1;
    pendingRestRef.current = false;
    drag.value = 0;
    settled.value = startPage;
    glidingRef.current = false;
    setGliding(false);
    visiblePageRef.current = startPage;
    setVisiblePage(startPage);
    userInterruptedFollowRef.current = false;
  }, [drag, settled, startPage, surahNumber, turnToken]);

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
      if (isHifzExtraLeaf(visible)) return;
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
      if (isHifzExtraLeaf(visiblePageRef.current)) return;
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
  // The ayah this reader was opened on; a shared start page resolves to it
  // instead of the previous surah's first line.
  const openTargetRef = useRef({ page: startPage, surah: surahNumber, ayah: Math.max(1, initialAyah) });
  openTargetRef.current = { page: startPage, surah: surahNumber, ayah: Math.max(1, initialAyah) };
  const leftStartPageRef = useRef(false);

  const reportVisiblePosition = useCallback((
    pageNumber: number,
    preferred?: { surah: number; ayah: number },
  ) => {
    if (isHifzExtraLeaf(pageNumber)) {
      // Extra leaves are not mushaf pages and must not replace the saved reading position.
      onVisiblePositionChangeRef.current?.(0, 0, pageNumber);
      return;
    }
    const playing = playingRef.current;
    const saved = positionRef.current;
    const open = openTargetRef.current;
    if (pageNumber !== open.page || playing.surah != null) leftStartPageRef.current = true;
    let target = preferred;
    if (!target) {
      const savedOnPage =
        saved.surahNumber > 0 &&
        saved.ayahNumber > 0 &&
        hifzPageContainsAyah(pageNumber, saved.surahNumber, saved.ayahNumber);
      const openOnPage = pageNumber === open.page;
      target =
        openOnPage && !leftStartPageRef.current
          ? { surah: open.surah, ayah: open.ayah }
          : savedOnPage
            ? { surah: saved.surahNumber, ayah: saved.ayahNumber }
            : openOnPage
              ? { surah: open.surah, ayah: open.ayah }
              : undefined;
    }
    const resolved = resolveHifzPageTarget(pageNumber, {
      playingSurah: playing.surah,
      playingAyah: playing.ayah,
      savedSurah: target?.surah ?? null,
      savedAyah: target?.ayah ?? null,
    });
    if (!resolved) return;

    updatePositionRef.current({
      surahNumber: resolved.surah,
      ayahNumber: resolved.ayah,
      page: resolved.page,
    });
    onVisiblePositionChangeRef.current?.(resolved.surah, resolved.ayah, resolved.page);
  }, []);

  // A surah or juz opened on a shared page starts from the requested ayah.
  useEffect(() => {
    reportVisiblePosition(startPage, { surah: surahNumber, ayah: Math.max(1, initialAyah) });
  }, [initialAyah, reportVisiblePosition, startPage, surahNumber]);

  // Re-resolve dock target when playback moves onto the visible page.
  useEffect(() => {
    reportVisiblePosition(visiblePageRef.current);
  }, [activePlayingAyah, activePlayingSurah, reportVisiblePosition]);

  reportPageRef.current = reportVisiblePosition;

  const isAyahBookmarked = useCallback(
    (surah: number, ayah: number) => isBookmarked(surah, ayah),
    [isBookmarked]
  );

  const visibleTarget = useMemo(
    () => resolveHifzPageTarget(visiblePage, {
      playingSurah: activePlayingSurah,
      playingAyah: activePlayingAyah,
      savedSurah: position.surahNumber,
      savedAyah: position.ayahNumber,
    }),
    [activePlayingAyah, activePlayingSurah, position.ayahNumber, position.surahNumber, visiblePage],
  );
  const visiblePageData = getHifzPage(visiblePage);
  const targetBookmarked = visibleTarget
    ? isBookmarked(visibleTarget.surah, visibleTarget.ayah)
    : false;

  const handleVisibleBookmark = useCallback(() => {
    if (!visibleTarget) return;
    if (targetBookmarked) {
      const existing = getBookmark(visibleTarget.surah, visibleTarget.ayah);
      if (existing) removeBookmark(existing.id);
      return;
    }
    addBookmark({
      surahNumber: visibleTarget.surah,
      ayahNumber: visibleTarget.ayah,
      page: visibleTarget.page,
    });
  }, [addBookmark, getBookmark, removeBookmark, targetBookmarked, visibleTarget]);

  const openNavigator = useCallback(() => {
    const mushafPage = visiblePage >= 1 && visiblePage <= HIFZ16_PAGE_COUNT
      ? visiblePage
      : visiblePage > HIFZ16_PAGE_COUNT
        ? HIFZ16_PAGE_COUNT
        : 1;
    setNavigatorPage(String(mushafPage));
    setNavigatorJuz(String(visiblePageData?.juz ?? ''));
    setNavigatorSurah('');
    setNavigatorTab('page');
    setNavigatorError(null);
    setNavigatorOpen(true);
  }, [visiblePage, visiblePageData?.juz]);

  const navigatorSurahMatches = useMemo(() => {
    const query = toLatinNumeralsString(navigatorSurah.trim());
    if (!query) return SURAH_NAMES.slice(0, 6);
    if (/^\d+$/.test(query)) {
      return SURAH_NAMES.filter((surah) => String(surah.number).startsWith(query)).slice(0, 6);
    }
    const queries = [
      normalizeArabicForSearch(query),
      normalizeDariForSearch(query),
      normalizePashtoForSearch(query),
      normalizeEnglishForSearch(query),
    ].filter(Boolean);
    return SURAH_NAMES.filter((surah) => {
      const fields = [surah.arabic, surah.dari, surah.pashto, surah.english, surah.turkish];
      return fields.some((field) => {
        const variants = [
          normalizeArabicForSearch(field),
          normalizeDariForSearch(field),
          normalizePashtoForSearch(field),
          normalizeEnglishForSearch(field),
        ].filter(Boolean);
        return variants.some((value) => queries.some((needle) => value.includes(needle)));
      });
    }).slice(0, 6);
  }, [navigatorSurah]);

  const navigateFromReader = useCallback((kind: 'page' | 'juz' | 'surah', valueOverride?: string) => {
    const raw = valueOverride ?? (kind === 'page' ? navigatorPage : kind === 'juz' ? navigatorJuz : navigatorSurah);
    const normalizedRaw = toLatinNumeralsString(raw.trim());
    let value = /^\d+$/.test(normalizedRaw) ? Number.parseInt(normalizedRaw, 10) : Number.NaN;
    let surahTarget: number | null = null;
    let juzTarget: { surah: number; ayah: number; page: number } | null = null;
    if (kind === 'surah' && !/^\d+$/.test(normalizedRaw)) {
      const query = normalizedRaw;
      const queries = [
        normalizeArabicForSearch(query),
        normalizeDariForSearch(query),
        normalizePashtoForSearch(query),
        normalizeEnglishForSearch(query),
      ].filter(Boolean);
      const match = SURAH_NAMES.find((surah) =>
        [surah.arabic, surah.dari, surah.pashto, surah.english, surah.turkish].some((field) => {
          const variants = [
            normalizeArabicForSearch(field),
            normalizeDariForSearch(field),
            normalizePashtoForSearch(field),
            normalizeEnglishForSearch(field),
          ].filter(Boolean);
          return variants.some((fieldValue) => queries.some((needle) => fieldValue === needle));
        })
      );
      // An empty field must not fall through to the first suggestion, which
      // would open surah 1. Suggestions are chosen by tapping their row.
      value = match?.number ?? Number.NaN;
    }
    if (kind === 'surah' && value >= 1 && value <= 114) surahTarget = value;
    if (kind === 'juz' && value >= 1 && value <= 30) {
      // Carry the exact opening ayah when a juz begins in the middle of a page.
      const range = getHifzJuzPageRange(value);
      const start = findHifzJuzStartAyah(value);
      if (range && start) {
        juzTarget = { page: range.start, surah: start.surah, ayah: start.ayah };
      }
    }
    const page = kind === 'page'
      ? value
      : kind === 'juz'
        ? getHifzJuzPageRange(value)?.start
        : surahTarget == null ? null : getHifzSurahStartPage(surahTarget);
    const valid = Number.isFinite(value) && page != null && page >= 1 && page <= HIFZ16_PAGE_COUNT &&
      (kind !== 'juz' || value <= 30) && (kind !== 'surah' || value <= 114);
    if (!valid || page == null) {
      setNavigatorError(t('quran.hifz.navigator.invalid'));
      return;
    }
    setNavigatorOpen(false);
    setControlsVisible(true);
    scrollToPage(page, true);
    const target = kind === 'surah' && surahTarget != null
      ? { page, surah: surahTarget, ayah: 1 }
      : kind === 'juz' ? juzTarget : null;
    if (target) {
      openTargetRef.current = { page: target.page, surah: target.surah, ayah: target.ayah };
      leftStartPageRef.current = false;
      reportVisiblePosition(target.page, { surah: target.surah, ayah: target.ayah });
    }
  }, [navigatorJuz, navigatorPage, navigatorSurah, navigatorSurahMatches, reportVisiblePosition, scrollToPage, t]);

  const [listHeight, setListHeight] = useState(() => Math.max(1, Math.floor(Math.max(viewport.width, viewport.height))));
  const onListLayout = useCallback((event: LayoutChangeEvent) => {
    const nextHeight = Math.floor(event.nativeEvent.layout.height);
    const nextWidth = Math.ceil(event.nativeEvent.layout.width);
    if (nextHeight > 0) setListHeight((prev) => (prev === nextHeight ? prev : nextHeight));
    if (nextWidth > 0) setMeasuredPageWidth((prev) => (prev === nextWidth ? prev : nextWidth));
  }, []);

  const pageHeight = listHeight;

  const renderPage = useCallback(
    (pageNumber: number) => {
      if (pageNumber === HIFZ_DEDICATION_PAGE) {
        return (
          <View style={{ flex: 1 }}>
            <HifzDedicationPage
              background={readerTokens.page}
              ink={readerTokens.arabic}
              textColor={readerTokens.text}
              accent={readerTokens.accent}
              contentPaddingTop={contentPaddingTop}
              contentPaddingBottom={contentPaddingBottom}
              pageHeight={pageHeight}
              pageWidth={layoutWidth}
              onToggleControls={() => setControlsVisible((visible) => !visible)}
            />
          </View>
        );
      }
      if (pageNumber === HIFZ_KHATM_PAGE) {
        return (
          <View style={{ flex: 1 }}>
            <HifzKhatmPage
              background={readerTokens.page}
              ink={readerTokens.arabic}
              contentPaddingTop={contentPaddingTop}
              contentPaddingBottom={contentPaddingBottom}
              pageHeight={pageHeight}
              pageWidth={layoutWidth}
              onToggleControls={() => setControlsVisible((visible) => !visible)}
            />
          </View>
        );
      }
      if (pageNumber === HIFZ_CREDITS_PAGE) {
        return (
          <View style={{ flex: 1 }}>
            <HifzCreditsPage
              background={readerTokens.page}
              ink={readerTokens.arabic}
              contentPaddingTop={contentPaddingTop}
              contentPaddingBottom={contentPaddingBottom}
              pageHeight={pageHeight}
              pageWidth={layoutWidth}
              onToggleControls={() => setControlsVisible((visible) => !visible)}
            />
          </View>
        );
      }
      const page = getHifzPage(pageNumber);
      if (!page) {
        return (
          <View style={{ flex: 1, backgroundColor: readerTokens.page }} />
        );
      }
      return (
        <View testID={`hifz16-page-${page.page}`} collapsable={false} style={{ flex: 1, backgroundColor: readerTokens.page }}>
          {Platform.OS === 'android' ? (
            <NativeHifz16Page
              page={page}
              paperColor={readerTokens.page}
              inkColor={readerTokens.arabic}
              accentColor={readerTokens.accent}
              contentTop={contentPaddingTop}
              contentBottom={contentPaddingBottom}
              activePlayingSurah={activePlayingSurah}
              activePlayingAyah={activePlayingAyah}
              onAyahPress={handleAyahPress}
              onPagePress={() => setControlsVisible((visible) => !visible)}
            />
          ) : null}
          {Platform.OS === 'android' && page.page <= 2 ? (
            <HifzOpeningOrnament
              pageWidth={layoutWidth}
              pageHeight={pageHeight}
              contentPaddingTop={contentPaddingTop}
              contentPaddingBottom={contentPaddingBottom}
            />
          ) : null}
          {Platform.OS === 'android' ? null : <HifzPageCard
              page={page}
              background={readerTokens.page}
              ink={readerTokens.arabic}
              contentPaddingTop={contentPaddingTop}
              contentPaddingBottom={contentPaddingBottom}
              pageHeight={pageHeight}
              activePlayingSurah={activePlayingSurah}
              activePlayingAyah={activePlayingAyah}
              onAyahPress={handleAyahPress}
              isAyahBookmarked={isAyahBookmarked}
              onToggleControls={() => setControlsVisible((visible) => !visible)}
          />}
        </View>
      );
    },
    [
      activePlayingAyah,
      activePlayingSurah,
      contentPaddingBottom,
      contentPaddingTop,
      handleAyahPress,
      isAyahBookmarked,
      layoutWidth,
      pageHeight,
      readerTokens.accent,
      readerTokens.arabic,
      readerTokens.page,
      readerTokens.text,
    ]
  );

  // Neighbors first, the visible page last. A later native page was covering
  // the centered one: its canvas drew, then never reached the screen.
  const leafTitle = visiblePage === HIFZ_DEDICATION_PAGE
    ? t('quran.hifz.dedicationTitle')
    : visiblePage === HIFZ_KHATM_PAGE
      ? t('quran.hifz.khatmTitle')
      : visiblePage === HIFZ_CREDITS_PAGE
        ? t('quran.hifz.creditsTitle')
        : null;

  const pageSlots = layoutWidth > 0
    ? [neighborHifzPage(visiblePage, 1), neighborHifzPage(visiblePage, -1), visiblePage]
        .filter((page): page is number => page != null)
    : [];

  return (
    <View {...swipeResponder.panHandlers} style={[styles.readerRoot, { backgroundColor: readerTokens.page }]}>
      <View collapsable={false} style={styles.list} onLayout={onListLayout}>
        {pageSlots.map((page) => {
          const resting = page === visiblePage && !gliding;
          return (
            <HifzPageSlot
              key={page === HIFZ_DEDICATION_PAGE
                ? 'hifz16-dedication-slot'
                : page === HIFZ_KHATM_PAGE
                  ? 'hifz16-khatm-slot'
                  : page === HIFZ_CREDITS_PAGE
                    ? 'hifz16-credits-slot'
                    : `hifz16-slot-${page}`}
              page={page}
              width={layoutWidth}
              settled={settled}
              drag={drag}
              resting={resting}
              interactive={page === visiblePage}
            >
              <View
                pointerEvents={page === visiblePage ? 'auto' : 'none'}
                accessibilityElementsHidden={page !== visiblePage}
                importantForAccessibility={page === visiblePage ? 'auto' : 'no-hide-descendants'}
                style={styles.slotFill}
              >
                {renderPage(page)}
              </View>
            </HifzPageSlot>
          );
        })}
      </View>

      {controlsVisible ? (
        <View testID="hifz16-reader-controls" pointerEvents="box-none" style={styles.readerControls}>
          <View style={[
            styles.readerActionBar,
            latinCard && styles.readerActionBarLatin,
            { backgroundColor: readerTokens.page, borderColor: readerTokens.border, direction: latinCard ? 'ltr' : 'rtl' },
          ]}>
            <Pressable
              testID="hifz16-previous-page"
              accessibilityRole="button"
              accessibilityLabel={t('quran.page.previous')}
              disabled={HAS_HIFZ_DEDICATION
                ? visiblePage === HIFZ_DEDICATION_PAGE
                : visiblePage <= 1}
              onPress={() => scrollToPage(
                visiblePage - 1,
                true,
              )}
              style={[styles.readerAction, (HAS_HIFZ_DEDICATION
                ? visiblePage === HIFZ_DEDICATION_PAGE
                : visiblePage <= 1) && styles.readerActionDisabled]}
            >
              <View style={styles.iconUnmirrored}>
                <MaterialIcons name={previousPageIcon} size={25} color={readerTokens.accent} />
              </View>
            </Pressable>
            <Pressable
              testID="hifz16-navigator-open"
              accessibilityRole="button"
              accessibilityLabel={t('quran.hifz.navigator.open')}
              onPress={openNavigator}
              style={styles.readerAction}
            >
              <MaterialIcons name="menu-book" size={20} color={readerTokens.accent} />
            </Pressable>
            <View style={styles.readerPageMeta}>
              <Text
                testID={visiblePage === HIFZ_DEDICATION_PAGE
                  ? 'hifz16-dedication-title'
                  : visiblePage === HIFZ_KHATM_PAGE
                    ? 'hifz16-khatm-title'
                    : visiblePage === HIFZ_CREDITS_PAGE
                      ? 'hifz16-credits-title'
                      : 'hifz16-page-meta'}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.75}
                style={[
                  leafTitle == null && latinCard ? styles.readerLatinText : styles.readerPageText,
                  styles.readerMetaLine,
                  { color: readerTokens.text },
                ]}
              >
                {leafTitle ?? `\u200E${n(visiblePage)} / ${n(HIFZ16_PAGE_COUNT)}\u200E`}
              </Text>
              {leafTitle == null ? (
                <Text style={[
                  latinCard ? styles.readerLatinCaption : styles.readerJuzText,
                  { color: readerTokens.textSecondary },
                ]}>
                  {t('quran.mushaf.juz', { number: n(visiblePageData?.juz ?? 1) })}
                </Text>
              ) : null}
            </View>
            <Pressable
              testID="hifz16-play"
              accessibilityRole="button"
              accessibilityLabel={t('quran.hifz.dock.play')}
              disabled={!visibleTarget}
              onPress={() => visibleTarget && handleAyahPress(visibleTarget.surah, visibleTarget.ayah)}
              style={styles.readerAction}
            >
              <MaterialIcons name="play-arrow" size={25} color={readerTokens.accent} />
            </Pressable>
            <Pressable
              testID="hifz16-bookmark"
              accessibilityRole="button"
              accessibilityLabel={targetBookmarked ? t('quran.hifz.dock.unbookmark') : t('quran.hifz.dock.bookmark')}
              disabled={!visibleTarget}
              onPress={handleVisibleBookmark}
              style={styles.readerAction}
            >
              <MaterialIcons name={targetBookmarked ? 'bookmark' : 'bookmark-border'} size={22} color={readerTokens.accent} />
            </Pressable>
            <Pressable
              testID="hifz16-next-page"
              accessibilityRole="button"
              accessibilityLabel={t('quran.page.next')}
              disabled={visiblePage >= HIFZ_CREDITS_PAGE}
              onPress={() => scrollToPage(
                visiblePage + 1,
                true,
              )}
              style={[styles.readerAction, visiblePage >= HIFZ_CREDITS_PAGE && styles.readerActionDisabled]}
            >
              <View style={styles.iconUnmirrored}>
                <MaterialIcons name={nextPageIcon} size={25} color={readerTokens.accent} />
              </View>
            </Pressable>
          </View>
        </View>
      ) : null}

      <Modal transparent animationType="fade" visible={navigatorOpen} onRequestClose={() => setNavigatorOpen(false)}>
        <View style={styles.navigatorBackdrop}>
          <Pressable style={styles.navigatorScrim} onPress={() => setNavigatorOpen(false)} />
          <View
            testID="hifz16-navigator-sheet"
            style={[styles.navigatorSheet, { backgroundColor: readerTokens.surface, borderColor: readerTokens.border }]}
          >
            <View style={[styles.navigatorGrabber, { backgroundColor: readerTokens.border }]} />
            <Text style={[styles.navigatorTitle, { color: readerTokens.text }]}>{t('quran.hifz.navigator.title')}</Text>
            <Text style={[styles.navigatorCurrent, { color: readerTokens.textSecondary }]} numberOfLines={2}>
              {leafTitle
                ? leafTitle
                : `${t('quran.hifz.navigator.current')}: ${n(Math.max(1, visiblePage))} · ${t('quran.hifz.navigator.juz')} ${n(visiblePageData?.juz ?? 1)}`}
              {!leafTitle && visibleTarget ? ` · ${getSurah(visibleTarget.surah)?.[language] ?? getSurah(visibleTarget.surah)?.arabic ?? ''} ${n(visibleTarget.ayah)}` : ''}
            </Text>
            <View style={[styles.navigatorTabs, { backgroundColor: readerTokens.page, borderColor: readerTokens.border }]}>
              {(['page', 'juz', 'surah'] as const).map((kind) => {
                const selected = navigatorTab === kind;
                return (
                  <Pressable
                    key={kind}
                    testID={`hifz16-navigator-tab-${kind}`}
                    accessibilityRole="tab"
                    accessibilityState={{ selected }}
                    onPress={() => { setNavigatorTab(kind); setNavigatorError(null); }}
                    style={[styles.navigatorTab, selected && { backgroundColor: readerTokens.accent }]}
                  >
                    <Text style={[styles.navigatorTabText, { color: selected ? '#fff' : readerTokens.textSecondary }]}>
                      {t(`quran.hifz.navigator.${kind}`)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <ScrollView
              style={styles.navigatorBody}
              contentContainerStyle={styles.navigatorBodyContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <TextInput
                value={navigatorTab === 'page' ? navigatorPage : navigatorTab === 'juz' ? navigatorJuz : navigatorSurah}
                testID={`hifz16-navigator-${navigatorTab}`}
                onChangeText={navigatorTab === 'page' ? setNavigatorPage : navigatorTab === 'juz' ? setNavigatorJuz : setNavigatorSurah}
                selectTextOnFocus
                keyboardType={navigatorTab === 'surah' ? 'default' : 'number-pad'}
                returnKeyType={navigatorTab === 'surah' ? 'search' : 'go'}
                onSubmitEditing={() => navigateFromReader(navigatorTab)}
                autoCorrect={false}
                placeholder={navigatorTab === 'surah' ? t('quran.search.surahPlaceholder') : t(`quran.hifz.navigator.${navigatorTab}`)}
                placeholderTextColor={readerTokens.textSecondary}
                style={[styles.navigatorInput, { color: readerTokens.text, borderColor: readerTokens.border, textAlign: navigatorTab === 'surah' ? (isLatinLanguage(language) ? 'left' : 'right') : 'center' }]}
                accessibilityLabel={t(`quran.hifz.navigator.${navigatorTab}`)}
              />
              <Pressable
                testID={`hifz16-navigator-${navigatorTab}-go`}
                onPress={() => navigateFromReader(navigatorTab)}
                style={[styles.navigatorGo, { backgroundColor: readerTokens.accent }]}
              >
                <Text style={styles.navigatorGoText}>{t('quran.hifz.navigator.go')}</Text>
              </Pressable>
              {navigatorTab === 'surah' ? (
                <View style={styles.navigatorSurahResults}>
                  {navigatorSurahMatches.length > 0 ? navigatorSurahMatches.map((surah) => (
                    <Pressable
                      key={surah.number}
                      testID={`hifz16-navigator-surah-result-${surah.number}`}
                      onPress={() => navigateFromReader('surah', String(surah.number))}
                      style={({ pressed }) => [styles.navigatorSurahResult, { borderBottomColor: readerTokens.border, opacity: pressed ? 0.72 : 1 }]}
                    >
                      <Text style={[styles.navigatorSurahNumber, { color: readerTokens.accent }]}>{n(surah.number)}</Text>
                      <Text style={[styles.navigatorSurahName, { color: readerTokens.text }]}>{surah[language] ?? surah.arabic}</Text>
                      <Text style={[styles.navigatorSurahArabic, { color: readerTokens.textSecondary }]}>{surah.arabic}</Text>
                    </Pressable>
                  )) : (
                    <Text style={[styles.navigatorNoResults, { color: readerTokens.textSecondary }]}>{t('quran.hifz.navigator.noResults')}</Text>
                  )}
                </View>
              ) : null}
              {navigatorError ? <Text style={styles.navigatorError}>{navigatorError}</Text> : null}
            </ScrollView>
            <Pressable onPress={() => setNavigatorOpen(false)} style={styles.navigatorClose}>
              <Text style={[styles.navigatorCloseText, { color: readerTokens.accent }]}>{t('quran.reader.done')}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
});

const HifzPageCard = memo(function HifzPageCard({
  page,
  background,
  ink,
  contentPaddingTop,
  contentPaddingBottom,
  pageHeight,
  activePlayingSurah,
  activePlayingAyah,
  onAyahPress,
  isAyahBookmarked,
  onToggleControls,
}: {
  page: HifzPage;
  background: string;
  ink: string;
  contentPaddingTop: number;
  contentPaddingBottom: number;
  pageHeight: number;
  activePlayingSurah?: number | null;
  activePlayingAyah?: number | null;
  onAyahPress: (surah: number, ayah: number) => void;
  isAyahBookmarked: (surah: number, ayah: number) => boolean;
  onToggleControls: () => void;
}) {
  const ribbonLines = useMemo(
    () => bookmarkRibbonLines(page, isAyahBookmarked),
    [isAyahBookmarked, page]
  );
  const opening = isOpeningPage(page.page);
  const contentWidth = predictContentWidth();
  const frameSize = { width: Math.floor(PAGE_WIDTH), height: Math.floor(pageHeight) };
  const { fontSize, lineHeight, longestChars } = useMemo(
    () => getHifzPageLayout(page, contentWidth),
    [contentWidth, page],
  );

  const surahLine = page.lines.find((line) => line.type === 'surah_name');
  const surahInfo = surahLine?.surahNumber ? getSurah(surahLine.surahNumber) : undefined;
  const basmallahLine = page.lines.find((line) => line.type === 'basmallah');
  const openingAyahLines = useMemo(
    () => page.lines.filter((line) => line.type === 'ayah' && line.text),
    [page.lines]
  );
  const regularLines = page.lines;
  const openingFill = isOpeningFillPage(page.page);
  const lastAyahLine = openingFill
    ? regularLines.reduce((last, l) => (l.type === 'ayah' && l.text ? l.line : last), 0)
    : 0;

  return (
    <Pressable
      testID={`hifz16-page-${page.page}`}
      onPress={onToggleControls}
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
          <View style={styles.openingFrame}>
            <FloralOpeningBorder width={frameSize.width} height={frameSize.height} sparse />
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

              <View style={styles.openingTextArea}>
                {basmallahLine ? (
                  <BasmallahText text={basmallahLine.text} fontSize={fontSize} ornate />
                ) : null}

                <View style={styles.openingAyahBlock}>
                  {openingAyahLines.map((line) => {
                    const highlightAyah =
                      line.surahNumber === activePlayingSurah ? activePlayingAyah : null;
                    const surah = line.surahNumber;
                    return (
                      <View key={`${page.page}-${line.line}`} style={styles.openingLineRow}>
                        {ribbonLines.has(line.line) ? <BookmarkRibbon /> : null}
                        <StaticHifzAyahText
                          text={line.text}
                          fontSize={fontSize}
                          lineHeight={lineHeight}
                          color={ink}
                          contentWidth={contentWidth}
                          centered
                          ayahStart={line.ayahStart}
                          ayahEnd={line.ayahEnd}
                          highlightAyah={highlightAyah}
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
          <View style={styles.slimFrame}>
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
              <View style={styles.slimTextColumn}>
                {regularLines.map((line, index) => {
                  const prev = regularLines[index - 1];
                  const next = regularLines[index + 1];
                  // Basmallah already drawn inside the preceding surah floral header.
                  if (line.type === 'basmallah' && prev?.type === 'surah_name') {
                    return null;
                  }

                  const isSpacer = line.type === 'spacer' || !line.text;
                  // Trailing blank slots would leave the lower half of pages 1–2 empty.
                  if (openingFill && isSpacer) {
                    return null;
                  }

                  const playable = line.type === 'ayah';
                  const centered =
                    line.type === 'surah_name' ||
                    line.type === 'basmallah' ||
                    (Boolean(line.centered) && !(openingFill && playable));
                  const highlightAyah =
                    playable && line.surahNumber === activePlayingSurah
                      ? activePlayingAyah
                      : null;
                  const bookmarked = playable && ribbonLines.has(line.line);
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
                        openingFill && playable && styles.openingFillAyahRow,
                        openingFill &&
                          playable &&
                          line.line === lastAyahLine &&
                          styles.openingFillLastRow,
                        openingFill &&
                          line.type === 'surah_name' &&
                          (hasHeaderBasmallah
                            ? styles.openingFillHeaderWithBasmallahRow
                            : styles.openingFillHeaderRow),
                      ]}
                    >
                      {bookmarked ? <BookmarkRibbon /> : null}
                      {isSpacer ? (
                        <View style={styles.spacer} />
                      ) : line.type === 'ayah' ? (
                        <StaticHifzAyahText
                          text={line.text}
                          fontSize={fontSize}
                          lineHeight={lineHeight}
                          color={ink}
                          contentWidth={contentWidth}
                          centered={centered}
                          justify={!centered}
                          ayahStart={line.ayahStart}
                          ayahEnd={line.ayahEnd}
                          highlightAyah={highlightAyah}
                          longestChars={longestChars}
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
                          surahNumber={line.surahNumber}
                          fontSize={fontSize}
                          lineHeight={lineHeight}
                        />
                      ) : (
                        <Text
                          numberOfLines={1}
                          ellipsizeMode="clip"
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
    </Pressable>
  );
});

const styles = StyleSheet.create({
  readerRoot: {
    flex: 1,
  },
  list: {
    flex: 1,
    overflow: 'hidden',
    direction: 'ltr',
  },
  slotFill: {
    ...StyleSheet.absoluteFillObject,
  },
  readerControls: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 10,
    elevation: 10,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  readerInfoBar: {
    alignSelf: 'stretch',
    minHeight: 48,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: BorderRadius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.xs,
  },
  readerPageMeta: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
  },
  readerMetaLine: {
    width: '100%',
    textAlign: 'center',
  },
  readerPageText: {
    fontFamily: 'Vazirmatn-Bold',
    fontSize: 13,
    writingDirection: 'ltr',
  },
  readerJuzText: {
    fontFamily: 'Vazirmatn',
    fontSize: 11,
    marginTop: 1,
  },
  readerIconButton: {
    width: 38,
    height: 38,
    justifyContent: 'center',
    alignItems: 'center',
  },
  readerActionBar: {
    alignSelf: 'center',
    minWidth: Math.min(PAGE_WIDTH - Spacing.md * 2, 292),
    height: 52,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: BorderRadius.full,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: Spacing.xs,
  },
  readerActionBarLatin: {
    minWidth: Math.min(PAGE_WIDTH - Spacing.md * 2, 312),
    height: 56,
    paddingHorizontal: Spacing.sm,
  },
  readerLatinText: {
    fontFamily: Platform.OS === 'android' ? 'sans-serif-medium' : undefined,
    fontWeight: '700',
    fontSize: 16,
    lineHeight: 20,
    letterSpacing: 0.2,
    textAlign: 'center',
    includeFontPadding: false,
  },
  readerLatinCaption: {
    fontFamily: Platform.OS === 'android' ? 'sans-serif' : undefined,
    fontWeight: '500',
    fontSize: 12,
    lineHeight: 16,
    marginTop: 1,
    textAlign: 'center',
    includeFontPadding: false,
  },
  iconUnmirrored: {
    direction: 'ltr',
  },
  readerAction: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
  },
  readerActionDisabled: {
    opacity: 0.35,
  },
  navigatorBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.28)',
  },
  navigatorScrim: {
    ...StyleSheet.absoluteFillObject,
  },
  navigatorSheet: {
    flexShrink: 1,
    width: '100%',
    maxHeight: '82%',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.sm,
  },
  navigatorGrabber: {
    alignSelf: 'center',
    width: 38,
    height: 4,
    borderRadius: 2,
    marginBottom: Spacing.sm,
  },
  navigatorTitle: {
    textAlign: 'center',
    fontFamily: 'Vazirmatn-Bold',
    fontSize: 17,
  },
  navigatorCurrent: {
    textAlign: 'center',
    fontFamily: 'Vazirmatn',
    fontSize: 12,
    lineHeight: 19,
    marginTop: 3,
    marginBottom: Spacing.sm,
  },
  navigatorTabs: {
    flexDirection: 'row',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: BorderRadius.md,
    padding: 3,
    gap: 3,
  },
  navigatorTab: {
    flex: 1,
    minHeight: 40,
    borderRadius: BorderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  navigatorTabText: {
    fontFamily: 'Vazirmatn-Bold',
    fontSize: 12,
  },
  navigatorBody: {
    flexShrink: 1,
    marginTop: Spacing.sm,
  },
  navigatorBodyContent: {
    gap: Spacing.sm,
  },
  navigatorInput: {
    width: '100%',
    minHeight: 48,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    fontFamily: 'Vazirmatn',
    fontSize: 15,
  },
  navigatorGo: {
    minHeight: 44,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  navigatorSurahResults: {
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
  },
  navigatorSurahResult: {
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.sm,
  },
  navigatorSurahNumber: {
    minWidth: 28,
    fontFamily: 'Vazirmatn-Bold',
    fontSize: 13,
  },
  navigatorSurahName: {
    flex: 1,
    fontFamily: 'Vazirmatn',
    fontSize: 14,
  },
  navigatorSurahArabic: {
    fontFamily: 'ScheherazadeNew',
    fontSize: 19,
  },
  navigatorNoResults: {
    textAlign: 'center',
    fontFamily: 'Vazirmatn',
    fontSize: 13,
    paddingVertical: Spacing.sm,
  },
  navigatorGoText: {
    color: '#fff',
    fontFamily: 'Vazirmatn-Bold',
    fontSize: 12,
  },
  navigatorError: {
    color: '#B42318',
    textAlign: 'center',
    fontFamily: 'Vazirmatn',
    fontSize: 12,
  },
  navigatorClose: {
    alignSelf: 'center',
    minHeight: 36,
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
  },
  navigatorCloseText: {
    fontFamily: 'Vazirmatn-Bold',
    fontSize: 14,
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
    top: OPENING_TEXT_TOP,
    right: OPENING_SIDE_INSET,
    bottom: OPENING_TEXT_BOTTOM,
    left: OPENING_SIDE_INSET,
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
  khatmFrame: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
    marginHorizontal: 10,
    marginVertical: 4,
  },
  khatmInner: {
    flex: 1,
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 10,
    zIndex: 1,
  },
  khatmTitle: {
    textAlign: 'center',
    writingDirection: 'rtl',
    marginBottom: 6,
    paddingBottom: 4,
  },
  khatmBodySlot: {
    flex: 1,
    minHeight: 0,
    justifyContent: 'center',
    overflow: 'hidden',
    direction: 'rtl',
  },
  khatmBody: {
    textAlign: 'justify',
    writingDirection: 'rtl',
  },
  khatmClosing: {
    textAlign: 'center',
    writingDirection: 'rtl',
    marginTop: 2,
  },
  khatmMedallion: {
    alignItems: 'center',
    marginTop: 6,
  },
  creditsInner: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 28,
    paddingVertical: 24,
    zIndex: 1,
    gap: 16,
  },
  creditsHeading: {
    alignItems: 'center',
    gap: 8,
  },
  creditsTitle: {
    marginBottom: 0,
    paddingVertical: 4,
  },
  creditsRule: {
    width: 72,
    height: 1,
    backgroundColor: ILLUM.gold,
  },
  creditsIntro: {
    paddingVertical: 4,
  },
  creditsNames: {
    gap: 10,
    marginTop: 14,
    marginBottom: 14,
  },
  creditsName: {
    paddingVertical: 2,
  },
  creditsClosing: {
    marginTop: 4,
    paddingVertical: 4,
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
  surahHeader: {
    width: '100%',
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },
  surahHeaderTitleRow: {
    width: '100%',
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 4,
  },
  surahHeaderBasmallahRow: {
    width: '100%',
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 4,
  },
  surahHeaderRule: {
    flex: 1,
    minWidth: 12,
    height: StyleSheet.hairlineWidth * 2,
    backgroundColor: ILLUM.gold,
    opacity: 0.85,
  },
  surahHeaderTitle: {
    maxWidth: '72%',
    flexShrink: 1,
    color: ILLUM.greenDark,
    textAlign: 'center',
    writingDirection: 'rtl',
    paddingHorizontal: 2,
  },
  surahHeaderBasmallah: {
    maxWidth: '78%',
    flexShrink: 1,
    color: ILLUM.greenDark,
    textAlign: 'center',
    writingDirection: 'rtl',
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
  openingPlaqueOuter: {
    alignSelf: 'stretch',
    padding: 3,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: ILLUM.greenDark,
    backgroundColor: '#EEF6F1',
  },
  openingPlaqueInner: {
    // Physical row-reverse: the revelation note sits on the right, mushaf style.
    flexDirection: 'row-reverse',
    alignItems: 'center',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: ILLUM.gold,
    backgroundColor: '#F7FBF8',
    paddingVertical: 8,
    paddingHorizontal: 6,
  },
  openingPlaqueSide: {
    width: 58,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 2,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: 'rgba(196,163,90,0.7)',
    backgroundColor: ILLUM.cream,
  },
  openingPlaqueNote: {
    fontFamily: HIFZ_FONT,
    fontSize: 11,
    lineHeight: 20,
    color: ILLUM.greenDark,
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  openingPlaqueCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  openingPlaqueTitle: {
    color: ILLUM.greenDark,
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
    overflow: 'visible',
  },
  /** One line slot for a standalone surah name / orphan basmallah. */
  surahBlockRow: {
    flexGrow: 1,
    flexShrink: 0,
    overflow: 'visible',
  },
  /**
   * Name + Bismillah share one header while the data basmallah line is omitted;
   * take two line slots so the block stays below the previous ayah.
   */
  surahWithBasmallahRow: {
    flex: 2,
    flexGrow: 2,
    flexShrink: 0,
    overflow: 'visible',
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
  bookmarkRibbon: {
    position: 'absolute',
    top: '50%',
    marginTop: -9,
    right: -14,
    zIndex: 2,
  },
  openingAyahBlock: {
    flexGrow: 0,
    flexShrink: 0,
    width: '100%',
  },
  // Soft mint wash on the playing ayah span. No padding, so the line does not reflow.
  ayahHighlight: {
    backgroundColor: AYAH_HIGHLIGHT,
    borderRadius: 6,
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
  openingFillAyahRow: {
    flex: 1.5,
    flexGrow: 1.5,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(196,163,90,0.45)',
  },
  openingFillLastRow: {
    borderBottomWidth: 0,
  },
  openingFillHeaderRow: {
    flex: 2.2,
    flexGrow: 2.2,
  },
  openingFillHeaderWithBasmallahRow: {
    flex: 3.2,
    flexGrow: 3.2,
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
    paddingHorizontal: CENTERED_LINE_PAD,
  },
  centeredLineText: {
    maxWidth: '100%',
  },
  lineInkPad: {
    paddingVertical: LINE_INK_PAD,
    marginVertical: -LINE_INK_PAD,
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
    // Hug the text from the right edge; kashida fills the slot, and any
    // leftover sits past the ﴿n﴾ instead of between it and the last word.
    flexGrow: 0,
    flexShrink: 1,
    justifyContent: 'center',
    // Prevent children from stretching to the slot width (Yoga default alignItems:stretch).
    alignItems: 'flex-end',
    // The start-side safety inset maps to the left side of this view on device.
    paddingRight: AYAH_PAD_END,
  },
  ayahLineBodyText: {
    alignSelf: 'flex-end',
    maxWidth: '100%',
    paddingRight: AYAH_TEXT_START_INSET,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  ayahLineMarker: {
    flexGrow: 0,
    flexShrink: 0,
    paddingLeft: 2,
    paddingRight: 1,
  },
  wawGapRun: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
  },
  centeredWawRun: {
    justifyContent: 'center',
  },
  /**
   * A squeezed piece would truncate itself; the line fit keeps the run in the slot.
   * Width is reset because centered lines carry width: '100%', which would give every
   * piece a full row and push the rest of the line off the page.
   */
  wawGapPiece: {
    flexShrink: 0,
    width: 'auto',
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
});
