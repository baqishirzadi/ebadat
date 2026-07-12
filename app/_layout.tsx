/**
 * Root Layout
 * Provides theme, fonts, contexts, and spiritual launch experience
 * With FULL RTL support for Arabic, Dari, and Pashto
 */

import { SplashScreen, Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useRef, useState, createContext, useContext, type ReactNode } from 'react';
import { AppState, I18nManager, InteractionManager, LogBox, Platform, StyleSheet, Text, View } from 'react-native';
import 'react-native-reanimated';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ErrorBoundary } from '@/components/ErrorBoundary';
import { OnboardingStartupRedirect } from '@/components/onboarding/OnboardingStartupRedirect';
import { FirstOpenAdhanSetup } from '@/components/prayer/FirstOpenAdhanSetup';
import { SpiritualSplash } from '@/components/SpiritualSplash';
import { AhadithProvider } from '@/context/AhadithContext';
import { AppProvider, useApp } from '@/context/AppContext';
import { ArticlesProvider } from '@/context/ArticlesContext';
import { DuaProvider } from '@/context/DuaContext';
import { NaatProvider } from '@/context/NaatContext';
import { PrayerProvider } from '@/context/PrayerContext';
import { ScholarProvider } from '@/context/ScholarContext';
import { StartupBootstrapProvider, useStartupBootstrap } from '@/context/StartupBootstrapContext';
import { StartupPhaseProvider, useStartupPhase } from '@/context/StartupPhaseContext';
import { StatsProvider } from '@/context/StatsContext';
import { getKabulNoon } from '@/utils/afghanistanCalendar';
import { getCalendarMonthGridMeta } from '@/utils/calendarMonthGrid';
import { warmCalendarEventsCache } from '@/utils/calendarEvents';
import { getCalendarTruth } from '@/utils/calendarTruth';
import '@/utils/cityDatabase';
import { preloadPopularSurahs } from '@/hooks/useSurahData';
import { ensurePushRegistrationOnFirstOpen } from '@/utils/pushRegistry';
import { getSavedPrayerCityKey, isFirstOpenAdhanSetupDone, runPermissionOnboardingGrandfatherMigration } from '@/utils/prayerOnboarding';

const STARTUP_EPOCH_MS = Date.now();
const STARTUP_TIMING_ENABLED = true;
function startupMark(label: string): void {
  if (!STARTUP_TIMING_ENABLED) return;
  const elapsed = Date.now() - STARTUP_EPOCH_MS;
  console.warn(`[Startup][${elapsed}ms] ${label}`);
}

// Force RTL for Dari/Pashto/Arabic UI (required on some Android/Huawei builds)
if (!I18nManager.isRTL) {
  startupMark('RTL not active; enabling RTL support');
  I18nManager.allowRTL(true);
  const rtlGuard = globalThis as typeof globalThis & { __EBADAT_RTL_FORCE_DONE__?: boolean };
  if (!rtlGuard.__EBADAT_RTL_FORCE_DONE__) {
    rtlGuard.__EBADAT_RTL_FORCE_DONE__ = true;
    I18nManager.forceRTL(true);
    startupMark('Applied one-time RTL force');
  }
}

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

if (__DEV__) {
  LogBox.ignoreLogs([
    '`expo-av` has been deprecated',
    'expo-av has been deprecated',
    'Expo AV has been deprecated',
    'Remote notifications are not supported in the simulator',
    'Push notifications are not supported in the iOS Simulator',
    'obtaining a push token may not work on iOS simulators',
    'Legacy Architecture',
    'The app is running using the Legacy Architecture',
    'Sending `onAnimatedValueUpdate` with no listeners registered',
  ]);
}

// Keep splash screen visible while loading
SplashScreen.preventAutoHideAsync();
startupMark('Splash screen hold started');

// Default RTL text style - Apply this to all text components
export const RTL_TEXT_STYLE = {
  textAlign: 'right' as const,
  writingDirection: 'rtl' as const,
};

const SpiritualSplashActiveContext = createContext(true);

function useSpiritualSplashActive(): boolean {
  return useContext(SpiritualSplashActiveContext);
}

const SPLASH_ABSOLUTE_MAX_MS = 15000;
const SPLASH_APP_READY_MAX_MS = 12000;

function StartupSplashGate({ onAppReady }: { onAppReady: () => void }) {
  const { isInteractiveReady } = useStartupPhase();
  const { checked: bootstrapChecked } = useStartupBootstrap();
  const firedRef = useRef(false);

  useEffect(() => {
    if (firedRef.current) return;
    if (isInteractiveReady && bootstrapChecked) {
      firedRef.current = true;
      startupMark('Startup splash gate: app interactive and bootstrap ready');
      onAppReady();
    }
  }, [bootstrapChecked, isInteractiveReady, onAppReady]);

  useEffect(() => {
    const watchdog = setTimeout(() => {
      if (firedRef.current) return;
      firedRef.current = true;
      startupMark('Startup splash gate watchdog fired');
      onAppReady();
    }, SPLASH_APP_READY_MAX_MS);
    return () => clearTimeout(watchdog);
  }, [onAppReady]);

  return null;
}

