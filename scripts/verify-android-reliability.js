#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');
const fail = (message) => {
  console.error(`[verify:android-reliability] ${message}`);
  process.exit(1);
};
const assert = (condition, message) => {
  if (!condition) fail(message);
};

const mufti = read('app/mufti-chat.tsx');
assert(mufti.includes('onLongPress={!isUser'), 'Mufti responses are not copied on long press');
assert(mufti.includes('normalizeMarkdownForClipboard'), 'Mufti copy does not normalize Markdown');
assert(mufti.includes('ToastAndroid') && mufti.includes('AccessibilityInfo'), 'Mufti copy feedback is not non-blocking');
assert(!mufti.includes('mufti-copy-response'), 'Mufti still renders a persistent copy control');

const widgetProvider = read('android/app/src/main/java/com/afghandev/ebadat/widget/PrayerTimesWidget.java');
for (const marker of ['ACTION_DATE_CHANGED', 'ACTION_TIME_CHANGED', 'ACTION_TIMEZONE_CHANGED', 'onUpdate(context, manager, ids)']) {
  assert(widgetProvider.includes(marker), `Android widget is missing ${marker} refresh handling`);
}
const widgetTask = read('widgets/widgetTaskHandler.tsx');
assert(widgetTask.includes('refreshWidgetSnapshot(stored)'), 'Widget task does not refresh the stored snapshot');
assert(read('utils/widgetHadith.ts').includes('getWidgetHadithForDateKey'), 'Widget Hadith selector is missing');
const widgetSnapshot = read('utils/widgetSnapshot.ts');
assert(widgetSnapshot.includes('getWidgetHadithForDateKey(todayKey)'), 'Widget Hadith is not keyed to the current local date');
assert(widgetSnapshot.includes('currentPrayer: getCurrentPrayerFromEntries'), 'Widget prayer rollover refresh is missing');

const cities = read('utils/cities.ts');
const featuredMatch = cities.match(/AFGHANISTAN_FEATURED_CITY_KEYS\s*=\s*\[([\s\S]*?)\]\s*as const/);
assert(featuredMatch, 'Featured Afghan city list is missing');
const featured = [...featuredMatch[1].matchAll(/'([^']+)'/g)].map((match) => match[1]);
assert(featured.join('|') === [
  'afghanistan_kabul',
  'afghanistan_herat',
  'afghanistan_mazar',
  'afghanistan_kandahar',
  'afghanistan_jalalabad',
].join('|'), 'Featured Afghan city order is incorrect');
const provinceMatch = cities.match(/AFGHANISTAN_PROVINCE_CAPITAL_KEYS\s*=\s*\[([\s\S]*?)\]\s*as const/);
assert(provinceMatch, 'Afghan province-capital list is missing');
assert([...provinceMatch[1].matchAll(/'([^']+)'/g)].length === 34, 'Afghan province-capital list must contain 34 entries');
assert(read('app/onboarding/location.tsx').includes("title: 'شهرهای پرکاربرد'"), 'First-install featured city section is missing');
assert(read('components/prayer/CitySelectorModal.tsx').includes("title: 'شهرهای پرکاربرد'"), 'Reusable featured city section is missing');

const adhanHealth = read('utils/adhanHealth.ts');
const adhanCard = read('components/home/AdhanStatusCard.tsx');
assert(adhanHealth.includes('homeCardStatusFromReport'), 'Home Adhan readiness helper is missing');
for (const marker of ['notificationsEnabled', 'canScheduleExactAlarms', 'isIgnoringBatteryOptimizations']) {
  assert(adhanHealth.includes(marker), `Adhan readiness helper does not check ${marker}`);
}
assert(adhanCard.includes('homeCardStatusFromReport(report)'), 'Home card does not use the three-gate readiness helper');
assert(adhanCard.includes("'/adhan-health'"), 'Android Adhan card route changed');

const adhanAudio = read('utils/adhanAudio.ts');
assert(adhanAudio.includes('barakatullah_salim_18sec.mp3'), 'Foreground Adhan asset changed');
assert(!/10000/.test(adhanAudio), 'Foreground Adhan still contains a 10-second cutoff');

const prayerEngine = read('android/app/src/main/java/com/afghandev/ebadat/PrayerTimeEngine.kt');
const adhanConfig = read('android/app/src/main/java/com/afghandev/ebadat/AdhanConfig.kt');
assert(
  prayerEngine.includes('results.sortedBy { it.triggerAtMs }.takeIf { it.isNotEmpty() }'),
  'An expired canonical schedule must fall back to the current native rolling schedule',
);
assert(prayerEngine.includes('MAGHRIB_OFFSET_MINUTES = 5'), 'Native fallback lost the global +5 Maghrib policy');
assert(prayerEngine.includes('if (config.policyVersion < 6L) return null'), 'Android must reject stale pre-v6 canonical schedules');
assert(adhanConfig.includes('val maghribOffsetMinutes: Long = 5L'), 'Native config default must use the global +5 policy');
assert(adhanConfig.includes('json.optLong("policyVersion", 0L) < 6L) 5L'), 'Old native configs must migrate to the global +5 policy');

const healthScreen = read('app/adhan-health.tsx');
assert(
  /case 'delivery':\s*await handleLiveTest\(\);/.test(healthScreen),
  'The health screen live-test action must schedule a real system test, not only rebuild alarms',
);

const firedLog = read('android/app/src/main/java/com/afghandev/ebadat/AdhanFiredLogStore.kt');
const healthReporter = read('android/app/src/main/java/com/afghandev/ebadat/AdhanHealthReporter.kt');
assert(
  firedLog.includes('getLastVerifiedDeliveryAtMs') && firedLog.includes('event.type == "system_test"'),
  'The native fired log must treat a successful system test as verified delivery evidence',
);
assert(
  healthReporter.includes('lastVerifiedDeliveryAtMs') && healthReporter.includes('MAINTENANCE_STALE_MS'),
  'Adhan health must not report failed delivery when a recent verified delivery exists',
);

console.log('[verify:android-reliability] OK');
