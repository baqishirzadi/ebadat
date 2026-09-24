#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

function fail(message) {
  console.error(`[verify:dream-interpreter] ${message}`);
  process.exit(1);
}

const client = read('utils/dreamInterpreter.ts');
const storage = read('utils/dreamInterpreterStorage.ts');
const hook = read('hooks/useDreamInterpreter.ts');
const chat = read('app/dream-chat.tsx');
const copy = read('constants/dreamInterpreterCopy.ts');
const widget = read('components/home/DreamInterpreterWidget.tsx');
const homeComposerRow = read('components/home/HomeComposerRow.tsx');
const homeGreen = read('components/home/HomeGreenSection.tsx');
const more = read('app/(tabs)/more.tsx');

for (const marker of [
  'dream-interpreter',
  'sessionState',
  'apikey',
  'READ_TIMEOUT_MS',
  '90_000',
  'sanitizeDreamMessages',
  'stripDreamMarkdown',
  '402',
  'سرویس موقتاً در دسترس نیست',
]) {
  if (!client.includes(marker)) fail(`dreamInterpreter client is missing ${marker}`);
}

if (!client.includes('slice(-MAX_MESSAGES)') && !client.includes('MAX_MESSAGES = 24')) {
  fail('API history cap is missing');
}
if (!client.includes('MAX_MESSAGES = 24')) fail('Client must cap history at 24 messages');
if (client.includes('Speech') || client.includes('expo-speech') || client.includes('voice')) {
  fail('Dream interpreter client must not include voice/audio APIs');
}
if (/console\.(log|info|debug|warn)\([^)]*content/.test(client)) {
  fail('Dream interpreter must not log message content');
}

if (!storage.includes("@ebadat/dream_interpreter_v1")) fail('Storage key is missing');
if (!storage.includes('lastMessageAt')) fail('Storage must persist lastMessageAt');
if (!storage.includes('30 * 60 * 1000')) fail('30-minute session idle window is missing');
if (storage.includes('@ebadat/hanafi_mufti_messages')) fail('Dream storage must stay separate from Mufti');

if (!hook.includes('computeDreamSessionState')) fail('Hook must compute sessionState');
if (!hook.includes('askDreamInterpreter')) fail('Hook must call the dream SSE client');
if (!hook.includes('retryLast')) fail('Hook must support retry');
if (hook.includes('askHanafiMufti') || hook.includes('hanafi_mufti')) {
  fail('Dream hook must not share Mufti history or client');
}

for (const marker of [
  'DREAM_COPY',
  'DREAM_INPUT_MAX_LENGTH',
  'maxLength={DREAM_INPUT_MAX_LENGTH}',
  'stripDreamMarkdown',
  'onLongPress={!isUser',
  'dream-chat-input',
  'copy.welcome',
  'copy.disclaimer',
  'copy.newChat',
  'copy.retry',
]) {
  if (!chat.includes(marker)) fail(`dream-chat is missing ${marker}`);
}
if (chat.includes('Speech') || chat.includes('expo-av') || chat.includes('voice')) {
  fail('Dream chat must not include voice/audio features');
}
if (!copy.includes('2000')) fail('Input max length constant is missing');
if (!copy.includes('خواب دیدم باران می‌بارد')) fail('Dari chips are missing');
if (!copy.includes('خوب مې ولید چې باران ورېږي')) fail('Pashto chips are missing');

if (!widget.includes('testIDPrefix="home-dream"') || !homeComposerRow.includes('${testIDPrefix}-input')) {
  fail('Home dream composer testID is missing');
}
if (!widget.includes("router.push('/dream-chat'")) fail('Home dream widget must open /dream-chat');
if (!homeGreen.includes('DreamInterpreterWidget')) fail('Green card must include the dream composer');
if (!more.includes("route: '/dream-chat'")) fail('More hub is missing the dream interpreter row');

const muftiStorage = read('utils/hanafiMuftiStorage.ts');
if (muftiStorage.includes('dream_interpreter')) fail('Mufti storage was coupled to dream interpreter');

console.log('[verify:dream-interpreter] OK');
