import React from 'react';
import { Platform, Text, type TextProps, type TextStyle } from 'react-native';

import { RTLStyles } from '@/constants/theme';

const baseRtl: TextStyle = {
  ...RTLStyles,
  alignSelf: 'stretch',
  width: '100%',
  ...(Platform.OS === 'android' ? { includeFontPadding: false } : null),
};

interface RtlTextProps extends TextProps {
  align?: 'right' | 'center' | 'left';
}

export function RtlText({ style, align = 'right', ...props }: RtlTextProps) {
  return (
    <Text
      {...props}
      style={[baseRtl, { textAlign: align }, style]}
    />
  );
}
