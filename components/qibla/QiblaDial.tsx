import React, { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Image as SvgImage, Line, Polygon, Text as SvgText } from 'react-native-svg';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';

import { useApp } from '@/context/AppContext';

const KAABA_SOURCE = require('@/assets/images/kaaba-marker.png');

interface QiblaDialProps {
  size: number;
  heading: number;
  headingRotation: Animated.SharedValue<number>;
  qiblaBearing: number;
}

const CARDINALS = [
  { label: 'N', angle: 0, color: '#EF4444' },
  { label: 'E', angle: 90, color: undefined },
  { label: 'S', angle: 180, color: undefined },
  { label: 'W', angle: 270, color: undefined },
];

export const QiblaDial = memo(function QiblaDial({ size, heading, headingRotation, qiblaBearing }: QiblaDialProps) {
  const { theme } = useApp();
  const radius = size / 2 - 10;
  const center = size / 2;
  const kaabaRadius = radius - 26;

  // Position of the Kaaba marker RELATIVE to the fixed top pointer.
  // Rendered in SVG coordinate space, which is immune to RTL mirroring.
  const relativeBearing = qiblaBearing - heading;
  const kaabaAngleRad = (relativeBearing * Math.PI) / 180;
  const kaabaX = center + kaabaRadius * Math.sin(kaabaAngleRad);
  const kaabaY = center - kaabaRadius * Math.cos(kaabaAngleRad);
  const kaabaBox = 30;

  const dialStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${headingRotation.value}deg` }],
  }));

  const ticks = Array.from({ length: 72 }).map((_, i) => {
    const angle = (i * 5 * Math.PI) / 180;
    const inner = i % 9 === 0 ? radius - 16 : radius - 9;
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
        opacity={i % 9 === 0 ? 1 : 0.45}
      />
    );
  });

  return (
    <View style={[styles.root, { width: size, height: size }]}>
      <View style={styles.topPointer} pointerEvents="none">
        <Svg width={24} height={20} viewBox="0 0 24 20">
          <Polygon points="12,0 24,20 0,20" fill={theme.tint} />
        </Svg>
      </View>

      {/* Rotating dial: circle, ticks, cardinal letters */}
      <Animated.View style={[StyleSheet.absoluteFill, dialStyle]}>
        <Svg width={size} height={size}>
          <Circle cx={center} cy={center} r={radius} stroke={theme.cardBorder} strokeWidth={3} fill={theme.card} />
          {ticks}
          {CARDINALS.map((c) => {
            const a = (c.angle * Math.PI) / 180;
            return (
              <SvgText
                key={c.angle}
                x={center + (radius - 26) * Math.sin(a)}
                y={center - (radius - 26) * Math.cos(a) + 5}
                fill={c.color ?? theme.textSecondary}
                fontSize={c.angle === 0 ? 16 : 13}
                fontWeight="700"
                textAnchor="middle"
              >
                {c.label}
              </SvgText>
            );
          })}
        </Svg>
      </Animated.View>

      {/* Static Kaaba marker layer (SVG space => never mirrored by RTL) */}
      <Svg width={size} height={size} style={StyleSheet.absoluteFill} pointerEvents="none">
        <Circle
          cx={kaabaX}
          cy={kaabaY}
          r={kaabaBox / 2 + 5}
          fill={theme.background}
          stroke={theme.tint}
          strokeWidth={2}
        />
        <SvgImage
          href={KAABA_SOURCE}
          x={kaabaX - kaabaBox / 2}
          y={kaabaY - kaabaBox / 2}
          width={kaabaBox}
          height={kaabaBox}
          preserveAspectRatio="xMidYMid meet"
        />
      </Svg>

      <View style={[styles.hub, { backgroundColor: theme.background, borderColor: theme.cardBorder }]}>
        <View style={[styles.hubDot, { backgroundColor: theme.tint }]} />
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  root: {
    direction: 'ltr',
  },
  topPointer: {
    position: 'absolute',
    top: 0,
    left: '50%',
    marginLeft: -12,
    zIndex: 10,
  },
  hub: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: 20,
    height: 20,
    marginLeft: -10,
    marginTop: -10,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 5,
  },
  hubDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
