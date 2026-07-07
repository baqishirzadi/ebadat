#!/usr/bin/env node
/**
 * Build offline city JSON files from GeoNames cities15000.txt
 * Run: node scripts/build-cities-json.mjs
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import https from 'node:https';
import { createWriteStream, existsSync } from 'node:fs';
import { pipeline } from 'node:stream/promises';
import { createGunzip } from 'node:zlib';
import { execSync } from 'node:child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'data', 'cities');
const TMP_DIR = path.join(ROOT, 'scripts', '.tmp');
const GEONAMES_URL = 'https://download.geonames.org/export/dump/cities15000.zip';

const REGION_DEFS = [
  { id: 'iran', name: 'ایران', nameEn: 'Iran', countries: ['IR'], minPop: 5000 },
  { id: 'turkey', name: 'ترکیه', nameEn: 'Turkey', countries: ['TR'], minPop: 8000 },
  { id: 'uk', name: 'انگلستان', nameEn: 'United Kingdom', countries: ['GB'], minPop: 5000 },
  { id: 'france', name: 'فرانسه', nameEn: 'France', countries: ['FR'], minPop: 5000 },
  { id: 'netherlands', name: 'هلند', nameEn: 'Netherlands', countries: ['NL'], minPop: 3000 },
  { id: 'germany', name: 'آلمان', nameEn: 'Germany', countries: ['DE'], minPop: 5000 },
  { id: 'pakistan', name: 'پاکستان', nameEn: 'Pakistan', countries: ['PK'], minPop: 15000 },
  { id: 'gulf', name: 'خلیج', nameEn: 'Gulf', countries: ['SA', 'AE', 'QA', 'KW', 'BH', 'OM'], minPop: 8000 },
  {
    id: 'europe',
    name: 'اروپا',
    nameEn: 'Europe',
    countries: [
      'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'GR', 'HU', 'IE', 'IT',
      'LV', 'LT', 'LU', 'MT', 'NO', 'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE', 'CH',
      'IS', 'AL', 'BA', 'MK', 'ME', 'RS', 'XK', 'MD', 'UA', 'BY',
    ],
    minPop: 10000,
    excludeCountries: ['GB', 'FR', 'NL', 'DE', 'TR'],
  },
  {
    id: 'asia',
    name: 'آسیا',
    nameEn: 'Asia',
    countries: [
      'AF', 'UZ', 'TJ', 'TM', 'KG', 'KZ', 'IN', 'BD', 'MY', 'ID', 'SG', 'TH', 'PH',
      'VN', 'CN', 'JP', 'KR', 'LK', 'NP', 'MM', 'KH', 'LA', 'AZ', 'GE', 'AM', 'IL', 'JO', 'LB', 'IQ', 'SY', 'YE', 'EG', 'MA', 'DZ', 'TN',
    ],
    minPop: 20000,
    excludeCountries: ['IR', 'TR', 'PK', 'SA', 'AE', 'QA', 'KW', 'BH', 'OM'],
  },
  {
    id: 'americas',
    name: 'آمریکا',
    nameEn: 'Americas',
    countries: ['US', 'CA', 'MX', 'BR', 'AR', 'CL', 'CO', 'PE', 'VE', 'EC', 'BO', 'PY', 'UY'],
    minPop: 20000,
  },
  {
    id: 'oceania',
    name: 'اقیانوسیه',
    nameEn: 'Oceania',
    countries: ['AU', 'NZ', 'FJ'],
    minPop: 8000,
  },
  {
    id: 'africa',
    name: 'آفریقا',
    nameEn: 'Africa',
    countries: ['ZA', 'NG', 'KE', 'ET', 'GH', 'TZ', 'UG', 'SD', 'SN', 'CI', 'CM', 'AO', 'MZ', 'ZW', 'ZM', 'RW', 'SO', 'LY', 'ML', 'NE', 'BF', 'TD', 'MR', 'GN', 'BJ', 'TG', 'SL', 'LR', 'GA', 'CG', 'CD', 'CF', 'SS'],
    minPop: 25000,
    excludeCountries: ['EG', 'MA', 'DZ', 'TN'],
  },
];

const PERSIAN_NAMES = {
  Tehran: 'تهران', Mashhad: 'مشهد', Isfahan: 'اصفهان', Karaj: 'کرج', Shiraz: 'شیراز',
  Tabriz: 'تبریز', Qom: 'قم', Ahvaz: 'اهواز', Kermanshah: 'کرمانشاه', Urmia: 'ارومیه',
  Rasht: 'رشت', Zahedan: 'زاهدان', Hamadan: 'همدان', Kerman: 'کرمان', Yazd: 'یزد',
  Ardabil: 'اردبیل', BandarAbbas: 'بندرعباس', Arak: 'اراک', Esfahan: 'اصفهان',
  Istanbul: 'استانبول', Ankara: 'آنکارا', Izmir: 'ازمیر', Bursa: 'بورسا', Antalya: 'آنتالیا',
  London: 'لندن', Manchester: 'منچستر', Birmingham: 'برمینگهام', Leeds: 'لیدز', Glasgow: 'گلاسگو',
  Paris: 'پاریس', Marseille: 'مارسی', Lyon: 'لیون', Toulouse: 'تولوز', Nice: 'نیس',
  Amsterdam: 'آمستردام', Rotterdam: 'روتردام', 'The Hague': 'لاهه', Utrecht: 'اوترخت',
  Berlin: 'برلین', Hamburg: 'هامبورگ', Munich: 'مونیخ', Cologne: 'کلن', Frankfurt: 'فرانکفورت',
  Kabul: 'کابل', Herat: 'هرات', Mazar: 'مزار شریف',
};

function slugify(name) {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 40) || 'city';
}

async function downloadGeonames() {
  fs.mkdirSync(TMP_DIR, { recursive: true });
  const zipPath = path.join(TMP_DIR, 'cities15000.zip');
  const txtPath = path.join(TMP_DIR, 'cities15000.txt');

  if (!existsSync(txtPath)) {
    console.log('Downloading GeoNames cities15000...');
    await new Promise((resolve, reject) => {
      const file = createWriteStream(zipPath);
      https.get(GEONAMES_URL, (res) => {
        if (res.statusCode !== 200) {
          reject(new Error(`Download failed: ${res.statusCode}`));
          return;
        }
        res.pipe(file);
        file.on('finish', resolve);
        file.on('error', reject);
      }).on('error', reject);
    });

    execSync(`unzip -o "${zipPath}" -d "${TMP_DIR}"`, { stdio: 'inherit' });
  }

  return fs.readFileSync(txtPath, 'utf8');
}

function parseCities(raw) {
  const rows = [];
  for (const line of raw.split('\n')) {
    if (!line.trim()) continue;
    const cols = line.split('\t');
    if (cols.length < 19) continue;
    rows.push({
      geonameId: cols[0],
      name: cols[1],
      asciiName: cols[2],
      lat: parseFloat(cols[4]),
      lon: parseFloat(cols[5]),
      country: cols[8],
      admin1: cols[10],
      population: parseInt(cols[14], 10) || 0,
      timezone: cols[17],
    });
  }
  return rows;
}

function cityRecord(regionId, city, usedKeys) {
  const baseKey = `${regionId}_${slugify(city.asciiName || city.name)}`;
  let key = baseKey;
  let i = 2;
  while (usedKeys.has(key)) {
    key = `${baseKey}_${i++}`;
  }
  usedKeys.add(key);

  const displayName = PERSIAN_NAMES[city.name] || PERSIAN_NAMES[city.asciiName] || city.name;
  return {
    key,
    lat: city.lat,
    lon: city.lon,
    name: displayName,
    nameEn: city.name,
    timezone: city.timezone,
    country: city.country,
    admin1: city.admin1,
    population: city.population,
    aliases: city.asciiName !== city.name ? [city.asciiName] : undefined,
  };
}

function buildRegion(region, allCities) {
  const usedKeys = new Set();
  const exclude = new Set(region.excludeCountries ?? []);
  const countries = new Set(region.countries);

  const filtered = allCities
    .filter((c) => countries.has(c.country) && !exclude.has(c.country))
    .filter((c) => c.population >= region.minPop)
    .sort((a, b) => b.population - a.population);

  const seen = new Set();
  const cities = [];
  for (const city of filtered) {
    const dedupe = `${city.country}:${city.name}:${Math.round(city.lat * 10)}:${Math.round(city.lon * 10)}`;
    if (seen.has(dedupe)) continue;
    seen.add(dedupe);
    cities.push(cityRecord(region.id, city, usedKeys));
    if (cities.length >= 600) break;
  }
  return cities;
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  let raw;
  try {
    raw = await downloadGeonames();
  } catch (err) {
    console.error('GeoNames download failed:', err.message);
    process.exit(1);
  }

  const allCities = parseCities(raw);
  console.log(`Parsed ${allCities.length} cities from GeoNames`);

  const index = {
    regions: REGION_DEFS.map((r) => ({
      id: r.id,
      name: r.name,
      nameEn: r.nameEn,
    })),
  };

  let total = 0;
  for (const region of REGION_DEFS) {
    const cities = buildRegion(region, allCities);
    total += cities.length;
    const outPath = path.join(OUT_DIR, `${region.id}.json`);
    fs.writeFileSync(outPath, JSON.stringify(cities));
    console.log(`  ${region.id}.json — ${cities.length} cities`);
  }

  fs.writeFileSync(path.join(OUT_DIR, 'index.json'), JSON.stringify(index, null, 2));
  console.log(`\nTotal: ${total} cities in ${REGION_DEFS.length} regions`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
