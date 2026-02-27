import {
  AhadithCalendarContext,
  DailySelectionReason,
  HadithSourceBook,
} from '@/types/hadith';

const SOURCE_BOOK_LABELS: Record<HadithSourceBook, string> = {
  Bukhari: 'صحیح بخاری',
  Muslim: 'صحیح مسلم',
};

const TOPIC_LABELS_FA: Record<string, string> = {
  advice: 'نصیحت',
  akhlaq: 'اخلاق',
  arafah: 'عرفه',
  ashura: 'عاشورا',
  barakah: 'برکت',
  beauty: 'زیبایی',
  brotherhood: 'برادری',
  business: 'کسب‌وکار',
  character: 'شخصیت',
  charity: 'صدقه',
  community: 'جامعه',
  consistency: 'پایداری',
  dawah: 'دعوت',
  dhul_hijjah: 'ذوالحجه',
  dua: 'دعا',
  education: 'آموزش',
  ethics: 'اخلاق',
  faith: 'ایمان',
  family: 'خانواده',
  fasting: 'روزه',
  generosity: 'سخاوت',
  gentleness: 'نرمی',
  good_deeds: 'اعمال نیک',
  gratitude: 'شکرگزاری',
  guidance: 'هدایت',
  hajj: 'حج',
  heart: 'قلب',
  helping_others: 'کمک به دیگران',
  honesty: 'صداقت',
  ihsan: 'احسان',
  intention: 'نیت',
  jamaah: 'جماعت',
  jumuah: 'جمعه',
  knowledge: 'علم',
  laylat_al_qadr: 'شب قدر',
  legacy: 'میراث',
  love: 'محبت',
  manners: 'آداب',
  mercy: 'رحمت',
  mindset: 'نگرش',
  modesty: 'حیا',
  mosque: 'مسجد',
  muharram: 'محرم',
  prayer: 'نماز',
  privacy: 'حریم خصوصی',
  prophet: 'پیامبر',
  purification: 'پاکی',
  purity: 'طهارت',
  quran: 'قرآن',
  ramadan: 'رمضان',
  reconciliation: 'آشتی',
  relationships: 'روابط',
  service: 'خدمت',
  sincerity: 'اخلاص',
  social_justice: 'عدالت اجتماعی',
  speech: 'گفتار',
  strength: 'استقامت',
  sunnah: 'سنت',
  taqwa: 'تقوا',
  tawakkul: 'توکل',
  worship: 'عبادت',
  wudu: 'وضو',
};

export function formatSourceLabel(book: HadithSourceBook, sourceNumber: string): string {
  return `${SOURCE_BOOK_LABELS[book]} ${sourceNumber}`;
}

export function getMuttafaqBadgeLabel(): string {
  return 'متفق‌علیه';
}

export function getReasonLabelFa(reason: DailySelectionReason): string {
  if (reason === 'special_days') return 'مناسبتی';
  if (reason === 'hijri_range') return 'تقویم هجری';
  if (reason === 'weekday_only') return 'ویژه جمعه';
  return 'روزانه';
}

export function getContextTitleFa(
  context: Pick<AhadithCalendarContext, 'specialDayKeys' | 'isFriday'>
): string {
  if (context.specialDayKeys.includes('laylat_al_qadr')) return 'حدیث شب قدر';
  if (context.specialDayKeys.includes('eid_al_fitr')) return 'حدیث عید فطر';
  if (context.specialDayKeys.includes('eid_al_adha')) return 'حدیث عید قربان';
  if (context.specialDayKeys.includes('ramadan')) return 'حدیث رمضان';
  if (context.isFriday) return 'حدیث جمعه';
  return 'حدیث روز';
}

export function getTopicLabelFa(topic: string): string {
  const normalized = topic.toLowerCase().trim();
  return TOPIC_LABELS_FA[normalized] ?? 'سایر';
}
