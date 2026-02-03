/**
 * Article Reader Component
 * Displays article content with proper typography
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useApp } from '@/context/AppContext';
import { Article, ARTICLE_CATEGORIES } from '@/types/articles';
import { Spacing, Typography, BorderRadius } from '@/constants/theme';
import { CategoryBadge } from './CategoryBadge';
import CenteredText from '@/components/CenteredText';
import { ScholarCard } from './ScholarCard';

interface ArticleReaderProps {
  article: Article;
}

export function ArticleReader({ article }: ArticleReaderProps) {
  const { theme } = useApp();
  const category = ARTICLE_CATEGORIES[article.category];

  // Render article body with proper paragraph formatting
  const renderBody = () => {
    // Split by double newlines for paragraphs
    const paragraphs = article.body.split(/\n\n+/).filter(p => p.trim().length > 0);
    
    return paragraphs.map((paragraph, index) => {
      // Split single newlines within paragraph for line breaks
      const lines = paragraph.trim().split('\n').filter(l => l.trim().length > 0);
      
      return (
        <View key={index} style={styles.paragraph}>
          {lines.map((line, lineIndex) => (
            <CenteredText
              key={lineIndex}
              style={[styles.bodyText, { color: theme.text }]}
            >
              {line.trim()}
            </CenteredText>
          ))}
        </View>
      );
    });
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.surahHeader }]}>
        <CategoryBadge category={article.category} />
        <CenteredText style={styles.title}>{article.title}</CenteredText>
        <View style={styles.meta}>
          <CenteredText style={styles.metaText}>
            {article.authorName} • {article.readingTimeEstimate} دقیقه
          </CenteredText>
        </View>
      </View>

      {/* Content */}
      <View style={[styles.content, { backgroundColor: theme.background }]}>
        {renderBody()}
      </View>

      {/* Author Bio Section */}
      <View style={[styles.authorSection, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
        <CenteredText style={[styles.authorTitle, { color: theme.text }]}>
          درباره نویسنده
        </CenteredText>
        <CenteredText style={[styles.authorName, { color: theme.tint }]}>
          {article.authorName}
        </CenteredText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: Spacing.lg,
    paddingTop: 80,
    paddingBottom: Spacing.xl,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
    fontFamily: 'Vazirmatn',
  },
  meta: {
    marginTop: Spacing.sm,
  },
  metaText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    fontFamily: 'Vazirmatn',
  },
  content: {
    padding: Spacing.lg,
    paddingTop: Spacing.xl,
  },
  paragraph: {
    marginBottom: Spacing.lg,
  },
  bodyText: {
    fontSize: 18,
    lineHeight: 32,
    marginBottom: Spacing.sm,
    fontFamily: 'Vazirmatn',
    textAlign: 'center',
  },
  authorSection: {
    margin: Spacing.lg,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    alignItems: 'center',
  },
  authorTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: Spacing.sm,
    fontFamily: 'Vazirmatn',
  },
  authorName: {
    fontSize: 18,
    fontWeight: '700',
    fontFamily: 'Vazirmatn',
  },
});
