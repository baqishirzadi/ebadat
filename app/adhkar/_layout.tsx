/**
 * Adhkar Stack Layout
 */

import { Stack } from 'expo-router';

import { useAppLanguage } from '@/context/AppContext';
import { isRtlLanguage } from '@/utils/i18n/languages';

export default function AdhkarLayout() {
  const language = useAppLanguage();
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        animation: isRtlLanguage(language) ? 'slide_from_right' : 'slide_from_left',
      }}
    />
  );
}
