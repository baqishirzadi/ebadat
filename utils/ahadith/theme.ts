import { ThemeColors, ThemeMode } from '@/constants/theme';

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function normalizeHex(hex: string): string {
  const clean = hex.replace('#', '').trim();
  if (clean.length === 3) {
    return clean
      .split('')
      .map((char) => `${char}${char}`)
      .join('');
  }
  return clean.padEnd(6, '0').slice(0, 6);
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const normalized = normalizeHex(hex);
  return {
    r: parseInt(normalized.slice(0, 2), 16),
    g: parseInt(normalized.slice(2, 4), 16),
    b: parseInt(normalized.slice(4, 6), 16),
  };
}

function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (value: number) => clamp(Math.round(value), 0, 255).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function tone(hex: string, amount: number): string {
  const rgb = hexToRgb(hex);
  return rgbToHex(rgb.r + amount, rgb.g + amount, rgb.b + amount);
}

export function deriveDailyCardGradient(theme: ThemeColors, themeMode: ThemeMode): [string, string, string] {
  const isDark = themeMode === 'night';
  const start = isDark ? tone(theme.primary, -26) : tone(theme.primary, -12);
  const middle = theme.primary;
  const end = isDark ? tone(theme.surface, -10) : tone(theme.surface, 8);
  return [start, middle, end];
}

export function alphaColor(hex: string, alpha: number): string {
  const rgb = hexToRgb(hex);
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${clamp(alpha, 0, 1)})`;
}
