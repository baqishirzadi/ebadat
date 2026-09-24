import { useCallback, useMemo } from 'react';

import { getDariFontFamily, getPashtoFontFamily } from '@/hooks/useFonts';
import { useAppLanguage, useLocalizedFontPreferences } from '@/context/AppContext';
import type { AppLanguage } from '@/types/quran';
import { formatNumber, localizeDigits } from '@/utils/numbers';
import { translateUi, type UiMessageKey, type UiMessageParams } from '@/utils/i18n/catalog';
import { pickContent, pickContentList, pickLanguage } from '@/utils/i18n/content';
import { getLanguage, isRtlLanguage } from '@/utils/i18n/languages';

/**
 * Everything a screen needs to render in the active language: translation,
 * content resolution, numerals, direction and typography.
 */
export function useI18n() {
  const language = useAppLanguage();
  const fonts = useLocalizedFontPreferences();

  const fontFamily = useMemo(() => {
    if (language === 'english') return undefined;
    return language === 'pashto'
      ? getPashtoFontFamily(fonts?.pashtoFont ?? 'amiri')
      : getDariFontFamily(fonts?.dariFont ?? 'vazirmatn');
  }, [fonts?.dariFont, fonts?.pashtoFont, language]);

  const t = useCallback(
    (key: UiMessageKey, params?: UiMessageParams) => translateUi(key, language, params),
    [language],
  );

  /** Localized numeral, e.g. `n(12)` -> "۱۲" in Dari, "12" in English. */
  const n = useCallback((value: number) => formatNumber(value, language), [language]);

  /** Rewrite every digit inside a string to the active numeral system. */
  const digits = useCallback((text: string) => localizeDigits(text, language), [language]);

  /** Read a localized field off a content record, with fallback. */
  const content = useCallback(
    (record: object | null | undefined, base: string | null) =>
      pickContent(record, base, language),
    [language],
  );

  const contentList = useCallback(
    (record: object | null | undefined, base: string | null) =>
      pickContentList(record, base, language),
    [language],
  );

  /** Resolve an inline `{ dari, pashto, english }` map. */
  const choose = useCallback(
    <T,>(values: Partial<Record<AppLanguage, T>>) => pickLanguage(values, language),
    [language],
  );

  const definition = getLanguage(language);

  return {
    language,
    isPashto: language === 'pashto',
    isEnglish: language === 'english',
    isRtl: isRtlLanguage(language),
    direction: definition.direction,
    locale: definition.locale,
    fontFamily,
    t,
    n,
    digits,
    content,
    contentList,
    choose,
  };
}
