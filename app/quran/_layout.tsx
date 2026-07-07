/**
 * Quran Stack Layout
 */

import { Stack } from 'expo-router';
import { I18nManager } from 'react-native';

export default function QuranLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        animation: I18nManager.isRTL ? 'slide_from_right' : 'slide_from_left',
      }}
    >
      <Stack.Screen name="[surah]" options={{ headerShown: false }} />
      <Stack.Screen name="juz/[juz]" options={{ headerShown: false }} />
    </Stack>
  );
}
