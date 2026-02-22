/**
 * Scholar Layout
 * Layout for scholar routes
 */

import { Stack } from 'expo-router';

export default function ScholarLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="login" />
      <Stack.Screen name="dashboard" />
      <Stack.Screen name="analytics" />
      <Stack.Screen name="article" />
    </Stack>
  );
}
