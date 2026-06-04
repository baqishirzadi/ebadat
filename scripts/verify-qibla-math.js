#!/usr/bin/env node

const fs = require('fs');
const Module = require('module');
const path = require('path');
const ts = require('typescript');

const PROJECT_ROOT = path.join(__dirname, '..');

function fail(message) {
  console.error(`[verify:qibla-math] ${message}`);
  process.exit(1);
}

function assert(condition, message) {
  if (!condition) fail(message);
}

function resolveAlias(request) {
  if (!request.startsWith('@/')) return null;
  return path.join(PROJECT_ROOT, request.slice(2));
}

const originalResolveFilename = Module._resolveFilename;
Module._resolveFilename = function resolveFilename(request, parent, isMain, options) {
  const aliased = resolveAlias(request);
  if (aliased) {
    return originalResolveFilename.call(this, aliased, parent, isMain, options);
  }
  return originalResolveFilename.call(this, request, parent, isMain, options);
};

require.extensions['.ts'] = function compileTypeScript(module, filename) {
  const source = fs.readFileSync(filename, 'utf8');
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      esModuleInterop: true,
      jsx: ts.JsxEmit.React,
      target: ts.ScriptTarget.ES2020,
    },
    fileName: filename,
  });
  module._compile(output.outputText, filename);
};

const { calculateQibla, distanceToKaaba, DEFAULT_LOCATION } = require('../utils/prayerTimes.ts');

const kabulQibla = calculateQibla(DEFAULT_LOCATION);
assert(kabulQibla >= 250 && kabulQibla <= 258, `Kabul qibla expected ~254°, got ${kabulQibla}`);

const kabulDistance = distanceToKaaba(DEFAULT_LOCATION);
assert(kabulDistance > 3000 && kabulDistance < 3600, `Kabul distance expected ~3.3k km, got ${kabulDistance}`);

const meccaQibla = calculateQibla({
  latitude: 21.4225,
  longitude: 39.8262,
  altitude: 0,
  timezone: 'Asia/Riyadh',
});
assert(meccaQibla < 5 || meccaQibla > 355, `At Kaaba, bearing should be ~0/360, got ${meccaQibla}`);

const meccaDistance = distanceToKaaba({
  latitude: 21.4225,
  longitude: 39.8262,
  altitude: 0,
  timezone: 'Asia/Riyadh',
});
assert(meccaDistance < 1, `At Kaaba, distance should be ~0 km, got ${meccaDistance}`);

console.log('[verify:qibla-math] OK');
console.log(`  Kabul: ${kabulQibla.toFixed(1)}°, ${Math.round(kabulDistance)} km`);
console.log(`  Kaaba site: ${meccaQibla.toFixed(1)}°, ${meccaDistance.toFixed(2)} km`);
