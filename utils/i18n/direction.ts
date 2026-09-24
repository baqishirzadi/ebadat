/**
 * Layout direction derived from the active language.
 *
 * Two layers cooperate here:
 *
 * 1. Style layer (immediate). Every direction-dependent style is resolved from
 *    the active language, and the app root sets an explicit `direction`. Yoga
 *    resolves `row`, `start`/`end` edges and margins against the nearest node
 *    direction, so switching languages re-lays out the tree without a restart.
 * 2. Native layer (next launch). `I18nManager` still drives platform widgets
 *    (alerts, pickers, text-input caret, horizontal scroll origin). React
 *    Native only reads it at startup, so it is written when the language
 *    changes and takes effect the next time the app starts cold.
 */

import { I18nManager, type TextStyle, type ViewStyle } from 'react-native';

import type { AppLanguage } from '@/types/quran';
import { isRtlLanguage } from './languages';

/** True when the platform layer disagrees with the language the user picked. */
export function isNativeDirectionStale(language: AppLanguage): boolean {
  return I18nManager.isRTL !== isRtlLanguage(language);
}

/**
 * Align the persisted native direction with the language.
 *
 * `allowRTL(false)` matters as much as `forceRTL(false)`: React Native falls
 * back to the device locale when RTL is merely "not forced", and most users of
 * this app have an RTL device locale.
 *
 * Returns true when the platform layer changed and a cold start is required
 * for native widgets to catch up.
 */
export function applyNativeLayoutDirection(language: AppLanguage): boolean {
  const shouldBeRtl = isRtlLanguage(language);
  if (I18nManager.isRTL === shouldBeRtl) return false;

  I18nManager.allowRTL(shouldBeRtl);
  I18nManager.forceRTL(shouldBeRtl);
  return true;
}

export function isRtl(language: AppLanguage): boolean {
  return isRtlLanguage(language);
}

/** Explicit direction for a subtree. Set on the app root and on any island. */
export function directionStyle(language: AppLanguage): ViewStyle {
  return { direction: isRtlLanguage(language) ? 'rtl' : 'ltr' };
}

/**
 * A row whose first child sits on the reading-start edge.
 *
 * Prefer this over a hardcoded `row-reverse`, which only reads correctly in
 * RTL and silently mirrors the layout in English.
 */
export function rowStyle(language: AppLanguage): ViewStyle {
  return { flexDirection: isRtlLanguage(language) ? 'row-reverse' : 'row' };
}

/** A row whose first child sits on the reading-end edge. */
export function rowReverseStyle(language: AppLanguage): ViewStyle {
  return { flexDirection: isRtlLanguage(language) ? 'row' : 'row-reverse' };
}

/** Text aligned to the reading-start edge. */
export function textStartStyle(language: AppLanguage): TextStyle {
  const rtl = isRtlLanguage(language);
  return { textAlign: rtl ? 'right' : 'left', writingDirection: rtl ? 'rtl' : 'ltr' };
}

/** Centered text that still carries the correct bidi base direction. */
export function textCenterStyle(language: AppLanguage): TextStyle {
  return { textAlign: 'center', writingDirection: isRtlLanguage(language) ? 'rtl' : 'ltr' };
}

export function writingDirectionFor(language: AppLanguage): 'rtl' | 'ltr' {
  return isRtlLanguage(language) ? 'rtl' : 'ltr';
}

export function textAlignStart(language: AppLanguage): 'left' | 'right' {
  return isRtlLanguage(language) ? 'right' : 'left';
}

export function textAlignEnd(language: AppLanguage): 'left' | 'right' {
  return isRtlLanguage(language) ? 'left' : 'right';
}

/** Back affordance points toward the reading-start edge. */
export function backIconName(language: AppLanguage): 'arrow-forward' | 'arrow-back' {
  return isRtlLanguage(language) ? 'arrow-forward' : 'arrow-back';
}

/** Disclosure chevron points toward the reading-end edge. */
export function forwardChevronName(language: AppLanguage): 'chevron-left' | 'chevron-right' {
  return isRtlLanguage(language) ? 'chevron-left' : 'chevron-right';
}
