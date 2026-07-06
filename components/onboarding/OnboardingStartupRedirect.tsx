import { useRouter, useSegments } from 'expo-router';
import { useEffect, useRef } from 'react';

import { useStartupBootstrap } from '@/context/StartupBootstrapContext';

/**
 * Redirects first-install users to /onboarding before tabs render.
 */
export function OnboardingStartupRedirect() {
  const { needsOnboarding, checked } = useStartupBootstrap();
  const router = useRouter();
  const segments = useSegments();
  const redirectedRef = useRef(false);

  useEffect(() => {
    if (!checked || !needsOnboarding || redirectedRef.current) return;

    const path = segments.join('/');
    const inOnboarding = path.startsWith('onboarding');
    if (!inOnboarding) {
      redirectedRef.current = true;
      router.replace('/onboarding' as never);
    }
  }, [checked, needsOnboarding, router, segments]);

  return null;
}
