import { Stack } from 'expo-router';
import { I18nManager } from 'react-native';

export default function OnboardingLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: I18nManager.isRTL ? 'slide_from_right' : 'slide_from_left',
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="language" />
      <Stack.Screen name="location" />
      <Stack.Screen name="notifications" />
      <Stack.Screen name="exact-alarms" />
      <Stack.Screen name="battery" />
      <Stack.Screen name="autostart" />
    </Stack>
  );
}
