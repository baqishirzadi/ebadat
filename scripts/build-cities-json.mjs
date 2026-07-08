#!/usr/bin/env node
/**
 * Build curated offline city JSON: provinces/states + major cities only.
 * Run: node scripts/build-cities-json.mjs
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import https from 'node:https';
import { createWriteStream, existsSync } from 'node:fs';
import { execSync } from 'node:child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'data', 'cities');
const TMP_DIR = path.join(ROOT, 'scripts', '.tmp');
const GEONAMES_CITIES_URL = 'https://download.geonames.org/export/dump/cities15000.zip';
const GEONAMES_ADMIN1_URL = 'https://download.geonames.org/export/dump/admin1CodesASCII.txt';

const PERSIAN = JSON.parse(
  fs.readFileSync(path.join(OUT_DIR, 'persian-names.json'), 'utf8'),
);

/** Per-country minimum population for "major" city tier */
const MAJOR_POP_BY_COUNTRY = {
  IR: 100_000,
  TR: 80_000,
  GB: 80_000,
  FR: 80_000,
  NL: 50_000,
  DE: 80_000,
  PK: 150_000,
  SA: 80_000,
  AE: 80_000,
  QA: 50_000,
  KW: 50_000,
  BH: 30_000,
  OM: 50_000,
  US: 200_000,
  CA: 100_000,
  AU: 80_000,
  RU: 150_000,
  UZ: 80_000,
  TJ: 50_000,
  TM: 50_000,
  KG: 50_000,
  KZ: 100_000,
  IN: 500_000,
  CN: 500_000,
  AF: 50_000,
  DEFAULT: 100_000,
};

const REGION_DEFS = [
  { id: 'iran', name: 'ایران', nameEn: 'Iran', countries: ['IR'] },
  { id: 'turkey', name: 'ترکیه', nameEn: 'Turkey', countries: ['TR'] },
  { id: 'uk', name: 'انگلستان', nameEn: 'United Kingdom', countries: ['GB'], maxMajorsPerCountry: 15 },
  { id: 'france', name: 'فرانسه', nameEn: 'France', countries: ['FR'] },
  { id: 'netherlands', name: 'هلند', nameEn: 'Netherlands', countries: ['NL'] },
  { id: 'germany', name: 'آلمان', nameEn: 'Germany', countries: ['DE'] },
  { id: 'pakistan', name: 'پاکستان', nameEn: 'Pakistan', countries: ['PK'] },
  { id: 'gulf', name: 'خلیج', nameEn: 'Gulf', countries: ['SA', 'AE', 'QA', 'KW', 'BH', 'OM'], maxMajorsPerCountry: 6 },
  { id: 'russia', name: 'روسیه', nameEn: 'Russia', countries: ['RU'] },
  {
    id: 'central-asia',
    name: 'آسیای مرکزی',
    nameEn: 'Central Asia',
    countries: ['UZ', 'TJ', 'TM', 'KG', 'KZ'],
  },
  {
    id: 'europe',
    name: 'اروپا',
    nameEn: 'Europe',
    countries: [
      'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'GR', 'HU', 'IE', 'IT',
      'LV', 'LT', 'LU', 'MT', 'NO', 'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE', 'CH',
      'IS', 'AL', 'BA', 'MK', 'ME', 'RS', 'XK', 'MD', 'UA', 'BY',
    ],
    excludeCountries: ['GB', 'FR', 'NL', 'DE', 'TR', 'RU'],
    maxMajorsPerCountry: 6,
    maxTotal: 250,
  },
  {
    id: 'asia',
    name: 'آسیا',
    nameEn: 'Asia',
    countries: [
      'IN', 'BD', 'MY', 'ID', 'SG', 'TH', 'PH', 'VN', 'CN', 'JP', 'KR', 'LK', 'NP',
      'MM', 'KH', 'LA', 'AZ', 'GE', 'AM', 'IL', 'JO', 'LB', 'IQ', 'SY', 'YE',
      'EG', 'MA', 'DZ', 'TN',
    ],
    excludeCountries: ['IR', 'TR', 'PK', 'SA', 'AE', 'QA', 'KW', 'BH', 'OM', 'UZ', 'TJ', 'TM', 'KG', 'KZ', 'AF'],
    maxMajorsPerCountry: 5,
    maxTotal: 300,
  },
  {
    id: 'americas',
    name: 'آمریکا',
    nameEn: 'Americas',
    countries: ['US', 'CA', 'MX', 'BR', 'AR', 'CL', 'CO', 'PE', 'VE', 'EC', 'BO', 'PY', 'UY'],
    maxMajorsPerCountry: 8,
    maxTotal: 280,
  },
  {
    id: 'oceania',
    name: 'اقیانوسیه',
    nameEn: 'Oceania',
    countries: ['AU', 'NZ', 'FJ'],
  },
  {
    id: 'africa',
    name: 'آفریقا',
    nameEn: 'Africa',
    countries: [
      'ZA', 'NG', 'KE', 'ET', 'GH', 'TZ', 'UG', 'SD', 'SN', 'CI', 'CM', 'AO', 'MZ',
      'ZW', 'ZM', 'RW', 'SO', 'LY', 'ML', 'NE', 'BF', 'TD', 'MR', 'GN', 'BJ', 'TG',
      'SL', 'LR', 'GA', 'CG', 'CD', 'CF', 'SS',
    ],
    excludeCountries: ['EG', 'MA', 'DZ', 'TN'],
    maxMajorsPerCountry: 4,
    maxTotal: 200,
  },
];

