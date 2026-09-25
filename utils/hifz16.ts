/**
 * Indo-Pak 16-line (Taj Company) hifz mushaf helpers.
 * Page numbers here are 1–548 and must not be mixed with Madani 1–604 pages.
 */

import hifzMeta from '@/data/hifz16-meta.json';
import hifzPages from '@/data/hifz16-pages.json';

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

/** First ayah on a line that can start audio playback. */
export function getHifzLinePlayTarget(line: HifzLine): { surah: number; ayah: number } | null {
  if (line.type !== 'ayah' || !line.surahNumber || line.ayahStart == null) {
    return null;
  }
  return { surah: line.surahNumber, ayah: line.ayahStart };
}

export function findHifzPageForAyah(surahNumber: number, ayahNumber: number): number | null {
  for (const page of payload.pages) {
    for (const line of page.lines) {
      if (
        line.type === 'ayah' &&
        line.surahNumber === surahNumber &&
        line.ayahStart != null &&
        line.ayahEnd != null &&
        line.ayahStart <= ayahNumber &&
        ayahNumber <= line.ayahEnd
      ) {
        return page.page;
      }
    }
  }
  return null;
}
