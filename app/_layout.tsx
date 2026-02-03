/**
 * Root Layout
 * Provides theme, fonts, contexts, and spiritual launch experience
 * With FULL RTL support for Arabic, Dari, and Pashto
 */

import * as Font from 'expo-font';
import { SplashScreen, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { ActivityIndicator, I18nManager, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import 'react-native-reanimated';

import { ErrorBoundary } from '@/components/ErrorBoundary';
import { SpiritualSplash } from '@/components/SpiritualSplash';
import { AppProvider, useApp } from '@/context/AppContext';
import { PrayerProvider } from '@/context/PrayerContext';
import { StatsProvider } from '@/context/StatsContext';
import { DuaProvider } from '@/context/DuaContext';
import { ArticlesProvider } from '@/context/ArticlesContext';
import { ScholarProvider } from '@/context/ScholarContext';

// ═══════════════════════════════════════════════════
// CRITICAL: Force RTL for Arabic/Dari/Pashto
// ═══════════════════════════════════════════════════
if (!I18nManager.isRTL) {
  I18nManager.allowRTL(true);
  I18nManager.forceRTL(true);
  // Note: App needs to be restarted for RTL to take full effect
  // In production, this will work after first install
}

// Keep splash screen visible while loading
SplashScreen.preventAutoHideAsync();

// Font assets - All fonts needed for Arabic, Dari, and Pashto
const fontAssets = {
  // Arabic Quran Fonts
  'QuranFont': require('@/assets/fonts/QuranFont.ttf'),
  'ScheherazadeNew': require('@/assets/fonts/ScheherazadeNew-Regular.ttf'),
  'ScheherazadeNew-Bold': require('@/assets/fonts/ScheherazadeNew-Bold.ttf'),
  'Amiri': require('@/assets/fonts/Amiri-Regular.ttf'),
  'Amiri-Bold': require('@/assets/fonts/Amiri-Bold.ttf'),
  'NotoNaskhArabic': require('@/assets/fonts/NotoNaskhArabic-Regular.ttf'), // Google's Noto Naskh - excellent diacritics
  
  // Dari/Farsi Font (Modern & Beautiful)
  'Vazirmatn': require('@/assets/fonts/Vazirmatn-Regular.ttf'),
  'Vazirmatn-Bold': require('@/assets/fonts/Vazirmatn-Bold.ttf'),
  
  // Pashto Font (Nastaliq style - kept for option)
  'NotoNastaliqUrdu': require('@/assets/fonts/NotoNastaliqUrdu-Regular.ttf'),
};

// Default RTL text style - Apply this to all text components
export const RTL_TEXT_STYLE = {
  textAlign: 'right' as const,
  writingDirection: 'rtl' as const,
};

function RootLayoutNav() {
  const { theme, state } = useApp();
  const [showSpiritualSplash, setShowSpiritualSplash] = useState(true);

  // Determine status bar style based on theme
  const statusBarStyle = state.preferences.theme === 'night' ? 'light' : 'dark';

  if (showSpiritualSplash) {
    return (
      <>
        <SpiritualSplash onComplete={() => setShowSpiritualSplash(false)} />
        <StatusBar style="light" />
      </>
    );
  }

  return (
    <>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: theme.background },
          animation: 'slide_from_left', // RTL animation
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="quran" options={{ headerShown: false }} />
        <Stack.Screen name="adhkar" options={{ headerShown: false }} />
        <Stack.Screen name="qibla" options={{ headerShown: true }} />
        <Stack.Screen name="search" options={{ headerShown: true }} />
        <Stack.Screen name="counter" options={{ presentation: 'modal' }} />
        <Stack.Screen name="calendar" options={{ headerShown: true }} />
        <Stack.Screen name="ramadan" options={{ headerShown: true }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'اطلاعات' }} />
        <Stack.Screen name="dua-request" options={{ headerShown: false }} />
        <Stack.Screen name="admin" options={{ headerShown: false }} />
        <Stack.Screen name="articles" options={{ headerShown: false }} />
        <Stack.Screen name="scholar" options={{ headerShown: false }} />
      </Stack>
      <StatusBar style={statusBarStyle} />
    </>
  );
}

export default function RootLayout() {
  const [fontsLoaded, setFontsLoaded] = useState(false);
  const [fontError, setFontError] = useState<string | null>(null);

  useEffect(() => {
    async function loadFonts() {
      try {
        await Font.loadAsync(fontAssets);
        setFontsLoaded(true);
      } catch (error) {
        console.error('Error loading fonts:', error);
        setFontError(error instanceof Error ? error.message : 'Font loading failed');
        // Still allow app to load with system fonts
        setFontsLoaded(true);
      } finally {
        SplashScreen.hideAsync();
      }
    }

    loadFonts();
  }, []);

  if (!fontsLoaded) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1e6f5c" />
        <Text style={styles.loadingText}>در حال بارگذاری...</Text>
      </View>
    );
  }

  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <AppProvider>
          <PrayerProvider>
            <StatsProvider>
              <DuaProvider>
                <ArticlesProvider>
                  <ScholarProvider>
                    <RootLayoutNav />
                  </ScholarProvider>
                </ArticlesProvider>
              </DuaProvider>
            </StatsProvider>
          </PrayerProvider>
        </AppProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fefefe',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
});
