/**
 * Complete Surah Names in Arabic and Dari
 * With meanings for Afghan users
 * Prophet names include "حضرت ... علیه‌السلام"
 */

export interface SurahNameData {
  number: number;
  arabic: string;
  dari: string;
  meaning: string;
  ayahCount: number;
  revelationType: 'مکی' | 'مدنی';
  juz: number[];
}

// Convert number to Arabic/Farsi numerals
export function toArabicNumerals(num: number): string {
  const arabicNumerals = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  return num.toString().split('').map(d => arabicNumerals[parseInt(d)]).join('');
}

// Complete list of 114 Surahs with Dari names and meanings
export const SURAH_NAMES: SurahNameData[] = [
  { number: 1, arabic: 'الفاتحة', dari: 'فاتحه', meaning: 'آغازگر', ayahCount: 7, revelationType: 'مکی', juz: [1] },
  { number: 2, arabic: 'البقرة', dari: 'بقره', meaning: 'گاو ماده', ayahCount: 286, revelationType: 'مدنی', juz: [1, 2, 3] },
  { number: 3, arabic: 'آل عمران', dari: 'آل‌عمران', meaning: 'خاندان عمران', ayahCount: 200, revelationType: 'مدنی', juz: [3, 4] },
  { number: 4, arabic: 'النساء', dari: 'نساء', meaning: 'زنان', ayahCount: 176, revelationType: 'مدنی', juz: [4, 5, 6] },
  { number: 5, arabic: 'المائدة', dari: 'مائده', meaning: 'سفره', ayahCount: 120, revelationType: 'مدنی', juz: [6, 7] },
  { number: 6, arabic: 'الأنعام', dari: 'انعام', meaning: 'چهارپایان', ayahCount: 165, revelationType: 'مکی', juz: [7, 8] },
  { number: 7, arabic: 'الأعراف', dari: 'اعراف', meaning: 'بلندی‌ها', ayahCount: 206, revelationType: 'مکی', juz: [8, 9] },
  { number: 8, arabic: 'الأنفال', dari: 'انفال', meaning: 'غنیمت‌ها', ayahCount: 75, revelationType: 'مدنی', juz: [9, 10] },
  { number: 9, arabic: 'التوبة', dari: 'توبه', meaning: 'توبه', ayahCount: 129, revelationType: 'مدنی', juz: [10, 11] },
  { number: 10, arabic: 'يونس', dari: 'یونس', meaning: 'حضرت یونس علیه‌السلام', ayahCount: 109, revelationType: 'مکی', juz: [11] },
  { number: 11, arabic: 'هود', dari: 'هود', meaning: 'حضرت هود علیه‌السلام', ayahCount: 123, revelationType: 'مکی', juz: [11, 12] },
  { number: 12, arabic: 'يوسف', dari: 'یوسف', meaning: 'حضرت یوسف علیه‌السلام', ayahCount: 111, revelationType: 'مکی', juz: [12, 13] },
  { number: 13, arabic: 'الرعد', dari: 'رعد', meaning: 'رعد و برق', ayahCount: 43, revelationType: 'مدنی', juz: [13] },
  { number: 14, arabic: 'إبراهيم', dari: 'ابراهیم', meaning: 'حضرت ابراهیم علیه‌السلام', ayahCount: 52, revelationType: 'مکی', juz: [13] },
  { number: 15, arabic: 'الحجر', dari: 'حجر', meaning: 'سرزمین حجر', ayahCount: 99, revelationType: 'مکی', juz: [14] },
  { number: 16, arabic: 'النحل', dari: 'نحل', meaning: 'زنبور عسل', ayahCount: 128, revelationType: 'مکی', juz: [14] },
  { number: 17, arabic: 'الإسراء', dari: 'اسراء', meaning: 'سفر شبانه', ayahCount: 111, revelationType: 'مکی', juz: [15] },
  { number: 18, arabic: 'الكهف', dari: 'کهف', meaning: 'غار', ayahCount: 110, revelationType: 'مکی', juz: [15, 16] },
  { number: 19, arabic: 'مريم', dari: 'مریم', meaning: 'حضرت مریم علیها‌السلام', ayahCount: 98, revelationType: 'مکی', juz: [16] },
  { number: 20, arabic: 'طه', dari: 'طه', meaning: 'طه', ayahCount: 135, revelationType: 'مکی', juz: [16] },
  { number: 21, arabic: 'الأنبياء', dari: 'انبیاء', meaning: 'پیامبران', ayahCount: 112, revelationType: 'مکی', juz: [17] },
  { number: 22, arabic: 'الحج', dari: 'حج', meaning: 'حج', ayahCount: 78, revelationType: 'مدنی', juz: [17] },
  { number: 23, arabic: 'المؤمنون', dari: 'مؤمنون', meaning: 'مؤمنان', ayahCount: 118, revelationType: 'مکی', juz: [18] },
  { number: 24, arabic: 'النور', dari: 'نور', meaning: 'نور', ayahCount: 64, revelationType: 'مدنی', juz: [18] },
  { number: 25, arabic: 'الفرقان', dari: 'فرقان', meaning: 'جداکننده', ayahCount: 77, revelationType: 'مکی', juz: [18, 19] },
  { number: 26, arabic: 'الشعراء', dari: 'شعراء', meaning: 'شاعران', ayahCount: 227, revelationType: 'مکی', juz: [19] },
  { number: 27, arabic: 'النمل', dari: 'نمل', meaning: 'مورچه', ayahCount: 93, revelationType: 'مکی', juz: [19, 20] },
  { number: 28, arabic: 'القصص', dari: 'قصص', meaning: 'داستان‌ها', ayahCount: 88, revelationType: 'مکی', juz: [20] },
  { number: 29, arabic: 'العنكبوت', dari: 'عنکبوت', meaning: 'عنکبوت', ayahCount: 69, revelationType: 'مکی', juz: [20, 21] },
  { number: 30, arabic: 'الروم', dari: 'روم', meaning: 'رومیان', ayahCount: 60, revelationType: 'مکی', juz: [21] },
  { number: 31, arabic: 'لقمان', dari: 'لقمان', meaning: 'حضرت لقمان', ayahCount: 34, revelationType: 'مکی', juz: [21] },
  { number: 32, arabic: 'السجدة', dari: 'سجده', meaning: 'سجده', ayahCount: 30, revelationType: 'مکی', juz: [21] },
  { number: 33, arabic: 'الأحزاب', dari: 'احزاب', meaning: 'گروه‌ها', ayahCount: 73, revelationType: 'مدنی', juz: [21, 22] },
  { number: 34, arabic: 'سبأ', dari: 'سبأ', meaning: 'قوم سبأ', ayahCount: 54, revelationType: 'مکی', juz: [22] },
  { number: 35, arabic: 'فاطر', dari: 'فاطر', meaning: 'آفریننده', ayahCount: 45, revelationType: 'مکی', juz: [22] },
  { number: 36, arabic: 'يس', dari: 'یس', meaning: 'یس', ayahCount: 83, revelationType: 'مکی', juz: [22, 23] },
  { number: 37, arabic: 'الصافات', dari: 'صافات', meaning: 'صف‌کشیدگان', ayahCount: 182, revelationType: 'مکی', juz: [23] },
  { number: 38, arabic: 'ص', dari: 'ص', meaning: 'ص', ayahCount: 88, revelationType: 'مکی', juz: [23] },
  { number: 39, arabic: 'الزمر', dari: 'زمر', meaning: 'گروه‌ها', ayahCount: 75, revelationType: 'مکی', juz: [23, 24] },
  { number: 40, arabic: 'غافر', dari: 'غافر', meaning: 'آمرزنده', ayahCount: 85, revelationType: 'مکی', juz: [24] },
  { number: 41, arabic: 'فصلت', dari: 'فصلت', meaning: 'جداشده', ayahCount: 54, revelationType: 'مکی', juz: [24, 25] },
  { number: 42, arabic: 'الشورى', dari: 'شوری', meaning: 'مشورت', ayahCount: 53, revelationType: 'مکی', juz: [25] },
  { number: 43, arabic: 'الزخرف', dari: 'زخرف', meaning: 'زینت', ayahCount: 89, revelationType: 'مکی', juz: [25] },
  { number: 44, arabic: 'الدخان', dari: 'دخان', meaning: 'دود', ayahCount: 59, revelationType: 'مکی', juz: [25] },
  { number: 45, arabic: 'الجاثية', dari: 'جاثیه', meaning: 'زانوزدگان', ayahCount: 37, revelationType: 'مکی', juz: [25] },
  { number: 46, arabic: 'الأحقاف', dari: 'احقاف', meaning: 'تپه‌های شنی', ayahCount: 35, revelationType: 'مکی', juz: [26] },
  { number: 47, arabic: 'محمد', dari: 'محمد', meaning: 'حضرت محمد صلی‌الله‌علیه‌وسلم', ayahCount: 38, revelationType: 'مدنی', juz: [26] },
  { number: 48, arabic: 'الفتح', dari: 'فتح', meaning: 'پیروزی', ayahCount: 29, revelationType: 'مدنی', juz: [26] },
  { number: 49, arabic: 'الحجرات', dari: 'حجرات', meaning: 'حجره‌ها', ayahCount: 18, revelationType: 'مدنی', juz: [26] },
  { number: 50, arabic: 'ق', dari: 'ق', meaning: 'ق', ayahCount: 45, revelationType: 'مکی', juz: [26] },
  { number: 51, arabic: 'الذاريات', dari: 'ذاریات', meaning: 'پراکنده‌کنندگان', ayahCount: 60, revelationType: 'مکی', juz: [26, 27] },
  { number: 52, arabic: 'الطور', dari: 'طور', meaning: 'کوه طور', ayahCount: 49, revelationType: 'مکی', juz: [27] },
  { number: 53, arabic: 'النجم', dari: 'نجم', meaning: 'ستاره', ayahCount: 62, revelationType: 'مکی', juz: [27] },
  { number: 54, arabic: 'القمر', dari: 'قمر', meaning: 'ماه', ayahCount: 55, revelationType: 'مکی', juz: [27] },
  { number: 55, arabic: 'الرحمن', dari: 'رحمن', meaning: 'بخشاینده', ayahCount: 78, revelationType: 'مدنی', juz: [27] },
  { number: 56, arabic: 'الواقعة', dari: 'واقعه', meaning: 'رویداد', ayahCount: 96, revelationType: 'مکی', juz: [27] },
  { number: 57, arabic: 'الحديد', dari: 'حدید', meaning: 'آهن', ayahCount: 29, revelationType: 'مدنی', juz: [27] },
  { number: 58, arabic: 'المجادلة', dari: 'مجادله', meaning: 'مجادله', ayahCount: 22, revelationType: 'مدنی', juz: [28] },
  { number: 59, arabic: 'الحشر', dari: 'حشر', meaning: 'گردآوری', ayahCount: 24, revelationType: 'مدنی', juz: [28] },
  { number: 60, arabic: 'الممتحنة', dari: 'ممتحنه', meaning: 'آزموده‌شده', ayahCount: 13, revelationType: 'مدنی', juz: [28] },
  { number: 61, arabic: 'الصف', dari: 'صف', meaning: 'صف', ayahCount: 14, revelationType: 'مدنی', juz: [28] },
  { number: 62, arabic: 'الجمعة', dari: 'جمعه', meaning: 'جمعه', ayahCount: 11, revelationType: 'مدنی', juz: [28] },
  { number: 63, arabic: 'المنافقون', dari: 'منافقون', meaning: 'منافقان', ayahCount: 11, revelationType: 'مدنی', juz: [28] },
  { number: 64, arabic: 'التغابن', dari: 'تغابن', meaning: 'زیان‌کاری', ayahCount: 18, revelationType: 'مدنی', juz: [28] },
  { number: 65, arabic: 'الطلاق', dari: 'طلاق', meaning: 'طلاق', ayahCount: 12, revelationType: 'مدنی', juz: [28] },
  { number: 66, arabic: 'التحريم', dari: 'تحریم', meaning: 'ممنوعیت', ayahCount: 12, revelationType: 'مدنی', juz: [28] },
  { number: 67, arabic: 'الملك', dari: 'ملک', meaning: 'پادشاهی', ayahCount: 30, revelationType: 'مکی', juz: [29] },
  { number: 68, arabic: 'القلم', dari: 'قلم', meaning: 'قلم', ayahCount: 52, revelationType: 'مکی', juz: [29] },
  { number: 69, arabic: 'الحاقة', dari: 'حاقه', meaning: 'حقیقت', ayahCount: 52, revelationType: 'مکی', juz: [29] },
  { number: 70, arabic: 'المعارج', dari: 'معارج', meaning: 'نردبان‌ها', ayahCount: 44, revelationType: 'مکی', juz: [29] },
  { number: 71, arabic: 'نوح', dari: 'نوح', meaning: 'حضرت نوح علیه‌السلام', ayahCount: 28, revelationType: 'مکی', juz: [29] },
  { number: 72, arabic: 'الجن', dari: 'جن', meaning: 'جن', ayahCount: 28, revelationType: 'مکی', juz: [29] },
  { number: 73, arabic: 'المزمل', dari: 'مزمل', meaning: 'جامه‌پوش', ayahCount: 20, revelationType: 'مکی', juz: [29] },
  { number: 74, arabic: 'المدثر', dari: 'مدثر', meaning: 'جامه‌به‌سر‌کشیده', ayahCount: 56, revelationType: 'مکی', juz: [29] },
  { number: 75, arabic: 'القيامة', dari: 'قیامه', meaning: 'قیامت', ayahCount: 40, revelationType: 'مکی', juz: [29] },
  { number: 76, arabic: 'الإنسان', dari: 'انسان', meaning: 'انسان', ayahCount: 31, revelationType: 'مدنی', juz: [29] },
  { number: 77, arabic: 'المرسلات', dari: 'مرسلات', meaning: 'فرستادگان', ayahCount: 50, revelationType: 'مکی', juz: [29] },
  { number: 78, arabic: 'النبأ', dari: 'نبأ', meaning: 'خبر', ayahCount: 40, revelationType: 'مکی', juz: [30] },
  { number: 79, arabic: 'النازعات', dari: 'نازعات', meaning: 'برکشندگان', ayahCount: 46, revelationType: 'مکی', juz: [30] },
  { number: 80, arabic: 'عبس', dari: 'عبس', meaning: 'چهره‌درهم‌کشید', ayahCount: 42, revelationType: 'مکی', juz: [30] },
  { number: 81, arabic: 'التكوير', dari: 'تکویر', meaning: 'درهم‌پیچیدن', ayahCount: 29, revelationType: 'مکی', juz: [30] },
  { number: 82, arabic: 'الانفطار', dari: 'انفطار', meaning: 'شکافتن', ayahCount: 19, revelationType: 'مکی', juz: [30] },
  { number: 83, arabic: 'المطففين', dari: 'مطففین', meaning: 'کم‌فروشان', ayahCount: 36, revelationType: 'مکی', juz: [30] },
  { number: 84, arabic: 'الانشقاق', dari: 'انشقاق', meaning: 'شکافتن', ayahCount: 25, revelationType: 'مکی', juz: [30] },
  { number: 85, arabic: 'البروج', dari: 'بروج', meaning: 'برج‌ها', ayahCount: 22, revelationType: 'مکی', juz: [30] },
  { number: 86, arabic: 'الطارق', dari: 'طارق', meaning: 'ستاره‌شب‌تاب', ayahCount: 17, revelationType: 'مکی', juz: [30] },
  { number: 87, arabic: 'الأعلى', dari: 'اعلی', meaning: 'بلندمرتبه', ayahCount: 19, revelationType: 'مکی', juz: [30] },
  { number: 88, arabic: 'الغاشية', dari: 'غاشیه', meaning: 'فراگیرنده', ayahCount: 26, revelationType: 'مکی', juz: [30] },
  { number: 89, arabic: 'الفجر', dari: 'فجر', meaning: 'سپیده‌دم', ayahCount: 30, revelationType: 'مکی', juz: [30] },
  { number: 90, arabic: 'البلد', dari: 'بلد', meaning: 'شهر', ayahCount: 20, revelationType: 'مکی', juz: [30] },
  { number: 91, arabic: 'الشمس', dari: 'شمس', meaning: 'خورشید', ayahCount: 15, revelationType: 'مکی', juz: [30] },
  { number: 92, arabic: 'الليل', dari: 'لیل', meaning: 'شب', ayahCount: 21, revelationType: 'مکی', juz: [30] },
  { number: 93, arabic: 'الضحى', dari: 'ضحی', meaning: 'چاشت', ayahCount: 11, revelationType: 'مکی', juz: [30] },
  { number: 94, arabic: 'الشرح', dari: 'شرح', meaning: 'گشادگی', ayahCount: 8, revelationType: 'مکی', juz: [30] },
  { number: 95, arabic: 'التين', dari: 'تین', meaning: 'انجیر', ayahCount: 8, revelationType: 'مکی', juz: [30] },
  { number: 96, arabic: 'العلق', dari: 'علق', meaning: 'خون‌بسته', ayahCount: 19, revelationType: 'مکی', juz: [30] },
  { number: 97, arabic: 'القدر', dari: 'قدر', meaning: 'شب قدر', ayahCount: 5, revelationType: 'مکی', juz: [30] },
  { number: 98, arabic: 'البينة', dari: 'بینه', meaning: 'دلیل روشن', ayahCount: 8, revelationType: 'مدنی', juz: [30] },
  { number: 99, arabic: 'الزلزلة', dari: 'زلزله', meaning: 'زلزله', ayahCount: 8, revelationType: 'مدنی', juz: [30] },
  { number: 100, arabic: 'العاديات', dari: 'عادیات', meaning: 'اسب‌های دونده', ayahCount: 11, revelationType: 'مکی', juz: [30] },
  { number: 101, arabic: 'القارعة', dari: 'قارعه', meaning: 'کوبنده', ayahCount: 11, revelationType: 'مکی', juz: [30] },
  { number: 102, arabic: 'التكاثر', dari: 'تکاثر', meaning: 'فزون‌طلبی', ayahCount: 8, revelationType: 'مکی', juz: [30] },
  { number: 103, arabic: 'العصر', dari: 'عصر', meaning: 'زمان', ayahCount: 3, revelationType: 'مکی', juz: [30] },
  { number: 104, arabic: 'الهمزة', dari: 'همزه', meaning: 'عیب‌جو', ayahCount: 9, revelationType: 'مکی', juz: [30] },
  { number: 105, arabic: 'الفيل', dari: 'فیل', meaning: 'فیل', ayahCount: 5, revelationType: 'مکی', juz: [30] },
  { number: 106, arabic: 'قريش', dari: 'قریش', meaning: 'قبیله قریش', ayahCount: 4, revelationType: 'مکی', juz: [30] },
  { number: 107, arabic: 'الماعون', dari: 'ماعون', meaning: 'نیکوکاری', ayahCount: 7, revelationType: 'مکی', juz: [30] },
  { number: 108, arabic: 'الكوثر', dari: 'کوثر', meaning: 'خیر فراوان', ayahCount: 3, revelationType: 'مکی', juz: [30] },
  { number: 109, arabic: 'الكافرون', dari: 'کافرون', meaning: 'کافران', ayahCount: 6, revelationType: 'مکی', juz: [30] },
  { number: 110, arabic: 'النصر', dari: 'نصر', meaning: 'پیروزی', ayahCount: 3, revelationType: 'مدنی', juz: [30] },
  { number: 111, arabic: 'المسد', dari: 'مسد', meaning: 'ریسمان', ayahCount: 5, revelationType: 'مکی', juz: [30] },
  { number: 112, arabic: 'الإخلاص', dari: 'اخلاص', meaning: 'یکتاپرستی', ayahCount: 4, revelationType: 'مکی', juz: [30] },
  { number: 113, arabic: 'الفلق', dari: 'فلق', meaning: 'سپیده‌دم', ayahCount: 5, revelationType: 'مکی', juz: [30] },
  { number: 114, arabic: 'الناس', dari: 'ناس', meaning: 'مردم', ayahCount: 6, revelationType: 'مکی', juz: [30] },
];

// Get surah by number
export function getSurah(number: number): SurahNameData | undefined {
  return SURAH_NAMES.find(s => s.number === number);
}

// Format surah display text
export function formatSurahName(surah: SurahNameData): string {
  return `سورة ${surah.arabic}`;
}

// Format surah meaning
export function formatSurahMeaning(surah: SurahNameData): string {
  return `${surah.dari} (${surah.meaning})`;
}

// Format ayah count
export function formatAyahCount(count: number): string {
  return `${toArabicNumerals(count)} آیات`;
}
