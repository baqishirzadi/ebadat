import type { HanafiMuftiLanguage } from '@/utils/hanafiMufti';

/** Detect script-specific Pashto first, then common Dari words; otherwise use
 * the interface language as the least surprising fallback. */
export function detectMuftiMessageLanguage(text: string, appLanguage: HanafiMuftiLanguage): HanafiMuftiLanguage {
  if (/[ğüşöçıİĞÜŞÖÇ]/u.test(text)) return 'turkish';
  if (/[ټډړږښڅځڼۍ]/u.test(text)) return 'pashto';
  const normalized = ` ${text.toLowerCase().replace(/[،,.!?؟؛:()[\]{}]/g, ' ')} `;
  if (/\s(est|bir|bu|icin|için|nasil|nasıl|neden|namaz)\s/u.test(normalized)) return 'turkish';
  if (/\s(است|می|را|این|برای|چرا|چی|شما|باشد|هست)\s/u.test(normalized)) return 'dari';
  if (/\s(دی|ده|دا|چې|څه|ولې|ستاسو|تاسو|کړئ|کوي|شي)\s/u.test(normalized)) return 'pashto';
  if (/\s(في|من|على|هذا|التي|الذي|كان|كانت)\s/u.test(normalized)) return 'arabic';
  return appLanguage;
}
