#!/usr/bin/env node
/**
 * Fill Turkish and Arabic editorial fields from existing English and Dari text.
 * Turkish is machine-translated from English when English exists, otherwise from Dari.
 * Arabic is machine-translated from Dari. Quran Uthmani `text` is never changed.
 *
 * Resume-safe: translations are cached in scripts/.tr-ar-cache.json.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const cachePath = path.join(root, 'scripts', '.tr-ar-cache.json');
const SEP = '\n⟦EB⟧\n';
const MAX_CHARS = 2400;

const cache = fs.existsSync(cachePath)
  ? JSON.parse(fs.readFileSync(cachePath, 'utf8'))
  : {};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function cacheKey(sourceLanguage, targetLanguage, text) {
  return `${sourceLanguage}>${targetLanguage}\u0000${text}`;
}

function saveCache() {
  fs.writeFileSync(cachePath, JSON.stringify(cache));
}

function readTranslationPayload(data) {
  if (typeof data === 'string') return data;
  if (Array.isArray(data) && typeof data[0] === 'string') return data.join('');
  if (Array.isArray(data?.[0])) return data[0].map((segment) => segment?.[0] ?? '').join('');
  throw new Error('unexpected translation payload');
}

async function googleTranslate(text, sourceLanguage, targetLanguage) {
  const encoded = encodeURIComponent(text);
  const urls = [
    `https://clients5.google.com/translate_a/t?client=dict-chrome-ex&sl=${sourceLanguage}&tl=${targetLanguage}&q=${encoded}`,
    `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sourceLanguage}&tl=${targetLanguage}&dt=t&q=${encoded}`,
  ];
  let lastStatus = 0;
  for (const url of urls) {
    const response = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json' },
    });
    lastStatus = response.status;
    if (response.status === 429) continue;
    if (!response.ok) continue;
    return readTranslationPayload(await response.json());
  }
  const error = new Error('rate limited');
  error.status = lastStatus || 429;
  throw error;
}

async function translateJoined(text, sourceLanguage, targetLanguage, attempt = 0) {
  try {
    const translated = await googleTranslate(text, sourceLanguage, targetLanguage);
    await sleep(700);
    return translated;
  } catch (error) {
    if (error.status === 429 && attempt < 24) {
      const wait = Math.min(90000, 15000 * (attempt + 1));
      console.log(`rate limit, waiting ${wait}ms`);
      await sleep(wait);
      return translateJoined(text, sourceLanguage, targetLanguage, attempt + 1);
    }
    if (attempt < 4) {
      await sleep(1500 * (attempt + 1));
      return translateJoined(text, sourceLanguage, targetLanguage, attempt + 1);
    }
    throw error;
  }
}

function splitTranslated(translated, expected) {
  const parts = translated.split(/⟦\s*EB\s*⟧/u).map((part) => part.trim());
  if (parts.length === expected) return parts;
  return null;
}

async function translateList(texts, sourceLanguage, targetLanguage) {
  const results = new Array(texts.length);
  const pending = [];
  texts.forEach((text, index) => {
    const key = cacheKey(sourceLanguage, targetLanguage, text);
    if (cache[key]) results[index] = cache[key];
    else pending.push(index);
  });

  let cursor = 0;
  while (cursor < pending.length) {
    const batch = [];
    let chars = 0;
    while (cursor < pending.length) {
      const text = texts[pending[cursor]];
      const nextChars = chars + text.length + SEP.length;
      if (batch.length > 0 && nextChars > MAX_CHARS) break;
      batch.push(pending[cursor]);
      chars = nextChars;
      cursor += 1;
      if (text.length > MAX_CHARS) break;
    }
    await fillBatch(texts, results, batch, sourceLanguage, targetLanguage);
    saveCache();
    const done = results.filter(Boolean).length;
    if (done % 80 < batch.length) {
      console.log(`${sourceLanguage}->${targetLanguage} ${done}/${texts.length}`);
    }
  }
  return results;
}

async function fillBatch(texts, results, indexes, sourceLanguage, targetLanguage) {
  if (indexes.length === 0) return;
  if (indexes.length === 1) {
    const index = indexes[0];
    const source = texts[index];
    const key = cacheKey(sourceLanguage, targetLanguage, source);
    const translated = (await translateJoined(source, sourceLanguage, targetLanguage)).trim();
    cache[key] = translated || source;
    results[index] = cache[key];
    return;
  }

  const joined = indexes.map((index) => texts[index]).join(SEP);
  const translated = await translateJoined(joined, sourceLanguage, targetLanguage);
  const parts = splitTranslated(translated, indexes.length);
  if (!parts) {
    const mid = Math.ceil(indexes.length / 2);
    await fillBatch(texts, results, indexes.slice(0, mid), sourceLanguage, targetLanguage);
    await fillBatch(texts, results, indexes.slice(mid), sourceLanguage, targetLanguage);
    return;
  }
  indexes.forEach((index, partIndex) => {
    const source = texts[index];
    const value = parts[partIndex] || source;
    cache[cacheKey(sourceLanguage, targetLanguage, source)] = value;
    results[index] = value;
  });
}

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(root, relativePath), 'utf8'));
}

function writeJson(relativePath, value) {
  fs.writeFileSync(path.join(root, relativePath), `${JSON.stringify(value, null, 2)}\n`);
}

function withAyahTranslations(ayah, turkish, arabic) {
  const next = {};
  for (const [key, value] of Object.entries(ayah)) {
    if (key === 'translation_turkish' || key === 'translation_arabic') continue;
    next[key] = value;
    if (key === 'translation_english') {
      next.translation_turkish = turkish;
      next.translation_arabic = arabic;
    }
  }
  if (!next.translation_turkish) {
    next.translation_turkish = turkish;
    next.translation_arabic = arabic;
  }
  return next;
}

async function fillQuran() {
  const jobs = [];
  for (let number = 1; number <= 114; number += 1) {
    const relativePath = `data/surahs/${String(number).padStart(3, '0')}.json`;
    const surah = readJson(relativePath);
    surah.ayahs.forEach((ayah, index) => {
      jobs.push({
        relativePath,
        index,
        english: ayah.translation_english,
        dari: ayah.translation_dari,
      });
    });
  }
  console.log(`quran ayahs ${jobs.length}`);
  const turkish = await translateList(jobs.map((job) => job.english), 'en', 'tr');
  const arabic = await translateList(jobs.map((job) => job.dari), 'fa', 'ar');

  const byFile = new Map();
  jobs.forEach((job, index) => {
    if (!byFile.has(job.relativePath)) byFile.set(job.relativePath, readJson(job.relativePath));
    const surah = byFile.get(job.relativePath);
    surah.ayahs[job.index] = withAyahTranslations(surah.ayahs[job.index], turkish[index], arabic[index]);
  });
  for (const [relativePath, surah] of byFile) writeJson(relativePath, surah);
  console.log('quran files written');
}

async function fillHadith() {
  const relativePath = 'data/ahadith/hadiths.curated.v1.json';
  const hadiths = readJson(relativePath);
  const turkish = await translateList(hadiths.map((item) => item.english_translation), 'en', 'tr');
  const arabic = await translateList(hadiths.map((item) => item.dari_translation), 'fa', 'ar');
  hadiths.forEach((item, index) => {
    item.turkish_translation = turkish[index];
    item.arabic_translation = arabic[index];
  });
  writeJson(relativePath, hadiths);
  console.log(`hadiths ${hadiths.length}`);
}

async function fillAdhkar() {
  const relativePath = 'data/adhkar.json';
  const data = readJson(relativePath);
  const categoryNames = data.categories.map((category) => category.nameEnglish);
  const translatedNames = await translateList(categoryNames, 'en', 'tr');
  data.categories.forEach((category, index) => {
    category.nameTurkish = translatedNames[index];
  });

  const items = [];
  for (const list of Object.values(data.adhkar)) {
    for (const item of list) items.push(item);
  }
  const turkish = await translateList(items.map((item) => item.english || item.dari), 'en', 'tr');
  const arabic = await translateList(items.map((item) => item.dari), 'fa', 'ar');
  items.forEach((item, index) => {
    item.turkish = turkish[index];
    item.meaningArabic = arabic[index];
  });
  writeJson(relativePath, data);
  console.log(`adhkar ${items.length}`);
}

function collectSuffixed(node, pairs) {
  if (Array.isArray(node)) {
    node.forEach((child) => collectSuffixed(child, pairs));
    return;
  }
  if (!node || typeof node !== 'object') return;
  for (const [key, value] of Object.entries(node)) {
    if (typeof value === 'string' && (key.endsWith('_dari') || key.endsWith('_english') || key === 'dari' || key === 'english')) {
      pairs.push({ node, key, value });
    } else if (value && typeof value === 'object') {
      collectSuffixed(value, pairs);
    }
  }
}

async function fillPrayerLearning() {
  const relativePath = 'data/prayerLearning.json';
  const data = readJson(relativePath);
  const pairs = [];
  collectSuffixed(data, pairs);
  const sources = pairs.map((pair) => {
    if (pair.key.endsWith('_english') || pair.key === 'english') return pair.value;
    const englishKey = pair.key.endsWith('_dari')
      ? `${pair.key.slice(0, -5)}_english`
      : 'english';
    return typeof pair.node[englishKey] === 'string' && pair.node[englishKey].trim()
      ? pair.node[englishKey]
      : pair.value;
  });
  const sourceLanguages = pairs.map((pair, index) => (sources[index] === pair.value && (pair.key.endsWith('_dari') || pair.key === 'dari') ? 'fa' : 'en'));
  const turkish = [];
  const arabicSources = pairs.map((pair) => (
    pair.key.endsWith('_dari') || pair.key === 'dari'
      ? pair.value
      : pair.node[pair.key.endsWith('_english') ? `${pair.key.slice(0, -8)}_dari` : 'dari'] || pair.value
  ));
  for (const language of ['en', 'fa']) {
    const indexes = [];
    const texts = [];
    sourceLanguages.forEach((sourceLanguage, index) => {
      if (sourceLanguage === language) {
        indexes.push(index);
        texts.push(sources[index]);
      }
    });
    const translated = await translateList(texts, language, 'tr');
    indexes.forEach((index, translatedIndex) => {
      turkish[index] = translated[translatedIndex];
    });
  }
  const arabic = await translateList(arabicSources, 'fa', 'ar');
  pairs.forEach((pair, index) => {
    if (pair.key.endsWith('_dari')) {
      const base = pair.key.slice(0, -'_dari'.length);
      pair.node[`${base}_turkish`] = turkish[index];
      pair.node[`${base}_arabic`] = arabic[index];
    } else if (pair.key.endsWith('_english')) {
      const base = pair.key.slice(0, -'_english'.length);
      if (!pair.node[`${base}_turkish`]) pair.node[`${base}_turkish`] = turkish[index];
    } else if (pair.key === 'dari') {
      pair.node.turkish = turkish[index];
      pair.node.meaningArabic = arabic[index];
    } else if (pair.key === 'english' && !pair.node.turkish) {
      pair.node.turkish = turkish[index];
    }
  });
  writeJson(relativePath, data);
  console.log(`prayer strings ${pairs.length}`);
}

function protectHtml(html) {
  const tags = [];
  const text = html.replace(/<[^>]+>/g, (tag) => {
    const token = `⟦T${tags.length}⟧`;
    tags.push(tag);
    return token;
  });
  return { text, tags };
}

function restoreHtml(text, tags) {
  return text.replace(/⟦\s*T\s*(\d+)\s*⟧/gu, (_, index) => tags[Number(index)] ?? '');
}

function chunkText(text, limit = 1100) {
  if (text.length <= limit) return [text];
  const parts = [];
  let rest = text;
  while (rest.length > limit) {
    let cut = rest.lastIndexOf('\n', limit);
    if (cut < 300) cut = rest.lastIndexOf(' ', limit);
    if (cut < 300) cut = limit;
    parts.push(rest.slice(0, cut));
    rest = rest.slice(cut);
  }
  if (rest) parts.push(rest);
  return parts;
}

async function translateLong(text, sourceLanguage, targetLanguage) {
  const parts = chunkText(text);
  const translated = await translateList(parts, sourceLanguage, targetLanguage);
  return translated.join('');
}

async function fillArticles() {
  const relativePath = 'data/articles-seed.json';
  const data = readJson(relativePath);
  const dariArticles = data.articles.filter((article) => article.language === 'dari');
  const protectedBodies = dariArticles.map((article) => protectHtml(article.body));
  const titlesTr = await translateList(dariArticles.map((article) => article.title), 'fa', 'tr');
  const titlesAr = await translateList(dariArticles.map((article) => article.title), 'fa', 'ar');
  const bodiesTr = [];
  const bodiesAr = [];
  for (let index = 0; index < protectedBodies.length; index += 1) {
    console.log(`article ${index + 1}/${protectedBodies.length}`);
    bodiesTr.push(await translateLong(protectedBodies[index].text, 'fa', 'tr'));
    bodiesAr.push(await translateLong(protectedBodies[index].text, 'fa', 'ar'));
  }
  const extras = [];
  dariArticles.forEach((article, index) => {
    extras.push({
      ...article,
      language: 'turkish',
      title: titlesTr[index],
      body: restoreHtml(bodiesTr[index], protectedBodies[index].tags),
    });
    extras.push({
      ...article,
      language: 'arabic',
      title: titlesAr[index],
      body: restoreHtml(bodiesAr[index], protectedBodies[index].tags),
    });
  });
  data.articles = [
    ...data.articles.filter((article) => article.language !== 'turkish' && article.language !== 'arabic'),
    ...extras,
  ];
  writeJson(relativePath, data);
  console.log(`articles added ${extras.length}`);
}

const only = process.argv[2];
const steps = [
  ['quran', fillQuran],
  ['hadith', fillHadith],
  ['adhkar', fillAdhkar],
  ['prayer', fillPrayerLearning],
  ['articles', fillArticles],
];

for (const [name, run] of steps) {
  if (only && only !== name) continue;
  await run();
  saveCache();
}
console.log('fill-turkish-arabic-content done');
