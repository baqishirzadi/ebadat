import { Stack } from 'expo-router';

import { useAppLanguage } from '@/context/AppContext';
import { isRtlLanguage } from '@/utils/i18n/languages';

export default function OnboardingLayout() {
  const language = useAppLanguage();
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: isRtlLanguage(language) ? 'slide_from_right' : 'slide_from_left',
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="language" />
      <Stack.Screen name="madhhab" />
      <Stack.Screen name="location" />
      <Stack.Screen name="notifications" />
      <Stack.Screen name="exact-alarms" />
      <Stack.Screen name="battery" />
    </Stack>
  );
}
