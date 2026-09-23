/**
 * CenteredText Component
 * Universal text component with center alignment
 * Used for RTL languages (Arabic, Dari, Pashto)
 */

import React from 'react';
import { Text, TextProps, StyleSheet } from 'react-native';
import { useAppLanguage } from '@/context/AppContext';
import { localizeUiText } from '@/utils/i18n/ui';

export function CenteredText(props: TextProps) {
  const { style, children, ...rest } = props;
  const language = useAppLanguage();
  
  return (
    <Text
      {...rest}
      style={[styles.centered, style]}
    >
      {localizeUiText(children, language) as React.ReactNode}
    </Text>
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
