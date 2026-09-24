import React, { forwardRef } from 'react';
import {
  Text as NativeText,
  TextInput as NativeTextInput,
  StyleSheet,
  type TextInputProps,
  type TextProps,
  type TextStyle,
} from 'react-native';

import { useAppLanguage, useLocalizedFontPreferences } from '@/context/AppContext';
import { isAppUiFontStyle, resolveUiFontStyle } from '@/utils/i18n/resolveUiFontFamily';
import { localizeUiNode } from '@/utils/i18n/ui';

interface LocalizedTextProps extends TextProps {
  /** Used only for deliberate font samples or calligraphic styling. */
  preserveFontFamily?: boolean;
}

interface LocalizedTextInputProps extends TextInputProps {
  preserveFontFamily?: boolean;
}

/** Text primitive that follows the selected app font without translating content. */
export const LocalizedText = forwardRef<NativeText, LocalizedTextProps>(function LocalizedText(
  { style, preserveFontFamily = false, children, ...props },
  ref,
) {
  const language = useAppLanguage();
  const fonts = useLocalizedFontPreferences();
  const explicitFontFamily = StyleSheet.flatten(style as TextStyle)?.fontFamily;
  const fontStyle = preserveFontFamily && explicitFontFamily
    ? { fontFamily: explicitFontFamily }
    : resolveUiFontStyle(style, language, fonts);
  const latinDigits =
    language === 'english' && !preserveFontFamily && isAppUiFontStyle(style);

  return (
    <NativeText ref={ref} {...props} style={[style, fontStyle]}>
      {localizeUiNode(children, language, { latinDigits, translate: false }) as React.ReactNode}
    </NativeText>
  );
});

/** TextInput primitive that keeps input and placeholder typography in sync. */
export const LocalizedTextInput = forwardRef<NativeTextInput, LocalizedTextInputProps>(function LocalizedTextInput(
  { style, preserveFontFamily = false, ...props },
  ref,
) {
  const language = useAppLanguage();
  const fonts = useLocalizedFontPreferences();
  const explicitFontFamily = StyleSheet.flatten(style as TextStyle)?.fontFamily;
  const fontStyle = preserveFontFamily && explicitFontFamily
    ? { fontFamily: explicitFontFamily }
    : resolveUiFontStyle(style, language, fonts);

  return <NativeTextInput ref={ref} {...props} style={[style, fontStyle]} />;
});
