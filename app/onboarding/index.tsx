import { Redirect } from 'expo-router';

/**
 * Welcome was folded into the language screen. Keep this route so old deep
 * links and resume paths still land on the first onboarding step.
 */
export default function OnboardingIndexRedirect() {
  return <Redirect href="/onboarding/language" />;
}