function SpiritualSplashOverlay({
  onComplete,
  dismiss,
}: {
  onComplete: () => void;
  dismiss: boolean;
}) {
  const { markSplashCompleted } = useStartupPhase();
  const nativeSplashHiddenRef = useRef(false);

  const hideNativeSplashOnce = useCallback(() => {
    if (nativeSplashHiddenRef.current) return;
    nativeSplashHiddenRef.current = true;
    SplashScreen.hideAsync().catch(() => {});
    startupMark('Native splash hidden after spiritual splash layout');
  }, []);

  useEffect(() => {
    const absoluteMaxTimer = setTimeout(() => {
      startupMark('Splash absolute max timer fired; forcing splash complete');
      onComplete();
    }, SPLASH_ABSOLUTE_MAX_MS);

    return () => clearTimeout(absoluteMaxTimer);
  }, [onComplete]);

  return (
    <>
      <SpiritualSplash
        onReady={hideNativeSplashOnce}
        onGreetingComplete={() => {
          startupMark('Spiritual splash greeting complete; loading phase');
          markSplashCompleted();
        }}
        dismiss={dismiss}
        onComplete={() => {
          startupMark('Spiritual splash dismissed');
          onComplete();
        }}
      />
      <StatusBar style="light" />
    </>
  );
}

