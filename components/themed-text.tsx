/**
 * ThemedText Component
 * Text component that automatically uses theme colors
 */

import { StyleSheet, type TextProps } from 'react-native';
import { useApp } from '@/context/AppContext';
import CenteredText from '@/components/CenteredText';

export type ThemedTextProps = TextProps & {
  lightColor?: string;
  darkColor?: string;
  type?: 'default' | 'title' | 'defaultSemiBold' | 'subtitle' | 'link' | 'arabic' | 'translation';
};

export function ThemedText({
  style,
  lightColor,
  darkColor,
  type = 'default',
  ...rest
}: ThemedTextProps) {
  const { theme, state } = useApp();
  
  // Get color based on theme
  let color = theme.text;
  if (state.preferences.theme === 'night' && darkColor) {
    color = darkColor;
  } else if (state.preferences.theme !== 'night' && lightColor) {
    color = lightColor;
  }
  
  // Arabic and translation types use specific theme colors
  if (type === 'arabic') {
    color = theme.arabicText;
  } else if (type === 'translation') {
    color = theme.translationText;
  }

  return (
    <CenteredText
      style={[
        { color },
        type === 'default' ? styles.default : undefined,
        type === 'title' ? styles.title : undefined,
        type === 'defaultSemiBold' ? styles.defaultSemiBold : undefined,
        type === 'subtitle' ? styles.subtitle : undefined,
        type === 'link' ? [styles.link, { color: theme.tint }] : undefined,
        type === 'arabic' ? styles.arabic : undefined,
        type === 'translation' ? styles.translation : undefined,
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  default: {
    fontSize: 16,
    lineHeight: 24,
  },
  defaultSemiBold: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '600',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    lineHeight: 32,
  },
  subtitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  link: {
    lineHeight: 30,
    fontSize: 16,
  },
  arabic: {
    fontSize: 26,
    lineHeight: 52,
writingDirection: 'rtl',
    fontFamily: 'serif',
  },
  translation: {
    fontSize: 16,
    lineHeight: 28,
writingDirection: 'rtl',
  },
});
