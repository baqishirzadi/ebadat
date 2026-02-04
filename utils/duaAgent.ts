/**
 * Dua Autonomous Agent Client
 * Calls the Supabase Edge Function `dua-autonomous` and returns the reply text.
 */

export type DuaLanguage = 'fa' | 'ps';
export type DuaGender = 'male' | 'female';

// Prefer configurable URL, fallback to hard-coded Supabase function URL
const DEFAULT_DUA_FUNCTION_URL =
  'https://igsmyoghkkyetsyqbqlm.supabase.co/functions/v1/dua-autonomous';

const DUA_FUNCTION_URL =
  process.env.EXPO_PUBLIC_DUA_FUNCTION_URL ?? DEFAULT_DUA_FUNCTION_URL;

interface AskAutonomousDuaOptions {
  message: string;
  gender: DuaGender;
  language: DuaLanguage;
  requestId?: string;
}

export async function askAutonomousDua(
  options: AskAutonomousDuaOptions
): Promise<string> {
  const { message, gender, language, requestId } = options;

  // Basic validation
  if (!message.trim()) {
    throw new Error('Message is required for autonomous dua.');
  }

  try {
    const response = await fetch(DUA_FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message,
        gender,
        language,
        request_id: requestId ?? null,
      }),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      console.warn('[DuaAgent] Function error', response.status, text);
      throw new Error('Dua service temporarily unavailable. Please try again.');
    }

    const data = (await response.json().catch(() => null)) as
      | { reply?: string }
      | null;

    if (!data || typeof data.reply !== 'string') {
      throw new Error('Invalid response from dua service.');
    }

    return data.reply;
  } catch (error: any) {
    // Network or other errors
    const msg =
      typeof error?.message === 'string'
        ? error.message
        : 'Failed to contact dua service.';
    console.warn('[DuaAgent] Error calling dua-autonomous:', msg);
    throw new Error(msg);
  }
}

