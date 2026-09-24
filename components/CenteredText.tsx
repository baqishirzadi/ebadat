/**
 * CenteredText Component
 * Universal centered text primitive. Keeps the bidi base direction aligned
 * with the active language so mixed Arabic/Latin lines read correctly.
 */

import React from 'react';
import { Text, TextProps, StyleSheet } from 'react-native';
import { useAppLanguage, useLocalizedFontPreferences } from '@/context/AppContext';
import { localizeUiNode } from '@/utils/i18n/ui';
import { isAppUiFontStyle, resolveUiFontStyle } from '@/utils/i18n/resolveUiFontFamily';
import { writingDirectionFor } from '@/utils/i18n/direction';

export function CenteredText(props: TextProps) {
  const { style, children, ...rest } = props;
  const language = useAppLanguage();
  const fonts = useLocalizedFontPreferences();
  const fontStyle = resolveUiFontStyle(style, language, fonts);
  const latinDigits = language === 'english' && isAppUiFontStyle(style);

  return (
    <Text
      {...rest}
      style={[
        styles.centered,
        style,
        { writingDirection: writingDirectionFor(language) },
        fontStyle,
      ]}
    >
      {localizeUiNode(children, language, { latinDigits }) as React.ReactNode}
    </Text>
  );
}

const styles = StyleSheet.create({
  centered: {
    textAlign: 'center',
    // Note: width: '100%' was removed because it breaks flex layouts
  },
});

// Export as default for convenience
export default CenteredText;
