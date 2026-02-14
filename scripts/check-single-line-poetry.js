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

for (const article of seed.articles) {
  const body = article.body || '';

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
