/**
 * Article Reader
 * Book-like RTL reading page: tinted hero, justified body in the article's own
 * language font, and an author card. Sizes and page colour come from the
 * reader settings.
 */

import React, { useMemo } from 'react';
import { Linking, StyleSheet, View, type TextStyle } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

import { ArticleText, useArticleUsesNastaliq } from '@/components/articles/ArticleText';
import {
  ARTICLE_DIRECTION,
  categoryIcon,
  categoryName,
  categoryPalette,
  scholarInitial,
  scholarTone,
  withAlpha,
} from '@/components/articles/articleTheme';
import { parseArticleBlocks, type ArticleBlock, type InlineRun } from '@/components/articles/parseArticleBlocks';
import { useArticleReaderSettings } from '@/hooks/useArticleReaderSettings';
import type { Article } from '@/types/articles';
import { translateUi } from '@/utils/i18n/catalog';
import { formatNumber } from '@/utils/numbers';

interface ArticleReaderProps {
  article: Article;
  /** Space reserved above the hero for the floating top bar. */
  topInset?: number;
  /** Rendered under the author card, e.g. bookmark and share buttons. */
  footer?: React.ReactNode;
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

const MAX_COLUMN_WIDTH = 680;

type RenderGroup =
  | { kind: 'block'; block: ArticleBlock }
  | { kind: 'poetry'; lines: InlineRun[][] };

/** Consecutive poetry lines share one framed stanza. */
function groupBlocks(blocks: ArticleBlock[]): RenderGroup[] {
  const groups: RenderGroup[] = [];
  for (const block of blocks) {
    const previous = groups[groups.length - 1];
    if (block.kind === 'poetry') {
      if (previous?.kind === 'poetry') previous.lines.push(block.runs);
      else groups.push({ kind: 'poetry', lines: [block.runs] });
    } else {
      groups.push({ kind: 'block', block });
    }
  }
  return groups;
}

export function ArticleReader({ article, topInset = 12, footer }: ArticleReaderProps) {
  const { settings, tokens } = useArticleReaderSettings();
  const bodyAlign = settings.align;
  const language = article.language;
  const palette = categoryPalette(article.category);
  const isNastaliq = useArticleUsesNastaliq(language);
  const isPashtoArticle = language === 'pashto';

  const fontSize = tokens.fontSize;
  const ratio = tokens.lineHeightRatio * (isNastaliq ? 1.25 : 1);
  const lineHeight = Math.round(fontSize * ratio);
  const headingColor = tokens.isDark ? palette.accent : palette.primary;
  const strongColor = tokens.isDark ? '#F4F8F6' : palette.deep;

  const useWriterLabel = !!article.authorId && AUTHOR_IDS_USE_WRITER_LABEL.includes(article.authorId);
  const authorSectionTitle = useWriterLabel
    ? isPashtoArticle
      ? 'ليکوال'
      : 'نویسنده'
    : isPashtoArticle
      ? 'له آثارو او مکتب څخه را اخیستل شوی'
      : 'برگرفته از آثار و مکتبِ';

  const groups = useMemo(() => {
    const body =
      article.category === 'asma_husna'
        ? article.body.replace(/<p>\s*(?:<em>)?\s*(?:نویسنده:|لیکوال:)[\s\S]*?(?:<\/em>)?\s*<\/p>/gi, '')
        : article.body;
    return groupBlocks(parseArticleBlocks(body));
  }, [article.body, article.category]);

  const minutes = translateUi('articles.minutes', language, {
    count: formatNumber(Math.max(1, article.readingTimeEstimate || 1), language),
  });
  const category = categoryName(article.category, language);

  const renderRuns = (runs: InlineRun[], keyPrefix: string) =>
    runs.map((run, index) => {
      if (!run.strong && !run.em && !run.mark && !run.href) return run.text;
      const runStyle: TextStyle[] = [];
      if (run.strong) runStyle.push({ fontWeight: '700', color: strongColor });
      if (run.em) runStyle.push({ color: tokens.textSecondary });
      if (run.mark) runStyle.push({ backgroundColor: withAlpha(palette.accent, tokens.isDark ? 0.3 : 0.32) });
      if (run.href) runStyle.push({ color: headingColor, textDecorationLine: 'underline' });
      return (
        <ArticleText
          key={`${keyPrefix}-${index}`}
          language={language}
          style={runStyle}
          onPress={run.href ? () => Linking.openURL(run.href as string).catch(() => {}) : undefined}
        >
          {run.text}
        </ArticleText>
      );
    });

  const bodyText: TextStyle = { fontSize, lineHeight, color: tokens.text };
  const paragraphGap = Math.round(fontSize * 0.85);

  const renderGroup = (group: RenderGroup, index: number) => {
    const key = `block-${index}`;

    if (group.kind === 'poetry') {
      return (
        <View
          key={key}
          style={[
            styles.stanza,
            { backgroundColor: tokens.surface, borderColor: withAlpha(palette.primary, 0.18), marginBottom: paragraphGap },
          ]}
        >
          <Ornament color={withAlpha(headingColor, 0.55)} />
          {group.lines.map((runs, lineIndex) => (
            <ArticleText
              key={`${key}-${lineIndex}`}
              language={language}
              align="center"
              style={[bodyText, { fontSize: fontSize + 1, lineHeight: Math.round((fontSize + 1) * ratio) }]}
            >
              {renderRuns(runs, `${key}-${lineIndex}`)}
            </ArticleText>
          ))}
        </View>
      );
    }

    const block = group.block;

    if (block.kind === 'heading') {
      const size = block.level === 2 ? fontSize + 3 : fontSize + 1;
      return (
        <View
          key={key}
          style={[
            styles.headingRow,
            { marginTop: index === 0 ? 4 : Math.round(fontSize * 1.3), marginBottom: Math.round(fontSize * 0.55) },
          ]}
        >
          <View
            style={[
              styles.headingBar,
              { backgroundColor: headingColor, height: Math.round(size * 1.15), width: block.level === 2 ? 4 : 3 },
            ]}
          />
          <ArticleText
            language={language}
            style={[styles.headingText, { fontSize: size, lineHeight: Math.round(size * (isNastaliq ? 2 : 1.6)), color: headingColor }]}
          >
            {block.text}
          </ArticleText>
        </View>
      );
    }

    if (block.kind === 'list') {
      return (
        <View key={key} style={[styles.list, { marginBottom: paragraphGap }]}>
          {block.items.map((runs, itemIndex) => (
            <View key={`${key}-${itemIndex}`} style={styles.listRow}>
              {block.ordered ? (
                <ArticleText language={language} style={[bodyText, styles.listNumber, { color: headingColor }]}>
                  {`${formatNumber(itemIndex + 1, language)}.`}
                </ArticleText>
              ) : (
                <View style={[styles.bullet, { backgroundColor: headingColor, marginTop: lineHeight / 2 - 3 }]} />
              )}
              <ArticleText language={language} align={bodyAlign} style={[bodyText, styles.listText]}>
                {renderRuns(runs, `${key}-${itemIndex}`)}
              </ArticleText>
            </View>
          ))}
        </View>
      );
    }

    if (block.kind === 'meaning' || block.kind === 'quote') {
      const isQuote = block.kind === 'quote';
      const size = isQuote ? fontSize : fontSize - 2;
      return (
        <View
          key={key}
          style={[
            styles.aside,
            {
              backgroundColor: isQuote ? 'transparent' : tokens.surface,
              borderRightColor: withAlpha(headingColor, isQuote ? 0.8 : 0.45),
              marginBottom: paragraphGap,
            },
          ]}
        >
          <ArticleText
            language={language}
            align={bodyAlign}
            style={{
              fontSize: size,
              lineHeight: Math.round(size * ratio),
              color: isQuote ? tokens.text : tokens.textSecondary,
            }}
          >
            {renderRuns(block.runs, key)}
          </ArticleText>
        </View>
      );
    }

    return (
      <ArticleText
        key={key}
        language={language}
        align={bodyAlign}
        style={[bodyText, { marginBottom: block.kind === 'numbered' ? Math.round(paragraphGap * 0.6) : paragraphGap }]}
      >
        {renderRuns(block.runs, key)}
      </ArticleText>
    );
  };

  return (
    <View style={[styles.container, ARTICLE_DIRECTION, { backgroundColor: tokens.page }]}>
      <View
        style={[
          styles.hero,
          {
            paddingTop: topInset + 12,
            backgroundColor: withAlpha(palette.primary, tokens.isDark ? 0.2 : 0.08),
            borderBottomColor: withAlpha(palette.primary, tokens.isDark ? 0.35 : 0.14),
          },
        ]}
      >
        <View style={styles.column}>
          <View style={[styles.categoryChip, { backgroundColor: withAlpha(headingColor, tokens.isDark ? 0.18 : 0.12) }]}>
            <MaterialIcons name={categoryIcon(article.category) as any} size={14} color={headingColor} />
            <ArticleText language={language} style={[styles.categoryChipText, { color: headingColor }]}>
              {category}
            </ArticleText>
          </View>

          <ArticleText language={language} style={[styles.title, { color: tokens.text }, isNastaliq && styles.titleNastaliq]}>
            {article.title}
          </ArticleText>

          <View style={styles.byline}>
            <Avatar name={article.authorName} size={42} />
            <View style={styles.bylineText}>
              <ArticleText language={language} numberOfLines={1} style={[styles.bylineName, { color: tokens.text }]}>
                {article.authorName}
              </ArticleText>
              <ArticleText language={language} numberOfLines={1} style={[styles.bylineMeta, { color: tokens.textSecondary }]}>
                {minutes}
              </ArticleText>
            </View>
          </View>
        </View>
      </View>

      <View style={[styles.body, styles.column]}>
        {groups.map(renderGroup)}

        <Ornament color={withAlpha(headingColor, 0.5)} spaced />

        <View style={[styles.authorCard, { backgroundColor: tokens.surface, borderColor: tokens.border }]}>
          <Avatar name={article.authorName} size={54} />
          <View style={styles.authorText}>
            <ArticleText language={language} style={[styles.authorLabel, { color: tokens.textSecondary }]}>
              {authorSectionTitle}
            </ArticleText>
            <ArticleText language={language} style={[styles.authorName, { color: tokens.text }]}>
              {article.authorName}
            </ArticleText>
            <ArticleText language={language} style={[styles.authorMeta, { color: headingColor }]}>
              {category}
            </ArticleText>
          </View>
        </View>

        {footer}
      </View>
    </View>
  );
}

function Avatar({ name, size }: { name: string; size: number }) {
  return (
    <View
      style={[
        styles.avatar,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: scholarTone(name) },
      ]}
    >
      <ArticleText
        language="dari"
        align="center"
        style={[styles.avatarText, { fontSize: Math.round(size * 0.42), lineHeight: Math.round(size * 0.62) }]}
      >
        {scholarInitial(name)}
      </ArticleText>
    </View>
  );
}

