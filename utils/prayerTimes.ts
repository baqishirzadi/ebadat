/**
 * Prayer Times Calculation Engine
 * Based on astronomical calculations with Hanafi Asr support
 * Optimized for Afghan users (Kabul default)
 */

// Calculation method parameters
export interface CalculationParams {
  fajrAngle: number;
  ishaAngle: number;
  maghribAngle: number;
  midnight: 'Standard' | 'Jafari';
}

// Calculation methods
export const CalculationMethods: Record<string, CalculationParams> = {
  // Muslim World League
  MWL: { fajrAngle: 18, ishaAngle: 17, maghribAngle: 0, midnight: 'Standard' },
  // Islamic Society of North America
  ISNA: { fajrAngle: 15, ishaAngle: 15, maghribAngle: 0, midnight: 'Standard' },
  // Egyptian General Authority
  Egypt: { fajrAngle: 19.5, ishaAngle: 17.5, maghribAngle: 0, midnight: 'Standard' },
  // Umm Al-Qura University, Makkah
  Makkah: { fajrAngle: 18.5, ishaAngle: 0, maghribAngle: 0, midnight: 'Standard' },
  // University of Islamic Sciences, Karachi (common in Afghanistan)
  Karachi: { fajrAngle: 18, ishaAngle: 18, maghribAngle: 0, midnight: 'Standard' },
  // Tehran (for reference)
  Tehran: { fajrAngle: 17.7, ishaAngle: 14, maghribAngle: 4.5, midnight: 'Jafari' },
};

// Asr calculation methods
export type AsrMethod = 'Standard' | 'Hanafi';

// Prayer times result
export interface PrayerTimes {
  fajr: Date;
  sunrise: Date;
  dhuhr: Date;
  asr: Date;
  maghrib: Date;
  isha: Date;
  midnight: Date;
  // Additional info
  qiyam: Date; // Last third of night
}

// Location interface
export interface Location {
  latitude: number;
  longitude: number;
  altitude?: number;
  timezone?: string;
}

// Default location: Kabul, Afghanistan
export const DEFAULT_LOCATION: Location = {
  latitude: 34.5553,
  longitude: 69.2075,
  altitude: 1791,
  timezone: 'Asia/Kabul',
};

// Afghan cities for manual selection
export const AFGHAN_CITIES: Record<string, Location> = {
  kabul: { latitude: 34.5553, longitude: 69.2075, altitude: 1791, timezone: 'Asia/Kabul' },
  herat: { latitude: 34.3529, longitude: 62.2163, altitude: 920, timezone: 'Asia/Kabul' },
  mazar: { latitude: 36.7069, longitude: 67.1147, altitude: 380, timezone: 'Asia/Kabul' },
  kandahar: { latitude: 31.6257, longitude: 65.7101, altitude: 1005, timezone: 'Asia/Kabul' },
  jalalabad: { latitude: 34.4253, longitude: 70.4511, altitude: 575, timezone: 'Asia/Kabul' },
  kunduz: { latitude: 36.7281, longitude: 68.8577, altitude: 395, timezone: 'Asia/Kabul' },
  ghazni: { latitude: 33.5469, longitude: 68.4269, altitude: 2219, timezone: 'Asia/Kabul' },
  bamiyan: { latitude: 34.8213, longitude: 67.8213, altitude: 2550, timezone: 'Asia/Kabul' },
  farah: { latitude: 32.3735, longitude: 62.1130, altitude: 660, timezone: 'Asia/Kabul' },
  badakhshan: { latitude: 36.7347, longitude: 70.8119, altitude: 1250, timezone: 'Asia/Kabul' },
};

// Utility functions for astronomical calculations
const DEG_TO_RAD = Math.PI / 180;
const RAD_TO_DEG = 180 / Math.PI;

function sin(deg: number): number {
  return Math.sin(deg * DEG_TO_RAD);
}

function cos(deg: number): number {
  return Math.cos(deg * DEG_TO_RAD);
}

function tan(deg: number): number {
  return Math.tan(deg * DEG_TO_RAD);
}