function slugify(name) {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 40) || 'city';
}

function downloadFile(url, destPath) {
  return new Promise((resolve, reject) => {
    if (existsSync(destPath)) {
      resolve();
      return;
    }
    const file = createWriteStream(destPath);
    https.get(url, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`Download failed ${url}: ${res.statusCode}`));
        return;
      }
      res.pipe(file);
      file.on('finish', resolve);
      file.on('error', reject);
    }).on('error', reject);
  });
}

async function downloadGeonames() {
  fs.mkdirSync(TMP_DIR, { recursive: true });
  const zipPath = path.join(TMP_DIR, 'cities15000.zip');
  const txtPath = path.join(TMP_DIR, 'cities15000.txt');
  const admin1Path = path.join(TMP_DIR, 'admin1CodesASCII.txt');

  if (!existsSync(txtPath)) {
    console.log('Downloading GeoNames cities15000...');
    await downloadFile(GEONAMES_CITIES_URL, zipPath);
    execSync(`unzip -o "${zipPath}" -d "${TMP_DIR}"`, { stdio: 'inherit' });
  }

  if (!existsSync(admin1Path)) {
    console.log('Downloading GeoNames admin1Codes...');
    await downloadFile(GEONAMES_ADMIN1_URL, admin1Path);
  }

  return {
    citiesRaw: fs.readFileSync(txtPath, 'utf8'),
    admin1Raw: fs.readFileSync(admin1Path, 'utf8'),
  };
}

