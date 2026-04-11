import renderMetricsConfig from '@/config/quran-render-metrics.json';
import { QuranFontFamily, Typography } from '@/constants/theme';
import { getQuranFontFamily } from '@/hooks/useFonts';
import React, { memo } from 'react';
import { Platform, StyleProp, StyleSheet, Text, TextStyle, View, ViewStyle } from 'react-native';

type QuranRenderVariant = 'scroll' | 'mushaf';
type ArabicFontSizeKey = keyof typeof Typography.arabic;

type FontMetricConfig = {
  fontScale: number;
  lineHeightMultiplier: number;
  textAlign: 'right' | 'center';
  containerPaddingHorizontal: number;
  textPaddingTop: number;
  textPaddingBottom: number;
};

type RenderMetricsConfig = {
  fonts: Record<QuranFontFamily, Record<QuranRenderVariant, FontMetricConfig>>;
};

const metricsConfig = renderMetricsConfig as RenderMetricsConfig;

export type QuranTextLayoutMetrics = {
  fontFamily: string;
  fontSize: number;
  lineHeight: number;
  textAlign: 'right' | 'center';
  containerPaddingHorizontal: number;
  textPaddingTop: number;
  textPaddingBottom: number;
};

export function getQuranTextLayoutMetrics(
  quranFont: QuranFontFamily,
  arabicFontSize: ArabicFontSizeKey,
  variant: QuranRenderVariant
): QuranTextLayoutMetrics {
  const baseFontSize = Typography.arabic[arabicFontSize];
  const metrics = metricsConfig.fonts[quranFont][variant];
  const fontSize = Math.round(baseFontSize * metrics.fontScale * 100) / 100;
  const lineHeight = Math.max(
    Math.ceil(fontSize * metrics.lineHeightMultiplier),
    Math.ceil(fontSize + metrics.textPaddingTop + metrics.textPaddingBottom)
  );

  return {
    fontFamily: getQuranFontFamily(quranFont),
    fontSize,
    lineHeight,
    textAlign: metrics.textAlign,
    containerPaddingHorizontal: metrics.containerPaddingHorizontal,
    textPaddingTop: metrics.textPaddingTop,
    textPaddingBottom: metrics.textPaddingBottom,
  };
}

interface QuranArabicTextProps {
  text: string;
  quranFont: QuranFontFamily;
  arabicFontSize: ArabicFontSizeKey;
  variant?: QuranRenderVariant;
  color: string;
  wrapperStyle?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}

export const QuranArabicText = memo(function QuranArabicText({
  text,
  quranFont,
  arabicFontSize,
  variant = 'scroll',
  color,
  wrapperStyle,
  textStyle,
}: QuranArabicTextProps) {
  const metrics = getQuranTextLayoutMetrics(quranFont, arabicFontSize, variant);
  const renderText = `\u200F${text}\u200F`;

  return (
    <View
      style={[
        styles.wrapper,
        metrics.textAlign === 'center' ? styles.wrapperCentered : styles.wrapperRightAligned,
        metrics.containerPaddingHorizontal > 0 && {
          paddingHorizontal: metrics.containerPaddingHorizontal,
        },
        wrapperStyle,
      ]}
    >
      <Text
        allowFontScaling={false}
        lineBreakStrategyIOS="none"
        style={[
          styles.text,
          metrics.textAlign === 'center' ? styles.textCentered : styles.textRightAligned,
          {
            color,
            fontFamily: metrics.fontFamily,
            fontSize: metrics.fontSize,
            lineHeight: metrics.lineHeight,
            paddingTop: metrics.textPaddingTop,
            paddingBottom: metrics.textPaddingBottom,
            includeFontPadding: Platform.OS === 'android' ? false : undefined,
          },
          textStyle,
        ]}
      >
        {renderText}
      </Text>
    </View>
  );
});

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
    overflow: 'visible',
    alignSelf: 'stretch',
    direction: 'rtl',
  },
  wrapperCentered: {
    alignItems: 'stretch',
  },
  wrapperRightAligned: {
    alignItems: 'stretch',
  },
  text: {
    writingDirection: 'rtl',
    direction: 'rtl',
    letterSpacing: 0,
    overflow: 'visible',
    borderRadius: 0,
  },
  textCentered: {
    textAlign: 'center',
    width: '100%',
    alignSelf: 'stretch',
  },
  textRightAligned: {
    textAlign: 'right',
    width: '100%',
    alignSelf: 'stretch',
  },
});
