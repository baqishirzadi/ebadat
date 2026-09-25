#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');
const fail = (message) => {
  console.error(`[verify:android-onboarding] ${message}`);
  process.exit(1);
};
const assert = (condition, message) => {
  if (!condition) fail(message);
};

const onboarding = read('utils/prayerOnboarding.ts');
const layout = read('app/onboarding/_layout.tsx');
const notifications = read('app/onboarding/notifications.tsx');
const exactAlarms = read('app/onboarding/exact-alarms.tsx');
const battery = read('app/onboarding/battery.tsx');
const card = read('components/home/AdhanStatusCard.tsx');

assert(!fs.existsSync(path.join(root, 'app/onboarding/autostart.tsx')), 'autostart onboarding route still exists');
assert(!layout.includes('name="autostart"'), 'autostart is still registered in onboarding layout');
assert(/return Number\(Platform\.Version\) >= 31 \? 3 : 2/.test(onboarding), 'Android permission step count does not match API-level flow');
assert(onboarding.includes('getOnboardingTotalSteps') && onboarding.includes('ONBOARDING_BASE_STEPS'), 'Shared onboarding step counter is missing');
assert(read('app/onboarding/language.tsx').includes("/onboarding/location"), 'Language screen must continue to city selection');
assert(read('app/onboarding/index.tsx').includes('/onboarding/language'), 'Welcome index must redirect to language');
assert(/if \(current === 'battery'\) \{\s*return 'complete';/.test(onboarding), 'battery still routes to an OEM onboarding step');
assert(!/showAutostart\s*\?\s*'autostart'/.test(onboarding), 'first-install flow still conditionally routes to autostart');
assert(/progress === 'autostart'[\s\S]{0,180}\/onboarding\/battery/.test(onboarding), 'legacy autostart progress has no safe migration route');
assert(notifications.includes('testID="android-onboarding-notifications"'), 'notification onboarding test identifier is missing');
assert(exactAlarms.includes('testID="android-onboarding-exact-alarms"'), 'exact-alarm onboarding test identifier is missing');
assert(battery.includes('testID="android-onboarding-battery"'), 'battery onboarding test identifier is missing');
assert(/Platform\.OS === 'ios' && !notificationsEnabled/.test(card), 'iOS notification branch changed unexpectedly');
assert(/router\.push\(\(Platform\.OS === 'ios' \? '\/adhan-settings' : '\/adhan-health'\)/.test(card), 'Android Adhan card no longer routes to /adhan-health');
assert(!card.includes("openNotificationSettings();\n      return;\n    }\n    router.push"), 'Android card can reach the iOS notification-settings branch');

console.log('[verify:android-onboarding] OK (notifications, exact alarm, battery only; Android card stays on /adhan-health)');
