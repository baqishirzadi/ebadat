/**
 * Islamic (Hijri) Calendar Utilities
 * With Afghan context and special days
 */

export interface HijriDate {
  year: number;
  month: number;
  day: number;
  monthName: string;
  monthNameArabic: string;
  monthNameDari: string;
  monthNamePashto: string;
}

// Hijri month names
export const HIJRI_MONTHS = [
  { arabic: 'المحرم', dari: 'محرم', pashto: 'محرم', english: 'Muharram' },
  { arabic: 'صفر', dari: 'صفر', pashto: 'صفر', english: 'Safar' },
  { arabic: 'ربيع الأول', dari: 'ربیع‌الاول', pashto: 'ربیع الاول', english: 'Rabi al-Awwal' },
  { arabic: 'ربيع الثاني', dari: 'ربیع‌الثانی', pashto: 'ربیع الثاني', english: 'Rabi al-Thani' },
  { arabic: 'جمادى الأولى', dari: 'جمادی‌الاول', pashto: 'جمادی الاولی', english: 'Jumada al-Awwal' },
  { arabic: 'جمادى الثانية', dari: 'جمادی‌الثانی', pashto: 'جمادی الثانیه', english: 'Jumada al-Thani' },
  { arabic: 'رجب', dari: 'رجب', pashto: 'رجب', english: 'Rajab' },
  { arabic: 'شعبان', dari: 'شعبان', pashto: 'شعبان', english: 'Shaban' },
  { arabic: 'رمضان', dari: 'رمضان', pashto: 'رمضان', english: 'Ramadan' },
  { arabic: 'شوال', dari: 'شوال', pashto: 'شوال', english: 'Shawwal' },
  { arabic: 'ذو القعدة', dari: 'ذوالقعده', pashto: 'ذوالقعده', english: 'Dhul Qadah' },
  { arabic: 'ذو الحجة', dari: 'ذوالحجه', pashto: 'ذوالحجه', english: 'Dhul Hijjah' },
];

// Special Islamic days
export interface SpecialDay {
  month: number;
  day: number;
  nameArabic: string;
  nameDari: string;
  namePashto: string;
  description: string;
  descriptionDari: string;
  descriptionPashto: string;
  worship: string[];
  worshipDari: string[];
  worshipPashto: string[];
  isFasting?: boolean;
  isEid?: boolean;
}

