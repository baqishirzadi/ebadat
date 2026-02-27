#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const patchesDir = path.join(__dirname, '..', 'patches');
const forbiddenPatterns = [
  /node_modules\/.+\/build\//,
  /\/generated\//,
  /\.jar\b/,
  /\.flat\b/,
  /\.so\b/,
  /Binary files \/dev\/null and b\/.+ differ/,
];

function fail(message) {
  console.error(`[verify:patches] ${message}`);
  process.exit(1);
}

if (!fs.existsSync(patchesDir)) {
  console.log('[verify:patches] OK (no patches directory)');
  process.exit(0);
}

const files = fs.readdirSync(patchesDir).filter((file) => file.endsWith('.patch'));

if (files.length === 0) {
  console.log('[verify:patches] OK (no patch files)');
  process.exit(0);
}

for (const file of files) {
  const fullPath = path.join(patchesDir, file);
  const content = fs.readFileSync(fullPath, 'utf8');

  for (const pattern of forbiddenPatterns) {
    if (pattern.test(content)) {
      fail(`Forbidden patch content in ${file}: ${pattern}`);
    }
  }
}

console.log(`[verify:patches] OK (${files.length} patch file${files.length === 1 ? '' : 's'})`);
