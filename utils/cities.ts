/**
 * Comprehensive City Database
 * Organized by regions/countries with Afghan diaspora
 * Includes coordinates, timezone, and display names
 */

export interface City {
  lat: number;
  lon: number;
  name: string; // Dari/Pashto name
  nameEn: string; // English name
  timezone: string;
  altitude?: number; // in meters
  isImportant?: boolean; // Top 4 cities per category
}

export interface CityCategory {
  id: string;
  name: string; // Category name in Dari
  nameEn: string;
  cities: Record<string, City>;
}

export const CITIES: Record<string, CityCategory> = {
  afghanistan: {
    id: 'afghanistan',
    name: 'افغانستان',
    nameEn: 'Afghanistan',
    cities: {
      kabul: { lat: 34.5553, lon: 69.2075, name: 'کابل', nameEn: 'Kabul', timezone: 'Asia/Kabul', altitude: 1791, isImportant: true },
      herat: { lat: 34.3482, lon: 62.1997, name: 'هرات', nameEn: 'Herat', timezone: 'Asia/Kabul', altitude: 920, isImportant: true },
      kandahar: { lat: 31.6295, lon: 65.7372, name: 'قندهار', nameEn: 'Kandahar', timezone: 'Asia/Kabul', altitude: 1005, isImportant: true },
      mazar: { lat: 36.7081, lon: 67.1101, name: 'مزار شریف', nameEn: 'Mazar-i-Sharif', timezone: 'Asia/Kabul', altitude: 380, isImportant: true },
      jalalabad: { lat: 34.4415, lon: 70.4361, name: 'جلال‌آباد', nameEn: 'Jalalabad', timezone: 'Asia/Kabul', altitude: 575 },
      kunduz: { lat: 36.7281, lon: 68.8577, name: 'قندوز', nameEn: 'Kunduz', timezone: 'Asia/Kabul', altitude: 395 },
      ghazni: { lat: 33.5469, lon: 68.4269, name: 'غزنی', nameEn: 'Ghazni', timezone: 'Asia/Kabul', altitude: 2219 },
      bamiyan: { lat: 34.8213, lon: 67.8213, name: 'بامیان', nameEn: 'Bamiyan', timezone: 'Asia/Kabul', altitude: 2550 },
      farah: { lat: 32.3735, lon: 62.1130, name: 'فراه', nameEn: 'Farah', timezone: 'Asia/Kabul', altitude: 660 },
      badakhshan: { lat: 36.7347, lon: 70.8119, name: 'بدخشان', nameEn: 'Badakhshan', timezone: 'Asia/Kabul', altitude: 1250 },
      balkh: { lat: 36.7551, lon: 66.8975, name: 'بلخ', nameEn: 'Balkh', timezone: 'Asia/Kabul', altitude: 330 },
      baghlan: { lat: 36.1307, lon: 68.7083, name: 'بغلان', nameEn: 'Baghlan', timezone: 'Asia/Kabul', altitude: 528 },
      takhar: { lat: 36.7281, lon: 69.5347, name: 'تخار', nameEn: 'Takhar', timezone: 'Asia/Kabul', altitude: 460 },
      samangan: { lat: 36.2653, lon: 68.0167, name: 'سمنگان', nameEn: 'Samangan', timezone: 'Asia/Kabul', altitude: 960 },
      sarepol: { lat: 36.2153, lon: 65.9364, name: 'سرپل', nameEn: 'Sar-e Pol', timezone: 'Asia/Kabul', altitude: 600 },
      laghman: { lat: 34.6667, lon: 70.2000, name: 'لغمان', nameEn: 'Laghman', timezone: 'Asia/Kabul', altitude: 580 },
      kunar: { lat: 34.8500, lon: 71.1500, name: 'کنر', nameEn: 'Kunar', timezone: 'Asia/Kabul', altitude: 850 },
      nuristan: { lat: 35.2500, lon: 70.8333, name: 'نورستان', nameEn: 'Nuristan', timezone: 'Asia/Kabul', altitude: 2000 },
      paktiya: { lat: 33.6000, lon: 69.2167, name: 'پکتیا', nameEn: 'Paktiya', timezone: 'Asia/Kabul', altitude: 2300 },
      khost: { lat: 33.3394, lon: 69.9203, name: 'خوست', nameEn: 'Khost', timezone: 'Asia/Kabul', altitude: 1150 },
      paktika: { lat: 32.5000, lon: 68.8000, name: 'پکتیکا', nameEn: 'Paktika', timezone: 'Asia/Kabul', altitude: 2100 },
      logar: { lat: 34.0167, lon: 69.2167, name: 'لوگر', nameEn: 'Logar', timezone: 'Asia/Kabul', altitude: 1950 },
      wardak: { lat: 34.2333, lon: 68.3667, name: 'وردک', nameEn: 'Wardak', timezone: 'Asia/Kabul', altitude: 2200 },
      maidanwardak: { lat: 34.4000, lon: 68.8333, name: 'میدان وردک', nameEn: 'Maidan Wardak', timezone: 'Asia/Kabul', altitude: 2300 },
      daykundi: { lat: 33.9500, lon: 66.2333, name: 'دایکندی', nameEn: 'Daykundi', timezone: 'Asia/Kabul', altitude: 2200 },
      nimruz: { lat: 31.0333, lon: 62.1000, name: 'نیمروز', nameEn: 'Nimruz', timezone: 'Asia/Kabul', altitude: 480 },
      helmand: { lat: 31.5833, lon: 64.3667, name: 'هلمند', nameEn: 'Helmand', timezone: 'Asia/Kabul', altitude: 700 },
      badghis: { lat: 34.8000, lon: 63.8833, name: 'بادغیس', nameEn: 'Badghis', timezone: 'Asia/Kabul', altitude: 500 },
      ghor: { lat: 34.3500, lon: 65.1500, name: 'غور', nameEn: 'Ghor', timezone: 'Asia/Kabul', altitude: 2200 },
      kapisa: { lat: 34.8667, lon: 69.6167, name: 'کاپیسا', nameEn: 'Kapisa', timezone: 'Asia/Kabul', altitude: 1500 },
      parwan: { lat: 35.1167, lon: 69.2333, name: 'پروان', nameEn: 'Parwan', timezone: 'Asia/Kabul', altitude: 1400 },
      panjshir: { lat: 35.3167, lon: 69.5167, name: 'پنجشیر', nameEn: 'Panjshir', timezone: 'Asia/Kabul', altitude: 2200 },
      zabul: { lat: 32.1333, lon: 67.2833, name: 'زابل', nameEn: 'Zabul', timezone: 'Asia/Kabul', altitude: 1700 },
      uruzgan: { lat: 32.9333, lon: 66.6333, name: 'ارزگان', nameEn: 'Uruzgan', timezone: 'Asia/Kabul', altitude: 2000 },
    },
  },
  iran: {
    id: 'iran',
    name: 'ایران',
    nameEn: 'Iran',
    cities: {
      tehran: { lat: 35.6892, lon: 51.3890, name: 'تهران', nameEn: 'Tehran', timezone: 'Asia/Tehran', altitude: 1200, isImportant: true },
      mashhad: { lat: 36.2605, lon: 59.6168, name: 'مشهد', nameEn: 'Mashhad', timezone: 'Asia/Tehran', altitude: 995, isImportant: true },
      qom: { lat: 34.6416, lon: 50.8746, name: 'قم', nameEn: 'Qom', timezone: 'Asia/Tehran', altitude: 928, isImportant: true },
      isfahan: { lat: 32.6546, lon: 51.6680, name: 'اصفهان', nameEn: 'Isfahan', timezone: 'Asia/Tehran', altitude: 1574, isImportant: true },
      shiraz: { lat: 29.5918, lon: 52.5837, name: 'شیراز', nameEn: 'Shiraz', timezone: 'Asia/Tehran', altitude: 1500 },
      tabriz: { lat: 38.0962, lon: 46.2738, name: 'تبریز', nameEn: 'Tabriz', timezone: 'Asia/Tehran', altitude: 1351 },
    },
  },
  turkey: {
    id: 'turkey',
    name: 'ترکیه',
    nameEn: 'Turkey',
    cities: {
      istanbul: { lat: 41.0082, lon: 28.9784, name: 'استانبول', nameEn: 'Istanbul', timezone: 'Europe/Istanbul', altitude: 100, isImportant: true },
      ankara: { lat: 39.9334, lon: 32.8597, name: 'آنکارا', nameEn: 'Ankara', timezone: 'Europe/Istanbul', altitude: 938, isImportant: true },
      izmir: { lat: 38.4237, lon: 27.1428, name: 'ازمیر', nameEn: 'Izmir', timezone: 'Europe/Istanbul', altitude: 25, isImportant: true },
      antalya: { lat: 36.8969, lon: 30.7133, name: 'آنتالیا', nameEn: 'Antalya', timezone: 'Europe/Istanbul', altitude: 30, isImportant: true },
    },
  },
  europe: {
    id: 'europe',
    name: 'اروپا',
    nameEn: 'Europe',
    cities: {
      london: { lat: 51.5074, lon: -0.1278, name: 'لندن', nameEn: 'London', timezone: 'Europe/London', altitude: 35, isImportant: true },
      hamburg: { lat: 53.5511, lon: 9.9937, name: 'هامبورگ', nameEn: 'Hamburg', timezone: 'Europe/Berlin', altitude: 6, isImportant: true },
      berlin: { lat: 52.5200, lon: 13.4050, name: 'برلین', nameEn: 'Berlin', timezone: 'Europe/Berlin', altitude: 34, isImportant: true },
      stockholm: { lat: 59.3293, lon: 18.0686, name: 'استکهلم', nameEn: 'Stockholm', timezone: 'Europe/Stockholm', altitude: 28, isImportant: true },
      amsterdam: { lat: 52.3676, lon: 4.9041, name: 'آمستردام', nameEn: 'Amsterdam', timezone: 'Europe/Amsterdam', altitude: 2 },
      paris: { lat: 48.8566, lon: 2.3522, name: 'پاریس', nameEn: 'Paris', timezone: 'Europe/Paris', altitude: 35 },
      vienna: { lat: 48.2082, lon: 16.3738, name: 'وین', nameEn: 'Vienna', timezone: 'Europe/Vienna', altitude: 171 },
    },
  },
  usa: {
    id: 'usa',
    name: 'آمریکا',
    nameEn: 'United States',
    cities: {
      washingtondc: { lat: 38.9072, lon: -77.0369, name: 'واشنگتن', nameEn: 'Washington DC', timezone: 'America/New_York', altitude: 20, isImportant: true },
      arlington: { lat: 38.8816, lon: -77.0910, name: 'آرلینگتون (ویرجینیا)', nameEn: 'Arlington, VA', timezone: 'America/New_York', altitude: 70, isImportant: true },
      fremont: { lat: 37.5483, lon: -121.9886, name: 'فریمانت (کالیفرنیا)', nameEn: 'Fremont, CA', timezone: 'America/Los_Angeles', altitude: 17, isImportant: true },
      newyork: { lat: 40.7128, lon: -74.0060, name: 'نیویورک', nameEn: 'New York, NY', timezone: 'America/New_York', altitude: 10, isImportant: true },
      sanjose: { lat: 37.3382, lon: -121.8863, name: 'سان خوزه (کالیفرنیا)', nameEn: 'San Jose, CA', timezone: 'America/Los_Angeles', altitude: 26 },
      sacramento: { lat: 38.5816, lon: -121.4944, name: 'ساکرامنتو (کالیفرنیا)', nameEn: 'Sacramento, CA', timezone: 'America/Los_Angeles', altitude: 9 },
      losangeles: { lat: 34.0522, lon: -118.2437, name: 'لس آنجلس (کالیفرنیا)', nameEn: 'Los Angeles, CA', timezone: 'America/Los_Angeles', altitude: 71 },
      houston: { lat: 29.7604, lon: -95.3698, name: 'هیوستون (تگزاس)', nameEn: 'Houston, TX', timezone: 'America/Chicago', altitude: 13 },
      dallas: { lat: 32.7767, lon: -96.7970, name: 'دالاس (تگزاس)', nameEn: 'Dallas, TX', timezone: 'America/Chicago', altitude: 131 },
      chicago: { lat: 41.8781, lon: -87.6298, name: 'شیکاگو', nameEn: 'Chicago, IL', timezone: 'America/Chicago', altitude: 176 },
      boston: { lat: 42.3601, lon: -71.0589, name: 'بوستون', nameEn: 'Boston, MA', timezone: 'America/New_York', altitude: 43 },
    },
  },
  canada: {
    id: 'canada',
    name: 'کانادا',
    nameEn: 'Canada',
    cities: {
      toronto: { lat: 43.6532, lon: -79.3832, name: 'تورنتو', nameEn: 'Toronto', timezone: 'America/Toronto', altitude: 173, isImportant: true },
      vancouver: { lat: 49.2827, lon: -123.1207, name: 'ونکوور', nameEn: 'Vancouver', timezone: 'America/Vancouver', altitude: 70, isImportant: true },
      montreal: { lat: 45.5017, lon: -73.5673, name: 'مونترال', nameEn: 'Montreal', timezone: 'America/Toronto', altitude: 36, isImportant: true },
      calgary: { lat: 51.0447, lon: -114.0719, name: 'کالگری', nameEn: 'Calgary', timezone: 'America/Edmonton', altitude: 1048, isImportant: true },
    },
  },
  australia: {
    id: 'australia',
    name: 'استرالیا',
    nameEn: 'Australia',
    cities: {
      sydney: { lat: -33.8688, lon: 151.2093, name: 'سیدنی', nameEn: 'Sydney', timezone: 'Australia/Sydney', altitude: 19, isImportant: true },
      melbourne: { lat: -37.8136, lon: 144.9631, name: 'ملبورن', nameEn: 'Melbourne', timezone: 'Australia/Melbourne', altitude: 31, isImportant: true },
      perth: { lat: -31.9505, lon: 115.8605, name: 'پرت', nameEn: 'Perth', timezone: 'Australia/Perth', altitude: 31, isImportant: true },
    },
  },
};

