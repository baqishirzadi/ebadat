/**
 * Admin-only: draft a human-like دعای خیر reply via the Hanafi Mufti API.
 * Fills «پاسخ پیشنهادی» — admin still taps ثبت پاسخ to publish.
 */

import { UserGender } from '@/types/dua';
import type { ResponderId } from '@/constants/responders';
import { askHanafiMufti, isHanafiMuftiConfigured } from '@/utils/hanafiMufti';
import type { HanafiMuftiErrorCode, HanafiMuftiLanguage } from '@/utils/hanafiMufti';
import { detectMuftiMessageLanguage } from '@/utils/i18n/languageDetection';
import { translateUi } from '@/utils/i18n/catalog';

export function isHanafiDuaSuggestionConfigured(): boolean {
  return isHanafiMuftiConfigured();
}

function localizedApiError(code: HanafiMuftiErrorCode, language: HanafiMuftiLanguage): string {
  const keys: Record<HanafiMuftiErrorCode, Parameters<typeof translateUi>[0]> = {
    not_configured: 'mufti.error.notConfigured', offline: 'mufti.error.offline',
    invalid_request: 'mufti.error.invalid', unavailable: 'mufti.error.server',
    rate_limited: 'mufti.error.rateLimited', server_error: 'mufti.error.server',
    connection_error: 'mufti.error.connection', empty_response: 'mufti.error.empty',
    aborted: 'mufti.error.aborted',
  };
  return translateUi(keys[code], language);
}

function buildSuggestionPrompt(message: string, gender: UserGender, responderName: string, language: HanafiMuftiLanguage): string {
  const address =
    gender === 'female' ? 'خواهر عزیز' : gender === 'male' ? 'برادر عزیز' : 'عزیز من';

  return `تو فقط یک پیش‌نویس پاسخ دعای خیر برای پنل مدیریت می‌نویسی (نه فتوای فقهی).

درخواست کاربر:
${message.trim().slice(0, 2000)}

قواعد پاسخ:
- لحن انسان‌گونه، نرم و کوتاه تا متوسط؛ به زبان ${language === 'pashto' ? 'پښتو' : 'دری'}.
- خطاب با «${address}».
- همدلی کوتاه + دعای خیر کوتاه مخصوص همین مشکل.
- حتماً با نام صریح «ذکر شاه نقشبند» یک بخش کوتاه برای آرامش دل بیاور و روش ساده بگو (چند بار، چه وقت، با حضور قلب). ذکرهای دیگر به‌تنهایی کافی نیست.
- یک توصیه عملی لطیف؛ فتوا و حکم فقهی نده.
- ختم با نام پاسخ‌دهنده انتخاب‌شده: ${responderName}
- فقط متن پاسخ نهایی را بنویس؛ بدون مقدمهٔ توضیحی برای ادمین.`;
}

/**
 * Returns full suggestion text, or throws with a user-facing Dari message.
 */
export async function fetchHanafiDuaSuggestion(
  message: string,
  gender: UserGender = 'male',
  responderId: ResponderId,
  responderName: string,
  appLanguage: HanafiMuftiLanguage = 'dari',
  signal?: AbortSignal,
): Promise<string> {
  const preferredLanguage = detectMuftiMessageLanguage(message, appLanguage);
  if (!message.trim()) {
    throw new Error(translateUi('mufti.error.noMessage', preferredLanguage));
  }
  if (!isHanafiMuftiConfigured()) {
    throw new Error(translateUi('mufti.error.notConfigured', preferredLanguage));
  }

  let full = '';
  let streamError: string | null = null;

  await askHanafiMufti(
    [{ role: 'user', content: buildSuggestionPrompt(message, gender, responderName, preferredLanguage) }],
    {
      signal,
      responderId,
      preferredLanguage,
      onDelta: (chunk) => {
        full += chunk;
      },
      onDone: () => {},
      onError: (code) => {
        streamError = localizedApiError(code, preferredLanguage);
      },
    },
  );

  if (streamError) {
    throw new Error(streamError);
  }

  const trimmed = full.trim();
  if (!trimmed) {
    throw new Error(translateUi('mufti.error.empty', preferredLanguage));
  }
  return trimmed;
}
