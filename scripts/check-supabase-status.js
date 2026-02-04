#!/usr/bin/env node

/**
 * Check Supabase Configuration Status
 * This script helps verify if Supabase is properly configured
 */

require('dotenv').config();

const requiredVars = [
  'EXPO_PUBLIC_SUPABASE_URL',
  'EXPO_PUBLIC_SUPABASE_ANON_KEY',
];

console.log('🔍 Checking Supabase Configuration...\n');

let allConfigured = true;
const missing = [];
const configured = [];

requiredVars.forEach((varName) => {
  const value = process.env[varName];
  if (!value || value.length === 0 || value.includes('your-')) {
    missing.push(varName);
    allConfigured = false;
    console.log(`❌ ${varName}: Missing or placeholder`);
  } else {
    configured.push(varName);
    // Show first few chars for verification (not full value for security)
    const preview = value.length > 30 ? value.substring(0, 30) + '...' : value;
    console.log(`✅ ${varName}: ${preview}`);
  }
});

console.log('\n' + '='.repeat(50));

if (allConfigured) {
  console.log('\n✅ Supabase is fully configured!');
  console.log('\nNext steps:');
  console.log('1. Run database migration:');
  console.log('   - Go to Supabase Dashboard > SQL Editor');
  console.log('   - Copy contents of supabase/migrations/001_initial_schema.sql');
  console.log('   - Paste and run in SQL Editor');
  console.log('\n2. Import articles:');
  console.log('   node scripts/seedArticlesWeb.js');
  console.log('\n3. Restart Expo:');
  console.log('   npx expo start --clear');
} else {
  console.log('\n❌ Supabase is NOT configured!');
  console.log(`\nMissing ${missing.length} configuration variable(s):`);
  missing.forEach((varName) => {
    console.log(`   - ${varName}`);
  });
  console.log('\n📝 To fix this:');
  console.log('1. Create .env file: cp .env.example .env');
  console.log('2. Get Supabase credentials from:');
  console.log('   https://supabase.com/dashboard');
  console.log('3. Go to Project Settings > API');
  console.log('4. Copy config values to .env file');
  console.log('5. Restart Expo: npx expo start --clear');
}

console.log('\n' + '='.repeat(50));
