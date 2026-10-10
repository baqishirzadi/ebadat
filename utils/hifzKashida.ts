/**
 * Stretch joining letters with Arabic tatweel (ـ) so short mushaf lines fill
 * the column. Spreads short strokes across joins along the line — never one
 * long bar in the middle, dots, or thin spaces.
 */

const KASHIDA = '\u0640';
const MARKS_RE = /[\u064B-\u065F\u0670\u06D6-\u06ED\u08D3-\u08FF\u0610-\u061A]/;
const AYAH_MARKER_RE = /﴿([٠-٩0-9]+)﴾/g;
const ARABIC_DIGITS = '٠١٢٣٤٥٦٧٨٩';

/** Letters that cannot connect to the next logical letter in Quranic Arabic. */
const CANNOT_JOIN_TO_NEXT = new Set([
  'ا',
  'أ',
  'إ',
  'آ',
  'ٱ',
  'د',
  'ذ',
  'ر',
  'ز',
  'و',
  'ؤ',
  'ء',
  'ة',
]);

/** Hamza is a letter but has no cursive joining form on either side. */
const NON_JOINING_LETTER = new Set(['ء', 'ٴ']);

/** Arabic-script base letters accepted on both sides of an elongation point. */
const ARABIC_BASE_LETTER_RE = /^[\u0621-\u064A\u0671\u067E\u06CC]$/u;

/** Letters whose connecting stroke looks like a real mushaf kashida when elongated. */
const PREFERRED_STRETCH = new Set([
  'س',
  'ش',
  'ص',
  'ض',
  'ك',
  'ک',
  'ل',
  'ب',
  'ت',
  'ث',
  'ن',
  'ي',
  'ی',
  'م',
  'ف',
  'ق',
  'ط',
  'ظ',
  'ه',
  'ح',
  'ج',
  'خ',
]);

/** Spread stretch across many joins so a full line does not become one long bar. */
export const MAX_STRETCH_LETTERS = 40;
/** Up to four short tatweels on a join. Spread evenly, never a hairline bar. */
export const MAX_TATWEEL_PER_LETTER = 4;

export type HifzFaceMetrics = {
  /** Tatweels allowed on the one chosen join of a word. */
  maxTatweelPerLetter: number;
  /** Advance of U+0640 as a fraction of the em. */
  kashidaAdvanceRatio: number;
  /** Rough connected-letter advance used to seed stretch. */
  charWidthRatio: number;
  /** Wider estimate so the page font stays inside the column. */
  pageCharWidthRatio: number;
  /**
   * Downward shift of a pause glyph, as a fraction of its own size.
   * Amiri draws these marks more than an em above the baseline.
   */
  pauseLiftRatio: number;
};

/**
 * Amiri Quran tatweel is 185/1000 em and already allows four strokes per join.
 * Scheherazade New is 181/2048 em, about half as wide, so it allows eight.
 */
export const HIFZ_FACE_METRICS: Record<'amiriQuran' | 'scheherazade', HifzFaceMetrics> = {
  amiriQuran: {
    maxTatweelPerLetter: 4,
    kashidaAdvanceRatio: 0.185,
    charWidthRatio: 0.52,
    pageCharWidthRatio: 0.59,
    pauseLiftRatio: 0.95,
  },
  scheherazade: {
    // Stroke is about half of Amiri, so the same line needs about twice the joins.
    maxTatweelPerLetter: 8,
    kashidaAdvanceRatio: 0.0884,
    charWidthRatio: 0.52,
    pageCharWidthRatio: 0.62,
    pauseLiftRatio: 0.35,
  },
};

export function hifzFaceMetrics(face: string | undefined): HifzFaceMetrics {
  return face === 'scheherazade' ? HIFZ_FACE_METRICS.scheherazade : HIFZ_FACE_METRICS.amiriQuran;
}

const PAUSE_MARK_RE = /[\u0614\u0615\u06D6-\u06DC]/;
const ALEF_AFTER_LAM = new Set(['ا', 'أ', 'إ', 'آ', 'ٱ']);

export function parseAyahMarkerDigits(digits: string): number {
  let n = 0;
  for (const ch of digits) {
    const western = ch.charCodeAt(0) - 48;
    if (western >= 0 && western <= 9) {
      n = n * 10 + western;
      continue;
    }
    const arabic = ARABIC_DIGITS.indexOf(ch);
    if (arabic >= 0) {
      n = n * 10 + arabic;
      continue;
    }
  }
  return n;
}

