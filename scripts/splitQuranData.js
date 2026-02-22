/**
 * Script to split quran.json into 114 individual surah files
 * Run with: node scripts/splitQuranData.js
 */

const fs = require('fs');
const path = require('path');

// Read the big file
const quranDataPath = path.join(__dirname, '../data/quran.json');
console.log('📖 Reading quran.json...');
const quranData = JSON.parse(fs.readFileSync(quranDataPath, 'utf8'));

// Create surahs directory
const surahsDir = path.join(__dirname, '../data/surahs');
if (!fs.existsSync(surahsDir)) {
  fs.mkdirSync(surahsDir, { recursive: true });
  console.log('📁 Created data/surahs directory');
}

// Import surah names from surahNames.ts if available
const surahNamesDari = {
  1: { dari: 'فاتحه', meaning: 'آغازگر' },
  2: { dari: 'بقره', meaning: 'گاو ماده' },
  3: { dari: 'آل عمران', meaning: 'خاندان عمران' },
  4: { dari: 'نساء', meaning: 'زنان' },
  5: { dari: 'مائده', meaning: 'سفره' },
  6: { dari: 'انعام', meaning: 'چهارپایان' },
  7: { dari: 'اعراف', meaning: 'بلندی‌ها' },
  8: { dari: 'انفال', meaning: 'غنیمت‌ها' },
  9: { dari: 'توبه', meaning: 'توبه' },
  10: { dari: 'یونس', meaning: 'حضرت یونس علیه‌السلام' },
  11: { dari: 'هود', meaning: 'حضرت هود علیه‌السلام' },
  12: { dari: 'یوسف', meaning: 'حضرت یوسف علیه‌السلام' },
  13: { dari: 'رعد', meaning: 'رعد' },
  14: { dari: 'ابراهیم', meaning: 'حضرت ابراهیم علیه‌السلام' },
  15: { dari: 'حجر', meaning: 'سنگستان' },
  16: { dari: 'نحل', meaning: 'زنبور عسل' },
  17: { dari: 'اسراء', meaning: 'سیر شبانه' },
  18: { dari: 'کهف', meaning: 'غار' },
  19: { dari: 'مریم', meaning: 'حضرت مریم علیها‌السلام' },
  20: { dari: 'طه', meaning: 'طه' },
  21: { dari: 'انبیاء', meaning: 'پیامبران' },
  22: { dari: 'حج', meaning: 'حج' },
  23: { dari: 'مؤمنون', meaning: 'مؤمنان' },
  24: { dari: 'نور', meaning: 'نور' },
  25: { dari: 'فرقان', meaning: 'جداکننده' },
  26: { dari: 'شعراء', meaning: 'شاعران' },
  27: { dari: 'نمل', meaning: 'مورچه' },
  28: { dari: 'قصص', meaning: 'داستان‌ها' },
  29: { dari: 'عنکبوت', meaning: 'عنکبوت' },
  30: { dari: 'روم', meaning: 'روم' },
  31: { dari: 'لقمان', meaning: 'لقمان حکیم' },
  32: { dari: 'سجده', meaning: 'سجده' },
  33: { dari: 'احزاب', meaning: 'گروه‌ها' },
  34: { dari: 'سبأ', meaning: 'سبا' },
  35: { dari: 'فاطر', meaning: 'آفریننده' },
  36: { dari: 'یس', meaning: 'یس' },
  37: { dari: 'صافات', meaning: 'صف‌بندان' },
  38: { dari: 'ص', meaning: 'ص' },
  39: { dari: 'زمر', meaning: 'گروه‌ها' },
  40: { dari: 'غافر', meaning: 'بخشنده' },
  41: { dari: 'فصلت', meaning: 'تفصیل یافته' },
  42: { dari: 'شوری', meaning: 'مشورت' },
  43: { dari: 'زخرف', meaning: 'زینت' },
  44: { dari: 'دخان', meaning: 'دود' },
  45: { dari: 'جاثیه', meaning: 'زانوزده' },
  46: { dari: 'احقاف', meaning: 'تپه‌های شنی' },
  47: { dari: 'محمد', meaning: 'حضرت محمد صلی‌الله‌علیه‌وسلم' },
  48: { dari: 'فتح', meaning: 'پیروزی' },
  49: { dari: 'حجرات', meaning: 'اتاق‌ها' },
  50: { dari: 'ق', meaning: 'ق' },
  51: { dari: 'ذاریات', meaning: 'پراکنده‌کنندگان' },
  52: { dari: 'طور', meaning: 'کوه طور' },
  53: { dari: 'نجم', meaning: 'ستاره' },
  54: { dari: 'قمر', meaning: 'ماه' },
  55: { dari: 'رحمن', meaning: 'بخشنده' },
  56: { dari: 'واقعه', meaning: 'رویداد' },
  57: { dari: 'حدید', meaning: 'آهن' },
  58: { dari: 'مجادله', meaning: 'مجادله' },
  59: { dari: 'حشر', meaning: 'گردآوری' },
  60: { dari: 'ممتحنه', meaning: 'آزموده‌شده' },
  61: { dari: 'صف', meaning: 'صف' },
  62: { dari: 'جمعه', meaning: 'جمعه' },
  63: { dari: 'منافقون', meaning: 'منافقان' },
  64: { dari: 'تغابن', meaning: 'زیان‌کاری' },
  65: { dari: 'طلاق', meaning: 'طلاق' },
  66: { dari: 'تحریم', meaning: 'تحریم' },
  67: { dari: 'ملک', meaning: 'فرمانروایی' },
  68: { dari: 'قلم', meaning: 'قلم' },
  69: { dari: 'حاقه', meaning: 'حقیقت' },
  70: { dari: 'معارج', meaning: 'نردبان‌ها' },
  71: { dari: 'نوح', meaning: 'حضرت نوح علیه‌السلام' },
  72: { dari: 'جن', meaning: 'جن' },
  73: { dari: 'مزمل', meaning: 'جامه‌پوشیده' },
  74: { dari: 'مدثر', meaning: 'پوشیده در لباس' },
  75: { dari: 'قیامت', meaning: 'قیامت' },
  76: { dari: 'انسان', meaning: 'انسان' },
  77: { dari: 'مرسلات', meaning: 'فرستادگان' },
  78: { dari: 'نبأ', meaning: 'خبر بزرگ' },
  79: { dari: 'نازعات', meaning: 'برکشندگان' },
  80: { dari: 'عبس', meaning: 'چهره درهم کشید' },
  81: { dari: 'تکویر', meaning: 'درهم پیچیدن' },
  82: { dari: 'انفطار', meaning: 'شکافتن' },
  83: { dari: 'مطففین', meaning: 'کم‌فروشان' },
  84: { dari: 'انشقاق', meaning: 'شکافتن' },
  85: { dari: 'بروج', meaning: 'برج‌ها' },
  86: { dari: 'طارق', meaning: 'کوبنده شب' },
  87: { dari: 'اعلی', meaning: 'برترین' },
  88: { dari: 'غاشیه', meaning: 'فراگیرنده' },
  89: { dari: 'فجر', meaning: 'سپیده‌دم' },
  90: { dari: 'بلد', meaning: 'شهر' },
  91: { dari: 'شمس', meaning: 'خورشید' },
  92: { dari: 'لیل', meaning: 'شب' },
  93: { dari: 'ضحی', meaning: 'چاشتگاه' },
  94: { dari: 'شرح', meaning: 'گشادن سینه' },
  95: { dari: 'تین', meaning: 'انجیر' },
  96: { dari: 'علق', meaning: 'خون بسته' },
  97: { dari: 'قدر', meaning: 'شب قدر' },
  98: { dari: 'بینه', meaning: 'دلیل روشن' },
  99: { dari: 'زلزله', meaning: 'زلزله' },
  100: { dari: 'عادیات', meaning: 'اسبان تازنده' },
  101: { dari: 'قارعه', meaning: 'کوبنده' },
  102: { dari: 'تکاثر', meaning: 'فزون‌طلبی' },
  103: { dari: 'عصر', meaning: 'عصر' },
  104: { dari: 'همزه', meaning: 'عیب‌جو' },
  105: { dari: 'فیل', meaning: 'فیل' },
  106: { dari: 'قریش', meaning: 'قریش' },
  107: { dari: 'ماعون', meaning: 'نیازهای کوچک' },
  108: { dari: 'کوثر', meaning: 'کوثر' },
  109: { dari: 'کافرون', meaning: 'کافران' },
  110: { dari: 'نصر', meaning: 'یاری' },
  111: { dari: 'مسد', meaning: 'ریسمان' },
  112: { dari: 'اخلاص', meaning: 'خلوص' },
  113: { dari: 'فلق', meaning: 'سپیده‌دم' },
  114: { dari: 'ناس', meaning: 'مردم' }
};

