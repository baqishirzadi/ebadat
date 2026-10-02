/**
 * Turns the limited article HTML vocabulary (h2, h3, p, blockquote, ul, ol,
 * strong, em, mark, a, br) into a flat block model the reader can lay out.
 */

export interface InlineRun {
  text: string;
  strong?: boolean;
  em?: boolean;
  mark?: boolean;
  href?: string;
}

export type ArticleBlock =
  | { kind: 'heading'; level: 2 | 3; text: string }
  | { kind: 'paragraph' | 'poetry' | 'meaning' | 'numbered' | 'quote'; runs: InlineRun[] }
  | { kind: 'list'; ordered: boolean; items: InlineRun[][] };

const ENTITIES: Record<string, string> = {
  amp: '&',
  apos: "'",
  hellip: '…',
  laquo: '«',
  ldquo: '“',
  lrm: '',
  nbsp: ' ',
  ndash: '–',
  quot: '"',
  raquo: '»',
  rdquo: '”',
  rlm: '',
  zwj: '\u200D',
  zwnj: '\u200C',
};

export function decodeHtml(value: string): string {
  return value
    .replace(/&#x([0-9a-f]+);/gi, (_m, hex: string) => {
      const codePoint = Number.parseInt(hex, 16);
      return Number.isFinite(codePoint) ? String.fromCodePoint(codePoint) : '';
    })
    .replace(/&#(\d+);/g, (_m, dec: string) => {
      const codePoint = Number.parseInt(dec, 10);
      return Number.isFinite(codePoint) ? String.fromCodePoint(codePoint) : '';
    })
    .replace(/&([a-z]+);/gi, (match, entity: string) => ENTITIES[entity.toLowerCase()] ?? match);
}

