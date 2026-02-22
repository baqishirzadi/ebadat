/**
 * CenteredText Component
 * Universal text component with center alignment
 * Used for RTL languages (Arabic, Dari, Pashto)
 */

import React from 'react';
import { Text, TextProps, StyleSheet } from 'react-native';

export function CenteredText(props: TextProps) {
  const { style, ...rest } = props;
  
  return (
    <Text
      {...rest}
      style={[styles.centered, style]}
    />
  );
}

const styles = StyleSheet.create({
  centered: {
    textAlign: 'center',
    writingDirection: 'rtl',
    // Note: width: '100%' was removed because it breaks flex layouts
  },
});

// Export as default for convenience
export default CenteredText;