export type AyahSpan = { text: string; ayah: number };

/**
 * Split a mushaf line into the stretchable body and trailing ﴿n﴾ markers.
 * Markers stay unstretched and are pinned at the visual end of the line.
 */
export function splitLineBodyAndMarkers(text: string): { body: string; markers: string } {
  if (!text) return { body: '', markers: '' };
  AYAH_MARKER_RE.lastIndex = 0;
  let lastEnd = -1;
  let match: RegExpExecArray | null;
  const trailing: string[] = [];
  // Walk all markers; collect a trailing run that ends the string.
  const all: { start: number; end: number; raw: string }[] = [];
  while ((match = AYAH_MARKER_RE.exec(text)) != null) {
    all.push({ start: match.index, end: match.index + match[0].length, raw: match[0] });
  }
  if (all.length === 0) return { body: text, markers: '' };

  let i = all.length - 1;
  let cut = text.length;
  while (i >= 0) {
    const m = all[i];
    const between = text.slice(m.end, cut).trim();
    if (between.length > 0) break;
    trailing.unshift(m.raw);
    cut = m.start;
    // Allow only whitespace between consecutive trailing markers.
    i -= 1;
  }
  // Include whitespace just before the first trailing marker in the marker zone
  // so the body does not keep a dangling space that looks like end-gap.
  while (cut > 0 && /\s/.test(text[cut - 1])) cut -= 1;
  const body = text.slice(0, cut);
  const markers = trailing.join('');
  return { body, markers };
}

/**
 * Split a mushaf line into spans keyed by ayah number.
 * Text ending at ﴿n﴾ belongs to ayah n; trailing text after the last marker
 * belongs to ayahEnd (start of the next ayah on the same line).
 */
export function splitAyahSpans(
  text: string,
  ayahStart: number,
  ayahEnd: number
): AyahSpan[] {
  if (!text) return [];
  const spans: AyahSpan[] = [];
  let lastIndex = 0;
  let matched = false;
  AYAH_MARKER_RE.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = AYAH_MARKER_RE.exec(text)) != null) {
    matched = true;
    const end = match.index + match[0].length;
    const ayah = parseAyahMarkerDigits(match[1]);
    spans.push({ text: text.slice(lastIndex, end), ayah });
    lastIndex = end;
  }
  if (!matched) {
    return [{ text, ayah: ayahStart }];
  }
  if (lastIndex < text.length) {
    spans.push({ text: text.slice(lastIndex), ayah: ayahEnd });
  }
  return spans;
}

function isAyahMarkerContext(text: string, index: number): boolean {
  const slice = text.slice(Math.max(0, index - 2), index + 6);
  return slice.includes('﴿') || slice.includes('﴾');
}

function skipMarksBack(text: string, index: number): number {
  let i = index;
  while (i >= 0 && MARKS_RE.test(text[i])) i -= 1;
  return i;
}

function skipMarksForward(text: string, index: number): number {
  let i = index;
  while (i < text.length && MARKS_RE.test(text[i])) i += 1;
  return i;
}

type Slot = { insertAt: number; letter: string; score: number; wordStart: number };

export function kashidaSlots(text: string): number[] {
  return scoredSlots(text).map((slot) => slot.insertAt);
}

function scoredSlots(text: string): Slot[] {
  const slots: Slot[] = [];
  for (let i = 0; i < text.length - 1; i += 1) {
    const ch = text[i];
    if (MARKS_RE.test(ch) || ch === KASHIDA || ch === ' ' || ch === '\u00A0') continue;
    if (ch === '﴿' || ch === '﴾' || /[0-9٠-٩]/.test(ch)) continue;
    if (isAyahMarkerContext(text, i)) continue;
    // The current letter must be a font-approved kashida carrier and must be
    // able to join forward in logical order. This intentionally keeps the
    // choice font/style-specific instead of stretching every medial join.
    if (!PREFERRED_STRETCH.has(ch) || CANNOT_JOIN_TO_NEXT.has(ch)) continue;

    const j = skipMarksForward(text, i + 1);
    if (j >= text.length) continue;
    if (hasPauseMark(text, i + 1, j) || wordContainsAllah(text, i)) continue;
    const next = text[j];
    if ((ch === 'ل' || ch === 'ﻝ') && ALEF_AFTER_LAM.has(next)) continue;
    if (next === ' ' || next === '\u00A0' || next === '﴿' || next === KASHIDA) continue;
    if (next === '﴾' || /[0-9٠-٩]/.test(next)) continue;
    if (!ARABIC_BASE_LETTER_RE.test(next) || NON_JOINING_LETTER.has(next)) continue;

    const prev = skipMarksBack(text, i - 1);
    const atWordStart = prev < 0 || text[prev] === ' ' || text[prev] === '\u00A0';
    let score = 1;
    if (PREFERRED_STRETCH.has(ch)) score += 4;
    if (atWordStart) score -= 1.25;
    // Prefer mid-line joins so elongation looks balanced.
    const dist = Math.abs(i - text.length / 2) / Math.max(text.length, 1);
    score += 1 - dist;
    let wordStart = i;
    while (wordStart > 0 && text[wordStart - 1] !== ' ' && text[wordStart - 1] !== '\u00A0') {
      wordStart -= 1;
    }
    slots.push({ insertAt: j, letter: ch, score, wordStart });
  }
  return slots;
}

