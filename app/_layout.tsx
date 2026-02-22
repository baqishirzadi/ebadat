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
import 'react-native-reanimated';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ErrorBoundary } from '@/components/ErrorBoundary';
import { SpiritualSplash } from '@/components/SpiritualSplash';
import { AppProvider, useApp } from '@/context/AppContext';
import { ArticlesProvider } from '@/context/ArticlesContext';
import { DuaProvider } from '@/context/DuaContext';
import { NaatProvider } from '@/context/NaatContext';
import { PrayerProvider } from '@/context/PrayerContext';
import { ScholarProvider } from '@/context/ScholarContext';
import { StatsProvider } from '@/context/StatsContext';

// ───────────────────────────────────────────────────
// Global safety for unhandled promise rejections
// Prevents noisy red-screen when network is offline
// ───────────────────────────────────────────────────
const globalAny = globalThis as any;
if (!globalAny.__EBADAT_UNHANDLED_REJECTION__) {
  globalAny.__EBADAT_UNHANDLED_REJECTION__ = true;
  const handler = (reason: any) => {
    const message =
      typeof reason?.message === 'string' ? reason.message : String(reason ?? '');
    if (/network request failed|failed to fetch/i.test(message)) {
      console.warn('[UnhandledRejection] Network request failed (offline?)');
      return;
    }
    console.warn('[UnhandledRejection]', reason);
  };

  if (typeof globalAny.process?.on === 'function') {
    globalAny.process.on('unhandledRejection', handler);
  } else if (typeof globalAny.addEventListener === 'function') {
    globalAny.addEventListener('unhandledrejection', (event: any) => {
      handler(event?.reason);
      if (typeof event?.preventDefault === 'function') {
        event.preventDefault();
      }
    });
  }
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
          animation: I18nManager.isRTL ? 'slide_from_right' : 'slide_from_left',
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
        {/* Rely on file-based routing for the rest (dua-request, admin, articles, scholar).
            Removing explicit Stack.Screen entries prevents \"No route named ...\" warnings
            when Expo Router regenerates routes. */}
        {/* <Stack.Screen name="dua-request" options={{ headerShown: false }} /> */}
        {/* <Stack.Screen name="admin" options={{ headerShown: false }} /> */}
        {/* <Stack.Screen name="articles" options={{ headerShown: false }} /> */}
        {/* <Stack.Screen name="scholar" options={{ headerShown: false }} /> */}
      </Stack>
      {/* On Android, fill the area behind the status bar with the same color
          as the Quran header to avoid any white strip above the header. */}
      <StatusBar style={statusBarStyle} backgroundColor={theme.surahHeader} />
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
        setFontsLoaded(true);
      } finally {
        // Delay hide until React has painted the first frame (prevents white flash on release builds)
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            SplashScreen.hideAsync();
          });
        });
      }
    }

    loadFonts();
  }, []);

  if (!fontsLoaded) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#ffffff" />
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
                <NaatProvider>
                  <ArticlesProvider>
                    <ScholarProvider>
                      <RootLayoutNav />
                    </ScholarProvider>
                  </ArticlesProvider>
                </NaatProvider>
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
    backgroundColor: '#1a4d3e',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
  },
});
