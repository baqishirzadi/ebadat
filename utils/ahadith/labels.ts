import {
  AhadithCalendarContext,
  DailySelectionReason,
  HadithAuthenticityGrade,
  HadithSourceBook,
} from '@/types/hadith';
import type { AppLanguage } from '@/types/quran';

const SOURCE_BOOK_LABELS: Record<HadithSourceBook, string> = {
  Bukhari: 'صحیح بخاری',
  Muslim: 'صحیح مسلم',
  Ahmad: 'مسند احمد',
  AbuDawud: 'سنن ابوداوود',
  Tirmidhi: 'جامع ترمذی',
  Nasai: 'سنن نسائی',
  IbnMajah: 'سنن ابن ماجه',
};

const SOURCE_BOOK_LABELS_PS: Record<HadithSourceBook, string> = {
  Bukhari: 'صحیح بخاري',
  Muslim: 'صحیح مسلم',
  Ahmad: 'مسند احمد',
  AbuDawud: 'سنن ابوداود',
  Tirmidhi: 'جامع ترمذي',
  Nasai: 'سنن نسائي',
  IbnMajah: 'سنن ابن ماجه',
};

const SOURCE_BOOK_LABELS_EN: Record<HadithSourceBook, string> = {
  Bukhari: 'Sahih al-Bukhari',
  Muslim: 'Sahih Muslim',
  Ahmad: 'Musnad Ahmad',
  AbuDawud: 'Sunan Abu Dawud',
  Tirmidhi: 'Jami‘ at-Tirmidhi',
  Nasai: 'Sunan an-Nasa’i',
  IbnMajah: 'Sunan Ibn Majah',
};

const SOURCE_BOOK_LABELS_TR: Record<HadithSourceBook, string> = {
  Bukhari: 'Sahih-i Buhari',
  Muslim: 'Sahih-i Müslim',
  Ahmad: 'Müsned-i Ahmed',
  AbuDawud: 'Sünen-i Ebu Davud',
  Tirmidhi: 'Camiu’t-Tirmizi',
  Nasai: 'Sünen-i Nesai',
  IbnMajah: 'Sünen-i İbn Mace',
};

const SOURCE_BOOK_LABELS_AR: Record<HadithSourceBook, string> = {
  Bukhari: 'صحيح البخاري',
  Muslim: 'صحيح مسلم',
  Ahmad: 'مسند أحمد',
  AbuDawud: 'سنن أبي داود',
  Tirmidhi: 'جامع الترمذي',
  Nasai: 'سنن النسائي',
  IbnMajah: 'سنن ابن ماجه',
};

const GRADE_LABELS_FA: Record<HadithAuthenticityGrade, string> = {
  sahih: 'صحیح',
  hasan: 'حسن',
  daif: 'ضعیف',
};

