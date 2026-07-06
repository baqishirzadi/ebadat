import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Line, Text as SvgText } from 'react-native-svg';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';

import { useApp } from '@/context/AppContext';

interface QiblaDialProps {
  size: number;
  headingRotation: Animated.SharedValue<number>;
  qiblaBearing: number;
  showKaabaMarker?: boolean;
}

const CARDINALS = [
  { label: 'ش', angle: 0 },
  { label: 'ج', angle: 90 },
  { label: 'غ', angle: 180 },
  { label: 'ش', angle: 270 },
];

export function QiblaDial({ size, headingRotation, qiblaBearing, showKaabaMarker = true }: QiblaDialProps) {
  const { theme } = useApp();
  const radius = size / 2 - 8;
  const center = size / 2;

  const dialStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${headingRotation.value}deg` }],
  }));

  const ticks = Array.from({ length: 72 }).map((_, i) => {
    const angle = (i * 5 * Math.PI) / 180;
    const inner = i % 9 === 0 ? radius - 14 : radius - 8;
    const x1 = center + inner * Math.sin(angle);
    const y1 = center - inner * Math.cos(angle);
    const x2 = center + radius * Math.sin(angle);
    const y2 = center - radius * Math.cos(angle);
    return (
      <Line
        key={i}
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke={theme.accent}
        strokeWidth={i % 9 === 0 ? 2 : 1}
        opacity={i % 9 === 0 ? 1 : 0.5}
      />
    );
  });

  const kaabaAngle = (qiblaBearing * Math.PI) / 180;
  const kaabaX = center + (radius - 20) * Math.sin(kaabaAngle);
  const kaabaY = center - (radius - 20) * Math.cos(kaabaAngle);

  return (
    <View style={{ width: size, height: size }}>
      <Animated.View style={[StyleSheet.absoluteFill, dialStyle]}>
        <Svg width={size} height={size}>
          <Circle cx={center} cy={center} r={radius} stroke={theme.cardBorder} strokeWidth={2} fill={theme.card} />
          {ticks}
          {CARDINALS.map((c) => {
            const a = (c.angle * Math.PI) / 180;
            return (
              <SvgText
                key={c.angle}
                x={center + (radius - 24) * Math.sin(a)}
                y={center - (radius - 24) * Math.cos(a) + 4}
                fill={theme.textSecondary}
                fontSize={11}
                textAnchor="middle"
              >
                {c.label}
              </SvgText>
            );
          })}
          {showKaabaMarker ? (
            <Circle cx={kaabaX} cy={kaabaY} r={6} fill={theme.accent} />
          ) : null}
        </Svg>
      </Animated.View>
    </View>
  );
}
