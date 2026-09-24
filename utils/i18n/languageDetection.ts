import type { HanafiMuftiLanguage } from '@/utils/hanafiMufti';

/** Detect script-specific Pashto first, then common Dari words; otherwise use
 * the interface language as the least surprising fallback. */
export function detectMuftiMessageLanguage(text: string, appLanguage: HanafiMuftiLanguage): HanafiMuftiLanguage {
  if (/[ټډړږښڅځڼۍ]/u.test(text)) return 'pashto';
  const normalized = ` ${text.toLowerCase().replace(/[،,.!?؟؛:()[\]{}]/g, ' ')} `;
  if (/\s(است|می|را|این|برای|چرا|چی|شما|باشد|هست)\s/u.test(normalized)) return 'dari';
  if (/\s(دی|ده|دا|چې|څه|ولې|ستاسو|تاسو|کړئ|کوي|شي)\s/u.test(normalized)) return 'pashto';
  return appLanguage;
}
