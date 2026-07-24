import {
  AhadithCalendarContext,
  DailySelectionReason,
  HadithAuthenticityGrade,
  HadithSourceBook,
} from '@/types/hadith';

const SOURCE_BOOK_LABELS: Record<HadithSourceBook, string> = {
  Bukhari: 'صحیح بخاری',
  Muslim: 'صحیح مسلم',
  Ahmad: 'مسند احمد',
  AbuDawud: 'سنن ابوداوود',
  Tirmidhi: 'جامع ترمذی',
  Nasai: 'سنن نسائی',
  IbnMajah: 'سنن ابن ماجه',
};

const GRADE_LABELS_FA: Record<HadithAuthenticityGrade, string> = {
  sahih: 'صحیح',
  hasan: 'حسن',
  daif: 'ضعیف',
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
  debt: 'قرض',
  dhikr: 'ذکر',
  dhul_hijjah: 'ذوالحجه',
  dua: 'دعا',
  education: 'آموزش',
  eid_al_fitr: 'عید فطر',
  end_times: 'آخرالزمان',
  ethics: 'اخلاق',
  faith: 'ایمان',
  family: 'خانواده',
  fasting: 'روزه',
  fitan: 'فتنه‌ها',
  generosity: 'سخاوت',
  gentleness: 'نرمی',
  good_deeds: 'اعمال نیک',
  gratitude: 'شکرگزاری',
  guidance: 'هدایت',
  guests: 'مهمان‌نوازی',
  hajj: 'حج',
  heart: 'قلب',
  helping_others: 'کمک به دیگران',
  hijri_new_year: 'سال نو هجری',
  honesty: 'صداقت',
  hospitality: 'مهمان‌نوازی',
  ihsan: 'احسان',
  intention: 'نیت',
  jamaah: 'جماعت',
  jumuah: 'جمعه',
  khorasan: 'خراسان',
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
  neighbors: 'همسایه',
  orphans: 'یتیمان',
  parents: 'والدین',
  prayer: 'نماز',
  privacy: 'حریم خصوصی',
  prophet: 'پیامبر',
  purification: 'پاکی',
  purity: 'طهارت',
  qurbani: 'قربانی',
  quran: 'قرآن',
  ramadan: 'رمضان',
  reconciliation: 'آشتی',
  relationships: 'روابط',
  salman: 'سلمان فارسی',
  service: 'خدمت',
  signs_of_hour: 'نشانه‌های قیامت',
  sincerity: 'اخلاص',
  social_justice: 'عدالت اجتماعی',
  speech: 'گفتار',
  strength: 'استقامت',
  sunnah: 'سنت',
  taqwa: 'تقوا',
  tawakkul: 'توکل',
  tashreeq: 'ایام تشریق',
  travel: 'سفر',
  worship: 'عبادت',
  wudu: 'وضو',
};

export function formatSourceLabel(book: HadithSourceBook, sourceNumber: string): string {
  return `${SOURCE_BOOK_LABELS[book]} ${sourceNumber}`;
}

export function getAuthenticityGradeLabelFa(grade: HadithAuthenticityGrade): string {
  return GRADE_LABELS_FA[grade];
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
  if (context.specialDayKeys.includes('arafah')) return 'حدیث عرفه';
  if (context.specialDayKeys.includes('tashreeq')) return 'حدیث ایام تشریق';
  if (context.specialDayKeys.includes('hijri_new_year')) return 'حدیث سال نو هجری';
  if (context.specialDayKeys.includes('ramadan')) return 'حدیث رمضان';
  if (context.isFriday) return 'حدیث جمعه';
  return 'حدیث روز';
}

export function getTopicLabelFa(topic: string): string {
  const normalized = topic.toLowerCase().trim();
  return TOPIC_LABELS_FA[normalized] ?? 'سایر';
}
