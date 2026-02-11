/**
 * Afghan Solar Hijri (Shamsi) Calendar Utilities
 * Afghan calendar uses traditional month names (حمل، ثور، جوزا...)
 * Different from Iranian calendar month names
 */

export interface AfghanSolarHijriDate {
  year: number;
  month: number;
  day: number;
  monthNameDari: string;
  monthNamePashto: string;
}

// Afghan Solar Hijri month names (traditional astronomical names)
export const AFGHAN_SOLAR_MONTHS = [
  { dari: 'حمل', pashto: 'وری', english: 'Hamal' },      // March 21 - April 20
  { dari: 'ثور', pashto: 'غویی', english: 'Sawr' },      // April 21 - May 21
  { dari: 'جوزا', pashto: 'غبرګولی', english: 'Jawza' }, // May 22 - June 21
  { dari: 'سرطان', pashto: 'چنګاښ', english: 'Saratan' }, // June 22 - July 22
  { dari: 'اسد', pashto: 'زمری', english: 'Asad' },       // July 23 - August 22
  { dari: 'سنبله', pashto: 'وږی', english: 'Sonbola' },    // August 23 - September 22
  { dari: 'میزان', pashto: 'تله', english: 'Mizan' },     // September 23 - October 22
  { dari: 'عقرب', pashto: 'لړم', english: 'Aqrab' },      // October 23 - November 21
  { dari: 'قوس', pashto: 'ليندۍ', english: 'Qaws' },      // November 22 - December 21
  { dari: 'جدی', pashto: 'مرغومی', english: 'Jadi' },     // December 22 - January 20
  { dari: 'دلو', pashto: 'سلواغه', english: 'Dalw' },     // January 21 - February 19
  { dari: 'حوت', pashto: 'كب', english: 'Hut' },          // February 20 - March 20
];

/**
 * Convert Gregorian date to Afghan Solar Hijri (Shamsi)
 * Uses the standard Solar Hijri (Persian calendar) conversion algorithm
 */
export function gregorianToAfghanSolarHijri(date: Date): AfghanSolarHijriDate {
  const gregorianYear = date.getFullYear();
  const gregorianMonth = date.getMonth() + 1; // 1-12
  const gregorianDay = date.getDate();

  // Calculate Julian Day Number
  const a = Math.floor((14 - gregorianMonth) / 12);
  const y = gregorianYear + 4800 - a;
  const m = gregorianMonth + 12 * a - 3;
  
  const jd = gregorianDay + Math.floor((153 * m + 2) / 5) + 365 * y + 
             Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) - 32045;

  // Solar Hijri epoch: March 21, 622 CE (Julian Day 1948320.5)
  const persianEpoch = 1948320.5;
  
  // Days since epoch
  let daysSinceEpoch = jd - persianEpoch;
  
  // Calculate Solar Hijri year (using 33-year cycle approximation)
  // More accurate: use actual leap year calculation
  let solarHijriYear = Math.floor((daysSinceEpoch - 0.5) / 365.2424) + 1;
  
  // Calculate day of year
  let dayOfYear = daysSinceEpoch - (solarHijriYear - 1) * 365.2424;
  
  // Adjust for leap years in Solar Hijri
  // Solar Hijri leap years follow a 33-year cycle
  // Years that are 1, 5, 9, 13, 17, 22, 26, 30 mod 33 are leap years
  const cyclePosition = (solarHijriYear - 1) % 33;
  const isLeapYear = [1, 5, 9, 13, 17, 22, 26, 30].includes(cyclePosition);
  
  // Calculate month and day
  // Solar Hijri months: 31, 31, 31, 31, 31, 31, 30, 30, 30, 30, 30, 29/30
  const monthLengths = [31, 31, 31, 31, 31, 31, 30, 30, 30, 30, 30, isLeapYear ? 30 : 29];
  
  let month = 1;
  let day = Math.floor(dayOfYear);
  
  // Adjust day if it's beyond year end
  const yearLength = isLeapYear ? 366 : 365;
  if (day > yearLength) {
    day = yearLength;
  }
  if (day < 1) {
    day = 1;
  }
  
  // Find the correct month
  for (let i = 0; i < 12; i++) {
    if (day <= monthLengths[i]) {
      month = i + 1;
      break;
    }
    day -= monthLengths[i];
  }
  
  // Ensure valid month/day
  if (month < 1) month = 1;
  if (month > 12) month = 12;
  if (day < 1) day = 1;
  if (day > monthLengths[month - 1]) day = monthLengths[month - 1];
  
  const monthInfo = AFGHAN_SOLAR_MONTHS[month - 1];
  
  return {
    year: solarHijriYear,
    month: month,
    day: day,
    monthNameDari: monthInfo.dari,
    monthNamePashto: monthInfo.pashto,
  };
}

/**
 * Get number of days in a Solar Hijri month (1-12)
 */
export function getShamsiMonthLength(year: number, month: number): number {
  const cyclePosition = (year - 1) % 33;
  const isLeapYear = [1, 5, 9, 13, 17, 22, 26, 30].includes(cyclePosition);
  const lengths = [31, 31, 31, 31, 31, 31, 30, 30, 30, 30, 30, isLeapYear ? 30 : 29];
  return lengths[month - 1] ?? 30;
}

/**
 * Format Afghan Solar Hijri date for display
 */
export function formatAfghanSolarHijriDate(
  date: AfghanSolarHijriDate,
  language: 'dari' | 'pashto' = 'dari'
): string {
  const monthName = language === 'pashto' ? date.monthNamePashto : date.monthNameDari;
  return `${date.day} ${monthName} ${date.year}`;
}

/**
 * Convert Arabic numerals to Persian/Dari numerals
 */
function toPersianNumerals(num: number): string {
  const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  return num.toString().split('').map(d => persianDigits[parseInt(d)]).join('');
}

/**
 * Format date with Persian numerals
 */
export function formatAfghanSolarHijriDateWithPersianNumerals(
  date: AfghanSolarHijriDate,
  language: 'dari' | 'pashto' = 'dari'
): string {
  const monthName = language === 'pashto' ? date.monthNamePashto : date.monthNameDari;
  return `${toPersianNumerals(date.day)} ${monthName} ${toPersianNumerals(date.year)}`;
}
