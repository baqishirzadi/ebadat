import { useRouter, useSegments } from 'expo-router';
import { useEffect, useRef } from 'react';

import { useStartupBootstrap } from '@/context/StartupBootstrapContext';

/**
 * Redirects first-install users to onboarding before tabs render.
 */
export function OnboardingStartupRedirect() {
  const { needsOnboarding, hasCity, checked } = useStartupBootstrap();
  const router = useRouter();
  const segments = useSegments();
  const redirectedRef = useRef(false);

  useEffect(() => {
    if (!checked || !needsOnboarding || redirectedRef.current) return;

    const path = segments.join('/');
    const inOnboarding = path.startsWith('onboarding');
    if (!inOnboarding) {
      redirectedRef.current = true;
      if (hasCity) {
        router.replace('/onboarding/notifications' as never);
      } else {
        router.replace('/onboarding' as never);
      }
    }
  }, [checked, needsOnboarding, hasCity, router, segments]);

  return null;
}
