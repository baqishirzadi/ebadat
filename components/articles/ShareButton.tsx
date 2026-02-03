/**
 * Share Button Component
 * Floating share button
 */

import React from 'react';
import { StyleSheet, Pressable, Share, Alert } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useApp } from '@/context/AppContext';
import { Article } from '@/types/articles';
import { trackShare } from '@/utils/analyticsService';
import { Spacing, BorderRadius } from '@/constants/theme';

interface ShareButtonProps {
  article: Article;
}

export function ShareButton({ article }: ShareButtonProps) {
  const { theme } = useApp();

  const handleShare = async () => {
    try {
      await Share.share({
        message: `${article.title}\n\n${article.authorName}`,
        title: article.title,
      });
      await trackShare(article.id);
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  return (
    <Pressable
      onPress={handleShare}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: theme.card,
          borderColor: theme.cardBorder,
        },
        pressed && styles.buttonPressed,
      ]}
    >
      <MaterialIcons name="share" size={24} color={theme.text} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  buttonPressed: {
    opacity: 0.8,
  },
});
