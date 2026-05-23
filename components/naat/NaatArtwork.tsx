import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { BorderRadius, Spacing, Typography } from '@/constants/theme';
import { NaatDhikrTicker } from '@/components/naat/NaatDhikrTicker';

type Props = {
  title: string;
  reciter: string;
  playing: boolean;
  accentColor: string;
  surfaceColor: string;
  textColor: string;
};

export function NaatArtwork({
  title,
  reciter,
  playing,
  accentColor,
  surfaceColor,
  textColor,
}: Props) {
  return (
    <View style={[styles.shell, { borderColor: `${accentColor}66`, backgroundColor: `${surfaceColor}55` }]}>
      <LinearGradient
        colors={['rgba(255,255,255,0.14)', 'rgba(255,255,255,0.04)', 'rgba(0,0,0,0.18)']}
        style={StyleSheet.absoluteFill}
      />
      <View style={[styles.outerRing, { borderColor: `${accentColor}55` }]} />
      <View style={[styles.innerRing, { borderColor: `${accentColor}30` }]} />
      <View style={styles.starField}>
        <Text style={[styles.star, styles.starTop, { color: accentColor }]}>✦</Text>
        <Text style={[styles.star, styles.starLeft, { color: `${accentColor}cc` }]}>۞</Text>
        <Text style={[styles.star, styles.starRight, { color: `${accentColor}cc` }]}>✧</Text>
      </View>

      <View style={[styles.iconSeal, { backgroundColor: `${accentColor}24`, borderColor: `${accentColor}80` }]}>
        <MaterialIcons name="auto-awesome" size={34} color={accentColor} />
      </View>

      <NaatDhikrTicker playing={playing} color={accentColor} />

      <Text style={[styles.artTitle, { color: textColor }]} numberOfLines={2}>
        {title || 'نعت'}
      </Text>
      <Text style={[styles.artReciter, { color: `${textColor}cc` }]} numberOfLines={1}>
        {reciter || 'ذکر و مناجات'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    width: '100%',
    aspectRatio: 1,
    maxHeight: 360,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  outerRing: {
    position: 'absolute',
    width: '78%',
    height: '78%',
    borderRadius: 999,
    borderWidth: 1,
  },
  innerRing: {
    position: 'absolute',
    width: '52%',
    height: '52%',
    borderRadius: 999,
    borderWidth: 1,
    transform: [{ rotate: '45deg' }],
  },
  starField: {
    ...StyleSheet.absoluteFillObject,
  },
  star: {
    position: 'absolute',
    fontFamily: 'Amiri',
  },
  starTop: {
    top: 26,
    alignSelf: 'center',
    fontSize: 28,
  },
  starLeft: {
    left: 32,
    top: '46%',
    fontSize: 30,
  },
  starRight: {
    right: 36,
    top: '42%',
    fontSize: 26,
  },
  iconSeal: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  artTitle: {
    marginTop: Spacing.md,
    fontFamily: 'Vazirmatn',
    fontSize: Typography.ui.title,
    fontWeight: '800',
    textAlign: 'center',
    lineHeight: 34,
  },
  artReciter: {
    marginTop: Spacing.xs,
    fontFamily: 'Vazirmatn',
    fontSize: Typography.ui.caption,
    textAlign: 'center',
  },
});
