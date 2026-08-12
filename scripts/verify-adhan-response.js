const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const prayerContext = fs.readFileSync(path.join(root, 'context/PrayerContext.tsx'), 'utf8');
const rootLayout = fs.readFileSync(path.join(root, 'app/_layout.tsx'), 'utf8');
const soundPath = path.join(root, 'assets/audio/adhan/barakatullah_salim_18sec.caf');

if (!fs.existsSync(soundPath)) throw new Error('iOS Adhan CAF asset is missing');
if (/addNotificationResponseReceivedListener[\s\S]{0,2200}playAdhan/.test(prayerContext)) {
  throw new Error('Adhan response listener must not replay audio on tap');
}
if (!/type === 'adhan' \|\| type === 'adhan_test'[\s\S]{0,260}router\.replace\('\/\(tabs\)'\)/.test(rootLayout)) {
  throw new Error('Adhan tap route is missing');
}
console.log('[verify:adhan-response] OK (CAF asset, no tap replay, Home route)');