function RootLayoutNav() {
  const { theme, state } = useApp();
  const { isInteractiveReady, markInteractiveReady, markDeferredInit, phase } = useStartupPhase();
  const { needsOnboarding, checked: bootstrapChecked } = useStartupBootstrap();
  const router = useRouter();
  const showSpiritualSplash = useSpiritualSplashActive();
  const lastHandledNotificationKeyRef = useRef<string>('');
  const pendingNotificationResponseRef = useRef<import('expo-notifications').NotificationResponse | null>(null);
  const appStateRef = useRef(AppState.currentState);

  // Determine status bar style based on theme
  const statusBarStyle = state.preferences.theme === 'night' ? 'light' : 'dark';

  const waitForAppActive = useCallback(async () => {
    if (appStateRef.current === 'active') return;

    await new Promise<void>((resolve) => {
      const timeout = setTimeout(() => {
        sub.remove();
        resolve();
      }, 1800);

      const sub = AppState.addEventListener('change', (nextState) => {
        appStateRef.current = nextState;
        if (nextState === 'active') {
          clearTimeout(timeout);
          sub.remove();
          resolve();
        }
      });
    });
  }, []);

  const handleNotificationResponse = useCallback(async (response: import('expo-notifications').NotificationResponse) => {
    const data = response.notification.request.content.data || {};
    const type = String((data as Record<string, unknown>).type || '');
    const articleId = (data as Record<string, unknown>).articleId;
    const hadithId = (data as Record<string, unknown>).hadithId;
    const requestId = response.notification.request.identifier || '';
    const routeKey = `${requestId}|${type}|${String(articleId || '')}|${String(hadithId || '')}`;

    if (routeKey && routeKey === lastHandledNotificationKeyRef.current) {
      return;
    }

    if (showSpiritualSplash) {
      pendingNotificationResponseRef.current = response;
      return;
    }

    lastHandledNotificationKeyRef.current = routeKey;
    await waitForAppActive();

    if (type === 'article_published' && articleId) {
      router.push({
        pathname: '/articles/[id]',
        params: { id: String(articleId) },
      });
      return;
    }

    if (type === 'hadith_published' && hadithId) {
      router.push(
        {
          pathname: '/ahadith/[id]',
          params: { id: String(hadithId) },
        } as any
      );
      return;
    }

    if (type === 'ahadith_daily') {
      router.push({
        pathname: '/(tabs)/ahadith',
        params: { section: 'daily' },
      } as any);
    }
  }, [router, showSpiritualSplash, waitForAppActive]);

  useEffect(() => {
    if (Platform.OS === 'web') return;

    let subscription: { remove: () => void } | null = null;
    const appStateSubscription = AppState.addEventListener('change', (nextState) => {
      appStateRef.current = nextState;
    });

    const setupNotificationRouting = async () => {
      try {
        const Notifications = await import('expo-notifications');
        subscription = Notifications.addNotificationResponseReceivedListener((response) => {
          void handleNotificationResponse(response);
        });

        const initialResponse = await Notifications.getLastNotificationResponseAsync();
        if (initialResponse) {
          void handleNotificationResponse(initialResponse);
        }
      } catch (error) {
        if (__DEV__) {
          console.warn('[Notifications] Failed to setup article routing', error);
        }
      }
    };

    void setupNotificationRouting();

    return () => {
      subscription?.remove();
      appStateSubscription.remove();
    };
  }, [handleNotificationResponse]);

  useEffect(() => {
    if (showSpiritualSplash) return;
    const queued = pendingNotificationResponseRef.current;
    if (!queued) return;
    pendingNotificationResponseRef.current = null;
    void handleNotificationResponse(queued);
  }, [handleNotificationResponse, showSpiritualSplash]);

  useEffect(() => {
    if (isInteractiveReady) return;

    let cancelled = false;
    let idleTimer: ReturnType<typeof setTimeout> | null = null;
    const task = InteractionManager.runAfterInteractions(() => {
      idleTimer = setTimeout(() => {
        if (!cancelled) {
          markInteractiveReady();
          startupMark('Interactive ready');
        }
      }, Platform.OS === 'android' ? 100 : 400);
    });

    return () => {
      cancelled = true;
      task.cancel();
      if (idleTimer) {
        clearTimeout(idleTimer);
      }
    };
  }, [isInteractiveReady, markInteractiveReady]);

  useEffect(() => {
    if (!isInteractiveReady) return;

    let cancelled = false;

    const runDeferredStartup = async () => {
      try {
        const [cityKey, setupDone] = await Promise.all([
          getSavedPrayerCityKey(),
          isFirstOpenAdhanSetupDone(),
        ]);
        if (cancelled) return;
        if (cityKey || setupDone) {
          await ensurePushRegistrationOnFirstOpen();
        }
        markDeferredInit();
      } catch (error) {
        if (__DEV__) {
          console.warn('[Startup] Deferred first-open setup failed', error);
        }
      }
    };

    void runDeferredStartup();

    const preloadTask = InteractionManager.runAfterInteractions(() => {
      setTimeout(() => {
        if (!cancelled && bootstrapChecked && !needsOnboarding) {
          preloadPopularSurahs();
        }
      }, 800);
    });

    return () => {
      cancelled = true;
      preloadTask.cancel();
    };
  }, [bootstrapChecked, isInteractiveReady, markDeferredInit, needsOnboarding]);

  useEffect(() => {
    if (bootstrapChecked && needsOnboarding) return;
    let cancelled = false;
    const task = InteractionManager.runAfterInteractions(() => {
      if (cancelled) return;
      const today = getCalendarTruth(getKabulNoon(new Date()));
      getCalendarMonthGridMeta('qamari', today.hijri.year, today.hijri.month);
      getCalendarMonthGridMeta('shamsi', today.shamsi.year, today.shamsi.month);
      const greg = today.gregorianDate;
      getCalendarMonthGridMeta('gregorian', greg.getUTCFullYear(), greg.getUTCMonth() + 1);
      warmCalendarEventsCache(today.gregorianDate);
    });

    return () => {
      cancelled = true;
      task.cancel();
    };
  }, [bootstrapChecked, needsOnboarding]);

  return (
    <>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: theme.background },
          animation: I18nManager.isRTL ? 'slide_from_right' : 'slide_from_left',
        }}
      >
        <Stack.Screen name="onboarding" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="quran" options={{ headerShown: false }} />
        <Stack.Screen name="adhkar" options={{ headerShown: false }} />
        <Stack.Screen name="qibla" options={{ headerShown: false }} />
        <Stack.Screen name="search" options={{ headerShown: true }} />
        <Stack.Screen name="counter" options={{ presentation: 'modal' }} />
        <Stack.Screen name="calendar" options={{ headerShown: true }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'اطلاعات' }} />
        {/* Rely on file-based routing for the rest (dua-request, admin, articles, scholar).
            Removing explicit Stack.Screen entries prevents \"No route named ...\" warnings
            when Expo Router regenerates routes. */}
        {/* <Stack.Screen name="dua-request" options={{ headerShown: false }} /> */}
        {/* <Stack.Screen name="admin" options={{ headerShown: false }} /> */}
        {/* <Stack.Screen name="articles" options={{ headerShown: false }} /> */}
        {/* <Stack.Screen name="scholar" options={{ headerShown: false }} /> */}
      </Stack>
      <OnboardingStartupRedirect />
      <FirstOpenAdhanSetup />
      {/* On Android, fill the area behind the status bar with the same color
          as the Quran header to avoid any white strip above the header. */}
      <StatusBar style={statusBarStyle} />
      {__DEV__ ? <StartupDebugBadge phase={phase} interactiveReady={isInteractiveReady} /> : null}
    </>
  );
}

