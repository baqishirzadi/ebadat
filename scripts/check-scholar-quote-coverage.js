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
  'amir_ali_shir_navai',
]);

const isTarget = (article) => TARGET_AUTHOR_IDS.has(article.authorId);

const hasQuote = (body) =>
  /«[^»]{6,}»/.test(body) ||
  /"[^"]{6,}"/.test(body) ||
  /<em>[^<]*(?:قول|بیت|نقل)\s*[:：]/i.test(body);

const targets = seed.articles.filter(isTarget);
const missing = targets.filter((article) => !hasQuote(article.body));

if (missing.length > 0) {
  console.error('❌ Scholar quote coverage failed. Missing quote in:');
  missing.forEach((article) => {
    console.error(`- ${article.authorId} | ${article.language} | ${article.title}`);
  });
  process.exit(1);
}

console.log(`✅ Quote coverage OK (${targets.length} target articles).`);
