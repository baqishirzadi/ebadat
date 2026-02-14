#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const seedPath = path.join(__dirname, '..', 'data', 'articles-seed.json');
const seed = JSON.parse(fs.readFileSync(seedPath, 'utf8'));

const failures = [];
const normalizeText = (value) =>
  value
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim();

const bannedPlaceholders = [
  'در روایت‌ها آمده که این عبارت',
  'در روایت ها آمده که این عبارت',
  'په روایتونو کې راغلي چې دا عبارت',
];
const placeholderTargetAuthors = new Set([
  'abu_saeed_abolkhair',
  'sheikh_ahmad_sirhindi',
  'imam_abu_hanifa',
]);

for (const article of seed.articles) {
  const body = article.body || '';

  if (placeholderTargetAuthors.has(article.authorId)) {
    for (const phrase of bannedPlaceholders) {
      if (body.includes(phrase)) {
        failures.push(
          `${article.authorId} | ${article.language} | ${article.title} -> contains placeholder phrase: ${phrase}`
        );
      }
    }
  }

  if (/<br\s*\/?>/i.test(body)) {
    failures.push(`${article.authorId} | ${article.language} | ${article.title} -> contains <br> in body`);
  }

  const paragraphs = [...body.matchAll(/<p>([\s\S]*?)<\/p>/g)].map((m) => m[1]);

  for (const paragraph of paragraphs) {
    const rawText = normalizeText(paragraph);
    const isQuoteLike = /^«[^»]+»(?:\s*—\s*\([^)]*\))?$/.test(rawText);
    if (!isQuoteLike) continue;

    if (/[\r\n]/.test(paragraph)) {
      failures.push(
        `${article.authorId} | ${article.language} | ${article.title} -> quote paragraph has hard line-breaks`
      );
    }

  }
}

if (failures.length > 0) {
  console.error('❌ Poetry readability check failed:');
  failures.forEach((msg) => console.error(`- ${msg}`));
  process.exit(1);
}

console.log('✅ Poetry readability check passed.');
