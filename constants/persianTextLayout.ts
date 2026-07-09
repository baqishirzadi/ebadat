/**
 * Shared Persian/Dari RTL text layout — matches TextInput placeholder behavior
 * ("سوال فقهی خود را بنویسید..."): right-aligned, RTL writing direction.
 */

import { TextStyle } from 'react-native';

import { Typography } from '@/constants/theme';

export const persianTextLayout: TextStyle = {
  textAlign: 'right',
  writingDirection: 'rtl',
  fontFamily: 'Vazirmatn',
};

export const persianBodyText: TextStyle = {
  ...persianTextLayout,
  fontSize: Typography.ui.body,
};

export const persianCaptionText: TextStyle = {
  ...persianTextLayout,
  fontSize: Typography.ui.caption,
};

export const persianSubtitleText: TextStyle = {
  ...persianTextLayout,
  fontSize: Typography.ui.subtitle,
};

export const persianCenterText: TextStyle = {
  ...persianTextLayout,
  textAlign: 'center',
};

export const persianCenterCaptionText: TextStyle = {
  ...persianCenterText,
  fontSize: Typography.ui.caption,
};

export const persianCenterSubtitleText: TextStyle = {
  ...persianCenterText,
  fontSize: Typography.ui.subtitle,
};

export const persianInputTextStyle: TextStyle = {
  ...persianBodyText,
};

export const persianTextInputAlignProps = {
  textAlign: 'right' as const,
};
