import React from 'react';
import { Platform, Text, type TextProps, type TextStyle } from 'react-native';

const numericStyle: TextStyle = {
  fontFamily: 'Vazirmatn-Bold',
  fontSize: 16,
  lineHeight: 22,
  textAlign: 'center',
  writingDirection: 'ltr',
  ...(Platform.OS === 'android' ? { includeFontPadding: false, textAlignVertical: 'center' } : null),
};

/** Numeral glyphs use a stable compact face, independent of the UI language font. */
export function NumericText({ style, ...props }: TextProps) {
  return <Text {...props} style={[numericStyle, style]} />;
}
