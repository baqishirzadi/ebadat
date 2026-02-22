#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const seedPath = path.join(__dirname, '..', 'data', 'articles-seed.json');
const seed = JSON.parse(fs.readFileSync(seedPath, 'utf8'));

const REQUIRED_COLLECTIONS = [
  {
    authorId: 'abulhasan_kharqani',
    language: 'dari',
    heading: '۲۵ گفتار منسوب به ابوالحسن خرقانی',
  },
  {
    authorId: 'abu_saeed_abolkhair',
    language: 'dari',
    heading: '۲۵ رباعی و سخن منسوب به ابو سعید ابوالخیر',
  },
  {
    authorId: 'sheikh_ahmad_sirhindi',
    language: 'dari',
    heading: '۲۵ گفتار عرفانی در روح مکتوبات امام ربانی',
  },
];

const PERSIAN_NUMBERS_1_TO_25 = [
  '۱.',
  '۲.',
  '۳.',
  '۴.',
  '۵.',
  '۶.',
  '۷.',
  '۸.',
  '۹.',
  '۱۰.',
  '۱۱.',
  '۱۲.',
  '۱۳.',
  '۱۴.',
  '۱۵.',
  '۱۶.',
  '۱۷.',
  '۱۸.',
  '۱۹.',
  '۲۰.',
  '۲۱.',
  '۲۲.',
  '۲۳.',
  '۲۴.',
  '۲۵.',
];

const failures = [];

for (const rule of REQUIRED_COLLECTIONS) {
  const article = seed.articles.find(
    (item) => item.authorId === rule.authorId && item.language === rule.language
  );

  if (!article) {
    failures.push(`Missing article: ${rule.authorId} (${rule.language})`);
    continue;
  }

  if (!article.body.includes(rule.heading)) {
    failures.push(`Missing heading "${rule.heading}" in: ${article.title}`);
  }

  const missingNumbers = PERSIAN_NUMBERS_1_TO_25.filter((num) => !article.body.includes(num));
  if (missingNumbers.length > 0) {
    failures.push(
      `Missing numbered items in ${article.title}: ${missingNumbers.slice(0, 5).join(', ')}`
    );
  }
}

if (failures.length > 0) {
  console.error('❌ Numbered collections check failed:');
  failures.forEach((msg) => console.error(`- ${msg}`));
  process.exit(1);
}

console.log('✅ Numbered collections check passed (1..25 in all required Dari collection articles).');
