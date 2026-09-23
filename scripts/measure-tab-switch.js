/** Physical-device tab-switch timing harness.
 * Run: node scripts/measure-tab-switch.js [serial]
 */
const fs = require('fs');
const crypto = require('crypto');
const { execFileSync } = require('child_process');

const serial = process.argv[2] || process.env.ADB_SERIAL || 'R3CWC0ACVRT';
const packageName = 'com.afghandev.ebadat';
const tabs = {
  quran: [1007, 2932],
  home: [1296, 2932],
  more: [144, 2932],
};
const sequence = ['quran', 'home', 'more', 'home'];
const rounds = 10;
const timeoutMs = 8000;

function adb(args, options = {}) {
  return execFileSync('adb', ['-s', serial, ...args], { encoding: 'utf8', timeout: options.timeout ?? 15000 });
}

function screenshotHash() {
  const png = execFileSync('adb', ['-s', serial, 'exec-out', 'screencap', '-p'], {
    encoding: 'buffer',
    timeout: 10000,
    maxBuffer: 4 * 1024 * 1024,
  });
  return crypto.createHash('sha1').update(png).digest('hex');
}

function tap(tab) {
  const [x, y] = tabs[tab];
  adb(['shell', 'input', 'tap', String(x), String(y)]);
}

function sleep(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function transition(tab) {
  const before = screenshotHash();
  const started = Date.now();
  tap(tab);
  let changed = false;
  let stable = 0;
  let last = before;
  while (Date.now() - started < timeoutMs) {
    sleep(100);
    const current = screenshotHash();
    if (current !== before) changed = true;
    if (current === last && changed) stable += 1;
    else stable = 0;
    last = current;
    if (changed && stable >= 2) {
      return { ms: Date.now() - started, ok: true, content_changed: true };
    }
  }
  return { ms: Date.now() - started, ok: false, content_changed: changed };
}

adb(['shell', 'am', 'force-stop', packageName]);
adb(['shell', 'monkey', '-p', packageName, '1']);
sleep(1500);
tap('home');
sleep(1000);

const samples = [];
for (let round = 1; round <= rounds; round += 1) {
  for (const tab of sequence) samples.push({ round, to_tab: tab, ...transition(tab) });
}

const values = samples.map((s) => s.ms).sort((a, b) => a - b);
const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
const percentile = (p) => values[Math.min(values.length - 1, Math.ceil(values.length * p) - 1)];
const report = {
  measured_at: new Date().toISOString(),
  device: { serial, package: packageName },
  rounds,
  sequence_per_round: sequence,
  sample_count: samples.length,
  ok_count: samples.filter((s) => s.ok).length,
  timeout_count: samples.filter((s) => !s.ok).length,
  median_ms: percentile(0.5),
  mean_ms: Number(mean.toFixed(1)),
  p95_ms: percentile(0.95),
  max_ms: values[values.length - 1],
  samples,
};
fs.writeFileSync('/tmp/ebadat-tab-switch-current.json', `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
if (report.timeout_count > 0) process.exitCode = 1;