/**
 * Pick up to `letterCount` slots spread along the line, with at most one
 * kashida point per word to avoid piling elongations into a single word.
 */
function pickSpreadSlots(slots: Slot[], letterCount: number): Slot[] {
  if (slots.length === 0 || letterCount <= 0) return [];
  const bestByWord = new Map<number, Slot>();
  for (const slot of slots) {
    const current = bestByWord.get(slot.wordStart);
    if (!current || slot.score > current.score) bestByWord.set(slot.wordStart, slot);
  }
  const byPos = [...bestByWord.values()].sort((a, b) => a.insertAt - b.insertAt);
  if (byPos.length <= letterCount) return byPos;

  const chosen: Slot[] = [];
  for (let i = 0; i < letterCount; i += 1) {
    const start = Math.floor((i * byPos.length) / letterCount);
    const end = Math.floor(((i + 1) * byPos.length) / letterCount);
    const slice = byPos.slice(start, Math.max(end, start + 1));
    if (slice.length === 0) continue;
    let best = slice[0];
    for (let j = 1; j < slice.length; j += 1) {
      if (slice[j].score > best.score) best = slice[j];
    }
    chosen.push(best);
  }
  return chosen.sort((a, b) => a.insertAt - b.insertAt);
}

/**
 * Distribute `count` tatweels into short joins spread along the line.
 * Each chosen letter gets a short consecutive run (at most a few tatweels).
 */
export function applyKashida(
  text: string,
  count: number,
  maxPerSlot = MAX_TATWEEL_PER_LETTER
): string {
  if (!text) return text;
  const slots = scoredSlots(text);
  const required = requiredInserts(text, slots);
  if ((count <= 0 && required.length === 0) || (slots.length === 0 && required.length === 0)) {
    return text;
  }

  const cap = Math.max(1, Math.min(12, Math.floor(maxPerSlot)));
  const chosen = pickSpreadSlots(slots, Math.min(MAX_STRETCH_LETTERS, Math.max(slots.length, 1)));
  const insertAts = new Set(chosen.map((slot) => slot.insertAt));
  for (const insertAt of required) insertAts.add(insertAt);
  const ordered = [...insertAts].sort((a, b) => a - b);
  if (ordered.length === 0) return text;

  const requiredSet = new Set(required);
  const floor = required.length;
  const fill = ordered.filter((insertAt) => !requiredSet.has(insertAt));
  const extras = Math.min(Math.max(count - floor, 0), fill.length * cap);
  if (floor === 0 && extras === 0) return text;

  const inserts = new Map<number, number>();
  for (const insertAt of required) inserts.set(insertAt, 1);
  let placed = 0;
  while (placed < extras && fill.length > 0) {
    const lowest = Math.min(...fill.map((insertAt) => inserts.get(insertAt) ?? 0));
    let progressed = false;
    for (const insertAt of fill) {
      if (placed >= extras) break;
      const current = inserts.get(insertAt) ?? 0;
      if (current > lowest || current >= cap) continue;
      inserts.set(insertAt, current + 1);
      placed += 1;
      progressed = true;
    }
    if (!progressed) break;
  }

  let out = '';
  for (let i = 0; i < text.length; i += 1) {
    const extra = inserts.get(i);
    if (extra) out += KASHIDA.repeat(extra);
    out += text[i];
  }
  return out;
}

