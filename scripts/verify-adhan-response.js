const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const root = path.join(__dirname, '..');
const prayerContext = fs.readFileSync(path.join(root, 'context/PrayerContext.tsx'), 'utf8');
const rootLayout = fs.readFileSync(path.join(root, 'app/_layout.tsx'), 'utf8');
const adhanAudio = fs.readFileSync(path.join(root, 'utils/adhanAudio.ts'), 'utf8');
const soundPath = path.join(root, 'assets/audio/adhan/barakatullah_salim_18sec.caf');
const fullSoundPath = path.join(root, 'assets/audio/adhan/fajr_adhan_full.mp3');

function audioDurationSeconds(filePath) {
  const output = execFileSync('afinfo', [filePath], { encoding: 'utf8' });
  const match = output.match(/estimated duration:\s*([0-9.]+)\s*sec/);
  if (!match) throw new Error(`Could not read audio duration for ${filePath}`);
  return Number(match[1]);
}

if (!fs.existsSync(soundPath)) throw new Error('iOS Adhan CAF asset is missing');
if (!fs.existsSync(fullSoundPath)) throw new Error('Full foreground Adhan MP3 asset is missing');
if (audioDurationSeconds(soundPath) >= 30) {
  throw new Error('iOS notification Adhan CAF must stay under Apple’s 30 second custom sound limit');
}
if (audioDurationSeconds(fullSoundPath) <= 120) {
  throw new Error('Foreground Adhan MP3 is too short for full app-managed playback');
}
if (!/fajr_adhan_full\.mp3/.test(adhanAudio)) {
  throw new Error('App-managed Adhan playback must use the full foreground MP3 asset');
}
if (/addNotificationResponseReceivedListener[\s\S]{0,2200}playAdhan/.test(prayerContext)) {
  throw new Error('Adhan response listener must not replay audio on tap');
}
if (!/type === 'adhan' \|\| type === 'adhan_test'[\s\S]{0,260}router\.replace\('\/\(tabs\)'\)/.test(rootLayout)) {
  throw new Error('Adhan tap route is missing');
}
console.log('[verify:adhan-response] OK (short iOS CAF, full foreground MP3, no tap replay, Home route)');
