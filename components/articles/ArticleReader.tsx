/**
 * Article Reader Component
 * Beautiful Islamic-themed article display with HTML parsing
 */

import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
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
const CATEGORY_COLORS: Record<string, { primary: string; secondary: string; accent: string; gradient: string[] }> = {
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
 * Simple and robust parser for h2, p, strong, em tags
 * Fixed to prevent paragraph duplication
 */
function parseHTML(html: string, categoryColor: string, themeText: string): React.ReactNode[] {
  const elements: React.ReactNode[] = [];
  let key = 0;

  const normalizedHtml = html.replace(/<br\s*\/?>/gi, '\n');

  const normalizeParagraph = (text: string) =>
    text
      .replace(/[\u064B-\u065F]/g, '') // remove Arabic diacritics
      .replace(/[^\dA-Za-z\u0600-\u06FF]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();

  const normalizeInlineText = (raw: string): string => {
    const hasLeadingSpace = /^\s/.test(raw);
    const hasTrailingSpace = /\s$/.test(raw);
    const core = raw.replace(/\s+/g, ' ').trim();

    if (!core) return '';

    return `${hasLeadingSpace ? ' ' : ''}${core}${hasTrailingSpace ? ' ' : ''}`;
  };

  // Extract all h2 headings and p paragraphs with their positions
  const items: Array<{ type: 'h2' | 'p'; content: string; position: number }> = [];
  
  // Find all h2 headings
  const h2Regex = /<h2>(.*?)<\/h2>/gi;
  let h2Match;
  while ((h2Match = h2Regex.exec(normalizedHtml)) !== null) {
    items.push({
      type: 'h2',
      content: h2Match[1].replace(/<[^>]*>/g, '').trim(), // Strip inner tags
      position: h2Match.index,
    });
  }
  
  // Find all p paragraphs
  const pRegex = /<p>(.*?)<\/p>/gi;
  let pMatch;
      while ((pMatch = pRegex.exec(normalizedHtml)) !== null) {
    items.push({
      type: 'p',
      content: pMatch[1], // Keep inner HTML and boundary spaces for formatting
      position: pMatch.index,
    });
  }
  
  // Sort by position to maintain order
  items.sort((a, b) => a.position - b.position);
  
  // Process deduplication
  const seenParagraphs = new Set<string>();
  
  // Process items in order
  items.forEach((item) => {
    if (item.type === 'h2') {
      // Render heading
      elements.push(
        <View key={key++} style={styles.headingContainer}>
          <View style={[styles.headingLine, { backgroundColor: categoryColor }]} />
          <Text style={[styles.heading, { color: categoryColor }]}>
            {item.content}
          </Text>
          <View style={[styles.headingLine, { backgroundColor: categoryColor }]} />
        </View>
      );
    } else {
      // Process paragraph
      const normalized = normalizeParagraph(item.content);
      if (normalized.length < 10) return; // Skip very short paragraphs
      if (normalized.length >= 40 && seenParagraphs.has(normalized)) return; // Skip duplicates
      seenParagraphs.add(normalized);
      
      // Parse inline formatting (strong, em)
      const paraElements: React.ReactNode[] = [];
      let paraKey = 0;
      const textParts: React.ReactNode[] = [];
      let inStrong = false;
      let inEm = false;

      // Simple state machine for parsing inline tags
      const cleanedParaHtml = item.content.replace(/<(?!\/?(strong|em)\b)[^>]+>/gi, '');
      const tagRegex = /<\/?(strong|em)>/gi;
      let lastPos = 0;
      let tagMatch;
      
      while ((tagMatch = tagRegex.exec(cleanedParaHtml)) !== null) {
        // Text before tag
        if (tagMatch.index > lastPos) {
          const text = cleanedParaHtml.substring(lastPos, tagMatch.index);
          const normalizedText = normalizeInlineText(text);
          if (normalizedText) {
            if (inStrong) {
              textParts.push(
                <Text key={paraKey++} style={[styles.strongText, { color: categoryColor }]}>
                  {normalizedText}
                </Text>
              );
            } else if (inEm) {
              textParts.push(
                <Text key={paraKey++} style={[styles.emText, { color: themeText }]}>
                  {normalizedText}
                </Text>
              );
            } else {
              textParts.push(normalizedText);
            }
          }
        }
        
        // Handle tag
        const tagName = tagMatch[1].toLowerCase();
        const isClosing = tagMatch[0].startsWith('</');
        
        if (tagName === 'strong') {
          inStrong = !isClosing;
        } else if (tagName === 'em') {
          inEm = !isClosing;
        }
        
        lastPos = tagMatch.index + tagMatch[0].length;
      }
      
      // Remaining text
      if (lastPos < cleanedParaHtml.length) {
        const text = cleanedParaHtml.substring(lastPos);
        const normalizedText = normalizeInlineText(text);
        if (normalizedText) {
          if (inStrong) {
            textParts.push(
              <Text key={paraKey++} style={[styles.strongText, { color: categoryColor }]}>
                {normalizedText}
              </Text>
            );
          } else if (inEm) {
            textParts.push(
              <Text key={paraKey++} style={[styles.emText, { color: themeText }]}>
                {normalizedText}
              </Text>
            );
          } else {
            textParts.push(normalizedText);
          }
        }
      }
      
      if (textParts.length > 0) {
        paraElements.push(
          <Text key={paraKey++} style={[styles.paragraphText, { color: themeText }]}>
            {textParts}
          </Text>
        );
      }
      
      if (paraElements.length > 0) {
        elements.push(
          <View key={key++} style={styles.paragraph}>
            {paraElements}
          </View>
        );
      }
    }
  });

  if (elements.length > 0) {
    return elements;
  }

  // Fallback: render as plain text if no structured content found
  const fallbackPlain = normalizedHtml.replace(/<[^>]*>/g, '');
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

export function ArticleReader({ article }: ArticleReaderProps) {
  const { theme } = useApp();
  const category = ARTICLE_CATEGORIES[article.category];
  const categoryColors = CATEGORY_COLORS[article.category] || CATEGORY_COLORS.iman;
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
          <Text style={[styles.authorTitle, { color: categoryColors.primary }]}>درباره نویسنده</Text>
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
    alignItems: 'center',
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
    alignItems: 'center',
  },
  paragraph: {
    marginBottom: Spacing.md,
    paddingVertical: Spacing.xs,
    width: '100%',
  },
  paragraphText: {
    fontSize: 19,
    lineHeight: 38,
    fontFamily: 'Vazirmatn',
    textAlign: 'center',
    marginBottom: Spacing.xs,
    letterSpacing: 0.3,
    writingDirection: 'rtl',
  },
  bodyText: {
    fontSize: 19,
    lineHeight: 38,
    fontFamily: 'Vazirmatn',
    textAlign: 'center',
    letterSpacing: 0.3,
    writingDirection: 'rtl',
  },
  headingContainer: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    marginVertical: Spacing.md,
    marginHorizontal: Spacing.lg,
    paddingVertical: Spacing.xs,
  },
  headingLine: {
    flex: 1,
    height: 3,
    borderRadius: 2,
    opacity: 0.4,
  },
  heading: {
    fontSize: 26,
    fontWeight: '700',
    fontFamily: 'Vazirmatn',
    marginHorizontal: Spacing.md,
    textAlign: 'center',
    letterSpacing: 0.5,
    writingDirection: 'rtl',
  },
  strongText: {
    fontWeight: '700',
    fontSize: 19,
    letterSpacing: 0.3,
    writingDirection: 'rtl',
  },
  emText: {
    fontStyle: 'italic',
    fontSize: 19,
    letterSpacing: 0.3,
    writingDirection: 'rtl',
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
