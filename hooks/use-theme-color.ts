/**
 * Hook for getting theme colors based on current app theme
 */

import { useApp } from '@/context/AppContext';
import { ThemeColors } from '@/constants/theme';

export function useThemeColor(
  props: { light?: string; dark?: string },
  colorName: keyof ThemeColors
): string {
  const { theme, state } = useApp();
  const currentTheme = state.preferences.theme;

  // If explicit colors are provided for light/dark modes
  if (currentTheme === 'night' && props.dark) {
    return props.dark;
  }
  if (currentTheme !== 'night' && props.light) {
    return props.light;
  }

  // Return the color from the current theme
  return theme[colorName];
}
