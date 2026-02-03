/**
 * Adhkar Stack Layout
 */

import { Stack } from 'expo-router';

export default function AdhkarLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        animation: 'slide_from_left',
      }}
    />
  );
}
