#!/usr/bin/env node
/* global __dirname */

const fs = require('fs');
const path = require('path');

const MAX_HEADING_LENGTH = 48;
const seedPath = path.join(__dirname, '..', 'data', 'articles-seed.json');
const seed = JSON.parse(fs.readFileSync(seedPath, 'utf8'));

const h2Regex = /<h2>([\s\S]*?)<\/h2>/gi;
const inlineTagRegex = /<\/?(?:strong|em|span)\b[^>]*>/i;

const issues = [];

seed.articles.forEach((article) => {
  const body = article.body || '';
  let match;
  let headingIndex = 0;

  while ((match = h2Regex.exec(body)) !== null) {
    headingIndex += 1;
    const rawHeading = match[1].trim();
    const plainHeading = rawHeading.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();

    if (!plainHeading) {
      issues.push({
        kind: 'empty_heading',
        article,
        headingIndex,
        heading: rawHeading,
      });
      continue;
    }

    if (inlineTagRegex.test(rawHeading)) {
      issues.push({
        kind: 'inline_tag',
        article,
        headingIndex,
        heading: rawHeading,
      });
    }

    if (plainHeading.length > MAX_HEADING_LENGTH) {
      issues.push({
        kind: 'too_long',
        article,
        headingIndex,
        heading: plainHeading,
        length: plainHeading.length,
      });
    }
  }
});

if (issues.length > 0) {
  console.error(`❌ Article heading check failed (${issues.length} issue(s)):`);

  issues.forEach((issue) => {
    const prefix = `${issue.article.language} | ${issue.article.title} | h${issue.headingIndex}`;

    if (issue.kind === 'too_long') {
      console.error(`- [too_long:${issue.length}] ${prefix}`);
      console.error(`  ${issue.heading}`);
      return;
    }

    if (issue.kind === 'inline_tag') {
      console.error(`- [inline_tag] ${prefix}`);
      console.error(`  ${issue.heading}`);
      return;
    }

    console.error(`- [empty_heading] ${prefix}`);
  });

  process.exit(1);
}

console.log('✅ Article heading check passed (no inline tags, heading length <= 48).');
