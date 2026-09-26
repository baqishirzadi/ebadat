/**
 * Stretch joining letters with Arabic tatweel (ـ) so short mushaf lines fill
 * the column. Spreads short strokes across joins along the line — never one
 * long bar in the middle, dots, or thin spaces.
 */

const KASHIDA = '\u0640';
const MARKS_RE = /[\u064B-\u065F\u0670\u06D6-\u06ED\u08D3-\u08FF\u0610-\u061A]/;
const AYAH_MARKER_RE = /﴿([٠-٩0-9]+)﴾/g;
const ARABIC_DIGITS = '٠١٢٣٤٥٦٧٨٩';

/** Letters that do not join to the following letter. */
const NON_JOINING_BASE = new Set([
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
  'ى',
]);

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
/** Short mushaf stroke — a few tatweels per join, never a long bar. */
export const MAX_TATWEEL_PER_LETTER = 5;

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

type Slot = { insertAt: number; letter: string; score: number };

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
    if (NON_JOINING_BASE.has(ch)) continue;

    const j = skipMarksForward(text, i + 1);
    if (j >= text.length) continue;
    const next = text[j];
    if (next === ' ' || next === '\u00A0' || next === '﴿' || next === KASHIDA) continue;
    if (next === '﴾' || /[0-9٠-٩]/.test(next)) continue;

    const prev = skipMarksBack(text, i - 1);
    const atWordStart = prev < 0 || text[prev] === ' ' || text[prev] === '\u00A0';
    // Mid-word joins first; preferred letters may also stretch at a word start so
    // short lines still have enough slots to reach the column edge.
    if (atWordStart && !PREFERRED_STRETCH.has(ch)) continue;

    let score = 1;
    if (PREFERRED_STRETCH.has(ch)) score += 4;
    if (atWordStart) score -= 1.25;
    // Prefer mid-line joins so elongation looks balanced.
    const dist = Math.abs(i - text.length / 2) / Math.max(text.length, 1);
    score += 1 - dist;
    slots.push({ insertAt: j, letter: ch, score });
  }
  return slots;
}

/**
 * Pick up to `letterCount` slots spread along the line: best-scoring join in
 * each positional slice so stretch is balanced, not piled in the middle.
 */
function pickSpreadSlots(slots: Slot[], letterCount: number): Slot[] {
  if (slots.length === 0 || letterCount <= 0) return [];
  const byPos = [...slots].sort((a, b) => a.insertAt - b.insertAt);
  if (byPos.length <= letterCount) return byPos;

  const chosen: Slot[] = [];
  const seen = new Set<number>();
  for (let i = 0; i < letterCount; i += 1) {
    const start = Math.floor((i * byPos.length) / letterCount);
    const end = Math.floor(((i + 1) * byPos.length) / letterCount);
    const slice = byPos.slice(start, Math.max(end, start + 1));
    if (slice.length === 0) continue;
    let best = slice[0];
    for (let j = 1; j < slice.length; j += 1) {
      if (slice[j].score > best.score) best = slice[j];
    }
    if (seen.has(best.insertAt)) continue;
    seen.add(best.insertAt);
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
  if (!text || count <= 0) return text;
  const slots = scoredSlots(text);
  if (slots.length === 0) return text;

  const cap = Math.max(1, Math.min(MAX_TATWEEL_PER_LETTER, maxPerSlot));
  const maxLetters = Math.min(MAX_STRETCH_LETTERS, slots.length);
  // Enough joins to hold the budget at the per-slot cap; spread them along the line.
  const letterCount = Math.min(maxLetters, Math.max(1, Math.ceil(count / cap)));
  const chosen = pickSpreadSlots(slots, letterCount);
  if (chosen.length === 0) return text;

  const budget = Math.min(count, chosen.length * cap);
  const inserts = new Map<number, number>();
  let placed = 0;
  while (placed < budget) {
    let progressed = false;
    for (const slot of chosen) {
      if (placed >= budget) break;
      const cur = inserts.get(slot.insertAt) ?? 0;
      if (cur >= cap) continue;
      inserts.set(slot.insertAt, cur + 1);
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

/** Scheherazade tatweel advance as a fraction of font size. */
export const KASHIDA_ADVANCE_RATIO = 0.28;

/**
 * Estimate how many tatweels are needed to fill measured slack.
 */
export function kashidaCountForWidth(
  naturalWidth: number,
  contentWidth: number,
  fontSize: number
): number {
  if (contentWidth <= 0 || naturalWidth <= 0) return 0;
  const slack = contentWidth - naturalWidth;
  if (slack <= 4) return 0;
  const per = Math.max(fontSize * KASHIDA_ADVANCE_RATIO, 3.5);
  return Math.min(MAX_STRETCH_LETTERS * MAX_TATWEEL_PER_LETTER, Math.ceil(slack / per));
}