// Revelation type translations
const revelationTypeDari = {
  'Meccan': 'مکی',
  'Medinan': 'مدنی'
};

let totalAyahsWritten = 0;

// Split into individual files
quranData.surahs.forEach(surah => {
  const filename = String(surah.number).padStart(3, '0') + '.json';
  const filepath = path.join(surahsDir, filename);
  
  // Get Dari name and meaning
  const dariInfo = surahNamesDari[surah.number] || { 
    dari: surah.dariName || surah.name, 
    meaning: '' 
  };
  
  // Merge ayahs with translations for easier access
  const ayahsWithTranslations = surah.ayahs.map(ayah => {
    const dariTranslation = surah.translations?.dari?.find(t => t.ayahNumber === ayah.number);
    const pashtoTranslation = surah.translations?.pashto?.find(t => t.ayahNumber === ayah.number);
    
    return {
      number: ayah.number,
      numberInQuran: ayah.numberInQuran,
      text: ayah.text,
      page: ayah.page,
      juz: ayah.juz,
      hizb: ayah.hizb,
      sajda: ayah.sajda,
      translation_dari: dariTranslation?.text || '',
      translation_pashto: pashtoTranslation?.text || ''
    };
  });
  
  // Create surah data object
  const surahData = {
    number: surah.number,
    name: surah.name,
    name_dari: dariInfo.dari,
    meaning_dari: dariInfo.meaning,
    revelationType: revelationTypeDari[surah.revelationType] || surah.revelationType,
    numberOfAyahs: surah.ayahCount || surah.ayahs.length,
    startPage: surah.startPage,
    ayahs: ayahsWithTranslations
  };
  
  // Write each surah to its own file
  fs.writeFileSync(filepath, JSON.stringify(surahData, null, 2), 'utf8');
  totalAyahsWritten += ayahsWithTranslations.length;
  console.log(`✅ Created ${filename} (${surah.name}) - ${ayahsWithTranslations.length} آیات`);
});

// Create metadata file for fast surah list loading
const metadata = {
  totalSurahs: 114,
  totalAyahs: quranData.totalAyahs || 6236,
  totalPages: quranData.totalPages || 604,
  surahs: quranData.surahs.map(s => {
    const dariInfo = surahNamesDari[s.number] || { dari: s.dariName || s.name, meaning: '' };
    return {
      number: s.number,
      name: s.name,
      name_dari: dariInfo.dari,
      meaning_dari: dariInfo.meaning,
      numberOfAyahs: s.ayahCount || s.ayahs.length,
      revelationType: revelationTypeDari[s.revelationType] || s.revelationType,
      startPage: s.startPage
    };
  })
};

fs.writeFileSync(
  path.join(__dirname, '../data/metadata.json'),
  JSON.stringify(metadata, null, 2),
  'utf8'
);

console.log('\n📋 Created metadata.json');
console.log(`\n✅ تقسیم‌بندی تکمیل شد!`);
console.log(`📖 ${quranData.surahs.length} سوره`);
console.log(`📝 ${totalAyahsWritten} آیه نوشته شد`);
console.log(`📁 فایل‌ها در data/surahs/ ذخیره شدند`);
