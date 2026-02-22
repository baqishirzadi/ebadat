/**
 * Bookmark Button Component
 * Floating bookmark button
 */

import React from 'react';
import { StyleSheet, Pressable } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useApp } from '@/context/AppContext';
import { Spacing, BorderRadius } from '@/constants/theme';

interface BookmarkButtonProps {
  isBookmarked: boolean;
  onToggle: () => void;
}

export function BookmarkButton({ isBookmarked, onToggle }: BookmarkButtonProps) {
  const { theme } = useApp();

  return (
    <Pressable
      onPress={onToggle}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: isBookmarked ? theme.tint : theme.card,
          borderColor: isBookmarked ? theme.tint : theme.cardBorder,
        },
        pressed && styles.buttonPressed,
      ]}
    >
      <MaterialIcons
        name={isBookmarked ? 'bookmark' : 'bookmark-border'}
        size={24}
        color={isBookmarked ? '#fff' : theme.text}
      />
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
