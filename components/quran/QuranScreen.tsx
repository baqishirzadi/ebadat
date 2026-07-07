import React from 'react';
import { StyleSheet, type ViewProps } from 'react-native';

import { RtlView } from '@/components/ui/RtlView';

/** Forces RTL layout direction for entire Quran reader subtree. */
export function QuranScreen({ style, children, ...props }: ViewProps) {
  return (
    <RtlView style={[styles.screen, style]} {...props}>
      {children}
    </RtlView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    direction: 'rtl',
  },
});