/** Rough length used to estimate page font size. */
export function visibleLength(text: string): number {
  return text.replace(MARKS_RE, '').replace(new RegExp(KASHIDA, 'g'), '').length;
}

/** Amiri Quran tatweel advance. Other faces pass their own ratio into the helpers. */
export const KASHIDA_ADVANCE_RATIO = HIFZ_FACE_METRICS.amiriQuran.kashidaAdvanceRatio;

export type MushafPiece =
  | { kind: 'text'; text: string }
  | { kind: 'pause'; marks: string };

/**
 * Pull Indo-Pak pause clusters out of a shaped line. Madda and harakat stay
 * in the text pieces. Each cluster is drawn as its own vertical column.
 */
export function splitPausePieces(text: string): MushafPiece[] {
  if (!text) return [];
  const pieces: MushafPiece[] = [];
  const cluster = /[\u0614\u0615\u06D6-\u06DC]+/g;
  let last = 0;
  let match: RegExpExecArray | null;
  while ((match = cluster.exec(text)) != null) {
    if (match.index > last) {
      pieces.push({ kind: 'text', text: text.slice(last, match.index) });
    }
    pieces.push({ kind: 'pause', marks: match[0] });
    last = match.index + match[0].length;
  }
  if (last < text.length) pieces.push({ kind: 'text', text: text.slice(last) });
  if (pieces.length === 0) pieces.push({ kind: 'text', text });
  return pieces;
}

export function pauseColumnCount(text: string): number {
  if (!text) return 0;
  const matches = text.match(/[\u0614\u0615\u06D6-\u06DC]+/g);
  return matches ? matches.length : 0;
}

const SHADDA = '\u0651';
const MADDA = '\u0653';

function isBaseLetter(ch: string): boolean {
  return /[\u0621-\u064A\u0671\u06CC]/u.test(ch);
}

/** One tatweel between a madda and a shadda or madda on one of the next two letters. */
function requiredInserts(text: string, slots: Slot[]): number[] {
  const bases: { offset: number; marks: string }[] = [];
  for (let index = 0; index < text.length; index += 1) {
    if (!isBaseLetter(text[index])) continue;
    const offset = index;
    index += 1;
    let marks = '';
    while (index < text.length && MARKS_RE.test(text[index])) {
      marks += text[index];
      index += 1;
    }
    index -= 1;
    bases.push({ offset, marks });
  }
  const inserts: number[] = [];
  for (let index = 0; index < bases.length; index += 1) {
    if (!bases[index].marks.includes(MADDA)) continue;
    const last = Math.min(bases.length - 1, index + 2);
    for (let next = index + 1; next <= last; next += 1) {
      const marks = bases[next].marks;
      if (!marks.includes(SHADDA) && !marks.includes(MADDA)) continue;
      const join = slots.find(
        (slot) => slot.insertAt > bases[index].offset && slot.insertAt <= bases[next].offset,
      );
      if (join && !inserts.includes(join.insertAt)) inserts.push(join.insertAt);
      break;
    }
  }
  return inserts;
}

function hasPauseMark(text: string, from: number, until: number): boolean {
  for (let index = from; index < until; index += 1) {
    if (PAUSE_MARK_RE.test(text[index])) return true;
  }
  return false;
}

function wordContainsAllah(text: string, index: number): boolean {
  let start = index;
  while (start > 0 && text[start - 1] !== ' ' && text[start - 1] !== '\u00A0') start -= 1;
  let end = index;
  while (end < text.length && text[end] !== ' ' && text[end] !== '\u00A0') end += 1;
  const word = text
    .slice(start, end)
    .replace(new RegExp(MARKS_RE.source, 'g'), '')
    .replace(/\u0640/g, '')
    .replace(/\u0671/g, '\u0627');
  return word.includes('الله');
}

/**
 * Estimate how many tatweels are needed to fill measured slack.
 */
export function kashidaCountForWidth(
  naturalWidth: number,
  contentWidth: number,
  fontSize: number,
  advanceRatio = KASHIDA_ADVANCE_RATIO,
  maxPerLetter = MAX_TATWEEL_PER_LETTER,
): number {
  if (contentWidth <= 0 || naturalWidth <= 0) return 0;
  const slack = contentWidth - naturalWidth;
  if (slack <= 4) return 0;
  const per = Math.max(fontSize * advanceRatio, 3.5);
  return Math.min(MAX_STRETCH_LETTERS * Math.max(1, maxPerLetter), Math.ceil(slack / per));
}
