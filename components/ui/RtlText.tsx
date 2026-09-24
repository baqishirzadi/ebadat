import React from 'react';
import { Platform, StyleSheet, Text, type TextProps, type TextStyle } from 'react-native';

import { persianTextLayout } from '@/constants/persianTextLayout';
import { useAppLanguage, useLocalizedFontPreferences } from '@/context/AppContext';
import { localizeUiNode } from '@/utils/i18n/ui';
import { isAppUiFontStyle, resolveUiFontStyle } from '@/utils/i18n/resolveUiFontFamily';
import { isRtl, textAlignEnd, textAlignStart, writingDirectionFor } from '@/utils/i18n/direction';
import type { AppLanguage } from '@/types/quran';

const baseLayout: TextStyle = {
  ...persianTextLayout,
  alignSelf: 'stretch',
  width: '100%',
  ...(Platform.OS === 'android' ? { includeFontPadding: false } : null),
};

const baseLayoutInline: TextStyle = {
  ...persianTextLayout,
  ...(Platform.OS === 'android' ? { includeFontPadding: false } : null),
};

interface RtlTextProps extends TextProps {
  align?: 'right' | 'center' | 'left';
  /** When false, text sizes to content (for chat bubbles). Default true stretches full width. */
  wrap?: boolean;
}

/**
 * The app was authored right-to-left, so `right` means "the reading start
 * edge" and `left` means "the reading end edge". Resolving them per language
 * lets every existing call site flip correctly in English.
 */
function resolveAlign(align: 'right' | 'center' | 'left', language: AppLanguage): TextStyle['textAlign'] {
  if (align === 'center') return 'center';
  return align === 'right' ? textAlignStart(language) : textAlignEnd(language);
}

export function RtlText({ style, align = 'right', wrap = true, children, ...props }: RtlTextProps) {
  const language = useAppLanguage();
  const fonts = useLocalizedFontPreferences();
  const fontStyle = resolveUiFontStyle(style, language, fonts);
  const latinDigits = language === 'english' && isAppUiFontStyle(style);
  const flattened = StyleSheet.flatten(style) as TextStyle | undefined;
  const includeFontPaddingOverride =
    flattened?.includeFontPadding !== undefined
      ? { includeFontPadding: flattened.includeFontPadding }
      : null;
  return (
    <Text
      {...props}
      style={[
        wrap ? baseLayout : baseLayoutInline,
        style,
        {
          textAlign: resolveAlign(align, language),
          writingDirection: writingDirectionFor(language),
        },
        fontStyle,
        includeFontPaddingOverride,
      ]}
    >
      {localizeUiNode(children, language, { latinDigits }) as React.ReactNode}
    </Text>
  );
}

export { isRtl };
