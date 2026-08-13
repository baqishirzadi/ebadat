import React from 'react';
import { StyleProp, Text, TextStyle } from 'react-native';

export function MarkdownText({
  children,
  style,
  boldStyle,
}: {
  children: string;
  style?: StyleProp<TextStyle>;
  boldStyle?: StyleProp<TextStyle>;
}) {
  const parts: React.ReactNode[] = [];
  let key = 0;
  const lines = children.split('\n');

  const renderInline = (text: string): React.ReactNode[] => {
    const inlineParts: React.ReactNode[] = [];
    const pattern = /\*\*([\s\S]+?)\*\*/g;
    let cursor = 0;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(text)) !== null) {
      if (match.index > cursor) {
        inlineParts.push(<React.Fragment key={`plain-${key++}`}>{text.slice(cursor, match.index)}</React.Fragment>);
      }
      inlineParts.push(
        <Text key={`bold-${key++}`} style={[{ fontWeight: '700' }, boldStyle]}>
          {match[1]}
        </Text>,
      );
      cursor = match.index + match[0].length;
    }
    if (cursor < text.length) {
      inlineParts.push(<React.Fragment key={`plain-${key++}`}>{text.slice(cursor)}</React.Fragment>);
    }
    return inlineParts.length > 0 ? inlineParts : [text];
  };

  lines.forEach((line, index) => {
    const heading = line.match(/^\s*###\s*(\S(?:.*\S)?)\s*$/);
    const content = heading ? heading[1] : line;
    const lineParts = renderInline(content);
    parts.push(
      <Text key={`line-${key++}`} style={heading ? [{ fontWeight: '700' }, boldStyle] : undefined}>
        {lineParts}
      </Text>,
    );
    if (index < lines.length - 1) {
      parts.push(<React.Fragment key={`newline-${key++}`}>{'\n'}</React.Fragment>);
    }
  });

  return <Text style={style}>{parts.length > 0 ? parts : children}</Text>;
}
