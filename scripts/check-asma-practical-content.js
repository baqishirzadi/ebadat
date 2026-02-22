#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const seedPath = path.join(__dirname, '..', 'data', 'articles-seed.json');
const seed = JSON.parse(fs.readFileSync(seedPath, 'utf8'));

const asmaArticles = seed.articles.filter((article) => article.category === 'asma_husna');

const bannedHeadings = [
  'زمینه تاریخی و متنی',
  'چارچوب مفهومی و دستگاه مفاهیم',
  'نقد سوءبرداشت‌های رایج',
];

const asmaNames = [
  'الرحمن',
  'الحلیم',
  'العدل',
  'الغفور',
  'الشکور',
  'اللطيف',
  'الرقيب',
  'التواب',
  'الصبور',
  'الوکیل',
  'الهادي',
  'الستار',
];

const failures = [];

if (asmaArticles.length !== 8) {
  failures.push(`Expected 8 asma_husna articles, found ${asmaArticles.length}`);
}

for (const article of asmaArticles) {
  const plain = article.body.replace(/<[^>]*>/g, ' ');
  const words = plain
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
  const strongCount = (article.body.match(/<strong>/g) || []).length;
  const examplesCount = (plain.match(/مثال|بېلګه/g) || []).length;
  const namesCount = asmaNames.filter((name) => article.body.includes(name)).length;
  const hasTrainingHeading = /(تمرین امروز|نننی تمرین)/.test(article.body);
  const hasBannedHeading = bannedHeadings.some((heading) => article.body.includes(heading));

  if (words < 450 || words > 700) {
    failures.push(`${article.language} | ${article.title} => words=${words} (expected 450..700)`);
  }

  if (strongCount < 6 || strongCount > 10) {
    failures.push(`${article.language} | ${article.title} => strong=${strongCount} (expected 6..10)`);
  }

  if (examplesCount < 4) {
    failures.push(`${article.language} | ${article.title} => examples=${examplesCount} (expected >=4)`);
  }

  if (namesCount < 5) {
    failures.push(`${article.language} | ${article.title} => asmaNames=${namesCount} (expected >=5)`);
  }

  if (!hasTrainingHeading) {
    failures.push(`${article.language} | ${article.title} => missing تمرین امروز/نننی تمرین`);
  }

  if (hasBannedHeading) {
    failures.push(`${article.language} | ${article.title} => contains removed heavy heading`);
  }

  if (article.language === 'dari') {
    if (!/(امروز|مثال|جمع‌بندی)/.test(plain)) {
      failures.push(`${article.title} => Dari quality markers missing`);
    }
  }

  if (article.language === 'pashto') {
    if (!/(بېلګه|نننی|پایله|سپارښتنې)/.test(plain)) {
      failures.push(`${article.title} => Pashto quality markers missing`);
    }
  }
}

if (failures.length > 0) {
  console.error('❌ Asma practical-content check failed:');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(`✅ Asma practical-content check passed (${asmaArticles.length} articles).`);
