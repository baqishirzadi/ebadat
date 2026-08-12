const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

for (const file of ['app/mufti-chat.tsx', 'components/home/HanafiMuftiWidget.tsx', 'hooks/useHanafiMufti.ts', 'utils/hanafiMuftiStorage.ts']) {
  const source = read(file);
  if (/RESPONDERS|ResponderId|responderId|responder_id/.test(source)) {
    throw new Error(`Mufti responder state remains in ${file}`);
  }
}
const dua = read('app/dua-request/new.tsx');
for (const marker of ['dua-message-input', 'dua-submit-request', 'onContentSizeChange', 'dua-responder-${responder.id}']) {
  if (!dua.includes(marker)) throw new Error(`Dua form is missing ${marker}`);
}
const registry = read('constants/responders.ts');
const qari = registry.indexOf("id: 'qari_syed_safiullah_shirzadi'");
const abdul = registry.indexOf("id: 'syed_abdul_baqi_shirzadi'");
if (qari < 0 || abdul < 0 || qari > abdul) throw new Error('Dua responder order is incorrect');

const download = read('utils/quranDownloadService.ts');
for (const marker of ['RECITERS', 'JUZ_RANGES', 'downloadAsync', 'download_cancelled', 'getJuzDownloadScope', 'getSurahDownloadScope', 'temporaryPath', 'moveAsync', 'isValidCachedFile', 'signal?.aborted']) {
  if (!download.includes(marker)) throw new Error(`Quran download service is missing ${marker}`);
}
const audio = read('utils/quranAudio.ts');
const reciterKeys = [...audio.matchAll(/^  ([a-z0-9_]+): \{/gm)].map((match) => match[1]);
if (reciterKeys.length !== 6 || !audio.includes('everyayah.com/data/')) throw new Error('Quran reciter URL registry is incomplete');
if (!download.includes('startAyah') || !download.includes('endAyah') || !download.includes('getAyahCachePath')) throw new Error('Quran scope boundaries/cache reuse are missing');
const surahHeader = read('components/quran/SurahHeader.tsx');
if (!surahHeader.includes('QuranDownloadCard') || !surahHeader.includes('quran-download-surah-header')) throw new Error('Surah header has no compact download control');
if (!surahHeader.includes("surahDownloaded ? 'check-circle' : 'download'")) throw new Error('Surah header download completion state is missing');
const downloadCard = read('components/quran/QuranDownloadCard.tsx');
for (const marker of ['getSavedDownloadReciter', 'setPreferredDownloadReciter', 'quran-download-reciter-${item.key}', 'quran-download-change-reciter', "textAlign: 'center'", "writingDirection: 'rtl'", 'check-circle']) {
  if (!downloadCard.includes(marker)) throw new Error(`Compact Quran download sheet is missing ${marker}`);
}
if (surahHeader.includes('<QuranDownloadCard') && !surahHeader.includes('visible={showDownloadSheet}')) throw new Error('Surah download sheet must not render as a large inline card');
const juzReader = read('app/quran/juz/[juz].tsx');
if (!juzReader.includes('quran-download-juz-header') || !juzReader.includes('getJuzDownloadScope')) throw new Error('Juz reader compact download control is missing');
const player = read('components/quran/AudioPlayer.tsx');
for (const marker of ['quran-playback-speed', 'QURAN_PLAYBACK_RATES', 'minHeight: 122', 'numberOfLines={1}', "textAlign: 'center'"]) {
  if (!player.includes(marker)) throw new Error(`Quran audio player is missing ${marker}`);
}
if (!audio.includes('TrackPlayer.setRate') || !audio.includes('QURAN_PLAYBACK_RATES') || !audio.includes('PLAYBACK_RATE_KEY')) throw new Error('Quran playback speed persistence is missing');
if (!read('app/quran/[surah].tsx').includes("section=quran")) throw new Error('Quran settings shortcut is missing');
console.log('Mufti independence, Dua selection/composer, and Quran download checks passed.');
