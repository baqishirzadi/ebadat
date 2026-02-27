import { Stack } from 'expo-router';

export default function AhadithRoutesLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="admin" />
      <Stack.Screen name="[id]" />
    </Stack>
  );
}
