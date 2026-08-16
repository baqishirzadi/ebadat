const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const quran = read('utils/quranAudio.ts');
const naat = read('context/NaatContext.tsx');
const player = read('components/quran/AudioPlayer.tsx');

for (const marker of ['QURAN_PLAYBACK_RATES', 'PLAYBACK_RATE_KEY', 'TrackPlayer.setRate(this.playbackRate)']) {
  if (!quran.includes(marker)) throw new Error(`Quran playback speed marker missing: ${marker}`);
}
if (!player.includes('quran-playback-speed-')) throw new Error('Quran speed selector is missing');
if (!naat.includes('await TrackPlayer.setRate(1)')) throw new Error('Naat does not reset TrackPlayer speed to 1x');
console.log('Independent Quran/Naat playback-speed checks passed.');
