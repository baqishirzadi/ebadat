#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

const root = path.join(__dirname, '..');
const fail = (message) => {
  console.error(`[verify:pashto-localization] ${message}`);
  process.exit(1);
};
const assert = (condition, message) => {
  if (!condition) fail(message);
};

function compareShape(left, right, trail) {
  assert(typeof left === typeof right, `${trail}: Dari/Pashto value types differ`);
  if (typeof left === 'string') {
    assert(left.trim().length > 0 && right.trim().length > 0, `${trail}: translation is empty`);
    return;
  }
  if (Array.isArray(left)) {
    assert(Array.isArray(right) && left.length === right.length, `${trail}: Dari/Pashto arrays differ in length`);
    left.forEach((value, index) => compareShape(value, right[index], `${trail}[${index}]`));
    return;
  }
  if (left && typeof left === 'object') {
    const leftKeys = Object.keys(left).sort();
    const rightKeys = Object.keys(right || {}).sort();
    assert(JSON.stringify(leftKeys) === JSON.stringify(rightKeys), `${trail}: Dari/Pashto keys differ`);
    leftKeys.forEach((key) => compareShape(left[key], right[key], `${trail}.${key}`));
  }
}

const dariLocale = JSON.parse(fs.readFileSync(path.join(root, 'locales/fa.json'), 'utf8'));
const pashtoLocale = JSON.parse(fs.readFileSync(path.join(root, 'locales/ps.json'), 'utf8'));
compareShape(dariLocale, pashtoLocale, 'locales');