// Flatten all cities for easy lookup
export const ALL_CITIES: Record<string, City & { category: string; key: string }> = {};

Object.entries(CITIES).forEach(([categoryId, category]) => {
  Object.entries(category.cities).forEach(([cityKey, city]) => {
    const fullKey = `${categoryId}_${cityKey}`;
    ALL_CITIES[fullKey] = {
      ...city,
      category: categoryId,
      key: fullKey,
    };
  });
});

// Get city by full key
export function getCity(fullKey: string): (City & { category: string; key: string }) | undefined {
  return ALL_CITIES[fullKey];
}

// Find nearest city to coordinates
export function findNearestCity(lat: number, lon: number): string | null {
  let nearestKey: string | null = null;
  let minDistance = Infinity;

  Object.entries(ALL_CITIES).forEach(([key, city]) => {
    const distance = calculateDistance(lat, lon, city.lat, city.lon);
    if (distance < minDistance) {
      minDistance = distance;
      nearestKey = key;
    }
  });

  return nearestKey;
}

// Calculate distance between two coordinates (Haversine formula)
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Search cities by name
export function searchCities(query: string): Array<{ key: string; city: City & { category: string } }> {
  const lowerQuery = query.toLowerCase().trim();
  if (!lowerQuery) return [];

  const results: Array<{ key: string; city: City & { category: string } }> = [];

  Object.entries(ALL_CITIES).forEach(([key, city]) => {
    if (
      city.name.includes(query) ||
      city.nameEn.toLowerCase().includes(lowerQuery) ||
      city.name.toLowerCase().includes(lowerQuery)
    ) {
      results.push({ key, city });
    }
  });

  return results.sort((a, b) => {
    // Prioritize exact matches
    if (a.city.name === query) return -1;
    if (b.city.name === query) return 1;
    return a.city.name.localeCompare(b.city.name);
  });
}

