import React from 'react';
import { Platform, Text, type TextProps, type TextStyle } from 'react-native';

import { persianTextLayout } from '@/constants/persianTextLayout';

const baseRtl: TextStyle = {
  ...persianTextLayout,
  alignSelf: 'stretch',
  width: '100%',
  ...(Platform.OS === 'android' ? { includeFontPadding: false } : null),
};

const baseRtlInline: TextStyle = {
  ...persianTextLayout,
  ...(Platform.OS === 'android' ? { includeFontPadding: false } : null),
};

interface RtlTextProps extends TextProps {
  align?: 'right' | 'center' | 'left';
  /** When false, text sizes to content (for chat bubbles). Default true stretches full width. */
  wrap?: boolean;
}

export function RtlText({ style, align = 'right', wrap = true, ...props }: RtlTextProps) {
  return (
    <Text
      {...props}
      style={[wrap ? baseRtl : baseRtlInline, style, { textAlign: align }]}
    />
  );
}