function parseAdmin1(raw) {
  const map = new Map();
  for (const line of raw.split('\n')) {
    if (!line.trim()) continue;
    const parts = line.split('\t');
    if (parts.length < 2) continue;
    const code = parts[0];
    const name = parts[1];
    const [country, adminCode] = code.split('.');
    map.set(`${country}:${adminCode}`, { code, name, country, adminCode });
  }
  return map;
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

function persianCityName(city) {
  return PERSIAN.cities[city.name] || PERSIAN.cities[city.asciiName] || city.name;
}

function persianAdmin1(country, admin1Code, admin1NameEn) {
  const byName = PERSIAN.admin1ByName?.[`${country}:${admin1NameEn}`];
  if (byName) return byName;
  const byCode = PERSIAN.admin1?.[`${country}:${admin1Code}`];
  if (byCode) return byCode;
  return admin1NameEn || admin1Code;
}

function persianCountry(country) {
  return PERSIAN.countries[country] || country;
}

function majorPopThreshold(country) {
  return MAJOR_POP_BY_COUNTRY[country] ?? MAJOR_POP_BY_COUNTRY.DEFAULT;
}

function makeRecord(regionId, city, admin1Map, tier, usedKeys) {
  const adminKey = `${city.country}:${city.admin1}`;
  const adminInfo = admin1Map.get(adminKey);
  const admin1NameEn = adminInfo?.name ?? city.admin1;

  const baseSlug = tier === 'province'
    ? `province_${slugify(admin1NameEn)}`
    : slugify(city.asciiName || city.name);

  let key = `${regionId}_${baseSlug}`;
  let i = 2;
  while (usedKeys.has(key)) {
    key = `${regionId}_${baseSlug}_${i++}`;
  }
  usedKeys.add(key);

  const displayName = tier === 'province'
    ? persianAdmin1(city.country, city.admin1, admin1NameEn)
    : persianCityName(city);

  return {
    key,
    lat: city.lat,
    lon: city.lon,
    name: displayName,
    nameEn: tier === 'province' ? admin1NameEn : city.name,
    timezone: city.timezone,
    country: city.country,
    admin1: city.admin1,
    admin1Name: persianAdmin1(city.country, city.admin1, admin1NameEn),
    admin1NameEn,
    countryName: persianCountry(city.country),
    population: city.population,
    tier,
    isImportant: true,
    aliases: city.asciiName !== city.name ? [city.asciiName] : undefined,
  };
}

function buildRegion(region, allCities, admin1Map) {
  const usedKeys = new Set();
  const exclude = new Set(region.excludeCountries ?? []);
  const countries = new Set(region.countries);

  const regionCities = allCities.filter(
    (c) => countries.has(c.country) && !exclude.has(c.country) && c.admin1,
  );

  const byAdmin = new Map();
  for (const city of regionCities) {
    const adminKey = `${city.country}:${city.admin1}`;
    const existing = byAdmin.get(adminKey);
    if (!existing || city.population > existing.population) {
      byAdmin.set(adminKey, city);
    }
  }

  const records = [];
  const provinceCoords = new Set();

  for (const city of byAdmin.values()) {
    const coordKey = `${city.lat.toFixed(2)}:${city.lon.toFixed(2)}`;
    provinceCoords.add(coordKey);
    records.push(makeRecord(region.id, city, admin1Map, 'province', usedKeys));
  }

  const majorThreshold = Math.min(
    ...region.countries.map((c) => majorPopThreshold(c)),
  );

  const majors = regionCities
    .filter((c) => c.population >= majorThreshold)
    .sort((a, b) => b.population - a.population);

  const majorsByCountry = new Map();
  const seenMajor = new Set();
  for (const city of majors) {
    const coordKey = `${city.lat.toFixed(2)}:${city.lon.toFixed(2)}`;
    const dedupe = `${city.country}:${city.name}`;
    if (seenMajor.has(dedupe)) continue;
    if (provinceCoords.has(coordKey)) continue;

    const countryCount = majorsByCountry.get(city.country) ?? 0;
    const maxMajors = region.maxMajorsPerCountry ?? 20;
    if (countryCount >= maxMajors) continue;

    seenMajor.add(dedupe);
    majorsByCountry.set(city.country, countryCount + 1);
    records.push(makeRecord(region.id, city, admin1Map, 'major', usedKeys));
  }

  records.sort((a, b) => {
    if (a.tier !== b.tier) return a.tier === 'province' ? -1 : 1;
    return (b.population ?? 0) - (a.population ?? 0);
  });

  if (region.maxTotal && records.length > region.maxTotal) {
    const provinces = records.filter((r) => r.tier === 'province');
    const majorList = records.filter((r) => r.tier === 'major');
    const slots = Math.max(0, region.maxTotal - provinces.length);
    return [...provinces, ...majorList.slice(0, slots)];
  }

  return records;
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  let data;
  try {
    data = await downloadGeonames();
  } catch (err) {
    console.error('GeoNames download failed:', err.message);
    process.exit(1);
  }

  const allCities = parseCities(data.citiesRaw);
  const admin1Map = parseAdmin1(data.admin1Raw);
  console.log(`Parsed ${allCities.length} cities, ${admin1Map.size} admin1 regions`);

  const index = {
    regions: REGION_DEFS.map((r) => ({
      id: r.id,
      name: r.name,
      nameEn: r.nameEn,
    })),
  };

  let total = 0;
  for (const region of REGION_DEFS) {
    const cities = buildRegion(region, allCities, admin1Map);
    total += cities.length;
    const provinces = cities.filter((c) => c.tier === 'province').length;
    const majors = cities.filter((c) => c.tier === 'major').length;
    const outPath = path.join(OUT_DIR, `${region.id}.json`);
    fs.writeFileSync(outPath, JSON.stringify(cities));
    console.log(`  ${region.id}.json — ${cities.length} (${provinces} provinces, ${majors} majors)`);
  }

  fs.writeFileSync(path.join(OUT_DIR, 'index.json'), JSON.stringify(index, null, 2));
  console.log(`\nTotal: ${total} curated entries in ${REGION_DEFS.length} regions`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