function Ornament({ color, spaced = false }: { color: string; spaced?: boolean }) {
  return (
    <View style={[styles.ornament, spaced && styles.ornamentSpaced]}>
      <View style={[styles.ornamentLine, { backgroundColor: color }]} />
      <View style={[styles.ornamentDiamond, { borderColor: color }]} />
      <View style={[styles.ornamentDot, { backgroundColor: color }]} />
      <View style={[styles.ornamentDiamond, { borderColor: color }]} />
      <View style={[styles.ornamentLine, { backgroundColor: color }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  column: {
    width: '100%',
    maxWidth: MAX_COLUMN_WIDTH,
    alignSelf: 'center',
  },
  hero: {
    paddingHorizontal: 22,
    paddingBottom: 26,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
    marginBottom: 14,
  },
  categoryChipText: {
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '700',
  },
  title: {
    fontSize: 27,
    lineHeight: 44,
    fontWeight: '700',
    marginBottom: 18,
  },
  titleNastaliq: {
    lineHeight: 60,
  },
  byline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  bylineText: {
    flex: 1,
    gap: 1,
  },
  bylineName: {
    fontSize: 15,
    lineHeight: 24,
    fontWeight: '700',
  },
  bylineMeta: {
    fontSize: 13,
    lineHeight: 21,
  },
  body: {
    paddingHorizontal: 22,
    paddingTop: 26,
    paddingBottom: 140,
  },
  headingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headingBar: {
    borderRadius: 2,
  },
  headingText: {
    flex: 1,
    fontWeight: '700',
  },
  stanza: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 14,
  },
  aside: {
    borderRightWidth: 3,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  list: {
    gap: 8,
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  listNumber: {
    minWidth: 22,
    fontWeight: '700',
  },
  listText: {
    flex: 1,
  },
  bullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  ornament: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 6,
  },
  ornamentSpaced: {
    marginTop: 18,
    marginBottom: 26,
  },
  ornamentLine: {
    width: 36,
    height: 1,
  },
  ornamentDiamond: {
    width: 7,
    height: 7,
    borderWidth: 1,
    transform: [{ rotate: '45deg' }],
  },
  ornamentDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  authorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderWidth: 1,
    borderRadius: 18,
    padding: 16,
  },
  authorText: {
    flex: 1,
    gap: 2,
  },
  authorLabel: {
    fontSize: 12.5,
    lineHeight: 20,
  },
  authorName: {
    fontSize: 17,
    lineHeight: 27,
    fontWeight: '700',
  },
  authorMeta: {
    fontSize: 13,
    lineHeight: 21,
  },
  avatar: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
