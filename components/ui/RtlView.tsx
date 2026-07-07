import React from 'react';
import { Platform, View, type ViewProps, type ViewStyle } from 'react-native';

const rtlContainer: ViewStyle = Platform.select({
  android: { direction: 'rtl' },
  ios: { direction: 'rtl' },
  default: {},
}) as ViewStyle;

export function RtlView({ style, ...props }: ViewProps) {
  return <View {...props} style={[rtlContainer, style]} />;
}