export const SPECIAL_DAYS: SpecialDay[] = [
  // Muharram
  {
    month: 1,
    day: 1,
    nameArabic: 'رأس السنة الهجرية',
    nameDari: 'سال نو هجری',
    namePashto: 'هجري نوی کال',
    description: 'Islamic New Year',
    descriptionDari: 'آغاز سال نو قمری هجری',
    descriptionPashto: 'د هجري قمري کال پيل',
    worship: ['Reflection', 'Dua', 'Good intentions'],
    worshipDari: ['تفکر', 'دعا', 'نیت نیک'],
    worshipPashto: ['فکر', 'دعا', 'ښه نیت'],
  },
  {
    month: 1,
    day: 9,
    nameArabic: 'تاسوعاء',
    nameDari: 'تاسوعا',
    namePashto: 'تاسوعا',
    description: 'Day before Ashura',
    descriptionDari: 'روز قبل از عاشورا - مستحب است روزه گرفته شود',
    descriptionPashto: 'د عاشورا نه مخکې ورځ - روژه مستحب ده',
    worship: ['Fasting', 'Remembrance'],
    worshipDari: ['روزه', 'یادآوری'],
    worshipPashto: ['روژه', 'یادونه'],
    isFasting: true,
  },
  {
    month: 1,
    day: 10,
    nameArabic: 'عاشوراء',
    nameDari: 'عاشورا',
    namePashto: 'عاشورا',
    description: 'Day of Ashura - Highly recommended to fast',
    descriptionDari: 'روز عاشورا - روزه در این روز بسیار مستحب است',
    descriptionPashto: 'د عاشورا ورځ - پدې ورځ روژه ډیره مستحبه ده',
    worship: ['Fasting', 'Dua', 'Charity', 'Remembrance of Prophets'],
    worshipDari: ['روزه', 'دعا', 'صدقه', 'یادآوری انبیا'],
    worshipPashto: ['روژه', 'دعا', 'صدقه', 'د پیغمبرانو یادونه'],
    isFasting: true,
  },
  // Rabi al-Awwal
  {
    month: 3,
    day: 12,
    nameArabic: 'مولد النبي ﷺ',
    nameDari: 'میلاد النبی ﷺ',
    namePashto: 'د پیغمبر ﷺ زیږیدنه',
    description: 'Birth of Prophet Muhammad ﷺ',
    descriptionDari: 'ولادت حضرت محمد مصطفی ﷺ',
    descriptionPashto: 'د حضرت محمد مصطفی ﷺ زیږیدنه',
    worship: ['Salawat', 'Seerah study', 'Charity'],
    worshipDari: ['صلوات', 'مطالعه سیره', 'صدقه'],
    worshipPashto: ['صلوات', 'د سیرت مطالعه', 'صدقه'],
  },
  // Rajab
  {
    month: 7,
    day: 27,
    nameArabic: 'ليلة الإسراء والمعراج',
    nameDari: 'شب اسراء و معراج',
    namePashto: 'د اسراء او معراج شپه',
    description: 'Night Journey and Ascension',
    descriptionDari: 'شب سفر معجزه‌آمیز پیامبر ﷺ',
    descriptionPashto: 'د پیغمبر ﷺ معجزه سفر شپه',
    worship: ['Night prayer', 'Quran recitation', 'Dua'],
    worshipDari: ['نماز شب', 'تلاوت قرآن', 'دعا'],
    worshipPashto: ['د شپې لمونځ', 'د قرآن تلاوت', 'دعا'],
  },
  // Shaban
  {
    month: 8,
    day: 15,
    nameArabic: 'ليلة النصف من شعبان',
    nameDari: 'شب نیمه شعبان',
    namePashto: 'د شعبان نیمایي شپه',
    description: 'Middle of Shaban - Night of forgiveness',
    descriptionDari: 'شب بخشش و رحمت الهی',
    descriptionPashto: 'د بخښنې او رحمت شپه',
    worship: ['Night prayer', 'Seeking forgiveness', 'Dua', 'Fasting next day'],
    worshipDari: ['نماز شب', 'استغفار', 'دعا', 'روزه فردا'],
    worshipPashto: ['د شپې لمونځ', 'استغفار', 'دعا', 'سبا روژه'],
    isFasting: true,
  },
  // Ramadan
  {
    month: 9,
    day: 1,
    nameArabic: 'بداية رمضان',
    nameDari: 'آغاز رمضان',
    namePashto: 'د رمضان پیل',
    description: 'Beginning of Ramadan',
    descriptionDari: 'آغاز ماه مبارک رمضان',
    descriptionPashto: 'د رمضان مبارک میاشت پیل',
    worship: ['Fasting', 'Tarawih', 'Quran', 'Charity'],
    worshipDari: ['روزه', 'تراویح', 'قرآن', 'صدقه'],
    worshipPashto: ['روژه', 'تراویح', 'قرآن', 'صدقه'],
    isFasting: true,
  },
  {
    month: 9,
    day: 21,
    nameArabic: 'ليالي القدر',
    nameDari: 'شب‌های قدر (احتمالی)',
    namePashto: 'د قدر شپې (احتمالي)',
    description: 'Possible Laylat al-Qadr (odd nights)',
    descriptionDari: 'شب‌های فرد آخر رمضان - احتمال شب قدر',
    descriptionPashto: 'د رمضان وروستۍ طاق شپې - د قدر شپې احتمال',
    worship: ['Night prayer all night', 'Quran', 'Dua', 'Itikaf'],
    worshipDari: ['شب‌زنده‌داری', 'تلاوت قرآن', 'دعا', 'اعتکاف'],
    worshipPashto: ['ټوله شپه لمونځ', 'د قرآن تلاوت', 'دعا', 'اعتکاف'],
  },
  {
    month: 9,
    day: 27,
    nameArabic: 'ليلة القدر المحتملة',
    nameDari: 'شب قدر (احتمال بیشتر)',
    namePashto: 'د قدر شپه (ډیر احتمال)',
    description: 'Most likely Laylat al-Qadr',
    descriptionDari: 'شب قدر - شبی که از هزار ماه بهتر است',
    descriptionPashto: 'د قدر شپه - له زره میاشتو نه غوره',
    worship: ['All night worship', 'Quran completion', 'Dua: اللهم إنك عفو...', 'Itikaf'],
    worshipDari: ['شب‌زنده‌داری کامل', 'ختم قرآن', 'دعای شب قدر', 'اعتکاف'],
    worshipPashto: ['بشپړه شپه عبادت', 'د قرآن ختم', 'د قدر دعا', 'اعتکاف'],
  },
  // Shawwal
  {
    month: 10,
    day: 1,
    nameArabic: 'عيد الفطر',
    nameDari: 'عید فطر',
    namePashto: 'کوچنی اختر',
    description: 'Eid al-Fitr - Festival of Breaking Fast',
    descriptionDari: 'عید سعید فطر - جشن پایان رمضان',
    descriptionPashto: 'کوچنی اختر - د روژې د پای اختر',
    worship: ['Eid prayer', 'Takbirat', 'Charity (Zakat al-Fitr)', 'Family gathering'],
    worshipDari: ['نماز عید', 'تکبیر', 'فطریه', 'دیدار خانواده'],
    worshipPashto: ['د اختر لمونځ', 'تکبیر', 'فطره', 'د کورنۍ لیدنه'],
    isEid: true,
  },
  // Dhul Hijjah
  {
    month: 12,
    day: 9,
    nameArabic: 'يوم عرفة',
    nameDari: 'روز عرفه',
    namePashto: 'د عرفې ورځ',
    description: 'Day of Arafah - Best day for fasting',
    descriptionDari: 'روز عرفه - بهترین روز برای روزه غیر از رمضان',
    descriptionPashto: 'د عرفې ورځ - تر رمضان وروسته د روژې غوره ورځ',
    worship: ['Fasting', 'Dua', 'Dhikr', 'Talbiyah'],
    worshipDari: ['روزه', 'دعا', 'ذکر', 'تلبیه'],
    worshipPashto: ['روژه', 'دعا', 'ذکر', 'تلبیه'],
    isFasting: true,
  },
  {
    month: 12,
    day: 10,
    nameArabic: 'عيد الأضحى',
    nameDari: 'عید قربان',
    namePashto: 'لوی اختر',
    description: 'Eid al-Adha - Festival of Sacrifice',
    descriptionDari: 'عید سعید قربان',
    descriptionPashto: 'لوی اختر - د قربانۍ اختر',
    worship: ['Eid prayer', 'Takbirat', 'Sacrifice (Qurbani)', 'Family gathering'],
    worshipDari: ['نماز عید', 'تکبیر', 'قربانی', 'دیدار خانواده'],
    worshipPashto: ['د اختر لمونځ', 'تکبیر', 'قرباني', 'د کورنۍ لیدنه'],
    isEid: true,
  },
  {
    month: 12,
    day: 11,
    nameArabic: 'أيام التشريق',
    nameDari: 'ایام تشریق',
    namePashto: 'د تشریق ورځې',
    description: 'Days of Tashreeq (11-13 Dhul Hijjah)',
    descriptionDari: 'ایام تشریق - روزه در این روزها حرام است',
    descriptionPashto: 'د تشریق ورځې - پدې ورځو روژه حرام ده',
    worship: ['Takbirat after prayers', 'Eating & Drinking', 'Dhikr'],
    worshipDari: ['تکبیر بعد از نمازها', 'خوردن و نوشیدن', 'ذکر'],
    worshipPashto: ['د لمونځ وروسته تکبیر', 'خوړل او څښل', 'ذکر'],
  },
];

