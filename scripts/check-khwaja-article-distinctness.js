#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const seedPath = path.join(__dirname, '..', 'data', 'articles-seed.json');
const seed = JSON.parse(fs.readFileSync(seedPath, 'utf8'));

const articles = seed.articles.filter((item) => item.authorId === 'khwaja_abdullah_ansari');
const failures = [];

const findArticle = (language, keyword) =>
  articles.find((item) => item.language === language && item.title.includes(keyword));

const dariMonaajat = findArticle('dari', 'مناجات و حضور قلب');
const dariManazel = findArticle('dari', 'منازل السائرین');
const pashtoMonaajat = findArticle('pashto', 'مناجات او حضور قلب');
const pashtoManazel = findArticle('pashto', 'منازل السائرین');

if (!dariMonaajat || !dariManazel || !pashtoMonaajat || !pashtoManazel) {
  failures.push('Missing one or more Khwaja Abdullah target articles (dari/pashto).');
} else {
  const rules = [
    {
      source: dariMonaajat,
      mustContain: ['دلِ پراکندهٔ ما را به یاد خود جمع کن', 'پیش از نماز فجر'],
      mustNotContain: ['توبهٔ ما را صادق گردان', 'معامله بازار'],
    },
    {
      source: dariManazel,
      mustContain: ['توبهٔ ما را صادق گردان', 'معامله بازار'],
      mustNotContain: ['دلِ پراکندهٔ ما را به یاد خود جمع کن', 'پیش از نماز فجر'],
    },
    {
      source: pashtoMonaajat,
      mustContain: ['د سهار لمونځ نه مخکې', 'خپور زړه په خپل یاد راټول کړه'],
      mustNotContain: ['په بازار معامله کې', 'توبهٔ ما را صادق گردان'],
    },
    {
      source: pashtoManazel,
      mustContain: ['په بازار معامله کې', 'توبهٔ ما را صادق گردان'],
      mustNotContain: ['د سهار لمونځ نه مخکې', 'دلِ پراکندهٔ ما را به یاد خود جمع کن'],
    },
  ];

  for (const rule of rules) {
    for (const phrase of rule.mustContain) {
      if (!rule.source.body.includes(phrase)) {
        failures.push(`${rule.source.language} | ${rule.source.title} -> missing "${phrase}"`);
      }
    }
    for (const phrase of rule.mustNotContain) {
      if (rule.source.body.includes(phrase)) {
        failures.push(`${rule.source.language} | ${rule.source.title} -> duplicated "${phrase}"`);
      }
    }
  }
}

if (failures.length > 0) {
  console.error('❌ Khwaja article distinctness check failed:');
  failures.forEach((item) => console.error(`- ${item}`));
  process.exit(1);
}

console.log('✅ Khwaja article distinctness check passed.');
