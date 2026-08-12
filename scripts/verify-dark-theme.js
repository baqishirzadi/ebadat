const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const roots = [path.join(root, 'app'), path.join(root, 'components'), path.join(root, 'context')];
const allow = new Set([
  'components/dua/UnreadCountBadge.tsx',
  'app/adhkar/[category].tsx',
  'app/ramadan.tsx',
]);

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(full);
    return /\.(tsx|ts)$/.test(entry.name) ? [full] : [];
  });
}

const offenders = [];
for (const file of roots.flatMap(walk)) {
  const relative = path.relative(root, file);
  if (allow.has(relative)) continue;
  const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
  lines.forEach((line, index) => {
    if (/background(?:Color)?\s*:\s*['"](?:#fff(?:fff)?|white)['"]/i.test(line)) {
      offenders.push(`${relative}:${index + 1}`);
    }
  });
}

if (offenders.length) {
  console.error(`[verify:dark-theme] hardcoded white backgrounds found:\n${offenders.join('\n')}`);
  process.exit(1);
}
console.log('[verify:dark-theme] OK');
