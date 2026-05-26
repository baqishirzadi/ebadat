/**
 * Article Reader Component
 * Beautiful Islamic-themed article display with HTML parsing
 */

import React from 'react';
import { View, StyleSheet, Text, Linking } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useApp } from '@/context/AppContext';
import { Article, ARTICLE_CATEGORIES } from '@/types/articles';
import { Spacing, BorderRadius } from '@/constants/theme';
import CenteredText from '@/components/CenteredText';

interface ArticleReaderProps {
  article: Article;
}

// Category-specific color schemes
type GradientColors = readonly [string, string, ...string[]];

const CATEGORY_COLORS: Record<string, { primary: string; secondary: string; accent: string; gradient: GradientColors }> = {
  iman: {
    primary: '#1B5E20', // Deep green
    secondary: '#2E7D32',
    accent: '#D4AF37', // Gold
    gradient: ['#1B5E20', '#2E7D32', '#388E3C'],
  },
  salah: {
    primary: '#1565C0', // Blue
    secondary: '#1976D2',
    accent: '#B0BEC5', // Silver
    gradient: ['#1565C0', '#1976D2', '#1E88E5'],
  },
  akhlaq: {
    primary: '#6A1B9A', // Purple
    secondary: '#7B1FA2',
    accent: '#D4AF37', // Gold
    gradient: ['#6A1B9A', '#7B1FA2', '#8E24AA'],
  },
  anxiety: {
    primary: '#0277BD', // Soft blue
    secondary: '#0288D1',
    accent: '#B3E5FC',
    gradient: ['#0277BD', '#0288D1', '#03A9F4'],
  },
  dua: {
    primary: '#00838F', // Teal
    secondary: '#0097A7',
    accent: '#B2EBF2',
    gradient: ['#00838F', '#0097A7', '#00ACC1'],
  },
  tazkiyah: {
    primary: '#5D4037', // Brown
    secondary: '#6D4C41',
    accent: '#FFB74D', // Amber
    gradient: ['#5D4037', '#6D4C41', '#795548'],
  },
  rizq: {
    primary: '#2E7D32', // Green
    secondary: '#388E3C',
    accent: '#C8E6C9',
    gradient: ['#2E7D32', '#388E3C', '#43A047'],
  },
  asma_husna: {
    primary: '#00695C', // Teal green
    secondary: '#00796B',
    accent: '#D4AF37', // Gold
    gradient: ['#005B4F', '#00695C', '#00796B'],
  },
};

/**
 * Parse HTML and convert to React Native components
 * Supports the limited article HTML vocabulary used by the seeded content.
 */