function parseSource(relativePath) {
  const filePath = path.join(root, relativePath);
  const source = fs.readFileSync(filePath, 'utf8');
  return ts.createSourceFile(filePath, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
}

const sourceText = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');

function findConstInitializer(sourceFile, variableName) {
  let initializer;
  const visit = (node) => {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.name.text === variableName) {
      initializer = node.initializer;
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  while (initializer && (
    ts.isAsExpression(initializer)
    || ts.isTypeAssertionExpression(initializer)
    || ts.isSatisfiesExpression(initializer)
    || ts.isParenthesizedExpression(initializer)
  )) initializer = initializer.expression;
  return initializer;
}

const catalogFile = parseSource('utils/i18n/catalog.ts');
const catalog = findConstInitializer(catalogFile, 'UI_MESSAGES');
assert(catalog && ts.isObjectLiteralExpression(catalog), 'UI_MESSAGES semantic catalog was not found');
const keys = new Set();
for (const entry of catalog.properties) {
  if (!ts.isPropertyAssignment(entry)) continue;
  const key = entry.name.text ?? entry.name.getText(catalogFile).replace(/^['"]|['"]$/g, '');
  assert(!keys.has(key), `duplicate catalog key: ${key}`);
  keys.add(key);
  assert(ts.isObjectLiteralExpression(entry.initializer), `${key}: expected language variants`);
  const variants = Object.fromEntries(entry.initializer.properties
    .filter(ts.isPropertyAssignment)
    .map((variant) => [variant.name.text, variant.initializer]));
  for (const language of ['dari', 'pashto']) {
    assert(variants[language] && ts.isStringLiteral(variants[language]), `${key}: missing ${language} string`);
    assert(variants[language].text.trim().length > 0, `${key}: empty ${language} string`);
  }
}
assert(keys.size >= 45, `semantic catalog unexpectedly small (${keys.size} messages)`);

const requiredKeys = [
  'prayerLearning.title', 'prayerLearning.rakat', 'prayerLearning.respondent',
  'dua.new.messagePlaceholder', 'dua.new.failure', 'dua.index.description',
  'dua.detail.pending', 'calendar.mode.shamsi', 'calendar.legend.islamic',
  'home.date.today', 'common.send', 'quran.juzTitle', 'quran.pageRange', 'quran.surahAyahRange',
  'app.splash.subtitle', 'app.splash.creator',
];
requiredKeys.forEach((key) => assert(keys.has(key), `required semantic message is missing: ${key}`));

const todayDateCard = sourceText('components/home/TodayDateCard.tsx');
assert(todayDateCard.includes('weekdayName(truth.weekday, language)') && todayDateCard.includes('formatShamsiSlash(truth.shamsi, language)'), 'Home date card does not select weekday and Solar Hijri labels from the app language');
assert(todayDateCard.includes('hijriMonthName(truth.hijri, language)'), 'Home date card does not show the Hijri month in the app language');
const widgetSnapshot = sourceText('utils/widgetSnapshot.ts');
assert(widgetSnapshot.includes("formatShamsiSlash(truth.shamsi, 'pashto')"), 'Widget snapshot is missing a Pashto Solar Hijri date');

const fontResolver = sourceText('utils/i18n/resolveUiFontFamily.ts');
assert(fontResolver.includes('APP_UI_FONTS') && fontResolver.includes('getPashtoFontFamily'), 'Language-aware UI font resolver is incomplete');
assert(fontResolver.includes('if (requested && !APP_UI_FONTS.has(requested)) return requested'), 'Dedicated Quran/scripture font families are not preserved');
['components/CenteredText.tsx', 'components/ui/RtlText.tsx'].forEach((file) => {
  assert(sourceText(file).includes('resolveUiFontFamily'), `${file}: shared text wrapper bypasses selected font policy`);
});
const localizedText = sourceText('components/ui/LocalizedText.tsx');
assert(localizedText.includes('LocalizedTextInput') && localizedText.includes('preserveFontFamily'), 'Localized text primitives or font preview override are missing');
const numericText = sourceText('components/ui/NumericText.tsx');
assert(numericText.includes('includeFontPadding: false') && numericText.includes("writingDirection: 'ltr'"), 'Quran numeral baseline/isolation settings are missing');
assert(sourceText('components/quran/SurahList.tsx').includes('const ITEM_HEIGHT = 108'), 'Surah list row sizing was not updated for Pashto text');
assert(sourceText('components/quran/JuzList.tsx').includes('content(surah, null)'), 'Juz ranges do not use the selected-language Surah names');
const muftiWidget = sourceText('components/home/HanafiMuftiWidget.tsx');
const dreamWidget = sourceText('components/home/DreamInterpreterWidget.tsx');
const homeComposerRow = sourceText('components/home/HomeComposerRow.tsx');
assert(muftiWidget.includes('HomeComposerRow') && muftiWidget.includes('home-mufti'), 'Home Mufti composer is missing the shared composer row');
assert(dreamWidget.includes('HomeComposerRow') && dreamWidget.includes('home-dream'), 'Home Dream composer is missing the shared composer row');
assert(homeComposerRow.includes('textAlignVertical="center"') && homeComposerRow.includes('minWidth: 0') && homeComposerRow.includes('flexShrink: 1'), 'Home composers do not share centered, shrink-safe input geometry');
assert(homeComposerRow.includes('accessibilityLabel={sendLabel}') && homeComposerRow.includes('`${testIDPrefix}-send`'), 'Home composer send controls are missing accessible labels or stable IDs');
assert(homeComposerRow.includes("fontFamily === 'NotoNastaliqUrdu'") && homeComposerRow.includes('styles.pashtoNastaliqInput') && homeComposerRow.includes('styles.pashtoInput'), 'Home composer does not adapt Pashto input metrics while preserving the selected font');
assert(homeComposerRow.includes('includeFontPadding: true') && homeComposerRow.includes('lineHeight: 30'), 'Home composer Nastaliq input lacks safe vertical metrics');
assert(muftiWidget.includes('isPashto ? Typography.ui.body : Typography.ui.subtitle') && dreamWidget.includes('isPashto ? Typography.ui.body : Typography.ui.subtitle'), 'Home composer titles do not use compact Pashto sizing');
const adhkarHub = sourceText('app/(tabs)/adhkar.tsx');
assert(adhkarHub.includes('RtlText align="center" style={styles.featuredTitle}'), 'Featured adhkar titles are not explicitly centered');
assert(adhkarHub.includes('RtlText align="center" style={[styles.categoryName'), 'Adhkar category names are not explicitly centered');
assert(adhkarHub.includes('styles.categoryInfo') && adhkarHub.includes('styles.categoryCount') && adhkarHub.includes('styles.categoryActionSlot'), 'Adhkar counts are not in the centered text block with a separate action gutter');
assert(adhkarHub.includes('width: 48') && adhkarHub.includes('alignItems: \'center\'') && adhkarHub.includes('alignItems: \'center\''), 'Adhkar category card side gutters or text alignment are not balanced');
assert(adhkarHub.includes('counterInfo: {\n    flex: 1,\n    minWidth: 0,\n    alignItems: \'center\'') && adhkarHub.includes('duaCardInfo: {\n    flex: 1,\n    minWidth: 0,\n    alignItems: \'center\''), 'Adhkar counter or dua card copy is not centered in a shrink-safe middle column');
const muftiChat = sourceText('app/mufti-chat.tsx');
assert(muftiChat.includes('LocalizedTextInput') && muftiChat.includes('mufti-chat-send'), 'Mufti chat composer is missing localized input or stable send control');
const quranScreen = sourceText('components/quran/SurahList.tsx');
assert(quranScreen.includes('testID="quran-continue-reading"') && quranScreen.includes('testID="quran-continue-title"'), 'Quran continue-reading card is missing stable UI identifiers');
assert(quranScreen.includes('numberOfLines={1}') && quranScreen.includes('styles.continueIconSlot'), 'Quran continue-reading title is not centered between balanced icon slots');
assert(quranScreen.includes('minHeight: 72') && quranScreen.includes('fontSize: Typography.ui.body'), 'Quran continue-reading card is not using the compact title geometry');
const widgetUi = sourceText('widgets/PrayerTimesWidget.tsx');
assert(widgetUi.includes('snapshot?.pashtoFont') && widgetUi.includes('NotoNastaliqUrdu'), 'Android widget does not follow the saved Pashto font preference');
assert(!widgetUi.includes('snapshot.hadithText'), 'Android prayer widget still renders Hadith');
assert(widgetUi.includes('(compact ? 9 : 10) - (isPashto ? 1 : 0)') && widgetUi.includes('const solarDateSize = isPashto ? 16 : 18'), 'Android widget does not fit long Pashto labels while retaining the shared layout');
const swiftWidgetModel = sourceText('ios/EbadatPrayerWidget/WidgetShared.swift');
assert(swiftWidgetModel.includes('let dariFont: String?') && swiftWidgetModel.includes('let pashtoFont: String?'), 'iOS widget snapshot does not preserve selected fonts');
const iosWidgetView = sourceText('ios/EbadatPrayerWidget/PrayerTimesWidgetView.swift');
assert(iosWidgetView.includes('.font(.custom(uiFontBold'), 'iOS widget text does not use the selected language font');
assert(iosWidgetView.includes('isPashto ? 9 : 10') && iosWidgetView.includes('.minimumScaleFactor(0.62)') && iosWidgetView.includes('.allowsTightening(true)'), 'iOS widget does not fit long Pashto prayer labels');

const prayerLearning = sourceText('app/(tabs)/prayer-learning.tsx');
assert(prayerLearning.includes('content(category, \'title\')') || prayerLearning.includes('content(currentCategory, \'title\')'), 'Prayer learning does not resolve titles from the active language');
assert(prayerLearning.includes('showBothLanguages={false}'), 'Prayer learning still forces bilingual Dari/Pashto blocks');
assert(prayerLearning.includes("contentList(currentSection, 'steps')"), 'Prayer learning does not resolve instruction steps from the active language');
const duaForm = sourceText('app/dua-request/new.tsx');
assert(duaForm.includes("t('dua.new.messagePlaceholder')") && duaForm.includes("t('dua.new.validation.gender')"), 'Dua form is missing semantic Pashto localization');
assert(sourceText('components/dua/CategorySelector.tsx').includes("pickContent(category, 'name', language)"), 'Dua category selector does not follow the selected language');
assert(sourceText('components/dua/StatusBadge.tsx').includes("t('dua.status.pending')"), 'Dua status badge does not follow the selected language');
const monthGrid = sourceText('components/jantari/MonthGrid.tsx');
assert(monthGrid.includes('GREG_MONTHS_EN') && monthGrid.includes('HIJRI_MONTHS[m - 1]?.[language]'), 'Jantari month labels are not language-aware/compact');
[
  'components/dua/RequestCard.tsx', 'app/dua-request/[id].tsx',
  'app/admin/request/[id].tsx', 'app/(tabs)/bookmarks.tsx',
].forEach((file) => assert(!sourceText(file).includes('toLocaleDateString'), `${file}: Gregorian date still uses long localized month names`));

const surahFile = parseSource('data/surahNames.ts');
const surahMetadata = findConstInitializer(surahFile, 'PASHTO_SURAH_METADATA');
assert(surahMetadata && ts.isArrayLiteralExpression(surahMetadata), 'Pashto Surah metadata array was not found');
assert(surahMetadata.elements.length === 114, `expected 114 Pashto Surah entries, found ${surahMetadata.elements.length}`);
surahMetadata.elements.forEach((entry, index) => {
  assert(ts.isArrayLiteralExpression(entry) && entry.elements.length === 2, `Surah ${index + 1}: expected name and meaning`);
  entry.elements.forEach((value, field) => {
    assert(ts.isStringLiteral(value) && value.text.trim().length > 0, `Surah ${index + 1}: missing Pashto ${field === 0 ? 'name' : 'meaning'}`);
  });
});

const qiblaDial = fs.readFileSync(path.join(root, 'components/qibla/QiblaDial.tsx'), 'utf8');
assert(['ش', 'خ', 'ج', 'ل'].every((label) => qiblaDial.includes(`label: '${label}'`)), 'Pashto Qibla compass initials are missing');
console.log(`[verify:pashto-localization] OK (${keys.size} semantic messages, locale parity, 114 Surahs, Qibla labels)`);
