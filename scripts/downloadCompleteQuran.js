/**
 * Download Complete Quran with Dari & Pashto Translations
 * 
 * Sources:
 * - Arabic: alquran.cloud API (Uthmani script)
 * - Dari: QuranEnc.com - Muhammad Anwar Badakhshani (dari_badkhashani)
 * - Pashto: QuranEnc.com - Abu Zakaria (pashto_zakaria)
 * 
 * Run: node scripts/downloadCompleteQuran.js
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

// Create directories
const surahsDir = path.join(__dirname, '../data/surahs');
if (!fs.existsSync(surahsDir)) {
  fs.mkdirSync(surahsDir, { recursive: true });
}

// Surah metadata with Dari names
const SURAH_METADATA = {
  1: { name: 'الفاتحة', dari: 'فاتحه', meaning: 'آغازگر', type: 'مکی', ayahs: 7 },
  2: { name: 'البقرة', dari: 'بقره', meaning: 'گاو ماده', type: 'مدنی', ayahs: 286 },
  3: { name: 'آل عمران', dari: 'آل عمران', meaning: 'خاندان عمران', type: 'مدنی', ayahs: 200 },
  4: { name: 'النساء', dari: 'نساء', meaning: 'زنان', type: 'مدنی', ayahs: 176 },
  5: { name: 'المائدة', dari: 'مائده', meaning: 'سفره', type: 'مدنی', ayahs: 120 },
  6: { name: 'الأنعام', dari: 'انعام', meaning: 'چهارپایان', type: 'مکی', ayahs: 165 },
  7: { name: 'الأعراف', dari: 'اعراف', meaning: 'بلندی‌ها', type: 'مکی', ayahs: 206 },
  8: { name: 'الأنفال', dari: 'انفال', meaning: 'غنیمت‌ها', type: 'مدنی', ayahs: 75 },
  9: { name: 'التوبة', dari: 'توبه', meaning: 'توبه', type: 'مدنی', ayahs: 129 },
  10: { name: 'يونس', dari: 'یونس', meaning: 'حضرت یونس علیه‌السلام', type: 'مکی', ayahs: 109 },
  11: { name: 'هود', dari: 'هود', meaning: 'حضرت هود علیه‌السلام', type: 'مکی', ayahs: 123 },
  12: { name: 'يوسف', dari: 'یوسف', meaning: 'حضرت یوسف علیه‌السلام', type: 'مکی', ayahs: 111 },
  13: { name: 'الرعد', dari: 'رعد', meaning: 'رعد', type: 'مدنی', ayahs: 43 },
  14: { name: 'إبراهيم', dari: 'ابراهیم', meaning: 'حضرت ابراهیم علیه‌السلام', type: 'مکی', ayahs: 52 },
  15: { name: 'الحجر', dari: 'حجر', meaning: 'سنگستان', type: 'مکی', ayahs: 99 },
  16: { name: 'النحل', dari: 'نحل', meaning: 'زنبور عسل', type: 'مکی', ayahs: 128 },
  17: { name: 'الإسراء', dari: 'اسراء', meaning: 'سیر شبانه', type: 'مکی', ayahs: 111 },
  18: { name: 'الكهف', dari: 'کهف', meaning: 'غار', type: 'مکی', ayahs: 110 },
  19: { name: 'مريم', dari: 'مریم', meaning: 'حضرت مریم علیها‌السلام', type: 'مکی', ayahs: 98 },
  20: { name: 'طه', dari: 'طه', meaning: 'طه', type: 'مکی', ayahs: 135 },
  21: { name: 'الأنبياء', dari: 'انبیاء', meaning: 'پیامبران', type: 'مکی', ayahs: 112 },
  22: { name: 'الحج', dari: 'حج', meaning: 'حج', type: 'مدنی', ayahs: 78 },
  23: { name: 'المؤمنون', dari: 'مؤمنون', meaning: 'مؤمنان', type: 'مکی', ayahs: 118 },
  24: { name: 'النور', dari: 'نور', meaning: 'نور', type: 'مدنی', ayahs: 64 },
  25: { name: 'الفرقان', dari: 'فرقان', meaning: 'جداکننده', type: 'مکی', ayahs: 77 },
  26: { name: 'الشعراء', dari: 'شعراء', meaning: 'شاعران', type: 'مکی', ayahs: 227 },
  27: { name: 'النمل', dari: 'نمل', meaning: 'مورچه', type: 'مکی', ayahs: 93 },
  28: { name: 'القصص', dari: 'قصص', meaning: 'داستان‌ها', type: 'مکی', ayahs: 88 },
  29: { name: 'العنكبوت', dari: 'عنکبوت', meaning: 'عنکبوت', type: 'مکی', ayahs: 69 },
  30: { name: 'الروم', dari: 'روم', meaning: 'روم', type: 'مکی', ayahs: 60 },
  31: { name: 'لقمان', dari: 'لقمان', meaning: 'لقمان حکیم', type: 'مکی', ayahs: 34 },
  32: { name: 'السجدة', dari: 'سجده', meaning: 'سجده', type: 'مکی', ayahs: 30 },
  33: { name: 'الأحزاب', dari: 'احزاب', meaning: 'گروه‌ها', type: 'مدنی', ayahs: 73 },
  34: { name: 'سبأ', dari: 'سبأ', meaning: 'سبا', type: 'مکی', ayahs: 54 },
  35: { name: 'فاطر', dari: 'فاطر', meaning: 'آفریننده', type: 'مکی', ayahs: 45 },
  36: { name: 'يس', dari: 'یس', meaning: 'یس', type: 'مکی', ayahs: 83 },
  37: { name: 'الصافات', dari: 'صافات', meaning: 'صف‌بندان', type: 'مکی', ayahs: 182 },
  38: { name: 'ص', dari: 'ص', meaning: 'ص', type: 'مکی', ayahs: 88 },
  39: { name: 'الزمر', dari: 'زمر', meaning: 'گروه‌ها', type: 'مکی', ayahs: 75 },
  40: { name: 'غافر', dari: 'غافر', meaning: 'بخشنده', type: 'مکی', ayahs: 85 },
  41: { name: 'فصلت', dari: 'فصلت', meaning: 'تفصیل یافته', type: 'مکی', ayahs: 54 },
  42: { name: 'الشورى', dari: 'شوری', meaning: 'مشورت', type: 'مکی', ayahs: 53 },
  43: { name: 'الزخرف', dari: 'زخرف', meaning: 'زینت', type: 'مکی', ayahs: 89 },
  44: { name: 'الدخان', dari: 'دخان', meaning: 'دود', type: 'مکی', ayahs: 59 },
  45: { name: 'الجاثية', dari: 'جاثیه', meaning: 'زانوزده', type: 'مکی', ayahs: 37 },
  46: { name: 'الأحقاف', dari: 'احقاف', meaning: 'تپه‌های شنی', type: 'مکی', ayahs: 35 },
  47: { name: 'محمد', dari: 'محمد', meaning: 'حضرت محمد صلی‌الله‌علیه‌وسلم', type: 'مدنی', ayahs: 38 },
  48: { name: 'الفتح', dari: 'فتح', meaning: 'پیروزی', type: 'مدنی', ayahs: 29 },
  49: { name: 'الحجرات', dari: 'حجرات', meaning: 'اتاق‌ها', type: 'مدنی', ayahs: 18 },
  50: { name: 'ق', dari: 'ق', meaning: 'ق', type: 'مکی', ayahs: 45 },
  51: { name: 'الذاريات', dari: 'ذاریات', meaning: 'پراکنده‌کنندگان', type: 'مکی', ayahs: 60 },
  52: { name: 'الطور', dari: 'طور', meaning: 'کوه طور', type: 'مکی', ayahs: 49 },
  53: { name: 'النجم', dari: 'نجم', meaning: 'ستاره', type: 'مکی', ayahs: 62 },
  54: { name: 'القمر', dari: 'قمر', meaning: 'ماه', type: 'مکی', ayahs: 55 },
  55: { name: 'الرحمن', dari: 'رحمن', meaning: 'بخشنده', type: 'مدنی', ayahs: 78 },
  56: { name: 'الواقعة', dari: 'واقعه', meaning: 'رویداد', type: 'مکی', ayahs: 96 },
  57: { name: 'الحديد', dari: 'حدید', meaning: 'آهن', type: 'مدنی', ayahs: 29 },
  58: { name: 'المجادلة', dari: 'مجادله', meaning: 'مجادله', type: 'مدنی', ayahs: 22 },
  59: { name: 'الحشر', dari: 'حشر', meaning: 'گردآوری', type: 'مدنی', ayahs: 24 },
  60: { name: 'الممتحنة', dari: 'ممتحنه', meaning: 'آزموده‌شده', type: 'مدنی', ayahs: 13 },
  61: { name: 'الصف', dari: 'صف', meaning: 'صف', type: 'مدنی', ayahs: 14 },
  62: { name: 'الجمعة', dari: 'جمعه', meaning: 'جمعه', type: 'مدنی', ayahs: 11 },
  63: { name: 'المنافقون', dari: 'منافقون', meaning: 'منافقان', type: 'مدنی', ayahs: 11 },
  64: { name: 'التغابن', dari: 'تغابن', meaning: 'زیان‌کاری', type: 'مدنی', ayahs: 18 },
  65: { name: 'الطلاق', dari: 'طلاق', meaning: 'طلاق', type: 'مدنی', ayahs: 12 },
  66: { name: 'التحريم', dari: 'تحریم', meaning: 'تحریم', type: 'مدنی', ayahs: 12 },
  67: { name: 'الملك', dari: 'ملک', meaning: 'فرمانروایی', type: 'مکی', ayahs: 30 },
  68: { name: 'القلم', dari: 'قلم', meaning: 'قلم', type: 'مکی', ayahs: 52 },
  69: { name: 'الحاقة', dari: 'حاقه', meaning: 'حقیقت', type: 'مکی', ayahs: 52 },
  70: { name: 'المعارج', dari: 'معارج', meaning: 'نردبان‌ها', type: 'مکی', ayahs: 44 },
  71: { name: 'نوح', dari: 'نوح', meaning: 'حضرت نوح علیه‌السلام', type: 'مکی', ayahs: 28 },
  72: { name: 'الجن', dari: 'جن', meaning: 'جن', type: 'مکی', ayahs: 28 },
  73: { name: 'المزمل', dari: 'مزمل', meaning: 'جامه‌پوشیده', type: 'مکی', ayahs: 20 },
  74: { name: 'المدثر', dari: 'مدثر', meaning: 'پوشیده در لباس', type: 'مکی', ayahs: 56 },
  75: { name: 'القيامة', dari: 'قیامت', meaning: 'قیامت', type: 'مکی', ayahs: 40 },
  76: { name: 'الإنسان', dari: 'انسان', meaning: 'انسان', type: 'مدنی', ayahs: 31 },
  77: { name: 'المرسلات', dari: 'مرسلات', meaning: 'فرستادگان', type: 'مکی', ayahs: 50 },
  78: { name: 'النبأ', dari: 'نبأ', meaning: 'خبر بزرگ', type: 'مکی', ayahs: 40 },
  79: { name: 'النازعات', dari: 'نازعات', meaning: 'برکشندگان', type: 'مکی', ayahs: 46 },
  80: { name: 'عبس', dari: 'عبس', meaning: 'چهره درهم کشید', type: 'مکی', ayahs: 42 },
  81: { name: 'التكوير', dari: 'تکویر', meaning: 'درهم پیچیدن', type: 'مکی', ayahs: 29 },
  82: { name: 'الانفطار', dari: 'انفطار', meaning: 'شکافتن', type: 'مکی', ayahs: 19 },
  83: { name: 'المطففين', dari: 'مطففین', meaning: 'کم‌فروشان', type: 'مکی', ayahs: 36 },
  84: { name: 'الانشقاق', dari: 'انشقاق', meaning: 'شکافتن', type: 'مکی', ayahs: 25 },
  85: { name: 'البروج', dari: 'بروج', meaning: 'برج‌ها', type: 'مکی', ayahs: 22 },
  86: { name: 'الطارق', dari: 'طارق', meaning: 'کوبنده شب', type: 'مکی', ayahs: 17 },
  87: { name: 'الأعلى', dari: 'اعلی', meaning: 'برترین', type: 'مکی', ayahs: 19 },
  88: { name: 'الغاشية', dari: 'غاشیه', meaning: 'فراگیرنده', type: 'مکی', ayahs: 26 },
  89: { name: 'الفجر', dari: 'فجر', meaning: 'سپیده‌دم', type: 'مکی', ayahs: 30 },
  90: { name: 'البلد', dari: 'بلد', meaning: 'شهر', type: 'مکی', ayahs: 20 },
  91: { name: 'الشمس', dari: 'شمس', meaning: 'خورشید', type: 'مکی', ayahs: 15 },
  92: { name: 'الليل', dari: 'لیل', meaning: 'شب', type: 'مکی', ayahs: 21 },
  93: { name: 'الضحى', dari: 'ضحی', meaning: 'چاشتگاه', type: 'مکی', ayahs: 11 },
  94: { name: 'الشرح', dari: 'شرح', meaning: 'گشادن سینه', type: 'مکی', ayahs: 8 },
  95: { name: 'التين', dari: 'تین', meaning: 'انجیر', type: 'مکی', ayahs: 8 },
  96: { name: 'العلق', dari: 'علق', meaning: 'خون بسته', type: 'مکی', ayahs: 19 },
  97: { name: 'القدر', dari: 'قدر', meaning: 'شب قدر', type: 'مکی', ayahs: 5 },
  98: { name: 'البينة', dari: 'بینه', meaning: 'دلیل روشن', type: 'مدنی', ayahs: 8 },
  99: { name: 'الزلزلة', dari: 'زلزله', meaning: 'زلزله', type: 'مدنی', ayahs: 8 },
  100: { name: 'العاديات', dari: 'عادیات', meaning: 'اسبان تازنده', type: 'مکی', ayahs: 11 },
  101: { name: 'القارعة', dari: 'قارعه', meaning: 'کوبنده', type: 'مکی', ayahs: 11 },
  102: { name: 'التكاثر', dari: 'تکاثر', meaning: 'فزون‌طلبی', type: 'مکی', ayahs: 8 },
  103: { name: 'العصر', dari: 'عصر', meaning: 'عصر', type: 'مکی', ayahs: 3 },
  104: { name: 'الهمزة', dari: 'همزه', meaning: 'عیب‌جو', type: 'مکی', ayahs: 9 },
  105: { name: 'الفيل', dari: 'فیل', meaning: 'فیل', type: 'مکی', ayahs: 5 },
  106: { name: 'قريش', dari: 'قریش', meaning: 'قریش', type: 'مکی', ayahs: 4 },
  107: { name: 'الماعون', dari: 'ماعون', meaning: 'نیازهای کوچک', type: 'مکی', ayahs: 7 },
  108: { name: 'الكوثر', dari: 'کوثر', meaning: 'کوثر', type: 'مکی', ayahs: 3 },
  109: { name: 'الكافرون', dari: 'کافرون', meaning: 'کافران', type: 'مکی', ayahs: 6 },
  110: { name: 'النصر', dari: 'نصر', meaning: 'یاری', type: 'مدنی', ayahs: 3 },
  111: { name: 'المسد', dari: 'مسد', meaning: 'ریسمان', type: 'مکی', ayahs: 5 },
  112: { name: 'الإخلاص', dari: 'اخلاص', meaning: 'خلوص', type: 'مکی', ayahs: 4 },
  113: { name: 'الفلق', dari: 'فلق', meaning: 'سپیده‌دم', type: 'مکی', ayahs: 5 },
  114: { name: 'الناس', dari: 'ناس', meaning: 'مردم', type: 'مکی', ayahs: 6 }
};

// Helper function to make HTTP/HTTPS request
function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    protocol.get(url, (res) => {
      // Handle redirects
      if (res.statusCode === 301 || res.statusCode === 302) {
        return fetchJSON(res.headers.location).then(resolve).catch(reject);
      }
      
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          // Return raw data if JSON parsing fails
          resolve({ rawData: data, parseError: true });
        }
      });
    }).on('error', reject);
  });
}

// QuranEnc API endpoints
const QURANENC_API = {
  dari: 'https://quranenc.com/api/v1/translation/sura/dari_badkhashani',
  pashto: 'https://quranenc.com/api/v1/translation/sura/pashto_zakaria'
};

// Download Arabic text from alquran.cloud
async function downloadArabic(surahNum) {
  const url = `https://api.alquran.cloud/v1/surah/${surahNum}/quran-uthmani`;
  try {
    const response = await fetchJSON(url);
    if (response.code === 200) {
      return response.data.ayahs.map(a => ({
        number: a.numberInSurah,
        text: a.text,
        page: a.page,
        juz: a.juz,
        hizbQuarter: a.hizbQuarter
      }));
    }
  } catch (err) {
    console.error(`Error downloading Arabic for surah ${surahNum}:`, err.message);
  }
  return null;
}

// Download Dari translation from QuranEnc (Anwar Badakhshani)
async function downloadDari(surahNum) {
  const url = `${QURANENC_API.dari}/${surahNum}`;
  try {
    const response = await fetchJSON(url);
    if (response && response.result && Array.isArray(response.result)) {
      return response.result.map(a => ({
        number: parseInt(a.aya),
        text: a.translation || ''
      }));
    }
    // Fallback: try to access different response structure
    if (response && Array.isArray(response)) {
      return response.map(a => ({
        number: parseInt(a.aya || a.ayah || a.number),
        text: a.translation || a.text || ''
      }));
    }
  } catch (err) {
    console.error(`Error downloading Dari for surah ${surahNum}:`, err.message);
  }
  return null;
}

// Download Pashto translation from QuranEnc (Abu Zakaria)
async function downloadPashto(surahNum) {
  const url = `${QURANENC_API.pashto}/${surahNum}`;
  try {
    const response = await fetchJSON(url);
    if (response && response.result && Array.isArray(response.result)) {
      return response.result.map(a => ({
        number: parseInt(a.aya),
        text: a.translation || ''
      }));
    }
    // Fallback: try to access different response structure
    if (response && Array.isArray(response)) {
      return response.map(a => ({
        number: parseInt(a.aya || a.ayah || a.number),
        text: a.translation || a.text || ''
      }));
    }
  } catch (err) {
    console.error(`Error downloading Pashto for surah ${surahNum}:`, err.message);
  }
  return null;
}

// Main download function
async function downloadSurah(surahNum) {
  console.log(`📥 دانلود سوره ${surahNum}...`);
  
  const meta = SURAH_METADATA[surahNum];
  if (!meta) {
    console.error(`سوره ${surahNum} در متادیتا یافت نشد`);
    return null;
  }
  
  // Download Arabic
  const arabicAyahs = await downloadArabic(surahNum);
  if (!arabicAyahs) {
    console.error(`خطا در دانلود متن عربی سوره ${surahNum}`);
    return null;
  }
  
  // Download Dari (Anwar Badakhshani from QuranEnc)
  const dariAyahs = await downloadDari(surahNum);
  if (dariAyahs) {
    console.log(`  ✓ ترجمه دری (انور بدخشانی): ${dariAyahs.length} آیه`);
  } else {
    console.log(`  ⚠ ترجمه دری یافت نشد`);
  }
  
  // Download Pashto (Abu Zakaria from QuranEnc)
  const pashtoAyahs = await downloadPashto(surahNum);
  if (pashtoAyahs) {
    console.log(`  ✓ ترجمه پشتو (ابو زکریا): ${pashtoAyahs.length} آیه`);
  } else {
    console.log(`  ⚠ ترجمه پشتو یافت نشد`);
  }
  
  // Combine data - match translations by ayah number
  const surahData = {
    number: surahNum,
    name: meta.name,
    name_dari: meta.dari,
    meaning_dari: meta.meaning,
    revelationType: meta.type,
    numberOfAyahs: meta.ayahs,
    ayahs: arabicAyahs.map((ayah) => {
      // Find matching translations by ayah number
      const dariTranslation = dariAyahs?.find(d => d.number === ayah.number);
      const pashtoTranslation = pashtoAyahs?.find(p => p.number === ayah.number);
      
      return {
        number: ayah.number,
        text: ayah.text,
        page: ayah.page,
        juz: ayah.juz,
        hizb: Math.ceil(ayah.hizbQuarter / 4),
        sajda: false,
        translation_dari: dariTranslation?.text || '',
        translation_pashto: pashtoTranslation?.text || ''
      };
    })
  };
  
  return surahData;
}

// Download all surahs
async function downloadAll() {
  console.log('🕌 شروع دانلود قرآن کریم با ترجمه‌های افغانستان...');
  console.log('📚 منابع:');
  console.log('   - متن عربی: alquran.cloud (خط عثمانی)');
  console.log('   - ترجمه دری: QuranEnc.com - محمد انور بدخشانی');
  console.log('   - ترجمه پشتو: QuranEnc.com - ابو زکریا\n');
  
  const metadata = {
    totalSurahs: 114,
    totalAyahs: 6236,
    sources: {
      arabic: 'alquran.cloud (Uthmani)',
      dari: 'QuranEnc.com - Muhammad Anwar Badakhshani',
      pashto: 'QuranEnc.com - Abu Zakaria'
    },
    surahs: []
  };
  
  let totalAyahs = 0;
  let dariCount = 0;
  let pashtoCount = 0;
  
  for (let i = 1; i <= 114; i++) {
    const surah = await downloadSurah(i);
    
    if (surah) {
      // Save individual surah file
      const filename = String(i).padStart(3, '0') + '.json';
      const filepath = path.join(surahsDir, filename);
      fs.writeFileSync(filepath, JSON.stringify(surah, null, 2), 'utf8');
      
      totalAyahs += surah.ayahs.length;
      
      // Count translations
      const hasDari = surah.ayahs.some(a => a.translation_dari && a.translation_dari.trim());
      const hasPashto = surah.ayahs.some(a => a.translation_pashto && a.translation_pashto.trim());
      if (hasDari) dariCount++;
      if (hasPashto) pashtoCount++;
      
      // Add to metadata
      metadata.surahs.push({
        number: surah.number,
        name: surah.name,
        name_dari: surah.name_dari,
        meaning_dari: surah.meaning_dari,
        numberOfAyahs: surah.numberOfAyahs,
        revelationType: surah.revelationType
      });
      
      console.log(`✅ ${filename} - ${surah.name} (${surah.ayahs.length} آیات)`);
    }
    
    // Delay to avoid rate limiting (QuranEnc may have limits)
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  // Save metadata
  fs.writeFileSync(
    path.join(__dirname, '../data/metadata.json'),
    JSON.stringify(metadata, null, 2),
    'utf8'
  );
  
  console.log('\n📋 metadata.json ذخیره شد');
  console.log(`\n✅ دانلود تکمیل!`);
  console.log(`📖 ${metadata.surahs.length} سوره`);
  console.log(`📝 ${totalAyahs} آیه`);
  console.log(`🇦🇫 ترجمه دری: ${dariCount}/114 سوره`);
  console.log(`🇦🇫 ترجمه پشتو: ${pashtoCount}/114 سوره`);
}

// Run
downloadAll().catch(console.error);
