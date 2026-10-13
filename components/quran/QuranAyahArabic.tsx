/**
 * Translation-mode Arabic. Pause signs sit above the words in a narrow slot.
 * On iOS the small-high codepoints draw as a blank gap, so the slot uses
 * plain letters. The ayah ornament stays a separate run.
 */

import React from 'react';
import { Platform, Text, View, type TextStyle } from 'react-native';
import type { QuranFontFamily } from '@/constants/theme';
import { splitPausePieces, type MushafPiece } from '@/utils/hifzKashida';
import { toArabicNumerals } from '@/utils/numbers';
import { QuranText } from './QuranText';

/** Scheherazade sits lower; the Uthmani face draws pause signs higher. */
const PAUSE_LIFT: Record<QuranFontFamily, number> = {
  scheherazade: 0.35,
  qpcHafs: 0.55,
};

/**
 * iOS draws the small-high pause codepoints as a wide blank. Plain letters
 * in the same Quran face stay visible and have a normal advance.
 */
const IOS_PAUSE_LABEL: Record<number, string> = {
  0x06d6: 'صلى',
  0x06d7: 'قلى',
  0x06d8: 'م',
  0x06d9: 'لا',
  0x06da: 'ج',
  0x06db: '...',
  0x06dc: 'س',
  0x0615: 'ط',
};

function iosPauseLabel(marks: string): string {
  const labels: string[] = [];
  for (const glyph of marks) {
    const code = glyph.codePointAt(0);
    const label = code == null ? undefined : IOS_PAUSE_LABEL[code];
    if (label) labels.push(label);
  }
  return labels.join('\u2009');
}

/** Drop the spaces that only separated a pause mark, so the slot is the gap. */
function tightenPauseGaps(pieces: MushafPiece[]): MushafPiece[] {
  return pieces.map((piece, index) => {
    if (piece.kind !== 'text') return piece;
    let value = piece.text;
    if (pieces[index - 1]?.kind === 'pause') value = value.replace(/^\s+/, '');
    if (pieces[index + 1]?.kind === 'pause') value = value.replace(/\s+$/, '');
    return value === piece.text ? piece : { kind: 'text', text: value };
  });
}

export function ayahEndMarker(font: QuranFontFamily, ayahNumber: number): string {
  const digits = toArabicNumerals(ayahNumber);
  return font === 'qpcHafs' ? digits : `﴿${digits}﴾`;
}

function PauseMarks({
  marks,
  fontSize,
  color,
  fontFamily,
  lift,
}: {
  marks: string;
  fontSize: number;
  color: string;
  fontFamily: string;
  lift: number;
}) {
  const glyphs = Array.from(marks);
  const count = Math.max(1, glyphs.length);
  const gap = 1;
  const budget = fontSize * 0.9;
  const markSize = Math.max(8, Math.min(fontSize * 0.46, (budget - gap * (count - 1)) / count));
  if (Platform.OS === 'ios') {
    const label = iosPauseLabel(marks);
    if (!label) return null;
    const signSize = Math.max(8, Math.round(fontSize * 0.32));
    const slot = Math.max(8, Math.round(fontSize * 0.38));
    const boxHeight = Math.round(fontSize * 1.35);
    const units = Math.max(1, Array.from(label).filter((ch) => ch !== '\u2009').length);
    const labelWidth = Math.ceil(signSize * units * 1.05);
    return (
      <View
        style={{
          width: slot,
          height: boxHeight,
          overflow: 'visible',
          direction: 'ltr',
        }}
      >
        <Text
          allowFontScaling={false}
          numberOfLines={1}
          style={{
            position: 'absolute',
            top: 0,
            left: (slot - labelWidth) / 2,
            width: labelWidth,
            fontFamily,
            color,
            fontSize: signSize,
            lineHeight: Math.round(signSize * 1.25),
            textAlign: 'center',
            writingDirection: 'rtl',
          }}
        >
          {label}
        </Text>
      </View>
    );
  }
  return (
    <View
      style={{
        width: fontSize * 0.7,
        height: count * (markSize + gap),
        marginHorizontal: 2,
        flexDirection: 'column-reverse',
        alignItems: 'center',
        justifyContent: 'flex-start',
      }}
    >
      {glyphs.map((glyph, index) => (
        <Text
          key={`${index}-${glyph.codePointAt(0) ?? index}`}
          style={{
            fontFamily,
            color,
            fontSize: markSize,
            lineHeight: markSize,
            textAlign: 'center',
            transform: [{ translateY: markSize * lift }],
          }}
        >
          {glyph}
        </Text>
      ))}
    </View>
  );
}

export function QuranAyahArabic({
  text,
  marker,
  fontFamily,
  fontKey,
  fontSize,
  lineHeight,
  color,
}: {
  text: string;
  marker?: string;
  fontFamily: string;
  fontKey: QuranFontFamily;
  fontSize: number;
  lineHeight: number;
  color: string;
}) {
  const pieces = Platform.OS === 'ios' ? tightenPauseGaps(splitPausePieces(text)) : splitPausePieces(text);
  const lift = PAUSE_LIFT[fontKey] ?? PAUSE_LIFT.scheherazade;
  const iosHeadroom = Platform.OS === 'ios' ? Math.round(fontSize * 0.12) : 0;
  const textStyle: TextStyle = {
    fontFamily,
    color,
    fontSize,
    lineHeight,
    paddingTop: iosHeadroom,
    paddingBottom: Math.round(fontSize * 0.15),
  };

  return (
    <QuranText
      allowFontScaling={false}
      textBreakStrategy="simple"
      lineBreakStrategyIOS="none"
      style={textStyle}
    >
      {pieces.map((piece, index) =>
        piece.kind === 'text' ? (
          <Text key={`t-${index}`}>{piece.text}</Text>
        ) : (
          <PauseMarks
            key={`p-${index}`}
            marks={piece.marks}
            fontSize={fontSize}
            color={color}
            fontFamily={fontFamily}
            lift={lift}
          />
        ),
      )}
      {marker ? (
        <Text
          style={{
            fontFamily,
            color,
            fontSize: Math.round(fontSize * 0.82),
            lineHeight,
            paddingLeft: 6,
          }}
        >
          {` ${marker}`}
        </Text>
      ) : null}
    </QuranText>
  );
}
