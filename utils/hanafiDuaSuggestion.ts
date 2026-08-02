/**
 * Admin-only: draft a human-like دعای خیر reply via the Hanafi Mufti API.
 * Fills «پاسخ پیشنهادی» — admin still taps ثبت پاسخ to publish.
 */

import { UserGender } from '@/types/dua';
import { askHanafiMufti, isHanafiMuftiConfigured } from '@/utils/hanafiMufti';

export function isHanafiDuaSuggestionConfigured(): boolean {
  return isHanafiMuftiConfigured();
}

function buildSuggestionPrompt(message: string, gender: UserGender): string {
  const address =
    gender === 'female' ? 'خواهر عزیز' : gender === 'male' ? 'برادر عزیز' : 'عزیز من';

  return `تو فقط یک پیش‌نویس پاسخ دعای خیر برای پنل مدیریت می‌نویسی (نه فتوای فقهی).

درخواست کاربر:
${message.trim().slice(0, 2000)}

قواعد پاسخ:
- لحن انسان‌گونه، نرم، کوتاه تا متوسط، به زبان دری (مگر پیام پشتو باشد).
- خطاب با «${address}».
- همدلی کوتاه + دعای خیر کوتاه مخصوص همین مشکل.
- حتماً با نام صریح «ذکر شاه نقشبند» یک بخش کوتاه برای آرامش دل بیاور و روش ساده بگو (چند بار، چه وقت، با حضور قلب). ذکرهای دیگر به‌تنهایی کافی نیست.
- یک توصیه عملی لطیف؛ فتوا و حکم فقهی نده.
- ختم با: برادرت دعاگو — سیدعبدالباقی شیرزادی
- فقط متن پاسخ نهایی را بنویس؛ بدون مقدمهٔ توضیحی برای ادمین.`;
}

/**
 * Returns full suggestion text, or throws with a user-facing Dari message.
 */
export async function fetchHanafiDuaSuggestion(
  message: string,
  gender: UserGender = 'male',
  signal?: AbortSignal,
): Promise<string> {
  if (!message.trim()) {
    throw new Error('متن درخواست خالی است.');
  }
  if (!isHanafiMuftiConfigured()) {
    throw new Error('سرویس مفتی پیکربندی نشده است.');
  }

  let full = '';
  let streamError: string | null = null;

  await askHanafiMufti(
    [{ role: 'user', content: buildSuggestionPrompt(message, gender) }],
    {
      signal,
      onDelta: (chunk) => {
        full += chunk;
      },
      onDone: () => {},
      onError: (msg) => {
        streamError = msg;
      },
    },
  );

  if (streamError) {
    throw new Error(streamError);
  }

  const trimmed = full.trim();
  if (!trimmed) {
    throw new Error('پاسخ پیشنهادی دریافت نشد. دوباره تلاش کنید.');
  }
  return trimmed;
}
