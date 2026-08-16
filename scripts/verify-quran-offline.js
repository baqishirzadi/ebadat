const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const audio = read('utils/quranAudio.ts');
const download = read('utils/quranDownloadService.ts');
const card = read('components/quran/QuranDownloadCard.tsx');

for (const marker of ['getAyahCachePath', 'isValidCachedAudioFile', 'offline_cache_miss', 'getQueueTrackUri', 'usedStreamingFallback']) {
  if (!audio.includes(marker)) throw new Error(`Offline Quran marker missing: ${marker}`);
}
for (const marker of ['downloadAsync', 'temporaryPath', 'moveAsync', 'signal?.aborted', 'getJuzDownloadScope']) {
  if (!download.includes(marker)) throw new Error(`Download integrity marker missing: ${marker}`);
}
if (!card.includes('await audioManager.setReciter(nextReciter)')) {
  throw new Error('Downloaded reciter is not aligned with offline playback reciter');
}
console.log('Quran offline cache/download checks passed.');
