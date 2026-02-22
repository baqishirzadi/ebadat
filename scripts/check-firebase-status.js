#!/usr/bin/env node

/**
 * Check Firebase Configuration Status
 * This script helps verify if Firebase is properly configured
 */

require('dotenv').config();

const requiredVars = [
  'EXPO_PUBLIC_FIREBASE_API_KEY',
  'EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN',
  'EXPO_PUBLIC_FIREBASE_PROJECT_ID',
  'EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET',
  'EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
  'EXPO_PUBLIC_FIREBASE_APP_ID',
];

console.log('🔍 Checking Firebase Configuration...\n');

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
    const preview = value.length > 20 ? value.substring(0, 20) + '...' : value;
    console.log(`✅ ${varName}: ${preview}`);
  }
});

console.log('\n' + '='.repeat(50));

if (allConfigured) {
  console.log('\n✅ Firebase is fully configured!');
  console.log('\nNext steps:');
  console.log('1. Verify articles exist in Firestore:');
  console.log('   - Go to Firebase Console > Firestore Database');
  console.log('   - Check if "articles" collection exists');
  console.log('   - Check if "scholars" collection exists');
  console.log('\n2. If articles are missing, import them:');
  console.log('   node scripts/seedArticlesWeb.js');
  console.log('\n3. Restart Expo:');
  console.log('   npx expo start --clear');
} else {
  console.log('\n❌ Firebase is NOT configured!');
  console.log(`\nMissing ${missing.length} configuration variable(s):`);
  missing.forEach((varName) => {
    console.log(`   - ${varName}`);
  });
  console.log('\n📝 To fix this:');
  console.log('1. Create .env file: cp .env.example .env');
  console.log('2. Get Firebase credentials from:');
  console.log('   https://console.firebase.google.com/');
  console.log('3. Go to Project Settings > Your apps');
  console.log('4. Copy config values to .env file');
  console.log('5. Restart Expo: npx expo start --clear');
}

console.log('\n' + '='.repeat(50));
