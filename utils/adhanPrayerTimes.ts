/**
 * Prayer Times using Adhan Library
 * Configured for Hanafi Madhab (Afghanistan)
 */

import {
  CalculationMethod,
  PrayerTimes,
  Coordinates,
  Madhab,
  SunnahTimes,
} from 'adhan';

// Afghan cities with coordinates
export const AFGHAN_CITIES = {
  kabul: { lat: 34.5553, lon: 69.2075, name: 'کابل', nameEn: 'Kabul' },
  herat: { lat: 34.3482, lon: 62.1997, name: 'هرات', nameEn: 'Herat' },
  kandahar: { lat: 31.6295, lon: 65.7372, name: 'قندهار', nameEn: 'Kandahar' },
  mazar: { lat: 36.7081, lon: 67.1101, name: 'مزار شریف', nameEn: 'Mazar-i-Sharif' },
  jalalabad: { lat: 34.4415, lon: 70.4361, name: 'جلال‌آباد', nameEn: 'Jalalabad' },
  kunduz: { lat: 36.7281, lon: 68.8577, name: 'قندوز', nameEn: 'Kunduz' },
  ghazni: { lat: 33.5469, lon: 68.4269, name: 'غزنی', nameEn: 'Ghazni' },
  bamiyan: { lat: 34.8213, lon: 67.8213, name: 'بامیان', nameEn: 'Bamiyan' },
  farah: { lat: 32.3735, lon: 62.1130, name: 'فراه', nameEn: 'Farah' },
  badakhshan: { lat: 36.7347, lon: 70.8119, name: 'بدخشان', nameEn: 'Badakhshan' },
};

export type CityKey = keyof typeof AFGHAN_CITIES;

// Prayer names in different languages
export const PRAYER_NAMES = {
  fajr: { arabic: 'الفجر', dari: 'فجر', pashto: 'سهار', english: 'Fajr' },
  sunrise: { arabic: 'الشروق', dari: 'طلوع', pashto: 'لمر ختل', english: 'Sunrise' },
  dhuhr: { arabic: 'الظهر', dari: 'ظهر', pashto: 'غرمه', english: 'Dhuhr' },
  asr: { arabic: 'العصر', dari: 'عصر', pashto: 'مازدیګر', english: 'Asr' },
  maghrib: { arabic: 'المغرب', dari: 'مغرب', pashto: 'ماښام', english: 'Maghrib' },
  isha: { arabic: 'العشاء', dari: 'عشا', pashto: 'خفتن', english: 'Isha' },
};

export interface PrayerTimesResult {
  fajr: Date;
  sunrise: Date;
  dhuhr: Date;
  asr: Date;
  maghrib: Date;
  isha: Date;
  midnight: Date;
  lastThirdOfNight: Date;
}

/**
 * Calculate prayer times for Hanafi madhab
 * Uses Karachi method (standard for Pakistan, Afghanistan, Bangladesh, India)
 */
export function calculateHanafiPrayerTimes(
  latitude: number,
  longitude: number,
  date: Date = new Date()
): PrayerTimesResult {
  const coordinates = new Coordinates(latitude, longitude);
  
  // Use Karachi method (Fajr: 18°, Isha: 18°)
  const params = CalculationMethod.Karachi();
  
  // CRITICAL: Set Hanafi madhab for Asr calculation
  // Hanafi: Shadow = 2x object height (later than Shafi)
  params.madhab = Madhab.Hanafi;
  
  const prayerTimes = new PrayerTimes(coordinates, date, params);
  const sunnahTimes = new SunnahTimes(prayerTimes);
  
  return {
    fajr: prayerTimes.fajr,
    sunrise: prayerTimes.sunrise,
    dhuhr: prayerTimes.dhuhr,
    asr: prayerTimes.asr,
    maghrib: prayerTimes.maghrib,
    isha: prayerTimes.isha,
    midnight: sunnahTimes.middleOfTheNight,
    lastThirdOfNight: sunnahTimes.lastThirdOfTheNight,
  };
}

/**
 * Format time in 12-hour format (Afghan style)
 */
export function formatTime12Hour(date: Date): string {
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  
  // Return without leading zero (Afghan style)
  return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
}

/**
 * Format time in Dari/Pashto style
 */
export function formatTimeDari(date: Date): string {
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const period = hours >= 12 ? 'بعد از ظهر' : 'قبل از ظهر';
  const displayHours = hours % 12 || 12;
  
  // Convert to Dari numerals
  const dariNumerals = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  const formatNumber = (n: number): string => {
    return n.toString().split('').map(d => dariNumerals[parseInt(d)]).join('');
  };
  
  return `${formatNumber(displayHours)}:${formatNumber(minutes).padStart(2, '۰')}`;
}

/**
 * Get next prayer time
 */
export function getNextPrayer(prayerTimes: PrayerTimesResult, now: Date = new Date()): {
  name: keyof typeof PRAYER_NAMES;
  time: Date;
} {
  const prayers: (keyof typeof PRAYER_NAMES)[] = ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha'];
  
  for (const prayer of prayers) {
    const time = prayerTimes[prayer as keyof PrayerTimesResult] as Date;
    if (time > now) {
      return { name: prayer, time };
    }
  }
  
  // Return tomorrow's Fajr
  const tomorrow = new Date(prayerTimes.fajr);
  tomorrow.setDate(tomorrow.getDate() + 1);
  return { name: 'fajr', time: tomorrow };
}

/**
 * Calculate time remaining until a prayer
 */
export function getTimeRemaining(targetTime: Date, now: Date = new Date()): {
  hours: number;
  minutes: number;
  seconds: number;
  totalSeconds: number;
} {
  const diff = Math.max(0, targetTime.getTime() - now.getTime());
  const totalSeconds = Math.floor(diff / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  
  return { hours, minutes, seconds, totalSeconds };
}

/**
 * Calculate Qibla direction from a location
 */
export function calculateQiblaDirection(latitude: number, longitude: number): number {
  // Kaaba coordinates
  const KAABA_LAT = 21.4225;
  const KAABA_LNG = 39.8262;
  
  const lat1 = latitude * (Math.PI / 180);
  const lng1 = longitude * (Math.PI / 180);
  const lat2 = KAABA_LAT * (Math.PI / 180);
  const lng2 = KAABA_LNG * (Math.PI / 180);
  
  const dLng = lng2 - lng1;
  
  const y = Math.sin(dLng);
  const x = Math.cos(lat1) * Math.tan(lat2) - Math.sin(lat1) * Math.cos(dLng);
  
  let qibla = Math.atan2(y, x) * (180 / Math.PI);
  qibla = (qibla + 360) % 360;
  
  return qibla;
}
