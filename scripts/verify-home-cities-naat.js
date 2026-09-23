/**
 * Static regression checks for the Home composer, Afghan province catalog,
 * and Naat resume/progress safeguards.
 *
 * Run: node scripts/verify-home-cities-naat.js
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

const home = read('app/(tabs)/index.tsx');
assert.ok(home.includes('measureInWindow'), 'Home must measure the Mufti section in screen coordinates');
assert.ok(home.includes('keyboardTopRef'), 'Home must retain the actual keyboard frame');
assert.ok(home.includes('scrollOffsetRef'), 'Home must account for the current scroll offset');
assert.ok(home.includes('home-mufti-input') || read('components/home/HanafiMuftiWidget.tsx').includes('home-mufti-input'));
assert.ok(read('components/home/DreamInterpreterWidget.tsx').includes('home-dream-input'));
assert.ok(read('components/home/HomeGreenSection.tsx').includes('DreamInterpreterWidget'));
assert.ok(read('components/home/QuickActions.tsx').includes("route: '/dream-chat'"));
assert.ok(!read('components/home/QuickActions.tsx').includes("route: '/qibla'"));
assert.ok(read('components/home/QiblaCard.tsx').includes("router.push('/qibla')"));
assert.ok(!read('components/home/HanafiMuftiWidget.tsx').includes('سوال دینی تان را بپرسید'));
assert.ok(!read('components/home/HanafiMuftiWidget.tsx').includes('مشاهده گفتگو'));

const cities = read('utils/cities.ts');
const provinceKeys = [
  'badakhshan', 'badghis', 'baghlan', 'balkh', 'bamiyan', 'daykundi', 'farah',
  'faryab', 'ghazni', 'ghor', 'helmand', 'herat', 'jawzjan', 'kabul',
  'kandahar', 'kapisa', 'khost', 'kunar', 'kunduz', 'laghman', 'logar',
  'nangarhar', 'nimruz', 'nuristan', 'paktiya', 'paktika', 'panjshir',
  'parwan', 'samangan', 'sarepol', 'takhar', 'uruzgan', 'wardak', 'zabul',
];
assert.strictEqual(provinceKeys.length, 34);
for (const key of provinceKeys) {
  assert.ok(
    new RegExp(`\\n\\s+${key}: \\{`).test(cities),
    `Missing Afghanistan province-capital entry: ${key}`,
  );
}
assert.ok(cities.includes('AFGHANISTAN_PROVINCE_CAPITAL_KEYS'), 'Province picker must use canonical keys');
assert.ok(cities.includes('afghanistan_jowzjan'), 'Jowzjan spelling alias must remain supported');
assert.ok(cities.includes('afghanistan_faryab_maimana'), 'Faryab/Maimana legacy alias must remain supported');

const cityDatabase = read('utils/cityDatabase.ts');
assert.ok(cityDatabase.includes('AFGHANISTAN_PROVINCE_CAPITAL_KEYS'));
assert.ok(cityDatabase.includes("if (regionId === 'afghanistan')"));

const naat = read('context/NaatContext.tsx');
const naatScreen = read('app/(tabs)/naat.tsx');
assert.ok(naat.includes('RESUME_TAIL_RESET_MS'), 'Naat must reset a position saved at the end of a track');
assert.ok(naat.includes('PlaybackQueueEnded'), 'Naat must clear completed queue state');
assert.ok(naat.includes('lastProgressEventAtRef'), 'Naat progress must track event freshness');
assert.ok(naat.includes('progressGenerationRef'), 'Naat must discard stale asynchronous polls');
assert.ok(naat.includes('TrackPlayer.setRate(1)'), 'Naat must stay at natural speed');
assert.ok(naat.includes('initialPositionMillis'));
assert.ok(naat.includes('const initialPositionMillis = 0'), 'Explicit Naat selection must always start at position zero');
assert.ok(naat.includes('completedNaatIdRef'), 'Completed Naat replay must be protected from stale progress');
assert.ok(naat.includes('TrackPlayer.skip(selectedIndex, initialPosition)'), 'Playback queue must seek to the requested initial position');
assert.ok(naatScreen.includes("justifyContent: 'center'"), 'Naat header and controls must use the centered Naat layout');
assert.ok(naatScreen.includes('naat-header-description'), 'Naat header description needs a stable test identifier');
assert.ok(naat.includes('فهرست ذخیره‌شده نمایش داده می‌شود'), 'Naat fallback must give a safe, listener-friendly sync message');
assert.ok(naatScreen.includes('onHeightChange={handlePlayerDockLayout}'), 'Naat list must reserve the measured player dock height');
assert.ok(naatScreen.includes('naat-reciter-filters'), 'Naat reciter filters need a stable test identifier');
assert.ok(naatScreen.includes('horizontal\n                  showsHorizontalScrollIndicator={false}'), 'Reciter names must fit a single horizontally scrollable row');
assert.ok(naatScreen.includes('height: 42'), 'Naat search control must use the compact height');

const naatCard = read('components/naat/NaatCard.tsx');
assert.ok(naatCard.includes('naat-card-play-button'), 'Naat card play control is missing');
assert.ok(naatCard.includes('naat-card-download-button'), 'Naat card download control is missing');
assert.ok(naatCard.includes('naat-card-download-status'), 'Naat card download status needs a stable test identifier');
assert.ok(naatCard.includes('disabled={isDownloading}'), 'Naat card must block duplicate downloads while a download is active');
assert.ok(naatCard.includes("justifyContent: 'center'"), 'Naat card metadata and actions must be centered');

console.log('Home, Afghanistan city, and Naat reliability checks passed.');
