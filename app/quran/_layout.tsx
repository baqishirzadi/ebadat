/**
 * Quran Stack Layout
 */

import { Stack } from 'expo-router';

import { useAppLanguage } from '@/context/AppContext';
import { usePortraitLock } from '@/hooks/usePortraitLock';
import { isRtlLanguage } from '@/utils/i18n/languages';

export default function QuranLayout() {
  const language = useAppLanguage();
  // Covers the reader in translation and 16-line mode, and the juz page.
  usePortraitLock();
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        animation: isRtlLanguage(language) ? 'slide_from_right' : 'slide_from_left',
      }}
    >
      <Stack.Screen name="[surah]" options={{ headerShown: false }} />
      <Stack.Screen name="juz/[juz]" options={{ headerShown: false }} />
    </Stack>
  );
}
