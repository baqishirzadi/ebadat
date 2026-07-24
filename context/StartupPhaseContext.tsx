import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

export type StartupPhase =
  | 'boot'
  | 'fonts_loaded'
  | 'splash_completed'
  | 'interactive_ready'
  | 'deferred_init';

interface StartupPhaseContextValue {
  isInteractiveReady: boolean;
  /** True after first adhan schedule attempt finishes (or safety timeout). */
  isAdhanSettled: boolean;
  phase: StartupPhase;
  markFontsLoaded: () => void;
  markSplashCompleted: () => void;
  markInteractiveReady: () => void;
  markAdhanSettled: () => void;
  markDeferredInit: () => void;
}

const StartupPhaseContext = createContext<StartupPhaseContextValue | undefined>(undefined);

export function StartupPhaseProvider({ children }: { children: React.ReactNode }) {
  const [isInteractiveReady, setIsInteractiveReady] = useState(false);
  const [isAdhanSettled, setIsAdhanSettled] = useState(false);
  const [phase, setPhase] = useState<StartupPhase>('boot');

  const markFontsLoaded = useCallback(() => {
    setPhase((current) => (current === 'boot' ? 'fonts_loaded' : current));
  }, []);

  const markSplashCompleted = useCallback(() => {
    setPhase((current) => (current === 'boot' || current === 'fonts_loaded' ? 'splash_completed' : current));
  }, []);

  const markInteractiveReady = useCallback(() => {
    setIsInteractiveReady((current) => (current ? current : true));
    setPhase((current) => (current === 'interactive_ready' || current === 'deferred_init' ? current : 'interactive_ready'));
  }, []);

  const markAdhanSettled = useCallback(() => {
    setIsAdhanSettled((current) => (current ? current : true));
  }, []);

  const markDeferredInit = useCallback(() => {
    setPhase('deferred_init');
  }, []);

  const value = useMemo(
    () => ({
      isInteractiveReady,
      isAdhanSettled,
      phase,
      markFontsLoaded,
      markSplashCompleted,
      markInteractiveReady,
      markAdhanSettled,
      markDeferredInit,
    }),
    [
      isInteractiveReady,
      isAdhanSettled,
      phase,
      markFontsLoaded,
      markSplashCompleted,
      markInteractiveReady,
      markAdhanSettled,
      markDeferredInit,
    ]
  );

  return <StartupPhaseContext.Provider value={value}>{children}</StartupPhaseContext.Provider>;
}

export function useStartupPhase() {
  const context = useContext(StartupPhaseContext);
  if (!context) {
    throw new Error('useStartupPhase must be used within a StartupPhaseProvider');
  }
  return context;
}