function asin(x: number): number {
  return Math.asin(x) * RAD_TO_DEG;
}

function acos(x: number): number {
  return Math.acos(x) * RAD_TO_DEG;
}

function atan2(y: number, x: number): number {
  return Math.atan2(y, x) * RAD_TO_DEG;
}

function fixAngle(angle: number): number {
  return angle - 360 * Math.floor(angle / 360);
}

function fixHour(hour: number): number {
  return hour - 24 * Math.floor(hour / 24);
}

// Julian date calculation
function julianDate(year: number, month: number, day: number): number {
  if (month <= 2) {
    year -= 1;
    month += 12;
  }
  const A = Math.floor(year / 100);
  const B = 2 - A + Math.floor(A / 4);
  return Math.floor(365.25 * (year + 4716)) + Math.floor(30.6001 * (month + 1)) + day + B - 1524.5;
}

// Sun position calculations
function sunPosition(jd: number): { declination: number; equation: number } {
  const D = jd - 2451545.0;
  const g = fixAngle(357.529 + 0.98560028 * D);
  const q = fixAngle(280.459 + 0.98564736 * D);
  const L = fixAngle(q + 1.915 * sin(g) + 0.020 * sin(2 * g));
  const e = 23.439 - 0.00000036 * D;
  const RA = atan2(cos(e) * sin(L), cos(L)) / 15;
  const declination = asin(sin(e) * sin(L));
  const equation = q / 15 - fixHour(RA);
  return { declination, equation };
}

// Calculate prayer time for an angle
function computeTime(
  angle: number,
  time: number,
  direction: 'ccw' | 'cw',
  latitude: number,
  declination: number
): number {
  const D = cos(angle) - sin(latitude) * sin(declination);
  const N = cos(latitude) * cos(declination);
  
  // Handle edge cases: N cannot be zero, and ratio must be in [-1, 1] for acos
  if (Math.abs(N) < 0.0001) {
    console.warn(`[computeTime] N is too small (${N}), using fallback calculation`);
    // Fallback: return a reasonable time based on direction
    return direction === 'ccw' ? time - 1 : time + 1;
  }
  
  const ratio = D / N;
  
  // Clamp ratio to valid range for acos [-1, 1]
  const clampedRatio = Math.max(-1, Math.min(1, ratio));
  
  const t = acos(clampedRatio) / 15;
  const result = time + (direction === 'ccw' ? -t : t);
  
  // Final safety check: if result is NaN, return a fallback
  if (isNaN(result)) {
    console.warn(`[computeTime] Result is NaN, using fallback. Input: angle=${angle}, time=${time}, lat=${latitude}, dec=${declination}`);
    return direction === 'ccw' ? time - 1 : time + 1;
  }
  
  return result;
}

