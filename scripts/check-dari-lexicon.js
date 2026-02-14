#!/usr/bin/env node

/**
 * Check Dari articles for non-target lexicon terms.
 * Usage: node scripts/check-dari-lexicon.js
 */

const fs = require('fs');
const path = require('path');

const seedPath = path.join(__dirname, '..', 'data', 'articles-seed.json');
const raw = fs.readFileSync(seedPath, 'utf8');
const data = JSON.parse(raw);

const bannedTerms = [
  'دانشگاه',
  'دانشجو',
  'شهروندی',
  'شهروند',
  'پروژه',
  'رویکرد',
  'رویکردها',
  'پژوهش',
  'پژوهشگر',
  'کارآمد',
  'منازعه',
  'منازعات',
  'فروپاشی',
];

const dariArticles = data.articles.filter((article) => article.language === 'dari');
const findings = [];

for (const article of dariArticles) {
  const content = `${article.title}\n${article.body}`;
  const termsFound = bannedTerms.filter((term) => content.includes(term));
  if (termsFound.length > 0) {
    findings.push({
      title: article.title,
      terms: termsFound,
    });
  }
}

if (findings.length === 0) {
  console.log('✅ Dari lexicon check passed. No banned terms found.');
  process.exit(0);
}

console.log(`❌ Dari lexicon check failed in ${findings.length} article(s):`);
for (const item of findings) {
  console.log(`- ${item.title}`);
  console.log(`  terms: ${item.terms.join(', ')}`);
}

process.exit(1);
