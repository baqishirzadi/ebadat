import type { AppLanguage } from '@/types/quran';

type RegionCopy = Record<AppLanguage, string>;

/** Visible region names on the city setup screens. The turkey id stays `turkey`. */
const REGION_NAMES: Record<string, RegionCopy> = {
  afghanistan: {
    dari: 'افغانستان',
    pashto: 'افغانستان',
    english: 'Afghanistan',
    turkish: 'Afganistan',
    arabic: 'أفغانستان',
  },
  iran: {
    dari: 'ایران',
    pashto: 'ایران',
    english: 'Iran',
    turkish: 'İran',
    arabic: 'إيران',
  },
  turkey: {
    dari: 'ترکیه',
    pashto: 'ترکیه',
    english: 'Turkiye',
    turkish: 'Turkiye',
    arabic: 'تركيا',
  },
  pakistan: {
    dari: 'پاکستان',
    pashto: 'پاکستان',
    english: 'Pakistan',
    turkish: 'Pakistan',
    arabic: 'باكستان',
  },
  gulf: {
    dari: 'خلیج',
    pashto: 'خلیجي هېوادونه',
    english: 'Gulf',
    turkish: 'Körfez',
    arabic: 'الخليج',
  },
  germany: {
    dari: 'آلمان',
    pashto: 'جرمني',
    english: 'Germany',
    turkish: 'Almanya',
    arabic: 'ألمانيا',
  },
  uk: {
    dari: 'انگلستان',
    pashto: 'بریتانیا',
    english: 'United Kingdom',
    turkish: 'Birleşik Krallık',
    arabic: 'المملكة المتحدة',
  },
  france: {
    dari: 'فرانسه',
    pashto: 'فرانسه',
    english: 'France',
    turkish: 'Fransa',
    arabic: 'فرنسا',
  },
  netherlands: {
    dari: 'هلند',
    pashto: 'هالنډ',
    english: 'Netherlands',
    turkish: 'Hollanda',
    arabic: 'هولندا',
  },
  'central-asia': {
    dari: 'آسیای مرکزی',
    pashto: 'منځنۍ اسیا',
    english: 'Central Asia',
    turkish: 'Orta Asya',
    arabic: 'آسيا الوسطى',
  },
  russia: {
    dari: 'روسیه',
    pashto: 'روسیه',
    english: 'Russia',
    turkish: 'Rusya',
    arabic: 'روسيا',
  },
  europe: {
    dari: 'اروپا',
    pashto: 'اروپا',
    english: 'Europe',
    turkish: 'Avrupa',
    arabic: 'أوروبا',
  },
  americas: {
    dari: 'آمریکا',
    pashto: 'امریکا',
    english: 'Americas',
    turkish: 'Amerika',
    arabic: 'الأمريكتان',
  },
  oceania: {
    dari: 'اقیانوسیه',
    pashto: 'اوشیانیا',
    english: 'Oceania',
    turkish: 'Okyanusya',
    arabic: 'أوقيانوسيا',
  },
  asia: {
    dari: 'آسیا',
    pashto: 'اسیا',
    english: 'Asia',
    turkish: 'Asya',
    arabic: 'آسيا',
  },
  africa: {
    dari: 'آفریقا',
    pashto: 'افریقا',
    english: 'Africa',
    turkish: 'Afrika',
    arabic: 'أفريقيا',
  },
};

export function regionDisplayName(
  id: string,
  language: AppLanguage,
  fallback: { name: string; nameEn: string },
): string {
  const named = REGION_NAMES[id]?.[language];
  if (named) return named;
  if (language === 'english' || language === 'turkish') {
    return id === 'turkey' ? 'Turkiye' : fallback.nameEn;
  }
  return fallback.name;
}
