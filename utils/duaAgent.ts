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

/**
 * Ask the edge function to publish any due scheduled answers (10–60 min delay).
 * Fire-and-forget from the app so answers appear without an external cron.
 * Throttled so tab switches / sync loops do not spam the network.
 */
const PROCESS_DUE_MIN_INTERVAL_MS = 3 * 60 * 1000;
let lastProcessDueAt = 0;
let processDueInFlight: Promise<void> | null = null;

export async function processDueDuaAnswers(options?: { force?: boolean }): Promise<void> {
  const force = options?.force === true;
  const now = Date.now();
  if (!force && now - lastProcessDueAt < PROCESS_DUE_MIN_INTERVAL_MS) {
    return;
  }
  if (processDueInFlight) {
    return processDueInFlight;
  }

  lastProcessDueAt = now;
  processDueInFlight = (async () => {
    try {
      await fetch(DUA_FUNCTION_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'process_due' }),
      });
    } catch (error) {
      console.warn('[DuaAgent] processDueDuaAnswers failed:', error);
    } finally {
      processDueInFlight = null;
    }
  })();

  return processDueInFlight;
}

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
      // Try to parse error response
      let errorData: any;
      try {
        const errorText = await response.text();
        errorData = JSON.parse(errorText);
      } catch {
        // If parsing fails, use generic error
        errorData = { error: 'Unknown error', details: 'Could not parse error response' };
      }

      // Log full error details
      console.warn('[DuaAgent] Function error', {
        status: response.status,
        statusText: response.statusText,
        error: errorData.error,
        details: errorData.details,
        userMessage: errorData.userMessage,
      });

      // Handle specific error cases
      if (response.status === 429) {
        // Quota exceeded - use user-friendly message if available
        const message = errorData.userMessage || 
          'سرویس پاسخ خودکار در حال حاضر در دسترس نیست. لطفاً بعداً تلاش کنید.';
        throw new Error(message);
      }

      if (response.status === 400) {
        // Validation error
        const message = errorData.details || errorData.error || 'درخواست نامعتبر است.';
        throw new Error(message);
      }

      if (response.status === 503) {
        // Service unavailable
        const message = errorData.details || 'سرویس در حال حاضر در دسترس نیست. لطفاً بعداً تلاش کنید.';
        throw new Error(message);
      }

      // For other errors, use userMessage if available, otherwise details, otherwise generic
      const errorMessage = errorData.userMessage || 
        errorData.details || 
        errorData.error || 
        'سرویس پاسخ خودکار در حال حاضر در دسترس نیست. لطفاً بعداً تلاش کنید.';
      throw new Error(errorMessage);
    }

    const data = (await response.json().catch(() => null)) as
      | { reply?: string }
      | null;

    if (!data || typeof data.reply !== 'string') {
      throw new Error('پاسخ نامعتبر از سرویس دریافت شد.');
    }

    return data.reply;
  } catch (error: any) {
    // If error already has a message (from above), re-throw it
    if (error instanceof Error && error.message) {
      console.warn('[DuaAgent] Error calling dua-autonomous:', error.message);
      throw error;
    }

    // Network or other unexpected errors
    const msg =
      typeof error?.message === 'string'
        ? error.message
        : 'ارتباط با سرویس برقرار نشد. لطفاً اتصال اینترنت خود را بررسی کنید.';
    console.warn('[DuaAgent] Error calling dua-autonomous:', msg);
    throw new Error(msg);
  }
}

