/**
 * Articles Layout
 * Layout for articles routes
 */

import { Stack } from 'expo-router';

export default function ArticlesLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="[id]" />
    </Stack>
  );
}
