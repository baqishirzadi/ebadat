import { Platform, type TextStyle } from 'react-native';

import type { AppLanguage } from '@/types/quran';
import { isLatinLanguage } from '@/utils/i18n/languages';
import { resolveUiFontStyle, type UiFontPreferences } from '@/utils/i18n/resolveUiFontFamily';

/** Label style for one language option, drawn in that language's own face. */
export function languageChoiceStyle(
  language: AppLanguage,
  fonts: UiFontPreferences | null | undefined,
  options?: { bold?: boolean; fontSize?: number },
): TextStyle {
  const bold = options?.bold ?? false;
  const fontSize = options?.fontSize ?? 16;
  const font = resolveUiFontStyle(
    { fontFamily: bold ? 'Vazirmatn-Bold' : 'Vazirmatn', fontWeight: bold ? '700' : '400' },
    language,
    fonts,
  );
  const latin = isLatinLanguage(language);
  const lineHeight = Math.round(fontSize * (language === 'pashto' ? 2.2 : latin ? 1.45 : 1.8));
  return {
    ...font,
    fontSize,
    lineHeight,
    textAlign: 'center',
    writingDirection: latin ? 'ltr' : 'rtl',
    ...(Platform.OS === 'android' ? { includeFontPadding: true } : null),
  };
}
