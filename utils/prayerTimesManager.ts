/**
 * Prayer Times Manager
 * Uses adhan library for accurate prayer time calculations
 * Configured for Afghanistan with Hanafi madhab
 * Now supports international cities
 */

import { Coordinates, CalculationMethod, PrayerTimes, Madhab } from 'adhan';
import { getCity, ALL_CITIES, CityKey } from './cities';

// Legacy support: Keep old AFGHAN_CITIES for backward compatibility
export const AFGHAN_CITIES = {
  kabul: { 
    name: 'کابل',
    name_pashto: 'کابل',
    lat: 34.5553, 
    lon: 69.2075,
    timezone: 'Asia/Kabul'
  },
  herat: { 
    name: 'هرات',
    name_pashto: 'هرات',
    lat: 34.3482, 
    lon: 62.1997,
    timezone: 'Asia/Kabul'
  },
  kandahar: { 
    name: 'قندهار',
    name_pashto: 'کندهار',
    lat: 31.6295, 
    lon: 65.7372,
    timezone: 'Asia/Kabul'
  },
  mazar: { 
    name: 'مزار شریف',
    name_pashto: 'مزار شریف',
    lat: 36.7081, 
    lon: 67.1101,
    timezone: 'Asia/Kabul'
  },
  jalalabad: { 
    name: 'جلال‌آباد',
    name_pashto: 'جلال آباد',
    lat: 34.4415, 
    lon: 70.4361,
    timezone: 'Asia/Kabul'
  },
};

// Export new CityKey type
export { CityKey } from './cities';

export interface PrayerTimesResult {
  fajr: string;
  sunrise: string;
  dhuhr: string;
  asr: string;
  maghrib: string;
  isha: string;
  date: string;
}

// Format time in 12-hour format
function format12Hour(date: Date): string {
  let hours = date.getHours();
  const minutes = date.getMinutes();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12; // 0 should be 12
  const minutesStr = minutes < 10 ? '0' + minutes : String(minutes);
  return `${hours}:${minutesStr} ${ampm}`;
}

// Convert to Arabic/Persian numerals
function toArabicNumerals(str: string): string {
  const arabicNumerals = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  return str.replace(/[0-9]/g, d => arabicNumerals[parseInt(d)]);
}

// Fallback times for Kabul (in case calculation fails)
const FALLBACK_TIMES: PrayerTimesResult = {
  fajr: '۵:۳۰ AM',
  sunrise: '۷:۰۰ AM',
  dhuhr: '۱۲:۱۵ PM',
  asr: '۳:۴۵ PM',
  maghrib: '۶:۰۰ PM',
  isha: '۷:۳۰ PM',
  date: new Date().toLocaleDateString('fa-AF'),
};

export function calculatePrayerTimesWithAdhan(
  cityKey: CityKey = 'afghanistan_kabul',
  date: Date = new Date()
): PrayerTimesResult {
  try {
    // Try new city structure first
    let city = getCity(cityKey);
    
    // Fallback to legacy structure for backward compatibility
    if (!city && cityKey in AFGHAN_CITIES) {
      const legacyCity = AFGHAN_CITIES[cityKey as keyof typeof AFGHAN_CITIES];
      city = {
        lat: legacyCity.lat,
        lon: legacyCity.lon,
        name: legacyCity.name,
        nameEn: legacyCity.name,
        timezone: legacyCity.timezone,
        category: 'afghanistan',
        key: cityKey,
      };
    }
    
    // Final fallback to Kabul
    if (!city) {
      city = getCity('afghanistan_kabul') || {
        lat: 34.5553,
        lon: 69.2075,
        name: 'کابل',
        nameEn: 'Kabul',
        timezone: 'Asia/Kabul',
        category: 'afghanistan',
        key: 'afghanistan_kabul',
      };
    }
    
    // Create coordinates
    const coordinates = new Coordinates(city.lat, city.lon);
    
    // Use Karachi method (best for Afghanistan/Pakistan/India)
    // For other regions, still use Karachi as it's close to Hanafi standard
    const params = CalculationMethod.Karachi();
    
    // CRITICAL: Set Hanafi madhab for Asr calculation
    params.madhab = Madhab.Hanafi;
    
    // Calculate prayer times
    const prayerTimes = new PrayerTimes(coordinates, date, params);
    
    return {
      fajr: toArabicNumerals(format12Hour(prayerTimes.fajr)),
      sunrise: toArabicNumerals(format12Hour(prayerTimes.sunrise)),
      dhuhr: toArabicNumerals(format12Hour(prayerTimes.dhuhr)),
      asr: toArabicNumerals(format12Hour(prayerTimes.asr)), // Hanafi Asr (later)
      maghrib: toArabicNumerals(format12Hour(prayerTimes.maghrib)),
      isha: toArabicNumerals(format12Hour(prayerTimes.isha)),
      date: date.toLocaleDateString('fa-AF'),
    };
  } catch (error) {
    console.error('Error calculating prayer times:', error);
    return FALLBACK_TIMES;
  }
}
