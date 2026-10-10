import type { AppLanguage } from '@/types/quran';

const PERSIAN_TO_TURKISH: Record<string, string> = {
  'استانبول': 'İstanbul',
  'آنکارا': 'Ankara',
  'آدانا': 'Adana',
  'آنتالیا': 'Antalya',
  'ترکیه': 'Türkiye',
};

/** Latin labels that lost Turkish letters in the city database. */
const LATIN_FIXES: Record<string, string> = {
  istanbul: 'İstanbul',
  canakkale: 'Çanakkale',
  umraniye: 'Ümraniye',
};

function foldLatin(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ı/g, 'i')
    .replace(/İ/g, 'i');
}

function hasArabicScript(value: string): boolean {
  return /[\u0600-\u06FF]/.test(value);
}

/** Turkish place label. Other languages should keep the authored city name. */
export function formatTurkishPlaceName(
  name: string | null | undefined,
  nameEn?: string | null,
): string {
  const raw = (name || '').trim();
  if (PERSIAN_TO_TURKISH[raw]) return PERSIAN_TO_TURKISH[raw];

  const source = hasArabicScript(raw) ? (nameEn || '').trim() : raw || (nameEn || '').trim();
  const stripped = source.replace(/\s+province$/i, '').trim();
  if (!stripped) return raw;
  if (PERSIAN_TO_TURKISH[stripped]) return PERSIAN_TO_TURKISH[stripped];
  return LATIN_FIXES[foldLatin(stripped)] || stripped;
}

export function turkishCountryLabel(country?: string | null, countryName?: string | null): string | null {
  if (
    country === 'TR' ||
    countryName === 'ترکیه' ||
    countryName === 'Turkiye' ||
    countryName === 'Turkey' ||
    countryName === 'Türkiye'
  ) {
    return 'Türkiye';
  }
  return null;
}

export function displayCityLabel(
  city: { name: string; nameEn?: string | null },
  language: AppLanguage,
): string {
  if (language !== 'turkish') return city.name;
  return formatTurkishPlaceName(city.name, city.nameEn);
}