// Convert Gregorian to Hijri (Umm al-Qura algorithm approximation)
export function gregorianToHijri(date: Date): HijriDate {
  const gregorianDate = new Date(date);
  const gregorianYear = gregorianDate.getFullYear();
  const gregorianMonth = gregorianDate.getMonth();
  const gregorianDay = gregorianDate.getDate();

  // Julian Day Number
  const a = Math.floor((14 - (gregorianMonth + 1)) / 12);
  const y = gregorianYear + 4800 - a;
  const m = (gregorianMonth + 1) + 12 * a - 3;
  
  const jd = gregorianDay + Math.floor((153 * m + 2) / 5) + 365 * y + 
             Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) - 32045;

  // Convert JD to Hijri
  const l = jd - 1948440 + 10632;
  const n = Math.floor((l - 1) / 10631);
  const lPrime = l - 10631 * n + 354;
  const j = Math.floor((10985 - lPrime) / 5316) * Math.floor((50 * lPrime) / 17719) +
            Math.floor(lPrime / 5670) * Math.floor((43 * lPrime) / 15238);
  const lDoublePrime = lPrime - Math.floor((30 - j) / 15) * Math.floor((17719 * j) / 50) -
                       Math.floor(j / 16) * Math.floor((15238 * j) / 43) + 29;
  
  const hijriMonth = Math.floor((24 * lDoublePrime) / 709);
  const hijriDay = lDoublePrime - Math.floor((709 * hijriMonth) / 24);
  const hijriYear = 30 * n + j - 30;

  const monthInfo = HIJRI_MONTHS[hijriMonth - 1];

  return {
    year: hijriYear,
    month: hijriMonth,
    day: hijriDay,
    monthName: monthInfo.english,
    monthNameArabic: monthInfo.arabic,
    monthNameDari: monthInfo.dari,
    monthNamePashto: monthInfo.pashto,
  };
}