export default function RootLayout() {
  const [fontsLoaded, setFontsLoaded] = useState(true);
  const [fontPhaseDone, setFontPhaseDone] = useState(false);
  const [showSpiritualSplash, setShowSpiritualSplash] = useState(true);
  const [splashDismissReady, setSplashDismissReady] = useState(false);
  const [bootstrap, setBootstrap] = useState({
    needsOnboarding: false,
    hasCity: false,
    setupDone: false,
    checked: false,
  });

  useEffect(() => {
    startupMark('Using bundled native fonts');
    setFontsLoaded(true);
    setFontPhaseDone(true);
  }, []);

  useEffect(() => {
    if (!fontsLoaded) return;

    let cancelled = false;
    const bootstrapStartup = async () => {
      startupMark('Bootstrap state read started');
      try {
        const [cityKey, setupDone] = await Promise.all([
          getSavedPrayerCityKey(),
          isFirstOpenAdhanSetupDone(),
        ]);
        await runPermissionOnboardingGrandfatherMigration();
        if (cancelled) return;

        const hasCity = Boolean(cityKey?.trim());
        setBootstrap({
          hasCity,
          setupDone,
          needsOnboarding: !setupDone,
          checked: true,
        });
        startupMark('Bootstrap state read completed');
      } catch {
        if (!cancelled) {
          setBootstrap((prev) => ({ ...prev, checked: true }));
        }
        startupMark('Bootstrap state read failed');
      }
    };
    void bootstrapStartup();

    return () => {
      cancelled = true;
    };
  }, [fontsLoaded]);

  useEffect(() => {
    if (!fontsLoaded || bootstrap.checked) return;
    const bootstrapWatchdog = setTimeout(() => {
      startupMark('Bootstrap watchdog fired; marking checked');
      setBootstrap((prev) => ({ ...prev, checked: true }));
    }, 7000);
    return () => clearTimeout(bootstrapWatchdog);
  }, [bootstrap.checked, fontsLoaded]);

  if (!fontsLoaded) {
    return (
      <SafeAreaProvider>
        <View style={styles.loadingContainer} />
      </SafeAreaProvider>
    );
  }

  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <StartupPhaseProvider>
          <StartupPhaseBridge fontPhaseDone={fontPhaseDone} />
          <StartupBootstrapProvider value={bootstrap}>
            <SpiritualSplashActiveContext.Provider value={showSpiritualSplash}>
              {showSpiritualSplash ? (
                <View style={styles.splashOverlay} pointerEvents="auto">
                  <SpiritualSplashOverlay
                    dismiss={splashDismissReady}
                    onComplete={() => setShowSpiritualSplash(false)}
                  />
                </View>
              ) : null}
              <AppProviders>
                <RootLayoutNav />
                <StartupSplashGate onAppReady={() => setSplashDismissReady(true)} />
              </AppProviders>
            </SpiritualSplashActiveContext.Provider>
          </StartupBootstrapProvider>
        </StartupPhaseProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}

function AppProviders({ children }: { children: ReactNode }) {
  return (
    <AppProvider>
      <PrayerProvider>
        <StatsProvider>
          <DuaProvider>
            <NaatProvider>
              <AhadithProvider>
                <ArticlesProvider>
                  <ScholarProvider>{children}</ScholarProvider>
                </ArticlesProvider>
              </AhadithProvider>
            </NaatProvider>
          </DuaProvider>
        </StatsProvider>
      </PrayerProvider>
    </AppProvider>
  );
}

function StartupPhaseBridge({ fontPhaseDone }: { fontPhaseDone: boolean }) {
  const { markFontsLoaded } = useStartupPhase();

  useEffect(() => {
    if (fontPhaseDone) {
      markFontsLoaded();
    }
  }, [fontPhaseDone, markFontsLoaded]);

  return null;
}

function StartupDebugBadge({
  phase,
  interactiveReady,
}: {
  phase: string;
  interactiveReady: boolean;
}) {
  const elapsed = Date.now() - STARTUP_EPOCH_MS;
  return (
    <View style={styles.debugBadge}>
      <Text style={styles.debugText}>startup: {phase}</Text>
      <Text style={styles.debugText}>interactive: {interactiveReady ? 'yes' : 'no'}</Text>
      <Text style={styles.debugText}>elapsed: {elapsed}ms</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  appRoot: {
    flex: 1,
  },
  splashOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
    elevation: 99,
    backgroundColor: '#0a1f18',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#0a1f18',
  },
  loadingFallback: {
    position: 'absolute',
    bottom: 24,
    alignSelf: 'center',
    alignItems: 'center',
    gap: 8,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
  },
  debugBadge: {
    position: 'absolute',
    left: 10,
    bottom: 10,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 2,
  },
  debugText: {
    color: '#fff',
    fontSize: 11,
  },
});
