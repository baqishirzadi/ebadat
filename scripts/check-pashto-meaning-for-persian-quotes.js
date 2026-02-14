#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const seedPath = path.join(__dirname, '..', 'data', 'articles-seed.json');
const seed = JSON.parse(fs.readFileSync(seedPath, 'utf8'));

const TARGET_AUTHOR_IDS = new Set([
  'imam_abu_hanifa',
  'mawlana_jalaluddin_balkhi',
  'khwaja_abdullah_ansari',
  'abdulrahman_jami',
  'shah_waliullah_dehlawi',
  'sheikh_ahmad_sirhindi',
  'khwaja_baqi_billah',
  'sayyid_jamaluddin_afghani',
  'ahmad_shah_abdali',
  'sheikh_sanai_ghaznavi',
  'mirza_abdulqadir_bidel',
  'abu_saeed_abolkhair',
  'abulhasan_kharqani',
  'khwaja_muhammad_parsa',
  'sheikh_ahmad_jam',
  'nurul_mashayekh_mujaddidi',
  'shah_foulad_kabuli',
]);

const isTargetPashto = (article) =>
  article.language === 'pashto' &&
  (TARGET_AUTHOR_IDS.has(article.authorId) || article.category === 'asma_husna');

const hasPersianQuote = (body) => /«[^»\n]{6,}»/.test(body);
const hasPashtoMeaning = (body) => /(مانا|ژباړه|په\s*پښتو|يعنې|یعنې)/.test(body);

const targets = seed.articles.filter(isTargetPashto);
const missingMeaning = targets.filter(
  (article) => hasPersianQuote(article.body) && !hasPashtoMeaning(article.body)
);

if (missingMeaning.length > 0) {
  console.error('❌ Missing Pashto meaning after Persian quote in:');
  missingMeaning.forEach((article) => {
    console.error(`- ${article.authorId} | ${article.title}`);
  });
  process.exit(1);
}

console.log(`✅ Pashto quote-meaning coverage OK (${targets.length} target Pashto articles).`);