function parseHTML(html: string, categoryColor: string, themeText: string): React.ReactNode[] {
  const elements: React.ReactNode[] = [];
  let key = 0;

  const normalizedHtml = html
    .replace(/\r/g, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<\/(?:div|section|article)>/gi, '\n')
    .replace(/<(?:div|section|article)\b[^>]*>/gi, '');

  type BlockType = 'h2' | 'h3' | 'p' | 'blockquote' | 'ul' | 'ol';
  type InlinePart = {
    text: string;
    strong?: boolean;
    em?: boolean;
    mark?: boolean;
    href?: string;
  };

  const decodeHtml = (value: string): string => {
    const entities: Record<string, string> = {
      amp: '&',
      apos: "'",
      hellip: '...',
      laquo: '«',
      ldquo: '“',
      lrm: '',
      nbsp: ' ',
      ndash: '-',
      quot: '"',
      raquo: '»',
      rdquo: '”',
      rlm: '',
      zwj: '\u200D',
      zwnj: '\u200C',
    };

    return value
      .replace(/&#x([0-9a-f]+);/gi, (_match, hex: string) => {
        const codePoint = Number.parseInt(hex, 16);
        return Number.isFinite(codePoint) ? String.fromCodePoint(codePoint) : '';
      })
      .replace(/&#(\d+);/g, (_match, dec: string) => {
        const codePoint = Number.parseInt(dec, 10);
        return Number.isFinite(codePoint) ? String.fromCodePoint(codePoint) : '';
      })
      .replace(/&([a-z]+);/gi, (match, entity: string) => entities[entity.toLowerCase()] ?? match);
  };

  const normalizeParagraph = (text: string) =>
    decodeHtml(text)
      .replace(/[\u064B-\u065F]/g, '') // remove Arabic diacritics
      .replace(/<br\s*\/?>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/[^\dA-Za-z\u0600-\u06FF]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();

  const htmlToPlainText = (source: string): string =>
    decodeHtml(
      source
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/(?:p|h2|h3|blockquote|li)>/gi, '\n\n')
        .replace(/<[^>]+>/g, '')
    )
      .replace(/[ \t\f\v]+/g, ' ')
      .replace(/ *\n+ */g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

  const parseInlineParts = (source: string): InlinePart[] => {
    const parts: InlinePart[] = [];
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
      if (!text.trim()) return;
      parts.push({ text, strong, em, mark, href });
    };

    const tagRegex = /<br\s*\/?>|<\/?(strong|b|em|i|mark|a)\b(?:\s+[^>]*)?>/gi;
    let tagMatch;

    while ((tagMatch = tagRegex.exec(source)) !== null) {
      if (tagMatch.index > lastPos) {
        pushText(source.substring(lastPos, tagMatch.index));
      }

      const fullTag = tagMatch[0];
      if (/^<br/i.test(fullTag)) {
        pushText('\n');
        lastPos = tagMatch.index + fullTag.length;
        continue;
      }

      const tagName = tagMatch[1]?.toLowerCase();
      const isClosing = fullTag.startsWith('</');
      if (tagName === 'strong' || tagName === 'b') {
        strong = !isClosing;
      } else if (tagName === 'em' || tagName === 'i') {
        em = !isClosing;
      } else if (tagName === 'mark') {
        mark = !isClosing;
      } else if (tagName === 'a') {
        if (isClosing) {
          href = undefined;
        } else {
          const hrefMatch = /href=(["'])(.*?)\1/i.exec(fullTag);
          href = hrefMatch ? decodeHtml(hrefMatch[2]) : undefined;
        }
      }

      lastPos = tagMatch.index + fullTag.length;
    }

    if (lastPos < source.length) {
      pushText(source.substring(lastPos));
    }

    return parts;
  };

  const renderInlineParts = (parts: InlinePart[], keyPrefix: string) =>
    parts.map((part, index) => {
      if (!part.strong && !part.em && !part.mark && !part.href) {
        return part.text;
      }

      return (
        <Text
          key={`${keyPrefix}-${index}`}
          onPress={part.href ? () => Linking.openURL(part.href as string).catch(() => {}) : undefined}
          style={[
            part.strong && [styles.strongText, { color: categoryColor }],
            part.em && [styles.emText, { color: themeText }],
            part.mark && styles.markText,
            part.href && [styles.linkText, { color: categoryColor }],
          ]}
        >
          {part.text}
        </Text>
      );
    });

  const renderParagraph = (content: string, type: 'p' | 'blockquote') => {
    const normalized = normalizeParagraph(content);
    if (!normalized) return;
    if (normalized.length >= 40 && seenParagraphs.has(normalized)) return;
    seenParagraphs.add(normalized);

    const plainText = htmlToPlainText(content);
    const isPoetryParagraph = /«[^»]+»/.test(plainText);
    const isNumberedListParagraph = /^[0-9۰-۹]{1,2}[.)]\s*/.test(plainText);
    const isMeaningParagraph =
      /(?:د بیت معنی|د شعر معنی|د نقل قول معنی|معنی په پښتو|د مانا|په پښتو)/.test(plainText) ||
      /\((?:پشتو|پښتو)\s*:/.test(plainText) ||
      /(?:نقل‌قول|نقل قول|بیت|قول)\s*:/.test(plainText);
    const textStyle =
      type === 'blockquote'
        ? styles.blockquoteText
        : isPoetryParagraph
          ? styles.poetryLineText
          : isNumberedListParagraph
            ? styles.numberedListText
            : isMeaningParagraph
              ? styles.poetryMeaningText
              : styles.paragraphText;

    elements.push(
      <View
        key={key++}
        style={[
          type === 'blockquote' ? styles.blockquote : styles.paragraph,
          type === 'blockquote' && { borderRightColor: categoryColor },
        ]}
      >
        <Text style={[textStyle, { color: themeText }]}>
          {renderInlineParts(parseInlineParts(content), `inline-${key}`)}
        </Text>
      </View>
    );
  };

  const renderList = (content: string, ordered: boolean) => {
    const listItems: string[] = [];
    const liRegex = /<li\b[^>]*>([\s\S]*?)<\/li>/gi;
    let liMatch;
    while ((liMatch = liRegex.exec(content)) !== null) {
      if (normalizeParagraph(liMatch[1])) {
        listItems.push(liMatch[1]);
      }
    }

    if (listItems.length === 0) {
      const fallback = htmlToPlainText(content)
        .split(/\n+/)
        .map((item) => item.trim())
        .filter(Boolean);
      listItems.push(...fallback);
    }

    if (listItems.length === 0) return;

    elements.push(
      <View key={key++} style={styles.listBlock}>
        {listItems.map((item, index) => (
          <View key={`${key}-item-${index}`} style={styles.listItemRow}>
            <Text style={[styles.listBullet, { color: categoryColor }]}>
              {ordered ? `${index + 1}.` : '•'}
            </Text>
            <Text style={[styles.listItemText, { color: themeText }]}>
              {renderInlineParts(parseInlineParts(item), `list-${key}-${index}`)}
            </Text>
          </View>
        ))}
      </View>
    );
  };

  const items: { type: BlockType; content: string; position: number }[] = [];
  const blockRegex = /<(h2|h3|p|blockquote|ul|ol)\b[^>]*>([\s\S]*?)<\/\1>/gi;
  let blockMatch;
  while ((blockMatch = blockRegex.exec(normalizedHtml)) !== null) {
    items.push({
      type: blockMatch[1].toLowerCase() as BlockType,
      content: blockMatch[2],
      position: blockMatch.index,
    });
  }

  items.sort((a, b) => a.position - b.position);

  const seenParagraphs = new Set<string>();

  items.forEach((item) => {
    if (item.type === 'h2' || item.type === 'h3') {
      elements.push(
        <View key={key++} style={[styles.headingContainer, item.type === 'h3' && styles.subheadingContainer]}>
          <View style={[styles.headingLine, { backgroundColor: categoryColor }]} />
          <Text style={[item.type === 'h3' ? styles.subheading : styles.heading, { color: categoryColor }]}>
            {htmlToPlainText(item.content)}
          </Text>
          <View style={[styles.headingLine, { backgroundColor: categoryColor }]} />
        </View>
      );
      return;
    }

    if (item.type === 'ul' || item.type === 'ol') {
      renderList(item.content, item.type === 'ol');
      return;
    }

    renderParagraph(item.content, item.type);
  });

  if (elements.length > 0) {
    return elements;
  }

  // Fallback: render as plain text if no structured content found
  const fallbackPlain = htmlToPlainText(normalizedHtml);
  const fallbackParagraphs = fallbackPlain
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

  return [
    <Text key={0} style={[styles.bodyText, { color: themeText }]}>
      {fallbackParagraphs.join('\n\n')}
    </Text>,
  ];
}

const AUTHOR_IDS_USE_WRITER_LABEL: string[] = [
  'sayyid_abdul_ilah_shirzadi',
  'sayyid_abdullah_shirzadi',
  'mufti_fayz_muhammad_usmani',
  'mufti_abdul_salam_abid',
  'mufti_fazlullah_noori',
  'mawlana_fazlur_rahman_ansari',
  'mufti_mohammad_sarwar_rasooli',
];

export function ArticleReader({ article }: ArticleReaderProps) {
  const { theme } = useApp();
  const category = ARTICLE_CATEGORIES[article.category];
  const categoryColors = CATEGORY_COLORS[article.category] || CATEGORY_COLORS.iman;
  const isPashtoArticle = article.language === 'pashto';
  const useWriterLabel = article.authorId && AUTHOR_IDS_USE_WRITER_LABEL.includes(article.authorId);
  const authorSectionTitle = useWriterLabel
    ? isPashtoArticle
      ? 'ليکوال'
      : 'نویسنده'
    : isPashtoArticle
      ? 'له آثارو او مکتب څخه را اخیستل شوی'
      : 'برگرفته از آثار و مکتبِ';
  const bodyForRender =
    article.category === 'asma_husna'
      ? article.body.replace(
          /<p>\s*(?:<em>)?\s*(?:نویسنده:|لیکوال:)[\s\S]*?(?:<\/em>)?\s*<\/p>/gi,
          ''
        )
      : article.body;

  // Parse HTML body
  const bodyElements = parseHTML(bodyForRender, categoryColors.primary, theme.text);

  return (
    <View style={styles.container}>
      {/* Decorative Header with Gradient */}
      <LinearGradient
        colors={categoryColors.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerGradient}
      >
        <View style={[styles.headerFrame, { borderColor: `${categoryColors.accent}60` }]}>
          <View style={[styles.headerFrameInner, { borderColor: `${categoryColors.accent}30` }]}>
            <View style={styles.headerContent}>
              <View style={styles.ornamentRow}>
                <View style={[styles.ornamentLine, { backgroundColor: categoryColors.accent }]} />
                <View
                  style={[
                    styles.headerBadge,
                    {
                      backgroundColor: 'rgba(255,255,255,0.16)',
                      borderColor: categoryColors.accent,
                    },
                  ]}
                >
                  <MaterialIcons name={category.icon as any} size={16} color="#fff" />
                  <Text style={styles.headerBadgeText}>{category.nameDari}</Text>
                </View>
                <View style={[styles.ornamentLine, { backgroundColor: categoryColors.accent }]} />
              </View>
              
              <CenteredText style={styles.title}>{article.title}</CenteredText>
              
              <View style={styles.meta}>
                <View style={[styles.metaItem, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                  <Text style={styles.metaText}>{article.authorName}</Text>
                </View>
                <View style={[styles.metaItem, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                  <Text style={styles.metaText}>{article.readingTimeEstimate} دقیقه</Text>
                </View>
              </View>
            </View>
          </View>
        </View>
      </LinearGradient>

      {/* Content with Islamic Design */}
      <View style={[styles.content, { backgroundColor: theme.background }]}>
        {/* Decorative Side Borders */}
        <View style={[styles.sideBorder, { borderColor: categoryColors.primary + '20' }]} />

        <View style={styles.contentFrame}>
          <View style={[styles.contentCorner, styles.cornerTopLeft, { borderColor: `${categoryColors.primary}40` }]} />
          <View style={[styles.contentCorner, styles.cornerTopRight, { borderColor: `${categoryColors.primary}40` }]} />
          <View style={[styles.contentCorner, styles.cornerBottomLeft, { borderColor: `${categoryColors.primary}40` }]} />
          <View style={[styles.contentCorner, styles.cornerBottomRight, { borderColor: `${categoryColors.primary}40` }]} />

          <View style={[styles.contentSeparator, { backgroundColor: `${categoryColors.primary}50` }]} />
          <View style={styles.contentInner}>
            {bodyElements.length > 0 ? (
              bodyElements
            ) : (
              // Fallback: render as plain text if parsing fails
              <Text style={[styles.bodyText, { color: theme.text }]}>
                {bodyForRender.replace(/<[^>]*>/g, '').replace(/\n\n+/g, '\n\n')}
              </Text>
            )}
          </View>
        </View>

        <View style={[styles.sideBorder, { borderColor: categoryColors.primary + '20' }]} />
      </View>

      {/* Author Bio Section with Islamic Design */}
      <View
        style={[
          styles.authorSection,
          {
            backgroundColor: theme.card,
            borderColor: categoryColors.primary + '40',
            borderTopColor: categoryColors.accent + '60',
          },
        ]}
      >
        <View style={[styles.authorHeader, { borderBottomColor: categoryColors.primary + '30' }]}>
          <Text style={[styles.authorTitle, { color: categoryColors.primary }]}>{authorSectionTitle}</Text>
        </View>
        <Text style={[styles.authorName, { color: theme.text }]}>{article.authorName}</Text>
        <Text style={[styles.authorBio, { color: theme.textSecondary }]}>{category.nameDari}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerGradient: {
    paddingTop: 80,
    paddingBottom: Spacing.xl,
    position: 'relative',
  },
  headerFrame: {
    marginHorizontal: Spacing.lg,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: 8,
  },
  headerFrameInner: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    paddingVertical: Spacing.lg,
  },
  headerContent: {
    paddingHorizontal: Spacing.lg,
    alignItems: 'center',
  },
  ornamentRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
    alignSelf: 'stretch',
  },
  ornamentLine: {
    height: 2,
    borderRadius: 1,
    flex: 1,
    opacity: 0.7,
  },
  headerBadge: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    minHeight: 30,
  },
  headerBadgeText: {
    fontSize: 12,
    color: '#fff',
    fontFamily: 'Vazirmatn',
    fontWeight: '600',
    textAlign: 'center',
    writingDirection: 'rtl',
    includeFontPadding: false,
    lineHeight: 18,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
    marginTop: Spacing.md,
    marginBottom: Spacing.md,
    fontFamily: 'Vazirmatn',
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  meta: {
    flexDirection: 'row-reverse',
    justifyContent: 'center',
    alignSelf: 'center',
    flexWrap: 'wrap',
    gap: Spacing.md,
    marginTop: Spacing.md,
  },
  metaItem: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.md,
    minHeight: 30,
    justifyContent: 'center',
    marginBottom: Spacing.xs,
  },
  metaText: {
    fontSize: 14,
    color: '#fff',
    fontFamily: 'Vazirmatn',
    fontWeight: '500',
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  content: {
    flex: 1,
    flexDirection: 'row-reverse',
    paddingTop: Spacing.xl,
  },
  sideBorder: {
    width: 4,
    borderLeftWidth: 2,
    borderRightWidth: 2,
    marginVertical: Spacing.lg,
  },
  contentFrame: {
    flex: 1,
    marginHorizontal: Spacing.lg,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xl,
    alignItems: 'stretch',
  },
  contentCorner: {
    position: 'absolute',
    width: 16,
    height: 16,
    borderColor: '#000',
    opacity: 0.7,
  },
  cornerTopLeft: {
    top: 6,
    left: 6,
    borderTopWidth: 2,
    borderLeftWidth: 2,
    borderTopLeftRadius: 6,
  },
  cornerTopRight: {
    top: 6,
    right: 6,
    borderTopWidth: 2,
    borderRightWidth: 2,
    borderTopRightRadius: 6,
  },
  cornerBottomLeft: {
    bottom: 6,
    left: 6,
    borderBottomWidth: 2,
    borderLeftWidth: 2,
    borderBottomLeftRadius: 6,
  },
  cornerBottomRight: {
    bottom: 6,
    right: 6,
    borderBottomWidth: 2,
    borderRightWidth: 2,
    borderBottomRightRadius: 6,
  },
  contentSeparator: {
    height: 1,
    width: '60%',
    marginBottom: Spacing.lg,
    opacity: 0.4,
  },
  contentInner: {
    width: '100%',
    alignItems: 'stretch',
  },
  paragraph: {
    marginBottom: Spacing.md,
    paddingVertical: Spacing.xs,
    width: '100%',
  },
  paragraphText: {
    fontSize: 19,
    lineHeight: 35,
    fontFamily: 'Vazirmatn',
    textAlign: 'right',
    marginBottom: Spacing.xs,
    letterSpacing: 0,
    writingDirection: 'rtl',
    includeFontPadding: true,
  },
  poetryLineText: {
    fontSize: 19,
    lineHeight: 33,
    fontFamily: 'Vazirmatn',
    textAlign: 'center',
    marginBottom: Spacing.xs,
    letterSpacing: 0,
    writingDirection: 'rtl',
    includeFontPadding: true,
  },
  poetryMeaningText: {
    fontSize: 17,
    lineHeight: 31,
    fontFamily: 'Vazirmatn',
    textAlign: 'right',
    letterSpacing: 0,
    writingDirection: 'rtl',
    includeFontPadding: true,
  },
  numberedListText: {
    fontSize: 18,
    lineHeight: 31,
    fontFamily: 'Vazirmatn',
    textAlign: 'right',
    marginBottom: 6,
    letterSpacing: 0,
    writingDirection: 'rtl',
    includeFontPadding: true,
  },
  bodyText: {
    fontSize: 19,
    lineHeight: 35,
    fontFamily: 'Vazirmatn',
    textAlign: 'right',
    letterSpacing: 0,
    writingDirection: 'rtl',
    width: '100%',
    includeFontPadding: true,
  },
  headingContainer: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    marginVertical: Spacing.md,
    marginHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  headingLine: {
    width: 20,
    height: 2,
    borderRadius: 2,
    opacity: 0.6,
    flexShrink: 0,
  },
  heading: {
    flex: 1,
    fontSize: 22,
    fontWeight: '700',
    fontFamily: 'Vazirmatn',
    marginHorizontal: Spacing.md,
    textAlign: 'center',
    lineHeight: 34,
    letterSpacing: 0,
    writingDirection: 'rtl',
    includeFontPadding: true,
  },
  subheadingContainer: {
    marginVertical: Spacing.sm,
  },
  subheading: {
    flex: 1,
    fontSize: 20,
    fontWeight: '700',
    fontFamily: 'Vazirmatn',
    marginHorizontal: Spacing.md,
    textAlign: 'right',
    lineHeight: 32,
    letterSpacing: 0,
    writingDirection: 'rtl',
    includeFontPadding: true,
  },
  blockquote: {
    marginBottom: Spacing.md,
    paddingVertical: Spacing.sm,
    paddingRight: Spacing.md,
    borderRightWidth: 3,
    width: '100%',
  },
  blockquoteText: {
    fontSize: 18,
    lineHeight: 33,
    fontFamily: 'Vazirmatn',
    textAlign: 'right',
    letterSpacing: 0,
    writingDirection: 'rtl',
    includeFontPadding: true,
  },
  listBlock: {
    width: '100%',
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  listItemRow: {
    flexDirection: 'row-reverse',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  listBullet: {
    minWidth: 28,
    fontSize: 18,
    lineHeight: 32,
    fontFamily: 'Vazirmatn',
    fontWeight: '800',
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  listItemText: {
    flex: 1,
    fontSize: 18,
    lineHeight: 32,
    fontFamily: 'Vazirmatn',
    textAlign: 'right',
    letterSpacing: 0,
    writingDirection: 'rtl',
    includeFontPadding: true,
  },
  strongText: {
    fontWeight: '700',
    fontSize: 19,
    letterSpacing: 0,
    writingDirection: 'rtl',
    includeFontPadding: true,
  },
  emText: {
    fontStyle: 'italic',
    fontSize: 19,
    letterSpacing: 0,
    writingDirection: 'rtl',
    includeFontPadding: true,
  },
  markText: {
    backgroundColor: '#F3E2A0',
    color: '#3D2E00',
    borderRadius: 4,
    paddingHorizontal: 2,
    paddingVertical: 1,
    fontSize: 19,
    letterSpacing: 0,
    writingDirection: 'rtl',
    includeFontPadding: true,
  },
  linkText: {
    fontSize: 19,
    fontWeight: '700',
    textDecorationLine: 'underline',
    letterSpacing: 0,
    writingDirection: 'rtl',
    includeFontPadding: true,
  },
  authorSection: {
    margin: Spacing.lg,
    marginTop: Spacing.xl,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 2,
    borderTopWidth: 4,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  authorHeader: {
    borderBottomWidth: 1,
    paddingBottom: Spacing.sm,
    marginBottom: Spacing.md,
    width: '100%',
    alignItems: 'center',
  },
  authorTitle: {
    fontSize: 18,
    fontWeight: '700',
    fontFamily: 'Vazirmatn',
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  authorName: {
    fontSize: 20,
    fontWeight: '700',
    fontFamily: 'Vazirmatn',
    marginBottom: Spacing.xs,
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  authorBio: {
    fontSize: 14,
    fontFamily: 'Vazirmatn',
    textAlign: 'center',
    writingDirection: 'rtl',
  },
});