function htmlToPlainText(source: string): string {
  return decodeHtml(
    source
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/(?:p|h2|h3|blockquote|li)>/gi, '\n\n')
      .replace(/<[^>]+>/g, ''),
  )
    .replace(/[ \t\f\v]+/g, ' ')
    .replace(/ *\n+ */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** Comparison key used to drop paragraphs that repeat earlier ones verbatim. */
function dedupeKey(text: string): string {
  return decodeHtml(text)
    .replace(/[\u064B-\u065F]/g, '')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/[^\dA-Za-z\u0600-\u06FF]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function parseInlineRuns(source: string): InlineRun[] {
  const runs: InlineRun[] = [];
  let lastPos = 0;
  let strong = false;
  let em = false;
  let mark = false;
  let href: string | undefined;

  const pushText = (raw: string) => {
    const text = decodeHtml(raw.replace(/<(?!br\s*\/?>)[^>]+>/gi, ''))
      .replace(/[ \t\f\v]+/g, ' ')
      .replace(/ *\n+ */g, '\n')
      .replace(/\n{3,}/g, '\n\n');
    if (!text.trim() && text !== '\n') return;
    runs.push({ text, strong, em, mark, href });
  };

  const tagRegex = /<br\s*\/?>|<\/?(strong|b|em|i|mark|a)\b(?:\s+[^>]*)?>/gi;
  let match: RegExpExecArray | null;
  while ((match = tagRegex.exec(source)) !== null) {
    if (match.index > lastPos) pushText(source.substring(lastPos, match.index));
    const fullTag = match[0];
    lastPos = match.index + fullTag.length;

    if (/^<br/i.test(fullTag)) {
      pushText('\n');
      continue;
    }

    const tagName = match[1]?.toLowerCase();
    const closing = fullTag.startsWith('</');
    if (tagName === 'strong' || tagName === 'b') strong = !closing;
    else if (tagName === 'em' || tagName === 'i') em = !closing;
    else if (tagName === 'mark') mark = !closing;
    else if (tagName === 'a') {
      const hrefMatch = /href=(["'])(.*?)\1/i.exec(fullTag);
      href = closing ? undefined : hrefMatch ? decodeHtml(hrefMatch[2]) : undefined;
    }
  }
  if (lastPos < source.length) pushText(source.substring(lastPos));

  // Trim the outer whitespace of the paragraph, not of the inner runs.
  if (runs.length > 0) {
    runs[0] = { ...runs[0], text: runs[0].text.replace(/^\s+/, '') };
    const last = runs.length - 1;
    runs[last] = { ...runs[last], text: runs[last].text.replace(/\s+$/, '') };
  }
  return runs.filter((run) => run.text.length > 0);
}

const POETRY = /«[^»]+»/;
const NUMBERED = /^[0-9۰-۹٠-٩]{1,2}[.)]\s*/;
const MEANING_PATTERNS = [
  /(?:د بیت معنی|د شعر معنی|د نقل قول معنی|معنی په پښتو|د مانا|په پښتو)/,
  /\((?:پشتو|پښتو)\s*:/,
  /(?:نقل‌قول|نقل قول|بیت|قول)\s*:/,
];

function classifyParagraph(plain: string, tag: 'p' | 'blockquote') {
  if (tag === 'blockquote') return 'quote' as const;
  if (POETRY.test(plain)) return 'poetry' as const;
  if (NUMBERED.test(plain)) return 'numbered' as const;
  if (MEANING_PATTERNS.some((pattern) => pattern.test(plain))) return 'meaning' as const;
  return 'paragraph' as const;
}

export function parseArticleBlocks(html: string): ArticleBlock[] {
  const normalized = html
    .replace(/\r/g, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<\/(?:div|section|article)>/gi, '\n')
    .replace(/<(?:div|section|article)\b[^>]*>/gi, '');

  const blocks: ArticleBlock[] = [];
  const seen = new Set<string>();
  const blockRegex = /<(h2|h3|p|blockquote|ul|ol)\b[^>]*>([\s\S]*?)<\/\1>/gi;
  let match: RegExpExecArray | null;

  while ((match = blockRegex.exec(normalized)) !== null) {
    const tag = match[1].toLowerCase();
    const content = match[2];

    if (tag === 'h2' || tag === 'h3') {
      const text = htmlToPlainText(content);
      if (text) blocks.push({ kind: 'heading', level: tag === 'h3' ? 3 : 2, text });
      continue;
    }

    if (tag === 'ul' || tag === 'ol') {
      const items: InlineRun[][] = [];
      const liRegex = /<li\b[^>]*>([\s\S]*?)<\/li>/gi;
      let li: RegExpExecArray | null;
      while ((li = liRegex.exec(content)) !== null) {
        if (dedupeKey(li[1])) items.push(parseInlineRuns(li[1]));
      }
      if (items.length === 0) {
        htmlToPlainText(content)
          .split(/\n+/)
          .map((item) => item.trim())
          .filter(Boolean)
          .forEach((item) => items.push([{ text: item }]));
      }
      if (items.length > 0) blocks.push({ kind: 'list', ordered: tag === 'ol', items });
      continue;
    }

    const key = dedupeKey(content);
    if (!key) continue;
    if (key.length >= 40 && seen.has(key)) continue;
    seen.add(key);

    const runs = parseInlineRuns(content);
    if (runs.length === 0) continue;
    blocks.push({ kind: classifyParagraph(htmlToPlainText(content), tag as 'p' | 'blockquote'), runs });
  }

  if (blocks.length > 0) return blocks;

  return htmlToPlainText(normalized)
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .map((paragraph) => ({ kind: 'paragraph' as const, runs: [{ text: paragraph }] }));
}

/** First real paragraph as plain text, for article cards. */
export function getArticleExcerpt(html: string, maxLength = 220): string {
  for (const block of parseArticleBlocks(html)) {
    if (block.kind !== 'paragraph' && block.kind !== 'quote') continue;
    const text = block.runs
      .map((run) => run.text)
      .join('')
      .replace(/\s+/g, ' ')
      .trim();
    if (!text || /^(?:نویسنده|لیکوال|ليکوال)\s*:/.test(text)) continue;
    return text.length > maxLength ? `${text.slice(0, maxLength).trimEnd()}…` : text;
  }
  return '';
}
