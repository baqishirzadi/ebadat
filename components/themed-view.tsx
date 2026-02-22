/**
 * ThemedView Component
 * View component that automatically uses theme colors
 */

import { View, type ViewProps } from 'react-native';
import { useApp } from '@/context/AppContext';

export type ThemedViewProps = ViewProps & {
  lightColor?: string;
  darkColor?: string;
};

export function ThemedView({ style, lightColor, darkColor, ...otherProps }: ThemedViewProps) {
  const { theme, state } = useApp();
  
  // Get background color based on theme
  let backgroundColor = theme.background;
  if (state.preferences.theme === 'night' && darkColor) {
    backgroundColor = darkColor;
  } else if (state.preferences.theme !== 'night' && lightColor) {
    backgroundColor = lightColor;
  }

  return <View style={[{ backgroundColor }, style]} {...otherProps} />;
}
