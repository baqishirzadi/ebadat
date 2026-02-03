/**
 * IconSymbol Component
 * Maps SF Symbols to Material Icons with Islamic-themed additions
 */

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { SymbolWeight } from 'expo-symbols';
import { ComponentProps } from 'react';
import { OpaqueColorValue, type StyleProp, type TextStyle } from 'react-native';

type IconMapping = Record<string, ComponentProps<typeof MaterialIcons>['name']>;
type IconSymbolName = keyof typeof MAPPING;

/**
 * SF Symbols to Material Icons mapping
 * Includes Islamic-themed icons
 */
const MAPPING: IconMapping = {
  // Navigation
  'house.fill': 'home',
  'paperplane.fill': 'send',
  'chevron.left.forwardslash.chevron.right': 'code',
  'chevron.right': 'chevron-right',
  'chevron.left': 'chevron-left',
  
  // Quran & Islamic
  'book.fill': 'menu-book',
  'bookmark.fill': 'bookmark',
  'bookmark': 'bookmark-border',
  'play.fill': 'play-arrow',
  'pause.fill': 'pause',
  'play.circle.fill': 'play-circle-filled',
  'pause.circle.fill': 'pause-circle-filled',
  
  // Settings & UI
  'gear': 'settings',
  'magnifyingglass': 'search',
  'xmark': 'close',
  'sun.max.fill': 'brightness-high',
  'moon.fill': 'brightness-2',
  
  // Actions
  'square.and.arrow.up': 'share',
  'trash': 'delete',
  'ellipsis': 'more-horiz',
  'info.circle': 'info',
  'cube': 'view-in-ar',
};

/**
 * Icon component that uses native SF Symbols on iOS, and Material Icons on Android/web
 */
export function IconSymbol({
  name,
  size = 24,
  color,
  style,
}: {
  name: IconSymbolName;
  size?: number;
  color: string | OpaqueColorValue;
  style?: StyleProp<TextStyle>;
  weight?: SymbolWeight;
}) {
  const iconName = MAPPING[name] || 'help';
  return <MaterialIcons color={color} size={size} name={iconName} style={style} />;
}
