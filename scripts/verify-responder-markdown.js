const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

const registry = read('constants/responders.ts');
const ids = [...registry.matchAll(/id:\s*'([^']+)'/g)].map((m) => m[1]);
if (ids.join('|') !== 'qari_syed_safiullah_shirzadi|syed_abdul_baqi_shirzadi') {
  throw new Error(`Unexpected responder registry: ${ids.join(', ')}`);
}
if ((registry.match(/id:\s*'/g) || []).length !== 2) {
  throw new Error('Responder registry must contain exactly two responders');
}

const renderer = read('components/MarkdownText.tsx');
if (!/\\\*\\\*\(\[\\s\\S\]\+\?\)\\\*\\\*/.test(renderer) || !/fontWeight:\s*'700'/.test(renderer)) {
  throw new Error('MarkdownText must parse balanced ** segments and render them bold');
}
if (!/(?:###|\{3\})/.test(renderer) || !/heading/.test(renderer)) {
  throw new Error('MarkdownText must hide ### markers and render heading lines bold');
}
if (!/fontStyle:\s*'italic'/.test(renderer) || !/•/.test(renderer) || !/normalizeMarkdownForClipboard/.test(renderer)) {
  throw new Error('MarkdownText must render italic/bullet syntax and expose plain-text clipboard normalization');
}
const muftiChat = read('app/mufti-chat.tsx');
if (!/expo-clipboard/.test(muftiChat) || !/onLongPress={!isUser/.test(muftiChat) || !/normalizeMarkdownForClipboard/.test(muftiChat)) {
  throw new Error('Mufti response long-press copy action is missing');
}
if (/mufti-copy-response/.test(muftiChat) || /کپی<\/RtlText>/.test(muftiChat)) {
  throw new Error('Mufti response still exposes a persistent copy control');
}
if (!/expo-clipboard/.test(read('app/dua-request/[id].tsx')) || !/dua-copy-response/.test(read('app/dua-request/[id].tsx'))) {
  throw new Error('Dua response copy action is missing');
}
for (const file of ['hooks/useHanafiMufti.ts', 'utils/hanafiMuftiStorage.ts', 'app/mufti-chat.tsx', 'app/dua-request/[id].tsx']) {
  if (/formatChatPlainText/.test(read(file))) {
    throw new Error(`${file} still strips markdown before rendering`);
  }
}
if (!/responder_id/.test(read('utils/hanafiMufti.ts')) || !/responder_id/.test(read('supabase/migrations/20260812_add_dua_responder_selection.sql'))) {
  throw new Error('Responder ID is missing from the Dua contract');
}
if (!/options\.responderId\s*\?/.test(read('utils/hanafiMufti.ts'))) {
  throw new Error('Mufti client must only include responder_id for explicit Dua persona requests');
}
const autonomous = read('supabase/functions/dua-autonomous/index.ts');
if (!/A valid responder selection is required/.test(autonomous) || /reviewer_name:\s*responderName \|\| ['"]سیدعبدالباقی/.test(autonomous)) {
  throw new Error('Dua autonomous function must require the selected responder and avoid a default signature');
}

const samples = ['**مثال**', '** مثال **', 'قبل **اول** و **دوم**', '**خط اول\nخط دوم**', 'نامتعادل **متن'];
const matchCount = (sample) => [...sample.matchAll(/\*\*([\s\S]+?)\*\*/g)].length;
if (matchCount(samples[0]) !== 1 || matchCount(samples[1]) !== 1 || matchCount(samples[2]) !== 2 || matchCount(samples[3]) !== 1 || matchCount(samples[4]) !== 0) {
  throw new Error('Markdown bold fixtures failed');
}
const headingSamples = ['### عنوان', '###  عنوان', '###عنوان بدون فاصله', '### عنوان **پررنگ**\nمتن', 'متن\n### عنوان دوم'];
if (!headingSamples.every((sample) => sample.split('\n').some((line) => /^\s*###\s*\S/.test(line)))) {
  throw new Error('Markdown heading fixtures failed');
}
console.log('Responder registry, contract, and markdown checks passed.');
