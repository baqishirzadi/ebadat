#!/usr/bin/env node
/* global __dirname */

const fs = require('fs');
const path = require('path');

const seedPath = path.join(__dirname, '..', 'data', 'articles-seed.json');
const seed = JSON.parse(fs.readFileSync(seedPath, 'utf8'));

const REQUIRED_SNIPPETS = [
  {
    authorId: 'nurul_mashayekh_mujaddidi',
    phrases: ['دل را به ذکر حق صفا باید', 'ذکرِ خفی چراغِ دلِ سالک است'],
  },
  {
    authorId: 'shah_foulad_kabuli',
    phrases: ['زیارت به‌مثابه مدرسه اخلاق', 'مشهور محلي وینا'],
  },
  {
    authorId: 'khwaja_baqi_billah',
    phrases: ['هر که شد عاشقِ بی‌پروا و تو', 'اگر دل خالی شد ز هر خودی'],
  },
  {
    authorId: 'sheikh_ahmad_jam',
    phrases: ['هر که در سینه‌اش آتشِ عشق باشد'],
  },
  {
    authorId: 'khwaja_muhammad_parsa',
    phrases: ['در نهان دل، ذکرِ بی‌صدا'],
  },
  {
    authorId: 'amir_ali_shir_navai',
    phrases: ['آدمی را آدمیت ادب است و وفا'],
  },
  {
    authorId: 'mirza_abdulqadir_bidel',
    phrases: ['تا نگردی آشنا، زین پرده رمزی نشنوی'],
  },
  {
    authorId: 'khwaja_abdullah_ansari',
    phrases: ['الهی از پیش خطر و از پس راهم نیست', 'الهی اگر خامم پخته‌ام کن و اگر پخته‌ام سوخته‌ام کن'],
  },
  {
    authorId: 'abdulrahman_jami',
    phrases: ['ذکر گنج است و گنج پنهان به', 'سر مقصود را مراقبه کن', 'باش در هر نفس ز اهل شعور'],
  },
  {
    authorId: 'mawlana_jalaluddin_balkhi',
    phrases: ['ای قوم به حج رفته کجایید کجایید', 'تدبیر کند بنده و تقدیر نداند'],
  },
  {
    authorId: 'abu_saeed_abolkhair',
    phrases: ['گزیده ۲۵ سخن از سنت ابو سعید', 'هر که او بیدارتر، پردردتر'],
  },
  {
    authorId: 'sheikh_ahmad_sirhindi',
    phrases: ['۲۵ گفتار برگزیده از روح مکتوبات امام ربانی'],
  },
  {
    authorId: 'imam_abu_hanifa',
    phrases: ['هذا رأينا وهو أحسن ما قدرنا عليه'],
  },
];

const failures = [];

for (const rule of REQUIRED_SNIPPETS) {
  const articles = seed.articles.filter((item) => item.authorId === rule.authorId);
  const combined = articles.map((item) => item.body).join('\n');

  if (!combined) {
    failures.push(`No articles found for ${rule.authorId}`);
    continue;
  }

  for (const phrase of rule.phrases) {
    if (!combined.includes(phrase)) {
      failures.push(`Missing phrase "${phrase}" for ${rule.authorId}`);
    }
  }
}

if (failures.length > 0) {
  console.error('❌ Required poems check failed:');
  failures.forEach((msg) => console.error(`- ${msg}`));
  process.exit(1);
}

console.log('✅ Required poems check passed for mandatory scholars.');