// Main prayer times calculation
export function calculatePrayerTimes(
  date: Date,
  location: Location,
  method: keyof typeof CalculationMethods = 'Karachi',
  asrMethod: AsrMethod = 'Hanafi'
): PrayerTimes {
  const params = CalculationMethods[method];
  const { latitude, longitude, altitude = 0 } = location;

  // Get Julian date at noon
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const jd = julianDate(year, month, day) - longitude / (15 * 24);

  // Sun position
  const { declination, equation } = sunPosition(jd);

  // Transit time (Dhuhr)
  const dhuhrTime = 12 + equation;

  // Fajr
  const fajrTime = computeTime(params.fajrAngle, dhuhrTime, 'ccw', latitude, declination);

  // Sunrise (sun at horizon + altitude adjustment)
  const sunriseAngle = 0.833 + 0.0347 * Math.sqrt(altitude);
  const sunriseTime = computeTime(sunriseAngle, dhuhrTime, 'ccw', latitude, declination);

  // Asr
  // Hanafi: shadow = 2x object height + noon shadow
  // Standard: shadow = 1x object height + noon shadow
  const asrFactor = asrMethod === 'Hanafi' ? 2 : 1;
  const asrAngle = -Math.atan(1 / (asrFactor + tan(Math.abs(latitude - declination)))) * RAD_TO_DEG;
  const asrTime = computeTime(asrAngle, dhuhrTime, 'cw', latitude, declination);

  // Maghrib (sunset)
  const maghribAngle = params.maghribAngle > 0 ? params.maghribAngle : 0.833 + 0.0347 * Math.sqrt(altitude);
  const maghribTime = computeTime(maghribAngle, dhuhrTime, 'cw', latitude, declination);

  // Isha
  let ishaTime: number;
  if (params.ishaAngle > 0) {
    ishaTime = computeTime(params.ishaAngle, dhuhrTime, 'cw', latitude, declination);
  } else {
    // 90 minutes after Maghrib (Umm Al-Qura method)
    ishaTime = isNaN(maghribTime) ? dhuhrTime + 7.5 : maghribTime + 1.5;
  }

  // Midnight - validate inputs before calculation
  let midnightTime: number;
  if (isNaN(fajrTime) || isNaN(maghribTime)) {
    console.warn(`[calculatePrayerTimes] fajrTime or maghribTime is NaN, using fallback for midnight`);
    midnightTime = dhuhrTime + 12; // Fallback: 12 hours after dhuhr
  } else {
    midnightTime = params.midnight === 'Jafari'
      ? maghribTime + (fajrTime + 24 - maghribTime) / 2
      : (maghribTime + fajrTime + 24) / 2;
  }

  // Qiyam (last third of night) - validate inputs before calculation
  let qiyamTime: number;
  if (isNaN(fajrTime) || isNaN(maghribTime)) {
    console.warn(`[calculatePrayerTimes] fajrTime or maghribTime is NaN, using fallback for qiyam`);
    qiyamTime = dhuhrTime + 8; // Fallback: 8 hours after dhuhr
  } else {
    const nightDuration = fajrTime + 24 - maghribTime;
    qiyamTime = fajrTime - nightDuration / 3;
  }

  // Convert to Date objects
  const toDate = (hours: number): Date => {
    // Early return if hours is NaN
    if (isNaN(hours)) {
      console.warn(`[toDate] hours is NaN, using fallback (noon)`);
      const fallback = new Date(date);
      fallback.setHours(12, 0, 0, 0);
      return fallback;
    }
    
    // Normalize hours to 0-24 range (handle negative and > 24)
    let normalizedHours = hours;
    let dayOffset = 0;
    
    // Handle negative hours (previous day)
    if (normalizedHours < 0) {
      dayOffset = Math.floor(normalizedHours / 24) - 1;
      normalizedHours = normalizedHours - (dayOffset * 24);
    }
    
    // Handle hours > 24 (next day)
    if (normalizedHours >= 24) {
      dayOffset = Math.floor(normalizedHours / 24);
      normalizedHours = normalizedHours % 24;
    }
    
    const h = Math.floor(normalizedHours);
    const m = Math.floor((normalizedHours - h) * 60);
    const result = new Date(date);
    
    // Set the date first, then adjust for day offset
    if (dayOffset !== 0) {
      result.setDate(result.getDate() + dayOffset);
    }
    
    // Set hours and minutes
    result.setHours(h, m, 0, 0);
    
    // Validate the resulting date
    if (isNaN(result.getTime())) {
      // Fallback: use current date/time if invalid
      console.warn(`Invalid date created from hours: ${hours}, using fallback`);
      return new Date(date.getTime() + (hours * 60 * 60 * 1000));
    }
    
    return result;
  };

  
  // Normalize times before converting to Date (handle > 24 and < 0)
  const normalizeTime = (hours: number): number => {
    if (isNaN(hours)) {
      console.warn(`[normalizeTime] Input is NaN, using fallback`);
      return 12; // Fallback to noon
    }
    if (hours < 0) {
      return hours + 24;
    }
    if (hours >= 24) {
      return hours - 24;
    }
    return hours;
  };
  
  return {
    fajr: toDate(normalizeTime(fajrTime)),
    sunrise: toDate(normalizeTime(sunriseTime)),
    dhuhr: toDate(normalizeTime(dhuhrTime)),
    asr: toDate(normalizeTime(asrTime)),
    maghrib: toDate(normalizeTime(maghribTime)),
    isha: toDate(normalizeTime(ishaTime)),
    midnight: toDate(normalizeTime(midnightTime)),
    qiyam: toDate(normalizeTime(qiyamTime)),
  };
}

