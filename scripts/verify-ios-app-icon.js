#!/usr/bin/env node

const childProcess = require('child_process');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const catalogPath = path.join(root, 'ios', 'abadt', 'Images.xcassets', 'AppIcon.appiconset');
const contentsPath = path.join(catalogPath, 'Contents.json');
const projectPath = path.join(root, 'ios', 'abadt.xcodeproj', 'project.pbxproj');

function fail(message) {
  console.error(`[verify:ios-app-icon] ${message}`);
  process.exit(1);
}

function imageMetadata(filePath) {
  const output = childProcess.execFileSync('sips', ['-g', 'pixelWidth', '-g', 'pixelHeight', '-g', 'hasAlpha', '-g', 'format', filePath], {
    encoding: 'utf8',
  });
  const number = (key) => Number(output.match(new RegExp(`${key}:\\s*(\\d+)`))?.[1]);
  const string = (key) => output.match(new RegExp(`${key}:\\s*(\\S+)`))?.[1];
  return {
    width: number('pixelWidth'),
    height: number('pixelHeight'),
    hasAlpha: string('hasAlpha'),
    format: string('format'),
  };
}

function pixels(size, scale) {
  return Math.round(Number.parseFloat(size) * Number.parseInt(scale, 10));
}

if (!fs.existsSync(contentsPath)) fail('AppIcon asset catalog is missing');
const catalog = JSON.parse(fs.readFileSync(contentsPath, 'utf8'));
const images = catalog.images ?? [];

const requiredSlots = [
  ['iphone', '60x60', '2x'],
  ['iphone', '60x60', '3x'],
  ['ipad', '76x76', '1x'],
  ['ipad', '76x76', '2x'],
  ['ios-marketing', '1024x1024', '1x'],
];

for (const [idiom, size, scale] of requiredSlots) {
  const slot = images.find((image) => image.idiom === idiom && image.size === size && image.scale === scale);
  if (!slot?.filename) fail(`required ${idiom} ${size}@${scale} icon is missing`);
}

for (const image of images) {
  if (!image.filename) fail(`unassigned ${image.idiom} ${image.size}@${image.scale} icon slot`);
  const filePath = path.join(catalogPath, image.filename);
  if (!fs.existsSync(filePath)) fail(`missing icon file: ${image.filename}`);
  const expected = pixels(image.size, image.scale);
  const metadata = imageMetadata(filePath);
  if (metadata.width !== expected || metadata.height !== expected) {
    fail(`${image.filename} is ${metadata.width}x${metadata.height}; expected ${expected}x${expected}`);
  }
  if (metadata.format !== 'png') fail(`${image.filename} must be PNG`);
  if (metadata.hasAlpha !== 'no') fail(`${image.filename} must not contain an alpha channel`);
}

const project = fs.readFileSync(projectPath, 'utf8');
if (!project.includes('ASSETCATALOG_COMPILER_APPICON_NAME = AppIcon;')) {
  fail('iOS target does not compile the AppIcon asset catalog');
}

console.log(`[verify:ios-app-icon] OK (${images.length} PNGs, required iPhone/iPad/marketing slots present)`);
