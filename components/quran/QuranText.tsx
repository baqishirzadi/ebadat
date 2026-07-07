/**
 * QuranText — Arabic mushaf text isolated from app-wide forceRTL mirroring.
 * Center-aligned inside direction:'ltr' wrapper for stable rendering on forceRTL devices.
 */

import React from 'react';
import {
  Platform,
  StyleSheet,
  Text,
  View,
  type TextProps,
  type TextStyle,
} from 'react-native';

const BASE_STYLE: TextStyle = {
  textAlign: 'center',
  writingDirection: 'rtl',
  ...(Platform.OS === 'android' ? { includeFontPadding: false } : null),
};

export function QuranText({ style, children, ...props }: TextProps) {
  return (
    <View style={styles.isolate}>
      <Text
        {...props}
        style={[BASE_STYLE, style]}
        textBreakStrategy={props.textBreakStrategy ?? 'simple'}
        lineBreakStrategyIOS={props.lineBreakStrategyIOS ?? 'none'}
      >
        {children}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  isolate: {
    width: '100%',
    alignSelf: 'stretch',
    direction: 'ltr',
  },
});

export default QuranText;
