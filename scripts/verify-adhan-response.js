const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const root = path.join(__dirname, '..');
const prayerContext = fs.readFileSync(path.join(root, 'context/PrayerContext.tsx'), 'utf8');
const rootLayout = fs.readFileSync(path.join(root, 'app/_layout.tsx'), 'utf8');
const adhanAudio = fs.readFileSync(path.join(root, 'utils/adhanAudio.ts'), 'utf8');
const soundPath = path.join(root, 'assets/audio/adhan/barakatullah_salim_18sec.caf');
const foregroundSoundPath = path.join(root, 'assets/audio/adhan/barakatullah_salim_18sec.mp3');

function audioDurationSeconds(filePath) {
  const output = execFileSync('afinfo', [filePath], { encoding: 'utf8' });
  const match = output.match(/estimated duration:\s*([0-9.]+)\s*sec/);
  if (!match) throw new Error(`Could not read audio duration for ${filePath}`);
  return Number(match[1]);
}

if (!fs.existsSync(soundPath)) throw new Error('iOS Adhan CAF asset is missing');
if (!fs.existsSync(foregroundSoundPath)) throw new Error('Foreground Adhan MP3 asset is missing');
if (audioDurationSeconds(soundPath) >= 30) {
  throw new Error('iOS notification Adhan CAF must stay under Apple’s 30 second custom sound limit');
}
const foregroundDuration = audioDurationSeconds(foregroundSoundPath);
if (foregroundDuration < 17.5 || foregroundDuration >= 30) {
  throw new Error(`Foreground Adhan MP3 must contain the complete 18-second clip (got ${foregroundDuration}s)`);
}
if (!/barakatullah_salim_18sec\.mp3/.test(adhanAudio)) {
  throw new Error('App-managed Adhan playback must use the 18-second foreground MP3 asset');
}
if (/durationMs\s*:\s*number\s*=\s*10000|testAdhanVoice\([\s\S]{0,180}10000/.test(adhanAudio + fs.readFileSync(path.join(root, 'app/adhan-settings.tsx'), 'utf8'))) {
  throw new Error('Foreground Adhan playback must not be stopped after 10 seconds');
}
if (/addNotificationResponseReceivedListener[\s\S]{0,2200}playAdhan/.test(prayerContext)) {
  throw new Error('Adhan response listener must not replay audio on tap');
}
if (!/type === 'adhan' \|\| type === 'adhan_test'[\s\S]{0,260}router\.replace\('\/\(tabs\)'\)/.test(rootLayout)) {
  throw new Error('Adhan tap route is missing');
}
console.log('[verify:adhan-response] OK (18-second CAF/MP3, no 10-second cutoff, no tap replay, Home route)');
