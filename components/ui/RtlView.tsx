import React from 'react';
import { View, type ViewProps } from 'react-native';

import { useAppLanguage } from '@/context/AppContext';
import { directionStyle } from '@/utils/i18n/direction';

/**
 * Container that pins its subtree to the active language's layout direction.
 *
 * Yoga resolves `row`, `start`/`end` edges and logical margins against the
 * nearest node direction, so setting this explicitly keeps English laid out
 * left-to-right even while the platform layer is still RTL.
 */
export function RtlView({ style, ...props }: ViewProps) {
  const language = useAppLanguage();
  return <View {...props} style={[directionStyle(language), style]} />;
}
