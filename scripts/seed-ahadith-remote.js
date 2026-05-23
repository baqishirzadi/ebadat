#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const { createClient } = require('@supabase/supabase-js');

dotenv.config();

const DATASET_PATH = path.join(__dirname, '..', 'data', 'ahadith', 'hadiths.curated.v1.json');
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SERVICE_ROLE_KEY || '';

function fail(message, error) {
  console.error(`[seed:ahadith-remote] ${message}`);
  if (error) {
    console.error(error.message || error);
  }
  process.exit(1);
}

function toRow(item) {
  return {
    arabic_text: item.arabic_text,
    dari_translation: item.dari_translation,
    pashto_translation: item.pashto_translation,
    source_book: item.source_book,
    source_number: item.source_number,
    is_muttafaq: !!item.is_muttafaq,
    topics: Array.isArray(item.topics) ? item.topics : [],
    special_days: Array.isArray(item.special_days) && item.special_days.length ? item.special_days : null,
    hijri_month: item.hijri_range?.month ?? null,
    hijri_day_start: item.hijri_range?.day_start ?? null,
    hijri_day_end: item.hijri_range?.day_end ?? null,
    weekday_only: item.weekday_only === 'friday' ? 'friday' : null,
    daily_index: item.daily_index,
    published: true,
    published_at: new Date().toISOString(),
  };
}

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  fail('Missing SUPABASE_URL/EXPO_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.');
}

let hadiths;
try {
  hadiths = JSON.parse(fs.readFileSync(DATASET_PATH, 'utf8'));
} catch (error) {
  fail(`Cannot read dataset at ${DATASET_PATH}`, error);
}

if (!Array.isArray(hadiths) || hadiths.length !== 60) {
  fail(`Expected exactly 60 hadiths, found ${Array.isArray(hadiths) ? hadiths.length : 'invalid JSON'}.`);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function main() {
  const rows = hadiths.map(toRow);
  let updated = 0;
  let inserted = 0;

  for (const row of rows) {
    const { data: existing, error: selectError } = await supabase
      .from('hadith_entries')
      .select('id')
      .eq('daily_index', row.daily_index);

    if (selectError) {
      if (/schema cache|hadith_entries/i.test(selectError.message || '')) {
        fail('Remote table hadith_entries is missing. Apply supabase/migrations/20260227_create_hadith_entries.sql first.', selectError);
      }
      fail(`Could not read daily_index=${row.daily_index}`, selectError);
    }

    if (Array.isArray(existing) && existing.length > 0) {
      const ids = existing.map((item) => item.id).filter(Boolean);
      const { error: updateError } = await supabase
        .from('hadith_entries')
        .update(row)
        .in('id', ids);

      if (updateError) {
        fail(`Could not update daily_index=${row.daily_index}`, updateError);
      }
      updated += ids.length;
      continue;
    }

    const { error: insertError } = await supabase
      .from('hadith_entries')
      .insert(row);

    if (insertError) {
      fail(`Could not insert daily_index=${row.daily_index}`, insertError);
    }
    inserted += 1;
  }

  console.log(`[seed:ahadith-remote] OK inserted=${inserted} updated=${updated}`);
}

main().catch((error) => fail('Unexpected failure', error));
