export type AllowedArticleTag = 'h2' | 'p' | 'strong' | 'em' | 'mark' | 'br';

export interface EditorSelection {
  start: number;
  end: number;
}

const ALLOWED_TAGS = new Set<AllowedArticleTag>(['h2', 'p', 'strong', 'em', 'mark', 'br']);

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function normalizeSelection(text: string, selection?: EditorSelection): EditorSelection {
  const length = text.length;
  const start = clamp(selection?.start ?? length, 0, length);
  const end = clamp(selection?.end ?? start, 0, length);
  return start <= end ? { start, end } : { start: end, end: start };
}

function cleanHtmlTag(rawTag: string): string {
  const normalized = rawTag.trim().toLowerCase().replace(/\/+$/, '');
  return ALLOWED_TAGS.has(normalized as AllowedArticleTag) ? normalized : '';
}

export function sanitizeArticleHtml(input: string): string {
  if (!input) return '';

  let html = input.replace(/\r\n?/g, '\n');

  // Strip dangerous or irrelevant block tags first.
  html = html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<!--([\s\S]*?)-->/g, '');

  html = html.replace(/<\/?([a-z0-9]+)(?:\s[^>]*)?>/gi, (match, name: string) => {
    const normalizedTag = cleanHtmlTag(name);
    if (!normalizedTag) return '';

    if (/^<\//.test(match)) {
      return `</${normalizedTag}>`;
    }

    if (normalizedTag === 'br') {
      return '<br>';
    }

    return `<${normalizedTag}>`;
  });

  html = html
    .replace(/(?:\s*<br>\s*){3,}/gi, '<br><br>')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  if (!/<\s*(p|h2)\b/i.test(html)) {
    const paragraphs = html
      .split(/\n\s*\n/)
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => `<p>${part.replace(/\n/g, '<br>')}</p>`);

    return paragraphs.join('\n');
  }

  return html;
}

export function applyInlineTag(
  text: string,
  selection: EditorSelection,
  tag: Extract<AllowedArticleTag, 'strong' | 'em' | 'mark'>,
): { text: string; selection: EditorSelection } {
  const range = normalizeSelection(text, selection);
  const selectedText = text.slice(range.start, range.end).trim();
  if (!selectedText) {
    return { text, selection: range };
  }

  const wrapped = `<${tag}>${selectedText}</${tag}>`;
  const nextText = `${text.slice(0, range.start)}${wrapped}${text.slice(range.end)}`;
  const nextCursor = range.start + wrapped.length;

  return {
    text: nextText,
    selection: { start: nextCursor, end: nextCursor },
  };
}

export function applyParagraphTag(
  text: string,
  selection: EditorSelection,
): { text: string; selection: EditorSelection } {
  const range = normalizeSelection(text, selection);
  const selectedText = text.slice(range.start, range.end).trim();
  const payload = selectedText || 'متن پاراگراف';
  const wrapped = `<p>${payload}</p>`;
  const nextText = `${text.slice(0, range.start)}${wrapped}${text.slice(range.end)}`;
  const nextCursor = range.start + wrapped.length;

  return {
    text: nextText,
    selection: { start: nextCursor, end: nextCursor },
  };
}

export function applyHeadingTag(
  text: string,
  selection: EditorSelection,
): { text: string; selection: EditorSelection } {
  const range = normalizeSelection(text, selection);

  if (range.start !== range.end) {
    const selectedText = text.slice(range.start, range.end).trim();
    if (!selectedText) {
      return { text, selection: range };
    }
    const wrappedSelection = `<h2>${selectedText}</h2>`;
    const nextText = `${text.slice(0, range.start)}${wrappedSelection}${text.slice(range.end)}`;
    const nextCursor = range.start + wrappedSelection.length;
    return {
      text: nextText,
      selection: { start: nextCursor, end: nextCursor },
    };
  }

  const start = text.lastIndexOf('\n', Math.max(0, range.start - 1)) + 1;
  const lineBreakIndex = text.indexOf('\n', range.start);
  const end = lineBreakIndex === -1 ? text.length : lineBreakIndex;
  const lineText = text.slice(start, end).trim();
  const payload = lineText || 'عنوان';
  const wrappedLine = `<h2>${payload}</h2>`;
  const nextText = `${text.slice(0, start)}${wrappedLine}${text.slice(end)}`;
  const nextCursor = start + wrappedLine.length;

  return {
    text: nextText,
    selection: { start: nextCursor, end: nextCursor },
  };
}
