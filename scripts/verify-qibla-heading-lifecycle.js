#!/usr/bin/env node

const fs = require('fs');
const Module = require('module');
const path = require('path');
const ts = require('typescript');

const sourcePath = path.join(__dirname, '..', 'utils', 'qiblaHeadingLifecycle.ts');
const source = fs.readFileSync(sourcePath, 'utf8');
const output = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  fileName: sourcePath,
});
const lifecycleModule = new Module(sourcePath, module);
lifecycleModule._compile(output.outputText, sourcePath);
const lifecycle = lifecycleModule.exports;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

assert(lifecycle.hasUsableLocationHeading({ trueHeading: 27, magHeading: 26 }), 'valid initial heading is accepted');
assert(lifecycle.hasUsableLocationHeading({ trueHeading: -1, magHeading: 26 }), 'magnetic-only heading is accepted');
assert(!lifecycle.hasUsableLocationHeading({ trueHeading: -1, magHeading: -1 }), 'unavailable heading is rejected');
assert(
  lifecycle.shouldUseMagnetometerFallback({ didReceiveHeadingWatchSample: false, fallbackAlreadyStarted: false }),
  'silent location watch falls back to magnetometer',
);
assert(
  !lifecycle.shouldUseMagnetometerFallback({ didReceiveHeadingWatchSample: true, fallbackAlreadyStarted: false }),
  'location watch sample prevents fallback',
);
assert(
  !lifecycle.shouldUseMagnetometerFallback({ didReceiveHeadingWatchSample: false, fallbackAlreadyStarted: true }),
  'fallback starts only once',
);

console.log('[verify:qibla-heading-lifecycle] OK');
