#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const swiftPath = path.join(__dirname, '..', 'ios', 'abadt', 'WidgetDataModule.swift');
const helperPath = path.join(__dirname, '..', 'utils', 'adhanHealth.ts');
const cardPath = path.join(__dirname, '..', 'components', 'home', 'AdhanStatusCard.tsx');
const swift = fs.readFileSync(swiftPath, 'utf8');
const helper = fs.readFileSync(helperPath, 'utf8');
const card = fs.readFileSync(cardPath, 'utf8');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

// Deterministic API-selection coverage for the supported iOS ranges.
assert(
  /if #available\(iOS 16\.0, \*\)[\s\S]*UIApplication\.openNotificationSettingsURLString/.test(swift),
  'iOS 16+ uses UIApplication.openNotificationSettingsURLString',
);
assert(
  /else if #available\(iOS 15\.4, \*\)[\s\S]*UIApplicationOpenNotificationSettingsURLString/.test(swift),
  'iOS 15.4–15.x uses UIApplicationOpenNotificationSettingsURLString',
);
assert(/else \{[\s\S]*resolve\(false\)[\s\S]*return/.test(swift), 'unsupported iOS versions fail without opening Settings');
assert(/guard let url = URL\(string: settingsURLString\) else[\s\S]*resolve\(false\)/.test(swift), 'malformed API URLs fail without opening Settings');
assert(/canOpenURL\(url\)/.test(swift), 'native bridge checks whether the URL can be opened');
assert(/UIApplication\.shared\.open\(url/.test(swift), 'native bridge opens only the selected Apple URL');
assert(!swift.includes('UIApplication.openSettingsURLString'), 'native bridge has no generic Settings fallback');

const iosHelper = helper.slice(helper.indexOf('export async function openNotificationSettings'));
const iosBranch = iosHelper.slice(0, iosHelper.indexOf('\n  }\n\n  try'));
assert(/if \(Platform\.OS === 'ios'\)/.test(iosHelper), 'JavaScript keeps an explicit iOS branch');
assert(!iosBranch.includes('Linking.openSettings()'), 'iOS branch never opens generic Settings');
assert(/return false/.test(iosHelper), 'bridge failure is returned as a recoverable result');
assert(/Settings → Apps → Ebadat → Notifications/.test(card), 'card contains manual recovery guidance');

console.log('[verify:ios-notification-settings] OK');
