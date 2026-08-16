const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const surah = read('components/quran/SurahHeader.tsx');
const juz = read('app/quran/juz/[juz].tsx');

for (const marker of ['paddingTop: Spacing.lg', 'paddingBottom: Spacing.xl', 'lineHeight: 68', 'includeFontPadding: false']) {
  if (!surah.includes(marker)) throw new Error(`Surah Bismillah safety marker missing: ${marker}`);
}
for (const marker of ['lineHeight: 64', 'includeFontPadding: false', 'writingDirection: \'rtl\'']) {
  if (!juz.includes(marker)) throw new Error(`Juz Bismillah marker missing: ${marker}`);
}
if (!surah.includes('number !== 1 && number !== 9')) throw new Error('Surah special Bismillah exclusions changed');
console.log('Quran Surah/Juz Bismillah layout checks passed.');