// Get next prayer
export function getNextPrayer(prayerTimes: PrayerTimes, now: Date = new Date()): {
  name: string;
  time: Date;
  nameArabic: string;
  nameDari: string;
  namePashto: string;
} {
  const prayers = [
    { key: 'fajr', nameArabic: 'الفجر', nameDari: 'صبح', namePashto: 'سهار' },
    { key: 'sunrise', nameArabic: 'الشروق', nameDari: 'طلوع آفتاب', namePashto: 'لمر ختل' },
    { key: 'dhuhr', nameArabic: 'الظهر', nameDari: 'ظهر', namePashto: 'غرمه' },
    { key: 'asr', nameArabic: 'العصر', nameDari: 'عصر', namePashto: 'مازدیګر' },
    { key: 'maghrib', nameArabic: 'المغرب', nameDari: 'مغرب', namePashto: 'ماښام' },
    { key: 'isha', nameArabic: 'العشاء', nameDari: 'عشا', namePashto: 'خفتن' },
  ];

  for (const prayer of prayers) {
    const time = prayerTimes[prayer.key as keyof PrayerTimes] as Date;
    if (time > now) {
      return {
        name: prayer.key,
        time,
        nameArabic: prayer.nameArabic,
        nameDari: prayer.nameDari,
        namePashto: prayer.namePashto,
      };
    }
  }

  // Return tomorrow's Fajr
  const tomorrowFajr = new Date(prayerTimes.fajr);
  tomorrowFajr.setDate(tomorrowFajr.getDate() + 1);
  return {
    name: 'fajr',
    time: tomorrowFajr,
    nameArabic: 'الفجر',
    nameDari: 'صبح',
    namePashto: 'سهار',
  };
}

// Format time for display
export function formatPrayerTime(date: Date, use24Hour: boolean = false): string {
  const hours = date.getHours();
  const minutes = date.getMinutes();

  if (use24Hour) {
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  }

  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
}

// Get time until next prayer
export function getTimeUntilPrayer(prayerTime: Date, now: Date = new Date()): {
  hours: number;
  minutes: number;
  seconds: number;
  total: number;
} {
  const diff = prayerTime.getTime() - now.getTime();
  const total = Math.max(0, Math.floor(diff / 1000));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  return { hours, minutes, seconds, total };
}

// Calculate Qibla direction (bearing FROM user TO Kaaba)
export function calculateQibla(location: Location): number {
  const KAABA_LAT = 21.4225;
  const KAABA_LNG = 39.8262;

  const lat1 = location.latitude * DEG_TO_RAD;
  const lng1 = location.longitude * DEG_TO_RAD;
  const lat2 = KAABA_LAT * DEG_TO_RAD;
  const lng2 = KAABA_LNG * DEG_TO_RAD;

  // Correct spherical bearing formula: FROM user TO Kaaba
  const dLng = lng2 - lng1;
  const y = Math.sin(dLng) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);

  let qibla = Math.atan2(y, x) * RAD_TO_DEG;
  qibla = (qibla + 360) % 360; // Normalize to 0-360

  // For Kabul (34.55°N, 69.21°E), this should return ~254° (West-Southwest)
  return qibla;
}

// Distance to Kaaba in kilometers
export function distanceToKaaba(location: Location): number {
  const KAABA_LAT = 21.4225;
  const KAABA_LNG = 39.8262;
  const R = 6371; // Earth's radius in km

  const lat1 = location.latitude * DEG_TO_RAD;
  const lat2 = KAABA_LAT * DEG_TO_RAD;
  const dLat = (KAABA_LAT - location.latitude) * DEG_TO_RAD;
  const dLng = (KAABA_LNG - location.longitude) * DEG_TO_RAD;

  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}