const GRADE_LABELS_EN: Record<HadithAuthenticityGrade, string> = {
  sahih: 'Sahih',
  hasan: 'Hasan',
  daif: 'Da‘if',
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

const TOPIC_LABELS_PS: Record<string, string> = {
  advice: 'نصیحت', akhlaq: 'اخلاق', arafah: 'عرفه', ashura: 'عاشورا', barakah: 'برکت',
  beauty: 'ښکلا', brotherhood: 'ورورولي', business: 'سوداګري', character: 'خویونه',
  charity: 'صدقه', community: 'ټولنه', consistency: 'ثبات', dawah: 'دعوت', debt: 'پور',
  dhikr: 'ذکر', dhul_hijjah: 'ذوالحجه', dua: 'دعا', education: 'زده کړه', eid_al_fitr: 'کوچنی اختر',
  end_times: 'د قیامت نښې', ethics: 'اخلاق', faith: 'ایمان', family: 'کورنۍ', fasting: 'روژه',
  fitan: 'فتنې', generosity: 'سخاوت', gentleness: 'نرمي', good_deeds: 'نېک اعمال', gratitude: 'مننه',
  guidance: 'لارښوونه', guests: 'مېلمه پالنه', hajj: 'حج', heart: 'زړه', helping_others: 'له نورو سره مرسته',
  hijri_new_year: 'هجري نوی کال', honesty: 'رښتینولي', hospitality: 'مېلمه پالنه', ihsan: 'احسان',
  intention: 'نیت', jamaah: 'جماعت', jumuah: 'جمعه', khorasan: 'خراسان', knowledge: 'علم',
  laylat_al_qadr: 'د قدر شپه', legacy: 'میراث', love: 'مینه', manners: 'ادب', mercy: 'رحمت',
  mindset: 'فکر', modesty: 'حیا', mosque: 'جومات', muharram: 'محرم', neighbors: 'ګاونډیان',
  orphans: 'یتیمان', parents: 'مور او پلار', prayer: 'لمونځ', privacy: 'شخصي حریم', prophet: 'پیغمبر',
  purification: 'پاکوالی', purity: 'طهارت', qurbani: 'قرباني', quran: 'قرآن', ramadan: 'رمضان',
  reconciliation: 'روغه جوړه', relationships: 'اړیکې', salman: 'سلمان فارسي', service: 'خدمت',
  signs_of_hour: 'د قیامت نښې', sincerity: 'اخلاص', social_justice: 'ټولنیز عدالت', speech: 'خبرې',
  strength: 'ځواک', sunnah: 'سنت', taqwa: 'تقوا', tawakkul: 'توکل', tashreeq: 'د تشریق ورځې',
  travel: 'سفر', worship: 'عبادت', wudu: 'اودس',
};

export function formatSourceLabel(
  book: HadithSourceBook,
  sourceNumber: string,
  language: AppLanguage = 'dari',
): string {
  const labels = language === 'english'
    ? SOURCE_BOOK_LABELS_EN
    : language === 'turkish'
      ? SOURCE_BOOK_LABELS_TR
      : language === 'arabic'
        ? SOURCE_BOOK_LABELS_AR
        : language === 'pashto'
          ? SOURCE_BOOK_LABELS_PS
          : SOURCE_BOOK_LABELS;
  return `${labels[book]} ${sourceNumber}`;
}

export function getAuthenticityGradeLabelFa(grade: HadithAuthenticityGrade): string {
  return GRADE_LABELS_FA[grade];
}

export function getAuthenticityGradeLabel(
  grade: HadithAuthenticityGrade,
  language: AppLanguage,
): string {
  if (language === 'english') return GRADE_LABELS_EN[grade];
  if (language === 'turkish') {
    if (grade === 'sahih') return 'Sahih';
    if (grade === 'hasan') return 'Hasen';
    return 'Zayıf';
  }
  if (language === 'arabic') {
    if (grade === 'sahih') return 'صحيح';
    if (grade === 'hasan') return 'حسن';
    return 'ضعيف';
  }
  return GRADE_LABELS_FA[grade];
}

export function getMuttafaqBadgeLabel(language: AppLanguage = 'dari'): string {
  if (language === 'english') return 'Muttafaqun ‘alayh';
  if (language === 'turkish') return 'Müttefekun aleyh';
  if (language === 'arabic') return 'متفق عليه';
  if (language === 'pashto') return 'متفق‌علیه';
  return 'متفق‌علیه';
}

export function getReasonLabelFa(reason: DailySelectionReason): string {
  if (reason === 'special_days') return 'مناسبتی';
  if (reason === 'hijri_range') return 'تقویم هجری';
  if (reason === 'weekday_only') return 'ویژه جمعه';
  return 'روزانه';
}

export function getReasonLabel(reason: DailySelectionReason, language: AppLanguage): string {
  if (language === 'english') {
    if (reason === 'special_days') return 'Occasion';
    if (reason === 'hijri_range') return 'Hijri calendar';
    if (reason === 'weekday_only') return 'Friday special';
    return 'Daily';
  }
  if (language === 'turkish') {
    if (reason === 'special_days') return 'Özel gün';
    if (reason === 'hijri_range') return 'Hicri takvim';
    if (reason === 'weekday_only') return 'Cuma’ya özel';
    return 'Günlük';
  }
  if (language === 'arabic') {
    if (reason === 'special_days') return 'مناسبة';
    if (reason === 'hijri_range') return 'التقويم الهجري';
    if (reason === 'weekday_only') return 'خاص بالجمعة';
    return 'يومي';
  }
  if (language === 'dari') return getReasonLabelFa(reason);
  if (reason === 'special_days') return 'ځانګړې ورځ';
  if (reason === 'hijri_range') return 'هجري کلیزه';
  if (reason === 'weekday_only') return 'د جمعې ځانګړی حدیث';
  return 'ورځنی';
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

export function getContextTitle(
  context: Pick<AhadithCalendarContext, 'specialDayKeys' | 'isFriday'>,
  language: AppLanguage,
): string {
  if (language === 'english') {
    if (context.specialDayKeys.includes('laylat_al_qadr')) return 'Laylat al-Qadr hadith';
    if (context.specialDayKeys.includes('eid_al_fitr')) return 'Eid al-Fitr hadith';
    if (context.specialDayKeys.includes('eid_al_adha')) return 'Eid al-Adha hadith';
    if (context.specialDayKeys.includes('arafah')) return 'Day of Arafah hadith';
    if (context.specialDayKeys.includes('tashreeq')) return 'Days of Tashreeq hadith';
    if (context.specialDayKeys.includes('hijri_new_year')) return 'Islamic New Year hadith';
    if (context.specialDayKeys.includes('ramadan')) return 'Ramadan hadith';
    if (context.isFriday) return 'Friday hadith';
    return 'Hadith of the day';
  }
  if (language === 'turkish') {
    if (context.specialDayKeys.includes('laylat_al_qadr')) return 'Kadir gecesi hadisi';
    if (context.specialDayKeys.includes('eid_al_fitr')) return 'Ramazan Bayramı hadisi';
    if (context.specialDayKeys.includes('eid_al_adha')) return 'Kurban Bayramı hadisi';
    if (context.specialDayKeys.includes('arafah')) return 'Arefe hadisi';
    if (context.specialDayKeys.includes('tashreeq')) return 'Teşrik günleri hadisi';
    if (context.specialDayKeys.includes('hijri_new_year')) return 'Hicri yılbaşı hadisi';
    if (context.specialDayKeys.includes('ramadan')) return 'Ramazan hadisi';
    if (context.isFriday) return 'Cuma hadisi';
    return 'Günün hadisi';
  }
  if (language === 'arabic') {
    if (context.specialDayKeys.includes('laylat_al_qadr')) return 'حديث ليلة القدر';
    if (context.specialDayKeys.includes('eid_al_fitr')) return 'حديث عيد الفطر';
    if (context.specialDayKeys.includes('eid_al_adha')) return 'حديث عيد الأضحى';
    if (context.specialDayKeys.includes('arafah')) return 'حديث يوم عرفة';
    if (context.specialDayKeys.includes('tashreeq')) return 'حديث أيام التشريق';
    if (context.specialDayKeys.includes('hijri_new_year')) return 'حديث رأس السنة الهجرية';
    if (context.specialDayKeys.includes('ramadan')) return 'حديث رمضان';
    if (context.isFriday) return 'حديث الجمعة';
    return 'حديث اليوم';
  }
  if (language === 'dari') return getContextTitleFa(context);
  if (context.specialDayKeys.includes('laylat_al_qadr')) return 'د قدر شپې حدیث';
  if (context.specialDayKeys.includes('eid_al_fitr')) return 'د کوچني اختر حدیث';
  if (context.specialDayKeys.includes('eid_al_adha')) return 'د لوی اختر حدیث';
  if (context.specialDayKeys.includes('arafah')) return 'د عرفې حدیث';
  if (context.specialDayKeys.includes('tashreeq')) return 'د تشریق ورځو حدیث';
  if (context.specialDayKeys.includes('hijri_new_year')) return 'د هجري نوي کال حدیث';
  if (context.specialDayKeys.includes('ramadan')) return 'د رمضان حدیث';
  if (context.isFriday) return 'د جمعې حدیث';
  return 'د ورځې حدیث';
}

export function getTopicLabelFa(topic: string): string {
  const normalized = topic.toLowerCase().trim();
  return TOPIC_LABELS_FA[normalized] ?? 'سایر';
}

/**
 * Topic keys are already English snake_case, so English labels are derived by
 * title-casing. Only transliterations and multi-word phrasings need overrides.
 */
const TOPIC_LABELS_EN_OVERRIDES: Record<string, string> = {
  akhlaq: 'Character (Akhlaq)',
  dawah: 'Da‘wah',
  dhikr: 'Dhikr',
  dhul_hijjah: 'Dhul Hijjah',
  dua: 'Du‘a',
  eid_al_fitr: 'Eid al-Fitr',
  end_times: 'End Times',
  fitan: 'Trials (Fitan)',
  helping_others: 'Helping Others',
  hijri_new_year: 'Islamic New Year',
  ihsan: 'Ihsan',
  jamaah: 'Congregation (Jama‘ah)',
  jumuah: 'Jumu‘ah',
  laylat_al_qadr: 'Laylat al-Qadr',
  qurbani: 'Qurbani',
  salman: 'Salman al-Farsi',
  signs_of_hour: 'Signs of the Hour',
  social_justice: 'Social Justice',
  sunnah: 'Sunnah',
  taqwa: 'Taqwa',
  tashreeq: 'Days of Tashreeq',
  tawakkul: 'Tawakkul',
  wudu: 'Wudu',
};

const TOPIC_LABELS_TR: Record<string, string> = {
  advice: 'Nasihat',
  akhlaq: 'Ahlak',
  arafah: 'Arefe',
  ashura: 'Aşure',
  barakah: 'Bereket',
  beauty: 'Güzellik',
  brotherhood: 'Kardeşlik',
  business: 'Ticaret',
  character: 'Karakter',
  charity: 'Sadaka',
  community: 'Toplum',
  consistency: 'Devamlılık',
  dawah: 'Davet',
  debt: 'Borç',
  dhikr: 'Zikir',
  dhul_hijjah: 'Zilhicce',
  dua: 'Dua',
  education: 'İlim',
  eid_al_fitr: 'Ramazan Bayramı',
  end_times: 'Ahir zaman',
  ethics: 'Ahlak',
  faith: 'İman',
  family: 'Aile',
  fasting: 'Oruç',
  fitan: 'Fitneler',
  generosity: 'Cömertlik',
  gentleness: 'Yumuşaklık',
  good_deeds: 'Salih ameller',
  gratitude: 'Şükür',
  guidance: 'Hidayet',
  guests: 'Misafirperverlik',
  hajj: 'Hac',
  heart: 'Kalp',
  helping_others: 'Başkasına yardım',
  hijri_new_year: 'Hicri yılbaşı',
  honesty: 'Dürüstlük',
  hospitality: 'Misafirperverlik',
  ihsan: 'İhsan',
  intention: 'Niyet',
  jamaah: 'Cemaat',
  jumuah: 'Cuma',
  khorasan: 'Horasan',
  knowledge: 'İlim',
  laylat_al_qadr: 'Kadir Gecesi',
  legacy: 'Miras',
  love: 'Muhabbet',
  manners: 'Âdâb',
  mercy: 'Merhamet',
  mindset: 'Bakış',
  modesty: 'Hayâ',
  mosque: 'Cami',
  muharram: 'Muharrem',
  neighbors: 'Komşu',
  orphans: 'Yetimler',
  parents: 'Anne ve baba',
  prayer: 'Namaz',
  privacy: 'Mahremiyet',
  prophet: 'Peygamber',
  purification: 'Temizlik',
  purity: 'Taharet',
  qurbani: 'Kurban',
  quran: 'Kur\'an',
  ramadan: 'Ramazan',
  reconciliation: 'Barışma',
  relationships: 'İlişkiler',
  salman: 'Selman-ı Farisi',
  service: 'Hizmet',
  signs_of_hour: 'Kıyamet alametleri',
  sincerity: 'İhlas',
  social_justice: 'Adalet',
  speech: 'Söz',
  strength: 'Sebat',
  sunnah: 'Sünnet',
  taqwa: 'Takva',
  tawakkul: 'Tevekkül',
  tashreeq: 'Teşrik günleri',
  travel: 'Yolculuk',
  worship: 'İbadet',
  wudu: 'Abdest',
};

const TOPIC_LABELS_AR: Record<string, string> = {
  advice: 'النصيحة',
  akhlaq: 'الأخلاق',
  arafah: 'عرفة',
  ashura: 'عاشوراء',
  barakah: 'البركة',
  beauty: 'الجمال',
  brotherhood: 'الأخوة',
  business: 'المعاملات',
  character: 'الخُلق',
  charity: 'الصدقة',
  community: 'المجتمع',
  consistency: 'المداومة',
  dawah: 'الدعوة',
  debt: 'الدَّين',
  dhikr: 'الذكر',
  dhul_hijjah: 'ذو الحجة',
  dua: 'الدعاء',
  education: 'العلم',
  eid_al_fitr: 'عيد الفطر',
  end_times: 'آخر الزمان',
  ethics: 'الأخلاق',
  faith: 'الإيمان',
  family: 'الأسرة',
  fasting: 'الصيام',
  fitan: 'الفتن',
  generosity: 'السخاء',
  gentleness: 'الرفق',
  good_deeds: 'الأعمال الصالحة',
  gratitude: 'الشكر',
  guidance: 'الهداية',
  guests: 'الضيافة',
  hajj: 'الحج',
  heart: 'القلب',
  helping_others: 'إعانة الناس',
  hijri_new_year: 'رأس السنة الهجرية',
  honesty: 'الصدق',
  hospitality: 'الضيافة',
  ihsan: 'الإحسان',
  intention: 'النية',
  jamaah: 'الجماعة',
  jumuah: 'الجمعة',
  khorasan: 'خراسان',
  knowledge: 'العلم',
  laylat_al_qadr: 'ليلة القدر',
  legacy: 'الميراث',
  love: 'المحبة',
  manners: 'الآداب',
  mercy: 'الرحمة',
  mindset: 'النظرة',
  modesty: 'الحياء',
  mosque: 'المسجد',
  muharram: 'محرم',
  neighbors: 'الجار',
  orphans: 'الأيتام',
  parents: 'الوالدان',
  prayer: 'الصلاة',
  privacy: 'الخصوصية',
  prophet: 'النبي ﷺ',
  purification: 'الطهارة',
  purity: 'الطهارة',
  qurbani: 'الأضحية',
  quran: 'القرآن',
  ramadan: 'رمضان',
  reconciliation: 'الإصلاح',
  relationships: 'العلاقات',
  salman: 'سلمان الفارسي',
  service: 'الخدمة',
  signs_of_hour: 'أشراط الساعة',
  sincerity: 'الإخلاص',
  social_justice: 'العدل',
  speech: 'الكلام',
  strength: 'الثبات',
  sunnah: 'السنة',
  taqwa: 'التقوى',
  tawakkul: 'التوكل',
  tashreeq: 'أيام التشريق',
  travel: 'السفر',
  worship: 'العبادة',
  wudu: 'الوضوء',
};

function titleCaseTopic(key: string): string {
  return key
    .split('_')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export function getTopicLabel(topic: string, language: AppLanguage): string {
  const normalized = topic.toLowerCase().trim();
  if (language === 'english') {
    if (TOPIC_LABELS_EN_OVERRIDES[normalized]) return TOPIC_LABELS_EN_OVERRIDES[normalized];
    return normalized ? titleCaseTopic(normalized) : 'Other';
  }
  if (language === 'pashto') return TOPIC_LABELS_PS[normalized] ?? 'نور';
  if (language === 'turkish') return TOPIC_LABELS_TR[normalized] ?? (normalized ? titleCaseTopic(normalized) : 'Diğer');
  if (language === 'arabic') return TOPIC_LABELS_AR[normalized] ?? 'موضوع آخر';
  return TOPIC_LABELS_FA[normalized] ?? 'سایر';
}