// Export category list
export const CATEGORIES = Object.values(CITIES).map(cat => ({
  id: cat.id,
  name: cat.name,
  nameEn: cat.nameEn,
}));

// Export type for city key
export type CityKey = string; // Format: "category_city" e.g., "afghanistan_kabul"

// Get important cities only (top 4 per category)
export function getImportantCities(categoryId?: string): Array<{ key: string; city: City & { category: string } }> {
  const results: Array<{ key: string; city: City & { category: string } }> = [];
  
  if (categoryId) {
    // Get important cities for specific category
    const category = CITIES[categoryId];
    if (category) {
      Object.entries(category.cities).forEach(([cityKey, city]) => {
        if (city.isImportant) {
          results.push({
            key: `${categoryId}_${cityKey}`,
            city: { ...city, category: categoryId, key: `${categoryId}_${cityKey}` },
          });
        }
      });
    }
  } else {
    // Get important cities from all categories
    Object.entries(CITIES).forEach(([catId, category]) => {
      Object.entries(category.cities).forEach(([cityKey, city]) => {
        if (city.isImportant) {
          results.push({
            key: `${catId}_${cityKey}`,
            city: { ...city, category: catId, key: `${catId}_${cityKey}` },
          });
        }
      });
    });
  }
  
  return results;
}
