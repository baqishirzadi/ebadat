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

const isTarget = (article) =>
  TARGET_AUTHOR_IDS.has(article.authorId) || article.category === 'asma_husna';

const targets = seed.articles.filter(isTarget);
const outOfRange = targets
  .map((article) => ({
    ...article,
    strongCount: (article.body.match(/<strong>/g) || []).length,
  }))
  .filter((article) => article.strongCount < 6 || article.strongCount > 10);

if (outOfRange.length > 0) {
  console.error('❌ Highlight coverage failed (expected 6..10 <strong> tags):');
  outOfRange.forEach((article) => {
    console.error(
      `- ${article.authorId} | ${article.language} | strong=${article.strongCount} | ${article.title}`
    );
  });
  process.exit(1);
}

console.log(`✅ Highlight coverage OK (${targets.length} target articles).`);
