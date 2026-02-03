/**
 * Prayer Illustration Component
 * Simple geometric illustrations for prayer positions
 * Using circles, lines, and shapes to represent human form
 * Respects Islamic guidelines by avoiding detailed imagery
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Circle, Line, Path, Rect, G } from 'react-native-svg';

interface PrayerIllustrationProps {
  type: string;
  size?: number;
  color?: string;
}

export function PrayerIllustration({ type, size = 120, color = '#1B5E20' }: PrayerIllustrationProps) {
  const scale = size / 120;

  const illustrations: Record<string, React.ReactNode> = {
    // Standing position (Qiyam)
    qiyam: (
      <G>
        {/* Head */}
        <Circle cx="60" cy="20" r="12" fill={color} />
        {/* Body */}
        <Line x1="60" y1="32" x2="60" y2="70" stroke={color} strokeWidth="4" />
        {/* Arms folded on chest/navel */}
        <Path d="M 45 50 Q 60 45 75 50" stroke={color} strokeWidth="3" fill="none" />
        {/* Legs */}
        <Line x1="60" y1="70" x2="50" y2="100" stroke={color} strokeWidth="4" />
        <Line x1="60" y1="70" x2="70" y2="100" stroke={color} strokeWidth="4" />
        {/* Prayer mat */}
        <Rect x="30" y="98" width="60" height="6" rx="2" fill={`${color}40`} />
      </G>
    ),

    // Bowing position (Ruku)
    ruku: (
      <G>
        {/* Head */}
        <Circle cx="85" cy="45" r="10" fill={color} />
        {/* Back (horizontal) */}
        <Line x1="75" y1="45" x2="45" y2="45" stroke={color} strokeWidth="4" />
        {/* Legs */}
        <Line x1="45" y1="45" x2="45" y2="75" stroke={color} strokeWidth="4" />
        <Line x1="45" y1="75" x2="40" y2="100" stroke={color} strokeWidth="4" />
        <Line x1="45" y1="75" x2="50" y2="100" stroke={color} strokeWidth="4" />
        {/* Arms to knees */}
        <Line x1="55" y1="45" x2="48" y2="70" stroke={color} strokeWidth="3" />
        <Line x1="65" y1="45" x2="52" y2="70" stroke={color} strokeWidth="3" />
        {/* Prayer mat */}
        <Rect x="25" y="98" width="50" height="6" rx="2" fill={`${color}40`} />
      </G>
    ),

    // Prostration position (Sujud)
    sujud: (
      <G>
        {/* Head on ground */}
        <Circle cx="80" cy="90" r="10" fill={color} />
        {/* Back (angled down) */}
        <Path d="M 70 90 Q 50 70 40 55" stroke={color} strokeWidth="4" fill="none" />
        {/* Legs folded */}
        <Path d="M 40 55 L 35 70 L 25 90" stroke={color} strokeWidth="4" fill="none" />
        {/* Arms on ground */}
        <Line x1="75" y1="85" x2="95" y2="90" stroke={color} strokeWidth="3" />
        <Line x1="75" y1="95" x2="95" y2="95" stroke={color} strokeWidth="3" />
        {/* Prayer mat */}
        <Rect x="15" y="96" width="90" height="6" rx="2" fill={`${color}40`} />
      </G>
    ),

    // Sitting position (Jalsa/Tashahhud)
    jalsa: (
      <G>
        {/* Head */}
        <Circle cx="60" cy="35" r="10" fill={color} />
        {/* Body (sitting) */}
        <Line x1="60" y1="45" x2="60" y2="70" stroke={color} strokeWidth="4" />
        {/* Arms on thighs */}
        <Line x1="50" y1="55" x2="40" y2="75" stroke={color} strokeWidth="3" />
        <Line x1="70" y1="55" x2="80" y2="75" stroke={color} strokeWidth="3" />
        {/* Legs folded */}
        <Path d="M 60 70 L 45 85 L 30 90" stroke={color} strokeWidth="4" fill="none" />
        <Path d="M 60 70 L 75 85 L 90 90" stroke={color} strokeWidth="4" fill="none" />
        {/* Prayer mat */}
        <Rect x="20" y="92" width="80" height="6" rx="2" fill={`${color}40`} />
      </G>
    ),

    // Tashahhud with finger raised
    tashahhud: (
      <G>
        {/* Head */}
        <Circle cx="60" cy="35" r="10" fill={color} />
        {/* Body (sitting) */}
        <Line x1="60" y1="45" x2="60" y2="70" stroke={color} strokeWidth="4" />
        {/* Left arm on thigh */}
        <Line x1="50" y1="55" x2="40" y2="75" stroke={color} strokeWidth="3" />
        {/* Right arm with raised finger */}
        <Line x1="70" y1="55" x2="80" y2="70" stroke={color} strokeWidth="3" />
        <Line x1="80" y1="70" x2="80" y2="55" stroke={color} strokeWidth="2" />
        {/* Legs folded */}
        <Path d="M 60 70 L 45 85 L 30 90" stroke={color} strokeWidth="4" fill="none" />
        <Path d="M 60 70 L 75 85 L 90 90" stroke={color} strokeWidth="4" fill="none" />
        {/* Prayer mat */}
        <Rect x="20" y="92" width="80" height="6" rx="2" fill={`${color}40`} />
      </G>
    ),

    // Qawmah (standing after ruku)
    qawmah: (
      <G>
        {/* Head */}
        <Circle cx="60" cy="20" r="12" fill={color} />
        {/* Body */}
        <Line x1="60" y1="32" x2="60" y2="70" stroke={color} strokeWidth="4" />
        {/* Arms at sides */}
        <Line x1="60" y1="40" x2="45" y2="60" stroke={color} strokeWidth="3" />
        <Line x1="60" y1="40" x2="75" y2="60" stroke={color} strokeWidth="3" />
        {/* Legs */}
        <Line x1="60" y1="70" x2="50" y2="100" stroke={color} strokeWidth="4" />
        <Line x1="60" y1="70" x2="70" y2="100" stroke={color} strokeWidth="4" />
        {/* Prayer mat */}
        <Rect x="30" y="98" width="60" height="6" rx="2" fill={`${color}40`} />
      </G>
    ),

    // Wudu step 1: Hands
    'wudu-1': (
      <G>
        {/* Basin */}
        <Path d="M 25 80 Q 60 100 95 80 L 90 60 Q 60 70 30 60 Z" fill={`${color}20`} stroke={color} strokeWidth="2" />
        {/* Water drops */}
        <Circle cx="50" cy="50" r="3" fill="#4FC3F7" />
        <Circle cx="60" cy="45" r="3" fill="#4FC3F7" />
        <Circle cx="70" cy="50" r="3" fill="#4FC3F7" />
        {/* Hands */}
        <Path d="M 45 30 L 45 55 M 40 55 L 50 55" stroke={color} strokeWidth="3" fill="none" />
        <Path d="M 75 30 L 75 55 M 70 55 L 80 55" stroke={color} strokeWidth="3" fill="none" />
      </G>
    ),

    // Wudu step 2: Mouth
    'wudu-2': (
      <G>
        {/* Face circle */}
        <Circle cx="60" cy="50" r="35" fill="none" stroke={color} strokeWidth="2" />
        {/* Eyes */}
        <Circle cx="48" cy="45" r="3" fill={color} />
        <Circle cx="72" cy="45" r="3" fill={color} />
        {/* Mouth with water */}
        <Path d="M 48 65 Q 60 75 72 65" stroke={color} strokeWidth="2" fill="none" />
        {/* Water drops */}
        <Circle cx="55" cy="70" r="2" fill="#4FC3F7" />
        <Circle cx="65" cy="72" r="2" fill="#4FC3F7" />
      </G>
    ),

    // Wudu step 3: Nose
    'wudu-3': (
      <G>
        {/* Face circle */}
        <Circle cx="60" cy="50" r="35" fill="none" stroke={color} strokeWidth="2" />
        {/* Nose */}
        <Path d="M 60 40 L 60 60 M 55 60 Q 60 65 65 60" stroke={color} strokeWidth="2" fill="none" />
        {/* Water drops */}
        <Circle cx="58" cy="55" r="2" fill="#4FC3F7" />
        <Circle cx="62" cy="55" r="2" fill="#4FC3F7" />
      </G>
    ),

    // Wudu step 4: Face
    'wudu-4': (
      <G>
        {/* Face circle */}
        <Circle cx="60" cy="50" r="35" fill={`${color}20`} stroke={color} strokeWidth="3" />
        {/* Water drops around */}
        <Circle cx="30" cy="50" r="3" fill="#4FC3F7" />
        <Circle cx="60" cy="18" r="3" fill="#4FC3F7" />
        <Circle cx="90" cy="50" r="3" fill="#4FC3F7" />
        <Circle cx="45" cy="25" r="2" fill="#4FC3F7" />
        <Circle cx="75" cy="25" r="2" fill="#4FC3F7" />
      </G>
    ),

    // Wudu step 5: Arms
    'wudu-5': (
      <G>
        {/* Arm shape */}
        <Path d="M 30 30 L 30 90 M 25 90 L 35 90" stroke={color} strokeWidth="8" fill="none" strokeLinecap="round" />
        <Path d="M 90 30 L 90 90 M 85 90 L 95 90" stroke={color} strokeWidth="8" fill="none" strokeLinecap="round" />
        {/* Water drops */}
        <Circle cx="30" cy="50" r="3" fill="#4FC3F7" />
        <Circle cx="30" cy="70" r="3" fill="#4FC3F7" />
        <Circle cx="90" cy="50" r="3" fill="#4FC3F7" />
        <Circle cx="90" cy="70" r="3" fill="#4FC3F7" />
        {/* Elbow line */}
        <Line x1="20" y1="30" x2="40" y2="30" stroke={color} strokeWidth="2" strokeDasharray="3,3" />
        <Line x1="80" y1="30" x2="100" y2="30" stroke={color} strokeWidth="2" strokeDasharray="3,3" />
      </G>
    ),

    // Wudu step 6: Head masah
    'wudu-6': (
      <G>
        {/* Head oval */}
        <Circle cx="60" cy="50" r="35" fill="none" stroke={color} strokeWidth="2" />
        {/* Hair area */}
        <Path d="M 30 45 Q 60 20 90 45" stroke={color} strokeWidth="2" fill={`${color}20`} />
        {/* Arrows showing masah direction */}
        <Path d="M 40 35 L 80 35" stroke={color} strokeWidth="2" markerEnd="url(#arrowhead)" />
        <Path d="M 80 45 L 40 45" stroke={color} strokeWidth="2" markerEnd="url(#arrowhead)" />
      </G>
    ),

    // Wudu step 7: Ears
    'wudu-7': (
      <G>
        {/* Head outline */}
        <Circle cx="60" cy="50" r="30" fill="none" stroke={color} strokeWidth="2" />
        {/* Ears */}
        <Path d="M 28 45 Q 20 50 28 55" stroke={color} strokeWidth="3" fill={`${color}40`} />
        <Path d="M 92 45 Q 100 50 92 55" stroke={color} strokeWidth="3" fill={`${color}40`} />
        {/* Fingers on ears */}
        <Line x1="15" y1="50" x2="28" y2="50" stroke={color} strokeWidth="2" />
        <Line x1="92" y1="50" x2="105" y2="50" stroke={color} strokeWidth="2" />
      </G>
    ),

    // Wudu step 8: Feet
    'wudu-8': (
      <G>
        {/* Feet outlines */}
        <Path d="M 25 30 L 25 80 Q 25 90 35 90 L 50 90 Q 55 90 55 85 L 55 80" stroke={color} strokeWidth="3" fill={`${color}20`} />
        <Path d="M 65 80 L 65 85 Q 65 90 70 90 L 85 90 Q 95 90 95 80 L 95 30" stroke={color} strokeWidth="3" fill={`${color}20`} />
        {/* Ankle line */}
        <Line x1="20" y1="30" x2="60" y2="30" stroke={color} strokeWidth="2" strokeDasharray="3,3" />
        <Line x1="60" y1="30" x2="100" y2="30" stroke={color} strokeWidth="2" strokeDasharray="3,3" />
        {/* Water drops */}
        <Circle cx="40" cy="60" r="3" fill="#4FC3F7" />
        <Circle cx="80" cy="60" r="3" fill="#4FC3F7" />
      </G>
    ),
  };

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size} viewBox="0 0 120 120">
        {illustrations[type] || illustrations.qiyam}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default PrayerIllustration;
