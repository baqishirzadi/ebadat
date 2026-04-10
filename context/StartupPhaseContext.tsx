import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

interface StartupPhaseContextValue {
  isInteractiveReady: boolean;
  markInteractiveReady: () => void;
}

const StartupPhaseContext = createContext<StartupPhaseContextValue | undefined>(undefined);

export function StartupPhaseProvider({ children }: { children: React.ReactNode }) {
  const [isInteractiveReady, setIsInteractiveReady] = useState(false);

  const markInteractiveReady = useCallback(() => {
    setIsInteractiveReady((current) => (current ? current : true));
  }, []);

  const value = useMemo(
    () => ({
      isInteractiveReady,
      markInteractiveReady,
    }),
    [isInteractiveReady, markInteractiveReady]
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
