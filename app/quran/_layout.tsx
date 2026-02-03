/**
 * Quran Stack Layout
 */

import { Stack } from 'expo-router';

export default function QuranLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        animation: 'slide_from_left', // RTL animation
      }}
    />
  );
}
