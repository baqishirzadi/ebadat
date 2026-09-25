/**
 * Indo-Pak 16-line (Taj Company) hifz mushaf helpers.
 * Page numbers here are 1–548 and must not be mixed with Madani 1–604 pages.
 */

import hifzMeta from '@/data/hifz16-meta.json';
import hifzPages from '@/data/hifz16-pages.json';
import { splitAyahSpans, visibleLength } from '@/utils/hifzKashida';

export type HifzLineType = 'ayah' | 'surah_name' | 'basmallah' | 'spacer';

export interface HifzLine {
  line: number;
  type: HifzLineType;
  text: string;
  centered?: boolean;
  surahNumber?: number;
  ayahStart?: number;
  ayahEnd?: number;
}

export interface HifzPage {
  page: number;
  juz: number;
  lines: HifzLine[];
}

type HifzPayload = {
  version: number;
  mushaf: string;
  pageCount: number;
  linesPerPage: number;
  pages: HifzPage[];
};

type HifzMeta = {
  pageCount: number;
  linesPerPage: number;
  surahFirstPage: Record<string, number>;
};

const payload = hifzPages as HifzPayload;
const meta = hifzMeta as HifzMeta;

export const HIFZ16_PAGE_COUNT = payload.pageCount;
export const HIFZ16_LINES_PER_PAGE = payload.linesPerPage;

export function getHifzPage(pageNumber: number): HifzPage | null {
  if (pageNumber < 1 || pageNumber > payload.pages.length) return null;
  return payload.pages[pageNumber - 1] ?? null;
}

export function getHifzSurahStartPage(surahNumber: number): number {
  return meta.surahFirstPage[String(surahNumber)] ?? 1;
}

/** First page of a juz in the 16-line mushaf (1–30). */
export function findHifzJuzStartPage(juzNumber: number): number | null {
  if (juzNumber < 1 || juzNumber > 30) return null;
  const page = payload.pages.find((entry) => entry.juz === juzNumber);
  return page?.page ?? null;
}

/** Surah and ayah that open the start of a juz in the 16-line reader. */
export function findHifzJuzStartAyah(
  juzNumber: number
): { surah: number; ayah: number; page: number } | null {
  const pageNumber = findHifzJuzStartPage(juzNumber);
  if (pageNumber == null) return null;
  const page = getHifzPage(pageNumber);
  if (!page) return null;
  for (const line of page.lines) {
    const target = getHifzLinePlayTarget(line);
    if (target) return { ...target, page: pageNumber };
  }
  return null;
}

/** First ayah on a line that can start audio playback. */
export function getHifzLinePlayTarget(line: HifzLine): { surah: number; ayah: number } | null {
  if (line.type !== 'ayah' || !line.surahNumber || line.ayahStart == null) {
    return null;
  }
  return { surah: line.surahNumber, ayah: line.ayahStart };
}

/** True when this page contains the given surah+ayah. */
export function hifzPageContainsAyah(
  pageNumber: number,
  surahNumber: number,
  ayahNumber: number,
): boolean {
  const page = getHifzPage(pageNumber);
  if (!page) return false;
  return page.lines.some(
    (line) =>
      line.type === 'ayah' &&
      line.surahNumber === surahNumber &&
      line.ayahStart != null &&
      line.ayahEnd != null &&
      line.ayahStart <= ayahNumber &&
      ayahNumber <= line.ayahEnd,
  );
}

/**
 * Best play / dock target for a visible page:
 * playing ayah on this page, else saved position on this page, else first playable ayah.
 */
export function resolveHifzPageTarget(
  pageNumber: number,
  options?: {
    playingSurah?: number | null;
    playingAyah?: number | null;
    savedSurah?: number | null;
    savedAyah?: number | null;
  },
): { surah: number; ayah: number; page: number } | null {
  const page = getHifzPage(pageNumber);
  if (!page) return null;

  const playingSurah = options?.playingSurah ?? null;
  const playingAyah = options?.playingAyah ?? null;
  if (
    playingSurah != null &&
    playingAyah != null &&
    hifzPageContainsAyah(pageNumber, playingSurah, playingAyah)
  ) {
    return { surah: playingSurah, ayah: playingAyah, page: pageNumber };
  }

  const savedSurah = options?.savedSurah ?? null;
  const savedAyah = options?.savedAyah ?? null;
  if (
    savedSurah != null &&
    savedAyah != null &&
    hifzPageContainsAyah(pageNumber, savedSurah, savedAyah)
  ) {
    return { surah: savedSurah, ayah: savedAyah, page: pageNumber };
  }

  for (const line of page.lines) {
    const target = getHifzLinePlayTarget(line);
    if (target) return { ...target, page: pageNumber };
  }
  return null;
}

export function findHifzPageForAyah(surahNumber: number, ayahNumber: number): number | null {
  const pages = listHifzPagesForAyah(surahNumber, ayahNumber);
  return pages[0] ?? null;
}

/** Every hifz page that contains this ayah, in mushaf order. */
export function listHifzPagesForAyah(surahNumber: number, ayahNumber: number): number[] {
  const pages: number[] = [];
  for (const page of payload.pages) {
    const hit = page.lines.some(
      (line) =>
        line.type === 'ayah' &&
        line.surahNumber === surahNumber &&
        line.ayahStart != null &&
        line.ayahEnd != null &&
        line.ayahStart <= ayahNumber &&
        ayahNumber <= line.ayahEnd
    );
    if (hit) pages.push(page.page);
  }
  return pages;
}

/**
 * Visible Arabic length of one ayah on a page (for mid-ayah page-turn timing).
 * Returns 0 when the ayah is not on the page.
 */
export function hifzAyahVisibleLengthOnPage(
  pageNumber: number,
  surahNumber: number,
  ayahNumber: number
): number {
  const page = getHifzPage(pageNumber);
  if (!page) return 0;
  let total = 0;
  for (const line of page.lines) {
    if (
      line.type !== 'ayah' ||
      line.surahNumber !== surahNumber ||
      line.ayahStart == null ||
      line.ayahEnd == null ||
      line.ayahStart > ayahNumber ||
      ayahNumber > line.ayahEnd ||
      !line.text
    ) {
      continue;
    }
    for (const span of splitAyahSpans(line.text, line.ayahStart, line.ayahEnd)) {
      if (span.ayah === ayahNumber) total += visibleLength(span.text);
    }
  }
  return total;
}
