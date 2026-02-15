/**
 * Adhkar Stack Layout
 */

import { Stack } from 'expo-router';
import { I18nManager } from 'react-native';

export default function AdhkarLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        animation: I18nManager.isRTL ? 'slide_from_right' : 'slide_from_left',
      }}
    />
  );
}
