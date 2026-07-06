import React, { createContext, useContext, useMemo, type ReactNode } from 'react';

export interface StartupBootstrapState {
  needsOnboarding: boolean;
  hasCity: boolean;
  setupDone: boolean;
  checked: boolean;
}

const StartupBootstrapContext = createContext<StartupBootstrapState>({
  needsOnboarding: false,
  hasCity: false,
  setupDone: false,
  checked: false,
});

export function StartupBootstrapProvider({
  value,
  children,
}: {
  value: StartupBootstrapState;
  children: ReactNode;
}) {
  const memo = useMemo(() => value, [value.needsOnboarding, value.hasCity, value.setupDone, value.checked]);
  return (
    <StartupBootstrapContext.Provider value={memo}>{children}</StartupBootstrapContext.Provider>
  );
}

export function useStartupBootstrap(): StartupBootstrapState {
  return useContext(StartupBootstrapContext);
}
