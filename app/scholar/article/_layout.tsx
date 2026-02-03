/**
 * Scholar Article Layout
 * Layout for article editing routes
 */

import { Stack } from 'expo-router';

export default function ScholarArticleLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="new" />
      <Stack.Screen name="[id]" />
    </Stack>
  );
}
