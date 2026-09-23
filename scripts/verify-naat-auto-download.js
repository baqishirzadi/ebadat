const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ts = require('typescript');

const helperPath = path.join(__dirname, '..', 'utils', 'naatCompletion.ts');
const contextPath = path.join(__dirname, '..', 'context', 'NaatContext.tsx');
const helperSource = fs.readFileSync(helperPath, 'utf8');
const contextSource = fs.readFileSync(contextPath, 'utf8');
const compiled = ts.transpileModule(helperSource, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;
const sandbox = { exports: {}, Number };
vm.runInNewContext(compiled, sandbox, { filename: helperPath });
const { shouldAutoDownloadCompletedNaat } = sandbox.exports;

const cases = [
  ['natural end qualifies', { eligible: true, positionSeconds: 119.5, durationSeconds: 120 }, true],
  ['pause/resume completion remains eligible', { eligible: true, positionSeconds: 119, durationSeconds: 120 }, true],
  ['manual seek or skip is ineligible', { eligible: false, positionSeconds: 120, durationSeconds: 120 }, false],
  ['early track exit does not qualify', { eligible: true, positionSeconds: 105, durationSeconds: 120 }, false],
  ['unknown duration does not qualify', { eligible: true, positionSeconds: 120, durationSeconds: 0 }, false],
  ['invalid position does not qualify', { eligible: true, positionSeconds: Number.NaN, durationSeconds: 120 }, false],
];

for (const [label, candidate, expected] of cases) {
  const actual = shouldAutoDownloadCompletedNaat(candidate);
  if (actual !== expected) {
    throw new Error(`${label}: expected ${expected}, received ${actual}`);
  }
}

const integrationRequirements = [
  ['queue transitions inspect the ended track position', /maybeAutoDownloadCompletedNaat\(\s*previousNaat,\s*event\.lastPosition/s],
  ['queue end inspects its final track position', /maybeAutoDownloadCompletedNaat\(finished, event\.position/],
  ['seeks invalidate natural-completion eligibility', /const seek = useCallback\(\(millis: number\) => \{\s*if \(currentNaatRef\.current\) \{\s*completionEligibleByNaatRef\.current\[currentNaatRef\.current\.id\] = false;/s],
  ['automatic downloads use the shared silent download flow', /download\(naat, \{ silent: true \}\)/],
  ['automatic downloads verify the actual local file instead of trusting stale metadata', /autoDownloadByIdRef\.current = \(id\) => \{\s*const naat = naatsRef\.current\.find\(\(item\) => item\.id === id\);\s*if \(!naat\) return;\s*\/\/ `download` verifies that the local file still exists/s],
  ['duplicate downloads are coalesced', /downloadTasksRef\.current\.get\(naat\.id\)/],
];

for (const [label, pattern] of integrationRequirements) {
  if (!pattern.test(contextSource)) throw new Error(`Missing integration: ${label}`);
}

console.log('Natural-completion auto-download checks passed.');
