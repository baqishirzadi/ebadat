import React from 'react';
import { StyleProp, Text, TextStyle } from 'react-native';

type MarkdownTextProps = {
  children: string;
  style?: StyleProp<TextStyle>;
  boldStyle?: StyleProp<TextStyle>;
  headingStyle?: StyleProp<TextStyle>;
  italicStyle?: StyleProp<TextStyle>;
  bulletStyle?: StyleProp<TextStyle>;
  onLongPress?: () => void;
  testID?: string;
};

/** Remove presentation-only Markdown syntax for clipboard/plain-text output. */
export function normalizeMarkdownForClipboard(value: string): string {
  return value
    .split('\n')
    .map((line) => line
      .replace(/^\s*#{3}\s*/, '')
      .replace(/^\s*[*-]\s+/, '• ')
      .replace(/\*\*([\s\S]+?)\*\*/g, '$1')
      .replace(/\*([^*\n]+?)\*/g, '$1')
      .replace(/[*#]/g, '')
      .trimEnd())
    .join('\n');
}

function sanitizePlainText(value: string): string {
  return value.replace(/[*#]/g, '');
}

export function MarkdownText({
  children,
  style,
  boldStyle,
  headingStyle,
  italicStyle,
  bulletStyle,
  onLongPress,
  testID,
}: MarkdownTextProps) {
  const parts: React.ReactNode[] = [];
  let key = 0;

  const renderInline = (value: string): React.ReactNode[] => {
    const inline: React.ReactNode[] = [];
    const pattern = /\*\*([\s\S]+?)\*\*|\*([^*\n]+?)\*/g;
    let cursor = 0;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(value)) !== null) {
      if (match.index > cursor) {
        inline.push(<React.Fragment key={`plain-${key++}`}>{sanitizePlainText(value.slice(cursor, match.index))}</React.Fragment>);
      }
      if (match[1] !== undefined) {
        inline.push(
          <Text key={`bold-${key++}`} style={[{ fontWeight: '700' }, boldStyle]}>
            {match[1]}
          </Text>,
        );
      } else {
        inline.push(
          <Text key={`italic-${key++}`} style={[{ fontStyle: 'italic' }, italicStyle]}>
            {match[2]}
          </Text>,
        );
      }
      cursor = match.index + match[0].length;
    }
    if (cursor < value.length) {
      inline.push(<React.Fragment key={`plain-${key++}`}>{sanitizePlainText(value.slice(cursor))}</React.Fragment>);
    }
    return inline.length > 0 ? inline : [sanitizePlainText(value)];
  };

  children.split('\n').forEach((rawLine, index, lines) => {
    const heading = rawLine.match(/^\s*#{3}\s*(\S(?:.*\S)?)\s*$/);
    const bulletMatch = rawLine.match(/^\s*[*-]\s+(.+)$/);
    const bullet = !heading && bulletMatch ? bulletMatch : null;
    const content = heading?.[1] ?? bullet?.[1] ?? rawLine;
    const lineChildren = renderInline(content);
    const lineStyle = heading
      ? [{ fontWeight: '700' as const }, boldStyle, headingStyle]
      : bullet
        ? bulletStyle
        : undefined;
    parts.push(
      <Text key={`line-${key++}`} style={lineStyle}>
        {bullet ? '• ' : null}
        {lineChildren}
      </Text>,
    );
    if (index < lines.length - 1) {
      parts.push(<React.Fragment key={`newline-${key++}`}>{'\n'}</React.Fragment>);
    }
  });

  return (
    <Text
      testID={testID}
      style={style}
      onLongPress={onLongPress}
    >
      {parts.length > 0 ? parts : sanitizePlainText(children)}
    </Text>
  );
}