// Check if today is a special day
export function getSpecialDayInfo(hijriDate: HijriDate): SpecialDay | null {
  return SPECIAL_DAYS.find(
    (day) => day.month === hijriDate.month && day.day === hijriDate.day
  ) || null;
}

// Get upcoming special days
export function getUpcomingSpecialDays(hijriDate: HijriDate, count: number = 5): SpecialDay[] {
  const upcoming: SpecialDay[] = [];
  let currentMonth = hijriDate.month;
  let currentDay = hijriDate.day;

  for (const day of SPECIAL_DAYS) {
    if (day.month > currentMonth || (day.month === currentMonth && day.day >= currentDay)) {
      upcoming.push(day);
      if (upcoming.length >= count) break;
    }
  }

  // If not enough, wrap around to next year
  if (upcoming.length < count) {
    for (const day of SPECIAL_DAYS) {
      if (!upcoming.includes(day)) {
        upcoming.push(day);
        if (upcoming.length >= count) break;
      }
    }
  }

  return upcoming;
}

/** Returns the first special day strictly after the given Hijri date (for next-event reminder). */
export function getNextSpecialDay(hijriDate: HijriDate): SpecialDay | null {
  for (const day of SPECIAL_DAYS) {
    if (day.month > hijriDate.month || (day.month === hijriDate.month && day.day > hijriDate.day)) {
      return day;
    }
  }
  return SPECIAL_DAYS[0] ?? null; // wrap to next year
}

// Check if today is a recommended fasting day
export function isFastingDay(date: Date): { isFasting: boolean; reason?: string; reasonDari?: string; reasonPashto?: string } {
  const hijri = gregorianToHijri(date);
  const dayOfWeek = date.getDay(); // 0 = Sunday, 1 = Monday, 4 = Thursday

  // Check special days
  const specialDay = getSpecialDayInfo(hijri);
  if (specialDay?.isFasting) {
    return {
      isFasting: true,
      reason: specialDay.nameDari,
      reasonDari: specialDay.nameDari,
      reasonPashto: specialDay.namePashto,
    };
  }

  // Monday & Thursday
  if (dayOfWeek === 1 || dayOfWeek === 4) {
    return {
      isFasting: true,
      reason: dayOfWeek === 1 ? 'Monday Sunnah Fast' : 'Thursday Sunnah Fast',
      reasonDari: dayOfWeek === 1 ? 'روزه سنت دوشنبه' : 'روزه سنت پنجشنبه',
      reasonPashto: dayOfWeek === 1 ? 'د دوشنبې سنت روژه' : 'د پنجشنبې سنت روژه',
    };
  }

  // Ayyam al-Beed (13, 14, 15 of each Hijri month)
  if (hijri.day >= 13 && hijri.day <= 15) {
    return {
      isFasting: true,
      reason: 'Ayyam al-Beed (White Days)',
      reasonDari: 'ایام البیض (روزهای سفید)',
      reasonPashto: 'ایام البیض (سپینې ورځې)',
    };
  }

  return { isFasting: false };
}

// Format Hijri date
export function formatHijriDate(hijri: HijriDate, language: 'arabic' | 'dari' | 'pashto' = 'dari'): string {
  const monthName = language === 'arabic' ? hijri.monthNameArabic :
                    language === 'pashto' ? hijri.monthNamePashto :
                    hijri.monthNameDari;
  
  return `${hijri.day} ${monthName} ${hijri.year}`;
}

/**
 * Convert Hijri date to Gregorian date.
 * Uses linear search: iterates through Gregorian dates and matches via gregorianToHijri.
 * Search range: -90 to +420 days from today (covers previous, current, and next Hijri year).
 */
export function hijriToGregorian(hijriYear: number, hijriMonth: number, hijriDay: number): Date | null {
  const base = new Date();
  base.setHours(0, 0, 0, 0);

  for (let offset = -90; offset <= 420; offset++) {
    const d = new Date(base);
    d.setDate(d.getDate() + offset);

    const h = gregorianToHijri(d);
    if (h.year === hijriYear && h.month === hijriMonth && h.day === hijriDay) {
      return d;
    }
  }

  return null;
}
