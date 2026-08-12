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
  const pattern = /\*\*([\s\S]+?)\*\*/g;
  let cursor = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = pattern.exec(children)) !== null) {
    if (match.index > cursor) {
      parts.push(<React.Fragment key={`plain-${key++}`}>{children.slice(cursor, match.index)}</React.Fragment>);
    }
    parts.push(
      <Text key={`bold-${key++}`} style={[{ fontWeight: '700' }, boldStyle]}>
        {match[1]}
      </Text>,
    );
    cursor = match.index + match[0].length;
  }

  if (cursor < children.length) {
    parts.push(<React.Fragment key={`plain-${key++}`}>{children.slice(cursor)}</React.Fragment>);
  }

  return <Text style={style}>{parts.length > 0 ? parts : children}</Text>;
}
